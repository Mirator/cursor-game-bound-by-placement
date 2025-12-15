import { TILE_TYPES } from "./grid.js";

function key(col, row) {
  return `${col},${row}`;
}

function neighborsOf(col, row, grid) {
  const out = [];
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of deltas) {
    const nx = col + dx;
    const ny = row + dy;
    if (nx >= 0 && ny >= 0 && nx < grid.cols && ny < grid.rows) {
      out.push({ col: nx, row: ny });
    }
  }
  return out;
}

function buildGraph(grid, spawn, exit) {
  const nodes = new Set();
  const edges = new Map(); // id -> Set of neighbor ids

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
        const neighs = neighborsOf(col, row, grid);
        for (const n of neighs) {
          const ntile = grid.tiles[n.row][n.col];
          if (
            ntile.type === TILE_TYPES.ROAD_STRAIGHT ||
            ntile.type === TILE_TYPES.ROAD_TURN_SMALL ||
            ntile.type === TILE_TYPES.ROAD_TURN_LONG
          ) {
            addEdge(id, key(n.col, n.row));
          }
        }
      }
    }
  }

  const spawnId = "S";
  const exitId = "E";

  // Connect spawn / exit if adjacent to a road tile
  const sNeighbors = neighborsOf(spawn.col, spawn.row, grid);
  for (const n of sNeighbors) {
    const tile = grid.tiles[n.row][n.col];
    if (
      tile.type === TILE_TYPES.ROAD_STRAIGHT ||
      tile.type === TILE_TYPES.ROAD_TURN_SMALL ||
      tile.type === TILE_TYPES.ROAD_TURN_LONG
    ) {
      addEdge(spawnId, key(n.col, n.row));
    }
  }

  const eNeighbors = neighborsOf(exit.col, exit.row, grid);
  for (const n of eNeighbors) {
    const tile = grid.tiles[n.row][n.col];
    if (
      tile.type === TILE_TYPES.ROAD_STRAIGHT ||
      tile.type === TILE_TYPES.ROAD_TURN_SMALL ||
      tile.type === TILE_TYPES.ROAD_TURN_LONG
    ) {
      addEdge(exitId, key(n.col, n.row));
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
    return { ok: true, reason: null, path: [] };
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

  // Temporarily mutate, build graph, then revert
  const originalType = tile.type;
  // eslint-disable-next-line no-param-reassign
  grid.tiles[pos.row][pos.col].type = roadType;

  const graph = buildGraph(grid, spawn, exit);
  const validation = validateSinglePath(graph);

  // revert
  // eslint-disable-next-line no-param-reassign
  grid.tiles[pos.row][pos.col].type = originalType;

  return validation;
}

export function applyRoadPlacement(gameState, pos, roadType) {
  const { grid, spawn, exit } = gameState;
  // apply
  // eslint-disable-next-line no-param-reassign
  grid.tiles[pos.row][pos.col].type = roadType;
  const graph = buildGraph(grid, spawn, exit);
  const validation = validateSinglePath(graph);
  if (!validation.ok) {
    throw new Error(validation.reason || "Invalid road placement");
  }

  const pathWorld = [];
  for (const id of validation.pathNodes) {
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


