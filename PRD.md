# Woodshed — Product Requirements Document

| | |
|---|---|
| **Status** | Draft 4 (M1 decisions recorded) |
| **Date** | 2026-11-15 |
| **Owner** | Danny |

## 1. Summary

Woodshed is a personal music theory practice app that runs in the browser on an Android phone and an iPad. It started as a set of paper flash cards for memorizing major scales, key signatures and fifths. The app replaces those cards and extends them to every scale, interval and chord, with audio playback, three ways to see and enter notes (keyboard, fretboard, staff), and a microphone pitch detector so questions can be answered by playing an instrument.

## 2. Goals and non-goals

### Goals

1. Memorize scales, key signatures, intervals and chords faster than with paper cards.
2. Connect theory to real instruments: see every answer on a keyboard, a fretboard and a staff, and hear it.
3. Train the ear and intonation by answering with an instrument through the microphone.
4. Work across several instruments (guitar, bass and keyboard first; brass, theremin and woodwinds later) without relearning the app.
5. Work on a phone and a tablet, installed to the home screen, with no network needed after install.
6. Be usable by other people: the code is public and nothing in the app is specific to one person.

### Non-goals (for now)

- Accounts, social features or sharing progress with other users.
- Rhythm, sight-reading of full pieces, or a full notation editor.
- Recognizing chords played as several simultaneous notes through the mic.
- Native app store releases.
- Lessons or explanatory theory content. Woodshed is a drill tool, not a course.

## 3. User and devices

Built first for one user (Danny), and published so that other musicians can use it. Practiced on:

| Device | Use | Layout |
|---|---|---|
| Android phone (Chrome) | Quick drills, one hand | Portrait, one card at a time, view below the card |
| iPad (Safari) | Longer sessions at an instrument | Landscape, card and instrument view side by side |
| Desktop browser | Development and testing | Same as iPad |

The app must be usable while holding an instrument: large touch targets, and a hands-free path through a quiz when mic input is on (the next card advances by itself after a correct answer).

## 4. Instruments

Each instrument is a **profile** that controls transposition, clef, playable range and the default view. Switching profile changes how cards are written and how mic input is interpreted, without changing the underlying theory content.

| Instrument | Transposition (written → sounding) | Clef | Approx. sounding range | Default view | Phase |
|---|---|---|---|---|---|
| Keyboard | None | Grand staff | A0–C8 | Keyboard | v1 |
| Guitar | Octave lower | Treble | E2 to about E6 | Fretboard (6 strings, EADGBE) | v1 |
| Bass | Octave lower | Bass | E1 to about G4 | Fretboard (4 strings, EADG) | v1 |
| Theremin | None | None (pitch trace) | Continuous | Pitch trace | Later |
| Trumpet (B♭) | Major 2nd lower | Treble | E3–B♭5 | Staff | Later |
| French horn (F) | Perfect 5th lower | Treble | B1–F5 | Staff | Later |
| Trombone | None | Bass | E2–B♭4 | Staff | Later |
| Woodwinds | Varies by instrument | Varies | Varies | Staff | Later |

Requirements:

- **I-1** A profile selector is reachable from every screen and remembers the last choice.
- **I-2** Transposition is handled by the profile. Guitar and bass sound an octave below what is written, and the app accounts for that in audio and mic input without any setting. A **written / concert pitch** toggle arrives with the brass profiles, where a trumpet card that says "C" must expect a sounding B♭. The profile format supports this from v1 so brass can be added without rework.
- **I-3** Cards, audio and staff notation stay inside the profile's range. Ranges are editable so they can grow with skill.
- **I-4** Fretboard tuning and string count are editable (5-string bass, drop D and other alternate tunings).
- **I-5** Adding a new profile must not need new card content, only a new profile definition.

## 5. Theory content

All content is **generated from rules**, not hand-entered, so every key is covered and spelling is always correct.

### 5.1 Spelling rules

