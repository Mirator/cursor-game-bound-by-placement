import { createInitialGrid, TILE_TYPES } from "./grid.js";

const DIRS = {
  right: { dx: 1, dy: 0, opposite: "left" },
  left: { dx: -1, dy: 0, opposite: "right" },
  down: { dx: 0, dy: 1, opposite: "up" },
  up: { dx: 0, dy: -1, opposite: "down" },
};

const ORIENTATION_SETS = {
  [TILE_TYPES.ROAD_STRAIGHT]: [
    ["left", "right"],
    ["up", "down"],
  ],
  [TILE_TYPES.ROAD_TURN_SMALL]: [
    ["up", "right"],
    ["right", "down"],
    ["down", "left"],
    ["left", "up"],
  ],
  [TILE_TYPES.ROAD_TURN_LONG]: [
    ["up", "right"],
    ["right", "down"],
    ["down", "left"],
    ["left", "up"],
  ],
};

function pickOrientationForTile(type, neighborDirs) {
  const options = ORIENTATION_SETS[type];
  if (!options) return null;
  if (neighborDirs.length === 0) return null; // avoid isolated/open roads
  for (const opt of options) {
    if (neighborDirs.every((dir) => opt.includes(dir))) {
      return { entryDir: opt[0], exitDir: opt[1] };
    }
  }
  return null;
}

function key(col, row) {
  return `${col},${row}`;
}

function recomputeRoadDirections(grid, spawn, exit) {
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const tile = grid.tiles[row][col];
      if (
        tile.type !== TILE_TYPES.ROAD_STRAIGHT &&
        tile.type !== TILE_TYPES.ROAD_TURN_SMALL &&
        tile.type !== TILE_TYPES.ROAD_TURN_LONG
      ) {
        // eslint-disable-next-line no-param-reassign
        tile.entryDir = null;
        // eslint-disable-next-line no-param-reassign
        tile.exitDir = null;
        continue;
      }

      const neighborDirs = [];
      for (const [dirName, dir] of Object.entries(DIRS)) {
        const nx = col + dir.dx;
        const ny = row + dir.dy;
        const inBounds = nx >= 0 && ny >= 0 && nx < grid.cols && ny < grid.rows;
        if (inBounds) {
          const ntile = grid.tiles[ny][nx];
          if (
            ntile.type === TILE_TYPES.ROAD_STRAIGHT ||
            ntile.type === TILE_TYPES.ROAD_TURN_SMALL ||
            ntile.type === TILE_TYPES.ROAD_TURN_LONG
          ) {
            neighborDirs.push(dirName);
          }
        }
        if (spawn.col === nx && spawn.row === ny) neighborDirs.push(dirName);
        if (exit.col === nx && exit.row === ny) neighborDirs.push(dirName);
      }

      const orientation = pickOrientationForTile(tile.type, neighborDirs);
      if (!orientation) {
        return {
          ok: false,
          reason: "Road orientation does not match its neighbors.",
        };
      }

      // eslint-disable-next-line no-param-reassign
      tile.entryDir = orientation.entryDir;
      // eslint-disable-next-line no-param-reassign
      tile.exitDir = orientation.exitDir;
    }
  }

  return { ok: true };
}

function buildGraph(grid, spawn, exit) {
  const nodes = new Set();
  const edges = new Map(); // id -> Set of neighbor ids
  const spawnId = "S";
  const exitId = "E";

  const addNode = (id) => {
    if (!nodes.has(id)) {
      nodes.add(id);
      edges.set(id, new Set());
    }
  };

  const addEdge = (idA, idB) => {
    addNode(idA);
    addNode(idB);
    edges.get(idA).add(idB);
    edges.get(idB).add(idA);
  };

  const connectIfAligned = (col, row, dirName, sourceId) => {
    const dir = DIRS[dirName];
    const nx = col + dir.dx;
    const ny = row + dir.dy;
    const neighborIsSpawn = nx === spawn.col && ny === spawn.row;
    const neighborIsExit = nx === exit.col && ny === exit.row;
    if (neighborIsSpawn) {
      addEdge(sourceId, spawnId);
      return;
    }
    if (neighborIsExit) {
      addEdge(sourceId, exitId);
      return;
    }

    if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) return;
    const neighbor = grid.tiles[ny][nx];
    if (
      neighbor.type !== TILE_TYPES.ROAD_STRAIGHT &&
      neighbor.type !== TILE_TYPES.ROAD_TURN_SMALL &&
      neighbor.type !== TILE_TYPES.ROAD_TURN_LONG
    ) {
      return;
    }

    if (!neighbor.entryDir || !neighbor.exitDir) return;
    if (
      neighbor.entryDir !== dir.opposite &&
      neighbor.exitDir !== dir.opposite
    ) {
      return;
    }

    addEdge(sourceId, key(nx, ny));
  };

  // Add road tiles as nodes and connect adjacent road tiles
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const tile = grid.tiles[row][col];
      if (
        tile.type === TILE_TYPES.ROAD_STRAIGHT ||
        tile.type === TILE_TYPES.ROAD_TURN_SMALL ||
        tile.type === TILE_TYPES.ROAD_TURN_LONG
      ) {
        const id = key(col, row);
        addNode(id);
        if (tile.entryDir) {
          connectIfAligned(col, row, tile.entryDir, id);
        }
        if (tile.exitDir) {
          connectIfAligned(col, row, tile.exitDir, id);
        }
      }
    }
  }

  return { nodes, edges, spawnId, exitId };
}

