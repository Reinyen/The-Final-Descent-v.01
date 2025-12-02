/**
 * Roster UI Controller
 * Handles all DOM manipulation, card rendering, popover, and button interactions.
 * Per GDD §3.1: This is Layer B (HTML/CSS UI overlay)
 */

import { getCharacterById } from './character-data.js';
import { SelectionParticleEffect } from './roster-selection-effect.js';

export class RosterUI {
  constructor(stateMachine, callbacks) {
    this.stateMachine = stateMachine;
    this.callbacks = callbacks || {};

    // DOM references
    this.titleArea = document.getElementById('roster-title-area');
    this.livingCardsRow = document.getElementById('living-cards-row');
    this.fallenPortraitsRow = document.getElementById('fallen-portraits-row');
    this.popover = document.getElementById('hover-popover');
    this.rerollStars = document.querySelectorAll('.reroll-star');
    this.singleRerollBtn = document.getElementById('single-reroll-btn');
    this.totalRerollBtn = document.getElementById('total-reroll-btn');
    this.descendBtn = document.getElementById('descend-btn');
    this.selectionEffectContainer = document.getElementById('selection-effect-container');

    // Hover state
    this.hoveredCardId = null;
    this.hoverOpenTimer = null;
    this.hoverCloseTimer = null;
    this.popoverOpen = false;

    // Selection state
    this.selectedCardId = null;

    // Selection particle effect
    this.selectionEffect = null;

    // Initialize
    this.setupEventListeners();

    console.log('[RosterUI] Initialized');
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Reroll buttons
    this.singleRerollBtn.addEventListener('click', () => this.handleSingleReroll());
    this.totalRerollBtn.addEventListener('click', () => this.handleTotalReroll());

    // Descend button
    this.descendBtn.addEventListener('click', () => this.handleDescend());

    // Popover stays open when cursor moves to it
    this.popover.addEventListener('mouseenter', () => {
      clearTimeout(this.hoverCloseTimer);
    });

    this.popover.addEventListener('mouseleave', () => {
      this.schedulePopoverClose();
    });
  }

  /**
   * Render Living cards
   * Per GDD §6.2 and §7.3
   * @param {string[]} livingIds - Array of 3 Living character IDs
   */
  renderLivingCards(livingIds) {
    if (livingIds.length !== 3) {
      console.error('[RosterUI] Expected 3 Living IDs, got:', livingIds.length);
      return;
    }

    // Clear existing cards
    this.livingCardsRow.innerHTML = '';

    // Create cards
    for (const charId of livingIds) {
      const char = getCharacterById(charId);
      if (!char) {
        console.error('[RosterUI] Character not found:', charId);
        continue;
      }

      const cardElement = this.createLivingCard(char);
      this.livingCardsRow.appendChild(cardElement);
    }

    console.log('[RosterUI] Rendered Living cards:', livingIds);
  }

  /**
   * Create a Living card element
   * @param {object} char - Character data
   * @returns {HTMLElement} Card element
   */
  createLivingCard(char) {
    const card = document.createElement('div');
    card.className = 'living-card golden-glow'; // Add golden-glow class for persistent glow
    card.dataset.charId = char.id;

    card.innerHTML = `
      <div class="living-card-inner">
        <div class="card-constellation" style="background: radial-gradient(circle at 50% 30%, ${char.themeColor}33, transparent 70%);"></div>
        <div class="card-particles"></div>
        <div class="card-content">
          <h2 class="char-name">${char.name}</h2>
          <p class="char-role">${char.roleLabel}</p>
        </div>
        <div class="selection-marker hidden">✦</div>
      </div>
    `;

    // Event listeners
    card.addEventListener('mouseenter', () => this.handleCardHoverStart(char.id));
    card.addEventListener('mouseleave', () => this.handleCardHoverEnd(char.id));
    card.addEventListener('click', () => this.handleCardClick(char.id));

    return card;
  }

  /**
   * Render Fallen portraits
   * Per GDD §6.3 and §7.4
   * @param {string[]} fallenIds - Array of 3 Fallen character IDs
   */
  renderFallenPortraits(fallenIds) {
    if (fallenIds.length !== 3) {
      console.error('[RosterUI] Expected 3 Fallen IDs, got:', fallenIds.length);
      return;
    }

    // Clear existing portraits
    this.fallenPortraitsRow.innerHTML = '';

    // Create portraits
    for (const charId of fallenIds) {
      const char = getCharacterById(charId);
      if (!char) {
        console.error('[RosterUI] Character not found:', charId);
        continue;
      }

      const portraitElement = this.createFallenPortrait(char);
      this.fallenPortraitsRow.appendChild(portraitElement);
    }

    console.log('[RosterUI] Rendered Fallen portraits:', fallenIds);
  }

