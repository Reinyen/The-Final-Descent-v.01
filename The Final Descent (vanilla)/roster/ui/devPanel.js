/**
 * Dev Panel - Shows current state for debugging/QA
 * Enable with ?dev query parameter
 */

/**
 * Create and attach dev panel to the page
 */
export function createDevPanel(store) {
  // Check if dev mode is enabled via query param
  const urlParams = new URLSearchParams(window.location.search);
  const devEnabled = urlParams.has('dev');

  if (!devEnabled) {
    return null;
  }

  store.setDevPanel(true);

  // Create panel element
  const panel = document.createElement('div');
  panel.id = 'devPanel';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: #0f0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 12px;
    border: 1px solid #0f0;
    border-radius: 4px;
    z-index: 10000;
    min-width: 280px;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0, 255, 0, 0.3);
    pointer-events: auto;
  `;

  document.body.appendChild(panel);

  /**
   * Update panel content
   */
  function update() {
    const summary = store.getStateSummary();
    const state = store.getState();

    panel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #0ff; border-bottom: 1px solid #0f0; padding-bottom: 4px;">
        🔧 ROSTER DEV PANEL
      </div>
      <div style="line-height: 1.6;">
        <div><strong>State:</strong> <span style="color: ${state.uiLocked ? '#f00' : '#0f0'}">${summary.state}</span></div>
        <div><strong>UI Locked:</strong> <span style="color: ${state.uiLocked ? '#f00' : '#0f0'}">${summary.locked ? '🔒 YES' : '✓ NO'}</span></div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <div><strong>Living:</strong> ${summary.living || 'none'}</div>
          <div><strong>Fallen:</strong> ${summary.fallen || 'none'}</div>
        </div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <div><strong>Selected:</strong> ${summary.selected}</div>
          <div><strong>Hovered:</strong> ${summary.hovered}</div>
        </div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <div><strong>Rerolls:</strong> ${'⭐'.repeat(summary.rerolls)}${'☆'.repeat(3 - summary.rerolls)} (${summary.rerolls}/3)</div>
        </div>
        <div style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
          <div><strong>Popover:</strong> ${summary.popover}</div>
          <div><strong>Quality:</strong> ${summary.quality}</div>
        </div>
      </div>
    `;
  }

  // Update on state changes
  store.on('state:change', update);
  store.on('lock:change', update);

  // Update periodically to catch other changes
  setInterval(update, 500);

  // Initial update
  update();

  return panel;
}
