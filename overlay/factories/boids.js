/* ── boids (birds that sit on three wires, fly up as a flock with the voice and land in a pause) ──
   A scene on the scene kit. What it is made of (a bird, the wires, the flock and its steps,
   the fright, the shaders and the scene) is TimbreBoids in boids.js. */
VIZ_FACTORIES['boids'] = TimbreScene.factory(() => TimbreBoids.definition());
