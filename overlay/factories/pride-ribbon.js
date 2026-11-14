/* ── pride-ribbon (the rainbow Pride flag; a 3D scene on the scene kit) ──
   Shown in the control panel as "Pride flag". Six stripes, red at the top and violet
   at the bottom; with Stripe style at 50 or more, eight: black and brown above the six.
   The flag flies from a pole and the voice is the wind: in silence it hangs and
   sways, talking lifts it until it flies straight out, each syllable is a gust that
   travels from the pole to the free end, and a beat snaps the cloth.
   Hearts, in colours chosen for the flag, peel off the cloth and blow away downwind.
   The flag itself is overlay/flag.js (TimbreFlag), shared by the five flag effects. */
VIZ_FACTORIES['pride-ribbon'] = TimbreScene.factory(() => TimbreFlag.definition('pride-ribbon'));
