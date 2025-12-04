export function createDOM(root) {
  root.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.id = 'fxCanvas';
  root.appendChild(canvas);

  const overlay = document.createElement('div');
  overlay.id = 'uiOverlay';
  root.appendChild(overlay);

  const titleZone = document.createElement('div');
  titleZone.id = 'titleZone';
  const title = document.createElement('div');
  title.id = 'screenTitle';
  title.textContent = 'CELESTIAL ROSTER';
  titleZone.appendChild(title);
  overlay.appendChild(titleZone);

  const livingZone = document.createElement('div');
  livingZone.id = 'livingZone';
  const livingRow = document.createElement('div');
  livingRow.id = 'livingRow';
  livingZone.appendChild(livingRow);
  overlay.appendChild(livingZone);

  const bottomZone = document.createElement('div');
  bottomZone.id = 'bottomZone';
  const fallenRow = document.createElement('div');
  fallenRow.id = 'fallenRow';
  bottomZone.appendChild(fallenRow);

  const actionsWrapper = document.createElement('div');
  actionsWrapper.style.display = 'flex';
  actionsWrapper.style.gap = '18px';

  const rerollPanel = document.createElement('div');
  rerollPanel.id = 'rerollPanel';
  const rerollLabel = document.createElement('div');
  rerollLabel.id = 'rerollLabel';
  rerollLabel.textContent = 'Celestial Rerolls';
  const rerollPips = document.createElement('div');
  rerollPips.id = 'rerollPips';
  for (let i = 0; i < 3; i += 1) {
    const pip = document.createElement('div');
    pip.className = 'reroll-pip';
    rerollPips.appendChild(pip);
  }
  rerollPanel.appendChild(rerollLabel);
  rerollPanel.appendChild(rerollPips);

  const actionPanel = document.createElement('div');
  actionPanel.id = 'actionPanel';
  const singleRerollBtn = document.createElement('button');
  singleRerollBtn.id = 'singleRerollBtn';
  singleRerollBtn.textContent = 'Single Reroll';
  const totalRerollBtn = document.createElement('button');
  totalRerollBtn.id = 'totalRerollBtn';
  totalRerollBtn.textContent = 'Total Reroll';
  const confirmBtn = document.createElement('button');
  confirmBtn.id = 'confirmBtn';
  confirmBtn.textContent = 'Confirm';
  actionPanel.appendChild(singleRerollBtn);
  actionPanel.appendChild(totalRerollBtn);
  actionPanel.appendChild(confirmBtn);

  actionsWrapper.appendChild(rerollPanel);
  actionsWrapper.appendChild(actionPanel);
  bottomZone.appendChild(actionsWrapper);

  overlay.appendChild(bottomZone);

  const popLayer = document.createElement('div');
  popLayer.id = 'popoverLayer';
  const hoverPopover = document.createElement('div');
  hoverPopover.id = 'hoverPopover';
  popLayer.appendChild(hoverPopover);
  overlay.appendChild(popLayer);

  return {
    canvas,
    overlay,
    titleZone,
    livingZone,
    livingRow,
    bottomZone,
    fallenRow,
    rerollPanel,
    rerollPips,
    actionPanel,
    singleRerollBtn,
    totalRerollBtn,
    confirmBtn,
    hoverPopover,
    popLayer
  };
}

export function createLivingCard() {
  const button = document.createElement('button');
  button.className = 'livingCard';

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
  return { button, surface, text, name, role, mark };
}

export function createFallenPlaque() {
  const wrapper = document.createElement('div');
  wrapper.className = 'fallenPlaque';
  const surface = document.createElement('div');
  surface.className = 'plaqueSurface';
  const name = document.createElement('div');
  name.className = 'plaqueName';
  const state = document.createElement('div');
  state.className = 'plaqueState';
  state.textContent = 'FALLEN';
  wrapper.appendChild(surface);
  wrapper.appendChild(name);
  wrapper.appendChild(state);
  return { wrapper, surface, name, state };
}
