/**
 * token-depth-and-collision.js
 * Foundry VTT v13+
 * - Optional: Auto-sort token z-order by Y position (depth sorting)
 * - Optional: Prevent tokens from occupying the same grid spaces (full multi-grid support)
 * - Both features independently toggleable in module settings
 */

Hooks.once("init", () => {
  // Toggle depth auto-sorting
  game.settings.register("hearme-chat-notification", "tokenDepthSortingEnabled", {
    name: "Enable Token Depth Auto-Sorting",
    hint: "Tokens are automatically sorted in z-order based on their Y position (lower Y = drawn on top).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Toggle collision blocking
  game.settings.register("hearme-chat-notification", "tokenCollisionBlockingEnabled", {
    name: "Enable Token Collision Blocking",
    hint: "Prevents tokens from moving onto grid spaces already occupied by another token at the same elevation. Works for any token size (1x1, 2x2, etc.).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", () => {
  console.log("token-depth-and-collision | Module loaded: optional depth sorting + optional full-size collision blocking");

  let depthRefreshQueued = false;

  function queueDepthRefresh() {
    if (!game.settings.get("hearme-chat-notification", "tokenDepthSortingEnabled")) return;
    if (depthRefreshQueued) return;
    depthRefreshQueued = true;
    requestAnimationFrame(() => {
      depthRefreshQueued = false;
      updateAllTokenSorts();
    });
  }

  function updateAllTokenSorts() {
    if (!canvas?.tokens?.placeables) return;

    for (const token of canvas.tokens.placeables) {
      const newSort = Math.round(token.y);

      // Only update if owned, otherwise just set local _sort
      if (token.document.isOwner) {
        token.document.update(
          { sort: newSort },
          { diff: false, silent: true, noHook: true } // noHook to prevent recursion
        );
      } else {
        token.document._sort = newSort;
      }
    }

    // Sort placeables visually
    canvas.tokens.placeables.sort((a, b) => {
      const sortA = a.document.sort ?? a.document._sort ?? 0;
      const sortB = b.document.sort ?? b.document._sort ?? 0;
      return sortA - sortB;
    });

    canvas.tokens.refresh();
  }

  // Initial sort on canvas ready
  if (game.settings.get("hearme-chat-notification", "tokenDepthSortingEnabled")) {
    Hooks.on("canvasReady", () => {
      updateAllTokenSorts();
    });
  }

  // Refresh depth on relevant changes
  Hooks.on("updateToken", (doc, change) => {
    if (change.y !== undefined) queueDepthRefresh();
  });

  Hooks.on("controlToken", queueDepthRefresh);
  Hooks.on("releaseToken", queueDepthRefresh);

  // Optional: refresh on movement end (drag complete)
  Hooks.on("updateToken", (doc, change) => {
    if (change.x !== undefined || change.y !== undefined) {
      queueDepthRefresh();
    }
  });
});

/* -------------------------------------------- */
/* Prevent tokens from occupying same grid spaces (full size support) */
/* -------------------------------------------- */

Hooks.on("preUpdateToken", (tokenDoc, change, options, userId) => {
  // Only run if collision blocking is enabled
  if (!game.settings.get("hearme-chat-notification", "tokenCollisionBlockingEnabled")) return;

  if (change.x === undefined && change.y === undefined && change.elevation === undefined) {
    return; // No position change
  }

  const grid = canvas.grid;
  const gridSize = grid.size;

  const newX = change.x ?? tokenDoc.x;
  const newY = change.y ?? tokenDoc.y;
  const newElevation = change.elevation ?? tokenDoc.elevation;

  // Get width and height in grid units
  const tokenWidth = tokenDoc.width;
  const tokenHeight = tokenDoc.height;

  // Calculate all grid positions the token will occupy after move
  const occupiedGridPositions = new Set();

  for (let gx = 0; gx < tokenWidth; gx++) {
    for (let gy = 0; gy < tokenHeight; gy++) {
      const gridX = Math.round((newX + gx * gridSize) / gridSize);
      const gridY = Math.round((newY + gy * gridSize) / gridSize);
      occupiedGridPositions.add(`${gridX},${gridY}`);
    }
  }

  // Check against all other tokens
  for (const otherToken of canvas.tokens.placeables) {
    if (otherToken.id === tokenDoc.id) continue; // Skip self
    if (otherToken.document.elevation !== newElevation) continue; // Different elevation = allowed overlap

    const otherWidth = otherToken.document.width;
    const otherHeight = otherToken.document.height;

    for (let gx = 0; gx < otherWidth; gx++) {
      for (let gy = 0; gy < otherHeight; gy++) {
        const otherGridX = Math.round((otherToken.x + gx * gridSize) / gridSize);
        const otherGridY = Math.round((otherToken.y + gy * gridSize) / gridSize);
        const key = `${otherGridX},${otherGridY}`;

        if (occupiedGridPositions.has(key)) {
          // Collision detected!
          return false; // Cancel the update
        }
      }
    }
  }

  // No collision → allow move
  return true;
});
