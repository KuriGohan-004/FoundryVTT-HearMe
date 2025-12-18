// hearme-chat-notification/tokenFlip.js

Hooks.on("updateToken", async (tokenDoc, change, options, userId) => {
  // Prevent infinite loops
  if (options.hearmeFlip) return;

  // Only care about horizontal movement
  if (typeof change.x !== "number") return;

  const oldX = tokenDoc.x;
  const newX = change.x;

  if (newX === oldX) return;

  // Moving right → face right (mirror ON)
  if (newX > oldX && !tokenDoc.texture.mirrorX) {
    await tokenDoc.update(
      { "texture.mirrorX": true },
      { hearmeFlip: true }
    );
  }

  // Moving left → face left (mirror OFF)
  if (newX < oldX && tokenDoc.texture.mirrorX) {
    await tokenDoc.update(
      { "texture.mirrorX": false },
      { hearmeFlip: true }
    );
  }
});
