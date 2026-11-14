/* ── ace-pride-ribbon (the asexual Pride flag; a 3D scene on the scene kit) ──
   Shown in the control panel as "Ace pride flag". AVEN, 2010: four equal stripes,
   black, grey, white and purple.
   The flag flies from a pole and the voice is the wind: in silence it hangs and
   sways, talking lifts it until it flies straight out, each syllable is a gust that
   travels from the pole to the free end, and a beat snaps the cloth.
   Hearts, in colours chosen for the flag, peel off the cloth and blow away downwind.
   The flag itself is overlay/flag.js (TimbreFlag), shared by the five flag effects. */
VIZ_FACTORIES['ace-pride-ribbon'] = TimbreScene.factory(() => TimbreFlag.definition('ace-pride-ribbon'));
