
import { create } from 'zustand';
import { PRESETS, type Preset } from '../music/presets';
import { generateChannelPattern, type ChannelType } from '../music/patterns';
import { getScaleNotes, randomFromScale } from '../music/scales';
import { DEFAULT_VARIANT } from '../audio/sounds';

// Helper: create a pseudo-preset object from current key settings
function makeKeyPreset(root: string, scale: string, bassOctave: number, melodyOctave: number): Preset {
  return {
    name: '',
    bpm: 120,
    swing: 0,
    root,
    scale,
    bassOctave,
    melodyOctave,
    drumDensity: { kick: 0.5, snare: 0.25, hat: 0.75 },
    description: '',
  };
}

export type { ChannelType };

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  variant: string;
  pattern: (string | null)[];
  volume: number;  // 0-100
  pan: number;     // -100 to 100
  muted: boolean;
}

interface AppState {
  channels: Channel[];
  bpm: number;
  swing: number;
  loopBars: number;
  isPlaying: boolean;
  currentStep: number;
  root: string;
  scale: string;
  bassOctave: number;
  melodyOctave: number;
  midiInputs: { id: string; name: string }[];
  midiDeviceId: string | null;
  liveChannelId: string | null;
  recordingActive: boolean;
  contextMenu: { x: number; y: number; channelId: string } | null;
  fillMenu: { x: number; y: number; channelId: string } | null;