  /**
   * Create a Fallen portrait element
   * @param {object} char - Character data
   * @returns {HTMLElement} Portrait element
   */
  createFallenPortrait(char) {
    const portrait = document.createElement('div');
    portrait.className = 'fallen-portrait';
    portrait.dataset.charId = char.id;

    portrait.innerHTML = `
      <div class="fallen-portrait-inner">
        <div class="fracture-overlay"></div>
        <div class="fallen-shimmer"></div>
        <p class="fallen-name">${char.name}</p>
      </div>
    `;

    // Add hover event listeners for stats popover
    portrait.addEventListener('mouseenter', () => this.handleFallenHoverStart(char.id));
    portrait.addEventListener('mouseleave', () => this.handleFallenHoverEnd(char.id));

    return portrait;
  }

  /**
   * Handle Fallen portrait hover start
   * Shows stats in popover
   * @param {string} charId
   */
  handleFallenHoverStart(charId) {
    // Ignore if UI is locked
    if (this.stateMachine.isLocked()) {
      return;
    }

    this.hoveredCardId = charId;

    // Clear any pending close timer
    clearTimeout(this.hoverCloseTimer);

    // Schedule popover open with 120ms delay
    this.hoverOpenTimer = setTimeout(() => {
      this.openPopover(charId);
    }, 120);
  }

  /**
   * Handle Fallen portrait hover end
   * @param {string} charId
   */
  handleFallenHoverEnd(charId) {
    if (this.hoveredCardId !== charId) return;

    this.hoveredCardId = null;

    // Clear open timer if still pending
    clearTimeout(this.hoverOpenTimer);

    // Schedule popover close with 80ms delay
    this.schedulePopoverClose();
  }

  /**
   * Handle card hover start
   * Per GDD §8.1: Open popover after 120ms delay
   * @param {string} charId
   */
  handleCardHoverStart(charId) {
    // Ignore if UI is locked per GDD §3.4
    if (this.stateMachine.isLocked()) {
      return;
    }

    this.hoveredCardId = charId;

    // Clear any pending close timer
    clearTimeout(this.hoverCloseTimer);

    // Schedule popover open with 120ms delay per GDD §8.1
    this.hoverOpenTimer = setTimeout(() => {
      this.openPopover(charId);
    }, 120);
  }

  /**
   * Handle card hover end
   * Per GDD §8.1: Close popover after 80ms delay
   * @param {string} charId
   */
  handleCardHoverEnd(charId) {
    if (this.hoveredCardId !== charId) return;

    this.hoveredCardId = null;

    // Clear open timer if still pending
    clearTimeout(this.hoverOpenTimer);

    // Schedule popover close with 80ms delay per GDD §8.1
    this.schedulePopoverClose();
  }

  /**
   * Schedule popover close with delay
   */
  schedulePopoverClose() {
    this.hoverCloseTimer = setTimeout(() => {
      this.closePopover();
    }, 80);
  }

  /**
   * Open popover
   * Per GDD §8.2: Show stats and abilities
   * @param {string} charId
   */
  openPopover(charId) {
    const char = getCharacterById(charId);
    if (!char) return;

    // Populate popover content
    document.getElementById('popover-name').textContent = char.name;
    document.getElementById('popover-role').textContent = char.roleLabel;
    document.getElementById('popover-hp').textContent = char.stats.HP;
    document.getElementById('popover-con').textContent = char.stats.CON;
    document.getElementById('popover-spd').textContent = char.stats.SPD;

    // Populate abilities
    const abilitiesList = document.getElementById('popover-abilities-list');
    abilitiesList.innerHTML = '';
    for (const ability of char.abilities) {
      const abilityItem = document.createElement('div');
      abilityItem.className = 'ability-item';
      abilityItem.innerHTML = `
        <div class="ability-header">
          <div class="ability-name">${ability.name}</div>
          <div class="ability-sp-cost">${ability.spCost} SP</div>
        </div>
        <div class="ability-description">${ability.description}</div>
      `;
      abilitiesList.appendChild(abilityItem);
    }

    // Position popover relative to card or portrait
    let targetElement = this.livingCardsRow.querySelector(`[data-char-id="${charId}"]`);
    if (!targetElement) {
      targetElement = this.fallenPortraitsRow.querySelector(`[data-char-id="${charId}"]`);
    }
    if (targetElement) {
      this.positionPopover(targetElement);
    }

    // Show popover
    this.popover.classList.remove('hidden');
    this.popoverOpen = true;

    // Apply locked state if UI is locked per GDD §3.4
    if (this.stateMachine.isLocked()) {
      this.popover.classList.add('locked');
    }
  }

