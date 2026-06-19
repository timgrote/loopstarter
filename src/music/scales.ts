
// Scale definitions as semitone intervals from root
export const SCALES: Record<string, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
};

const SCALE_LABELS: Record<string, string> = {
  minor: 'Minor',
  major: 'Major',
  dorian: 'Dorian',
  pentatonic: 'Pentatonic',
  blues: 'Blues',
};

export const SCALE_NAMES = Object.keys(SCALES);
export const SCALE_DISPLAY = SCALE_LABELS;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 60; // default to C4
  const name = match[1];
  const octave = parseInt(match[2]);
  const semitone = NOTE_NAMES.indexOf(name);
  return (octave + 1) * 12 + semitone;
}

export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return NOTE_NAMES[semitone] + octave;
}

export function getScaleNotes(root: string, scaleName: string, octave: number, numOctaves: number = 2): string[] {
  const scale = SCALES[scaleName] || SCALES.minor;
  const rootMidi = noteToMidi(root + octave);
  const notes: string[] = [];
  
  for (let oct = 0; oct < numOctaves; oct++) {
    for (const interval of scale) {
      notes.push(midiToNote(rootMidi + oct * 12 + interval));
    }
  }
  // Add the root of the next octave
  notes.push(midiToNote(rootMidi + numOctaves * 12));
  
  return notes;
}

export function randomFromScale(scaleNotes: string[]): string {
  return scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
}
