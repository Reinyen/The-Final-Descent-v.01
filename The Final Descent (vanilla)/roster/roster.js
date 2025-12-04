import { characters } from './data/characters.js';
import { createDOM, createLivingCard, createFallenPlaque } from './ui/dom.js';
import { renderLivingCard, renderFallenPlaque, renderPopover } from './ui/renderText.js';
import { applyResponsiveScaling, placePopover } from './ui/layout.js';
import { attachInteractions, updateButtonStates } from './ui/interactions.js';
import { initFx } from './fx/fxRoot.js';
import { startTimeline } from './timeline/timeline.js';

const root = document.getElementById('rosterRoot');
const dom = createDOM(root);

const state = {
  roster: characters,
  livingIds: [],
  fallenIds: [],
  selectedLivingId: null,
  hoveredLivingId: null,
  rerollsRemaining: 3,
  uiLocked: true,
  lastFallenFlickerAt: 0
};

const fx = initFx(dom.canvas);

const livingCards = [createLivingCard(), createLivingCard(), createLivingCard()];
const fallenPlaques = [createFallenPlaque(), createFallenPlaque(), createFallenPlaque()];

livingCards.forEach((card) => dom.livingRow.appendChild(card.button));
fallenPlaques.forEach((plaque) => dom.fallenRow.appendChild(plaque.wrapper));

