
import { getScaleNotes, randomFromScale } from './scales';
import { type Preset } from './presets';

export type ChannelType = 'kick' | 'snare' | 'hat' | 'bass' | 'melody' | 'arp';

export function generateDrumPattern(
  type: 'kick' | 'snare' | 'hat',
  steps: number,
  density: number,
): (string | null)[] {
  const pattern: (string | null)[] = [];

  for (let i = 0; i < steps; i++) {
    const beatPosition = i % 16;
    let hit = false;

    if (type === 'kick') {
      // Prefer downbeats
      if (beatPosition === 0 || beatPosition === 8) hit = Math.random() < 0.9;
      else if (beatPosition % 4 === 0) hit = Math.random() < density * 0.7;
      else hit = Math.random() < density * 0.3;
    } else if (type === 'snare') {
      // Prefer beats 2 and 4 (positions 4 and 12 in 16th notes)
      if (beatPosition === 4 || beatPosition === 12) hit = Math.random() < 0.85;
      else hit = Math.random() < density * 0.15;
    } else if (type === 'hat') {
      // Prefer off-beats
      if (beatPosition % 4 === 2) hit = Math.random() < density * 0.8;
      else if (beatPosition % 2 === 1) hit = Math.random() < density * 0.5;
      else hit = Math.random() < density * 0.2;
    }

    pattern.push(hit ? 'x' : null);
  }

  return pattern;
}

export function generateBassPattern(
  preset: Preset,
  steps: number,
): (string | null)[] {
  const scaleNotes = getScaleNotes(preset.root, preset.scale, preset.bassOctave, 1);
  const pattern: (string | null)[] = [];
  let lastNote = scaleNotes[0];

  for (let i = 0; i < steps; i++) {
    const beatPosition = i % 16;
    // Bass hits on strong beats with occasional off-beats
    const shouldHit = beatPosition % 4 === 0
      ? Math.random() < 0.8
      : beatPosition % 2 === 0
        ? Math.random() < 0.3
        : Math.random() < 0.05;

    if (shouldHit) {
      // Prefer repeating the last note or moving by a step
      if (Math.random() < 0.6) {
        pattern.push(lastNote);
      } else {
        lastNote = randomFromScale(scaleNotes);
        pattern.push(lastNote);
      }
    } else {
      pattern.push(null);
    }
  }

  return pattern;
}

export function generateMelodyPattern(
  preset: Preset,
  steps: number,
): (string | null)[] {
  const scaleNotes = getScaleNotes(preset.root, preset.scale, preset.melodyOctave, 2);
  const pattern: (string | null)[] = [];

  for (let i = 0; i < steps; i++) {
    // Melody is sparse — about 30% fill
    const shouldHit = Math.random() < 0.3;
    if (shouldHit) {
      pattern.push(randomFromScale(scaleNotes));
    } else {
      pattern.push(null);
    }
  }

  return pattern;
}

export function generateChannelPattern(
  type: ChannelType,
  preset: Preset,
  steps: number,
): (string | null)[] {
  if (type === 'kick' || type === 'snare' || type === 'hat') {
    const density = preset.drumDensity[type];
    return generateDrumPattern(type, steps, density);
  }
  if (type === 'bass') {
    return generateBassPattern(preset, steps);
  }
  if (type === 'melody' || type === 'arp') {
    return generateMelodyPattern(preset, steps);
  }
  return Array(steps).fill(null);
}
