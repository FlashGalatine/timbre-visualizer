/* ── phosphor: glowing traces on a deck of dark slices, a kit scene ──
   The front trace is the voice now and each one behind it is the same trace earlier. The
   scene is TimbrePhosphor.definition() in overlay/phosphor.js; the kit owns the renderer,
   the camera, the afterglow and disposal. */
VIZ_FACTORIES['phosphor'] = TimbreScene.factory(() => TimbrePhosphor.definition());
