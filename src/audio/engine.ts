
import * as Tone from 'tone';
import type { Channel } from '../state/store';
import { useStore } from '../state/store';
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

function buildChain(channel: Channel): ChannelAudio {
  const spec = getSpec(channel.type, channel.variant);
  const source = spec.create();
  const effects = spec.effects();
  const gain = new Tone.Gain(channel.muted ? 0 : channel.volume / 100);
  const pan = new Tone.Panner(channel.pan / 100);
  const meter = new Tone.Meter({ smoothing: 0.6 });

  // Wire: source → [...effects] → gain → pan → meter → destination
  let last: Tone.ToneAudioNode = source;
  for (const fx of effects) {
    last.connect(fx);
    last = fx;
  }
  last.connect(gain);
  gain.connect(pan);
  pan.connect(meter);
  meter.toDestination();

  return { source, effects, gain, pan, meter };
}

function trigger(channel: Channel, audio: ChannelAudio, time: number, noteFromPattern?: string | null) {
  const spec = getSpec(channel.type, channel.variant);
  const { note, duration, velocity } = spec.defaults;

  switch (channel.type) {
    case 'kick':
      (audio.source as Tone.MembraneSynth).triggerAttackRelease(note, duration, time, velocity);
      break;
    case 'snare':
      (audio.source as Tone.NoiseSynth).triggerAttackRelease(duration, time, velocity);
      break;
    case 'hat':
      (audio.source as Tone.MetalSynth).triggerAttackRelease(note, duration, time, velocity);
      break;
    case 'bass': {
      if (noteFromPattern) {
        const src = audio.source as any;
        if (typeof src.triggerAttackRelease === 'function') {
          src.triggerAttackRelease(noteFromPattern, duration, time, velocity);
        }
      }
      break;
    }
    case 'melody':
    case 'arp':
      if (noteFromPattern)
        (audio.source as Tone.PolySynth).triggerAttackRelease(noteFromPattern, duration, time, velocity);
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

/**
 * Hot-swap the instrument/variant for a channel.
 */
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
  for (const fx of newEffects) {
    last.connect(fx);
    last = fx;
  }
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
  trigger(channel, node, Tone.now(), note);
}

/** Returns current signal level in dB for a channel. -Infinity when silent, ~0 when hot. */
export function getChannelLevel(channelId: string): number {
  const node = audioNodes.get(channelId);
  if (!node) return -Infinity;
  return node.meter.getValue() as number;
}

export function startSequencer(totalSteps: number, onStep: (step: number) => void) {
  if (loopIds.length > 0) return;

  let currentStep = 0;

  const id = Tone.Transport.scheduleRepeat((time) => {
    const state = useStore.getState();

    for (const channel of state.channels) {
      if (channel.muted) continue;
      const stepValue = channel.pattern[currentStep % channel.pattern.length];
      if (stepValue === null || stepValue === undefined) continue;

      const node = audioNodes.get(channel.id);
      if (!node) continue;

      trigger(channel, node, time, stepValue);
    }

    Tone.Draw.schedule(() => onStep(currentStep), time);
    currentStep = (currentStep + 1) % totalSteps;
  }, '16n');

  loopIds.push(id);
  Tone.Transport.start();
}

export function stopSequencer() {
  for (const id of loopIds) Tone.Transport.clear(id);
  loopIds.length = 0;
  Tone.Transport.stop();
  Tone.Transport.position = 0;
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
