export function initNodes(uniforms) {
  const positions = [
    [0.28, 0.35],
    [0.5, 0.35],
    [0.72, 0.35],
    [0.3, 0.68],
    [0.5, 0.68],
    [0.7, 0.68]
  ];

  function setAlive(livingIds, fallenIds) {
    const aliveMask = new Float32Array(6);
    const fallenMask = new Float32Array(6);
    livingIds.forEach((idx) => {
      aliveMask[idx] = 1;
    });
    fallenIds.forEach((idx) => {
      fallenMask[idx] = 1;
    });
    uniforms.uNodeAlive.value = aliveMask;
    uniforms.uNodeFallen.value = fallenMask;
  }

  function setPositions(offset = 0) {
    positions.forEach((p, i) => {
      uniforms.uNodePos.value[i].set(p[0], p[1] + offset, 0);
    });
  }

  function setCracks(indices, strength) {
    const arr = uniforms.uCrackStrength.value;
    indices.forEach((i) => {
      arr[i] = strength;
    });
    uniforms.uCrackStrength.value = arr;
  }

  function setEmbers(indices, strength) {
    const arr = uniforms.uEmberStrength.value;
    indices.forEach((i) => {
      arr[i] = strength;
    });
    uniforms.uEmberStrength.value = arr;
  }

  function setFallOffsets(indices, val) {
    const arr = uniforms.uFallOffset.value;
    indices.forEach((i) => {
      arr[i] = val;
    });
    uniforms.uFallOffset.value = arr;
  }

  return { setAlive, setPositions, setCracks, setEmbers, setFallOffsets, positions };
}
