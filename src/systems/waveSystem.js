import Enemy from "../entities/enemy.js";
import { addGold } from "./economySystem.js";

const BASE_ENEMY_HP = 5;
const HP_PER_TWO_WAVES = 1;
const ENEMIES_PER_WAVE_BASE = 5;
const ENEMIES_PER_WAVE_STEP = 2;
const ENEMY_SPEED_CELLS = 1.5;
const SPAWN_INTERVAL = 0.8; // seconds
const BASE_DAMAGE_ON_ESCAPE = 1;
const GOLD_PER_KILL = 1;

export function setupWaveSystem(gameState) {
  // eslint-disable-next-line no-param-reassign
  gameState.waveState = {
    active: false,
    enemiesToSpawn: 0,
    timeSinceLastSpawn: 0,
  };
  // eslint-disable-next-line no-param-reassign
  gameState.nextEnemyId = 1;
}

export function startNextWave(gameState) {
  const { currentWave } = gameState;
  const enemyCount =
    ENEMIES_PER_WAVE_BASE + (currentWave - 1) * ENEMIES_PER_WAVE_STEP;
  const extraHp =
    HP_PER_TWO_WAVES * Math.floor((currentWave - 1) / 2);
  const enemyHp = BASE_ENEMY_HP + extraHp;

  // eslint-disable-next-line no-param-reassign
  gameState.waveState.active = true;
  // eslint-disable-next-line no-param-reassign
  gameState.waveState.enemiesToSpawn = enemyCount;
  // eslint-disable-next-line no-param-reassign
  gameState.waveState.timeSinceLastSpawn = 0;
  // eslint-disable-next-line no-param-reassign
  gameState.waveState.enemyHp = enemyHp;
  // eslint-disable-next-line no-param-reassign
  gameState.phase = "wave";
}

function spawnEnemy(gameState) {
  const id = gameState.nextEnemyId;
  // eslint-disable-next-line no-param-reassign
  gameState.nextEnemyId += 1;
  const enemy = new Enemy(id, gameState.waveState.enemyHp, ENEMY_SPEED_CELLS);

  // Initialize on first segment of the path
  const path = gameState.path;
  if (path.length >= 2) {
    const a = path[0];
    const b = path[1];
    enemy.pathIndex = 0;
    enemy.t = 0;
    enemy.x = a.col;
    enemy.y = a.row;
    // small offset towards next node to avoid stacking exactly
    enemy.x = a.col + (b.col - a.col) * 0.01;
    enemy.y = a.row + (b.row - a.row) * 0.01;
  }

  gameState.enemies.push(enemy);
}

function updateEnemies(gameState, dt) {
  const path = gameState.path;
  if (path.length < 2) return;

  const remainingEnemies = [];

  for (const enemy of gameState.enemies) {
    let distanceToTravel = enemy.speed * dt;

    while (distanceToTravel > 0 && enemy.pathIndex < path.length - 1) {
      const a = path[enemy.pathIndex];
      const b = path[enemy.pathIndex + 1];
      const segLength = 1; // grid distance between adjacent cells
      const remainingOnSeg = (1 - enemy.t) * segLength;

      if (distanceToTravel < remainingOnSeg) {
        const advance = distanceToTravel / segLength;
        enemy.t += advance;
        distanceToTravel = 0;
      } else {
        distanceToTravel -= remainingOnSeg;
        enemy.pathIndex += 1;
        enemy.t = 0;
      }
    }

    if (enemy.pathIndex >= path.length - 1) {
      // Enemy reached the end, deal damage to base
      // eslint-disable-next-line no-param-reassign
      gameState.baseHp -= BASE_DAMAGE_ON_ESCAPE;
      if (gameState.baseHp < 0) gameState.baseHp = 0;
      continue;
    }

    const a = path[enemy.pathIndex];
    const b = path[enemy.pathIndex + 1];
    enemy.x = a.col + (b.col - a.col) * enemy.t;
    enemy.y = a.row + (b.row - a.row) * enemy.t;

    if (enemy.hp > 0) {
      remainingEnemies.push(enemy);
    } else {
      // dead enemy -> reward gold
      addGold(gameState, GOLD_PER_KILL);
    }
  }

  // eslint-disable-next-line no-param-reassign
  gameState.enemies = remainingEnemies;
}

export function updateWaveSystem(gameState, dt) {
  const { waveState } = gameState;
  if (!waveState || !waveState.active) return;
  if (gameState.path.length < 2) return; // cannot run wave without a full path

  // Spawning
  waveState.timeSinceLastSpawn += dt;
  while (
    waveState.enemiesToSpawn > 0 &&
    waveState.timeSinceLastSpawn >= SPAWN_INTERVAL
  ) {
    waveState.timeSinceLastSpawn -= SPAWN_INTERVAL;
    waveState.enemiesToSpawn -= 1;
    spawnEnemy(gameState);
  }

  // Movement & deaths
  updateEnemies(gameState, dt);

  // Wave end
  if (
    waveState.enemiesToSpawn === 0 &&
    gameState.enemies.length === 0
  ) {
    // eslint-disable-next-line no-param-reassign
    waveState.active = false;
    // eslint-disable-next-line no-param-reassign
    gameState.phase = "card"; // triggers card selection in the scene
    // eslint-disable-next-line no-param-reassign
    gameState.currentWave += 1;
  }
}


