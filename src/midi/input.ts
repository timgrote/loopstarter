
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
  if (!midiAccess) {
    console.log('No MIDI access yet');
    return [];
  }
  
  const inputs: { id: string; name: string }[] = [];
  midiAccess.inputs.forEach((input) => {
    const name = input.name || input.id;
    inputs.push({ id: input.id, name });
  });
  
  return inputs;
}

export function connectToDevice(deviceId: string): boolean {
  if (!midiAccess) {
    console.log('Cannot connect: no MIDI access');
    return false;
  }
  
  // Disconnect from all inputs first
  midiAccess.inputs.forEach((input) => {
    input.onmidimessage = null;
  });
  
  const input = midiAccess.inputs.get(deviceId);
  if (!input) {
    console.log(`Device not found: ${deviceId}`);
    return false;
  }
  
  console.log(`Connecting to device: ${input.name}`);
  
  // Set up message handler
  input.onmidimessage = handleMidiMessage;
  
  return true;
}

export function disconnectMidi() {
  if (!midiAccess) return;
  
  // Disconnect from all inputs
  midiAccess.inputs.forEach((input) => {
    input.onmidimessage = null;
  });
  
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
  
  // Note On (0x90) with velocity > 0
  if (command === 0x90 && velocity > 0) {
    handleNoteOn(note, velocity);
  }
}

function handleNoteOn(midiNote: number, velocity: number) {
  const state = useStore.getState();
  const noteName = midiToNote(midiNote);
  const liveChannelId = state.liveChannelId;
  
  // Always play live through the selected channel
  if (liveChannelId) {
    const channel = state.channels.find(c => c.id === liveChannelId);
    if (channel) {
      const isDrum = channel.type === 'kick' || channel.type === 'snare' || channel.type === 'hat';
      const noteForPlay = isDrum ? undefined : noteName;
      playNoteOnChannel(liveChannelId, noteForPlay, velocity / 127);
    }
    
    // Record: write to the live channel's pattern if recording is active
    if (state.recordingActive && state.isPlaying) {
      const currentStep = state.currentStep % (state.loopBars * 16);
      const channel = state.channels.find(c => c.id === liveChannelId);
      if (!channel) return;
      
      const isDrum = channel.type === 'kick' || channel.type === 'snare' || channel.type === 'hat';
      
      // Write to pattern
      useStore.setState((s) => ({
        channels: s.channels.map((ch) => {
          if (ch.id !== liveChannelId) return ch;
          const newPattern = [...ch.pattern];
          newPattern[currentStep] = isDrum ? 'x' : noteName;
          return { ...ch, pattern: newPattern };
        }),
      }));
    }
  } else {
    console.log('No live channel selected');
  }
}
