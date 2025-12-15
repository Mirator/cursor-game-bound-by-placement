import { TILE_TYPES } from "./grid.js";
import { canPlaceRoad, applyRoadPlacement } from "./pathRules.js";

export function tryPlaceRoad(gameState, pos, roadType = TILE_TYPES.ROAD_STRAIGHT) {
  const { grid, spawn, exit } = gameState;
  const result = canPlaceRoad(grid, spawn, exit, pos, roadType);
  if (!result.ok) {
    return result;
  }
  applyRoadPlacement(gameState, pos, roadType);
  return { ok: true, reason: null };
}

export function canPlaceTower(gameState, pos) {
  const { grid } = gameState;
  const tile = grid.tiles[pos.row][pos.col];
  if (
    tile.type === TILE_TYPES.ROAD_STRAIGHT ||
    tile.type === TILE_TYPES.ROAD_TURN_SMALL ||
    tile.type === TILE_TYPES.ROAD_TURN_LONG
  ) {
    return { ok: false, reason: "Cannot place towers on road tiles." };
  }
  return { ok: true, reason: null };
}

export function canPlaceTerrain(gameState, pos) {
  const { grid } = gameState;
  const tile = grid.tiles[pos.row][pos.col];
  if (
    tile.type === TILE_TYPES.ROAD_STRAIGHT ||
    tile.type === TILE_TYPES.ROAD_TURN_SMALL ||
    tile.type === TILE_TYPES.ROAD_TURN_LONG
  ) {
    return { ok: false, reason: "Cannot overwrite road tiles with terrain." };
  }
  return { ok: true, reason: null };
}


