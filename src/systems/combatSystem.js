import ArrowTower from "../entities/tower.js";
import Projectile from "../entities/projectile.js";
import { canPlaceTower } from "../map/placement.js";

const PROJECTILE_SPEED_CELLS = 6;
const BLEED_DURATION = 2.5;

export function setupCombatSystem(gameState) {
  // eslint-disable-next-line no-param-reassign
  gameState.nextTowerId = 1;
  // eslint-disable-next-line no-param-reassign
  gameState.nextProjectileId = 1;
}

const ARROW_TOWER_COST = 5;

export function tryPlaceArrowTower(gameState, pos) {
  const can = canPlaceTower(gameState, pos);
  if (!can.ok) return can;

  if (gameState.gold < ARROW_TOWER_COST) {
    return { ok: false, reason: "Not enough gold for Arrow Tower." };
  }

  const id = gameState.nextTowerId;
  // eslint-disable-next-line no-param-reassign
  gameState.nextTowerId += 1;

  const tower = new ArrowTower(id, pos.col, pos.row, gameState.grid);
  gameState.towers.push(tower);

  // eslint-disable-next-line no-param-reassign
  gameState.gold -= ARROW_TOWER_COST;

  return { ok: true, tower };
}

function distanceGrid(aX, aY, bX, bY) {
  const dx = aX - bX;
  const dy = aY - bY;
  return Math.sqrt(dx * dx + dy * dy);
}

function isEnemyOnTurn(enemy, path) {
  if (!path || path.length < 3) return false;
  if (enemy.pathIndex <= 0 || enemy.pathIndex >= path.length - 1) return false;
  const prev = path[enemy.pathIndex - 1];
  const cur = path[enemy.pathIndex];
  const next = path[enemy.pathIndex + 1];
  const dx1 = cur.col - prev.col;
  const dy1 = cur.row - prev.row;
  const dx2 = next.col - cur.col;
  const dy2 = next.row - cur.row;
  return dx1 !== dx2 || dy1 !== dy2;
}

function spawnProjectile(gameState, tower, targetEnemy) {
  const id = gameState.nextProjectileId;
  // eslint-disable-next-line no-param-reassign
  gameState.nextProjectileId += 1;

  const baseDamage = tower.damage + (tower.rampStacks ?? 0);
  const projectile = new Projectile(
    id,
    tower.col + 0.5,
    tower.row + 0.5,
    targetEnemy.id,
    baseDamage,
    PROJECTILE_SPEED_CELLS,
    tower.id,
  );

  projectile.critChance = tower.critChance ?? 0;
  projectile.headshotChance = tower.headshotChance ?? 0;
  projectile.turnBonusDamage = tower.turnBonusDamage ?? 0;
  projectile.slowMultiplier = tower.slowOnHit ?? 1;
  projectile.bleedDamage = tower.bleedDamage ?? 0;

  if (tower.pierce) {
    projectile.pierceRemaining = tower.pierce;
  }
  if (tower.ricochet) {
    projectile.ricochet = true;
  }

  gameState.projectiles.push(projectile);
}

function updateTowers(gameState, dt) {
  const enemies = gameState.enemies;
  if (enemies.length === 0) return;

  for (const tower of gameState.towers) {
    if (tower.cooldown > 0) {
      tower.cooldown -= dt;
      continue;
    }

    // pick enemy closest to the exit within range
    let bestEnemy = null;
    let bestProgress = -Infinity;
    for (const enemy of enemies) {
      const dist = distanceGrid(tower.col, tower.row, enemy.x, enemy.y);
      if (dist > tower.range) continue;
      const progress = enemy.pathIndex + enemy.t;
      if (progress > bestProgress) {
        bestProgress = progress;
        bestEnemy = enemy;
      }
    }

    if (bestEnemy) {
      spawnProjectile(gameState, tower, bestEnemy);
      tower.cooldown = 1 / tower.fireRate;
    }
  }
}

function updateProjectiles(gameState, dt) {
  const enemiesById = new Map();
  for (const enemy of gameState.enemies) {
    enemiesById.set(enemy.id, enemy);
  }

  const towersById = new Map();
  for (const tower of gameState.towers) {
    towersById.set(tower.id, tower);
  }

  const remaining = [];

  for (const projectile of gameState.projectiles) {
    let target = enemiesById.get(projectile.targetId);

    if (!target) {
      // target gone
      continue;
    }

    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      // hit
      const sourceTower = towersById.get(projectile.sourceTowerId);
      let totalDamage = projectile.damage;
      if (projectile.turnBonusDamage && isEnemyOnTurn(target, gameState.path)) {
        totalDamage += projectile.turnBonusDamage;
      }

      let multiplier = 1;
      if (projectile.headshotChance && Math.random() < projectile.headshotChance) {
        multiplier *= 3;
      } else if (projectile.critChance && Math.random() < projectile.critChance) {
        multiplier *= 2;
      }

      target.hp -= totalDamage * multiplier;
      if (projectile.slowMultiplier && projectile.slowMultiplier < target.speedMultiplier) {
        target.speedMultiplier = projectile.slowMultiplier;
      }
      if (projectile.bleedDamage > 0) {
        target.bleedDamagePerSecond += projectile.bleedDamage;
        target.bleedDuration = Math.max(target.bleedDuration, BLEED_DURATION);
      }
      if (sourceTower?.rampPerHit) {
        const nextRamp = (sourceTower.rampStacks ?? 0) + sourceTower.rampPerHit;
        // eslint-disable-next-line no-param-reassign
        sourceTower.rampStacks = Math.min(nextRamp, 3);
      }

      if (projectile.pierceRemaining && projectile.pierceRemaining > 1) {
        projectile.pierceRemaining -= 1;
        remaining.push(projectile);
        continue;
      }

      if (projectile.ricochet) {
        // find another nearby enemy
        let newTarget = null;
        let bestDist = Infinity;
        for (const enemy of enemiesById.values()) {
          if (enemy.id === target.id) continue;
          const d2x = enemy.x - projectile.x;
          const d2y = enemy.y - projectile.y;
          const d2 = Math.sqrt(d2x * d2x + d2y * d2y);
          if (d2 < bestDist && d2 < 3) {
            bestDist = d2;
            newTarget = enemy;
          }
        }
        if (newTarget) {
          projectile.targetId = newTarget.id;
          remaining.push(projectile);
          continue;
        }
      }

      continue;
    }

    const moveDist = projectile.speed * dt;
    const nx = dx / dist;
    const ny = dy / dist;

    if (moveDist >= dist) {
      projectile.x = target.x;
      projectile.y = target.y;
    } else {
      projectile.x += nx * moveDist;
      projectile.y += ny * moveDist;
    }

    remaining.push(projectile);
  }

  // eslint-disable-next-line no-param-reassign
  gameState.projectiles = remaining;
}

export function updateCombatSystem(gameState, dt) {
  updateTowers(gameState, dt);
  updateProjectiles(gameState, dt);
}


