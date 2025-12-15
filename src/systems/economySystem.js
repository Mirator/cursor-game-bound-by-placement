export function addGold(gameState, amount) {
  // eslint-disable-next-line no-param-reassign
  gameState.gold += amount;
}

export function canAfford(gameState, cost) {
  return gameState.gold >= cost;
}

export function spendGold(gameState, cost) {
  if (!canAfford(gameState, cost)) return false;
  // eslint-disable-next-line no-param-reassign
  gameState.gold -= cost;
  return true;
}


