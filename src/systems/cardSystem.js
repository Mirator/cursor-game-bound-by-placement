import { TILE_TYPES } from "../map/grid.js";

// Simple MVP card definitions
export const CARD_TYPES = {
  ROAD: "road",
  TOWER: "tower",
  TERRAIN: "terrain",
};

export const ROAD_SUBTYPES = {
  STRAIGHT: "straight",
  TURN_SMALL: "turn_small",
  TURN_LONG: "turn_long",
};

export const TERRAIN_SUBTYPES = {
  HILL: "hill",
};

const CARD_DEFS = [
  {
    id: "road_straight",
    type: CARD_TYPES.ROAD,
    roadSubtype: ROAD_SUBTYPES.STRAIGHT,
    name: "Straight Road",
    description: "Extend the path with a straight road segment.",
  },
  {
    id: "road_turn_small",
    type: CARD_TYPES.ROAD,
    roadSubtype: ROAD_SUBTYPES.TURN_SMALL,
    name: "Small Turn",
    description: "Turn the road by 90°.",
  },
  {
    id: "road_turn_long",
    type: CARD_TYPES.ROAD,
    roadSubtype: ROAD_SUBTYPES.TURN_LONG,
    name: "Long Turn",
    description: "Turn the road and add extra distance.",
  },
  {
    id: "tower_arrow",
    type: CARD_TYPES.TOWER,
    name: "Arrow Tower",
    description: "Place an Arrow Tower to defend the path.",
  },
  {
    id: "terrain_hill",
    type: CARD_TYPES.TERRAIN,
    terrainSubtype: TERRAIN_SUBTYPES.HILL,
    name: "Hill",
    description: "Place a hill; towers here unlock Sniper upgrades.",
  },
];

export function drawCardChoices(gameState, count = 3) {
  const choices = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(Math.random() * CARD_DEFS.length);
    choices.push(CARD_DEFS[idx]);
  }
  // eslint-disable-next-line no-param-reassign
  gameState.cards.currentChoices = choices;
  // eslint-disable-next-line no-param-reassign
  gameState.phase = "card";
  return choices;
}

export function handleCardChosen(gameState, card) {
  let pendingPlacement = null;

  if (card.type === CARD_TYPES.ROAD) {
    let roadType = TILE_TYPES.ROAD_STRAIGHT;
    if (card.roadSubtype === ROAD_SUBTYPES.TURN_SMALL) {
      roadType = TILE_TYPES.ROAD_TURN_SMALL;
    } else if (card.roadSubtype === ROAD_SUBTYPES.TURN_LONG) {
      roadType = TILE_TYPES.ROAD_TURN_LONG;
    }
    pendingPlacement = {
      kind: CARD_TYPES.ROAD,
      roadType,
    };
  } else if (card.type === CARD_TYPES.TOWER) {
    pendingPlacement = {
      kind: CARD_TYPES.TOWER,
    };
  } else if (card.type === CARD_TYPES.TERRAIN) {
    pendingPlacement = {
      kind: CARD_TYPES.TERRAIN,
      terrainType: TILE_TYPES.HILL,
    };
  }

  // eslint-disable-next-line no-param-reassign
  gameState.cards.pendingPlacement = pendingPlacement;
  // eslint-disable-next-line no-param-reassign
  gameState.cards.currentChoices = [];
  // eslint-disable-next-line no-param-reassign
  gameState.phase = "build";
}