- Notes are spelled correctly for their key: C♯ major contains E♯ and B♯, not F and C. This matches the paper cards.
- Double sharps and double flats appear where theory requires them (for example F𝄪 in G♯ harmonic minor).
- Enharmonic pairs are linked: C♯/D♭, F♯/G♭, B/C♭ major and their relative minors.

### 5.2 Scales

| Phase | Scale types |
|---|---|
| v1 | Major, natural minor, harmonic minor, melodic minor, in all 15 key signatures |
| v1.1 | The seven modes, major and minor pentatonic, blues |
| Later | Whole tone, diminished (both forms), chromatic, bebop and other jazz scales |

For each scale the app knows: notes in order, scale degrees 1–8, key signature (count and which accidentals), relative major/minor, parallel major/minor, and enharmonic equivalent.

### 5.3 Intervals

- v1: every simple interval from minor 2nd to perfect octave, including the tritone as both augmented 4th and diminished 5th, ascending and descending, from every root.
- Later: compound intervals (9ths, 10ths, 11ths, 13ths).
- Scale-degree form is supported as well as interval form: "the V of E♭" and "a perfect 5th above E♭" are the same card family.

### 5.4 Chords

| Phase | Chord types |
|---|---|
| v1 | Triads: major, minor, diminished, augmented. Sevenths: maj7, 7, m7, m7♭5, dim7, m(maj7) |
| v1.1 | sus2, sus4, 6, m6, add9 |
| Later | 9, 11, 13 and altered chords |

For each chord the app knows: notes, formula (for example 1 ♭3 5 ♭7), inversions, and which keys it belongs to.

## 6. Features

### 6.1 Flash cards

The digital version of the paper deck.

- **F-1** A card has a front (prompt) and a back (answer). Tap to flip.
- **F-2** After flipping, mark the card "got it" or "missed it" by swipe or button.
- **F-3** Missed cards return later in the same session.
- **F-4** Decks are built by filter: content type (scales, key signatures, intervals, chords), scale or chord type, and a set of keys (for example "flat keys only" or "just the keys I picked").
- **F-5** Card families in v1:

| Family | Front | Back |
|---|---|---|
| Key signature | "A♭ major" | 4♭, the flats named, scale spelled with degrees, enharmonic twin if any |
| Reverse key signature | "4 flats" | A♭ major / F minor |
| Scale spelling | "E♭ harmonic minor" | Notes with degrees |
| Scale degree | "6th of A♭ major" | F |
| Interval | "Perfect 5th above E♭" or "E♭ V" | B♭ |
| Reverse interval | "B♭ is the V of what?" | E♭ |
| Interval naming | "E♭ up to B♭" | Perfect 5th |
| Chord spelling | "C♯m7" | C♯ E G♯ B, formula |
| Chord naming | "C♯ E G♯ B" | C♯m7 |
| Relative / parallel | "Relative minor of A♭ major" | F minor |

- **F-6** Each card back can show the answer on the active view (keyboard, fretboard or staff) and play it.

### 6.2 Quiz modes

Same card families, but the answer is entered rather than self-graded.

- **Q-1 Tap entry:** enter notes on the active view, or on a compact note-name picker.
- **Q-2 Multiple choice:** for naming cards (interval name, chord name, key).
- **Q-3 Mic entry:** play the answer (see 6.5).
- **Q-4** Immediate feedback: correct notes turn green, wrong notes red, and the correct answer is shown and played.
- **Q-5** Enharmonic equivalents are accepted as correct. When the answer given is spelled differently from the expected one (F where the key calls for E♯), it is marked correct with a note showing the expected spelling and why. This applies to tap entry and mic entry alike.
- **Q-6** Optional timer and session length (10 cards, 5 minutes, or endless).
- **Q-7** End-of-session summary: score, time, and the cards missed.

### 6.3 Views

Three interchangeable views, used both to display answers and to enter them.

