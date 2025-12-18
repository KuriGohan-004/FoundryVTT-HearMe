// z-order.js
// Foundry VTT v13+ compatible
// Makes tokens lower on the canvas appear on top of tokens higher up (natural scrolling feel)

class ZOrderManager {
  static ID = "z-order";

  // Refresh z-order for all tokens on the current view
  static refreshZOrder() {
    const canvas = ui.canvas;
    if (!canvas || !canvas.tokens || !canvas.stage) return;

    const controlledTokens = canvas.tokens.placeables
      .filter(t => t.document && t.center) // ensure token has position
      .sort((a, b) => {
        // Sort by Y position (top to bottom), ascending = top tokens get lower z
        return a.center.y - b.center.y;
      });

    // Apply new sort order using Pixi display list
    controlledTokens.forEach((token, idx) => {
      if (token.sortableChildren) {
        canvas.tokens.placeables.sortableChildren = true;
      }
      token.zIndex = idx; // lower idx = higher on screen = lower zIndex
    });

    // Force PIXI to re-sort children
    canvas.tokens.sortDirty = true;
  }

  // Hook: when a token finishes movement
  static onUpdateToken(document, changes, options, userId) {
    // Only react if position actually changed and movement is complete
    if (changes.x !== undefined || changes.y !== undefined) {
      if (!options.animation || options.animation === false) {
        // Immediate move (e.g. teleport) → refresh immediately
        this.refreshZOrder();
      } else {
        // Wait for the movement animation to finish
        const token = document.object;
        if (token) {
          token.once("moveend", () => {
            this.refreshZOrder();
          });
        }
      }
    }
  }

  // Initial sort when canvas is ready or view changes
  static onCanvasReady(canvas) {
    this.refreshZOrder();
  }

  static onRenderSceneControls(controls) {
    // When switching layers or pages, re-sort
    this.refreshZOrder();
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
  // Small delay to ensure tokens are rendered after layer change
  setTimeout(() => ZOrderManager.refreshZOrder(), 100);
});

Hooks.on("updateToken", (document, changes, options, userId) => {
  ZOrderManager.onUpdateToken(document, changes, options, userId);
});

Hooks.on("updateTile", () => {
  // Optional: refresh when tiles change (rarely needed)
  ZOrderManager.refreshZOrder();
});

// Also refresh when switching scenes or pages
Hooks.on("sightRefresh", () => {
  ZOrderManager.refreshZOrder();
});
