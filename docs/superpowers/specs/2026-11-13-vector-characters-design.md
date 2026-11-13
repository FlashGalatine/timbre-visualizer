# Blob, Owl and Television: vector characters

Status: the owner asked for this on 13 November 2026, answered one design question (the
Television's screen shows a face), looked at throwaway versions of all three in the effect gallery
and said "Build all three". Every choice below is the builder's unless it says otherwise. The
owner has not yet seen them with a real microphone or in OBS; that look decides whether each is
merged. They are built on three stacked branches (Blob, then Owl, then Television), and this
document covers all three.

## Intent

The owner's brief, in their words: "Let's redesign both Blob and Owl next. Instead of looking
pixelated, they should comprise of vectored shapes. We'll also introduce a new character:
Television. Basically a floating TV that moves and reacts based on sound, just like how Blob and
Owl work." Blob and Owl are the last two effects on the first list of issue #1.

## Goals

- Blob and Owl keep what they do today, drawn as smooth filled shapes with clean outlines.
- A third character, Television, that belongs with them: a floating set whose screen is a face.
- The three read as a family: the same bounce, the same blink, the same happy eyes.
- Each visibly answers the voice, syllable by syllable.

## Non-goals

- A reaction to a yell or a mic thump (as DNA and the planets have). The owner was asked and did
  not want one added. A thump still gives a big bounce, because it is loud.
- New settings. The existing global Bounce setting scales all three, as it does today.

## Anti-goals

- Any part of a character leaving the frame, at any Bounce setting.
- A character that looks dead when it is quiet: each keeps blinking, and with the idle
  animation on, breathing.

## Constraints

- Classic scripts, no build step, 2D canvas only. Timed in seconds from `draw(now, dt)`; only the
  colour reads the wall clock.
- Works on all three overlay pages (260×130 at scale 1, 1248×624 and 1728×624 at scale 4.8) and
  when the box changes size.
- Leaves the canvas state as it found it, and draws the same whatever line settings it is handed.
- Under 1.5 ms of script time per frame on the 16:9 page.
- The bodies are solid: they hide what is behind them. Today's Blob is a faint tinted shape with
  a glowing outline. The owner was told.

## What all three share

**Hearing.** The sound levels are `TimbreHelix.levels` (what DNA and the planets hear). Each
character keeps: a slow loudness (0.25 s), a fast one (0.05 s), the low end (opens over 0.05 s,
closes over 0.25 s) and the high end (0.1 s); `rise`, how far the fast loudness stands above the
slow one (a syllable starting); and `lean`, which end of the sound is winning, from −1 (low) to
1 (high), eased over 0.3 s and zero when the voice is quieter than 0.05. Mic off, it hears silence.

**The bounce.** A damped spring, kicked upward by `rise × a strength × Bounce / 50` and solved
exactly for each frame, so it moves the same at any frame rate. Bounce at 0 stills it.

**The face.** Eyes that blink for 0.16 s every few seconds; happy eyes (upturned arcs) once the
slow loudness passes 0.45, until it falls below 0.35; a mouth that opens with the fast loudness
(`min(1, 1.3 × fast)`), or a small smile when it is closed; blush.

**Colour and glow.** Each body is a palette colour with a lit side and a darker outline, and a
soft glow of light behind it that brightens with the voice.

**Staying in the frame.** A character's bounce is limited to the room there is above it, and the
Blob, which also grows, is drawn smaller when it would not fit.

**Quiet.** Mic on and silent: still, blinking. Mic off with the idle animation on: breathing (and
the Owl sways). Mic off with it off: still.

## Blob

A body outlined by 32 points round a circle, joined by smooth curves.

- Radius `(25 + 13 × loud × Bounce / 50) × scale`, breathing by `1.2 × scale` when idle.
- Each point is pushed out by its own part of the sound: the low end at the top of the body, the
  high end at the bottom, the same on both sides (bands 0 to 10, the upper ones weighted 2.2
  times), by up to `7 × scale × Bounce / 50`, rising over 0.04 s and falling over 0.18 s; and by
  a slow three-part wobble of a few percent.
- The spring (2.6 Hz, damping 0.22, strength 2600) lifts it. It stretches on the way up and
  squashes as it lands: by `0.007 ×` the spring's speed, at most 13% either way.
- The face sits a little above its middle, sized to the body.

## Owl

An egg-shaped body with a paler belly and three rows of feather marks, a wide head with two ear
tufts and pale discs round large eyes, a small beak, two wings, a tail and two three-toed feet.

- The spring (2.3 Hz, damping 0.25, strength 2200) bobs it; it leans by `0.16 × lean × Bounce / 50`
  rad, and sways by 0.05 rad when idle.
- The wings lift by `0.12 + 1.15 × flap` rad, where `flap` follows `1.7 × fast × Bounce / 50` over
  0.07 s, and flutter (22 rad/s) while the slow loudness is above 0.3.
- The lower beak drops with the voice (`min(1, 1.4 × fast)`).
- Three music notes float up beside it while the slow loudness is above 0.22, fading as they rise.
- Its eyes are the shared eyes, larger, and look the way it leans.

## Television (new)

A floating retro set: a rounded cabinet on two feet, a screen on the left, and on the right two
dials and a three-line speaker; two antennae with ball tips on top.

- It hovers (2.2 px × scale, 1.7 rad/s) and the spring (2.1 Hz, damping 0.24, strength 2000)
  bounces it; it tilts with `lean` and with the bounce.
- The antennae are on a spring of their own (3.4 Hz, damping 0.14), kicked by each syllable and
  pulled by `lean`.
- The dials turn with the low and the high end; the speaker's lines brighten with the fast loudness.
- **The screen** is dark glass with scan lines, a slow rolling band and a shine. Mic on, it shows
  a face in glowing lines: two upright bars for eyes (which blink and turn happy as the others
  do) and a mouth that is the live waveform, flat with a slight smile when quiet. Mic off, it
  shows static and a sleeping face.
- It is listed after Owl as `television`, the 51st effect.

## Code

- `overlay/characters.js`, `globalThis.TimbreCharacters`: the hearing (`createEars`), the spring
  (`createSpring`), `blink`, `bounce`, the three characters' poses (`createBlob`, `createOwl`,
  `createTelevision`: the numbers a drawing needs, from the sound) and two helpers that take the
  canvas context as an argument (`paintFace`, `glowBehind`). Loadable under Node. Loaded by all
  three overlay pages after `infall.js`. It uses `TimbrePlanets` for colours.
- `overlay/factories/blob.js`, `owl.js`, `television.js`: the effects. Each reads the sound,
  steps its pose and draws. `probe()` for the tests. The Television's static comes from
  `TimbreHelix.rng(window.__televisionSeed)`.
- `shared/viz-config.js`: the name `television` after `owl`, with no settings of its own.

## Testing

- `npm run verify`: the hearing, the spring (exact at any frame rate), the blink, and each pose
  under Node (size and bounce with the voice, the Bounce setting, staying in the frame on three
  pages, quiet states, frame-rate independence).
- `npm run verify:render`: on real pages with scripted sound (each character inside the frame on
  all three pages, the voice opening the mouth and making it happy, a syllable bouncing it,
  blinking, the Bounce setting, quiet states, config push and size change, canvas state with
  unusual line settings, cost; and for the Television, the face on the screen with the mic on and
  static with it off, and its place in the list).
- Whether they look like a blob, an owl and a television is judged by eye; no test measures it.

## Not checked by any test

- A real microphone: how lively the bounce feels with real speech.
- The frame rate in OBS.
