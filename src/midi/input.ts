
import { useStore } from '../state/store';
import { midiToNote } from '../music/scales';
import { playNoteOnChannel } from '../audio/engine';

let midiAccess: MIDIAccess | null = null;

export function formatKey(root: string, scale: string, bpm: number): string {
  const scaleLabels: Record<string, string> = {
    minor: 'minor',
    major: 'major',
    dorian: 'dorian',
    pentatonic: 'pent.',
    blues: 'blues',
  };
  return `${root} ${scaleLabels[scale] || scale} · ${bpm} BPM`;
}

export async function requestMidiAccess(): Promise<boolean> {
  if (!navigator.requestMIDIAccess) {
    console.log('Web MIDI API not supported in this browser');
    return false;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    console.log('MIDI access granted');
    return true;
  } catch (err) {
    console.error('Failed to get MIDI access:', err);
    return false;
  }
}

export function getMidiInputs(): { id: string; name: string }[] {
  if (!midiAccess) return [];
  const inputs: { id: string; name: string }[] = [];
  midiAccess.inputs.forEach((input) => {
    const name = input.name || input.id;
    inputs.push({ id: input.id, name });
  });
  return inputs;
}

export function connectToDevice(deviceId: string): boolean {
  if (!midiAccess) return false;
  midiAccess.inputs.forEach((input) => { input.onmidimessage = null; });
  const input = midiAccess.inputs.get(deviceId);
  if (!input) return false;
  console.log(`Connecting to device: ${input.name}`);
  input.onmidimessage = handleMidiMessage;
  return true;
}

export function disconnectMidi() {
  if (!midiAccess) return;
  midiAccess.inputs.forEach((input) => { input.onmidimessage = null; });
  console.log('Disconnected from MIDI');
}

export function onMidiStateChange(callback: () => void): () => void {
  if (!midiAccess) return () => {};
  const handler = () => callback();
  midiAccess.onstatechange = handler;
  return () => {
    if (midiAccess && midiAccess.onstatechange === handler) {
      midiAccess.onstatechange = null;
    }
  };
}

function handleMidiMessage(e: MIDIMessageEvent) {
  if (!e.data) return;
  const [status, note, velocity] = e.data;
  const command = status & 0xf0;
  if (command === 0x90 && velocity > 0) {
    handleNoteOn(note, velocity);
  }
}

function handleNoteOn(midiNote: number, velocity: number) {
  const state = useStore.getState();
  const noteName = midiToNote(midiNote);
  const liveChannelId = state.liveChannelId;

  if (liveChannelId) {
    const channel = state.channels.find(c => c.id === liveChannelId);
    if (channel) {
      const isDrum = channel.type === 'kick' || channel.type === 'snare' || channel.type === 'hat';
      const noteForPlay = isDrum ? undefined : noteName;
      playNoteOnChannel(liveChannelId, noteForPlay, velocity / 127);
    }

    // Record: add note at current tick
    if (state.recordingActive && state.isPlaying) {
      const tick = state.currentTick;
      const channel = state.channels.find(c => c.id === liveChannelId);
      if (!channel) return;

      const isDrum = channel.type === 'kick' || channel.type === 'snare' || channel.type === 'hat';
      const pitch = isDrum ? 'x' : noteName;
      const dur = 4; // default 4 ticks = 1/2 beat for recorded notes

      useStore.getState().addNote(liveChannelId, pitch, tick, dur);
    }
  } else {
    console.log('No live channel selected');
  }
}
