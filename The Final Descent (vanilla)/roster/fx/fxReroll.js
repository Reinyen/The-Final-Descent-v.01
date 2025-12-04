export function initRerollFx(uniforms) {
  let timer = null;

  function clearTimer() {
    if (timer) cancelAnimationFrame(timer);
    timer = null;
  }

  function runSequence(duration, originRect, onMid, onDone) {
    clearTimer();
    const start = performance.now();
    uniforms.uRerollActive.value = 1;
    uniforms.uRerollOriginRect.value = originRect;

    function step(now) {
      const t = (now - start) / duration;
      uniforms.uRerollProgress.value = Math.min(t, 1);
      if (t >= 0.45 && onMid) onMid();
      if (t >= 1) {
        uniforms.uRerollActive.value = 0;
        uniforms.uRerollProgress.value = 0;
        if (onDone) onDone();
        return;
      }
      timer = requestAnimationFrame(step);
    }

    timer = requestAnimationFrame(step);
  }

  function startSingle(rect, onMid, onDone) {
    const origin = new Float32Array([
      rect.x / window.innerWidth,
      rect.y / window.innerHeight,
      rect.width / window.innerWidth,
      rect.height / window.innerHeight
    ]);
    runSequence(1600, origin, onMid, onDone);
  }

  function startTotal(rects, onMidAll, onDone) {
    const first = rects[0];
    const origin = new Float32Array([
      first.x / window.innerWidth,
      first.y / window.innerHeight,
      first.width / window.innerWidth,
      first.height / window.innerHeight
    ]);
    runSequence(2200, origin, onMidAll, onDone);
  }

  return { startSingle, startTotal };
}
