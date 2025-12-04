export function initMorph(uniforms) {
  function setPhase(v) {
    uniforms.uPhase.value = v;
  }
  function setSweep(t) {
    uniforms.uSweepT.value = t;
  }
  return { setPhase, setSweep };
}
