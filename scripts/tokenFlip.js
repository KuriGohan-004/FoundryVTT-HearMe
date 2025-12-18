// hearme-chat-notification/scripts/autoFlip.js
Hooks.on("updateToken", async (tokenDoc, diff, options) => {
  // Avoid recursion from our own update
  if (options.autoFlip) return;

  // Only act when x has changed (horizontal movement)
  if (typeof diff.x !== "number") return;

  const oldX = tokenDoc.x;
  const newX = diff.x;

  // No horizontal change → skip
  if (newX === oldX) return;

  // Determine the desired mirror value
  const shouldMirror = newX > oldX;

  // Only update if it’s actually different
  if (tokenDoc.texture?.mirrorX !== shouldMirror) {
    await tokenDoc.update(
      { "texture.mirrorX": shouldMirror },
      { autoFlip: true }
    );
  }
});
