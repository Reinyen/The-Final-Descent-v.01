/**
 * Living Hover Popover
 *
 * Implements hover popover for Living cards with:
 * - 120ms hover delay, 80ms leave delay
 * - 16px grace region (cursor can move from card to popover)
 * - Smart placement (right by default, flip left if off-screen, clamp in viewport)
 * - Lock behavior (don't open if locked, freeze and fade if locked while open)
 */

const HOVER_DELAY = 120;
const LEAVE_DELAY = 80;
const GRACE_REGION = 16;

/**
 * Create popover controller
 */
export function createPopoverController(popoverElement, store) {
  let hoverTimer = null;
  let leaveTimer = null;
  let currentAnchorRect = null;
  let isMouseInPopover = false;
  let isMouseInCard = false;
  let currentCardElement = null;

  /**
   * Check if point is within grace region of rect
   */
  function isInGraceRegion(x, y, rect) {
    return (
      x >= rect.left - GRACE_REGION &&
      x <= rect.right + GRACE_REGION &&
      y >= rect.top - GRACE_REGION &&
      y <= rect.bottom + GRACE_REGION
    );
  }

  /**
   * Place popover next to anchor card
   */
  function placePopover(anchorRect, viewport) {
    if (!popoverElement || !anchorRect) return;

    const popoverWidth = 320; // max-width from GDD
    const popoverHeight = popoverElement.offsetHeight || 400; // estimate if not yet rendered

    let left = anchorRect.right + 12; // Default: right of card
    let top = anchorRect.top;
    let placement = 'right';

    // Check if it would go off-screen to the right
    if (left + popoverWidth > viewport.width - 20) {
      // Try left side
      left = anchorRect.left - popoverWidth - 12;
      placement = 'left';

      // If still off-screen, clamp and shift
      if (left < 20) {
        left = 20;
        placement = 'clamped';
      }
    }

    // Clamp top/bottom
    if (top + popoverHeight > viewport.height - 20) {
      top = viewport.height - popoverHeight - 20;
    }
    if (top < 20) {
      top = 20;
    }

    popoverElement.style.left = `${left}px`;
    popoverElement.style.top = `${top}px`;
    popoverElement.style.maxWidth = `${popoverWidth}px`;

    return placement;
  }

  /**
   * Render popover content
   */
  function renderPopover(character) {
    if (!character) return '';

    const stats = character.stats || {};
    const abilities = character.abilities || [];

    // Stat colors per GDD
    const hpColor = '#ff6b6b'; // Red for HP
    const conColor = '#51cf66'; // Green for CON
    const spdColor = '#339af0'; // Blue for SPD

    return `
      <div class="popover-header">
        <div class="popover-name">${character.name || '???'}</div>
      </div>
      <div class="popover-role">${character.role || '—'}</div>
      <div class="popover-divider"></div>
      <div class="popover-stats">
        <div class="stat-block">
          <div class="stat-label">HP</div>
          <div class="stat-value" style="color: ${hpColor}">${stats.hp || '??'}</div>
        </div>
        <div class="stat-block">
          <div class="stat-label">CON</div>
          <div class="stat-value" style="color: ${conColor}">${stats.con || '??'}</div>
        </div>
        <div class="stat-block">
          <div class="stat-label">SPD</div>
          <div class="stat-value" style="color: ${spdColor}">${stats.spd || '??'}</div>
        </div>
      </div>
      <div class="popover-divider"></div>
      <div class="popover-abilities-title">ABILITIES</div>
      ${abilities.slice(0, 3).map(ability => `
        <div class="ability-row">
          <div>
            <div class="ability-name">${ability.name || '—'}</div>
            <div class="ability-desc">${ability.desc || '—'}</div>
          </div>
          <div class="ability-sp">${ability.sp || '?'}</div>
        </div>
      `).join('')}
    `;
  }

  /**
   * Show popover
   */
  function show(characterId, anchorRect, allCharacters) {
    const state = store.getState();

    // Don't open if UI is locked
    if (state.uiLocked) return;

    const character = allCharacters.find(c => c.id === characterId);
    if (!character) return;

    currentAnchorRect = anchorRect;

    // Render content
    popoverElement.innerHTML = renderPopover(character);

    // Place popover
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    placePopover(anchorRect, viewport);

    // Show with transition
    popoverElement.classList.add('is-visible');
    popoverElement.style.pointerEvents = 'auto';

    // Store in store
    store.openPopover(characterId, anchorRect);
  }

  /**
   * Hide popover
   */
  function hide() {
    popoverElement.classList.remove('is-visible');
    popoverElement.style.pointerEvents = 'none';
    currentAnchorRect = null;

    store.closePopover();
  }

  /**
   * Freeze popover (when UI becomes locked)
   */
  function freeze() {
    if (!popoverElement.classList.contains('is-visible')) return;

    popoverElement.style.opacity = '0.6';
    popoverElement.style.pointerEvents = 'none';
  }

  /**
   * Unfreeze popover (when UI becomes unlocked)
   */
  function unfreeze() {
    popoverElement.style.opacity = '1';
    popoverElement.style.pointerEvents = 'auto';
  }

  /**
   * Handle card mouseenter
   */
  function handleCardEnter(cardElement, characterId, allCharacters) {
    const state = store.getState();
    if (state.uiLocked) return;

    isMouseInCard = true;
    currentCardElement = cardElement;

    // Clear any pending leave
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }

    // Set hover delay
    hoverTimer = setTimeout(() => {
      const rect = cardElement.getBoundingClientRect();
      show(characterId, rect, allCharacters);
    }, HOVER_DELAY);
  }

  /**
   * Handle card mouseleave
   */
  function handleCardLeave(event) {
    isMouseInCard = false;

    // Clear hover timer if still pending
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    // Check if mouse is moving to popover (within grace region)
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    if (currentAnchorRect && isInGraceRegion(mouseX, mouseY, currentAnchorRect)) {
      // Mouse is in grace region, don't close yet
      return;
    }

    const popoverRect = popoverElement.getBoundingClientRect();
    if (isInGraceRegion(mouseX, mouseY, popoverRect)) {
      // Mouse is moving to popover
      return;
    }

    // Set leave delay
    leaveTimer = setTimeout(() => {
      if (!isMouseInPopover && !isMouseInCard) {
        hide();
      }
    }, LEAVE_DELAY);
  }

  /**
   * Handle popover mouseenter
   */
  function handlePopoverEnter() {
    isMouseInPopover = true;

    // Clear any pending leave
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
  }

  /**
   * Handle popover mouseleave
   */
  function handlePopoverLeave() {
    isMouseInPopover = false;

    // Set leave delay
    leaveTimer = setTimeout(() => {
      if (!isMouseInCard) {
        hide();
      }
    }, LEAVE_DELAY);
  }

  /**
   * Setup popover listeners
   */
  function setupPopoverListeners() {
    popoverElement.addEventListener('mouseenter', handlePopoverEnter);
    popoverElement.addEventListener('mouseleave', handlePopoverLeave);
  }

  /**
   * Attach to Living cards
   */
  function attachToCards(cardElements, allCharacters) {
    cardElements.forEach((cardElement, index) => {
      const enterHandler = () => {
        // Get fresh state on each hover to reflect reroll changes
        const state = store.getState();
        const characterId = state.livingIds[index];
        if (!characterId) return;

        handleCardEnter(cardElement, characterId, allCharacters);
      };

      const leaveHandler = (event) => {
        handleCardLeave(event);
      };

      cardElement.addEventListener('mouseenter', enterHandler);
      cardElement.addEventListener('mouseleave', leaveHandler);
    });
  }

  /**
   * Listen to lock state changes
   */
  function setupLockListener() {
    store.on('lock:change', ({ locked }) => {
      if (locked) {
        freeze();
        // Clear any pending timers
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
      } else {
        unfreeze();
      }
    });
  }

  // Setup popover listeners
  setupPopoverListeners();
  setupLockListener();

  return {
    attachToCards,
    show,
    hide,
    freeze,
    unfreeze
  };
}
