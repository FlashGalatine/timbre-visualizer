/* ── thanksgiving-harvest (3D scene on the scene kit) ──
   Three cream pillar candles that flicker with the voice, each out of step with
   the others, throwing real light onto an invisible ground. Built on
   TimbreScene (overlay/scene-kit.js): the kit owns the renderer, camera,
   placement, afterglow and disposal; this file only builds and animates. */
VIZ_FACTORIES['thanksgiving-harvest'] = function () {
  // (x, z, height, fall rate per second, flicker phase)
  const CANDLES = [
    [0.3, -0.75, 1.15, 2.2, 0.0],
    [2.55, -0.05, 0.8, 3.4, 2.1],
    [-1.15, 1.55, 0.5, 4.6, 4.3],
  ];
  const CANDLE_RADIUS = 0.13;
  const JITTER_HZ = 60;   // the random part of the flicker is redrawn this often, whatever the frame rate

  function definition() {
    const candles = [];

    function build(k) {
      const { THREE, scene } = k;
      // Wax glows near the flame: an emissive map, white at the top fading to black.
      const gc = document.createElement('canvas');
      gc.width = 4; gc.height = 64;
      const gx = gc.getContext('2d'), gg = gx.createLinearGradient(0, 0, 0, 64);
      gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, '#555'); gg.addColorStop(1, '#000');
      gx.fillStyle = gg; gx.fillRect(0, 0, 4, 64);
      const waxGlow = k.keep(new THREE.CanvasTexture(gc));
      const halo = k.glowTexture(255, 176, 84);
      const flameGeo = k.keep(new THREE.SphereGeometry(0.045, 12, 10));

      for (const [x, z, h, fall, phase] of CANDLES) {
        const wax = new THREE.Mesh(
          k.keep(new THREE.CylinderGeometry(CANDLE_RADIUS, CANDLE_RADIUS, h, 20)),
          k.keep(new THREE.MeshStandardMaterial({
            color: 0xf3e3c0, roughness: 0.55, metalness: 0,
            emissive: 0xff8a30, emissiveMap: waxGlow, emissiveIntensity: 0.3,
          })));
        wax.position.set(x, h / 2, z);
        wax.receiveShadow = true;   // no castShadow: its own light sits just above it
        scene.add(wax);

        const flame = new THREE.Mesh(flameGeo, k.keep(new THREE.MeshBasicMaterial({ color: 0xffffff })));
        flame.position.set(x, h + 0.12, z);
        scene.add(flame);

        const glow = new THREE.Sprite(k.keep(k.addLight(new THREE.SpriteMaterial({ map: halo, depthTest: false }))));
        glow.position.copy(flame.position);
        glow.renderOrder = 10;
        scene.add(glow);

        const light = k.practical(new THREE.PointLight(0xffa040, 0.8, 14, 2));
        light.position.set(x, h + 0.16, z);
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.camera.near = 0.05;
        light.shadow.camera.far = 14;
        light.shadow.bias = -0.004;
        light.shadow.normalBias = 0.03;
        scene.add(light);

        candles.push({ x, h, fall, phase, wax, flame, glow, light, follow: 0, jitter: 0, slot: -1, brightness: 0 });
      }
    }

    function update(k, audio, now, dt) {
      const t = now / 1000;
      const slot = Math.floor(t * JITTER_HZ);
      for (const c of candles) {
        // Fast rise toward the voice, each candle's own slow fall.
        const rate = audio.level > c.follow ? 30 : c.fall;
        c.follow += (audio.level - c.follow) * (1 - Math.exp(-rate * dt));
        if (slot !== c.slot) { c.slot = slot; c.jitter = (Math.random() - 0.5) * 0.05; }
        const flicker = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(15.3 * t + c.phase) * Math.sin(6.7 * t + 2 * c.phase)) + c.jitter;
        const b = Math.min(1.5, (0.22 + 0.78 * c.follow) * flicker + 0.35 * audio.kick);
        c.brightness = b;

        c.light.intensity = 0.8 + 10 * b;
        c.light.position.x = c.x + Math.sin(17 * t + c.phase) * 0.012;   // the shadows shiver
        c.wax.material.emissiveIntensity = 0.25 + 1.1 * b;
        const stretch = 1.6 + 1.6 * b;
        c.flame.scale.set(1, stretch + audio.kick, 1);
        c.flame.position.y = c.h + 0.1 + stretch * 0.03;
        c.flame.material.color.setRGB(2.2 + b, 1.5 + 0.6 * b, 0.7);
        c.glow.scale.setScalar(0.5 + 0.9 * b);
        c.glow.material.opacity = Math.min(1, 0.35 + 0.5 * b);
      }
    }

    return {
      frame: { width: 6.8, height: 3.1, center: [-0.4, 0.75, 0.3] },
      fov: 30,
      pitch: 14,
      groundColor: 0x7a6f66,
      build,
      update,
      debug() {
        return { candles: candles.map((c) => c.brightness), follow: candles.map((c) => c.follow) };
      },
    };
  }

  let scene = null;
  return {
    start() { scene = TimbreScene.create(definition()); },
    stop() { if (scene) scene.dispose(); scene = null; },
    onResize() { if (scene) scene.resize(); },
    draw(now, dt) { if (scene) scene.draw(now, dt); },
  };
};
