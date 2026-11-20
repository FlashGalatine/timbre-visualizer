/* ── chladni: sand on a floating plate, a kit scene ──
   The voice shakes the plate and the sand gathers into the lines of a figure. The scene is
   TimbreChladni.definition() in overlay/chladni.js; the kit owns the renderer, the camera,
   the afterglow and disposal. */
VIZ_FACTORIES['chladni'] = TimbreScene.factory(() => TimbreChladni.definition());
