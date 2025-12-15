import { createInitialGrid, TILE_TYPES } from "../map/grid.js";
import { createInitialGameState } from "../core/gameState.js";
import { drawGrid } from "../render/gridRenderer.js";
import { tryPlaceRoad, canPlaceTerrain, canPlaceTower } from "../map/placement.js";
import { canPlaceRoad } from "../map/pathRules.js";
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

    // Hover tracking
    this.hoverCell = null;
    this.hoverHighlight = null;
    this.placementPreview = null;
    this.tileTypeText = null;
    
    this.input.on("pointermove", (pointer) => {
      const cell = this.pointerToCell(pointer);
      this.updateHover(cell);
    });

    this.input.on("pointerout", () => {
      this.updateHover(null);
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
      // Update hover to show new preview
      if (this.hoverCell) {
        this.updateHover(this.hoverCell);
      }
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

  updateHover(cell) {
    // Check if cell changed
    if (
      this.hoverCell &&
      cell &&
      this.hoverCell.col === cell.col &&
      this.hoverCell.row === cell.row
    ) {
      return; // No change
    }

    this.hoverCell = cell;

    // Remove existing hover highlight
    if (this.hoverHighlight) {
      this.hoverHighlight.destroy();
      this.hoverHighlight = null;
    }

    // Remove existing placement preview
    if (this.placementPreview) {
      this.placementPreview.destroy();
      this.placementPreview = null;
    }

    // Remove existing tile type text
    if (this.tileTypeText) {
      this.tileTypeText.destroy();
      this.tileTypeText = null;
    }

    if (!cell) return;

    const x = this.gridOriginX + cell.col * CELL_SIZE + CELL_SIZE / 2;
    const y = this.gridOriginY + cell.row * CELL_SIZE + CELL_SIZE / 2;
    const tile = this.grid.tiles[cell.row][cell.col];

    // Create hover highlight (border outline)
    this.hoverHighlight = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, 0x000000, 0);
    this.hoverHighlight.setStrokeStyle(3, 0xffff00, 0.8);
    this.hoverHighlight.setDepth(100);

    // Base tile type name
    const tileTypeNames = {
      [TILE_TYPES.PLAIN]: "Plain",
      [TILE_TYPES.HILL]: "Hill",
      [TILE_TYPES.ROAD_STRAIGHT]: "Straight Road",
      [TILE_TYPES.ROAD_TURN_SMALL]: "Small Turn",
      [TILE_TYPES.ROAD_TURN_LONG]: "Long Turn",
    };
    let label = tileTypeNames[tile.type] || "Unknown";

    // If we are about to place something, show the placement tile instead
    const { phase, cards } = this.gameState;
    if (phase === "build" && cards.pendingPlacement) {
      if (cards.pendingPlacement.kind === "road") {
        const pendingType =
          cards.pendingPlacement.roadType ?? TILE_TYPES.ROAD_STRAIGHT;
        label =
          (tileTypeNames[pendingType] || "Road") + " (placing)";
      } else if (cards.pendingPlacement.kind === "tower") {
        label = "Arrow Tower (placing)";
      } else if (cards.pendingPlacement.kind === "terrain") {
        label = "Hill (placing)";
      }
    }

    this.tileTypeText = this.add.text(x, y - CELL_SIZE / 2 - 15, label, {
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 },
    });
    this.tileTypeText.setOrigin(0.5, 1);
    this.tileTypeText.setDepth(101);

    // Show placement preview if in build phase with pending placement
    if (phase === "build" && cards.pendingPlacement) {
      this.updatePlacementPreview(cell, cards.pendingPlacement, x, y);
    }
  }

  updatePlacementPreview(cell, pendingPlacement, x, y) {
    if (this.placementPreview) {
      this.placementPreview.destroy();
    }

    // Check if placement is valid
    let isValid = false;
    let previewColor = 0x00ff00; // Green for valid
    let previewAlpha = 0.4;

    if (pendingPlacement.kind === "road") {
      const result = canPlaceRoad(
        this.gameState.grid,
        this.gameState.spawn,
        this.gameState.exit,
        cell,
        pendingPlacement.roadType ?? TILE_TYPES.ROAD_STRAIGHT,
      );
      isValid = result.ok;
    } else if (pendingPlacement.kind === "tower") {
      const result = canPlaceTower(this.gameState, cell);
      isValid = result.ok;
    } else if (pendingPlacement.kind === "terrain") {
      const result = canPlaceTerrain(this.gameState, cell);
      isValid = result.ok;
    }

    if (!isValid) {
      previewColor = 0xff0000; // Red for invalid
    }

    // Determine preview tile type
    let previewType = TILE_TYPES.PLAIN;
    if (pendingPlacement.kind === "road") {
      previewType = pendingPlacement.roadType ?? TILE_TYPES.ROAD_STRAIGHT;
    } else if (pendingPlacement.kind === "terrain") {
      previewType = pendingPlacement.terrainType ?? TILE_TYPES.HILL;
    }

    // Get color for preview
    const COLORS = {
      [TILE_TYPES.PLAIN]: 0x252b3b,
      [TILE_TYPES.HILL]: 0x4a5a3f,
      [TILE_TYPES.ROAD_STRAIGHT]: 0x5a5a5a,
      [TILE_TYPES.ROAD_TURN_SMALL]: 0x6a6a5a,
      [TILE_TYPES.ROAD_TURN_LONG]: 0x7a7a5a,
    };
    const baseColor = COLORS[previewType] ?? COLORS[TILE_TYPES.PLAIN];

    // Create semi-transparent preview rectangle
    this.placementPreview = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, baseColor, previewAlpha);
    this.placementPreview.setStrokeStyle(2, previewColor, 0.8);
    this.placementPreview.setDepth(99);
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
        // Update hover to show new preview
        if (this.hoverCell) {
          this.updateHover(this.hoverCell);
        }
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
    
    // Update hover to remove preview
    if (this.hoverCell) {
      this.updateHover(this.hoverCell);
    }
    
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


