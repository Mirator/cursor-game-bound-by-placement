let panelEl;
let listEl;
let currentHandler = null;

export function initCardPanel() {
  panelEl = document.getElementById("card-panel");
  listEl = document.getElementById("card-list");
}

export function showCardChoices(cards, onChoose) {
  if (!panelEl || !listEl) return;
  currentHandler = onChoose;
  listEl.innerHTML = "";

  cards.forEach((card) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-button";

    const icon = document.createElement("div");
    icon.className = "card-icon";

    // Add a simple visual tile preview based on card id
    if (card.id === "road_straight") {
      icon.classList.add("card-icon-road-straight");
    } else if (card.id === "road_turn_small") {
      icon.classList.add("card-icon-road-turn-small");
    } else if (card.id === "road_turn_long") {
      icon.classList.add("card-icon-road-turn-long");
    } else if (card.id === "terrain_hill") {
      icon.classList.add("card-icon-terrain-hill");
    } else if (card.id === "tower_arrow") {
      icon.classList.add("card-icon-tower-arrow");
    }

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = card.name;

    const desc = document.createElement("div");
    desc.className = "card-desc";
    desc.textContent = card.description;

    btn.appendChild(icon);
    btn.appendChild(title);
    btn.appendChild(desc);

    btn.addEventListener("click", () => {
      if (currentHandler) {
        currentHandler(card);
      }
    });

    listEl.appendChild(btn);
  });

  panelEl.classList.remove("hidden");
}

export function hideCardPanel() {
  if (!panelEl) return;
  panelEl.classList.add("hidden");
  currentHandler = null;
}


