# A smooth DNA helix that shatters

Design, 12 November 2026. Status: approved by the owner, 12 November 2026.

## Intent

Timbre's DNA effect draws two flat sine lines out of snapped squares. It looks pixelated, it has no depth, and nothing about it marks a loud moment. It is one of the effects listed for a smooth redesign in the project's issue 1.

The owner wants, in their words, "a smooth double helix that twists and glows", that reacts to the voice, and that breaks apart when the mic is hit hard: "if certain meters peak (for example, I'm yelling or I'm thumping really hard on my mic), the DNA strands explode. The strands reconnect a few seconds after volume reaches normal levels."

This replaces the `dna` effect with that helix. The effect keeps its name, its place in the list and its existing setting.

## What was decided with the owner

These are the owner's decisions. Do not reopen them.

| Decision | Detail |
|---|---|
| The look | "A smooth double helix that twists and glows." Approved from a throwaway version. |
| Louder means | "Twist faster and glow brighter the louder I talk." |
| The helix opens and closes | It widens with the voice and narrows in quiet. The owner asked for this after seeing a version that barely moved. |
| The two strands move separately | One follows the low end of the sound, the other the high end, as today's effect does. |
| A hard peak shatters it | "The strands shatter into glowing pieces that fly outward." |
| It comes back | "The pieces drift back and snap together into the helix", a few seconds after the volume is back to normal. |
| How often | "Rarely, only when I really yell or thump the mic." Normal talking must not set it off. |
| Settings | Two new sliders: shatter sensitivity, and how long before it reconnects. |
| Quiet or muted | "Twist slowly and glow dimly." |

## Goals

- A helix that reads as a smooth, glowing, three-dimensional double helix at every page size.
- Its twist speed, glow and width follow the voice closely enough that the owner can see themselves talking in it.
- A yell or a thump on the mic shatters it; normal talking never does.
- After a shatter it always comes back by itself.
- It looks the same at 60 fps in OBS and at 165 Hz in a browser.

## Non-goals

