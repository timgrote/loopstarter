import * as Tone from 'tone';
import type { ChannelType } from '../state/store';

type AudioNode = Tone.ToneAudioNode;

export interface SoundSpec {
  label: string;
  create: () => AudioNode;
  effects: () => AudioNode[];
  defaults: {
    note: string;
    duration: string;
    velocity: number;
  };
}

export type VariantMap = Record<string, SoundSpec>;

// ─── Kick ──────────────────────────────────────────────────────────────
const kickVariants: VariantMap = {
  sub808: {
    label: '808 Sub',
    create: () =>
      new Tone.MembraneSynth({
        pitchDecay: 0.12,
        octaves: 8,
        envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.2 },
      }),
    effects: () => [new Tone.Distortion({ distortion: 0.15, wet: 0.2 })],
    defaults: { note: 'C1', duration: '4n', velocity: 1 },
  },
  tight: {
    label: 'Tight',
    create: () =>
      new Tone.MembraneSynth({
        pitchDecay: 0.04,
        octaves: 5,
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
      }),
    effects: () => [],
    defaults: { note: 'C2', duration: '8n', velocity: 1 },
  },
  punchy: {
    label: 'Punchy',
    create: () =>
      new Tone.MembraneSynth({
        pitchDecay: 0.06,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
      }),
    effects: () => [new Tone.Filter(200, 'lowpass')],
    defaults: { note: 'C1', duration: '8n', velocity: 1 },
  },
};

// ─── Snare ─────────────────────────────────────────────────────────────
const snareVariants: VariantMap = {
  trap: {
    label: 'Trap',
    create: () =>
      new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.08 },
      }),
    effects: () => {
      const hp = new Tone.Filter(2000, 'highpass');
      const reverb = new Tone.Reverb({ decay: 0.5, wet: 0.2 });
      return [hp, reverb];
    },
    defaults: { note: '16n', duration: '16n', velocity: 0.9 },
  },
  clap: {
    label: 'Clap',
    create: () =>
      new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.15 },
      }),
    effects: () => {
      const bp = new Tone.Filter(1200, 'bandpass');
      const reverb = new Tone.Reverb({ decay: 1, wet: 0.3 });
      return [bp, reverb];
    },
    defaults: { note: '16n', duration: '16n', velocity: 0.8 },
  },
  acoustic: {
    label: 'Acoustic',
    create: () =>
      new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.05 },
      }),
    effects: () => [new Tone.Filter(4000, 'highpass')],
    defaults: { note: '16n', duration: '16n', velocity: 0.85 },
  },
};

// ─── Hat ───────────────────────────────────────────────────────────────
const hatVariants: VariantMap = {
  closed: {
    label: 'Closed',
    create: () =>
      new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.04, release: 0.02 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 6000,
        octaves: 1.2,
      }),
    effects: () => [new Tone.Filter(7000, 'highpass')],
    defaults: { note: 'C4', duration: '32n', velocity: 0.3 },
  },
  open: {
    label: 'Open',
    create: () =>
      new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.15, release: 0.08 },
        harmonicity: 5.1,
        modulationIndex: 24,
        resonance: 5000,
        octaves: 1.4,
      }),
    effects: () => [new Tone.Filter(6000, 'highpass')],
    defaults: { note: 'C4', duration: '16n', velocity: 0.35 },
  },
  ride: {
    label: 'Ride',
    create: () =>
      new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.3, release: 0.15 },
        harmonicity: 7,
        modulationIndex: 20,
        resonance: 4000,
        octaves: 1.5,
      }),
    effects: () => [new Tone.Filter(5000, 'highpass')],
    defaults: { note: 'C3', duration: '8n', velocity: 0.25 },
  },
};

