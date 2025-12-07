/**
 * Living Cards Row - Sizing, Scroll, and Selection Behavior
 *
 * Manages the Living cards row with:
 * - Selection behavior (click to select, click another to switch)
 * - Responsive sizing
 * - Horizontal scroll with gradient edge fades
 * - Mouse wheel horizontal scrolling
 */

/**
 * Setup horizontal scroll behavior for Living zone
 */
export function setupLivingScroll(livingZone) {
  if (!livingZone) return;

  /**
   * Update scroll fade indicators
   */
  function updateScrollFades() {
    const { scrollLeft, scrollWidth, clientWidth } = livingZone;
    const maxScroll = scrollWidth - clientWidth;

    // Show left fade if scrolled right
    if (scrollLeft > 10) {
      livingZone.classList.add('has-scroll-left');
    } else {
      livingZone.classList.remove('has-scroll-left');
    }

    // Show right fade if not at end
    if (scrollLeft < maxScroll - 10) {
      livingZone.classList.add('has-scroll-right');
    } else {
      livingZone.classList.remove('has-scroll-right');
    }
  }

  /**
   * Handle mouse wheel for horizontal scrolling
   */
  function handleWheel(e) {
    if (!livingZone.scrollWidth || livingZone.scrollWidth <= livingZone.clientWidth) {
      return; // No overflow, no scroll
    }

    // Only handle vertical wheel events (convert to horizontal)
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      livingZone.scrollLeft += e.deltaY;
      updateScrollFades();
    }
  }

  // Attach listeners
  livingZone.addEventListener('scroll', updateScrollFades);
  livingZone.addEventListener('wheel', handleWheel, { passive: false });

  // Check on window resize
  window.addEventListener('resize', () => {
    updateScrollFades();
  });

  // Initial check
  setTimeout(updateScrollFades, 100);

  return () => {
    livingZone.removeEventListener('scroll', updateScrollFades);
    livingZone.removeEventListener('wheel', handleWheel);
  };
}

/**
 * Setup Living card selection behavior
 */
export function setupCardSelection(cards, store) {
  if (!cards || !store) return;

  const clickHandlers = [];

  cards.forEach((cardElement, index) => {
    const handler = () => {
      const state = store.getState();
      if (state.uiLocked) return;

      const characterId = state.livingIds[index];
      if (!characterId) return;

      // Select this card (clicking same card keeps it selected, not toggle)
      store.selectLiving(characterId);

      // Update visual state
      updateSelectionVisuals(cards, state.livingIds, characterId);
    };

    cardElement.addEventListener('click', handler);
    clickHandlers.push({ element: cardElement, handler });
  });

  return () => {
    clickHandlers.forEach(({ element, handler }) => {
      element.removeEventListener('click', handler);
    });
  };
}

/**
 * Update selection visual states
 */
export function updateSelectionVisuals(cards, livingIds, selectedId) {
  cards.forEach((cardElement, index) => {
    const characterId = livingIds[index];
    const isSelected = characterId === selectedId;

    if (isSelected) {
      cardElement.classList.add('isSelected');
    } else {
      cardElement.classList.remove('isSelected');
    }
  });
}

/**
 * Setup hover visual effects
 */
export function setupCardHover(cards, store) {
  if (!cards || !store) return;

  const hoverHandlers = [];

  cards.forEach((cardElement, index) => {
    const enterHandler = () => {
      const state = store.getState();
      if (state.uiLocked) return;

      const characterId = state.livingIds[index];
      if (!characterId) return;

      store.hoverLiving(characterId);
      cardElement.classList.add('isHovered');
    };

    const leaveHandler = () => {
      store.endHover();
      cardElement.classList.remove('isHovered');
    };

    cardElement.addEventListener('mouseenter', enterHandler);
    cardElement.addEventListener('mouseleave', leaveHandler);

    hoverHandlers.push({
      element: cardElement,
      enterHandler,
      leaveHandler
    });
  });

  return () => {
    hoverHandlers.forEach(({ element, enterHandler, leaveHandler }) => {
      element.removeEventListener('mouseenter', enterHandler);
      element.removeEventListener('mouseleave', leaveHandler);
    });
  };
}

/**
 * Render Living card content (name + role only on face)
 */
export function renderLivingCard(cardElement, character) {
  if (!cardElement || !character) return;

  const nameEl = cardElement.querySelector('.cardName');
  const roleEl = cardElement.querySelector('.cardRole');

  if (nameEl) {
    nameEl.textContent = character.name || '';
  }

  if (roleEl) {
    roleEl.textContent = character.role || '';
  }

  // Make visible with animation
  cardElement.style.opacity = '1';
  cardElement.style.transform = 'translateY(0)';
}

/**
 * Create Living card DOM element
 */
export function createLivingCardElement() {
  const button = document.createElement('button');
  button.className = 'livingCard';
  button.type = 'button';

  const surface = document.createElement('div');
  surface.className = 'cardSurface';

  const text = document.createElement('div');
  text.className = 'cardText';

  const name = document.createElement('div');
  name.className = 'cardName';

  const role = document.createElement('div');
  role.className = 'cardRole';

  const mark = document.createElement('div');
  mark.className = 'cardMark';

  text.appendChild(name);
  text.appendChild(role);

  button.appendChild(surface);
  button.appendChild(text);
  button.appendChild(mark);

  return button;
}

/**
 * Apply responsive scaling to Living cards
 * (Called on resize and initial load)
 */
export function applyResponsiveScaling(livingRow, livingZone) {
  if (!livingRow || !livingZone) return;

  const viewportWidth = window.innerWidth;

  // Breakpoint-based scaling
  let scale = 1;

  if (viewportWidth < 900) {
    scale = 0.85; // Smaller cards for narrow viewports
  } else if (viewportWidth < 1200) {
    scale = 0.95;
  }

  livingRow.style.transform = `scale(${scale})`;
}
