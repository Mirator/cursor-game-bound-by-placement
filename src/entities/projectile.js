export default class Projectile {
  constructor(
    id,
    startX,
    startY,
    targetId,
    damage,
    speedCellsPerSecond,
    sourceTowerId,
  ) {
    this.id = id;
    this.x = startX;
    this.y = startY;
    this.targetId = targetId;
    this.damage = damage;
    this.speed = speedCellsPerSecond;
    this.sourceTowerId = sourceTowerId;

    this.critChance = 0;
    this.headshotChance = 0;
    this.turnBonusDamage = 0;
    this.bleedDamage = 0;
    this.slowMultiplier = 1;
  }
}


