/**
 * Anchor Mapping - DOMRect to NDC Conversion
 *
 * Maps UI element positions (DOMRects) to Normalized Device Coordinates
 * for Three.js layer synchronization during cinematic morph.
 */

/**
 * Convert DOMRect to Normalized Device Coordinates (NDC)
 * NDC: x and y range from -1 to +1, where:
 * - (-1, -1) is bottom-left
 * - (+1, +1) is top-right
 * - (0, 0) is center
 *
 * @param {DOMRect} rect - The bounding rectangle of the element
 * @param {number} viewportWidth - Window inner width
 * @param {number} viewportHeight - Window inner height
 * @returns {THREE.Vector3} - Position in NDC space
 */
export function domRectToNDC(rect, viewportWidth, viewportHeight) {
  if (!rect) {
    return { x: 0, y: 0, z: 0 };
  }

  // Get center of the rect
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // Convert to NDC
  // X: 0 (left) -> -1, viewportWidth (right) -> +1
  const ndcX = (centerX / viewportWidth) * 2 - 1;

  // Y: 0 (top) -> +1, viewportHeight (bottom) -> -1
  // Note: DOM Y is inverted vs NDC Y
  const ndcY = -((centerY / viewportHeight) * 2 - 1);

  return {
    x: ndcX,
    y: ndcY,
    z: 0
  };
}

/**
 * Freeze layout measurements at cinematic start
 * Captures DOMRects once and reuses them for the entire morph sequence
 *
 * @param {HTMLElement[]} livingCardElements - Array of 3 Living card elements
 * @param {HTMLElement[]} fallenElements - Array of 3 Fallen portrait elements
 * @returns {Object} - Frozen anchor measurements
 */
export function freezeLayoutMeasurements(livingCardElements, fallenElements) {
  const living = [];
  const fallen = [];

  // Capture Living card rects
  if (livingCardElements) {
    for (let i = 0; i < Math.min(3, livingCardElements.length); i++) {
      const el = livingCardElements[i];
      if (el) {
        living.push(el.getBoundingClientRect());
      } else {
        living.push(null);
      }
    }
  }

  // Capture Fallen portrait rects
  if (fallenElements) {
    for (let i = 0; i < Math.min(3, fallenElements.length); i++) {
      const el = fallenElements[i];
      if (el) {
        fallen.push(el.getBoundingClientRect());
      } else {
        fallen.push(null);
      }
    }
  }

  const measurements = {
    living,
    fallen,
    capturedAt: performance.now(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };

  console.log('[Anchor Mapping] Frozen measurements:', measurements);

  return measurements;
}

/**
 * Update node positions to match UI anchors
 * Called each frame during morph phase
 *
 * @param {Object} uniforms - Three.js uniforms object
 * @param {Object} frozenAnchors - Frozen anchor measurements
 * @param {number} morphProgress - Morph progress (0 to 1)
 */
export function updateNodePositionsToAnchors(uniforms, frozenAnchors, morphProgress) {
  if (!uniforms || !frozenAnchors) return;

  const { viewport } = frozenAnchors;

  // Ease function for smooth morphing
  const eased = morphProgress < 0.5
    ? 2 * morphProgress * morphProgress
    : 1 - Math.pow(-2 * morphProgress + 2, 2) / 2;

  // Update Living nodes (indices 3-5 in uniforms)
  for (let i = 0; i < 3; i++) {
    const rect = frozenAnchors.living[i];
    if (rect) {
      const ndc = domRectToNDC(rect, viewport.width, viewport.height);
      const nodeIndex = i + 3; // Living nodes are 3-5

      // Lerp from current position to target
      const current = uniforms.uNodePos.value[nodeIndex];
      current.x += (ndc.x - current.x) * eased;
      current.y += (ndc.y - current.y) * eased;
      current.z += (ndc.z - current.z) * eased;
    }
  }

  // Update Fallen nodes (indices 0-2 in uniforms)
  for (let i = 0; i < 3; i++) {
    const rect = frozenAnchors.fallen[i];
    if (rect) {
      const ndc = domRectToNDC(rect, viewport.width, viewport.height);

      // Lerp from current position to target
      const current = uniforms.uNodePos.value[i];
      current.x += (ndc.x - current.x) * eased;
      current.y += (ndc.y - current.y) * eased;
      current.z += (ndc.z - current.z) * eased;
    }
  }
}

/**
 * Get anchor position in NDC for a specific card/portrait
 *
 * @param {Object} frozenAnchors - Frozen anchor measurements
 * @param {string} type - 'living' or 'fallen'
 * @param {number} index - Index (0-2)
 * @returns {Object} - NDC position {x, y, z}
 */
export function getAnchorNDC(frozenAnchors, type, index) {
  if (!frozenAnchors || !frozenAnchors[type] || !frozenAnchors[type][index]) {
    return { x: 0, y: 0, z: 0 };
  }

  const rect = frozenAnchors[type][index];
  const { viewport } = frozenAnchors;

  return domRectToNDC(rect, viewport.width, viewport.height);
}
