# Afterglow for the bar and wave effects

Design, 11 November 2026. Status: approved by the owner, 11 November 2026.

## Intent

Six of Timbre's 2D effects draw only the sound of this instant: every frame wipes the canvas and starts again. A loud moment is gone the frame after it ends, which makes the effects look flat.

The owner wants a loud moment to leave a mark that outlasts the sound. In their words: "A ghost of the peaks lingers and fades out slowly", and the ghost is "a dimmer copy of the whole shape", not a thin marker like the one Peak Hold draws today.

This adds that afterglow to six effects, and redraws the two waveform effects as smooth curves on the way.

## What was decided with the owner

These are the owner's decisions. Do not reopen them.

| Decision | Detail |
|---|---|
| What the ghost is | A dimmer copy of the whole shape at its loudest. It lingers, then fades out in place. |
| Bars | Approved from a throwaway version: when a bar drops, a dimmer bar stays at the height it fell from. |
| Waveforms become smooth | The stepped, pixelated line is replaced by a smooth glowing curve. Chosen after seeing both. |
| Waveform ghost | "Echoes": at each loud moment the whole curve is frozen as a dim copy, and each copy fades on its own. Chosen over a soft band and over a blur of everywhere the line had been. |
| Scope | Bar ghosts on `visualizer`, `peak-hold`, `ring-bars` and `sine-bars`. Smooth line with echoes on `waveform` and `ring-waveform`. `spectrogram` and `pulse-rings` are not touched. |
| Control | One slider, shared by all six effects, for how long the afterglow lasts. Zero turns it off. |
| The hard rule | The afterglow must "never cover or distract from the live shape". |

## Goals

- A loud moment leaves a visible, dimmer copy of itself that fades over a time the owner sets.
- The two waveform effects read as smooth glowing lines.
- It looks the same at 60 fps in OBS and at 165 Hz in a browser.

## Non-goals

- `spectrogram` (already a scrolling history) and `pulse-rings` (each ring already fades).
- The ribbon across the top of `sine-bars`. It stays as it is.
- The 3D scenes' afterglow and the Trail veil setting. Neither changes.
- Any other effect, and the resolution of the sound analysis.
- A ghost that changes colour as it fades. It keeps the live shape's colours, only dimmer.

## Anti-goals

These would make the result a failure even if it works:

- A ghost that covers the live shape, or is bright enough to compete with it.
- A ghost that moves, pulses or flickers, or that pops in or out. A ghost only fades.
- Old lines piling up into clutter.
- Anything left on screen in silence once the last ghost has faded.
- A fade whose speed depends on the frame rate.

## Constraints

- Plain `<script>` files, no build step, 2D canvas (`ctx`). Runs as an OBS Browser Source and in a normal browser.
- Three page layouts: canvas 260×130, 1248×624 and 1728×624. Sizes already scale through the `SCALE` global; anything new must too.
- The sound arrives as 32 frequency values and 64 waveform samples (`frequencies`, `waveform`), each 0 to 255. They are refreshed on a 33 ms timer, not once per drawn frame, and the same two arrays are overwritten each time. Anything kept (an echo's curve) must be a copy.
- The master loop calls `draw(now, dt)` with `now` in milliseconds and `dt` in seconds (capped at 0.1). Today's six effects ignore both. The afterglow must use them.
- Config arrives as full snapshots through `TIMBRE.sanitizeConfig`, which drops unknown keys and clamps numbers. A new setting must be added to the shared tables in `shared/viz-config.js`.
- **Ghosts are redrawn every frame from remembered values (heights, lines, times). They are never made by fading the previous frame's pixels.** An 8-bit canvas faded that way leaves a faint residue that never clears, which is an open defect in another effect.
- The repo is public. Nothing private goes in it.

## How a ghost fades

One rule for every ghost. With `T` the afterglow time in seconds and `age` the ghost's age in seconds:

- For the first 15% of `T` the ghost is at full strength (1).
- After that, strength is `(1 − (age − 0.15·T) / (0.85·T))²`.
- At `age ≥ T` the ghost is gone and is forgotten.

A ghost's opacity is its strength times a ceiling given below. Ages come from `now`, never from counting frames.

## Bar ghosts

Applies to `visualizer`, `peak-hold`, `ring-bars` and `sine-bars`. The live bars are drawn exactly as today, on top.

Each bar remembers a short list of ghosts. A ghost is a height and the time it was made.

Every frame, for each bar, before drawing:

1. Forget every ghost at or below the bar's live height. The live bar covers it.
2. If the bar is lower than it was on the previous frame, add a ghost at the previous frame's height, made now.
3. Forget every ghost older than `T`.

This keeps the list ordered: the tallest ghost is the oldest. Heights are the same stepped values the live bar uses, so the list is at most a few dozen entries.

To draw, walk from the live bar upward. The strip between one ghost's height and the next lower height (or the live bar's top) is filled in the bar's current colour at **0.42 × that ghost's strength**, relative to the live bar's own opacity. So a bar that fell from a tall peak, then rose and fell from a lower one, shows a brighter ghost in front of an older, dimmer, taller one, and nothing ever jumps.

