/**
 * token-auto-flip.js
 * Instantly flips tokens horizontally (left/right)
 * BEFORE movement animation begins in Foundry VTT v13.
 */

Hooks.once("ready", () => {
  console.log("hearme-chat-notification | token-auto-flip (pre-move instant) active");

  const lastX = new Map();

  // Record initial token positions
  Hooks.on("canvasReady", (canvas) => {
    for (const token of canvas.tokens.placeables) {
      lastX.set(token.id, token.x);
    }
  });

  // Flip before movement animation occurs
  Hooks.on("preUpdateToken", async (tokenDoc, changes, options, userId) => {
    // Only react to x-movement changes
    if (!("x" in changes)) return;

    const oldX = lastX.get(tokenDoc.id) ?? tokenDoc.x;
    const newX = changes.x;
    if (newX === oldX) return;

    const movingRight = newX > oldX;
    const movingLeft  = newX < oldX;
    const currentScaleX = tokenDoc.texture.scaleX ?? 1;
    let targetScaleX = currentScaleX;

    // Determine flip direction instantly
    if (movingRight && currentScaleX > 0) targetScaleX = -Math.abs(currentScaleX);
    else if (movingLeft && currentScaleX < 0) targetScaleX = Math.abs(currentScaleX);

    if (targetScaleX === currentScaleX) {
      lastX.set(tokenDoc.id, newX);
      return;
    }

    // Apply immediately, disable animation/rendering delays
    await tokenDoc.update(
      { "texture.scaleX": targetScaleX },
      { animate: false, diff: false, render: false }
    );

    // Record new position baseline
    lastX.set(tokenDoc.id, newX);
  });

  Hooks.on("createToken", (doc) => lastX.set(doc.id, doc.x));
  Hooks.on("deleteToken", (doc) => lastX.delete(doc.id));
});
