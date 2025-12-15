import { createInitialGrid, TILE_TYPES } from "../map/grid.js";
import { createInitialGameState } from "../core/gameState.js";
import { drawGrid } from "../render/gridRenderer.js";
import { tryPlaceRoad, canPlaceTerrain } from "../map/placement.js";
import { setupWaveSystem, startNextWave, updateWaveSystem } from "../systems/waveSystem.js";
import { setupCombatSystem, tryPlaceArrowTower, updateCombatSystem } from "../systems/combatSystem.js";
import {
  syncEnemySprites,
  syncTowerSprites,
  syncProjectileSprites,
} from "../render/entityRenderer.js";
import { drawCardChoices, handleCardChosen } from "../systems/cardSystem.js";
import { initCardPanel, showCardChoices, hideCardPanel } from "../ui/cardPanel.js";
import { initUpgradePanel, showUpgradePanel, hideUpgradePanel } from "../ui/upgradePanel.js";

const CELL_SIZE = 48;
const GRID_COLS = 5;
const GRID_ROWS = 5;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.accumulator = 0;
    this.fixedStep = 1000 / 60; // 60 FPS logic
  }

  create() {
    // Core state
    this.grid = createInitialGrid(GRID_COLS, GRID_ROWS);
    this.gameState = createInitialGameState(this.grid);

    // Render grid centered
    const totalWidth = GRID_COLS * CELL_SIZE;
    const totalHeight = GRID_ROWS * CELL_SIZE;
    this.gridOriginX = (this.game.config.width - totalWidth) / 2;
    this.gridOriginY = (this.game.config.height - totalHeight) / 2;

    // Tile sprites map (using rectangle objects like entityRenderer)
    this.tileSprites = new Map();
    drawGrid(this, this.tileSprites, this.grid, {
      originX: this.gridOriginX,
      originY: this.gridOriginY,
      cellSize: CELL_SIZE,
    });

    // Enemy & tower sprites
    this.enemySprites = new Map();
    this.towerSprites = new Map();
    this.projectileSprites = new Map();

    // Wave & combat systems
    setupWaveSystem(this.gameState);
    setupCombatSystem(this.gameState);

    // UI
    initCardPanel();
    initUpgradePanel(() => {
      this.updateHud();
    });

    // Input: handle placement based on current phase/card
    this.input.on("pointerdown", (pointer) => {
      const cell = this.pointerToCell(pointer);
      if (!cell) return;
      this.handleGridClick(cell);
    });

    this.updateHud();
    this.updateHint();

    // Draw initial cards so player can start building
    const initialCards = drawCardChoices(this.gameState);
    showCardChoices(initialCards, (card) => {
      handleCardChosen(this.gameState, card);
      hideCardPanel();
      this.cardPanelVisible = false;
      this.updateHud();
      this.updateHint();
    });
    this.cardPanelVisible = true;

    // For now, start the first wave automatically once a valid full path exists.
    this.startedFirstWave = false;
  }

  pointerToCell(pointer) {
    const localX = pointer.x - this.gridOriginX;
    const localY = pointer.y - this.gridOriginY;
    if (localX < 0 || localY < 0) return null;
    const col = Math.floor(localX / CELL_SIZE);
    const row = Math.floor(localY / CELL_SIZE);
    if (col < 0 || row < 0 || col >= this.grid.cols || row >= this.grid.rows) {
      return null;
    }
    return { col, row };
  }

  update(time, delta) {
    this.accumulator += delta;
    while (this.accumulator >= this.fixedStep) {
      this.fixedUpdate(this.fixedStep / 1000);
      this.accumulator -= this.fixedStep;
    }
  }

  fixedUpdate(dt) {
    // Start first wave when we have a valid path
    if (!this.startedFirstWave && this.gameState.path.length >= 2) {
      startNextWave(this.gameState);
      this.startedFirstWave = true;
    }

    updateWaveSystem(this.gameState, dt);
    updateCombatSystem(this.gameState, dt);

    // Handle card phase UI
    if (this.gameState.phase === "card" && !this.cardPanelVisible) {
      const cards = drawCardChoices(this.gameState);
      showCardChoices(cards, (card) => {
        handleCardChosen(this.gameState, card);
        hideCardPanel();
        this.cardPanelVisible = false;
        this.updateHud();
        this.updateHint();
      });
      this.cardPanelVisible = true;
    } else if (this.gameState.phase !== "card" && this.cardPanelVisible) {
      hideCardPanel();
      this.cardPanelVisible = false;
    }

    syncEnemySprites(this, this.gameState, this.enemySprites, this.gridOriginX, this.gridOriginY, CELL_SIZE);
    syncTowerSprites(this, this.gameState, this.towerSprites, this.gridOriginX, this.gridOriginY, CELL_SIZE);
    syncProjectileSprites(
      this,
      this.gameState,
      this.projectileSprites,
      this.gridOriginX,
      this.gridOriginY,
      CELL_SIZE,
    );

    // End conditions
    if (this.gameState.baseHp <= 0 && this.gameState.phase !== "end") {
      this.gameState.phase = "end";
      this.showEndSummary(false);
    } else if (
      this.gameState.currentWave > 15 &&
      !this.gameState.waveState.active &&
      this.gameState.phase !== "end"
    ) {
      this.gameState.phase = "end";
      this.showEndSummary(true);
    }

    this.updateHud();
    this.updateHint();
  }

  handleGridClick(cell) {
    const { phase, cards } = this.gameState;

    // If there's a tower on this cell, always open upgrades (prioritize over placement)
    const towerHere = this.gameState.towers.find(
      (t) => t.col === cell.col && t.row === cell.row,
    );
    if (towerHere) {
      showUpgradePanel(this.gameState, towerHere);
      return;
    }

    if (phase !== "build" || !cards.pendingPlacement) {
      return;
    }

    const pending = cards.pendingPlacement;

    if (pending.kind === "road") {
      const result = tryPlaceRoad(this.gameState, cell, pending.roadType ?? TILE_TYPES.ROAD_STRAIGHT);
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.log("Invalid road placement:", result.reason);
        return;
      }
      drawGrid(this, this.tileSprites, this.grid, {
        originX: this.gridOriginX,
        originY: this.gridOriginY,
        cellSize: CELL_SIZE,
      });
    } else if (pending.kind === "tower") {
      const towerResult = tryPlaceArrowTower(this.gameState, cell);
      if (!towerResult.ok) {
        // eslint-disable-next-line no-console
        console.log("Cannot place tower:", towerResult.reason);
        return;
      }
      // Tower placed successfully - ensure it's visible immediately
      syncTowerSprites(this, this.gameState, this.towerSprites, this.gridOriginX, this.gridOriginY, CELL_SIZE);
      // eslint-disable-next-line no-console
      if (this.gameState.path.length < 2) {
        console.log("Tower placed! Build a path from left to right with road cards for enemies to spawn.");
      }
    } else if (pending.kind === "terrain") {
      const can = canPlaceTerrain(this.gameState, cell);
      if (!can.ok) {
        // eslint-disable-next-line no-console
        console.log("Cannot place terrain:", can.reason);
        return;
      }
      // eslint-disable-next-line no-param-reassign
      this.grid.tiles[cell.row][cell.col].type = pending.terrainType ?? TILE_TYPES.HILL;
      drawGrid(this, this.tileSprites, this.grid, {
        originX: this.gridOriginX,
        originY: this.gridOriginY,
        cellSize: CELL_SIZE,
      });
    }

    // Placement consumed the card
    this.gameState.cards.pendingPlacement = null;
    hideUpgradePanel();
    this.updateHint();
    
    // After placing a card, transition to card phase if not in a wave
    // This allows the player to select another card to continue building
    // Note: fixedUpdate will handle drawing cards and showing the panel when phase is "card"
    if (!this.gameState.waveState.active && this.gameState.phase === "build") {
      // Just set phase to "card" - fixedUpdate will handle drawing cards and showing panel
      // eslint-disable-next-line no-param-reassign
      this.gameState.phase = "card";
    }
  }

  updateHud() {
    const goldEl = document.getElementById("hud-gold");
    const waveEl = document.getElementById("hud-wave");
    const hpEl = document.getElementById("hud-hp");
    const phaseEl = document.getElementById("hud-phase");
    if (!goldEl || !waveEl || !hpEl || !phaseEl) return;

    goldEl.textContent = `Gold: ${this.gameState.gold}`;
    waveEl.textContent = `Wave: ${this.gameState.currentWave}`;
    hpEl.textContent = `Base HP: ${this.gameState.baseHp}`;
    phaseEl.textContent = `Phase: ${this.gameState.phase}`;
  }

  updateHint() {
    const hintEl = document.getElementById("hint-text");
    if (!hintEl) return;

    const { phase, path, cards, waveState } = this.gameState;

    if (phase === "end") {
      hintEl.textContent = "Game Over";
      return;
    }

    if (phase === "wave" || (waveState && waveState.active)) {
      hintEl.textContent = "Defend! Enemies are attacking your base";
      return;
    }

    if (phase === "card") {
      hintEl.textContent = "Choose a card to place next";
      return;
    }

    if (path.length < 2) {
      if (cards.pendingPlacement) {
        if (cards.pendingPlacement.kind === "road") {
          hintEl.textContent = "Place a road tile to start building a path from left to right";
        } else {
          hintEl.textContent =
            "Tip: Build a path from left (spawn) to right (exit) first, then place towers";
        }
      } else {
        hintEl.textContent = "Select a road card and build a path from left to right";
      }
    } else if (cards.pendingPlacement) {
      if (cards.pendingPlacement.kind === "tower") {
        hintEl.textContent = "Place a tower near the path to defend against enemies";
      } else if (cards.pendingPlacement.kind === "terrain") {
        hintEl.textContent = "Place terrain - hills unlock special tower upgrades";
      } else {
        hintEl.textContent = "Build more roads to extend your path";
      }
    } else {
      hintEl.textContent = "Select a card to place, or click a tower to upgrade it";
    }
  }

  showEndSummary(victory) {
    const existing = document.getElementById("end-summary");
    if (existing) {
      existing.remove();
    }
    const container = document.createElement("div");
    container.id = "end-summary";
    container.style.position = "fixed";
    container.style.left = "50%";
    container.style.top = "50%";
    container.style.transform = "translate(-50%, -50%)";
    container.style.background = "rgba(10, 12, 18, 0.98)";
    container.style.border = "1px solid #333a4a";
    container.style.borderRadius = "8px";
    container.style.padding = "16px 20px";
    container.style.color = "#f5f5f5";
    container.style.minWidth = "260px";
    container.style.zIndex = "9999";
    container.style.textAlign = "center";

    const title = document.createElement("div");
    title.style.fontWeight = "600";
    title.style.marginBottom = "8px";
    title.textContent = victory ? "Victory!" : "Defeat";

    const wave = document.createElement("div");
    wave.textContent = `Wave reached: ${this.gameState.currentWave - 1}`;

    const towers = document.createElement("div");
    towers.textContent = `Towers built: ${this.gameState.towers.length}`;

    const gold = document.createElement("div");
    gold.textContent = `Gold remaining: ${this.gameState.gold}`;

    container.appendChild(title);
    container.appendChild(wave);
    container.appendChild(towers);
    container.appendChild(gold);

    document.body.appendChild(container);
  }
}