  /**
   * Position popover relative to card
   * Per GDD §8.3: Stay on-screen with smart placement
   * @param {HTMLElement} cardElement
   */
  positionPopover(cardElement) {
    const cardRect = cardElement.getBoundingClientRect();
    const popoverWidth = 320; // Per CSS
    const popoverHeight = this.popover.offsetHeight || 400; // Estimate
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 16; // Grace region per GDD §8.1

    let left = cardRect.right + gap;
    let top = cardRect.top;

    // Check if popover would overflow right edge
    if (left + popoverWidth > viewportWidth) {
      // Flip to left side
      left = cardRect.left - popoverWidth - gap;
    }

    // Check if still overflows left edge
    if (left < 0) {
      left = gap;
    }

    // Check if overflows bottom
    if (top + popoverHeight > viewportHeight) {
      top = viewportHeight - popoverHeight - gap;
    }

    // Check if overflows top
    if (top < 0) {
      top = gap;
    }

    this.popover.style.left = `${left}px`;
    this.popover.style.top = `${top}px`;
  }

  /**
   * Close popover
   */
  closePopover() {
    this.popover.classList.add('hidden');
    this.popover.classList.remove('locked');
    this.popoverOpen = false;
  }

  /**
   * Handle card click (selection)
   * Per GDD §8.3: Select exactly one Living card
   * @param {string} charId
   */
  handleCardClick(charId) {
    // Ignore if UI is locked per GDD §3.4
    if (this.stateMachine.isLocked()) {
      return;
    }

    // Update selection
    this.setSelectedCard(charId);

    // Notify callback
    if (this.callbacks.onCardSelected) {
      this.callbacks.onCardSelected(charId);
    }
  }

  /**
   * Set selected card (visual update)
   * @param {string|null} charId
   */
  setSelectedCard(charId) {
    // Remove previous selection
    const previouslySelected = this.livingCardsRow.querySelector('.living-card.selected');
    if (previouslySelected) {
      previouslySelected.classList.remove('selected');
      const marker = previouslySelected.querySelector('.selection-marker');
      if (marker) marker.classList.add('hidden');
    }

    // Stop previous selection effect
    if (this.selectionEffect) {
      this.selectionEffect.stop();
      this.selectionEffect = null;
      this.selectionEffectContainer.classList.add('hidden');
    }

    this.selectedCardId = charId;

    if (charId) {
      // Apply new selection
      const cardElement = this.livingCardsRow.querySelector(`[data-char-id="${charId}"]`);
      if (cardElement) {
        cardElement.classList.add('selected');
        const marker = cardElement.querySelector('.selection-marker');
        if (marker) marker.classList.remove('hidden');

        // Position and start selection particle effect
        this.showSelectionEffect(cardElement);
      }
    }
  }

  /**
   * Show selection particle effect behind selected card
   * @param {HTMLElement} cardElement
   */
  showSelectionEffect(cardElement) {
    const cardRect = cardElement.getBoundingClientRect();

    // Position effect container behind card
    this.selectionEffectContainer.style.left = `${cardRect.left - 35}px`;
    this.selectionEffectContainer.style.top = `${cardRect.top - 25}px`;
    this.selectionEffectContainer.classList.remove('hidden');

    // Create and start effect
    this.selectionEffect = new SelectionParticleEffect(this.selectionEffectContainer);
    this.selectionEffect.init();
    this.selectionEffect.start();

    console.log('[RosterUI] Selection effect started for card');
  }

  /**
   * Update reroll stars display
   * Per GDD §8.4: Visual update with crumble animation
   * @param {number} rerollsRemaining
   */
  updateRerollStars(rerollsRemaining) {
    this.rerollStars.forEach((star, index) => {
      if (index < rerollsRemaining) {
        star.classList.add('active');
        star.classList.remove('spent');
      } else {
        star.classList.remove('active');
        star.classList.add('spent');
      }
    });
  }