- **V-1 Keyboard:** scrollable piano, at least two octaves visible on a phone, more on a tablet. Keys light up and can be labelled with note names or scale degrees.
- **V-2 Fretboard:** strings and frets per the profile's tuning, showing the **whole neck** (fret count set per profile). On a phone the neck is shown in landscape, or scrolls sideways in portrait. Shows every position of a note, or one chosen position or voicing. Left-handed flip option.
- **V-3 Staff:** clef per profile, real key signatures, ledger lines, accidentals. Tap a line or space to enter a note, then set its accidental.
- **V-4** A view switcher is always visible. The same card re-renders in place when the view changes.
- **V-5** Label options: note names, scale degrees, intervals from the root, or none (for self-testing).
- **V-6 Pinned staff:** the staff can be pinned so it stays visible together with the keyboard or the fretboard. Both show the same notes and update together, and notes can be entered on either.

### 6.4 Audio

- **A-1** Play any note, interval (melodic up, melodic down, harmonic), scale (up, down, both) or chord (block, arpeggio).
- **A-2** Playback is at sounding pitch for the active profile and inside its range.
- **A-3** Tempo control for scales and arpeggios.
- **A-4** One synthesized piano-like tone in v1. Per-instrument sounds are a later upgrade.
- **A-5** Optional drone on the root, for intonation practice.
- **A-6** Reference pitch adjustable (default A = 440 Hz).
- **A-7** Audio starts only after a tap, as mobile browsers require.

### 6.5 Pitch detection (mic input)

- **P-1** Detects **one note at a time**. Chords are entered as arpeggios.
- **P-2** Works across the full range of the v1 instruments, from bass low E (about 41 Hz) to the top of the guitar and keyboard ranges.
- **P-3** A note counts once it is held steadily for a short time (target around 200 ms, tunable), so slides and noise do not register.
- **P-4** Match tolerance is adjustable: loose (nearest semitone) for theory drills, strict (for example ±20 cents) for intonation work.
- **P-5** Octave handling is a setting: any octave counts (default for theory drills), or exact octave.
- **P-6** A live tuner readout is shown whenever the mic is on: note name, octave and cents sharp or flat.
- **P-7** Mic-driven exercises in v1:
  - **Play the answer:** a single-note card ("V of E♭?") is answered by playing the note.
  - **Scale run:** play a scale in order; each note lights green or red.
  - **Chord arpeggio:** play the chord tones one at a time, in any order.
- **P-8** The app never plays sound through the speaker while it is listening, to avoid hearing itself.
- **P-9** Clear states for mic permission: not asked, granted, denied (with instructions to fix), and no mic available. Every mic exercise has a tap-entry fallback.
- **P-10** Audio from the mic is processed on the device and never recorded or uploaded.

### 6.6 Chord tool

A free-play reference tool, separate from quizzes.

**Name → notes**
- **C-1** Pick a root and a chord type; see the notes, the formula, and the chord on the active view; hear it.
- **C-2** Step through inversions, and on the fretboard through alternative voicings.

**Notes → name**
- **C-3** Enter notes on any view, or by mic as an arpeggio; the chord name appears.
- **C-4** When a set of notes has several valid names, list them all, best match first. The lowest note decides the order (C E G A is C6, or Am7/C).
- **C-5** Incomplete sets get suggestions ("add G♯ for C♯m7").
- **C-6** Sets that match nothing say so plainly and show the intervals present.

**Chords in a key**
- **C-7** Pick a scale; see its seven triads and seven seventh chords with Roman numerals (I, ii, iii, IV, V, vi, vii°). Tapping one opens it in the chord tool.

### 6.7 Progress

- **G-1** Record every answer: card, right or wrong, time taken, input method, date.
- **G-2** A mastery level per card, shown as a heat map by key (and on a circle of fifths in v1.1).
- **G-3** A "weak spots" deck built from the cards with the lowest mastery.
- **G-4** Practice streak and time practiced per day.
- **G-5** Export and import all progress and settings as a single file, as a manual backup and a way to move between devices until sync exists.

### 6.8 Settings

Instrument profile, written or concert pitch, tuning, range, note-label style, reference pitch, mic tolerance, octave handling, left-handed fretboard, a light / dark theme toggle (following the device setting until changed), and reset progress (with confirmation).

