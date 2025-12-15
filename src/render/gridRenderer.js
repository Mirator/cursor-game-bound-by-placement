import { TILE_TYPES } from "../map/grid.js";

const COLORS = {
  [TILE_TYPES.PLAIN]: 0x252b3b,
  [TILE_TYPES.HILL]: 0x4a5a3f,
  [TILE_TYPES.ROAD_STRAIGHT]: 0x5a5a5a,
  [TILE_TYPES.ROAD_TURN_SMALL]: 0x6a6a5a,
  [TILE_TYPES.ROAD_TURN_LONG]: 0x7a7a5a,
};

const BORDER_COLOR = 0x1a1a2a;
const ROAD_COLOR = 0xcccccc;

function drawRoadPattern(scene, x, y, cellSize, tile) {
  const halfSize = cellSize / 2;
  const roadWidth = cellSize * 0.35;
  const graphics = scene.add.graphics();

  graphics.lineStyle(roadWidth, ROAD_COLOR, 1);

  if (tile.type === TILE_TYPES.ROAD_STRAIGHT) {
    // Draw straight line based on entry/exit directions
    const isHorizontal = (tile.entryDir === "left" && tile.exitDir === "right") ||
                         (tile.entryDir === "right" && tile.exitDir === "left");
    
    if (isHorizontal) {
      // Horizontal
      graphics.moveTo(x - halfSize, y);
      graphics.lineTo(x + halfSize, y);
    } else {
      // Vertical (or fallback)
      graphics.moveTo(x, y - halfSize);
      graphics.lineTo(x, y + halfSize);
    }
  } else if (tile.type === TILE_TYPES.ROAD_TURN_SMALL || tile.type === TILE_TYPES.ROAD_TURN_LONG) {
    // Draw L-shaped turn using filled path
    const isLong = tile.type === TILE_TYPES.ROAD_TURN_LONG;
    const cornerOffset = isLong ? cellSize * 0.25 : cellSize * 0.2;

    // Determine turn direction based on entry/exit
    const entry = tile.entryDir;
    const exit = tile.exitDir;

    if ((entry === "left" && exit === "up") || (entry === "up" && exit === "left")) {
      // Left-Up corner
      graphics.moveTo(x - halfSize, y);
      graphics.lineTo(x - cornerOffset, y);
      graphics.lineTo(x - cornerOffset, y - halfSize);
      graphics.lineTo(x, y - halfSize);
    } else if ((entry === "left" && exit === "down") || (entry === "down" && exit === "left")) {
      // Left-Down corner
      graphics.moveTo(x - halfSize, y);
      graphics.lineTo(x - cornerOffset, y);
      graphics.lineTo(x - cornerOffset, y + halfSize);
      graphics.lineTo(x, y + halfSize);
    } else if ((entry === "right" && exit === "up") || (entry === "up" && exit === "right")) {
      // Right-Up corner
      graphics.moveTo(x + halfSize, y);
      graphics.lineTo(x + cornerOffset, y);
      graphics.lineTo(x + cornerOffset, y - halfSize);
      graphics.lineTo(x, y - halfSize);
    } else if ((entry === "right" && exit === "down") || (entry === "down" && exit === "right")) {
      // Right-Down corner
      graphics.moveTo(x + halfSize, y);
      graphics.lineTo(x + cornerOffset, y);
      graphics.lineTo(x + cornerOffset, y + halfSize);
      graphics.lineTo(x, y + halfSize);
    } else {
      // Fallback: draw simple L-shape (left-up)
      graphics.moveTo(x - halfSize, y);
      graphics.lineTo(x, y);
      graphics.lineTo(x, y - halfSize);
    }
  }

  graphics.strokePath();
  return graphics;
}

export function drawGrid(scene, tileSprites, grid, options) {
  const { originX, originY, cellSize } = options;
  
  // Clear existing tile sprites and graphics
  if (tileSprites) {
    for (const sprite of tileSprites.values()) {
      // Destroy road graphics if they exist
      if (sprite.roadGraphics && sprite.roadGraphics.destroy) {
        sprite.roadGraphics.destroy();
      }
      if (sprite.destroy) {
        sprite.destroy();
      }
    }
    tileSprites.clear();
  }

  // Create rectangle for each tile
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const tile = grid.tiles[row][col];
      const x = originX + col * cellSize + cellSize / 2;
      const y = originY + row * cellSize + cellSize / 2;

      const color = COLORS[tile.type] ?? COLORS[TILE_TYPES.PLAIN];
      
      // Create base rectangle with border
      const sprite = scene.add.rectangle(x, y, cellSize, cellSize, color);
      sprite.setStrokeStyle(2, BORDER_COLOR);
      
      // Draw road patterns on top
      if (
        tile.type === TILE_TYPES.ROAD_STRAIGHT ||
        tile.type === TILE_TYPES.ROAD_TURN_SMALL ||
        tile.type === TILE_TYPES.ROAD_TURN_LONG
      ) {
        const roadGraphics = drawRoadPattern(scene, x, y, cellSize, tile);
        // Store graphics with tile sprite for cleanup
        sprite.roadGraphics = roadGraphics;
      }
      
      const key = `${col},${row}`;
      if (tileSprites) {
        tileSprites.set(key, sprite);
      }
    }
  }
}


