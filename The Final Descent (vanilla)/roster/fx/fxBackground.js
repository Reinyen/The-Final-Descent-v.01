export function initBackground(uniforms) {
  function setDustStrength(v) {
    uniforms.uDustStrength.value = v;
  }
  function setVignette(v) {
    uniforms.uVignetteStrength.value = v;
  }
  function setDrift(speed) {
    uniforms.uDustDriftSpeed.value = speed;
  }
  return { setDustStrength, setVignette, setDrift };
}
