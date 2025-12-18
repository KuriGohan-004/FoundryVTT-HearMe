/**
 * token-auto-flip.js
 * Foundry VTT v13
 * - Instantly flips tokens before they move (left/right movement)
 * - Adds "face target" hotkey: press T to instantly flip toward mouse cursor
 */

Hooks.once("ready", () => {
  console.log("hearme-chat-notification | token-auto-flip (instant pre-move + face key) active");

  const lastX = new Map();
  const FACE_KEY = "KeyT"; // Default: 'T' key (use event.code)
  const FLIP_SPEED = { animate: false, diff: false, render: false };

  // --- 1️⃣ Record starting positions
  Hooks.on("canvasReady", (canvas) => {
    for (const token of canvas.tokens.placeables) {
      lastX.set(token.id, token.x);
    }
  });

  // --- 2️⃣ Instant flip before move animation
  Hooks.on("preUpdateToken", async (tokenDoc, changes, options, userId) => {
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

    if (targetScaleX !== currentScaleX)
      await tokenDoc.update({ "texture.scaleX": targetScaleX }, FLIP_SPEED);

    lastX.set(tokenDoc.id, newX);
  });

  Hooks.on("createToken", (doc) => lastX.set(doc.id, doc.x));
  Hooks.on("deleteToken", (doc) => lastX.delete(doc.id));

  // --- 3️⃣ Target key press to face cursor instantly
  window.addEventListener("keydown", async (event) => {
    if (event.code !== FACE_KEY) return;

    // Ignore if typing in chat, form, or input
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

      if (targetScaleX !== currentScaleX)
        await tokenDoc.update({ "texture.scaleX": targetScaleX }, FLIP_SPEED);
    }
  });
});
