/* ── jelly (a cube of jelly that the sound wobbles and a thump knocks apart) ──
   A scene on the scene kit. What it is made of (the soft body, its skin, the slabs a thump
   knocks it into, the shaders and the scene) is TimbreJelly in jelly.js. */
VIZ_FACTORIES['jelly'] = TimbreScene.factory(() => TimbreJelly.definition());