  /**
   * Animate reroll star spend
   * Per GDD §8.4: Crumble to ash
   * @param {number} count - Number of stars to spend
   */
  animateStarSpend(count) {
    let spentCount = 0;
    for (let i = this.rerollStars.length - 1; i >= 0 && spentCount < count; i--) {
      const star = this.rerollStars[i];
      if (star.classList.contains('active')) {
        star.classList.add('crumbling');
        setTimeout(() => {
          star.classList.remove('active', 'crumbling');
          star.classList.add('spent');
        }, 600); // Duration of crumble animation
        spentCount++;
      }
    }
  }

  /**
   * Update button enabled/disabled states
   * Per GDD §8.5
   * @param {object} state - { selectedCardId, rerollsRemaining, uiLocked }
   */
  updateButtonStates(state) {
    const { selectedCardId, rerollsRemaining, uiLocked } = state;

    // Single reroll: requires selection, >= 2 rerolls, not locked
    const canSingleReroll = selectedCardId !== null && rerollsRemaining >= 2 && !uiLocked;
    this.singleRerollBtn.disabled = !canSingleReroll;

    // Total reroll: requires >= 1 reroll, not locked
    const canTotalReroll = rerollsRemaining >= 1 && !uiLocked;
    this.totalRerollBtn.disabled = !canTotalReroll;

    // Descend button: not locked
    this.descendBtn.disabled = uiLocked;
  }

  /**
   * Handle single reroll button click
   */
  handleSingleReroll() {
    if (this.stateMachine.isLocked()) return;
    if (this.callbacks.onSingleReroll) {
      this.callbacks.onSingleReroll(this.selectedCardId);
    }
  }

  /**
   * Handle total reroll button click
   */
  handleTotalReroll() {
    if (this.stateMachine.isLocked()) return;
    if (this.callbacks.onTotalReroll) {
      this.callbacks.onTotalReroll();
    }
  }

  /**
   * Handle descend button click
   */
  handleDescend() {
    if (this.stateMachine.isLocked()) return;
    if (this.callbacks.onDescend) {
      this.callbacks.onDescend();
    }
  }

  /**
   * Show title with fade-in animation
   * Per GDD §9.2 Phase E
   */
  showTitle() {
    this.titleArea.classList.remove('hidden');
    this.titleArea.classList.add('fade-in');
  }

  /**
   * Lock/unlock popover when UI state changes
   * Per GDD §3.4: Freeze and fade to 60% when locked
   * @param {boolean} locked
   */
  setPopoverLocked(locked) {
    if (locked) {
      if (this.popoverOpen) {
        this.popover.classList.add('locked');
      }
    } else {
      this.popover.classList.remove('locked');
    }
  }

  /**
   * Trigger memory flicker on Fallen portraits
   * Per GDD §12: Every 20-30 seconds
   */
  triggerMemoryFlicker() {
    const portraits = this.fallenPortraitsRow.querySelectorAll('.fallen-portrait-inner');
    portraits.forEach((portrait, index) => {
      setTimeout(() => {
        portrait.classList.add('flickering');

        // Trigger shimmer during flicker
        const shimmer = portrait.querySelector('.fallen-shimmer');
        if (shimmer) {
          setTimeout(() => {
            shimmer.classList.add('active');
            setTimeout(() => shimmer.classList.remove('active'), 200);
          }, 300); // Shimmer partway through flicker
        }

        setTimeout(() => portrait.classList.remove('flickering'), 2000);
      }, index * 100); // Slight stagger
    });
  }

  /**
   * Start memory flicker timer
   * Per GDD §12: Randomized 20-30 second interval
   */
  startMemoryFlicker() {
    const scheduleNext = () => {
      const delay = 20000 + Math.random() * 10000; // 20-30 seconds
      setTimeout(() => {
        this.triggerMemoryFlicker();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  /**
   * Destroy and clean up
   */
  destroy() {
    clearTimeout(this.hoverOpenTimer);
    clearTimeout(this.hoverCloseTimer);

    // Cleanup selection effect
    if (this.selectionEffect) {
      this.selectionEffect.stop();
      this.selectionEffect = null;
    }

    console.log('[RosterUI] Destroyed');
  }
}
