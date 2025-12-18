// z-order.js
// Foundry VTT v13+ compatible - Revised with debounce and fallback hook for reliable init
// Tokens lower on canvas (higher Y) appear on top (higher sort value)

class ZOrderManager {
  static ID = "z-order";
  static refreshAttempts = 0;
  static MAX_REFRESH_ATTEMPTS = 3;

  // Refresh z-order for all tokens on the current scene
  static async refreshZOrder() {
    const canvas = ui.canvas;
    if (!canvas || !canvas.scene || !canvas.tokens) {
      if (this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
        this.refreshAttempts++;
        console.warn(`Z-Order | Canvas or scene not ready (attempt ${this.refreshAttempts}), retrying in 500ms`);
        setTimeout(() => ZOrderManager.refreshZOrder(), 500);
      } else {
        console.warn("Z-Order | Max refresh attempts reached; canvas may be unavailable");
      }
      return;
    }

    this.refreshAttempts = 0; // Reset on success

    const tokens = canvas.tokens.placeables
      .filter(t => t.document && t.visible && t.center && t.scene?.id === canvas.scene.id) // Scene-specific visible tokens
      .sort((a, b) => a.center.y - b.center.y); // Ascending Y: top-to-bottom

    console.log(`Z-Order | Refreshing ${tokens.length} tokens`);

    // Batch update sort values (0 = behind, higher = on top)
    const updates = tokens.map((token, idx) => ({
      _id: token.document.id,
      sort: idx // Lower Y = lower sort (behind)
    }));

    if (updates.length > 0) {
      await canvas.scene.updateEmbeddedDocuments("Token", updates);
      canvas.tokens.sortDirty = true; // Trigger PIXI re-sort
      console.log("Z-Order | Sort updated successfully");
    } else {
      console.log("Z-Order | No tokens to sort");
    }
  }

  // Hook: when a token finishes movement
  static async onUpdateToken(document, changes, options, userId) {
    const hasPositionChange = changes.x !== undefined || changes.y !== undefined;
    if (!hasPositionChange) return;

    console.log("Z-Order | Token position changed, awaiting move end");

    if (!options.animate || options.animate === false) {
      // Instant move: refresh immediately
      await this.refreshZOrder();
    } else {
      // Animated move: wait for completion
      const token = document.object;
      if (token) {
        // Use 'refresh' event for rendering/movement end in v13
        token.once("refresh", async () => {
          console.log("Z-Order | Token refresh event, re-sorting");
          await this.refreshZOrder();
        });
      }
    }
  }

  // Fallback initial sort via world time update (fires reliably post-ready)
  static async onUpdateWorldTime(worldTime, deltaTime) {
    if (this.refreshAttempts === 0 && ui.canvas?.scene) { // Only once per load
      console.log("Z-Order | Initial sort via time tick");
      await this.refreshZOrder();
    }
  }

  // Refresh on scene controls render (e.g., scene switch)
  static async onRenderSceneControls() {
    // Delay to ensure tokens are loaded
    setTimeout(async () => {
      console.log("Z-Order | Scene controls rendered, refreshing");
      await this.refreshZOrder();
    }, 200);
  }
}

// =============== HOOKS =================
Hooks.once("init", () => {
  console.log("Z-Order Module | Initializing vertical z-order (lower on screen = on top)");
});

Hooks.on("canvasReady", async () => {
  console.log("Z-Order | canvasReady hook fired");
  await ZOrderManager.refreshZOrder();
});

Hooks.on("updateWorldTime", (worldTime, deltaTime) => {
  ZOrderManager.onUpdateWorldTime(worldTime, deltaTime);
});

Hooks.on("renderSceneControls", () => {
  ZOrderManager.onRenderSceneControls();
});

Hooks.on("updateToken", (document, changes, options, userId) => {
  ZOrderManager.onUpdateToken(document, changes, options, userId);
});

// Optional: Refresh on scene change
Hooks.on("updateScene", async (scene, changes) => {
  if (changes.active) {
    console.log("Z-Order | Scene activated, refreshing");
    await ZOrderManager.refreshZOrder();
  }
});
