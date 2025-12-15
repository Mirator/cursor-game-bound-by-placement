import { TILE_TYPES } from "../map/grid.js";

const COLORS = {
  [TILE_TYPES.PLAIN]: 0x252b3b,
  [TILE_TYPES.HILL]: 0x3a4a3f,
  [TILE_TYPES.ROAD_STRAIGHT]: 0x444b5e,
  [TILE_TYPES.ROAD_TURN_SMALL]: 0x444b5e,
  [TILE_TYPES.ROAD_TURN_LONG]: 0x444b5e,
};

export function drawGrid(scene, tileSprites, grid, options) {
  const { originX, originY, cellSize } = options;
  
  // Clear existing tile sprites
  if (tileSprites) {
    for (const sprite of tileSprites.values()) {
      sprite.destroy();
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
      
      // Use scene.add.rectangle() like entityRenderer does (this works!)
      const sprite = scene.add.rectangle(x, y, cellSize, cellSize, color);
      const key = `${col},${row}`;
      if (tileSprites) {
        tileSprites.set(key, sprite);
      }
    }
  }
}


