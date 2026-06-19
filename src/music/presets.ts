
export interface Preset {
  name: string;
  bpm: number;
  swing: number;
  scale: string;
  root: string;
  bassOctave: number;
  melodyOctave: number;
  drumDensity: { kick: number; snare: number; hat: number };
  description: string;
}

export const PRESETS: Record<string, Preset> = {
  house: {
    name: 'House',
    bpm: 124,
    swing: 0.15,
    scale: 'minor',
    root: 'A',
    bassOctave: 1,
    melodyOctave: 3,
    drumDensity: { kick: 0.5, snare: 0.25, hat: 0.75 },
    description: 'Four-on-the-floor with a plucky bass',
  },
  lofi: {
    name: 'Lo-Fi',
    bpm: 80,
    swing: 0.4,
    scale: 'dorian',
    root: 'D',
    bassOctave: 2,
    melodyOctave: 4,
    drumDensity: { kick: 0.3, snare: 0.2, hat: 0.5 },
    description: 'Laid back with swing and space',
  },
  trap: {
    name: 'Trap',
    bpm: 142,
    swing: 0,
    scale: 'minor',
    root: 'C',
    bassOctave: 1,
    melodyOctave: 3,
    drumDensity: { kick: 0.4, snare: 0.3, hat: 0.9 },
    description: 'Hard kicks and skittering hats',
  },
  techno: {
    name: 'Techno',
    bpm: 132,
    swing: 0.05,
    scale: 'minor',
    root: 'E',
    bassOctave: 1,
    melodyOctave: 4,
    drumDensity: { kick: 0.5, snare: 0.15, hat: 0.6 },
    description: 'Driving minimal pulse',
  },
  boombap: {
    name: 'Boom Bap',
    bpm: 92,
    swing: 0.25,
    scale: 'pentatonic',
    root: 'F',
    bassOctave: 1,
    melodyOctave: 3,
    drumDensity: { kick: 0.35, snare: 0.3, hat: 0.5 },
    description: 'Classic hip-hop groove',
  },
};
