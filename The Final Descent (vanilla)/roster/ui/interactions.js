import { renderPopover } from './renderText.js';
import { placePopover } from './layout.js';

export function attachInteractions(context) {
  const {
    state,
    livingCards,
    hoverPopover,
    rerollButtons,
    onSelect,
    onHover,
    onHoverEnd,
    onSingleReroll,
    onTotalReroll,
    lockPopover,
    unlockPopover
  } = context;

  livingCards.forEach((card) => {
    card.button.addEventListener('mouseenter', () => {
      if (state.uiLocked) return;
      const id = card.button.dataset.id;
      if (!id) return;
      state.hoveredLivingId = id;
      const data = state.roster.find((c) => c.id === id);
      renderPopover(hoverPopover, data);
      hoverPopover.classList.add('is-visible');
      const rect = card.button.getBoundingClientRect();
      placePopover(hoverPopover, rect, {
        width: window.innerWidth,
        height: window.innerHeight
      });
      onHover(id);
    });

    card.button.addEventListener('mouseleave', () => {
      if (state.uiLocked) return;
      state.hoveredLivingId = null;
      setTimeout(() => {
        if (!state.hoveredLivingId) hoverPopover.classList.remove('is-visible');
      }, 60);
      onHoverEnd();
    });

    card.button.addEventListener('click', () => {
      if (state.uiLocked) return;
      const id = card.button.dataset.id;
      if (!id) return;
      state.selectedLivingId = id;
      onSelect(id);
    });
  });

  rerollButtons.single.addEventListener('click', () => {
    if (state.uiLocked) return;
    onSingleReroll();
  });

  rerollButtons.total.addEventListener('click', () => {
    if (state.uiLocked) return;
    onTotalReroll();
  });

  rerollButtons.confirm.addEventListener('click', () => {
    if (state.uiLocked) return;
    lockPopover();
    setTimeout(unlockPopover, 200);
  });
}

export function updateButtonStates(state, buttons) {
  const { single, total, confirm } = buttons;
  single.disabled = !state.selectedLivingId || state.rerollsRemaining < 2 || state.uiLocked;
  total.disabled = state.rerollsRemaining < 1 || state.uiLocked;
  confirm.disabled = state.uiLocked;
}
