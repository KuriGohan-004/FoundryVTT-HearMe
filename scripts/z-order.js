function updateTokenSort(token) {
  if (!token) return;
  token.document.update({ sort: Math.round(token.y) });
}

Hooks.on("canvasReady", () => {
  canvas.tokens.placeables.forEach(updateTokenSort);
});

Hooks.on("updateToken", (doc, change) => {
  if (change.x !== undefined || change.y !== undefined) {
    updateTokenSort(doc.object);
  }
});
