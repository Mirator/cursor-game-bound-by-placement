import { getNextUpgrade, buyNextUpgrade } from "../systems/upgradeSystem.js";

let panelEl;
let listEl;
let titleEl;
let currentTower = null;
let onAnyChange = null;

export function initUpgradePanel(onChange) {
  panelEl = document.getElementById("upgrade-panel");
  listEl = document.getElementById("upgrade-list");
  titleEl = document.getElementById("upgrade-title");
  onAnyChange = onChange;
}

export function showUpgradePanel(gameState, tower) {
  if (!panelEl || !listEl || !titleEl) return;

  currentTower = tower;
  listEl.innerHTML = "";

  titleEl.textContent = `Tower Upgrades (${tower.unlockedPath})`;

  const next = getNextUpgrade(tower);
  if (!next) {
    const info = document.createElement("div");
    info.textContent = "No more upgrades available.";
    listEl.appendChild(info);
  } else {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "upgrade-button";
    btn.textContent = `${next.name} — Cost: ${next.cost} gold`;
    if (gameState.gold < next.cost) {
      btn.classList.add("disabled");
    } else {
      btn.addEventListener("click", () => {
        const result = buyNextUpgrade(gameState, tower);
        if (!result.ok) return;
        if (onAnyChange) onAnyChange();
        hideUpgradePanel();
      });
    }
    listEl.appendChild(btn);
  }

  panelEl.classList.remove("hidden");
}

export function hideUpgradePanel() {
  if (!panelEl) return;
  panelEl.classList.add("hidden");
  currentTower = null;
}


