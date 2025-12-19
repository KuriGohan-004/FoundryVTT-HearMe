/**
 * token-auto-flip.js
 * Foundry VTT v13
 * - Flips tokens to face movement direction
 * - HALTS movement if token is not facing that direction
 * - Adds a short flip lock to prevent simultaneous movement
 * - Adds "face target" hotkey: press T to instantly flip toward mouse cursor
 */

Hooks.once("ready", () => {
  console.log("token-auto-flip | flip lock active");

  const FLIP_SPEED = { animate: false, diff: false, render: false };
  const FACE_KEY = "KeyT";
  const flipLock = new Map(); // token.id -> timestamp until movement is locked
  const LOCK_DURATION = 100; // milliseconds

  // --- Flip before move, halt movement if not facing direction
  Hooks.on("preUpdateToken", async (tokenDoc, changes, options, userId) => {
    if (!("x" in changes)) return;

    const oldX = tokenDoc.x;
    const newX = changes.x;
    if (newX === oldX) return;

    const now = Date.now();
    if (flipLock.get(tokenDoc.id) > now) {
      // Token is locked: cancel movement
      changes.x = oldX;
      return;
    }

    const movingRight = newX > oldX;
    const movingLeft = newX < oldX;
    const currentScaleX = tokenDoc.texture.scaleX ?? 1;

    const facingRight = currentScaleX < 0;
    const facingLeft = currentScaleX > 0;

    const needFlip = (movingRight && facingLeft) || (movingLeft && facingRight);

    if (needFlip) {
      // Flip token
      const targetScaleX = movingRight ? -Math.abs(currentScaleX) : Math.abs(currentScaleX);
      await tokenDoc.update({ "texture.scaleX": targetScaleX }, FLIP_SPEED);

      // Cancel movement
      changes.x = oldX;

      // Lock further movement briefly
      flipLock.set(tokenDoc.id, now + LOCK_DURATION);
    }
  });

  // --- Face target hotkey
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
