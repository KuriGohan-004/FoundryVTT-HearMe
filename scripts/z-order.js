Hooks.on("updateToken", async (tokenDoc, diff, options) => {
  // Only run if autoZOrder is enabled
  if (!game.settings.get("hearme-chat-notification", "autoZOrder")) return;

  // Prevent recursion
  if (options.hearmeZOrder) return;

  // Get all tokens on the same scene
  const tokens = tokenDoc.parent.tokens.contents;

  // Sort tokens by Y position ascending (top of grid = lowest y)
  const sorted = tokens.slice().sort((a, b) => a.y - b.y);

  // Update z-index of each token to match sorted order
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    // Only update if zIndex differs
    if (t.zIndex !== i) {
      await t.update({ "flags.hearmeZIndex": i }, { hearmeZOrder: true });
    }
  }
});

// Hook to redraw tokens after update
Hooks.on("renderToken", (token, html, data) => {
  const zIndex = token.getFlag("hearme-chat-notification", "hearmeZIndex");
  if (typeof zIndex === "number") {
    token.object.zIndex = zIndex;
  }
});
