/**
 * token-auto-flip.js
 * Part of the hearme-chat-notification module for FoundryVTT 13
 *
 * Behavior:
 *  - When a token moves to the right (x increases), its image mirrors on the X axis.
 *  - When a token moves to the left (x decreases), it restores to normal.
 */

Hooks.once("ready", () => {
  console.log("hearme-chat-notification | token-auto-flip.js active");

  // Store the last known X position of each token
  const lastPositions = new Map();

  // Initialize when scene is ready
  Hooks.on("canvasReady", (canvas) => {
    for (const token of canvas.tokens.placeables) {
      lastPositions.set(token.id, token.x);
    }
  });

  // Listen for token movement
  Hooks.on("updateToken", async (tokenDoc, updateData, options, userId) => {
    try {
      const oldX = lastPositions.get(tokenDoc.id) ?? tokenDoc.x;
      const newX = updateData.x ?? oldX;

      // No X change → do nothing
      if (oldX === newX) return;

      const movingRight = newX > oldX;
      const movingLeft = newX < oldX;

      // Flip horizontally when moving right, unflip when moving left
      if (movingRight && !tokenDoc.texture.mirrorX) {
        await tokenDoc.update({ "texture.mirrorX": true });
      } else if (movingLeft && tokenDoc.texture.mirrorX) {
        await tokenDoc.update({ "texture.mirrorX": false });
      }

      // Update stored X position
      lastPositions.set(tokenDoc.id, newX);
    } catch (err) {
      console.error("Error in token-auto-flip.js:", err);
    }
  });

  // Handle token creation/deletion gracefully
  Hooks.on("createToken", (tokenDoc) => {
    lastPositions.set(tokenDoc.id, tokenDoc.x);
  });

  Hooks.on("deleteToken", (tokenDoc) => {
    lastPositions.delete(tokenDoc.id);
  });
});
