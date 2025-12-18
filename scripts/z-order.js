// z-order.js
// Foundry VTT v13+ compatible - Revised for reliable sorting via Token.sort
// Tokens lower on canvas (higher Y) appear on top (higher sort value)

class ZOrderManager {
  static ID = "z-order";

  // Refresh z-order for all tokens on the current scene
  static async refreshZOrder() {
    const canvas = ui.canvas;
    if (!canvas?.scene || !canvas.tokens) {
      console.warn("Z-Order | Canvas or scene not ready");
      return;
    }

    const tokens = canvas.tokens.placeables
      .filter(t => t.document && t.visible && t.center) // Visible tokens with position
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
      canvas.tokens.render();
      console.log("Z-Order | Sort updated successfully");
    }
  }

  // Hook: when a token finishes movement
  static async onUpdateToken(document, changes, options, userId) {
    if (!game.user.isGM) return; // Optional: GM-only to avoid spam

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
        token.once("stop", async () => { // v13 uses 'stop' for move end
          console.log("Z-Order | Move animation ended, refreshing");
          await this.refreshZOrder();
        });
      }
    }
  }

  // Initial sort when canvas is ready
  static async onCanvasReady() {
    console.log("Z-Order | Canvas ready, initial sort");
    await this.refreshZOrder();
  }

  // Refresh on scene controls render (e.g., scene switch)
  static async onRenderSceneControls() {
    // Delay to ensure tokens are loaded
    setTimeout(async () => {
      await this.refreshZOrder();
    }, 200);
  }
}

// =============== HOOKS =================
Hooks.once("init", () => {
  console.log("Z-Order Module | Initializing vertical z-order (lower on screen = on top)");
});

Hooks.on("canvasReady", () => {
  ZOrderManager.onCanvasReady();
});

Hooks.on("renderSceneControls", () => {
  ZOrderManager.onRenderSceneControls();
});

Hooks.on("updateToken", (document, changes, options, userId) => {
  ZOrderManager.onUpdateToken(document, changes, options, userId);
});

// Optional: Refresh on scene change
Hooks.on("updateScene", async () => {
  await ZOrderManager.refreshZOrder();
});
