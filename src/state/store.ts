
import { create } from 'zustand';
import { PRESETS, type Preset } from '../music/presets';
import { generateChannelPattern, type ChannelType } from '../music/patterns';
import { getScaleNotes, randomFromScale } from '../music/scales';
import { DEFAULT_VARIANT } from '../audio/sounds';

export const TICKS_PER_BEAT = 8; // 1/8 of a beat = smallest grid unit

export interface Note {
  id: string;
  note: string;       // pitch ('x' for drums)
  start: number;      // tick index
  duration: number;   // in ticks
  velocity?: number;  // 0-1
}

export type { ChannelType };

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  variant: string;
  notes: Note[];
  volume: number;   // 0-100
  pan: number;      // -100 to 100
  muted: boolean;
}

// Helper: create a pseudo-preset from current key settings
function makeKeyPreset(root: string, scale: string, bassOctave: number, melodyOctave: number): Preset {
  return {
    name: '', bpm: 120, swing: 0,
    root, scale, bassOctave, melodyOctave,
    drumDensity: { kick: 0.5, snare: 0.25, hat: 0.75 },
    description: '',
  };
}

function nextId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface AppState {
  channels: Channel[];
  bpm: number;
  swing: number;
  loopBars: number;
  isPlaying: boolean;
  currentTick: number;   // renamed from currentStep for clarity
  root: string;
  scale: string;
  bassOctave: number;
  melodyOctave: number;
  midiInputs: { id: string; name: string }[];
  midiDeviceId: string | null;
  liveChannelId: string | null;
  recordingActive: boolean;
  contextMenu: { x: number; y: number; channelId: string } | null;

  setMidiInputs: (inputs: { id: string; name: string }[]) => void;
  setMidiDevice: (deviceId: string | null) => void;
  setLiveChannel: (channelId: string | null) => void;
  setRecordingActive: (active: boolean) => void;
  openContextMenu: (x: number, y: number, channelId: string) => void;
  closeContextMenu: () => void;

  // Note editing
  addNote: (channelId: string, note: string, start: number, duration: number) => void;
  removeNote: (channelId: string, noteId: string) => void;
  updateNote: (channelId: string, noteId: string, patch: Partial<Note>) => void;
  clearNotes: (channelId: string) => void;
  fillEvery: (channelId: string, every: number) => void;

  // Key controls
  changeRoot: (root: string) => void;
  changeScale: (scale: string) => void;
  applyPreset: (presetKey: string) => void;
  randomizeKey: () => void;

  // Channel controls
  setVolume: (channelId: string, volume: number) => void;
  setPan: (channelId: string, pan: number) => void;
  toggleMute: (channelId: string) => void;
  setVariant: (channelId: string, variant: string) => void;

  // Transport
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setLoopBars: (bars: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTick: (tick: number) => void;

  regenerateAll: () => void;
  regenerateChannel: (channelId: string) => void;
}

function createChannel(
  id: string, name: string, type: ChannelType,
  ticks: number, preset: Preset,
  volume: number = 50, pan: number = 0,
): Channel {
  return {
    id, name, type, variant: DEFAULT_VARIANT[type],
    notes: generateChannelPattern(type, preset, ticks),
    volume, pan, muted: false,
  };
}

function createChannelsFromPreset(preset: Preset, ticks: number): Channel[] {
  return [
    createChannel('kick', 'Kick', 'kick', ticks, preset, 50),
    createChannel('snare', 'Snare', 'snare', ticks, preset, 50),
    createChannel('hat', 'Hi-Hat', 'hat', ticks, preset, 50, -20),
    createChannel('bass', 'Bass', 'bass', ticks, preset, 50, 10),
    createChannel('melody', 'Melody', 'melody', ticks, preset, 50, -10),
    createChannel('arp', 'Arp', 'arp', ticks, preset, 50, 30),
  ];
}

const DEFAULT_PRESET = 'house';
const _dp = PRESETS[DEFAULT_PRESET];
const DEFAULT_TICKS = 8 * 16 * TICKS_PER_BEAT; // 2 bars = 8 beats * 8 ticks/beat

export const useStore = create<AppState>((set, get) => ({
  channels: createChannelsFromPreset(_dp, DEFAULT_TICKS),
  bpm: _dp.bpm,
  swing: _dp.swing,
  loopBars: 2,
  isPlaying: false,
  currentTick: 0,
  root: _dp.root,
  scale: _dp.scale,
  bassOctave: _dp.bassOctave,
  melodyOctave: _dp.melodyOctave,
  midiInputs: [],
  midiDeviceId: null,
  liveChannelId: null,
  recordingActive: false,
  contextMenu: null,

  setMidiInputs: (inputs) => set({ midiInputs: inputs }),
  setMidiDevice: (deviceId) => set({ midiDeviceId: deviceId }),
  setLiveChannel: (channelId) => set({ liveChannelId: channelId }),
  setRecordingActive: (active) => set({ recordingActive: active }),
  openContextMenu: (x, y, channelId) => set({ contextMenu: { x, y, channelId } }),
  closeContextMenu: () => set({ contextMenu: null }),

  // ── Note editing ─────────────────────────────────────────────
  addNote: (channelId, note, start, duration) => {
    const newNote: Note = { id: nextId(), note, start, duration };
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id !== channelId ? ch : { ...ch, notes: [...ch.notes, newNote] },
      ),
    }));
  },

  removeNote: (channelId, noteId) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id !== channelId ? ch : { ...ch, notes: ch.notes.filter((n) => n.id !== noteId) },
      ),
    }));
  },

  updateNote: (channelId, noteId, patch) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id !== channelId
          ? ch
          : {
              ...ch,
              notes: ch.notes.map((n) =>
                n.id === noteId ? { ...n, ...patch } : n,
              ),
            },
      ),
    }));
  },

  clearNotes: (channelId) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id !== channelId ? ch : { ...ch, notes: [] },
      ),
    }));
  },

  fillEvery: (channelId, everyBeats) => {
    set((state) => {
      const totalTicks = state.loopBars * 16 * TICKS_PER_BEAT;
      const ticksPerBeat = TICKS_PER_BEAT;
      const everyTicks = everyBeats * ticksPerBeat;
      return {
        channels: state.channels.map((ch) => {
          if (ch.id !== channelId) return ch;
          const isDrum = ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat';
          const notes: Note[] = [];
          for (let t = 0; t < totalTicks; t += everyTicks) {
            const pitch = isDrum ? 'x' : (() => {
              const octave = ch.type === 'bass' ? state.bassOctave : state.melodyOctave;
              const octs = ch.type === 'bass' ? 1 : 2;
              const sc = getScaleNotes(state.root, state.scale, octave, octs);
              return randomFromScale(sc);
            })();
            notes.push({ id: nextId(), note: pitch, start: t, duration: Math.min(everyTicks, totalTicks - t) });
          }
          return { ...ch, notes };
        }),
      };
    });
  },

  // ── Key controls ─────────────────────────────────────────────
  changeRoot: (root) => {
    const state = get();
    const totalTicks = state.loopBars * 16 * TICKS_PER_BEAT;
    const keyPreset = makeKeyPreset(root, state.scale, state.bassOctave, state.melodyOctave);
    set({
      root,
      channels: state.channels.map((ch) => {
        if (ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat') return ch;
        return { ...ch, notes: generateChannelPattern(ch.type, keyPreset, totalTicks) };
      }),
    });
  },

  changeScale: (scale) => {
    const state = get();
    const totalTicks = state.loopBars * 16 * TICKS_PER_BEAT;
    const keyPreset = makeKeyPreset(state.root, scale, state.bassOctave, state.melodyOctave);
    set({
      scale,
      channels: state.channels.map((ch) => {
        if (ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat') return ch;
        return { ...ch, notes: generateChannelPattern(ch.type, keyPreset, totalTicks) };
      }),
    });
  },

  applyPreset: (presetKey) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    const state = get();
    const totalTicks = state.loopBars * 16 * TICKS_PER_BEAT;
    set({
      root: preset.root, scale: preset.scale,
      bassOctave: preset.bassOctave, melodyOctave: preset.melodyOctave,
      bpm: preset.bpm, swing: preset.swing,
      channels: state.channels.map((ch) => {
        if (ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat') return ch;
        return { ...ch, notes: generateChannelPattern(ch.type, preset, totalTicks) };
      }),
    });
  },

  randomizeKey: () => {
    const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const scs = ['minor', 'major', 'dorian', 'pentatonic', 'blues'];
    const rr = roots[Math.floor(Math.random() * roots.length)];
    const rs = scs[Math.floor(Math.random() * scs.length)];
    const state = get();
    const totalTicks = state.loopBars * 16 * TICKS_PER_BEAT;
    const keyPreset = makeKeyPreset(rr, rs, state.bassOctave, state.melodyOctave);
    set({
      root: rr, scale: rs,
      channels: state.channels.map((ch) => {
        if (ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat') return ch;
        return { ...ch, notes: generateChannelPattern(ch.type, keyPreset, totalTicks) };
      }),
    });
  },

  // ─ Channel controls ─────────────────────────────────────────
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

  // ── Transport ────────────────────────────────────────────────
  setBpm: (bpm) => set({ bpm }),
  setSwing: (swing) => set({ swing }),
  setLoopBars: (bars) => {
    const totalTicks = bars * 16 * TICKS_PER_BEAT;
    set((state) => ({
      loopBars: bars,
      channels: state.channels.map((ch) => {
        if (ch.type === 'kick' || ch.type === 'snare' || ch.type === 'hat') return ch;
        const keyPreset = makeKeyPreset(state.root, state.scale, state.bassOctave, state.melodyOctave);
        return { ...ch, notes: generateChannelPattern(ch.type, keyPreset, totalTicks) };
      }),
    }));
  },
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTick: (tick) => set({ currentTick: tick }),

  regenerateAll: () => {
    const state = get();
    const totalTicks = state.loopBars * 16 * TICKS_PER_BEAT;
    const keyPreset = makeKeyPreset(state.root, state.scale, state.bassOctave, state.melodyOctave);
    set({ channels: createChannelsFromPreset(keyPreset, totalTicks) });
  },

  regenerateChannel: (channelId) => {
    const state = get();
    const totalTicks = state.loopBars * 16 * TICKS_PER_BEAT;
    const keyPreset = makeKeyPreset(state.root, state.scale, state.bassOctave, state.melodyOctave);
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id !== channelId ? ch : { ...ch, notes: generateChannelPattern(ch.type, keyPreset, totalTicks) },
      ),
    }));
  },
}));
