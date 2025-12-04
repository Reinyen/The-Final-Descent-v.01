const OPEN_DELAY_MS = 110;
const CLOSE_DELAY_MS = 150;
const POPUP_MARGIN = 12;

export class CardHoverController {
  constructor(entries) {
    this.entries = entries;
    this.openTimer = null;
    this.closeTimer = null;
    this.currentEntry = null;
    this.pinnedEntry = null;

    this.bindEvents();
    this.bindGlobalHandlers();
  }

  bindEvents() {
    this.entries.forEach((entry) => {
      const { card, popup } = entry;

      card.addEventListener('pointerenter', () => this.scheduleOpen(entry));
      card.addEventListener('pointerleave', () => this.scheduleClose(entry));
      card.addEventListener('focus', () => this.open(entry));
      card.addEventListener('blur', () => this.scheduleClose(entry));
      card.addEventListener('click', () => this.togglePin(entry));

      popup.addEventListener('pointerenter', () => this.cancelClose());
      popup.addEventListener('pointerleave', () => this.scheduleClose(entry));
    });
  }

  bindGlobalHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePinned(true);
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (this.currentEntry && document.activeElement === this.currentEntry.card) {
          e.preventDefault();
          this.togglePin(this.currentEntry);
        }
      }
    });

    document.addEventListener('pointerdown', (e) => {
      if (!this.pinnedEntry) return;
      const { card, popup } = this.pinnedEntry;
      if (!card.contains(e.target) && !popup.contains(e.target)) {
        this.closePinned(true);
      }
    });
  }

  scheduleOpen(entry) {
    this.cancelClose();
    clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => this.open(entry), OPEN_DELAY_MS);
  }

  scheduleClose(entry) {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (this.pinnedEntry === entry) return;
      this.close(entry);
    }, CLOSE_DELAY_MS);
  }

  cancelClose() {
    clearTimeout(this.closeTimer);
  }

  open(entry) {
    if (this.pinnedEntry && this.pinnedEntry !== entry) {
      return;
    }
    if (this.currentEntry && this.currentEntry !== entry) {
      this.close(this.currentEntry, true);
    }

    this.currentEntry = entry;
    const { card, popup, onOpen } = entry;
    card.dataset.open = 'true';
    popup.setAttribute('data-open', 'true');
    popup.setAttribute('aria-hidden', 'false');
    this.positionPopup(entry);
    onOpen?.();
  }

  close(entry, force = false) {
    if (!entry) return;
    if (this.pinnedEntry && !force && entry === this.pinnedEntry) return;

    const { card, popup, onClose } = entry;
    delete card.dataset.open;
    popup.removeAttribute('data-open');
    popup.setAttribute('aria-hidden', 'true');
    if (this.currentEntry === entry) {
      this.currentEntry = null;
    }
    if (this.pinnedEntry === entry) {
      this.pinnedEntry = null;
    }
    onClose?.();
  }

  togglePin(entry) {
    if (this.pinnedEntry === entry) {
      this.close(entry, true);
      this.pinnedEntry = null;
      return;
    }

    this.open(entry);
    this.pinnedEntry = entry;
  }

  closePinned(force = false) {
    if (!this.pinnedEntry) return;
    this.close(this.pinnedEntry, force);
  }

  positionPopup(entry) {
    const { card, popup } = entry;
    const viewportWidth = window.innerWidth;
    const cardRect = card.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    const preferredLeft = cardRect.right + POPUP_MARGIN;
    let left = preferredLeft;
    if (preferredLeft + popupRect.width > viewportWidth - POPUP_MARGIN) {
      left = cardRect.left - popupRect.width - POPUP_MARGIN;
    }
    left = Math.max(POPUP_MARGIN, Math.min(left, viewportWidth - popupRect.width - POPUP_MARGIN));

    let top = cardRect.top;
    const maxTop = window.innerHeight - popupRect.height - POPUP_MARGIN;
    top = Math.min(Math.max(POPUP_MARGIN, top), Math.max(POPUP_MARGIN, maxTop));

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }
}
