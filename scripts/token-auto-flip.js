/**
 * token-auto-flip.js
 * Foundry VTT v13+
 * - Flips tokens to face movement direction (A/D or arrows)
 * - Optional: Press T to make selected tokens face mouse cursor (with toggle on same row)
 * - Configurable in module settings
 */

Hooks.once("init", () => {
  // Module setting to enable/disable the "Face Target with T" feature
  game.settings.register("hearme-chat-notification", "tokenFaceTargetEnabled", {
    name: "Enable Token Face Target (T Key)",
    hint: "When enabled, pressing T makes selected tokens face the mouse cursor. If mouse is on the same vertical line, it toggles facing direction.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", () => {
  console.log("token-auto-flip | Module loaded: auto-flip on movement + optional face target (T)");

  const FLIP_SPEED = { animate: false, diff: false, render: false };
  const FACE_KEY = "KeyT";
  const VERTICAL_TOLERANCE = 20; // pixels – how close Y must be to count as "same row"

  // --- Auto-flip on horizontal movement (A/D or ArrowLeft/Right) ---
  window.addEventListener("keydown", async (event) => {
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

    const controlled = canvas.tokens.controlled;
    if (!controlled?.length) return;

    const moveRightKeys = ["ArrowRight", "KeyD"];
    const moveLeftKeys = ["ArrowLeft", "KeyA"];

    const wantMoveRight = moveRightKeys.includes(event.code);
    const wantMoveLeft = moveLeftKeys.includes(event.code);

    if (!wantMoveRight && !wantMoveLeft) return;

    let flippedAny = false;

    for (const token of controlled) {
      const tokenDoc = token.document;
      const currentScaleX = tokenDoc.texture.scaleX ?? 1;
      const facingRight = currentScaleX < 0; // negative scaleX = facing right (mirrored)

      let needFlip = false;
      if (wantMoveRight && currentScaleX > 0) needFlip = true;  // facing left, want right
      if (wantMoveLeft && currentScaleX < 0) needFlip = true;   // facing right, want left

      if (needFlip) {
        const targetScaleX = wantMoveRight ? -Math.abs(currentScaleX) : Math.abs(currentScaleX);
        await tokenDoc.update({ "texture.scaleX": targetScaleX }, FLIP_SPEED);
        flippedAny = true;
      }
    }

    if (flippedAny) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true); // Capture phase to intercept before Foundry's movement

  // --- Face Target Hotkey (T) ---
  window.addEventListener("keydown", async (event) => {
    if (event.code !== FACE_KEY) return;

    // Check if feature is enabled
    if (!game.settings.get("hearme-chat-notification", "tokenFaceTargetEnabled")) return;

    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

    const controlled = canvas.tokens.controlled;
    if (!controlled?.length) return;

    // Use reliable canvas.mousePosition (in stage coordinates)
    const mouse = canvas.mousePosition;
    if (!mouse) return;

    for (const token of controlled) {
      const center = token.center;
      const tokenDoc = token.document;
      const currentScaleX = tokenDoc.texture.scaleX ?? 1;
      const currentlyFacingRight = currentScaleX < 0;

      let targetScaleX = currentScaleX;

      const deltaX = mouse.x - center.x;
      const deltaY = Math.abs(mouse.y - center.y);

      if (deltaY <= VERTICAL_TOLERANCE) {
        // Mouse is roughly on the same vertical line → toggle direction
        targetScaleX = currentlyFacingRight ? Math.abs(currentScaleX) : -Math.abs(currentScaleX);
      } else if (deltaX > 0) {
        // Mouse to the right → face right
        targetScaleX = -Math.abs(currentScaleX);
      } else if (deltaX < 0) {
        // Mouse to the left → face left
        targetScaleX = Math.abs(currentScaleX);
      }
      // Else: exactly on center X and outside Y tolerance → no change

      if (targetScaleX !== currentScaleX) {
        await tokenDoc.update({ "texture.scaleX": targetScaleX }, FLIP_SPEED);
      }
    }
  });
});
