# Changelog

All notable changes to **Timbre** are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the patch number
tracks the repository's commit count at release time.

Nothing was tagged between the initial release and 1.0.9, so that release
collects every change in between. Commit hashes and landing dates are noted for
traceability.

## [Unreleased]

## [1.0.187] — 2026-11-23

Copy the `overlay` folder and refresh the overlay sources. Nothing to re-paste. This
release changes what eight of the 2D effects draw: look at them in your streaming app
before a stream.

### Changed

- **Spectrogram.** It scrolls by time, so it moves at the same speed at any frame rate (at
  30 frames a second it used to scroll at half speed). The history has no gaps at high
  Scroll speed and no faint vertical stripes: the bright head line is no longer copied
  into it. The head line sits on the last few pixels at the right edge.
- **Mountains 2D, Vaporwave and Peaks Mirror are mirrored about the middle.** The ridge's
  peak is two columns wide in the centre of the frame and the left half mirrors the
  right. Before, the peak sat half a column right of centre and the two edges read
  different parts of the sound.
- **Trails and smoothing in Matrix, Mountains 2D, Peaks Mirror, Galaxy Ripple, Tunnel and
  Vaporwave are per second.** At 60 frames a second they look as they did. At 30 a trail
  now lasts as long in seconds as at 60 (it used to last twice as long), and the bass is
  followed as quickly.
- **Sine Bars' ribbon glow and Peaks Mirror's seam glow are drawn without a blur filter.**
  They match the old glow to within a few parts in 255. The ribbon no longer dims over
  the last 25 pixels at the left and right edges.
- **Tunnel and Galaxy Ripple do less work a frame.** Tunnel's wall wash is painted small
  and enlarged, and its rails take their colour from the palette table. Galaxy Ripple
  retires a ripple once it has left the plane and draws its dots a row at a time. To the
  eye they are the same; dot edges in Galaxy Ripple are smoothed slightly differently.

### Not changed

- Chladni. Sending its grain positions only when a grain moved was tried and measured:
  the comparison costs what the skipped upload saves, so the code is as it was.
- Loading effect files only when an effect is first selected was left out of this
  release.

## [1.0.185] — 2026-11-23

Copy the `overlay` folder and refresh the overlay sources. Nothing to re-paste.

### Fixed

- **The overlay holds one microphone, the one you picked.** When the saved microphone
  arrived while the page's first request for the default one was still waiting, both
  requests could finish: the page then held two microphones and ran two samplers, and
  could show LISTENING while reacting to the wrong device. A request that has been
  overtaken now stops the microphone it was given and builds nothing.
- **An old request failing no longer knocks out a good session**, shows MIC DENIED or
  schedules a retry. Before, switching microphones twice in a row could end with a
  MIC DENIED flash about ten seconds later.
- **Stopping the capture stops everything**, including a request that was still waiting
  when it was stopped.

### Added

- Twenty checks that run `overlay/audio-capture.js` under Node with stand-in media APIs
  and decide by hand which microphone request finishes first.

## [1.0.183] — 2026-11-23

Copy the `shared`, `overlay` and `control` folders, reload the dock and refresh the
overlay sources. Nothing to re-paste.

### Fixed

- **A config can no longer wedge a page.** A setting named after something every object
  already has (`constructor`, `toString`, `__proto__`) used to make the overlay or the
  dock throw on every config from then on, or to store a not-a-number value. Such keys
  are now ignored, and if reading a config ever fails, the page logs a warning and keeps
  what it had.
- **A dock change no longer wipes the picture.** Every config used to resize the canvas
  three times, which cleared it: the spectrogram's history, Matrix's rain and every trail
  blanked whenever a slider moved, the dock opened or another source refreshed. The
  canvas is now sized once, only when its height really changes, and a config equal to
  the one in force is not applied at all.
- **Three scenes no longer coarsen over a long stream.** Winter Aurora, School of Fish and
  Sunburst handed their shaders the seconds since the source loaded, which a graphics
  card stores too coarsely after many hours, so motion turned to steps. They now get a
  value that stays small. Winter Aurora's rays repeat after 2 hours 47 minutes, with a
  20-second dissolve at the join.

### Changed

- Switching to another 2D effect starts it with a clean drawing state. A config for the
  same effect no longer resets that state as a side effect.
- Winter Aurora differs from the last release by at most 1 part in 255 on a handful of
  pixels, from the dissolve's extra shader branch.

### Added

- In `overlay/core.js`, for effects to use: a 256-step table of the palette with ready CSS
  strings (`getColorCss`, `paletteStep`), `getColorInto` (no allocation), and the
  per-second helpers `ema`, `decay`, `chance` and `fadeOrClear`, which match the scene
  kit's. `getColor` gives exactly what it gave before.
- In the scene kit: `TimbreScene.phase`, `createClock` and `dissolve`, and a rule in
  `docs/EFFECTS.md` on handing time to a shader.
- `docs/EFFECTS.md` documents the `offline` class the pages put on `<body>` while
  Streamer.bot is unreachable, as a hook for custom CSS. The overlay itself shows nothing
  different when offline.

## [1.0.181] — 2026-11-23

Copy the `control`, `overlay` and `shared` folders, reload the dock and refresh the
overlay sources. Nothing to re-paste.

### Fixed

- **The dock no longer loses or undoes your changes.** It keeps a record of what you have
  changed and puts every incoming config underneath it, so a config that arrives while a
  change is on its way no longer flips a toggle back or leaves the overlay on a value the
  dock does not show. A control you are holding (a slider moved with the arrow keys, an
  open list) is left alone until you let it go.
- **Changes made while Streamer.bot is down are sent when it comes back**, on top of
  whatever was saved, and the status line says they are being kept.
- **A dock opened before the saved settings arrive no longer saves the defaults over
  them.** Nothing is sent until the saved config has come in, or one second has passed
  with none.
- **Picking an effect with no settings of its own no longer breaks the dock** when a
  config arrives at the wrong moment.
- **A saved microphone that is not plugged in is shown by name** in the list, not as a
  blank, and refreshing the list no longer switches you to the default device.
- **Matrix text you have typed but not applied is kept**, with an "unsaved" hint, across
  other changes and across a change of text source.
- **Matrix text is cut and drawn by whole characters**, so an emoji or a flag is never
  split in half.
- **The preview is unloaded when its section is closed**, which releases its microphone.
  It is given only the Streamer.bot port from the dock's address, and runs in a sandboxed
  frame.

### Added

- **The dock's status line says what is wrong.** "Streamer.bot offline", "Action
  missing" (no action named `Timbre Push`), "Timbre Push failed" (with the action's own
  message), "Connected, but Timbre Push did not answer" and "Streamer.bot connected" are
  told apart, with an amber dot for the failures. While one of the failures is showing
  the dock tries again every five seconds, so the line clears by itself once the action
  is fixed.