The tallest ghost also gets a dim copy of the bar's bright tip, at 0.63 × its strength.

Per effect:

- **`visualizer`**: as above. This is the approved version.
- **`sine-bars`**: as above. Its bars are drawn at 55% opacity, so its ghosts are 0.42 of that. The ribbon is untouched.
- **`ring-bars`**: the "height" is the spoke's length. The ghost is the same row of squares the live spoke is made of, continued out to the ghost's length, at the ghost's opacity. The dim tip is the spoke's tip square.
- **`peak-hold`**: the ghost has no dim tip, because the falling marker already marks the peak. The marker stays.

### Peak Hold's marker, timed in seconds

Since this effect is being opened anyway, its marker stops counting frames:

- It holds for **0.3 s** (today: 18 frames, which is 0.3 s at 60 fps and 0.11 s at 165 Hz).
- It then falls at **(12 + 1.08 × fallSpeed) × `SCALE` pixels per second**, with `fallSpeed` the existing 0 to 100 knob. At 60 fps on the smallest page this is exactly today's speed. On the large pages it is `SCALE` times faster than today, so the marker crosses the same share of the canvas per second on every page. Today it is nearly five times slower on the large pages, which is a known defect.

The marker works whether the afterglow is on or off.

## Smooth waveforms

Applies to `waveform` and `ring-waveform`. These replace the stepped look; there is no setting to bring it back.

### The line

- The samples are joined by a smooth curve: quadratic segments that pass through the midpoint between each pair of neighbouring samples, with the sample as the control point. No snapping to a grid.
- Stroke width `2.2 × SCALE` (never under 1.5 px), round joins and caps.
- Colour is a gradient along the line with nine stops taken from the palette, `getColor(colorT + (k / 8) × 1.5)` for k = 0 to 8, so it matches the colour sweep the stepped line had.
- A soft glow: `shadowBlur` of `8 × SCALE` in the palette colour at the middle of the gradient.
- A bright core on top: the same path, white at 70% opacity, 0.35 × the stroke width, no glow.
- `waveform` keeps its faint centre line, and fills the area between the curve and the centre line with the gradient at 12% opacity. The curve is kept inside the canvas by at least one stroke width.
- `ring-waveform` is the same curve closed into a ring, with its radius displaced by the samples as today. It keeps its guide circle, its 10% fill, its centre dot and its Amplitude knob.

### Echoes

Each frame has a loudness: the largest distance of any sample from the centre after gain, clamped to 1. (Gain goes up to 200%, so the clamp matters.)

The effect follows the loudness with a **follower** that rises at once and falls over time: `follower = max(loudness, follower × exp(−dt / 0.15))`. It then watches for a loud moment to pass:

1. While it is **armed**, it tracks the follower's highest value (the peak) and keeps a copy of the loudest frame's curve as the candidate.
2. When the peak is above 0.1 and the follower has fallen below 60% of the peak, the loud moment has passed. The candidate is frozen as an echo, made now, unless the previous echo was made less than `T / 6` seconds ago, in which case this one is skipped. Either way the effect disarms and forgets the candidate and the peak.
3. While disarmed, it tracks the follower's lowest value since then. When the follower rises 0.08 above that low, it arms again.

What this must deliver, whatever numbers the builder ends up with:

- **One echo per burst** of sound (a syllable, a beat), and the **same echoes at 30, 60 and 165 frames per second**. A scripted burst must make exactly one echo at every frame rate.
- **Never more than six echoes alive**, and no echo ever removed before it has faded. The `T / 6` spacing guarantees both, so there is no "oldest is pushed out" case.
- An echo is drawn behind the live line, as the same smooth curve in the current colours, at 0.8 × the stroke width and **0.6 × its strength**, with no glow and no core. On `waveform` it also gets its fill to the centre at 0.07 × its strength.
- Echoes are forgotten at `age ≥ T`, and all at once if the number of samples changes.

The follower must rise at once. An earlier version of this rule compared a slowly rising average with the raw loudness; it froze two to five copies at the start of every burst, more at higher frame rates, and stacked copies got nearly as bright as the live line. The throwaway version has been corrected to the rule above.

Known limit: a long steady sound still makes an echo now and then (about one a second in simulation), because the loudness of such a short slice of sound wobbles. That reads as afterglow and is acceptable. The builder may tune the four numbers (0.15 s, 60%, 0.1, 0.08) against real speech as long as the three requirements above still hold.

## The setting

