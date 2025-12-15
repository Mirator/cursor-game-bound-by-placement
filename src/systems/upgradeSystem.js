import { UPGRADE_PATH } from "../entities/tower.js";
import { canAfford, spendGold } from "./economySystem.js";

const UPGRADE_TREES = {
  [UPGRADE_PATH.PRECISION]: [
    {
      name: "+Damage",
      description: "+1 damage.",
      cost: 5,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.damage += 1;
      },
    },
    {
      name: "+Fire Rate",
      description: "+50% fire rate.",
      cost: 7,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.fireRate *= 1.5;
      },
    },
    {
      name: "Crit Chance",
      description: "Attacks can critically hit for double damage.",
      cost: 9,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.critChance = 0.25;
      },
    },
  ],
  [UPGRADE_PATH.ANGLE]: [
    {
      name: "Pierce",
      description: "Projectiles hit 2 enemies.",
      cost: 6,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.pierce = 2;
      },
    },
    {
      name: "Ricochet",
      description: "Projectiles bounce to a new target once.",
      cost: 8,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.ricochet = true;
      },
    },
    {
      name: "Turn Bonus",
      description: "+1 damage vs enemies on turns.",
      cost: 9,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.turnBonusDamage = 1;
      },
    },
  ],
  [UPGRADE_PATH.SUSTAINED]: [
    {
      name: "Ramp Damage",
      description: "Each hit increases damage slightly (capped).",
      cost: 6,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.rampStacks = 0;
        // eslint-disable-next-line no-param-reassign
        tower.rampPerHit = 0.1;
      },
    },
    {
      name: "Bleed",
      description: "Hits apply a small extra damage over time.",
      cost: 8,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.bleedDamage = 0.5;
      },
    },
    {
      name: "Hardened Tips",
      description: "+2 damage.",
      cost: 10,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.damage += 2;
      },
    },
  ],
  [UPGRADE_PATH.SNIPER]: [
    {
      name: "+Range",
      description: "+2 range.",
      cost: 7,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.range += 2;
      },
    },
    {
      name: "Headshot",
      description: "Small chance to deal triple damage.",
      cost: 9,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.headshotChance = 0.15;
      },
    },
    {
      name: "Slow on Hit",
      description: "Hits slightly slow enemies.",
      cost: 9,
      apply(tower) {
        // eslint-disable-next-line no-param-reassign
        tower.slowOnHit = 0.8; // multiplier applied to enemy speed
      },
    },
  ],
};

export function getNextUpgrade(tower) {
  const tree = UPGRADE_TREES[tower.unlockedPath];
  if (!tree) return null;
  if (tower.upgradeLevel >= tree.length) return null;
  return tree[tower.upgradeLevel];
}

export function canBuyNextUpgrade(gameState, tower) {
  const next = getNextUpgrade(tower);
  if (!next) return { available: false, reason: "No more upgrades." };
  if (!canAfford(gameState, next.cost)) {
    return { available: false, reason: "Not enough gold." };
  }
  return { available: true, reason: null, upgrade: next };
}

export function buyNextUpgrade(gameState, tower) {
  const next = getNextUpgrade(tower);
  if (!next) return { ok: false, reason: "No more upgrades." };
  if (!spendGold(gameState, next.cost)) {
    return { ok: false, reason: "Not enough gold." };
  }
  next.apply(tower);
  // eslint-disable-next-line no-param-reassign
  tower.upgradeLevel += 1;
  return { ok: true, upgrade: next };
}


