// Create a container for the token images
let containerId = "player-owned-tokens-bar";
let container = document.getElementById(containerId);
if (!container) {
  container = document.createElement("div");
  container.id = containerId;
  document.body.appendChild(container);

  // Style the container fixed at bottom of screen
  Object.assign(container.style, {
    position: "fixed",
    bottom: "0",
    left: "0",
    right: "0",
    height: "80px",
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "left",
    gap: "10px",
    padding: "5px 10px",
    overflowX: "auto",
    zIndex: 9999,
  });
}

// Clear previous tokens
container.innerHTML = "";

// Get all player-owned tokens on current scene
let tokens = canvas.tokens.placeables.filter(t => {
  return t.actor?.hasPlayerOwner;
});

// Create token images
tokens.forEach(token => {
  let img = document.createElement("img");
  img.src = token.texture.src;
  img.title = token.name;
  img.style.width = "64px";
  img.style.height = "64px";
  img.style.borderRadius = "8px";
  img.style.cursor = "pointer";
  img.style.objectFit = "cover";
  img.style.border = "2px solid #fff";

  // Left click: center view on token
  img.addEventListener("click", (e) => {
    canvas.animatePan({ x: token.x + token.width * canvas.grid.size / 2, y: token.y + token.height * canvas.grid.size / 2 });
  });

  // Right click: open token actor sheet
  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (token.actor) token.actor.sheet.render(true);
  });

  container.appendChild(img);
});
