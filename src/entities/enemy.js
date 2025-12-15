export default class Enemy {
  constructor(id, maxHp, speedCellsPerSecond) {
    this.id = id;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speedCellsPerSecond; // in grid cells per second

    this.pathIndex = 0;
    this.t = 0; // 0..1 along current segment

    // Position in grid space (cell coordinates, not pixels)
    this.x = 0;
    this.y = 0;
  }
}


