import { runIntroBeats } from './beats.js';

export function startTimeline(ctx) {
  const introStart = performance.now();

  function tick(now) {
    const elapsed = (now - introStart) / 1000;
    runIntroBeats(elapsed, ctx);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
