const MODULE_ID = "token-auto-flip";

Hooks.once("init", () => {
  // Optional: add a module setting to enable/disable
  game.settings.register(MODULE_ID, "enabled", {
    name: "Enable Auto Flip on Movement",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

// Best hook for v13+ — fires when movement animation begins
Hooks.on("tokenMoveStart", (token, direction) => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!token.actor) return; // safety

  if (direction.dx === 0) return;

  const faceLeft = direction.dx < 0;
  const newScaleX = faceLeft ? -1 : 1;

  // Avoid unnecessary updates
  if (token.document.texture.scaleX !== newScaleX) {
    token.document.update({ "texture.scaleX": newScaleX });
  }
});
