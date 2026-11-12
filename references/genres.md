# Genres and instruments

Each genre in `src/engine/genres.ts` names a `drumStyle`, `bassStyle`, and `melodyStyle`. `src/engine/composer.ts` maps the genre id to a chord rhythm. GM program numbers are the `instruments` field.

| Genre | Drums | Bass | Chords | Lead sound |
| --- | --- | --- | --- | --- |
| Pop | kick on 1 and 3, snare on 2 and 4 | root and fifth | steel-guitar strum | electric piano |
| Rock | backbeat, hats, crash | driving eighths, pick bass | overdriven power chords | distortion guitar |
| Metal | double kick | palm-muted 16ths | chugged power chords | distortion guitar |
| Hip-hop | swung boom-bap | 808 sub | short electric-piano stabs | square lead |
| House | kick every beat, offbeat hats | offbeat synth bass | organ offbeats | square lead plus 16th arp |
| Techno | four-on-the-floor, 16th hats | rolling sub, off the kick | rare short stab | saw lead |
| Trance | four-on-the-floor | rolling sub | held saw chords | rising lead plus arp |
| Dubstep | half-time snare on beat 3 | held sub, then chopped | stab on the snare | saw lead |
| Drum & Bass | breakbeat | reese-style jumps | offbeat stabs | square lead and pad |
| Jazz | swung ride, light kick | walking 7th-chord tones | comp on 1, the and of 2, and 4 | tenor sax |
| Reggae | kick and snare together on beat 3 | pickup into beat 3 | clean-guitar offbeat skank | drawbar organ |
| Funk | syncopated kick and ghost snare | syncopated finger bass | short chops | tenor sax and brass stabs |
| Country | shuffle backbeat | root and fifth | guitar on 2 and 4 | violin |
| Latin | 3-2 clave | tumbao | montuno | trumpet |
| R&B / Soul | laid-back kick | syncopated finger bass | sparse electric piano | voice, strings, brass on choruses |
| Classical | no kit | contrabass half notes | piano chorale | flute and string ensemble |
| Cinematic | timpani and cymbal when the energy rises | low roots | sustained strings | flute |
| Ambient | sparse percussion | long drone | held piano | new-age pad |
| Industrial | machine kick and metal hits | eighth-note pulse | dissonant power stabs | saw lead |

Roman numerals with a leading `b` are flatted against the mode only when that degree is not already flat. `7` on an uppercase numeral is dominant; `maj7` is major 7; a lowercase numeral with `7` is minor 7.
