Hooks.once("ready", () => {
  console.log("token-auto-flip | instant flip + normal move active");

  const lastX = new Map();
  const FACE_KEY = "KeyT";

  Hooks.on("canvasReady", (canvas) => {
    for (const token of canvas.tokens.placeables) {
      lastX.set(token.id, token.x);
    }
  });

  Hooks.on("preUpdateToken", (tokenDoc, changes, options, userId) => {
    if (!("x" in changes)) return;
    const oldX = lastX.get(tokenDoc.id) ?? tokenDoc.x;
    const newX = changes.x;
    if (newX === oldX) return;

    const movingRight = newX > oldX;
    const movingLeft  = newX < oldX;
    const currentScaleX = tokenDoc.texture.scaleX ?? 1;
    let targetScaleX = currentScaleX;

    if (movingRight && currentScaleX > 0) targetScaleX = -Math.abs(currentScaleX);
    else if (movingLeft && currentScaleX < 0) targetScaleX = Math.abs(currentScaleX);

    if (targetScaleX !== currentScaleX) {
      // --- Instant flip on the token's PIXI object directly
      const token = canvas.tokens.get(tokenDoc.id);
      if (token?.texture) token.texture.scale.x = targetScaleX;
      // Update the document's scale so it persists, but don't animate or interfere with movement
      tokenDoc.updateSource({ "texture.scaleX": targetScaleX });
    }

    lastX.set(tokenDoc.id, newX);
  });

  Hooks.on("createToken", (doc) => lastX.set(doc.id, doc.x));
  Hooks.on("deleteToken", (doc) => lastX.delete(doc.id));

  // --- Face cursor key
  window.addEventListener("keydown", (event) => {
    if (event.code !== FACE_KEY) return;
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

    const controlled = canvas.tokens.controlled;
    if (!controlled?.length) return;
    const mouse = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
    if (!mouse) return;

    for (const token of controlled) {
      const centerX = token.center.x;
      const facingRight = mouse.x > centerX;
      const facingLeft = mouse.x < centerX;

      const tokenDoc = token.document;
      const currentScaleX = tokenDoc.texture.scaleX ?? 1;
      let targetScaleX = currentScaleX;

      if (facingRight && currentScaleX > 0) targetScaleX = -Math.abs(currentScaleX);
      else if (facingLeft && currentScaleX < 0) targetScaleX = Math.abs(currentScaleX);

      if (targetScaleX !== currentScaleX) {
        token.texture.scale.x = targetScaleX; // Instant flip
        tokenDoc.updateSource({ "texture.scaleX": targetScaleX }); // Persist flip
      }
    }
  });
});
