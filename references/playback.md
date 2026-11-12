# Playback and export

`MidiNote.time` and `MidiNote.duration` are quarter-note beats. Bar 3 in 4/4 starts at time 8. `src/engine/playback.ts`, the piano roll, and `src/engine/midiExport.ts` all treat time this way. A bar-sized unit (1.0 per bar) will play four times too fast and will not line up with the drums.

## Samples

`src/engine/sampleLibrary.ts` lists every GM program the arranger uses, the note range, and the envelope. Files are MusyngKite mp3s under `public/samples/<instrument>/<Note>.mp3`. Flats are spelled `Db`, `Eb`, `Gb`, `Ab`, `Bb`. The drum kit is `public/samples/synth_drum/` at the General MIDI note numbers (kick 36, snare 38, closed hat 42, and the rest of the kit).

In dev, the renderer loads `./samples/`. In the packaged app, `electron/main.ts` serves `Contents/Resources/samples` on `mms-sample://bundle/`.

## Channels

The drum track is channel 9 so a DAW opens it as a drum kit. Other tracks use the GM program stored on the track. Export does not embed the samples; it writes the notes and the program number.
