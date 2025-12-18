/**
 * Token Auto-Flip on Movement (Left/Right)
 * Foundry VTT v13+
 */

const MODULE_ID = "token-auto-flip";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);
});

Hooks.on("preUpdateToken", (tokenDoc, updateData, options, userId) => {
  // We only care about position changes (x or y)
  if (!updateData.x && !updateData.y) return;

  const token = tokenDoc.object; // The Token canvas object
  if (!token) return;

  const prevX = tokenDoc.x;
  const newX = updateData.x ?? tokenDoc.x;

  // If there's no horizontal movement, don't do anything
  if (newX === prevX) return;

  const movingRight = newX > prevX;
  
  // Only change if it's actually different from current state
  if (token.texture.scaleX === 1 && !movingRight) {
    // Was facing right, now moving left → flip
    tokenDoc.update({ "texture.scaleX": -1 });
  } else if (token.texture.scaleX === -1 && movingRight) {
    // Was facing left, now moving right → unflip
    tokenDoc.update({ "texture.scaleX": 1 });
  }
});