function validateSinglePath(graph) {
  const { nodes, edges, spawnId, exitId } = graph;
  if (!nodes.has(spawnId) || !nodes.has(exitId)) {
    // No connection yet; allow zero or partial roads as long as no forks/loops
    for (const id of nodes) {
      const deg = edges.get(id)?.size ?? 0;
      if (deg > 2) {
        return { ok: false, reason: "Road would create a fork." };
      }
    }
    return { ok: true, reason: null, pathNodes: [] };
  }

  // BFS from spawn to exit
  const queue = [spawnId];
  const visited = new Set([spawnId]);
  const parent = new Map();

  while (queue.length) {
    const id = queue.shift();
    if (id === exitId) break;
    const neighs = edges.get(id) ?? new Set();
    for (const nb of neighs) {
      if (!visited.has(nb)) {
        visited.add(nb);
        parent.set(nb, id);
        queue.push(nb);
      }
    }
  }

  if (!visited.has(exitId)) {
    return { ok: false, reason: "Path must connect spawn and exit." };
  }

  // Reconstruct path
  const pathNodes = [];
  let cur = exitId;
  while (cur !== undefined) {
    pathNodes.push(cur);
    cur = parent.get(cur);
  }
  pathNodes.reverse();

  // Degrees and branch checks
  for (const id of nodes) {
    const deg = edges.get(id)?.size ?? 0;
    if (deg > 2) {
      return { ok: false, reason: "Road would create a fork." };
    }
  }

  const spawnDeg = edges.get(spawnId)?.size ?? 0;
  const exitDeg = edges.get(exitId)?.size ?? 0;
  if (spawnDeg !== 1 || exitDeg !== 1) {
    return {
      ok: false,
      reason: "Spawn and exit must connect to the path with exactly one road.",
    };
  }

  // Ensure all road nodes are on the spawn->exit path (no side branches)
  const pathSet = new Set(pathNodes);
  for (const id of nodes) {
    if (id === spawnId || id === exitId) continue;
    if (!pathSet.has(id)) {
      return { ok: false, reason: "Road would create a side branch." };
    }
  }

  return { ok: true, reason: null, pathNodes };
}

export function canPlaceRoad(grid, spawn, exit, pos, roadType) {
  const tile = grid.tiles[pos.row][pos.col];
  if (tile.type !== TILE_TYPES.PLAIN) {
    return { ok: false, reason: "Road must be placed on plain terrain." };
  }

  // Temporarily mutate, rebuild directions, build graph, then revert
  const backup = grid.tiles.map((row) =>
    row.map((cell) => ({
      type: cell.type,
      entryDir: cell.entryDir,
      exitDir: cell.exitDir,
    })),
  );

  // eslint-disable-next-line no-param-reassign
  grid.tiles[pos.row][pos.col].type = roadType;

  const orientationResult = recomputeRoadDirections(grid, spawn, exit);
  if (!orientationResult.ok) {
    // revert everything
    for (let r = 0; r < grid.rows; r += 1) {
      for (let c = 0; c < grid.cols; c += 1) {
        // eslint-disable-next-line no-param-reassign
        grid.tiles[r][c].type = backup[r][c].type;
        // eslint-disable-next-line no-param-reassign
        grid.tiles[r][c].entryDir = backup[r][c].entryDir;
        // eslint-disable-next-line no-param-reassign
        grid.tiles[r][c].exitDir = backup[r][c].exitDir;
      }
    }
    return { ok: false, reason: orientationResult.reason };
  }

  const graph = buildGraph(grid, spawn, exit);
  const validation = validateSinglePath(graph);

  // revert
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      // eslint-disable-next-line no-param-reassign
      grid.tiles[r][c].type = backup[r][c].type;
      // eslint-disable-next-line no-param-reassign
      grid.tiles[r][c].entryDir = backup[r][c].entryDir;
      // eslint-disable-next-line no-param-reassign
      grid.tiles[r][c].exitDir = backup[r][c].exitDir;
    }
  }

  return validation;
}

export function applyRoadPlacement(gameState, pos, roadType) {
  const { grid, spawn, exit } = gameState;
  // apply
  // eslint-disable-next-line no-param-reassign
  grid.tiles[pos.row][pos.col].type = roadType;
  const orientationResult = recomputeRoadDirections(grid, spawn, exit);
  if (!orientationResult.ok) {
    throw new Error(orientationResult.reason || "Invalid road placement");
  }
  const graph = buildGraph(grid, spawn, exit);
  const validation = validateSinglePath(graph);
  if (!validation.ok) {
    throw new Error(validation.reason || "Invalid road placement");
  }

  const pathWorld = [];
  // Handle case where pathNodes might be undefined or empty (no connection yet)
  const pathNodes = validation.pathNodes || [];
  for (const id of pathNodes) {
    if (id === graph.spawnId) {
      pathWorld.push({ ...spawn });
    } else if (id === graph.exitId) {
      pathWorld.push({ ...exit });
    } else {
      const [colStr, rowStr] = id.split(",");
      pathWorld.push({ col: Number(colStr), row: Number(rowStr) });
    }
  }

  // eslint-disable-next-line no-param-reassign
  gameState.path = pathWorld;
}

export function logPathRuleSanityChecks() {
  const grid = createInitialGrid(3, 3);
  const spawn = { col: 0, row: 1 };
  const exit = { col: 2, row: 1 };

  const straightResult = canPlaceRoad(grid, spawn, exit, { col: 1, row: 1 }, TILE_TYPES.ROAD_STRAIGHT);
  // eslint-disable-next-line no-console
  console.log("PathRules straight check (should be ok):", straightResult);

  const turnResult = canPlaceRoad(grid, spawn, exit, { col: 1, row: 1 }, TILE_TYPES.ROAD_TURN_SMALL);
  // eslint-disable-next-line no-console
  console.log("PathRules turn check (should fail):", turnResult);
}

if (typeof window !== "undefined" && window.DEBUG_PATH_RULES) {
  logPathRuleSanityChecks();
}


