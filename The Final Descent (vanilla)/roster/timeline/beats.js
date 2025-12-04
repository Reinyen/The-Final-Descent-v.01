export function runIntroBeats(elapsed, ctx) {
  const {
    fx,
    overlay,
    livingCards,
    fallenPlaques,
    setUILocked,
    markPhase,
    revealUI
  } = ctx;

  if (elapsed < 0.3) {
    fx.background.setDustStrength(0);
    fx.background.setVignette(0);
    setUILocked(true);
    overlay.style.opacity = 0;
  } else if (elapsed < 1.6) {
    const t = (elapsed - 0.3) / 1.3;
    fx.background.setDustStrength(t);
    fx.background.setVignette(t * 0.8);
    fx.background.setDrift(0.4 + t * 0.3);
  } else if (elapsed < 2.2) {
    fx.nodes.setAlive([0, 1, 2], [3, 4, 5]);
    fx.background.setDustStrength(1);
  } else if (elapsed < 2.9) {
    fx.nodes.setPositions(0);
    fx.morph.setPhase((elapsed - 2.2) / 0.7);
  } else if (elapsed < 3.3) {
    fx.morph.setSweep((elapsed - 2.9) / 0.4);
  } else if (elapsed < 4.2) {
    fx.nodes.setCracks([3, 4, 5], (elapsed - 3.3));
    fx.nodes.setEmbers([3, 4, 5], (elapsed - 3.3));
  } else if (elapsed < 5.4) {
    const t = (elapsed - 4.2) / 1.2;
    fx.nodes.setFallOffsets([3, 4, 5], t * 0.12);
  } else if (elapsed < 6.8) {
    livingCards.forEach((c) => {
      c.button.style.opacity = '1';
      c.button.style.transform = 'translateY(0)';
    });
    fallenPlaques.forEach((p) => {
      p.wrapper.style.opacity = '1';
      p.wrapper.style.transform = 'translateY(0)';
    });
  } else if (elapsed < 7.4) {
    markPhase('ui');
    revealUI();
  } else {
    setUILocked(false);
  }
}
