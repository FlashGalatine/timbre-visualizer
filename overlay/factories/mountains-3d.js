/* ── mountains-3d: a block of alpine land that the voice raises, a kit scene ──
   The scene is TimbreMountains.definition() in overlay/mountains.js; the kit owns the
   renderer, the camera, the afterglow and disposal. */
VIZ_FACTORIES['mountains-3d'] = TimbreScene.factory(() => TimbreMountains.definition());