## 7. Navigation

Four top-level sections:

1. **Practice** — choose a deck and a mode (flash cards or quiz), then drill.
2. **Explore** — free-play scale browser and the chord tool.
3. **Progress** — heat map, streak, weak spots.
4. **Settings**

The instrument profile selector and the view switcher sit in a persistent bar so they are one tap away during practice.

## 8. Technical approach

Confirmed at M0 unless marked otherwise.

- **App type:** installable web app (PWA) built as a static site. No server in v1.
- **Offline:** all code, sounds and content cached on first load; fully usable without a network afterwards. Done with vite-plugin-pwa (Workbox service worker that precaches every built file).
- **Storage:** progress and settings in on-device browser storage (IndexedDB), with the export/import file from G-5 as backup. Browsers can clear on-device storage, so the backup matters. Exception: the few UI preferences that must apply before the first paint (theme, last instrument, last view) are kept in `localStorage`, which can be read synchronously. They are included in the G-5 export.
- **Structure:** a theory engine with no user-interface code, covered by automated tests, with the views, audio and mic layers built on top of it. Correct note spelling is the part most worth testing heavily.
- **Language and tooling:** TypeScript (strict). Build tool **Vite**. UI framework **Preact** with **Preact Signals** for shared state (about 4 KB, plain TSX, so the engine and UI share one language and toolchain). Tests with **Vitest**. Hash-based routing so GitHub Pages needs no server rewrites. The theory engine is its own TypeScript project with no DOM types, and a test fails if it imports anything outside `src/theory/`.
- **Rendering:** the keyboard, fretboard and staff drawn as SVG so they scale cleanly between phone and tablet.
- **Audio:** the browser's Web Audio API.
- **Pitch detection:** the browser's microphone API with an autocorrelation-family algorithm (YIN or McLeod), with the browser's echo cancellation, noise suppression and automatic gain turned off because they distort instrument sound. The analysis window must be long enough for bass low E.
- **Hosting:** needs HTTPS, because browsers only allow microphone access on secure sites. The repository is **public** and the app is hosted on GitHub Pages.
- **Existing libraries:** evaluate established open-source libraries for theory, notation and pitch detection before writing each from scratch.
- **Theory engine (M1):** written in-house rather than using Tonal.js. Spelling reduces to letter + accidental arithmetic (about 650 lines), the engine stays dependency-free inside its architecture boundary, and every spelling rule is ours to test. Notation and pitch detection are still to be evaluated at M3 and M7.

## 9. Milestones

Each milestone ends with something usable on the phone.

| # | Milestone | Result |
|---|---|---|
| M0 | Project setup | Repository, build, installable empty app deployed over HTTPS, opens on phone and iPad; app shell with the four sections, persistent bar and light / dark toggle |
| M1 | Theory engine | Scales, intervals and chords generated with correct spelling for all keys; automated tests pass |
| M2 | Flash cards | Deck builder, flip cards for scale, key signature and interval families; text-only answers. Replaces the paper deck |
| M3 | Views | Keyboard, fretboard and staff display answers; pinned staff; keyboard, guitar and bass profiles |
| M4 | Audio | Notes, intervals, scales and chords play back |
| M5 | Quiz modes | Tap entry on all three views, multiple choice, feedback, session summary, progress recording |
| M6 | Chord tool | Name → notes, notes → name, chords in a key, chord card families |
| M7 | Mic input | Tuner readout, play-the-answer, scale run, chord arpeggio |
| M8 | Progress and polish | Heat map, weak-spots deck, export/import, offline check |

**v1 is M0–M8.**

## 10. After v1

