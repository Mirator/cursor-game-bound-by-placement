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

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = card.name;

    const desc = document.createElement("div");
    desc.className = "card-desc";
    desc.textContent = card.description;

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


