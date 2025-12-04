export function renderLivingCard(cardEl, data, visible = true) {
  cardEl.name.textContent = data?.name ?? '';
  cardEl.role.textContent = data?.role ?? '';
  cardEl.button.dataset.id = data?.id ?? '';
  cardEl.button.style.opacity = visible ? '1' : '0';
  cardEl.button.style.transform = visible ? 'translateY(0)' : 'translateY(12px)';
}

export function renderFallenPlaque(plaqueEl, data, visible = true) {
  plaqueEl.name.textContent = data?.name ?? '';
  plaqueEl.wrapper.dataset.id = data?.id ?? '';
  plaqueEl.wrapper.style.opacity = visible ? '1' : '0';
  plaqueEl.wrapper.style.transform = visible ? 'translateY(0)' : 'translateY(12px)';
}

export function renderPopover(popover, character) {
  if (!character) return;
  popover.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'popover-header';
  const title = document.createElement('div');
  title.textContent = character.name;
  const role = document.createElement('div');
  role.className = 'popover-role';
  role.textContent = character.role;
  header.appendChild(title);
  header.appendChild(role);

  const divider1 = document.createElement('div');
  divider1.className = 'popover-divider';

  const statsRow = document.createElement('div');
  statsRow.className = 'popover-stats';
  ['hp', 'con', 'spd'].forEach((statKey) => {
    const block = document.createElement('div');
    block.className = 'stat-block';
    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = statKey.toUpperCase();
    const val = document.createElement('div');
    val.className = 'stat-value';
    val.textContent = character.stats[statKey];
    block.appendChild(label);
    block.appendChild(val);
    statsRow.appendChild(block);
  });

  const divider2 = document.createElement('div');
  divider2.className = 'popover-divider';

  const abilitiesTitle = document.createElement('div');
  abilitiesTitle.className = 'popover-abilities-title';
  abilitiesTitle.textContent = 'Abilities';

  const abilityRows = character.abilities.map((ab) => {
    const row = document.createElement('div');
    row.className = 'ability-row';
    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'ability-name';
    name.textContent = ab.name;
    const desc = document.createElement('div');
    desc.className = 'ability-desc';
    desc.textContent = ab.desc;
    left.appendChild(name);
    left.appendChild(desc);
    const sp = document.createElement('div');
    sp.className = 'ability-sp';
    sp.textContent = `${ab.sp} SP`;
    row.appendChild(left);
    row.appendChild(sp);
    return row;
  });

  popover.appendChild(header);
  popover.appendChild(divider1);
  popover.appendChild(statsRow);
  popover.appendChild(divider2);
  popover.appendChild(abilitiesTitle);
  abilityRows.forEach((row) => popover.appendChild(row));
}