- **A note when `Timbre Push` is in the default queue**, where a change can be lost,
  pointing at `docs/SETUP.md` step 2. It goes when the action is in a blocking queue.
- Mock switches `/mock/silent`, `/mock/delay`, `/mock/kick` and `/mock/reset`, and the
  first checks that operate the dock as a streamer does (mouse, arrow keys, typing).

## [1.0.179] — 2026-11-23

Copy the `shared` folder, reload the dock and refresh the overlay sources. Nothing to
re-paste: it works with the `Timbre Push` you already have.

### Fixed

- **A page no longer talks over itself.** The transport every page loads
  (`shared/panel-client-sb.js`) now sends one request to Streamer.bot at a time and waits
  for the broadcast that answers it (or 800 ms) before sending the next. Before, a change
  made in the dock as the dock connected could land beside the dock's own "send me the
  saved settings" request and be lost, on an install that has not put `Timbre Push` in a
  blocking queue. When several changes are waiting, only the newest is sent. This orders
  one page's own requests only; two different pages are still ordered only by the
  blocking queue (`docs/SETUP.md`, step 2).
- **`?sbport=` takes a port number and nothing else.** A value such as `1@evil.example`
  used to point the page at another machine; anything that is not a number from 1 to 65535
  now falls back to 8080. A URL the browser refuses no longer stops the page from
  reconnecting.
- **Reconnecting backs off properly.** The wait went back to 2 seconds the moment a
  connection opened, so a Streamer.bot that accepted and dropped connections was dialled
  every 2 seconds for good. It now goes back only after a connection has stayed open
  5 seconds, and each wait has a random part, so every page does not come back in the
  same instant.

### Added

- The transport reads Streamer.bot's reply to each request and raises three events for
  pages to use: `sb:action-queued` (with the name of the queue the action is in),
  `sb:action-error` (for example, the action does not exist) and `sb:action-timeout`
  (no answer came). The dock starts using them in the next release.
- `/mock/drop` in the mock: accept a connection, then drop it.

## [1.0.177] — 2026-11-23

Tools only: nothing a streamer installs changes, and there is nothing to re-paste.

### Changed

- **The mock answers like Streamer.bot.** The reply to a `DoAction` is sent when the
  action is queued, with the request's own arguments and the queue's name; an action that
  does not exist gets Streamer.bot's error reply; a sync replay goes to every connected
  page, not only the one that asked; a pushed config is stored as sent after the same
  two-character check the C# makes. `.svg`, `.woff` and `.woff2` are served as
  `application/octet-stream`, as Streamer.bot 1.0.7 serves them.
- **The mock no longer falls over on a bad request**: a path that does not decode, a frame
  that is not an object, an oversized frame, a connection error. It refuses a WebSocket
  from a page of another site.
- `playwright-core` is a pinned dev dependency (1.65.0), so `npm install` is all the
  render suite needs.

### Added

- **Overlap mode in the mock** (`GET /mock/bleed?on=1` or `MOCK_ARG_BLEED=1`): two requests
  for `Timbre Push` that arrive together both run with the later one's arguments, which
  is what Streamer.bot's default queue does. Off by default. Also `/mock/throw`,
  `/mock/missing` and `/mock/stats`.
- **Every effect is smoke-tested**: one pass over all 52 on the 1920×1080 page checks that
  each one starts, throws nothing, draws something and stays inside a time budget, with
  named checks for four earlier fixes (fireworks, easter eggs, ring bars, matrix).
- **A guard that keeps the old renderer leak closed**: every WebGL effect must be a scene
  on the scene kit, and no file but the kit may create a WebGL renderer.
- **`npm run verify:cs`** (Windows only, not part of `verify`): compiles
  `actions/timbre-push.cs` with the .NET Framework compiler against a stand-in for `CPH`
  and runs its accept and reject cases.
- A check that tries every range in the settings tables at both ends.
- Both suites stop with one clear line when something already answers on their ports,
  and stop their own mock however they end.

## [1.0.175] — 2026-11-23

The first tagged release since 1.0.9. It collects everything that landed on `main` in
between (the redesign of every WebGL effect onto the scene kit, the first eight seasonal
scenes, the afterglow, Black Hole, Television and School of Fish), listed below as it was
recorded at the time, plus the two items under "Setup and history".

### Setup and history

- **Setup: put `Timbre Push` in a blocking action queue.** `docs/SETUP.md` step 2, the
  README and the wire-format notes in `docs/EFFECTS.md` now say so. In the default queue
  Streamer.bot can run two requests for the action at once, and both runs then see one
  request's arguments: a dock change can be lost, or an older config broadcast last.
  Measured on Streamer.bot 1.0.7 with a test action: 25 of 25 back-to-back requests mixed
  their arguments in the default queue, 0 of 25 in a blocking queue. Nothing to re-paste:
  `actions/timbre-push.cs` has not changed since the first commit. The setup guide's
  tested version is now 1.0.7.
- **The repository's history was rewritten on 2026-11-23.** Four model files that should not
  have been published were removed from every commit: the CC BY-NC-ND Japandi rose mesh,
  an earlier rose mesh of unrecorded origin, and the Lightning Sword and Save the Queen
  models. No file in the current tree changed. **Every commit hash from before this
  release is different**, and the hashes cited in this changelog and in `docs/` have been
  corrected. A clone or fork made before 2026-11-23 must be made again.


### Added

