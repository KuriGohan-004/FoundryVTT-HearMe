// Container ID
const containerId = "player-owned-tokens-bar";

function createContainer() {
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
      transition: "opacity 0.3s ease",
    });
  }
  return container;
}

function updateTokenBar() {
  const container = createContainer();

  // Hide container if combat is active
  if (game.combat && game.combat.started) {
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    return;
  } else {
    container.style.opacity = "1";
    container.style.pointerEvents = "auto";
  }

  // Clear previous tokens
  container.innerHTML = "";

  // Get all tokens on the current scene that are player-owned
  // We'll check token ownership based on the token's own permissions (token.actorOwnership),
  // or fallback to actor ownership if token permissions not defined
  const tokens = canvas.tokens.placeables.filter(t => {
    if (!t.actor) return false;

    // Check token ownership permissions first
    const tokenPermission = t.data.permission;
    const isPlayerOwned = Object.entries(tokenPermission).some(([userId, perm]) => {
      const user = game.users.get(userId);
      return user && user.isPlayer && perm >= CONST.DOCUMENT_PERMISSION_LEVELS.OWNER;
    });

    // If no token permissions found, fallback to actor ownership check
    const actorPermission = t.actor.permission;
    const isActorPlayerOwned = Object.entries(actorPermission).some(([userId, perm]) => {
      const user = game.users.get(userId);
      return user && user.isPlayer && perm >= CONST.DOCUMENT_PERMISSION_LEVELS.OWNER;
    });

    return isPlayerOwned || isActorPlayerOwned;
  });

  // Create token images
  tokens.forEach(token => {
    const img = document.createElement("img");
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
      canvas.animatePan({
        x: token.x + (token.width * canvas.grid.size) / 2,
        y: token.y + (token.height * canvas.grid.size) / 2,
      });
    });

    // Right click: open token actor sheet
    img.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (token.actor) token.actor.sheet.render(true);
    });

    container.appendChild(img);
  });
}

// Initial draw
updateTokenBar();

// Update the bar whenever the scene changes or tokens update
Hooks.on("updateToken", updateTokenBar);
Hooks.on("createToken", updateTokenBar);
Hooks.on("deleteToken", updateTokenBar);
Hooks.on("updateCombat", updateTokenBar);
Hooks.on("combatStart", updateTokenBar);
Hooks.on("combatEnd", updateTokenBar);
Hooks.on("canvasReady", updateTokenBar);
Hooks.on("renderSceneControls", updateTokenBar);
