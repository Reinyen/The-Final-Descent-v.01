import { characters } from '../roster/data/characters.js';
import { GlassSurface } from './fx/GlassSurface.js';
import { CardHoverController } from './ui/CardHoverController.js';

const POPUP_WIDTH = 360;

function createCard(char) {
  const card = document.createElement('button');
  card.className = 'cc-card';
  card.type = 'button';
  card.dataset.id = char.id;

  const canvas = document.createElement('canvas');
  canvas.className = 'cc-fx';
  canvas.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'cc-content';
  const nameEl = document.createElement('div');
  nameEl.className = 'cc-name';
  nameEl.textContent = char.name.toUpperCase();
  const roleEl = document.createElement('div');
  roleEl.className = 'cc-role';
  roleEl.textContent = char.role.toUpperCase();
  content.append(nameEl, roleEl);

  card.append(canvas, content);
  return { card, canvas };
}

function createAbilityRow(ability) {
  const abilityEl = document.createElement('div');
  abilityEl.className = 'cc-ability';

  const row = document.createElement('div');
  row.className = 'row';

  const name = document.createElement('div');
  name.className = 'n';
  name.textContent = ability.name;

  const cost = document.createElement('div');
  cost.className = 'c';
  const costValue = document.createElement('div');
  costValue.className = 'c-val';
  costValue.textContent = ability.sp;
  const costLabel = document.createElement('div');
  costLabel.className = 'c-label';
  costLabel.textContent = 'SP';
  cost.append(costValue, costLabel);

  row.append(name, cost);

  const desc = document.createElement('div');
  desc.className = 'd';
  desc.textContent = ability.desc;

  abilityEl.append(row, desc);
  return abilityEl;
}

function createPopup(char) {
  const popup = document.createElement('div');
  popup.className = 'cc-popup';
  popup.setAttribute('role', 'tooltip');
  popup.setAttribute('aria-hidden', 'true');

  const canvas = document.createElement('canvas');
  canvas.className = 'cc-popup-fx';
  canvas.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'cc-popup-body';

  const title = document.createElement('div');
  title.className = 'cc-popup-title';
  const name = document.createElement('div');
  name.className = 'cc-popup-name';
  name.textContent = char.name.toUpperCase();
  const role = document.createElement('div');
  role.className = 'cc-popup-role';
  role.textContent = char.role.toUpperCase();
  title.append(name, role);

  const divider1 = document.createElement('div');
  divider1.className = 'cc-divider';

  const stats = document.createElement('div');
  stats.className = 'cc-stats';
  const statKeys = [
    { key: 'HP', value: char.stats.hp, cls: 'hp' },
    { key: 'CON', value: char.stats.con, cls: 'con' },
    { key: 'SPD', value: char.stats.spd, cls: 'spd' }
  ];
  statKeys.forEach(({ key, value, cls }) => {
    const stat = document.createElement('div');
    stat.className = 'cc-stat';
    const k = document.createElement('div');
    k.className = 'k';
    k.textContent = key;
    const v = document.createElement('div');
    v.className = `v ${cls}`;
    v.textContent = value;
    stat.append(k, v);
    stats.append(stat);
  });

  const divider2 = document.createElement('div');
  divider2.className = 'cc-divider';

  const abilities = document.createElement('div');
  abilities.className = 'cc-abilities';
  const abilitiesHeader = document.createElement('div');
  abilitiesHeader.className = 'cc-abilities-h';
  abilitiesHeader.textContent = 'ABILITIES';
  abilities.append(abilitiesHeader);

  char.abilities.forEach((ability) => {
    abilities.append(createAbilityRow(ability));
  });

  body.append(title, divider1, stats, divider2, abilities);
  popup.append(canvas, body);
  return { popup, canvas };
}

function buildRoster() {
  const cardsWrapper = document.getElementById('cc-grid');
  const popupLayer = document.getElementById('cc-popup-layer');

  const entries = characters.map((char) => {
    const { card, canvas: cardCanvas } = createCard(char);
    const { popup, canvas: popupCanvas } = createPopup(char);

    cardsWrapper.appendChild(card);
    popupLayer.appendChild(popup);

    const cardSurface = new GlassSurface(cardCanvas, { tint: 0x7bc3ff });
    const popupSurface = new GlassSurface(popupCanvas, { tint: 0x9cd0ff, rippleAmp: 0.02 });
    popupSurface.setVisibility(false);

    const pointerToUv = (el, event) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) };
    };

    card.addEventListener('pointermove', (event) => {
      const { x, y } = pointerToUv(card, event);
      cardSurface.setHover({ x, y });
    });
    card.addEventListener('pointerenter', (event) => {
      const { x, y } = pointerToUv(card, event);
      cardSurface.setHover({ x, y });
      cardSurface.setHoverActive(true);
    });
    card.addEventListener('pointerleave', () => {
      cardSurface.setHoverActive(false);
    });

    popup.addEventListener('pointermove', (event) => {
      const { x, y } = pointerToUv(popup, event);
      popupSurface.setHover({ x, y });
    });
    popup.addEventListener('pointerenter', (event) => {
      const { x, y } = pointerToUv(popup, event);
      popupSurface.setHover({ x, y });
      popupSurface.setHoverActive(true);
    });
    popup.addEventListener('pointerleave', () => {
      popupSurface.setHoverActive(false);
    });

    return {
      card,
      popup,
      onOpen: () => {
        popupSurface.setVisibility(true);
        popupSurface.setHoverActive(true);
        popup.style.width = `${POPUP_WIDTH}px`;
      },
      onClose: () => {
        popupSurface.setVisibility(false);
        popupSurface.setHoverActive(false);
      }
    };
  });

  new CardHoverController(entries);
}

document.addEventListener('DOMContentLoaded', () => {
  buildRoster();
});
