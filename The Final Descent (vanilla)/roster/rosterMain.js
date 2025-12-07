/**
 * Roster Selection - Main Integration
 *
 * Integrates all modules:
 * - Core: Deterministic roster selection + state machine
 * - UI: Living cards, Fallen portraits, popover, reroll UI, confirm
 * - FX: Three.js layer with cinematic and reroll effects
 */

import { characters } from './data/characters.js';
import { initSelection } from './core/rosterSelection.js';
import { createRosterStore, States, EventTypes } from './core/rosterStore.js';
import { createDevPanel } from './ui/devPanel.js';
import { setupLivingScroll, setupCardSelection, setupCardHover, createLivingCardElement, renderLivingCard, applyResponsiveScaling } from './ui/livingCards.js';
import { createPopoverController } from './ui/popover.js';
import { createFallenPortrait, renderFallenPortrait, setupMemoryFlicker, applyOverlapPositioning } from './ui/fallenPortraits.js';
import { createRerollStars, updateStarVisuals, setupRerollButtons } from './ui/rerollUI.js';
import { setupConfirmButton, setupFallenAssignmentHooks, initializeIntegrationAPI } from './ui/confirmAction.js';
import { initFx } from './fx/fxRoot.js';
import { createCinematicController } from './fx/cinematicController.js';
import { createRerollVFXController } from './fx/rerollVFXController.js';

/**
 * Main initialization
 */
export async function initializeRosterSelection(config = {}) {
  console.log('[Roster Selection] Initializing...');

  // Configuration
  const {
    rosterSeed = Date.now(),
    rootElement = document.getElementById('rosterRoot'),
    enableDevPanel = new URLSearchParams(window.location.search).has('dev')
  } = config;

  // Initialize integration API
  initializeIntegrationAPI();

  // Create store
  const store = createRosterStore();

  // Initialize deterministic selection
  const selectionResult = initSelection({
    rosterSeed,
    characters
  });

  console.log('[Roster Selection] Initial selection:', selectionResult);

  // Initialize store with selection result
  store.initRoster({
    ...selectionResult,
    rosterSeed,
    characters
  });

  // Create DOM structure
  const dom = createDOMStructure(rootElement);

  // Initialize Three.js layer
  const fx = initFx(dom.canvas);

  // Create VFX controllers
  const cinematicController = createCinematicController(fx.uniforms, fx.renderer, store);
  const rerollVFXController = createRerollVFXController(fx.uniforms, fx.renderer, store);

  // Create Living cards
  const livingCardElements = [];
  for (let i = 0; i < 3; i++) {
    const card = createLivingCardElement();
    dom.livingRow.appendChild(card);
    livingCardElements.push(card);
  }

  // Create Fallen portraits
  const fallenPortraits = [];
  for (let i = 0; i < 3; i++) {
    const portrait = createFallenPortrait();
    dom.fallenRow.appendChild(portrait.wrapper);
    fallenPortraits.push(portrait);
  }

  // Apply overlap positioning to Fallen portraits
  applyOverlapPositioning(fallenPortraits.map(p => p.wrapper));

  // Create reroll stars
  const rerollStars = createRerollStars(dom.rerollPips);

  // Initialize popover controller
  const popoverController = createPopoverController(dom.popover, store);
  popoverController.attachToCards(livingCardElements, characters);

  // Setup Living cards interactions
  setupLivingScroll(dom.livingZone);
  setupCardSelection(livingCardElements, store);
  setupCardHover(livingCardElements, store);

  // Setup reroll buttons
  setupRerollButtons(
    {
      singleRerollBtn: dom.singleRerollBtn,
      totalRerollBtn: dom.totalRerollBtn,
      confirmBtn: dom.confirmBtn
    },
    rerollStars,
    store,
    selectionResult
  );

  // Setup confirm button
  setupConfirmButton(dom.confirmBtn, store);

  // Setup Fallen assignment hooks
  setupFallenAssignmentHooks(store);

  // Setup memory flicker for Fallen portraits
  setupMemoryFlicker(fallenPortraits, store);

  // Apply responsive scaling
  applyResponsiveScaling(dom.livingRow, dom.livingZone);
  window.addEventListener('resize', () => {
    applyResponsiveScaling(dom.livingRow, dom.livingZone);
  });

  // Render initial state
  renderAll();

  // Dev panel (if enabled)
  if (enableDevPanel) {
    createDevPanel(store);
  }

  // Wire up cinematic events
  store.on(EventTypes.CINEMATIC_START, ({ livingIds, fallenIds }) => {
    const livingElements = livingCardElements.map(card => card);
    const fallenElements = fallenPortraits.map(p => p.wrapper);
    cinematicController.start(livingIds, fallenIds, livingElements, fallenElements);
  });

  // Wire up reroll VFX events
  store.on(EventTypes.REROLL_SINGLE_START, ({ characterId, cardRect }) => {
    const currentState = store.getState();
    const cardIndex = currentState.livingIds.indexOf(characterId);
    if (cardIndex >= 0) {
      rerollVFXController.startSingle(cardRect, cardIndex, () => {
        // VFX complete - store will handle unlock in completeSingleReroll
      });
    }
  });

  store.on(EventTypes.REROLL_TOTAL_START, () => {
    rerollVFXController.startTotal(livingCardElements, () => {
      // VFX complete - store will handle unlock in completeTotalReroll
    });
  });

  // Start entry cinematic after short delay
  setTimeout(() => {
    store.startCinematic();
  }, 500);

  /**
   * Render all UI elements based on current store state
   */
  function renderAll() {
    const state = store.getState();

    // Render Living cards
    livingCardElements.forEach((card, index) => {
      const characterId = state.livingIds[index];
      const character = characters.find(c => c.id === characterId);
      if (character) {
        renderLivingCard(card, character);

        // Update selection visual
        if (characterId === state.selectedLivingId) {
          card.classList.add('isSelected');
        } else {
          card.classList.remove('isSelected');
        }
      }
    });

    // Render Fallen portraits
    fallenPortraits.forEach((portrait, index) => {
      const characterId = state.fallenIds[index];
      const character = characters.find(c => c.id === characterId);
      if (character) {
        renderFallenPortrait(portrait, character);
      }
    });

    // Update reroll stars
    updateStarVisuals(rerollStars, state.rerollsRemaining);
  }

  // Listen to state changes and re-render
  store.on('state:change', renderAll);

  console.log('[Roster Selection] Initialization complete');

  return {
    store,
    dom,
    fx,
    cinematicController,
    rerollVFXController,
    renderAll
  };
}