- **Christmas Tree settings**: `snowfall` (0 to 100, default 50: how much snow falls; none
  at 0, twice as much at 100), `shakeSensitivity` (0 to 100, default 50; never at 0),
  `resettleSeconds` (0 to 10, default 3: the calm wait before the snow settles on the boughs
  again) and `cameraDrift` (0 to 100, default 50) for the Christmas Tree effect, which also
  has the shared Scene placement sliders now. `lightDensity` stays (48 to 128 lights on the
  string, 96 at its default of 60) and so does `starGlow` (how far the voice swings the
  star: not at all at 0, further at 100), each with any saved value. What the new tree
  is made of is in `overlay/christmas-tree.js` (`TimbreTree`), loaded by all three overlay
  pages and by `verify` under Node, and documented in `docs/EFFECTS.md` ("The Christmas
  tree").
- **Rose settings**: `density` (0 to 100, default 50: 40 to 72 petals, of which 43% are
  always out), `thorns` (0 to 100, default 50: how long the thorns grow; none at 0),
  `scatterSensitivity` (0 to 100, default 50; never at 0), `regatherSeconds` (0 to 10,
  default 3: the calm wait before the petals come home) and `cameraDrift` (0 to 100, default
  50) for the Rose effect, which also has the shared Scene placement sliders now. What the
  new Rose is made of is in `overlay/rose.js` (`TimbreRose`), loaded by all three overlay
  pages and by `verify` under Node, and documented in `docs/EFFECTS.md` ("The rose").
- **Boids settings**: `density` (0 to 100, default 50: 36 to 84 birds), `frightSensitivity`
  (0 to 100, default 50; never at 0), `settleSeconds` (0 to 10, default 3: the calm wait
  before a fright is over) and `cameraDrift` (0 to 100, default 50) for the Boids effect.
  `cohesion` stays, and is now how tightly the flock keeps to its lead (twice as wide at 0,
  half as wide at 100). What the new Boids is made of is in `overlay/boids.js`
  (`TimbreBoids`), loaded by all three overlay pages and by `verify` under Node, and
  documented in `docs/EFFECTS.md` ("The boids").
- **School of Fish, a new effect** (the 52nd), a scene on the scene kit. A school of fish
  swims in the box: a real flock, in which each fish keeps clear of its neighbours, swims the
  way they swim and stays with them, and which mills round as one body. Louder, it swims
  faster and draws in. Each syllable is a shimmer that runs once round the school, as fish
  roll onto their sides and their flanks flash, and a few bubbles rise. Each fish listens to
  one of the eight lowest bands and wears that band's colour of the palette, big fish for
  the low bands and small fry for the high; while its band sounds it glows, swims faster and
  swings wide. A beat makes the whole school dart. A thump of the mic is a fright: the fish
  bolt apart and loiter singly, and after a calm wait they stream back as the next of three
  shapes, a ball, a ring and a column. The fish are solid, so they show over a bright
  backdrop too. Settings: `density` (0 to 100, default 50: 96 to 480 fish),
  `frightSensitivity` (0 to 100, default 50; never at 0), `regroupSeconds` (0 to 10, default
  3) and `cameraDrift` (0 to 100, default 50). Its id is `school-of-fish` and it is listed
  after Boids, which is unchanged. What it is made of is in `overlay/school-of-fish.js`
  (`TimbreSchool`), loaded by all three overlay pages and by `verify` under Node, and
  documented in `docs/EFFECTS.md` ("The school of fish").

- **Scene kit**: `TimbreScene.factory(definition)` is the effect factory for a scene;
  `TimbreScene.follow` and `TimbreScene.fall` are the kit's smoothing formulas; a scene may
  say how its afterglow cools with `cooling` in its definition. See `docs/EFFECTS.md`
  ("Kit scenes").

- **Scene kit**: `TimbreScene.createHistory(size, hz)` is a memory of a level for things
  that travel, read by sample (`byAge`) or by age in seconds (`heard`). A scene's camera is
  now in place before its first `update`. See `docs/EFFECTS.md` ("Kit scenes").
- **Jelly settings**: `shatterSensitivity` (0 to 100, default 50: how hard a thump of the mic
  knocks the cube apart; 0 never does), `reconnectSeconds` (0 to 10, default 3: the calm wait
  before its layers drop back) and `cameraDrift` (0 to 100, default 50) for the Jelly effect.
  `stiffness` stays, and is now how firm the jelly is (half as firm at 0, twice at 100). What
  the new Jelly is made of is in `overlay/jelly.js` (`TimbreJelly`), loaded by all three
  overlay pages and by `verify` under Node, and documented in `docs/EFFECTS.md` ("The jelly").
- **Shards settings**: `bloom` (0 to 100, default 50: how far the sound opens the pane;
  at 0 it stays shut and only its lights change, at 100 it opens twice as far) and
  `cameraDrift` (0 to 100, default 50) for the Shards effect. `density` stays, and is now
  how finely the pane is broken (91 shards at 0, 280 at 50, 545 at 100). What the new
  Shards is made of is in `overlay/shards.js` (`TimbreShards`), loaded by all three
  overlay pages and by `verify` under Node, and documented in `docs/EFFECTS.md` ("The
  shards").
- **Ink settings**: `density` (0 to 100, default 50; 6,000 to 30,000 specks of ink at once),
  `glass` (0 to 100, default 50: how bright the tank's glass and the water's surface are
  drawn; at 0 they are not drawn at all and the ink floats free) and `cameraDrift` (0 to
  100, default 50) for the Ink effect. What the new Ink is made of is in `overlay/ink.js`
  (`TimbreInk`), loaded by all three overlay pages and by `verify` under Node, and
  documented in `docs/EFFECTS.md` ("The ink").
- **Glass Prism pulses on the beat and shatters on a hard peak.** A beat swells the
  crystal by about a fifth and it springs back, a little smaller for a moment, before it
  is still. A hard peak (a thump on the mic, a yell) breaks it into its twenty facets,
  which fly apart spinning, hang and drift, and after a calm wait come home and are the
  crystal again. It breaks by the rule DNA and Pulse Rings break by. While it is in
  pieces it is drawn smaller, so that no facet leaves the picture (with Scene placement
  in the middle; the Size slider above 100 leaves the pieces less room). At a high Pulse
  with the colours far apart a swell can be more than the picture has room for, and is
  drawn smaller while it lasts. New settings: `pulse`
  (0 to 100, default 50; none at 0), `shatterSensitivity` (0 to 100, default 50; never at
  0) and `reconnectSeconds` (0 to 10, default 3).
- **Glass Prism setting**: `cameraDrift` (0 to 100, default 50) for the Glass Prism effect.
  What the new Glass Prism is made of is in `overlay/glass-prism.js` (`TimbreGlassPrism`),
  loaded by all three overlay pages and by `verify` under Node, and documented in
  `docs/EFFECTS.md` ("The glass prism").
- **Metaball setting**: `cameraDrift` (0 to 100, default 50) for the Metaball effect. What the
  new Metaball is made of is in `overlay/metaball.js` (`TimbreMetaball`), loaded by all three
  overlay pages and by `verify` under Node, and documented in `docs/EFFECTS.md` ("The
  metaball").
- **Mountains 3D and Phosphor settings**: `rotateX`, `rotateY` and `rotateZ` (0 to 360 degrees,
  default 0), as on Chladni: Rotate Y spins the block of land or the deck in its own plane,
  Rotate Z rolls it to one side, Rotate X tilts its top toward the viewer. However it is
  turned it stays in the frame, wherever the camera drifts to (it reaches no further than
  it did unturned). With all three at 0 nothing changes. The block of
  land has an underside, its lights and shadows turn with it, and the deck's traces show
  from behind.
- **Scene kit**: `TimbreScene.turn`, `TimbreScene.reach` and `TimbreScene.poseFor` turn what a
  scene shows and keep it in the frame, with `TimbreScene.sweep` for a camera that sways;
  Chladni's rotation now uses them. The fit now runs until it settles and allows for
  Camera drift, so a turned plate's size differs by up to 0.05 and its place by up to 0.2
  from before at the worst rotations (turned to face the camera, by 0.8% and 0.03). See `docs/EFFECTS.md` ("Turning what a scene shows").
- **Chladni settings**: `rotateX`, `rotateY` and `rotateZ` (0 to 360 degrees, default 0) turn
  the plate about each axis: Rotate Y spins it in its own plane, Rotate Z rolls it to one
  side, Rotate X tilts its top toward the viewer. Rotate X at 46 turns it to face the
  camera, the view the old effect had. However it is turned, the plate stays in the frame.
- **Chladni setting**: `cameraDrift` (0 to 100, default 50) for the Chladni effect. What
  the new Chladni is made of is in `overlay/chladni.js` (`TimbreChladni`), loaded by all
  three overlay pages and by `verify` under Node, and documented in `docs/EFFECTS.md` ("The
  chladni plate").
- **Phosphor setting**: `cameraDrift` (0 to 100, default 50) for the Phosphor effect. What
  the new Phosphor is made of is in `overlay/phosphor.js` (`TimbrePhosphor`), loaded by all
  three overlay pages and by `verify` under Node, and documented in `docs/EFFECTS.md` ("The
  phosphor").
- **Mountains 3D setting**: `cameraDrift` (0 to 100, default 50) for the Mountains 3D effect.
  What the new Mountains 3D is made of is in `overlay/mountains.js` (`TimbreMountains`),
  loaded by all three overlay pages and by `verify` under Node, and documented in
  `docs/EFFECTS.md` ("The mountains").
- **Sunburst settings**: `spin` (0 to 100, default 50; 0 holds the crown still) and
  `cameraDrift` (0 to 100, default 50) for the Sunburst effect. Spin also scales how fast
  the crown's tilt wanders. What the new Sunburst is
  made of is in `overlay/sunburst.js` (`TimbreSunburst`), loaded by all three overlay pages
  and by `verify` under Node, and documented in `docs/EFFECTS.md` ("The sunburst").
- **The flag**: what the five flag effects share is in `overlay/flag.js` (`TimbreFlag`),
  loaded by all three overlay pages and by `verify` under Node, and documented in
  `docs/EFFECTS.md` ("The flag"). Adding a flag is a table entry and a one-line file, plus
  the usual registration.
- **Display names**: `VIZ_LABELS` in `shared/viz-config.js` gives an effect the name the
  control panel lists it by, where its id no longer says what it is. Ids do not change.

- **Television**, a new character (the 51st effect), listed after Blob and Owl. A floating
  retro set with two springy antennae, two dials and a speaker. It hovers; like Blob and Owl
  it bounces on each syllable, and like the Owl it tilts toward the low or the high end of
  the sound. Its screen shows a face in glowing lines: two bars for eyes, which blink and
  turn happy, and a mouth that is the live waveform (with **Gain**). With the mic off the
  screen is static and the face is asleep; with the idle animation off as well, it holds
  still. It has no settings of its own; the global **Bounce** scales it.
- **Characters**: what the character effects share is in `overlay/characters.js`
  (`TimbreCharacters`), loaded by all three overlay pages and by `verify` under Node, and
  documented in `docs/EFFECTS.md` ("Characters").
- **Black Hole**, a new effect (the fiftieth), listed after Pulse Rings. A solid black disc
  with a bright rim and a tilted, turning disc of glowing gas. Streaks of light, small comets
  and fireflies come in from beyond the frame, spiral round faster as they close in, and vanish
  into the hole. Louder, the hole pulls harder: more falls in, and faster; each syllable throws
  in a handful more and ripples inward through the gas. A hard peak makes the hole gulp down
  everything in sight and fire a jet of light from each pole. Settings: `density` (how much
  falls in) and `gulpSensitivity` (0 to 100, default 50; 0 turns the gulp off). What falls in
  is in `overlay/infall.js` (`TimbreInfall`), loaded by all three overlay pages and by
  `verify` under Node, and documented in `docs/EFFECTS.md` ("Infall"). Unlike the other
  effects of this family, which only add light, the hole itself is drawn solid black.
- **Orbit settings**: `planets` (0 to 9, default 6) and `flareSensitivity` (0 to 100, default
  50; 0 turns the sun's flare off) for the Orbit effect. The system behind the new Orbit is
  `TimbrePlanets.createSystem` in `overlay/planets.js`.
- **Pulse Rings settings**: `explodeSensitivity` (0 to 100, default 50; 0 turns the explosion
  off) and `reconnectSeconds` (0 to 10, default 3) for the Pulse Rings effect. What the new
  Pulse Rings shares with the other planet effects is in `overlay/planets.js`
  (`TimbrePlanets`), loaded by all three overlay pages and by `verify` under Node, and
  documented in `docs/EFFECTS.md` ("Planets"). `TimbreHelix.createShatter` takes an optional
  `aim`; without it DNA shatters exactly as before.
- **Fireflies setting**: `startleSensitivity` (0 to 100, default 50; 0 turns the startle off)
  for the Fireflies effect. The swarm behind the new Fireflies is in
  `overlay/fireflies-swarm.js` (`TimbreSwarm`), loaded by all three overlay pages and by
  `verify` under Node, and documented in `docs/EFFECTS.md` ("Fireflies swarm").
- **Comet setting**: `flareSensitivity` (0 to 100, default 50; 0 turns flares off) for the
  Comet effect. The arithmetic behind the new Comet is in `overlay/comet-flight.js`
  (`TimbreComet`), loaded by all three overlay pages and by `verify` under Node, and
  documented in `docs/EFFECTS.md` ("Comet flight").
- **DNA settings and measurement**: the `shatterSensitivity` and `reconnectSeconds`
  settings for the DNA effect, and the `micPeak` measurement (the loudest input sample
  over at least the last two looks, before Gain) that the shatter reads.
- **Scene kit** — `overlay/scene-kit.js` and `overlay/scene-parts.js`: a shared base
  for floating 3D scenes that sit over the stream with no backdrop. A scene supplies a
  `frame`, a `build()` and an `update()`; the kit supplies the renderer, camera
  framing for any canvas shape, shadows, a light-only afterglow (length follows Trail
  veil), frame-rate-independent audio smoothing and beat detection, and full disposal.
  Light is written with alpha 0 so it adds to the picture behind it and only solid
  objects darken it. Loaded by all three overlay pages; the kit also loads under Node
  for `verify`. Documented in `docs/EFFECTS.md` ("Kit scenes (floating 3D)").
- **Afterglow for the bar and wave effects** — Bars, Peak Hold, Ring Bars, Sine Bars,
  Waveform and Ring Waveform leave a fading trace of what they just drew: bars keep ghosts
  of their recent peaks, and the two wave effects keep fading echoes of their loudest
  moments. New **Afterglow** setting (`afterglow`, 0 to 4 seconds, default 1.6, 0 is off),
  shown in the control panel for those six effects. The arithmetic is in
  `overlay/afterglow.js` (`TimbreGlow`), loaded by all three overlay pages and by `verify`
  under Node. Live bars draw exactly as before. Documented in `docs/EFFECTS.md`
  ("Afterglow (bar and wave effects)"). `verify:render` checks the ghosts, the setting and
  the cost (the six effects draw in under 0.5 ms; about 0.1 ms or less measured).
- **Scene placement settings** — a "Scene placement" group in the control panel,
  shown for kit scenes: Left-right, Up-down and Size % (new `placement` in the
  config, clamped by `PLACEMENT_RANGES`). They move and scale the scene through the
  camera, live, without rebuilding it.
- `verify` gains scene-kit arithmetic, placement-config and page-load checks;
  `verify:render` gains scene checks (internal scale, placement, resize without
  rebuilds, fps independence, no GPU growth on re-select, clean hand-off to the
  other WebGL effects, no-THREE fallback) and a per-frame cost check (`draw()`
  averaging under 4 ms; about 1.6 ms measured).
- **`overlay/mic-visualizers-1920x1080.html`** — a 16:9 overlay page alongside the
  300×220 and 1440×1080 (4:3) ones. It is the 4:3 page widened by 480px: identical
  border, type, chevrons and 624px-tall canvas, with a 1728×624 drawing buffer.
  `SCALE` is pinned to the 4:3 page's 4.8 (rather than `W/260` = 6.65) so
  radii/amplitudes sized off `SCALE` don't outgrow the canvas height — bar, column
  and scrolling effects simply get the extra width. Serve it at
  `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-1920x1080.html`.
- **The 16:9 page fits any source size.** It lays out at 1920×1080 and CSS-scales
  itself (uniformly, centred/letterboxed if not 16:9) to the Browser Source's
  width × height — one page serves 1280×720, 960×540, 640×360 … The canvas still
  renders at 1728×624 and is filtered on the downscale, so small sources stay
  sharp and effect geometry is identical at every size. `core.js` now sizes the
  no-border canvas buffer from layout (`offsetHeight`) instead of screen rects so
  it stays correct under the transform. Render suite covers 1280×720 / 640×360 /
  4:3 letterbox / no-border-while-scaled.
- **The 1440×1080 (4:3) page fits any source size too** — same mechanism, 1440×1080
  reference, 1248×624 buffer untouched: 960×720, 720×540, 480×360 … from one page.
  `verify` 37/37, `verify:render` 39/39 (adds 720×540 fit, 16:9 letterbox, no-border
  while scaled; writes `test-render-720.png`).
- `window.__timbre` now exposes `SCALE`, `W` and `H` for the render suite.
- `verify` gains overlay-page parity checks (every page loads every factory; canvas
  buffers match their CSS box; the 16:9 page's pin) → 35/35. `verify:render` adds a
  1920×1080 pass (buffer/`SCALE` geometry, ring-bars stays inside the canvas,
  decoration + no-border toggles rescale); writes `test-render-1920.png` /
  `test-render-640.png`.

### Changed

- **Christmas Tree is now a lit tree in the snow**, a scene on the scene kit. The flat tree
  of pixels over a dark sky is gone. A fir tree stands on a drift of snow with presents round
  its foot: six tiers of boughs with snow lying on them, a gold star, a string of lights
  wound round it, and a bauble under the tip of every bough. The star hears the voice and
  flares at once, and what it heard runs down the string of lights, so each syllable is a
  pulse of light that winds round the tree from the star to its lowest boughs in about a
  second; in silence the lights glow low and twinkle. The baubles are a spectrum: each tier
  listens to a part of the sound, low at the foot and high under the star, and its baubles
  light from inside and swing when it sounds. The star and the string are real lights: the
  star lights the snow round the tree, and the tree and the presents throw shadows. A thump
  of the mic shakes the tree: it rocks on its trunk, the baubles swing, the lights flicker,
  and the snow comes off every bough as falling clumps; after a calm wait it settles again.
  Snow falls all the while, a little more when you speak. With the mic off and Idle
  animation on, the star and the string breathe with a slow swell and the bands swell in
  turn up the tree. The lights and the baubles take the palette's colours; the tree stays
  green and the star gold. Everything but the glows is solid, so it shows over a bright
  backdrop too. The effect's name and id are unchanged.
- **Rose is now a rose the voice makes bloom**, made in code, a scene on the scene kit. The
  spinning wireframe of a model file is gone. One rose floats in the box on a leaning stem
  with two leaves; in silence it is a small, neat rose with every petal on its head and a
  smooth stem. The voice makes it grow: thorns come out of the stem (the stem is a spectrum:
  each thorn listens to one of the eight lowest bands, low at the foot and high under the
  head, and its tip wears that band's colour), and petals sprout, more of them the louder
  the voice, until it is a full, wide bloom. Each syllable is a ripple from the heart of the
  rose out through its petals and up the stem. In a pause the outer petals fold away and the
  thorns draw in. A thump of the mic throws every petal off the head and they fly round the
  box as a flock, tumbling, as the birds and the fish do; the bare head shows a golden
  heart; after a calm wait they come home from the heart outward, each to its own place, and
  none leaves the picture. With the mic off and Idle animation on, a few petals open and
  fold and no thorn grows. The petals take the palette's colour; the stem and the leaves
  stay green. Everything is solid, so it shows over a bright backdrop too. The effect's name
  and id are unchanged. With this, every WebGL effect is a scene on the scene kit.
- **Boids is now birds on a wire that the voice sends up**, a scene on the scene kit. The
  flat-shaded cones are gone. Three wires hang across the box, and in silence birds sit on
  them in rows, wings folded. The wires are a spectrum: each stretch listens to one of the
  eight lowest bands, low at the left and high at the right, and its birds wear that band's
  colour. A bird takes off when its band sounds, or when the voice is loud enough for its
  nerve: a quiet word lifts the bold ones and a loud one lifts them all. In the air they are
  a real flock that follows a lead wheeling above the wires, banking into their turns; each
  syllable is a ripple of banking that runs back through the flock. In a pause each bird
  comes round behind its own seat and lands on it, the wire springs under it, and in silence
  the birds and the wires come to rest. A thump of the mic is a fright: every bird bursts up
  at once and stays up while it lasts, and none leaves the picture. With the mic off and Idle
  animation on, stretches of wire empty and fill while most birds sit. The birds and the wires are solid, so they show over a bright
  backdrop too. The effect's name and id are unchanged.
- **Jelly is now a cube of jelly that the sound wobbles**, a scene on the scene kit. The
  lattice of small balls and lines is gone. A rounded cube of clear jelly floats in the box,
  set in four layers of the palette's colours, with small bubbles caught inside it. It is a
  soft body held at its middle, so whatever moves it reaches the outside late, and the
  outside overshoots and wobbles. Each syllable lifts the middle and squashes the body, which
  springs back; each of the eight lowest bands pulls one of the eight corners outward; a beat
  slaps a face, and a wave runs through the body while the bubbles light. A pause lets it
  wobble to rest. A thump of the mic knocks the cube apart into its four layers: each is a
  slab of one colour that is thrown clear, tumbles and flaps on its own, and after a calm
  wait they drop back onto the stack from the bottom up, each landing with a plop, and set
  into one cube again. When it comes apart and when it comes back is the shatter that DNA and
  Glass Prism use. It is drawn as a solid you can see through, not as light, so it shows over
  a bright backdrop too. It joins the kit scenes, so the Scene placement sliders apply to it.
- `verify:render`: the checks that Sunburst, Mountains 3D, Phosphor, Chladni and Metaball
  hold still with the mic and Idle animation off, or once muted, no longer fail on a stray
  pixel. They compared two pictures' hashes, and this GPU now and then draws a pixel or
  two of the very same scene one step apart. They now compare with the last picture and
  allow what the Glass Prism, Ink and Shards checks allow: at most eight values, one step
  apart. A picture that moves differs in tens of thousands.
- **Shards is now a broken mirror that the sound opens up**, a scene on the scene kit. The
  ball of small tetrahedra is gone. A pane of mirror glass floats in the box, already
  broken: cracks run out from the point where it was struck and rings of cracks cross
  them, so it is a few hundred shards that still fit together, with a light behind it.
  Each syllable starts at the point of impact and travels outward as a ripple; the shards
  it reaches lift toward the viewer, move apart, tip outward like petals and sink back.
  A pause is a flat cracked mirror, a voice a pane that blooms open in waves, and music a
  pane that never quite closes. Each sector of the pane also follows one of the eight
  lowest bands of the sound, and a beat sends a faster ring outward. Each shard mirrors a
  sky made of the palette's colours with long soft lights in it, and flashes when it tips
  far enough to catch a lamp; the cut edges of the glass glow, and a shard seen from
  behind is a mirror too. A band quieter than 0.08 is not heard, so a room's hiss
  does not hold the pane open. The shards are solid, so
  the pane shows over a bright backdrop as well as a dark one. With the mic off and Idle
  animation on, the sectors lift a little in turn; with both off the pane is shut. It
  uses the shared Scene placement sliders, and no longer makes a renderer of its own.
- **Ink is now coloured ink poured into a tank of water**, a scene on the scene kit. The
  fluid on a coarse grid, drawn in blocks, is gone. A glass tank of clear water floats in
  the box. Each of the eight lowest bands of the sound has its own place along the top of
  the water and its own palette colour: while it sounds, ink pours in there, the more and
  the faster the louder it is. The ink sinks as a plume, the currents in the water stretch
  it into ribbons, and it thins away over some seconds, so a pause lets the water clear, a
  voice is a few plumes, and music colours the whole tank. The louder the sound, the
  stronger the currents; a beat twists the whole tank, one way and then the other, and
  rings the surface. The ink is pigment, not light, so it shows over a bright backdrop as
  well as a dark one. With the mic off and Idle animation on, bands take turns to pour a
  little; with both off nothing pours and the water clears. `swirl` is how strong the
  currents are (none at 0, though a beat still twists the tank). It uses the shared Scene placement sliders, and no
  longer makes a renderer of its own.

- **Glass Prism is now a cut crystal turning in the light**, a scene on the scene kit. The
  shaded glass body with its built-in colour map is gone. A twenty-sided crystal floats in
  the box and tumbles, drawn in light only, so it reads as glass over a dark or mid-toned
  backdrop: its
  ridges glow, a facet flashes as it turns to face a lamp, the far facets show through the
  near ones, and a soft glow sits inside. Each facet answers one of the ten lowest bands of
  the sound. Like light through a prism its colours come apart: it is drawn in three
  neighbouring palette colours that drift apart with the high end of the sound and on a
  beat, so its edges split into coloured fringes. The voice turns it faster and brightens
  it, and a beat kicks its tumble about a new axis. With the mic off and Idle animation on
  it tumbles slowly and its facets take turns; with both off it stops turning and is still
  (the camera still drifts and its colours still move through the palette).
  Colours come from the palette, not from a map of its own as before. `chroma` is how far
  the colours come apart (none at 0). It uses the shared Scene placement sliders, and no
  longer makes a renderer of its own.
- **Metaball is now a ball of liquid metal and its droplets**, a scene on the scene
  kit. The four wandering spheres are gone. One ball of liquid metal floats in the box,
  mirroring a sky made of the palette's colours. Each of the eight lowest bands of the sound
  has a droplet inside it: when its band sounds the droplet bulges out of the ball, draws a
  neck and pinches off, and when the band falls quiet it drifts home and is swallowed. Low
  bands are large drops and high bands small ones, so a pause is one calm ball, a voice a
  ball with a few drops round it, and music a cluster. The voice swells the ball and makes
  the metal glow, and a beat throws every droplet further. With the mic off and Idle
  animation on droplets come and go; with both off they drift home and the ball is still
  (the camera still drifts and its colours still move through the palette).
  Colours come from the palette, not from a hue of its own as before. `chrome` is how much of
  a mirror the metal is. It uses the shared Scene placement sliders, and no longer makes a
  renderer of its own.

- **Chladni is now sand on a floating plate**, the eleventh scene on the scene kit. The
  flat field of hard dots is gone. A square, nearly black plate floats in the box, seen
  from above at an angle, with pale sand on it. The voice shakes the plate: sand lying where
  the plate moves hops and walks to where it does not, so it gathers into the lines of a
  figure. Louder, the lines go fuzzy and the sand dances; in a pause it settles into a sharp
  figure and lies still. Each phrase draws a new figure, and how high the voice sits picks
  which of ten: low gives a simple one, high an intricate one. The plate bends and glows
  where it moves. A yell or a mic thump throws all the sand into the air, and it lands
  scattered and walks back. The plate is solid, so the sand shows over a bright game. With
  the mic off and Idle animation on the plate shakes gently and the figures drift; with
  both off the sand lies where it is (its colours still move through the palette).
  Colours come from the palette, from the middle of the plate outward. `density` now means
  how much sand (6,000 to 30,000 grains). It uses the shared Scene placement sliders, and
  no longer makes a renderer of its own or uses `Math.random`.

- **Phosphor is now glowing traces on a deck of dark slices**, the tenth scene on the scene
  kit. The tape of jittering one-pixel lines is gone. A deck of thin dark slices stands in
  the box, one behind another, each with a glowing trace along its top edge, like the line
  on an oscilloscope. The front trace is the voice now and each one behind it is the same
  trace a little earlier, so the voice and its echoes recede into the deck over about two
  seconds. A trace stands as tall as the voice was loud. Its shape comes from the sound's
  bands, not the raw waveform: the low end makes broad waves and the higher bands fine
  ripples, moving smoothly enough to see. The slices are solid, so a tall one hides the
  traces behind it and the deck still shows over a bright game. A beat flashes the nearest
  traces. With the mic off and Idle animation on the traces swell and their waves run;
  with both off the waves stop and the echoes die away (its colours still move through the
  palette).
  Colours come from the palette, front to back, as before. `depth` now means how many slices
  (12 to 36). It uses the shared Scene placement sliders, and no longer makes a renderer of
  its own.

- **Mountains 3D is now a block of land that the voice raises**, the ninth scene on the scene
  kit. The flat-shaded sheet of terrain whose rows jumped a step at a time is gone. A block
  of alpine land floats in the box, cut square like a terrain model, lit by a low sun behind
  it so the peaks throw shadows toward you. The land flows toward you, smoothly. New land
  enters at the far edge as high as the voice is loud: a phrase raises a range of peaks, and
  a pause leaves a valley of foothills. The middle of the range hears the low end of the
  sound and the flanks the higher bands. Land above the snow line is white, so a loud voice
  and music give snow-capped peaks. The sun and its light brighten with each syllable, the
  whole range lifts a little with the voice, and a beat lifts it further and flares the sun.
  With the mic off and Idle animation on the land keeps flowing under a slow swell; with
  both off it stands still (its colours still move through the palette).
  Colours come from the palette, now running across the range. `speed` is how fast the land
  flows (50 crosses the block in 5 s). It uses the shared Scene placement sliders, and no
  longer makes a renderer of its own.

- **Sunburst 3D is now a star with a crown of light**, the eighth scene on the scene kit. The
  white ball with hair-thin lines is gone. A small star floats in the box: a solid ball,
  white-hot in the middle and palette-coloured at its edge, in a soft glow. Around it is a
  crown of soft, tapered beams of light. Each beam follows one band of the sound: the low end
  drives the belt round the star's middle and the higher bands drive the beams near its
  poles, so the crown changes shape with the voice. Each syllable is a shell of brightness
  that leaves the star and travels out along every beam in under a second. A beat lengthens
  the beams and swells the star; the low end swells the star too; the high end makes the
  outer part of the beams flicker. The crown turns slowly, faster when the sound is louder.
  With the mic off and Idle animation on it breathes; with both off it is a small star that
  holds still (its colours still move through the palette).
  Colours come from the palette as before. `density` now means how many beams (24 to 144).
  It uses the shared Scene placement sliders, and no longer makes a renderer of its own.

- **The five flag effects are now one 3D cloth flag**, the third to seventh scenes on the
  scene kit: the rainbow, bi, ace and trans Pride flags and the Fourth of July flag. The
  stepped stripes that filled the frame are gone. A flag flies from a pole on a small stone
  base, floating in the box with no backdrop, and the voice is the wind. In silence the flag
  hangs and sways; talking lifts it until it flies straight out; each syllable is a gust
  that travels from the pole to the free end in just under a second; a beat snaps the
  cloth. The cloth folds without stretching, catches the light across its ripples and
  throws a moving shadow on the ground. The Pride flags shed hearts, in colours chosen for
  each flag, which blow away downwind. The Fourth of July flag has its fifty stars drawn as
  five-pointed stars, which shine with the high end of the sound, and fireworks go off
  behind it on a beat. Every flag keeps its colours and proportions, and the rainbow keeps
  its eight-stripe choice (`stripeStyle` at 50 or more).
  The control panel now lists them as Pride flag, Bi pride flag, Ace pride flag, Trans pride
  flag and Fourth of July flag; their ids are unchanged (`pride-ribbon`, `bi-pride-ribbon`,
  `ace-pride-ribbon`, `trans-pride-ribbon`, `july-fourth-stripes`).
  Settings: `wind` (how strongly the voice drives the flag; 0 leaves it hanging) and
  `cameraDrift` are new; `heartRate`, `stripeStyle`, `starTwinkle` and `burstChance` are
  kept, with any saved values; `ribbonAmplitude` and `stripeAmplitude` are retired. The
  **Scene placement** group now appears for all five.
- **Winter Aurora is now a floating 3D scene**, the second on the scene kit and the first of
  the WebGL effects to be rebuilt. A low rise of snow with six snow-laden pines and a log
  cabin floats in the box with no backdrop; three curtains of aurora hang behind it as added
  light. The voice travels along each curtain as a wave of taller, brighter rays. The low end
  of the sound keeps the rays green, the high end lifts the violet tops and brightens the
  stars, and a beat flushes the hems pink. The aurora also lights the snow from behind, so
  the pines throw shadows toward the viewer that brighten and fade with the voice. Snow
  falls, more of it with volume and beats. The cabin's lit window keeps its own time.
  Settings: `auroraGlow` (how strongly the voice drives the aurora; 0 is a steady dim
  aurora), `snowfall`, `starDensity` (kept, with any saved value) and `cameraDrift`. The
  old `ribbonCount` and `mountainOpacity` are retired. The **Scene placement** group now
  appears for it.
- **Owl is now a vector character.** Smooth shapes in place of the pixel art: a body with a
  paler belly, a head with ear tufts and large eyes, a beak, wings, a tail and feet. It still
  bobs on each syllable, leans toward the low or the high end of the sound, flaps its wings
  with the voice, opens its beak, blinks, turns happy when the voice is loud and lets music
  notes float up. **Bounce** still scales it, and at 0 stills it. It no longer leaves the
  frame at a high Bounce. With the mic off and the idle animation off, nothing about it moves.
- **Blob is now a vector character.** A smooth solid body with a clean outline in place of
  the stepped, see-through one. It still swells with loudness, bulges with the sound, bounces
  on each syllable (now stretching on the way up and squashing on the way down), blinks, turns
  happy when the voice is loud and opens its mouth with the voice. **Bounce** still scales it,
  and at 0 stills it. It no longer leaves the frame at a high Bounce. With the mic off and the
  idle animation off, nothing about it moves.
- **Orbit is now a sun with planets.** A glowing sun and up to nine planets, each on its own
  slightly different tilted orbit and leaning on its own axis, passing behind the sun and in
  front of it. Louder sound makes every planet orbit faster and leave a longer streak of light;
  the low end makes the sun swell and shrink. A hard peak flares the sun and the planets surge
  for a moment. The old Orbit was short-lived square dots circling a square core. Its
  **Density** setting is retired (a saved value is dropped); **Planets** sets how many planets
  there are.
- **Pulse Rings is now a ringed planet.** A glowing planet with a tilted ring disc. Each
  syllable is a bright ripple that starts at the inner edge of the rings and travels outward;
  louder, the planet glows brighter and its storm and the ice in the rings turn faster. A hard
  peak blows the planet into chunks and thins the rings; after a calm wait the chunks drift back
  and snap together, and the rings fill back in. The old Pulse Rings threw rings of square dots
  outward from the centre; nothing is thrown off any more. **Sensitivity** now sets how strongly
  the rings answer the voice (it was how easily a ring was thrown), and **Flow** how far out the
  rings reach (it stretched the rings sideways).
- **Fireflies is now a living swarm.** Soft glowing fireflies wander the whole frame,
  each blinking on its own slow rhythm and leaving a short streak of light. Louder, they
  blink more, glow brighter and fly faster; each syllable sets off a burst of flashes,
  and a hard peak makes the whole swarm flash and scatter. The old Fireflies sprayed
  square particles out of the centre; that spray is gone. **Density** now sets how many
  fireflies there are, 10 to 60 (it was the spawn rate). **Trail veil** no longer affects
  Fireflies.
- **Comet is now a smooth glowing comet.** A glowing head flies a slow looping path with
  a tapering tail; louder, it flies faster and wider, glows brighter and trails longer.
  The tail is thicker where the voice was louder as the head passed, the high end of the
  sound sheds sparks, and a hard peak flares the head. The old Comet plotted the sound
  wave as a stepped looping figure; that figure is gone. **Trail** now sets the tail's
  length and a higher value is a longer tail (it was the fade speed, where higher was
  shorter). **Trail veil** no longer affects Comet.
- **DNA is now a smooth glowing double helix** that twists faster and glows brighter
  with loudness, opens its two strands with the low and high end of the sound, and
  shatters on a hard peak, then reassembles. The stepped look is gone.
- **Thanksgiving Harvest is now a 3D scene** on the scene kit: a wicker cornucopia
  spilling pumpkins, apples, gourds, corn, grapes and wheat toward the viewer, with
  three candles that flicker with the voice and cast real light and shadow, and autumn
  leaves that fall more with volume and beats. Its knobs are now **Candle glow**,
  **Leaf density** and **Camera drift**; **Pumpkin pulse** and **Wheat sway** are gone
  (saved values for them are dropped on load). The effect id and count are unchanged.
- **Waveform and Ring Waveform are now smooth lines.** The stepped look is gone: the
  line is a smooth curve that follows the samples, with a glow and a thin white core.
- **Peak Hold's marker is timed in seconds and scaled to the page**, so it looks the same
  at any frame rate. It falls faster than before on the two large pages (1440×1080 and
  1920×1080).

### Removed

- **Christmas Tree's `snowSpeed` setting.** How fast the old square snow fell has no place
  in the new scene; `snowfall` (how much falls) takes its place. A saved `snowSpeed` is
  dropped when the config is read.
- **The rose model and the "3D model" settings.** `overlay/assets/rose.stl` and its notice
  are gone, with the shared settings group that only the old Rose still used (`stlObject`:
  intensity, zoom, sparks, sensitivity, jitter, smoothing, rotation, position, clones,
  arrangement, spacing, spin axis): its tables in `shared/viz-config.js`
  (`STL_OBJECT_DEFAULTS`, `STL_OBJECT_RANGES`), `cfgSTLObject` in the overlay, and its group
  in the control panel. A saved config that still holds `stlObject` is read as before and
  the key is dropped. Rose has the Scene placement sliders and its own settings instead.

## [1.0.9] — 2026-07-29

### Changed

- **Tunnel visualizer reworked** from spider-web spokes into a circular neon
  pipe. The ribs are true `arc()` circles (a constant-z ring projects to an
  exact circle), the rails taper and fade into the bore with width and alpha
  scaling as 1/z, loudness pulses ride the ribs in from the far end as radius
  bulges, and there's slow axial roll, a vanishing-point glow and a faint wall
  wash. Same bend knob and config surface. `verify` 28/28, render 14/14.
  (`978dc01`, 2026-07-11)
- **`rose.stl` replaced with the author's own CC-BY-4.0 mesh**, generated with
  Meshy.ai and converted from the Bambu 3MF (Z-up → Y-up, so the default spin
  axis is the stem). 4,558 triangles, renders as a clean wireframe rose. All
  STL provenance concerns are now resolved. (`d56f03f`, 2026-07-11)

### Removed

- **Japandi Rose visualizer** — its source model is CC BY-NC-ND: the ND term
  blocks redistributing the processed mesh and NC conflicts with monetized
  stream use. Down to **49 effects** (37 2D + 12 WebGL). (`2e8c6cc`,
  2026-07-11)
- **Lightning Sword and Save the Queen visualizers** — copyrighted source
  assets. Down to 50 effects (37 2D + 13 WebGL) at the time; the STL group
  remains. (`c267399`, 2026-07-11)

### Documentation

- README: clone / Download-ZIP as the first setup step. (`d1c2a5d`, 2026-07-21)
- Author & support section added; the CC-BY-4.0 rose model credited in the
  README license section; support links point at the personal Discord server.
  (`6368ec4` / `397285a`, 2026-07-20)

## [0.1.0] — 2026-07-11

Initial release — Streamer.bot-native mic visualizer for OBS, ported from the
StreamService / ControlPanel toolkit. (`ee5c34a`)

### Added

- **52 visualizer effects** (2D canvas and WebGL) driven by the microphone.
  See *Removed* above — the shipping count is now 49.
- **Self-capturing overlay** — the overlay captures the mic itself via
  `getUserMedia` inside OBS CEF, so only configuration JSON crosses the wire
  over the Streamer.bot WebSocket. No audio ever travels the bus.
- Single source of truth for settings in `shared/viz-config.js`, with a control
  page and a `spike/` permission-check page.
- Public STL swords are CC0 procedural replacements.

Verified offline: `verify` 28/28, `verify:render` 14/14.

[Unreleased]: https://github.com/FlashGalatine/timbre-visualizer/compare/v1.0.187...main
[1.0.187]: https://github.com/FlashGalatine/timbre-visualizer/compare/v1.0.185...v1.0.187
[1.0.185]: https://github.com/FlashGalatine/timbre-visualizer/compare/v1.0.183...v1.0.185
[1.0.183]: https://github.com/FlashGalatine/timbre-visualizer/compare/v1.0.181...v1.0.183
[1.0.181]: https://github.com/FlashGalatine/timbre-visualizer/compare/v1.0.179...v1.0.181
[1.0.179]: https://github.com/FlashGalatine/timbre-visualizer/compare/v1.0.177...v1.0.179
[1.0.177]: https://github.com/FlashGalatine/timbre-visualizer/compare/v1.0.175...v1.0.177
[1.0.175]: https://github.com/FlashGalatine/timbre-visualizer/compare/d85cf93...v1.0.175
[1.0.9]: https://github.com/FlashGalatine/timbre-visualizer/compare/ee5c34a...d85cf93
