import { TILE_TYPES } from "../map/grid.js";

export const TOWER_TYPE = {
  ARROW: "arrow",
};

export const UPGRADE_PATH = {
  PRECISION: "precision",
  ANGLE: "angle",
  SUSTAINED: "sustained",
  SNIPER: "sniper",
};

export default class ArrowTower {
  constructor(id, col, row, grid) {
    this.id = id;
    this.type = TOWER_TYPE.ARROW;
    this.col = col;
    this.row = row;

    // Base stats
    this.baseDamage = 1;
    this.baseFireRate = 1; // shots per second
    this.baseRange = 3; // tiles

    this.damage = this.baseDamage;
    this.fireRate = this.baseFireRate;
    this.range = this.baseRange;

    this.cooldown = 0;

    this.unlockedPath = determineUpgradePath(this, grid);
    this.upgradeLevel = 0;
  }
}

function determineUpgradePath(tower, grid) {
  const { col, row } = tower;
  const tile = grid.tiles[row][col];

  if (tile.type === TILE_TYPES.HILL) {
    return UPGRADE_PATH.SNIPER;
  }

  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let hasStraight = false;
  let hasSmallTurn = false;
  let hasLongTurn = false;

  for (const [dx, dy] of deltas) {
    const nx = col + dx;
    const ny = row + dy;
    if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
    const ntile = grid.tiles[ny][nx];
    if (ntile.type === TILE_TYPES.ROAD_STRAIGHT) hasStraight = true;
    if (ntile.type === TILE_TYPES.ROAD_TURN_SMALL) hasSmallTurn = true;
    if (ntile.type === TILE_TYPES.ROAD_TURN_LONG) hasLongTurn = true;
  }

  if (hasLongTurn) return UPGRADE_PATH.SUSTAINED;
  if (hasSmallTurn) return UPGRADE_PATH.ANGLE;
  if (hasStraight) return UPGRADE_PATH.PRECISION;

  // Fallback
  return UPGRADE_PATH.PRECISION;
}


