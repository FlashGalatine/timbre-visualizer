/* ── july-fourth-stripes (the flag of the United States; a 3D scene on the scene kit) ──
   Shown in the control panel as "Fourth of July flag". Thirteen stripes, red first,
   and a blue union with fifty stars.
   The flag flies from a pole and the voice is the wind: in silence it hangs and
   sways, talking lifts it until it flies straight out, each syllable is a gust that
   travels from the pole to the free end, and a beat snaps the cloth.
   Fireworks go off behind it on a beat and light it from behind, and the stars shine
   with the high end of the sound.
   The flag itself is overlay/flag.js (TimbreFlag), shared by the five flag effects. */
VIZ_FACTORIES['july-fourth-stripes'] = TimbreScene.factory(() => TimbreFlag.definition('july-fourth-stripes'));
