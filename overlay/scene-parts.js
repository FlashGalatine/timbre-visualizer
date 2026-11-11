// Timbre — shared geometry for the 3D scenes, on TimbreScene.parts. Loaded after
// scene-kit.js. Each part takes THREE and returns a fresh BufferGeometry; the
// scene owns it (pass it through k.keep() so the kit disposes it).
//
// Nothing here touches THREE, document or window at load time.

(function () {
  'use strict';

  // A squat, boxy pumpkin with `lobes` fat lobes and sharp creases, resting on
  // y = 0. Each vertex of a unit sphere is moved by longitude (lobe) and polar
  // angle (squash, sunken top and bottom).
  function pumpkin(THREE, radius, lobes) {
    const g = new THREE.SphereGeometry(1, lobes * 12, 40);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const phi = uv.getX(i) * Math.PI * 2, theta = (1 - uv.getY(i)) * Math.PI;
      const st = Math.sin(theta), ct = Math.cos(theta);
      const lobe = Math.pow(Math.abs(Math.cos(phi * lobes / 2)), 0.55);
      const s = radius * 1.12 * Math.pow(st, 0.58) * (1 - 0.15 * (1 - lobe) * Math.pow(st, 0.25));
      const y = Math.sign(ct) * Math.pow(Math.abs(ct), 0.8) * 0.8 * (0.9 + 0.1 * lobe)
        * (1 - 0.22 * Math.exp(-st * st / 0.04)) * radius;
      p.setXYZ(i, -Math.cos(phi) * s, y + 0.74 * radius, Math.sin(phi) * s);
    }
    g.computeVertexNormals();
    return g;
  }

  // A plain pointed leaf with a stem, flat in the XZ plane: about 0.23 wide and
  // 0.57 long, the stem toward +z.
  const LEAF_HALF = [[0.012, -0.3], [0.012, -0.2], [0.07, -0.13], [0.115, -0.02], [0.105, 0.09], [0.06, 0.19], [0, 0.27]];
  function leaf(THREE) {
    const s = new THREE.Shape();
    s.moveTo(LEAF_HALF[0][0], LEAF_HALF[0][1]);
    for (let i = 1; i < LEAF_HALF.length; i++) s.lineTo(LEAF_HALF[i][0], LEAF_HALF[i][1]);
    for (let i = LEAF_HALF.length - 2; i >= 0; i--) s.lineTo(-LEAF_HALF[i][0], LEAF_HALF[i][1]);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
  }

  globalThis.TimbreScene.parts = { pumpkin, leaf };
})();