| Key | Range | Step | Default | Meaning |
|---|---|---|---|---|
| `afterglow` | 0 to 4 | 0.1 | 1.6 | How long a ghost lasts, in seconds. 0 turns the afterglow off. |

- `shared/viz-config.js` gains the key in the default config and in `sanitizeConfig`, and a list of the six effects that use it, so the control panel knows when to show the slider.
- It is **not** added to the table of global sliders, because those show for every effect.
- `control/control.html` shows a group with one slider, labelled "Afterglow (seconds)", whenever the active effect is one of the six. Build it the way the "Scene placement" group is built.
- The overlay reads it the way it reads the other top-level settings.

Behaviour at the edges:

- **0**: no ghosts are kept or drawn. The six effects look as they would without this feature (with the smooth line, and Peak Hold's marker still working).
- **Lowered while ghosts are showing**: ghosts older than the new time disappear at once. That is acceptable; it only happens while the owner is moving the slider.
- **Mic off or idle animation**: no new ghosts are made. Ghosts already showing finish fading.
- **Effect switched, or the canvas size or the Bars count actually changed**: ghosts start again from nothing. Detect a size change by comparing sizes at draw time. Do not reset in `onResize`: `core.js` calls it on every config push, including a move of this very slider, even when the size is unchanged.

## Shared code

The fade rule, the bar-ghost bookkeeping and the echo logic are each written once and used by the effects that need them. They must be plain arithmetic that the Node test suite can load and run without a browser, the way it already tests the scene kit's arithmetic.

Where they live (a new file loaded by all three overlay pages, or something else) and what they are called is the builder's choice.

## Testing

- **Arithmetic, in `verify.mjs`**:
  - the fade rule at its corners (start, end of the hold, halfway, the end);
  - bar-ghost bookkeeping for a scripted rise and fall, including a lower second peak in front of a taller first one;
  - the same scripted sound stepped at 30 and at 60 frames per second leaves the same ghosts at the same strengths;
  - echoes: a scripted run of bursts (sudden and ramped) makes exactly one echo per burst at 30, 60 and 165 frames per second, with the sound scripted against time in 33 ms steps; fast bursts never leave more than six alive;
  - the new setting: default, clamping, and the list of six effects being real effect names.
- **Rendered, in `verify-render.mjs`**, for each of the six effects with a scripted loud-then-quiet sound:
  - after the drop there are ghost pixels where the loud shape was, and they are dimmer than the live shape;
  - after the afterglow time has passed, nothing is left but the live shape;
  - with the setting at 0 there are never ghost pixels;
  - with the mic off, no ghosts appear.
  - moving the afterglow slider while ghosts are showing does not wipe them.
  - The control panel shows the slider for one of the six, hides it for another effect, and moving it reaches the overlay.
  - The 2D effects have no test hook for sound today, and sound written into the arrays is overwritten 33 ms later. How the render tests feed a scripted sound (a hook, or stepping `draw()` by hand) is the builder's choice.
- **By eye, by the owner in OBS**: the six effects over a bright and a dark source, talking and with music.
- **Speed**: the script time inside `draw()` for each of the six stays under 0.5 ms per frame at 1728×624. The throwaway versions measure 0.02 to 0.06 ms on the owner's machine.

## Calls I made

The owner has seen each of these in conversation and did not object, but none is in their own words. Check them while reading.

1. The slider runs from 0 to 4 seconds and starts at 1.6, the value the throwaway version opened with.
2. It is a new setting, not Trail veil. The 3D scenes keep using Trail veil for their own afterglow.
3. A ghost keeps the live shape's colours and does not cool toward red.
4. The smooth waveform replaces the stepped one; there is no option to keep the old look.
5. Peak Hold keeps its marker, gets a ghost without the dim tip, and its marker is retimed in seconds and scaled to the page.
6. The ribbon in Sine Bars gets no echoes.
7. No new ghosts while the mic is off or the idle animation is showing.
8. Ghosts are computed from remembered values, not from fading old pixels.
9. A ghost is at most 42% of the live bar's opacity, and an echo at most 60% of the line's. These are the values the owner looked at.
10. The echo rule was corrected after a review found it froze several copies per burst. The owner chose echoes from the uncorrected version, so the corrected one needs their eye.
11. Echoes are never made closer together than a sixth of the afterglow time. In fast speech some syllables therefore leave no echo.

## Reference

The throwaway versions the owner chose from, and the gallery used to view them, are on the owner's machine, outside this repo, under `_audits/2026-11-10/timbre-gallery/` in the parent workspace. `spikes/afterglow.js` holds the approved bar ghost (`spike-ghost-bars`) and the approved smooth line with echoes (`spike-smooth-wave-echo`). It is a reference for the look, not code to copy: it has no ring versions, no setting, and no tests.
