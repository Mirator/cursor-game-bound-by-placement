export default class Projectile {
  constructor(id, startX, startY, targetId, damage, speedCellsPerSecond) {
    this.id = id;
    this.x = startX;
    this.y = startY;
    this.targetId = targetId;
    this.damage = damage;
    this.speed = speedCellsPerSecond;
  }
}