- The other effects in issue 1 (Blob, Owl, Comet). Each gets its own design.
- The Afterglow setting. This effect does not use it.
- A setting to bring the old pixelated look back.
- The microphone constraints (which device, and the browser's own automatic gain, echo and noise handling). They stay as they are, because changing them would change the level every other effect sees.
- WebGL. This stays a 2D canvas effect.

## Anti-goals

The owner had none to add ("I honestly wouldn't know"), so these are the writer's. They would make the result a failure even if it works:

- A shatter during normal talking.
- Anything stepped, snapped to a grid or jittery. That is the look being replaced.
- A shatter that leaves the canvas empty because the pieces flew off it.
- A helix stuck in pieces, or one that jumps back with no drift and snap.
- Dropped frames in OBS, in either state.
- Motion whose speed depends on the frame rate.

## Constraints

- Plain `<script>` files, no build step, 2D canvas (`ctx`). Runs as an OBS Browser Source and in a normal browser.
- Three page layouts: canvas 260×130, 1248×624 and 1728×624. Every size goes through the `SCALE` global.
- The sound arrives as 32 frequency values and 64 waveform samples (`frequencies`, `waveform`), each 0 to 255, refreshed on a 33 ms timer and overwritten in place. Both are `null` while the mic is off.
- The master loop calls `draw(now, dt)` with `now` in milliseconds and `dt` in seconds (capped at 0.1). Today's `dna` ignores both and reads the wall clock. The new one must use them for everything that moves.
- Every frame is cleared and redrawn from remembered state. Nothing is made by fading the previous frame's pixels.
- `core.js` calls `onResize` on every config push, including a move of this effect's own sliders, even when the size is unchanged. A push must not reset the helix. Detect a real size change by comparing sizes at draw time.
- Per-effect settings live in `DEFAULT_PER_VIZ` in `shared/viz-config.js`. They are numbers from 0 to 100 unless `PER_VIZ_MAX` gives another maximum. The control panel rounds them to whole numbers; `sanitizeConfig` clamps but does not round, so the effect must accept a fraction. The control panel builds one slider per numeric key and labels it from the key name (`shatterSensitivity` shows as "Shatter Sensitivity"), so new keys need no control panel change.
- The repo is public. Nothing private goes in it.

## The helix

### Shape

- Two strands wound round a horizontal axis through the middle of the canvas, half a turn apart, running the full width. Seen from the side, each strand is a sine curve: strand A at `MID + Ra·sin θ`, strand B at `MID − Rb·sin θ`, with `θ = k·x + phase`.
- Depth is `cos θ` for strand A and `−cos θ` for strand B. Where a strand is toward the viewer it is wide and bright; where it is away it is narrow and dim. Width runs from `1.5 × SCALE` at the back to `3.3 × SCALE` at the front, and opacity from 0.32 to 1.0 of the strand's brightness. Each strand is a ribbon whose width changes smoothly along it, not a line of fixed width.
- Draw order: the back halves of both strands, then the rungs, then the front halves. The front of one strand must visibly pass over the back of the other.
- Rungs join the strands at fixed points on the helix, nine per turn, so they turn with it. Each rung is two halves that meet at the axis, each half in its own strand's colour, `1.5 × SCALE` wide with round ends. A rung is not drawn where the strands cross (`|sin θ| < 0.14`).
- Smooth curves throughout. No snapping to a grid. The curve must stay smooth at the turning points, where a strand passes from front to back.
- The winding keeps today's rule: `k = (0.025 + helixFreq / 100 × 0.05) / SCALE` radians per pixel, with `helixFreq` the existing setting.

### Colour and glow

- Strand A takes its colour from the palette at `colorT`, strand B at `colorT + 1.5`, each as a gradient that runs about 1.2 palette steps along its length. `colorT` is computed exactly as `visualizer` and the other bar and wave effects compute it, from the wall clock (`Date.now()`), `cfgColorSpeed` and `cfgColorHue`, so the colours stay in step when the owner switches effects. Colour is the one thing that reads the wall clock; everything that moves uses `now` and `dt`.
- A soft glow in the strand's colour (`shadowBlur`), and a thin white core along the front halves.
- Today's faint centre line and the white dots where the strands cross are dropped.

### Following the voice

Three levels, each 0 to 1:

| Level | From | Drives |
|---|---|---|
| Loudness | The largest distance of any waveform sample from the centre, × 1.5 × Gain, clamped to 1 | Twist speed and glow |
| Low | The mean of frequency values 0 and 1 (the body of a voice), × 1.3 × Gain, clamped to 1 | Strand A's width |
| High | The mean of frequency values 2 to 10 (consonants and "s" sounds), × 3 × Gain, clamped to 1 | Strand B's width |

- **Twist**: `phase` advances by `(0.7 + 5.8 × loudness) × dt` radians, with loudness smoothed over about 0.12 s. The phase is accumulated, never computed from the clock, so a change of speed never makes the helix jump.
- **Glow**: brightness `0.5 + 0.5 × loudness`, blur `(3 + 11 × loudness) × SCALE`.
- **Width**: each strand's radius heads for `(12 + 22 × level) × SCALE`. It opens fast (about 0.05 s) and closes more slowly (about 0.2 s).
- All smoothing is written against `dt`, so it is the same at any frame rate.

### Quiet and muted

- **Mic on, silence**: the levels are zero. The helix is narrow, dim (brightness 0.5) and turns at its slowest (0.7 radians per second).
- **Mic off, idle animation on**: the same slow, dim helix. Loudness stays at zero, so the twist and the glow do not change. Only the two widths breathe, gently and out of step (the low and high levels sit around 0.22 and move by about 0.12).
- **Mic off, idle animation off**: as silence.

The helix never stops turning and never disappears.

## The shatter

The effect is always in one of three states: **whole**, **in pieces**, or **returning**.

### What sets it off

A shatter starts when all of these hold:

- the mic is on;
- the helix is whole, and has been for at least 0.4 s;
- the **peak level** is at or above the **threshold**.

The peak level is the raw input level, 0 to 1, before Gain. Gain is a taste setting for how big the effects look; turning it up must not make shatters more common.

The threshold comes from the Shatter Sensitivity setting `s` (0 to 100):

- `s = 0`: the helix never shatters.
- `s` from 1 to 50: the threshold runs in a straight line from 1.0 down to 0.90.
- `s` from 50 to 100: it runs in a straight line from 0.90 down to 0.50.

The default, 50, is the 0.90 the owner saw. The lower half of the range is for a mic that clips easily; the upper half is for a quiet mic that never gets near the top.

### Measuring the peak

Today the overlay looks at 64 samples every 33 ms. That is about 1.3 ms of sound out of every 33, or 4% of it. A yell lasts long enough to be caught. A thump can fall between two looks and be missed, and a thump is one of the two triggers the owner named.

So the capture code gains one measurement: the largest sample over the whole interval since the last look.

- In `overlay/audio-capture.js`, a second analyser on the same source, with a window long enough to cover the 33 ms interval at the audio context's sample rate (2048 samples at 48 kHz). On each tick, take the largest distance of any sample from the centre, as 0 to 1.
- Publish it as a new global beside `frequencies` and `waveform`, and through `window.__timbre` for the tests. It is `null` while the mic is off.
- Nothing else changes: `frequencies` and `waveform` keep their sizes and meaning, and no other effect reads the new value.
- The helix uses it for the shatter trigger and the calm test only. Twist, glow and width keep using the existing arrays.
- If the value is missing (an older capture file, or a test that does not set it), the helix falls back to the peak of `waveform`.

### What happens

- Each strand is cut into short lengths, each about 2% to 4% of the canvas width, and each rung half becomes a piece. At the default winding that is about 120 pieces.
- Every piece keeps its shape, colour and depth, and flies outward from where it was: mostly away from the axis, with some sideways scatter and some spin. It starts fast (30 to 120 `× SCALE` pixels per second), slows within about half a second, and then keeps a slow drift (2 to 6 `× SCALE` pixels per second).
- Pieces flash white at the moment of the blast and cool to their own colour in about a second.
- A burst of about 46 sparks leaves the strands and fades within a second.
- The twist stops while the helix is in pieces, so every piece has a fixed place to return to.
- Pieces keep the back, rungs, front draw order, and are brighter than the calm helix so the blast reads clearly.

The numbers above are the throwaway version's and may be tuned. What must hold:

- **The pieces stay in the frame**, however long the helix is in pieces. Past a margin of about `8 × SCALE` from any edge, a piece is slowed, eased back to the margin and its slow drift turned inward. The blast may carry a piece past the edge for a moment; it must come back.
- At every page size, at least nine tenths of the pieces have their centre inside the canvas at every moment, in both of these runs: one blast followed by 10 s of calm, and 10 s of continuous peaks. The throwaway version measures 1.00 and 0.99 at 1728×624. It has not been measured on the 260×130 page.
- After a long yell the pieces are spread through the frame, not lined up along its edges.
- The piece count stays under 200 at any winding.

### While in pieces

- Another peak, at least 0.6 s after the last one, jostles the pieces at less than half the first blast's strength. A jostle pushes each piece in a random direction, not outward: outward pushes repeated through a long yell pin every piece against the top and bottom edges.
- The effect counts how long the sound has been **calm**. Calm means no peak: the mic is off, or the peak level is below the threshold. Normal talking is calm. Any frame with a peak puts the count back to zero, so the count is the time since the last peak.
- With Shatter Sensitivity at 0 there is no threshold, and every frame is calm.

### Coming back

- When the calm count reaches the Reconnect Seconds setting (never less than 0.3 s), the return begins. It takes 1.5 s.
- For the first 78% of that time the pieces drift most of the way home (72% of the distance), each easing in and out, with some starting a little later than others so they do not move as one block.
- In the last 22% they snap the rest of the way, accelerating, and heat up to white as they close.
- At the end the helix is whole again, with one bright flash that dies away in about a quarter of a second, and the twist resumes from the angle it stopped at.
- A peak during the return sends the pieces out again from where they are, at about 70% of a first blast, and the calm count starts over.

### Edges

- **Effect switched away and back**: it starts whole.
- **Canvas size actually changed** (decorations toggled, a different page): it becomes whole at once, with no return animation. A config push that leaves the size alone must change nothing.
- **Mic lost while in pieces**: that counts as calm, so the pieces return after the delay.
- **The source was hidden and is shown again** (more than a second between two frames): it resumes whole.
- **Shatter Sensitivity moved to 0 while in pieces**: no new shatter or nudge; the pieces return as normal.
- **Reconnect Seconds changed while in pieces**: the new value applies to the count already running.

## Settings

All three are per-effect settings under `perViz.dna`.

| Key | Range | Default | Label shown | Meaning |
|---|---|---|---|---|
| `helixFreq` | 0 to 100 | 50 | Helix Freq | Existing. How tightly the helix is wound. Unchanged. |
| `shatterSensitivity` | 0 to 100 | 50 | Shatter Sensitivity | How easily a loud moment shatters the helix. 0 turns shattering off. |
| `reconnectSeconds` | 0 to 10 | 3 | Reconnect Seconds | How long the sound must stay calm before the pieces start back. |

- `shared/viz-config.js`: add the two keys to `DEFAULT_PER_VIZ.dna`, and `reconnectSeconds: 10` to `PER_VIZ_MAX.dna`.
- A config saved before this change has no value for the new keys. `sanitizeConfig` already fills in defaults for missing keys; a test must pin that.
- No change to `control/control.html` is expected. Check that the three sliders appear and reach the overlay.

## Code

- The new effect replaces the body of `overlay/factories/dna.js` and registers under the same name, `dna`. The three overlay pages already load that file.
- The parts that are plain arithmetic must load and run under Node, so `verify.mjs` can test them without a browser, the way it tests `overlay/afterglow.js`: the sensitivity-to-threshold rule, the three levels, the state machine (whole, in pieces, returning) with its timers, and the return curve. Where they live and what they are called is the builder's choice. If that means a new file, all three overlay pages must load it.
- `TimbreGlow.trace` in `overlay/afterglow.js` already draws a smooth curve from a list of points and may be used. It passes through the midpoints between neighbours, not the points themselves, which makes no visible difference when the points are close together.
- Randomness (piece lengths, directions, sparks) must be injectable or seedable so the tests are repeatable.

## Testing

- **Arithmetic, in `verify.mjs`**:
  - the threshold at sensitivity 0, 1, 50 and 100;
  - a scripted run: quiet, a peak, quiet. Exactly one shatter; the return begins after the reconnect time and ends 1.5 s later; the helix is whole afterwards;
  - the same run stepped at 30, 60 and 165 frames per second changes state at the same times, to within one frame;
  - talking-level sound (peaks up to 0.7) for 60 seconds at the default sensitivity never shatters;
  - a peak while in pieces restarts the calm count; a peak during the return goes back to in pieces;
  - talking-level sound (peaks up to 0.7) straight after a shatter still leads to a return after the reconnect time;
  - the two containment runs under "What happens" (one blast then 10 s of calm; 10 s of continuous peaks) keep nine tenths of the pieces inside, at 260×130 and at 1728×624;
  - mic off while in pieces leads to a return; sensitivity 0 never shatters;
  - turning Gain up to its maximum does not cause a shatter on talking-level sound;
  - the new settings: defaults, clamping (`reconnectSeconds` to 10), and an old saved config gaining the defaults.
- **Rendered, in `verify-render.mjs`**, stepping `draw()` by hand with scripted sound the way the afterglow checks do:
  - the calm helix draws at all three canvas sizes, and no column of the canvas is empty between the strand ends;
  - louder sound gives a wider and brighter picture than quiet sound;
  - low-only sound widens strand A and not strand B, and high-only the reverse;
  - a peak spreads the picture over a much taller area than the helix, and the canvas is not left empty;
  - after the return the picture is back within the helix's band;
  - moving a slider (a config push) while in pieces does not reset the pieces;
  - the control panel shows three sliders for DNA and moving one reaches the overlay;
  - the new peak value appears when the fake mic is listening and is `null` when the mic is denied.
- **By the owner, in OBS, with the real mic**: this is the test that decides it. Normal talking for a few minutes never shatters. A real yell does, and a real thump does. The pieces come back after the set delay. No visible stutter in either state. This has not been done with any version yet: the throwaway version was only ever driven by simulated sound.
- **Speed**: script time inside `draw()` at 1728×624 stays under 1 ms per frame on average in every state, and under 4 ms on the frame of the blast. The throwaway version measures 0.34 ms whole, 0.40 ms in pieces and 1.6 ms on the blast frame on the owner's machine. Script time does not include what the glow costs the graphics card, which has not been measured. If OBS drops frames, the glow on the pieces is the first thing to make cheaper.

## Documents

- `CHANGELOG.md`: an entry under Unreleased for the new helix, the two settings and the new peak measurement.
- `docs/EFFECTS.md`: the new peak value belongs in the list of what an effect can read.
- Ticking DNA on issue 1 is the owner's to ask for.

## Known risk

The browser's automatic gain may be on for the mic (the capture code asks for audio with no constraints, and this design does not change that). It evens out loud and quiet speech, so a yell may reach the overlay closer to talking level than it sounds in the room. The peak measurement and the sensitivity slider are the answer to that: if the default does not separate a yell from talking on the owner's mic, the slider is where it gets tuned, and the default may need to move after the owner's test.

## Calls I made

None of these is in the owner's words. Items 1 to 6 were shown to the owner as guesses and they answered "Everything looks good"; item 3 has changed since, as marked. The rest are new in this document.

1. A shatter is judged on the raw input level, so Gain does not change how often it happens.
2. "A few seconds" is a calm wait followed by a 1.5 s return.
3. Another peak while in pieces restarts the wait and moves the pieces. Changed after review: it now jostles them in random directions. The owner saw "nudges them outward", which pinned the pieces to the edges during a long yell.
4. The twist stops while the helix is in pieces.
5. A burst of sparks at the blast.
6. The "high end" strand listens to consonants and "s" sounds (about 1.5 to 8 kHz), not the very top of the range that today's effect uses, where a voice has almost nothing.
7. The existing winding slider stays. The owner was told and did not object.
8. The reconnect slider is in whole seconds, 0 to 10, and starts at 3. The throwaway version waited 2.5 s; whole seconds is what the control panel's sliders give without changing the panel.
9. The sensitivity slider is 0 to 100 with 0 meaning off, 50 the level the owner saw, and a wider reach on the upper half for quiet mics.
10. The overlay gains a second measurement of the mic, the loudest moment across each interval, so a short thump is not missed. It touches the shared mic code, but no other effect changes.
11. Calm means no peak, so the wait is the time since the last peak and normal talking does not hold the helix in pieces. An earlier version used 75% of the shatter level; a reviewer showed that loud talking could then keep it apart for as long as the owner kept talking.
12. Today's centre line and crossing dots are dropped.
13. With the mic off and idle animation on, only the strand widths breathe. The twist and glow stay slow and dim, as the owner asked for a muted mic.
14. The anti-goals are mine.
15. After a real change of canvas size, or after the source was hidden, the helix resumes whole.
16. Pieces are kept inside the frame: near an edge they slow, ease back and drift inward. The owner has not seen this; the version they looked at let pieces drift off.
17. Colour follows the wall clock, like the bar and wave effects, so it stays in step with them.

## Reference

The throwaway version the owner approved, and the gallery used to view it, are on the owner's machine, outside this repo, under `_audits/2026-11-10/timbre-gallery/` in the parent workspace. `spikes/dna-helix.js` is the approved look and motion (`spike-dna-helix`). It has been brought in line with this document on calm, idle, jostling and keeping the pieces in the frame. It is a reference for the look, not code to copy: it reads its two settings from test globals (the reconnect time as 0.5 to 6 s, default 2.5), judges the peak from the 64-sample waveform, has no seedable randomness and has no tests.
