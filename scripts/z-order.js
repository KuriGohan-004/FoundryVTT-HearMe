function updateTokenSort(token) {
  if (!token) return;
  token.document.update({ sort: Math.round(token.y) });
}

Hooks.on("canvasReady", () => {
  canvas.tokens.placeables.forEach(updateTokenSort);
});

Hooks.on("updateToken", (doc) => {
  updateTokenSort(doc.object);
});