// ─── Bass ──────────────────────────────────────────────────────────────
const bassVariants: VariantMap = {
  fm_sub: {
    label: 'FM Sub',
    create: () =>
      new Tone.FMSynth({
        harmonicity: 2,
        modulationIndex: 8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.2 },
        modulation: { type: 'triangle' },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.1 },
      }),
    effects: () => [
      new Tone.Distortion({ distortion: 0.25, wet: 0.35 }),
      new Tone.Filter(900, 'lowpass'),
    ],
    defaults: { note: 'C2', duration: '8n', velocity: 0.9 },
  },
  saw: {
    label: 'Saw',
    create: () =>
      new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.1 },
        filter: { Q: 2, type: 'lowpass', rolloff: -24 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.1, baseFrequency: 200, octaves: 3 },
      }),
    effects: () => [],
    defaults: { note: 'C2', duration: '8n', velocity: 0.85 },
  },
  sine: {
    label: 'Sine',
    create: () =>
      new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.3 },
      }),
    effects: () => [],
    defaults: { note: 'C2', duration: '8n', velocity: 0.8 },
  },
};

// ─── Melody ────────────────────────────────────────────────────────────
const melodyVariants: VariantMap = {
  am_pad: {
    label: 'AM Pad',
    create: () =>
      new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.5,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.3, release: 0.8 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.05, decay: 0.3, sustain: 0.2, release: 0.5 },
      }),
    effects: () => [
      new Tone.Reverb({ decay: 2.5, wet: 0.3 }),
      new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.2, wet: 0.15 }),
    ],
    defaults: { note: 'C4', duration: '8n', velocity: 0.8 },
  },
  pluck: {
    label: 'Pluck',
    create: () =>
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
      }),
    effects: () => [new Tone.Reverb({ decay: 1.5, wet: 0.2 })],
    defaults: { note: 'C4', duration: '16n', velocity: 0.9 },
  },
  bell: {
    label: 'Bell',
    create: () =>
      new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 16,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 1.2 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.8 },
      }),
    effects: () => [new Tone.Reverb({ decay: 3, wet: 0.4 })],
    defaults: { note: 'C5', duration: '8n', velocity: 0.7 },
  },
};

// ─── Arp ───────────────────────────────────────────────────────────────
const arpVariants: VariantMap = {
  fm_stab: {
    label: 'FM Stab',
    create: () =>
      new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 12,
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.4 },
        modulation: { type: 'triangle' },
        modulationEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.3 },
      }),
    effects: () => [
      new Tone.Reverb({ decay: 1.5, wet: 0.4 }),
      new Tone.FeedbackDelay({ delayTime: '16n', feedback: 0.3, wet: 0.25 }),
    ],
    defaults: { note: 'C4', duration: '16n', velocity: 0.75 },
  },
  pulse: {
    label: 'Pulse',
    create: () =>
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0.05, release: 0.2 },
      }),
    effects: () => [new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.35, wet: 0.3 })],
    defaults: { note: 'C4', duration: '16n', velocity: 0.7 },
  },
  whisper: {
    label: 'Whisper',
    create: () =>
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.3 },
      }),
    effects: () => [new Tone.Reverb({ decay: 2, wet: 0.5 })],
    defaults: { note: 'C5', duration: '16n', velocity: 0.5 },
  },
};

const allVariants: Record<ChannelType, VariantMap> = {
  kick: kickVariants,
  snare: snareVariants,
  hat: hatVariants,
  bass: bassVariants,
  melody: melodyVariants,
  arp: arpVariants,
};

export const DEFAULT_VARIANT: Record<ChannelType, string> = {
  kick: 'sub808',
  snare: 'trap',
  hat: 'closed',
  bass: 'fm_sub',
  melody: 'am_pad',
  arp: 'fm_stab',
};

export function getSpec(type: ChannelType, variant: string): SoundSpec {
  const map = allVariants[type];
  return map[variant] || map[DEFAULT_VARIANT[type]];
}

export function getVariants(type: ChannelType): { key: string; label: string }[] {
  return Object.entries(allVariants[type]).map(([key, spec]) => ({
    key,
    label: spec.label,
  }));
}
