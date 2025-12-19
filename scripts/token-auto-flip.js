/**
 * token-auto-flip.js
 * Foundry VTT v13
 * - Flips tokens to face movement direction
 * - HALTS movement if token is not facing that direction
 * - Adds "face target" hotkey: press T to instantly flip toward mouse cursor
 */

Hooks.once("ready", () => {
  console.log("token-auto-flip | instant pre-move + face key active");

  const lastX = new Map();
  const FACE_KEY = "KeyT";
  const FLIP_SPEED = { animate: false, diff: false, render: false };

  // Record starting positions
  Hooks.on("canvasReady", (canvas) => {
    for (const token of canvas.tokens.placeables) {
      lastX.set(token.id, token.x);
    }
  });

  // Flip before move, halt movement if not facing direction
  Hooks.on("preUpdateToken", async (tokenDoc, changes, options, userId) => {
    if (!("x" in changes)) return;

    const oldX = tokenDoc.x;
    const newX = changes.x;
    if (newX === oldX) return;

    const movingRight = newX > oldX;
    const movingLeft = newX < oldX;
    const currentScaleX = tokenDoc.texture.scaleX ?? 1;

    // Determine facing based on scale
    const facingRight = currentScaleX < 0;  // negative scale = facing right
    const facingLeft = currentScaleX > 0;   // positive scale = facing left

    let needFlip = false;

    if (movingRight && facingLeft) needFlip = true;
    if (movingLeft && facingRight) needFlip = true;

    if (needFlip) {
      // Flip token
      const targetScaleX = movingRight ? -Math.abs(currentScaleX) : Math.abs(currentScaleX);
      await tokenDoc.update({ "texture.scaleX": targetScaleX }, FLIP_SPEED);

      // Halt movement by removing x change
      delete changes.x;

      // Update lastX to current position
      lastX.set(tokenDoc.id, oldX);
    } else {
      // Already facing correct direction → allow move
      lastX.set(tokenDoc.id, newX);
    }
  });

  Hooks.on("createToken", (doc) => lastX.set(doc.id, doc.x));
  Hooks.on("deleteToken", (doc) => lastX.delete(doc.id));

  // Face target key
  window.addEventListener("keydown", async (event) => {
    if (event.code !== FACE_KEY) return;

    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

    const controlled = canvas.tokens.controlled;
    if (!controlled?.length) return;
    const mouse = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
    if (!mouse) return;

    for (const token of controlled) {
      const centerX = token.center.x;
      const tokenDoc = token.document;
      const currentScaleX = tokenDoc.texture.scaleX ?? 1;
      let targetScaleX = currentScaleX;

      if (mouse.x > centerX) targetScaleX = -Math.abs(currentScaleX);
      else if (mouse.x < centerX) targetScaleX = Math.abs(currentScaleX);

      if (targetScaleX !== currentScaleX)
        await tokenDoc.update({ "texture.scaleX": targetScaleX }, FLIP_SPEED);
    }
  });
});