function pickInitial() {
  const ids = [...state.roster.map((c) => c.id)];
  shuffle(ids);
  state.livingIds = ids.slice(0, 3);
  state.fallenIds = ids.slice(3);
  state.rerollsRemaining = 3;
  state.selectedLivingId = null;
  state.hoveredLivingId = null;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderAll() {
  const living = state.livingIds.map((id) => state.roster.find((c) => c.id === id));
  livingCards.forEach((card, idx) => {
    renderLivingCard(card, living[idx], !state.uiLocked || state.rerollsRemaining === 3);
    card.button.classList.toggle('isSelected', living[idx]?.id === state.selectedLivingId);
  });
  const fallen = state.fallenIds.map((id) => state.roster.find((c) => c.id === id));
  fallenPlaques.forEach((plaque, idx) => {
    renderFallenPlaque(plaque, fallen[idx], true);
  });
  updateButtonStates(state, {
    single: dom.singleRerollBtn,
    total: dom.totalRerollBtn,
    confirm: dom.confirmBtn
  });
  updatePips();
}

function updatePips() {
  Array.from(dom.rerollPips.children).forEach((pip, i) => {
    pip.classList.toggle('is-empty', i >= state.rerollsRemaining);
  });
}

function spendPips(count) {
  for (let i = 0; i < count; i += 1) {
    const pipIndex = Math.max(0, state.rerollsRemaining - 1 - i);
    const pip = dom.rerollPips.children[pipIndex];
    if (pip) crumblePip(pip);
  }
}

function crumblePip(pip) {
  for (let i = 0; i < 26; i += 1) {
    const frag = document.createElement('div');
    frag.className = 'reroll-frag';
    const dx = (Math.random() - 0.5) * 36;
    const dy = Math.random() * 40;
    frag.style.setProperty('--dx', `${dx}px`);
    frag.style.setProperty('--dy', `${dy}px`);
    frag.style.left = `${8 + dx * 0.2}px`;
    frag.style.top = `${8}px`;
    pip.appendChild(frag);
    setTimeout(() => frag.remove(), 620);
  }
}

function syncNodeFlags() {
  fx.nodes.setAlive([0, 1, 2], [3, 4, 5]);
}

function totalReroll() {
  if (state.rerollsRemaining < 1 || state.uiLocked) return;
  state.uiLocked = true;
  dom.hoverPopover.classList.remove('is-visible');
  const rects = livingCards.map((c) => c.button.getBoundingClientRect());
  fx.rerollFx.startTotal(rects, () => {
    spendPips(1);
    state.rerollsRemaining -= 1;
    const ids = [...state.roster.map((c) => c.id)];
    shuffle(ids);
    state.livingIds = ids.slice(0, 3);
    state.fallenIds = ids.slice(3);
    state.selectedLivingId = null;
    state.hoveredLivingId = null;
    syncNodeFlags();
    renderAll();
  }, () => {
    state.uiLocked = false;
    renderAll();
  });
}

function singleReroll() {
  if (!state.selectedLivingId || state.rerollsRemaining < 2 || state.uiLocked) return;
  state.uiLocked = true;
  dom.hoverPopover.classList.remove('is-visible');
  const cardIndex = state.livingIds.findIndex((id) => id === state.selectedLivingId);
  const rect = livingCards[cardIndex].button.getBoundingClientRect();
  fx.rerollFx.startSingle(rect, () => {
    spendPips(2);
    state.rerollsRemaining -= 2;
    const candidates = state.roster.map((c) => c.id).filter((id) => !state.livingIds.includes(id));
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    state.livingIds[cardIndex] = picked;
    state.fallenIds = state.roster.map((c) => c.id).filter((id) => !state.livingIds.includes(id));
    syncNodeFlags();
    renderAll();
  }, () => {
    state.uiLocked = false;
    renderAll();
  });
}

function showPopover(id) {
  const data = state.roster.find((c) => c.id === id);
  renderPopover(dom.hoverPopover, data);
  dom.hoverPopover.classList.add('is-visible');
  const card = livingCards[state.livingIds.findIndex((l) => l === id)];
  if (card) {
    const rect = card.button.getBoundingClientRect();
    placePopover(dom.hoverPopover, rect, { width: window.innerWidth, height: window.innerHeight });
  }
}

function hidePopover() {
  dom.hoverPopover.classList.remove('is-visible');
}

function setUILocked(v) {
  state.uiLocked = v;
  updateButtonStates(state, {
    single: dom.singleRerollBtn,
    total: dom.totalRerollBtn,
    confirm: dom.confirmBtn
  });
}

function revealUI() {
  dom.overlay.style.opacity = 1;
  dom.titleZone.style.opacity = 1;
  dom.rerollPanel.style.opacity = 1;
  dom.actionPanel.style.opacity = 1;
}

function fallenFlickerLoop() {
  const now = performance.now();
  if (state.uiLocked) {
    requestAnimationFrame(fallenFlickerLoop);
    return;
  }
  if (now - state.lastFallenFlickerAt > 20000 + Math.random() * 10000) {
    state.lastFallenFlickerAt = now;
    fallenPlaques.forEach((p) => {
      p.surface.classList.add('memory-flicker');
      setTimeout(() => p.surface.classList.remove('memory-flicker'), 1000);
    });
  }
  requestAnimationFrame(fallenFlickerLoop);
}

function applySelectionVisual(id) {
  livingCards.forEach((card) => {
    card.button.classList.toggle('isSelected', card.button.dataset.id === id);
  });
}

function onHover(id) {
  const idx = state.livingIds.findIndex((l) => l === id);
  if (idx >= 0) {
    const pos = fx.nodes.positions[idx];
    fx.uniforms.uHoverCardPos.value.set(pos[0], pos[1]);
  }
}

function onHoverEnd() {
  fx.uniforms.uHoverCardPos.value.set(-1, -1);
}

function lockPopover() {
  dom.hoverPopover.classList.remove('is-visible');
}

function unlockPopover() {
  if (state.hoveredLivingId) showPopover(state.hoveredLivingId);
}

function setupInteractions() {
  attachInteractions({
    state,
    livingCards,
    hoverPopover: dom.hoverPopover,
    rerollButtons: {
      single: dom.singleRerollBtn,
      total: dom.totalRerollBtn,
      confirm: dom.confirmBtn
    },
    onSelect: (id) => {
      state.selectedLivingId = id;
      applySelectionVisual(id);
      updateButtonStates(state, {
        single: dom.singleRerollBtn,
        total: dom.totalRerollBtn,
        confirm: dom.confirmBtn
      });
    },
    onHover,
    onHoverEnd,
    onSingleReroll: singleReroll,
    onTotalReroll: totalReroll,
    lockPopover,
    unlockPopover
  });
}

function init() {
  pickInitial();
  syncNodeFlags();
  renderAll();
  setupInteractions();
  applyResponsiveScaling(dom.livingRow, dom.livingZone);
  startTimeline({
    fx,
    overlay: dom.overlay,
    livingCards,
    fallenPlaques,
    setUILocked,
    markPhase: () => {},
    revealUI
  });
  window.addEventListener('resize', () => applyResponsiveScaling(dom.livingRow, dom.livingZone));
  requestAnimationFrame(fallenFlickerLoop);
}

init();