/**
 * Create DOM structure
 */
function createDOMStructure(root) {
  if (!root) {
    throw new Error('Root element not found');
  }

  root.innerHTML = '';

  // Canvas (Layer A - visual only)
  const canvas = document.createElement('canvas');
  canvas.id = 'fxCanvas';
  root.appendChild(canvas);

  // UI Overlay (Layer B - interactive)
  const overlay = document.createElement('div');
  overlay.id = 'uiOverlay';

  // Title Zone (Top 20%)
  const titleZone = document.createElement('div');
  titleZone.id = 'titleZone';
  const title = document.createElement('div');
  title.id = 'screenTitle';
  title.textContent = 'SELECT YOUR LIVING';
  titleZone.appendChild(title);

  // Living Zone (Middle 50%)
  const livingZone = document.createElement('div');
  livingZone.id = 'livingZone';
  const livingRow = document.createElement('div');
  livingRow.id = 'livingRow';
  livingZone.appendChild(livingRow);

  // Bottom Zone (Bottom 30%)
  const bottomZone = document.createElement('div');
  bottomZone.id = 'bottomZone';

  // Fallen row
  const fallenRow = document.createElement('div');
  fallenRow.id = 'fallenRow';

  // Reroll panel
  const rerollPanel = document.createElement('div');
  rerollPanel.id = 'rerollPanel';
  const rerollLabel = document.createElement('div');
  rerollLabel.id = 'rerollLabel';
  rerollLabel.textContent = 'Celestial Rerolls';
  const rerollPips = document.createElement('div');
  rerollPips.id = 'rerollPips';
  const singleRerollBtn = document.createElement('button');
  singleRerollBtn.id = 'singleRerollBtn';
  singleRerollBtn.textContent = 'Reroll Selected';
  const totalRerollBtn = document.createElement('button');
  totalRerollBtn.id = 'totalRerollBtn';
  totalRerollBtn.textContent = 'Reroll All';
  rerollPanel.appendChild(rerollLabel);
  rerollPanel.appendChild(rerollPips);
  rerollPanel.appendChild(singleRerollBtn);
  rerollPanel.appendChild(totalRerollBtn);

  // Action panel
  const actionPanel = document.createElement('div');
  actionPanel.id = 'actionPanel';
  const confirmBtn = document.createElement('button');
  confirmBtn.id = 'confirmBtn';
  confirmBtn.textContent = 'Confirm Selection';
  actionPanel.appendChild(confirmBtn);

  bottomZone.appendChild(fallenRow);
  bottomZone.appendChild(rerollPanel);
  bottomZone.appendChild(actionPanel);

  overlay.appendChild(titleZone);
  overlay.appendChild(livingZone);
  overlay.appendChild(bottomZone);

  // Popover layer
  const popoverLayer = document.createElement('div');
  popoverLayer.id = 'popoverLayer';
  const popover = document.createElement('div');
  popover.id = 'hoverPopover';
  popoverLayer.appendChild(popover);
  overlay.appendChild(popoverLayer);

  root.appendChild(overlay);

  return {
    canvas,
    overlay,
    titleZone,
    livingZone,
    livingRow,
    bottomZone,
    fallenRow,
    rerollPanel,
    rerollLabel,
    rerollPips,
    singleRerollBtn,
    totalRerollBtn,
    actionPanel,
    confirmBtn,
    popoverLayer,
    popover
  };
}

// Auto-initialize if this is the main entry point
if (import.meta.url === new URL(document.currentScript?.src || '', window.location.href).href) {
  document.addEventListener('DOMContentLoaded', () => {
    initializeRosterSelection();
  });
}
