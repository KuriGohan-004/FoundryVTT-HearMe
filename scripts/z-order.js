function updateTokenSort(token) {
  if (!token) return;
  const y = Math.round(token.y);
  if (token.document.sort === y) return;
  token.document.update({ sort: y }, { animate: false });
}

Hooks.on("canvasReady", () => {
  canvas.tokens.placeables.forEach(updateTokenSort);
});

Hooks.on("preUpdateToken", (doc, change) => {
  if (change.x !== undefined || change.y !== undefined) {
    updateTokenSort(doc.object);
  }
});
