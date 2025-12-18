/**
 * token-auto-flip.js
 * Auto-flips tokens horizontally in Foundry VTT 13 when they move left or right.
 * No rotation, indicators, or delays — instant flip.
 */

Hooks.once("ready", () => {
  console.log("hearme-chat-notification | token-auto-flip active");

  const lastPositions = new Map();

  Hooks.on("canvasReady", (canvas) => {
    for (const token of canvas.tokens.placeables) {
      lastPositions.set(token.id, token.x);
    }
  });

  Hooks.on("updateToken", (tokenDoc, changes, options, userId) => {
    try {
      if (!("x" in changes)) return; // only care about X movement

      const prevX = lastPositions.get(tokenDoc.id) ?? tokenDoc.x;
      const newX = changes.x;
      if (newX === prevX) return;

      const movingRight = newX > prevX;
      const movingLeft  = newX < prevX;

      const currentScaleX = tokenDoc.texture.scaleX ?? 1;
      let targetScaleX = currentScaleX;

      if (movingRight && currentScaleX > 0) targetScaleX = -Math.abs(currentScaleX);
      else if (movingLeft && currentScaleX < 0) targetScaleX = Math.abs(currentScaleX);

      if (targetScaleX !== currentScaleX) {
        tokenDoc.update({ "texture.scaleX": targetScaleX });
      }

      lastPositions.set(tokenDoc.id, newX);
    } catch (e) {
      console.error("token-auto-flip | Error flipping token:", e);
    }
  });

  Hooks.on("createToken", (doc) => lastPositions.set(doc.id, doc.x));
  Hooks.on("deleteToken", (doc) => lastPositions.delete(doc.id));
});
