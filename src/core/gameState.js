export function createInitialGameState(grid) {
  const midRow = Math.floor(grid.rows / 2);
  const spawn = { col: 0, row: midRow };
  const exit = { col: grid.cols - 1, row: midRow };

  return {
    grid,
    towers: [],
    enemies: [],
    projectiles: [],
    gold: 10,
    baseHp: 10,
    currentWave: 1,
    phase: "build", // "wave" | "card" | "build" | "end"
    spawn,
    exit,
    path: [], // ordered list of cells from spawn to exit once roads are placed
    cards: {
      currentChoices: [],
      pendingPlacement: null,
    },
    nextEnemyId: 1,
    nextTowerId: 1,
    nextProjectileId: 1,
  };
}


