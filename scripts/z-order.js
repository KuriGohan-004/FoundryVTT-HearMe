function updateTokenSort(token) {
  if (!token) return;
  const y = Math.round(token.y);
  if (token.document.sort === y) return;
  token.document.update({ sort: y });
}

Hooks.on("canvasReady", () => {
  canvas.tokens.placeables.forEach(updateTokenSort);
});

Hooks.on("preUpdateToken", (doc, change) => {
  if (change.x !== undefined || change.y !== undefined) {
    const token = doc.object;
    if (!token) return;

    const y = Math.round(change.y ?? token.y);
    if (doc.sort === y) return;

    doc.update({ sort: y });
  }
});
