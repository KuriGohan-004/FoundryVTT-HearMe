/**
 * token-auto-flip.js
 * Foundry VTT v13
 * - Flips tokens to face movement direction
 * - NO automatic movement when flipping
 * - Only moves if already facing the intended direction
 * - Adds "face target" hotkey (T)
 */

Hooks.once("ready", () => {
  console.log("token-auto-flip | flip without movement active");

  const FLIP_SPEED = { animate: false, diff: false, render: false };
  const FACE_KEY = "KeyT";

  // --- Keyboard movement interception
  window.addEventListener("keydown", async (event) => {
    // Ignore if typing in chat/input
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

    const controlled = canvas.tokens.controlled;
    if (!controlled?.length) return;

    const moveRightKeys = ["ArrowRight", "KeyD"];
    const moveLeftKeys  = ["ArrowLeft", "KeyA"];

    let wantMoveRight = moveRightKeys.includes(event.code);
    let wantMoveLeft  = moveLeftKeys.includes(event.code);

    // If key is not horizontal movement, ignore
    if (!wantMoveRight && !wantMoveLeft) return;

    for (const token of controlled) {
      const tokenDoc = token.document;
      const currentScaleX = tokenDoc.texture.scaleX ?? 1;

      const facingRight = currentScaleX < 0;
      const facingLeft  = currentScaleX > 0;

      // Determine if flip is needed
      let needFlip = false;
      if (wantMoveRight && facingLeft) needFlip = true;
      if (wantMoveLeft && facingRight) needFlip = true;

      if (needFlip) {
        // Flip token
        const targetScaleX = wantMoveRight ? -Math.abs(currentScaleX) : Math.abs(currentScaleX);
        await tokenDoc.update({ "texture.scaleX": targetScaleX }, FLIP_SPEED);

        // Prevent default movement
        event.preventDefault();
        event.stopImmediatePropagation();
        return; // Only flip once
      }
    }
  }, true); // use capture phase to intercept before Foundry

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
