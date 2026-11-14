/* ── winter-aurora (3D scene on the scene kit) ──
   Placeholder while the scene is built: an empty kit scene. */
VIZ_FACTORIES['winter-aurora'] = TimbreScene.factory(function () {
  return {
    frame: { width: 8.6, height: 5.3, center: [0, 1.85, 0] },
    fov: 30,
    pitch: 5,
    build() {},
    update() {},
    debug() { return {}; },
  };
});