  // Actions
  setMidiInputs: (inputs: { id: string; name: string }[]) => void;
  setMidiDevice: (deviceId: string | null) => void;
  setLiveChannel: (channelId: string | null) => void;
  setRecordingActive: (active: boolean) => void;
  openContextMenu: (x: number, y: number, channelId: string) => void;
  closeContextMenu: () => void;
  openFillMenu: (x: number, y: number, channelId: string) => void;
  closeFillMenu: () => void;
  clearPattern: (channelId: string) => void;
  fillEvery: (channelId: string, every: number) => void;
  changeRoot: (root: string) => void;
  changeScale: (scale: string) => void;
  applyPreset: (presetKey: string) => void;
  randomizeKey: () => void;
  setStep: (channelId: string, step: number, active: boolean) => void;
  setNoteAtStep: (channelId: string, step: number, note: string | null) => void;
  setVolume: (channelId: string, volume: number) => void;
  setPan: (channelId: string, pan: number) => void;
  toggleMute: (channelId: string) => void;
  setVariant: (channelId: string, variant: string) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setLoopBars: (bars: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentStep: (step: number) => void;
  regenerateAll: () => void;
  regenerateChannel: (channelId: string) => void;
}

function createChannel(
  id: string,
  name: string,
  type: ChannelType,
  steps: number,
  preset: Preset,
  volume: number = 50,
  pan: number = 0,
): Channel {
  return {
    id,
    name,
    type,
    variant: DEFAULT_VARIANT[type],
    pattern: generateChannelPattern(type, preset, steps),
    volume,
    pan,
    muted: false,
  };
}

function createChannelsFromPreset(preset: Preset, steps: number): Channel[] {
  return [
    createChannel('kick', 'Kick', 'kick', steps, preset, 50),
    createChannel('snare', 'Snare', 'snare', steps, preset, 50),
    createChannel('hat', 'Hi-Hat', 'hat', steps, preset, 50, -20),
    createChannel('bass', 'Bass', 'bass', steps, preset, 50, 10),
    createChannel('melody', 'Melody', 'melody', steps, preset, 50, -10),
    createChannel('arp', 'Arp', 'arp', steps, preset, 50, 30),
  ];
}

const DEFAULT_PRESET = 'house';
const DEFAULT_STEPS = 32; // 2 bars at 16ths
const _defaultPreset = PRESETS[DEFAULT_PRESET];

export const useStore = create<AppState>((set, get) => ({
  channels: createChannelsFromPreset(_defaultPreset, DEFAULT_STEPS),
  bpm: _defaultPreset.bpm,
  swing: _defaultPreset.swing,
  loopBars: 2,
  isPlaying: false,
  currentStep: 0,
  root: _defaultPreset.root,
  scale: _defaultPreset.scale,
  bassOctave: _defaultPreset.bassOctave,
  melodyOctave: _defaultPreset.melodyOctave,
  midiInputs: [],
  midiDeviceId: null,
  liveChannelId: null,
  recordingActive: false,
  contextMenu: null,
  fillMenu: null,

  setMidiInputs: (inputs) => set({ midiInputs: inputs }),
  setMidiDevice: (deviceId) => set({ midiDeviceId: deviceId }),
  setLiveChannel: (channelId) => set({ liveChannelId: channelId }),
  setRecordingActive: (active) => set({ recordingActive: active }),
  openContextMenu: (x, y, channelId) => set({ contextMenu: { x, y, channelId } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openFillMenu: (x, y, channelId) => set({ fillMenu: { x, y, channelId } }),
  closeFillMenu: () => set({ fillMenu: null }),

  clearPattern: (channelId) => {
    set((state) => ({
      channels: state.channels.map((ch) => {
        if (ch.id !== channelId) return ch;
        return { ...ch, pattern: ch.pattern.map(() => null) };
      }),
    }));
  },

  fillEvery: (channelId, every) => {
    set((state) => {
      return {
        channels: state.channels.map((ch) => {
          if (ch.id !== channelId) return ch;
          const isDrum = ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat';
          const newPattern = ch.pattern.map((_, i) => {
            if (i % every !== 0) return null;
            if (isDrum) return 'x';
            const octave = ch.type === 'bass' ? state.bassOctave : state.melodyOctave;
            const octaves = ch.type === 'bass' ? 1 : 2;
            const scaleNotes = getScaleNotes(state.root, state.scale, octave, octaves);
            return randomFromScale(scaleNotes);
          });
          return { ...ch, pattern: newPattern };
        }),
      };
    });
  },

  changeRoot: (root) => {
    const state = get();
    const steps = state.loopBars * 16;
    const keyPreset = makeKeyPreset(root, state.scale, state.bassOctave, state.melodyOctave);
    set({
      root,
      channels: state.channels.map((ch) => {
        const isDrum = ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat';
        if (isDrum) return ch;
        return { ...ch, pattern: generateChannelPattern(ch.type, keyPreset, steps) };
      }),
    });
  },

  changeScale: (scale) => {
    const state = get();
    const steps = state.loopBars * 16;
    const keyPreset = makeKeyPreset(state.root, scale, state.bassOctave, state.melodyOctave);
    set({
      scale,
      channels: state.channels.map((ch) => {
        const isDrum = ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat';
        if (isDrum) return ch;
        return { ...ch, pattern: generateChannelPattern(ch.type, keyPreset, steps) };
      }),
    });
  },

  applyPreset: (presetKey) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    const state = get();
    const steps = state.loopBars * 16;
    set({
      root: preset.root,
      scale: preset.scale,
      bassOctave: preset.bassOctave,
      melodyOctave: preset.melodyOctave,
      bpm: preset.bpm,
      swing: preset.swing,
      channels: state.channels.map((ch) => {
        const isDrum = ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat';
        if (isDrum) return ch;
        return { ...ch, pattern: generateChannelPattern(ch.type, preset, steps) };
      }),
    });
  },

  randomizeKey: () => {
    const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const scales = Object.keys(PRESETS.house).includes('scale') ? ['minor', 'major', 'dorian', 'pentatonic', 'blues'] : ['minor'];
    const randomRoot = roots[Math.floor(Math.random() * roots.length)];
    const randomScale = scales[Math.floor(Math.random() * scales.length)];
    const state = get();
    const steps = state.loopBars * 16;
    const keyPreset = makeKeyPreset(randomRoot, randomScale, state.bassOctave, state.melodyOctave);
    set({
      root: randomRoot,
      scale: randomScale,
      channels: state.channels.map((ch) => {
        const isDrum = ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat';
        if (isDrum) return ch;
        return { ...ch, pattern: generateChannelPattern(ch.type, keyPreset, steps) };
      }),
    });
  },

  setStep: (channelId, step, active) => {
    set((state) => ({
      channels: state.channels.map((ch) => {
        if (ch.id !== channelId) return ch;
        const newPattern = [...ch.pattern];
        const type = ch.type;
        if (type === 'kick' || type === 'snare' || type === 'hat') {
          newPattern[step] = active ? 'x' : null;
        } else {
          // For pitched channels, toggling on gives a random scale note
          if (active && !newPattern[step]) {
            const octave = type === 'bass' ? state.bassOctave : state.melodyOctave;
            const octaves = type === 'bass' ? 1 : 2;
            const scaleNotes = getScaleNotes(state.root, state.scale, octave, octaves);
            newPattern[step] = randomFromScale(scaleNotes);
          } else if (!active) {
            newPattern[step] = null;
          }
        }
        return { ...ch, pattern: newPattern };
      }),
    }));
  },

  setNoteAtStep: (channelId, step, note) => {
    set((state) => ({
      channels: state.channels.map((ch) => {
        if (ch.id !== channelId) return ch;
        const newPattern = [...ch.pattern];
        newPattern[step] = note;
        return { ...ch, pattern: newPattern };
      }),
    }));
  },

  setVolume: (channelId, volume) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, volume } : ch,
      ),
    }));
  },

  setPan: (channelId, pan) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, pan } : ch,
      ),
    }));
  },

  toggleMute: (channelId) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, muted: !ch.muted } : ch,
      ),
    }));
  },

  setVariant: (channelId, variant) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, variant } : ch
      ),
    }));
  },

  setBpm: (bpm) => set({ bpm }),
  setSwing: (swing) => set({ swing }),
  setLoopBars: (bars) => set({ loopBars: bars }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentStep: (step) => set({ currentStep: step }),

  regenerateAll: () => {
    const state = get();
    const steps = state.loopBars * 16;
    const keyPreset = makeKeyPreset(state.root, state.scale, state.bassOctave, state.melodyOctave);
    set({ channels: createChannelsFromPreset(keyPreset, steps) });
  },

  regenerateChannel: (channelId) => {
    const state = get();
    const steps = state.loopBars * 16;
    const keyPreset = makeKeyPreset(state.root, state.scale, state.bassOctave, state.melodyOctave);
    set((state) => ({
      channels: state.channels.map((ch) => {
        if (ch.id !== channelId) return ch;
        return {
          ...ch,
          pattern: generateChannelPattern(ch.type, keyPreset, steps),
        };
      }),
    }));
  },
}));
