export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function placePopover(popover, cardRect, viewport) {
  const width = popover.offsetWidth || 360;
  const height = popover.offsetHeight || 240;
  let left = cardRect.right + 14;
  if (left + width > viewport.width - 12) {
    left = cardRect.left - 14 - width;
  }
  let top = clamp(cardRect.top, 12, viewport.height - 12 - height);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  return { left, top };
}

export function applyResponsiveScaling(livingRow, container) {
  const totalWidth = livingRow.scrollWidth;
  const containerWidth = container.clientWidth - 2 * 28;
  const needed = totalWidth + 2 * 18;
  let scale = 1;
  if (needed > containerWidth) {
    scale = Math.max(0.85, containerWidth / needed);
  }
  livingRow.style.transform = `scale(${scale})`;
  if (scale <= 0.86 && needed * scale > containerWidth) {
    livingRow.style.overflowX = 'auto';
  } else {
    livingRow.style.overflowX = 'visible';
  }
}