- **v1.1:** modes, pentatonic and blues scales; sus, 6 and add9 chords; circle-of-fifths progress view.
- **Spaced repetition:** schedule cards across days by how well each is known.
- **Brass profiles:** trumpet, French horn and trombone, with the written / concert pitch toggle. Decide then whether tenor clef (trombone) and bass clef (horn) are needed.
- **Ear training (listen and identify):** the app plays an interval, chord or scale and the answer is its name.
- **Advanced ear training, tone and chord:** the app plays a single tone to name, then a chord to name; and the reverse, where the app names a tone or chord and the answer is played or sung into the mic.
- **Call and response:** the app plays a short phrase; play it back through the mic.
- **Theremin and intonation mode:** a continuous pitch trace against a target note, scored on time to reach the note and steadiness holding it. Also useful for trombone and fretless bass.
- **Brass view:** valve fingerings for trumpet and horn, slide positions for trombone.
- **Woodwind profiles** and fingering charts.
- **Per-instrument sounds.**
- **Sync between devices.**
- **Microtonal training:** pitches between the semitones, such as quarter tones and other tuning systems, for both listening and mic exercises.
- **Extended and altered chords, compound intervals, more scale types.**

## 11. Success measures

- The paper deck is no longer needed after M2.
- All 15 major key signatures answered correctly in under 3 seconds each.
- A mic-driven quiz can be completed without touching the screen.
- The mic recognizes a cleanly played note correctly at least 95% of the time on each v1 instrument, in a quiet room.
- The app opens and runs a full session in airplane mode on both devices.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Low bass notes are hard to detect accurately on a phone mic | Longer analysis window for the bass profile; test early in M7 with the real instrument; allow octave-agnostic matching |
| Guitar and bass overtones cause octave errors | Octave-agnostic matching by default; tune the algorithm against recordings of each instrument |
| Mobile browsers handle mic permission and audio start-up differently, especially for installed apps on iPad | Test on both real devices at M0 (audio) and at the start of M7 (mic), not at the end |
| On-device storage is cleared by the browser | Export/import in v1; sync later |
| Scope creep from a long wish list | Milestones each ship something usable; everything in section 10 waits until v1 is done |
| Incorrect note spelling undermines trust in the cards | Theory engine is rule-based and heavily tested; the paper cards serve as a known-good check |

## 13. Decisions and open questions

### Decided

| Question | Decision |
|---|---|
| Public or private repository | Public, hosted on GitHub Pages |
| Sound for v1 | One synthesized piano-like tone |
| Enharmonic answers | Accepted, with a note showing the expected spelling |
| Brass instruments | Moved to a later version |
| Fretboard extent | Whole neck |
| Theme | Three-way control: Auto (follows the device), Light, Dark. Built in M0 |
| License | MIT |
| UI framework and tooling | Preact + Signals, Vite, Vitest, vite-plugin-pwa (see section 8) |
| Hosting path | GitHub Pages at `/woodshed/` (repository `woodshed`) |
| Theory library | In-house engine, no dependency (see section 8) |
| Roman numeral interval cards | A bare numeral on a note means the degree of the major scale built on it: "E♭ V" = B♭, "C VI" = A |
| Melodic minor | Classical form: raised 6 and 7 ascending, natural minor descending. The engine keeps both forms |
| Scale degree labels | Relative to the major scale (1 2 ♭3 4 5 ♭6 7), also used for chord formulas |
| M1 on the phone | Explore gets a text scale browser (type, key, notes with degrees, signature, related keys) |

### Open

1. **Existing apps:** no survey has been done yet of apps that already cover some of these features. Worth a quick look before M2 for ideas to borrow and gaps to fill.
2. **Fret count:** default number of frets for the guitar and bass profiles (20, 22 or 24).

## Appendix: the original paper deck

- **White cards (9):** front is a major key name (B♭, C♯, F♯, A♭, G♭, C♭, E♭, B, D♭). Back is the number of sharps or flats, the scale spelled out, degree numbers 1–8, and for enharmonic keys the twin key with its own count (for example "7♯ / 5♭ (D♭ maj)" on the C♯ card).
- **Green cards (5):** front is a note and "V" (E♭, A, G, E, C). Back is its fifth (B♭, E, D, B, G).

These map to the **Key signature** and **Interval** card families in section 6.1 and are the acceptance check for M2: every paper card must have an exact digital equivalent.
