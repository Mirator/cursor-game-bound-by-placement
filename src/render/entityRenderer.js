export function syncEnemySprites(scene, gameState, enemySprites, originX, originY, cellSize) {
  const seenIds = new Set();

  for (const enemy of gameState.enemies) {
    seenIds.add(enemy.id);
    let sprite = enemySprites.get(enemy.id);
    const x = originX + (enemy.x + 0.5) * cellSize;
    const y = originY + (enemy.y + 0.5) * cellSize;

    if (!sprite) {
      sprite = scene.add.rectangle(x, y, cellSize * 0.6, cellSize * 0.6, 0xd9534f);
      enemySprites.set(enemy.id, sprite);
    } else {
      sprite.x = x;
      sprite.y = y;
    }
  }

  // Remove sprites for enemies that no longer exist
  for (const [id, sprite] of enemySprites.entries()) {
    if (!seenIds.has(id)) {
      sprite.destroy();
      enemySprites.delete(id);
    }
  }
}

export function syncTowerSprites(scene, gameState, towerSprites, originX, originY, cellSize) {
  const seenIds = new Set();

  for (const tower of gameState.towers) {
    seenIds.add(tower.id);
    let sprite = towerSprites.get(tower.id);
    const x = originX + (tower.col + 0.5) * cellSize;
    const y = originY + (tower.row + 0.5) * cellSize;

    if (!sprite) {
      sprite = scene.add.rectangle(x, y, cellSize * 0.7, cellSize * 0.7, 0x4ea3ff);
      towerSprites.set(tower.id, sprite);
    } else {
      sprite.x = x;
      sprite.y = y;
    }
  }

  for (const [id, sprite] of towerSprites.entries()) {
    if (!seenIds.has(id)) {
      sprite.destroy();
      towerSprites.delete(id);
    }
  }
}

export function syncProjectileSprites(
  scene,
  gameState,
  projectileSprites,
  originX,
  originY,
  cellSize,
) {
  const seenIds = new Set();

  for (const projectile of gameState.projectiles) {
    seenIds.add(projectile.id);
    let sprite = projectileSprites.get(projectile.id);
    const x = originX + projectile.x * cellSize;
    const y = originY + projectile.y * cellSize;

    if (!sprite) {
      sprite = scene.add.circle(x, y, cellSize * 0.15, 0xfff176);
      projectileSprites.set(projectile.id, sprite);
    } else {
      sprite.x = x;
      sprite.y = y;
    }
  }

  for (const [id, sprite] of projectileSprites.entries()) {
    if (!seenIds.has(id)) {
      sprite.destroy();
      projectileSprites.delete(id);
    }
  }
}



