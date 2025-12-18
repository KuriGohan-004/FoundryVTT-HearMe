/**
 * token-auto-flip.js
 * Instantly flips tokens horizontally when moving right or left in Foundry VTT v13.
 * No animation, rotation, or indicators — true instantaneous sprite flip.
 */

Hooks.once("ready", () => {
  console.log("hearme-chat-notification | token-auto-flip (instant) active");

  const lastX = new Map();

  // Track starting positions
  Hooks.on("canvasReady", (canvas) => {
    for (const token of canvas.tokens.placeables) {
      lastX.set(token.id, token.x);
    }
  });

  Hooks.on("updateToken", async (tokenDoc, changes, options, userId) => {
    // Only handle position changes by user (not internal Foundry updates)
    if (!("x" in changes)) return;

    const oldX = lastX.get(tokenDoc.id) ?? tokenDoc.x;
    const newX = changes.x;
    if (newX === oldX) return;

    const movingRight = newX > oldX;
    const movingLeft  = newX < oldX;
    const currentScaleX = tokenDoc.texture.scaleX ?? 1;
    let targetScaleX = currentScaleX;

    // Determine direction → flip immediately
    if (movingRight && currentScaleX > 0) targetScaleX = -Math.abs(currentScaleX);
    else if (movingLeft && currentScaleX < 0) targetScaleX = Math.abs(currentScaleX);

    // Skip if no change
    if (targetScaleX === currentScaleX) {
      lastX.set(tokenDoc.id, newX);
      return;
    }

    // Update without animation or vision refresh
    await tokenDoc.update(
      { "texture.scaleX": targetScaleX },
      { animate: false, diff: false, render: false }
    );

    lastX.set(tokenDoc.id, newX);
  });

  Hooks.on("createToken", (doc) => lastX.set(doc.id, doc.x));
  Hooks.on("deleteToken", (doc) => lastX.delete(doc.id));
});
