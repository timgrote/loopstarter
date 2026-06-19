
import { getScaleNotes, randomFromScale } from './scales';
import { type Preset } from './presets';
import { TICKS_PER_BEAT, type Note } from '../state/store';

export type ChannelType = 'kick' | 'snare' | 'hat' | 'bass' | 'melody' | 'arp';

function nid(): string {
  return Math.random().toString(36).slice(2, 10);
}


export function generateDrumPattern(
  type: 'kick' | 'snare' | 'hat',
  ticks: number,
  density: number,
): Note[] {
  const notes: Note[] = [];
  const beatTicks = TICKS_PER_BEAT; // 4th of a bar position = one quarter note = 1 beat

  for (let t = 0; t < ticks; t++) {
    const beatPos = Math.floor(t / beatTicks); // which beat within the bar (0-3 repeating)
    const beatFrac = (t % beatTicks) / beatTicks;
    
    // Only generate at the start of each position we care about
    // Drums: quarter-note resolution for kick/snare, 8th-note for hat
    if (type === 'kick' || type === 'snare') {
      if (beatFrac !== 0) continue;
      const bp = beatPos % 4;
      let hit = false;
      if (type === 'kick') {
        if (bp === 0 || bp === 2) hit = Math.random() < 0.85;
        else hit = Math.random() < density * 0.2;
      } else {
        if (bp === 1 || bp === 3) hit = Math.random() < 0.85;
        else hit = Math.random() < density * 0.1;
      }
      if (hit) notes.push({ id: nid(), note: 'x', start: t, duration: 2 }); // 2 ticks = 1/4 beat
    } else {
      // Hat: 8th-note resolution (every 4 ticks)
      if (t % Math.floor(beatTicks / 2) !== 0) continue;
      const bp = beatPos % 4;
      const subBeat = Math.floor((t % beatTicks) / Math.floor(beatTicks / 2));
      let hit = false;
      if (subBeat === 1) hit = Math.random() < density * 0.8;
      else if (bp % 2 === 0 && subBeat === 0) hit = Math.random() < density * 0.6;
      else hit = Math.random() < density * 0.2;
      if (hit) notes.push({ id: nid(), note: 'x', start: t, duration: 2 });
    }
  }

  return notes;
}

export function generateBassPattern(preset: Preset, ticks: number): Note[] {
  const scaleNotes = getScaleNotes(preset.root, preset.scale, preset.bassOctave, 1);
  const notes: Note[] = [];
  let lastNote = scaleNotes[0];
  const beatTicks = TICKS_PER_BEAT;

  for (let t = 0; t < ticks; t += beatTicks) {
    const bp = Math.floor(t / beatTicks) % 4;
    // Bass: mostly quarter notes, some eighth notes
    const shouldHit = bp % 2 === 0
      ? Math.random() < 0.8
      : Math.random() < 0.25;

    if (shouldHit) {
      // Vary duration: 1 beat (75%) or 2 beats (25%)
      const dur = Math.random() < 0.75 ? beatTicks : beatTicks * 2;
      const clampedDur = Math.min(dur, ticks - t);
      notes.push({ id: nid(), note: lastNote, start: t, duration: clampedDur });

      // 40% chance to pick a new note for the next hit
      if (Math.random() < 0.4) {
        lastNote = randomFromScale(scaleNotes);
      }
    }
  }

  return notes;
}

export function generateMelodyPattern(
  preset: Preset,
  ticks: number,
): Note[] {
  const scaleNotes = getScaleNotes(preset.root, preset.scale, preset.melodyOctave, 2);
  const notes: Note[] = [];
  const halfBeat = Math.floor(TICKS_PER_BEAT / 2);

  for (let t = 0; t < ticks; t += halfBeat) {
    if (Math.random() < 0.2) {
      // Mix of durations: 1/2 beat, 1 beat, or 2 beats
      const choices = [halfBeat, TICKS_PER_BEAT, TICKS_PER_BEAT * 2];
      const weights = [0.4, 0.4, 0.2];
      const r = Math.random();
      let picked = choices[0];
      let acc = 0;
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (r < acc) { picked = choices[i]; break; }
      }
      const clampedDur = Math.min(picked, ticks - t);
      notes.push({
        id: nid(),
        note: randomFromScale(scaleNotes),
        start: t,
        duration: clampedDur,
      });
    }
  }

  return notes;
}

export function generateChannelPattern(
  type: ChannelType,
  preset: Preset,
  ticks: number,
): Note[] {
  if (type === 'kick' || type === 'snare' || type === 'hat') {
    return generateDrumPattern(type, ticks, preset.drumDensity[type]);
  }
  if (type === 'bass') return generateBassPattern(preset, ticks);
  if (type === 'melody' || type === 'arp') return generateMelodyPattern(preset, ticks);
  return [];
}
