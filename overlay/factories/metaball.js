/* ── metaball: a ball of liquid metal and its droplets, a kit scene ──
   Each band of the sound pulls a droplet out of the ball. The scene is
   TimbreMetaball.definition() in overlay/metaball.js; the kit owns the renderer, the camera,
   the afterglow and disposal. */
VIZ_FACTORIES['metaball'] = TimbreScene.factory(() => TimbreMetaball.definition());
