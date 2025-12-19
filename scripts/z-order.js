let depthRefreshQueued = false;

function queueDepthRefresh() {
  if (depthRefreshQueued) return;
  depthRefreshQueued = true;

  requestAnimationFrame(() => {
    depthRefreshQueued = false;
    updateAllTokenSorts();
  });
}

function updateAllTokenSorts() {
  if (!canvas?.tokens) return;

  for (const token of canvas.tokens.placeables) {
    token.document.update(
      { sort: Math.round(token.y) },
      { diff: false, silent: true }
    );
  }

  canvas.tokens.placeables.sort((a, b) => a.document.sort - b.document.sort);
  canvas.tokens.refresh();
}

Hooks.on("canvasReady", () => {
  updateAllTokenSorts();
});

Hooks.on("updateToken", (doc, change) => {
  if (change.y === undefined) return;
  queueDepthRefresh();
});

Hooks.on("controlToken", () => {
  queueDepthRefresh();
});

Hooks.on("releaseToken", () => {
  queueDepthRefresh();
});





/* -------------------------------------------- */
/* Prevent tokens from occupying same grid + elevation */
/* -------------------------------------------- */

Hooks.on("preUpdateToken", (doc, change, options, userId) => {
  // Only care about movement or elevation changes
  if (change.x === undefined && change.y === undefined && change.elevation === undefined) {
    return;
  }

  const gridSize = canvas.grid.size;

  // Determine the token's new position
  const newX = change.x ?? doc.x;
  const newY = change.y ?? doc.y;
  const newElevation = change.elevation ?? doc.elevation;

  // Snap to grid space
  const newGridX = Math.round(newX / gridSize);
  const newGridY = Math.round(newY / gridSize);

  // Check all other tokens
  for (const token of canvas.tokens.placeables) {
    if (token.document.id === doc.id) continue;

    const otherGridX = Math.round(token.x / gridSize);
    const otherGridY = Math.round(token.y / gridSize);

    if (
      otherGridX === newGridX &&
      otherGridY === newGridY &&
      token.document.elevation === newElevation
    ) {
      return false; // ❌ Cancel the move
    }
  }
});
