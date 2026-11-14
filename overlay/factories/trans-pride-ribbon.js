/* ── trans-pride-ribbon (the transgender Pride flag; a 3D scene on the scene kit) ──
   Shown in the control panel as "Trans pride flag". Monica Helms, 1999: five equal
   stripes, light blue, pink, white, pink, light blue. It reads the same from either
   end, so it is right whichever way it flies.
   The flag flies from a pole and the voice is the wind: in silence it hangs and
   sways, talking lifts it until it flies straight out, each syllable is a gust that
   travels from the pole to the free end, and a beat snaps the cloth.
   Hearts in the flag's colours peel off the cloth and blow away downwind.
   The flag itself is overlay/flag.js (TimbreFlag), shared by the five flag effects. */
VIZ_FACTORIES['trans-pride-ribbon'] = TimbreScene.factory(() => TimbreFlag.definition('trans-pride-ribbon'));
