function updateTokenSort(token) {
  if (!token) return;
  token.sort = Math.round(token.y);
}

Hooks.on("canvasReady", () => {
  canvas.tokens.placeables.forEach(updateTokenSort);
});

Hooks.on("refreshToken", (token) => {
  updateTokenSort(token);
});
