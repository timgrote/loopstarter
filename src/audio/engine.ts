
import * as Tone from 'tone';
import type { Channel, Note } from '../state/store';
import { useStore, TICKS_PER_BEAT } from '../state/store';
import { getSpec } from './sounds';

type AudioNode = Tone.ToneAudioNode;

interface ChannelAudio {
  source: AudioNode;
  effects: AudioNode[];
  gain: Tone.Gain;
  pan: Tone.Panner;
  meter: Tone.Meter;
}

const audioNodes = new Map<string, ChannelAudio>();
const loopIds: number[] = [];
let initialized = false;
let totalTicks = 0;
let currentTick = 0;

function buildChain(channel: Channel): ChannelAudio {
  const spec = getSpec(channel.type, channel.variant);
  const source = spec.create();
  const effects = spec.effects();
  const gain = new Tone.Gain(channel.muted ? 0 : channel.volume / 100);
  const pan = new Tone.Panner(channel.pan / 100);
  const meter = new Tone.Meter({ smoothing: 0.6 });

  let last: Tone.ToneAudioNode = source;
  for (const fx of effects) { last.connect(fx); last = fx; }
  last.connect(gain);
  gain.connect(pan);
  pan.connect(meter);
  meter.toDestination();

  return { source, effects, gain, pan, meter };
}

function trigger(channel: Channel, audio: ChannelAudio, time: number, note: string, durationTicks: number) {
  const spec = getSpec(channel.type, channel.variant);
  const { velocity } = spec.defaults;

  // Convert duration ticks to seconds
  const durSec = (60 / useStore.getState().bpm) * durationTicks / TICKS_PER_BEAT;
  const clampedDur = Math.max(0.05, durSec);

  switch (channel.type) {
    case 'kick':
      (audio.source as Tone.MembraneSynth).triggerAttackRelease('C1', clampedDur, time, velocity);
      break;
    case 'snare':
      (audio.source as Tone.NoiseSynth).triggerAttackRelease(clampedDur, time, velocity);
      break;
    case 'hat':
      (audio.source as Tone.MetalSynth).triggerAttackRelease('C4', clampedDur / 2, time, velocity);
      break;
    case 'bass': {
      const src = audio.source as any;
      if (typeof src.triggerAttackRelease === 'function') {
        src.triggerAttackRelease(note, clampedDur, time, velocity);
      }
      break;
    }
    case 'melody':
    case 'arp':
      (audio.source as Tone.PolySynth).triggerAttackRelease(note, clampedDur, time, velocity);
      break;
  }
}

export async function initAudio() {
  if (initialized) return;
  await Tone.start();
  Tone.Transport.bpm.value = 120;
  Tone.Transport.swing = 0;
  Tone.Transport.swingSubdivision = '16n';
  initialized = true;
}

export function registerChannel(channel: Channel) {
  if (audioNodes.has(channel.id)) return;
  audioNodes.set(channel.id, buildChain(channel));
}

export function unregisterChannel(channelId: string) {
  const node = audioNodes.get(channelId);
  if (!node) return;
  node.source.dispose();
  for (const fx of node.effects) fx.dispose();
  node.gain.dispose();
  node.pan.dispose();
  node.meter.dispose();
  audioNodes.delete(channelId);
}

export function updateChannelVariant(channelId: string, channel: Channel) {
  const node = audioNodes.get(channelId);
  if (!node) {
    audioNodes.set(channel.id, buildChain(channel));
    return;
  }
  node.source.dispose();
  for (const fx of node.effects) fx.dispose();
  const spec = getSpec(channel.type, channel.variant);
  const newSource = spec.create();
  const newEffects = spec.effects();
  try { node.gain.disconnect(); } catch {}
  try { node.pan.disconnect(); } catch {}
  let last: AudioNode = newSource;
  for (const fx of newEffects) { last.connect(fx); last = fx; }
  last.connect(node.gain);
  node.gain.connect(node.pan);
  node.pan.connect(node.meter);
  node.meter.toDestination();
  node.source = newSource;
  node.effects = newEffects;
}

export function updateChannelVolume(channelId: string, volume: number) {
  const node = audioNodes.get(channelId);
  if (node) node.gain.gain.rampTo(volume / 100, 0.01);
}

export function updateChannelPan(channelId: string, pan: number) {
  const node = audioNodes.get(channelId);
  if (node) node.pan.pan.rampTo(pan / 100, 0.01);
}

export function updateChannelMute(channelId: string, muted: boolean) {
  const node = audioNodes.get(channelId);
  if (node) {
    const vol = useStore.getState().channels.find(c => c.id === channelId)?.volume ?? 50;
    node.gain.gain.rampTo(muted ? 0 : vol / 100, 0.01);
  }
}

export function playNoteOnChannel(channelId: string, note?: string | null, _velocity: number = 0.8) {
  const node = audioNodes.get(channelId);
  if (!node) return;
  const channel = useStore.getState().channels.find(c => c.id === channelId);
  if (!channel || channel.muted) return;
  trigger(channel, node, Tone.now(), note || 'x', TICKS_PER_BEAT);
}

export function getChannelLevel(channelId: string): number {
  const node = audioNodes.get(channelId);
  if (!node) return -Infinity;
  return node.meter.getValue() as number;
}

/** Build a quick lookup: note.start -> notes[] for efficient tick scanning */
function buildNoteIndex(channels: Channel[]): Map<number, { ch: Channel; note: Note }[]> {
  const idx = new Map<number, { ch: Channel; note: Note }[]>();
  for (const ch of channels) {
    for (const n of ch.notes) {
      if (!idx.has(n.start)) idx.set(n.start, []);
      idx.get(n.start)!.push({ ch, note: n });
    }
  }
  return idx;
}

function tickInterval(): Tone.Unit.Time {
  // 1/8 of a quarter note = '4n / 8'  (Tone parses this)
  return `4n / ${TICKS_PER_BEAT}` as Tone.Unit.Time;
}

export function startSequencer(ticks: number, onTick: (tick: number) => void) {
  if (loopIds.length > 0) return;

  totalTicks = ticks;
  currentTick = 0;
  const state = useStore.getState();
  const noteIdx = buildNoteIndex(state.channels);

  const id = Tone.Transport.scheduleRepeat((time) => {


    // Trigger notes that start on this tick
    const starting = noteIdx.get(currentTick % totalTicks);
    if (starting) {
      for (const { ch, note } of starting) {
        if (ch.muted) continue;
        const node = audioNodes.get(ch.id);
        if (!node) continue;
        trigger(ch, node, time, note.note, note.duration);
      }
    }

    Tone.Draw.schedule(() => onTick(currentTick), time);
    currentTick = (currentTick + 1) % totalTicks;
  }, tickInterval());

  loopIds.push(id);
  Tone.Transport.start();
}

export function stopSequencer() {
  for (const id of loopIds) Tone.Transport.clear(id);
  loopIds.length = 0;
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  currentTick = 0;
}

export function setBpm(bpm: number) {
  Tone.Transport.bpm.rampTo(bpm, 0.1);
}

export function setSwing(swing: number) {
  Tone.Transport.swing = swing;
}

export function disposeAll() {
  stopSequencer();
  for (const [id] of audioNodes) unregisterChannel(id);
  initialized = false;
}
