export const GM_INSTRUMENTS: { program: number; name: string; family: string }[] = [
  { program: 0, name: 'Acoustic Grand Piano', family: 'Piano' },
  { program: 1, name: 'Bright Acoustic Piano', family: 'Piano' },
  { program: 4, name: 'Electric Piano 1', family: 'Piano' },
  { program: 5, name: 'Electric Piano 2', family: 'Piano' },
  { program: 24, name: 'Acoustic Guitar (nylon)', family: 'Guitar' },
  { program: 25, name: 'Acoustic Guitar (steel)', family: 'Guitar' },
  { program: 29, name: 'Overdriven Guitar', family: 'Guitar' },
  { program: 30, name: 'Distortion Guitar', family: 'Guitar' },
  { program: 33, name: 'Electric Bass (finger)', family: 'Bass' },
  { program: 34, name: 'Electric Bass (pick)', family: 'Bass' },
  { program: 38, name: 'Synth Bass 1', family: 'Bass' },
  { program: 43, name: 'Contrabass', family: 'Strings' },
  { program: 48, name: 'String Ensemble 1', family: 'Strings' },
  { program: 54, name: 'Voice Oohs', family: 'Ensemble' },
  { program: 61, name: 'Brass Section', family: 'Brass' },
  { program: 62, name: 'Synth Brass 1', family: 'Brass' },
  { program: 66, name: 'Tenor Sax', family: 'Reed' },
  { program: 73, name: 'Flute', family: 'Pipe' },
  { program: 80, name: 'Lead 2 (sawtooth)', family: 'Synth Lead' },
  { program: 81, name: 'Lead 1 (square)', family: 'Synth Lead' },
  { program: 82, name: 'Lead 3 (calliope)', family: 'Synth Lead' },
  { program: 88, name: 'Pad 1 (new age)', family: 'Synth Pad' },
  { program: 89, name: 'Pad 2 (warm)', family: 'Synth Pad' },
]

export function getInstrumentName(program: number): string {
  const inst = GM_INSTRUMENTS.find((i) => i.program === program)
  return inst?.name ?? `Program ${program}`
}
