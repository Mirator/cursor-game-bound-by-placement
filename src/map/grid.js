export const TILE_TYPES = {
  PLAIN: "plain",
  HILL: "hill",
  ROAD_STRAIGHT: "road_straight",
  ROAD_TURN_SMALL: "road_turn_small",
  ROAD_TURN_LONG: "road_turn_long",
};

function createTile(type = TILE_TYPES.PLAIN) {
  return {
    type,
    // For road tiles, entry/exit directions like "up", "down", "left", "right"
    entryDir: null,
    exitDir: null,
  };
}

export function createInitialGrid(cols, rows) {
  const tiles = [];
  for (let y = 0; y < rows; y += 1) {
    const row = [];
    for (let x = 0; x < cols; x += 1) {
      row.push(createTile(TILE_TYPES.PLAIN));
    }
    tiles.push(row);
  }
  return {
    cols,
    rows,
    tiles,
  };
}


