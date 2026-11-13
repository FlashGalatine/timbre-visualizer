# Vector characters (Blob, Owl, Television) Implementation Plan

**Goal:** Redraw Blob and Owl as smooth vector characters and add a third, Television.

**Architecture:** What the three share (hearing, the bounce spring, the blink, the face) and each
character's pose (the numbers its drawing needs) live in a new Node-loadable
`overlay/characters.js` (`globalThis.TimbreCharacters`). Each effect in `overlay/factories/` reads
the sound, steps its pose and draws.

**Spec:** `docs/superpowers/specs/2026-11-13-vector-characters-design.md`

**How it is run:** by one builder, test-first, on three stacked branches (`feat/blob-vector`,
`feat/owl-vector`, `feat/television`), each reviewed independently when all three are built. The
owner's look in OBS with the real mic comes last and decides each merge.

## Global constraints

- Classic scripts, no build. Timed from `draw(now, dt)`; only colour reads the wall clock.
- Tests use side ports 7476 / 8090 only. Never ports 7474 or 8080.
- `control/control.html` is not edited. The overlay pages are patched from a script, not opened.
- The canvas state is left as it was found, and the picture does not depend on the line settings
  the canvas is handed.

## Branch 1: Blob (`feat/blob-vector`)

- `overlay/characters.js` with `createEars`, `createSpring`, `blink`, `bounce`, `createBlob`,
  `paintFace`, `glowBehind`; its script tag after `infall.js` in the three pages.
- `verify.mjs` section 12, written first: the shared pieces and the Blob's pose.
- `overlay/factories/blob.js` rewritten, with `probe()`; `verify-render.mjs` Blob checks first.
- `docs/EFFECTS.md` ("Characters"), `CHANGELOG.md`.

## Branch 2: Owl (`feat/owl-vector`)

- `createOwl` in `characters.js`; its checks in section 12 first.
- `overlay/factories/owl.js` rewritten, with `probe()`; `verify-render.mjs` Owl checks first.
- `docs/EFFECTS.md`, `CHANGELOG.md`.

## Branch 3: Television (`feat/television`)

- `television` after `owl` in `ACTIVE_VIZ_NAMES`, with `{}` for settings; 51 effects in the
  count check, README and `package.json`.
- `createTelevision` in `characters.js`; its checks in section 12 first.
- `overlay/factories/television.js`, with `probe()`, and its script tag after `factories/owl.js`
  in the three pages; `verify-render.mjs` Television checks first.
- `docs/EFFECTS.md`, `CHANGELOG.md`.

## Review focus

1. Any part of a character outside the frame at Bounce 100 and full voice, on the small page too.
2. A very long frame (dt at its 0.1 s cap): the spring must not blow up.
3. Bounce at 0: nothing may divide by it.
4. Mic off, with and without the idle animation.
5. Another effect drawn straight after: no clip, blend mode, alpha, transform or line setting left behind.
