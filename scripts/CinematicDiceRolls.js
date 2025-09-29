// dice-roll-overlay.js
class DiceRollOverlay {
  static init() {
    Hooks.on("renderChatMessage", this._onRenderChatMessage.bind(this));
  }

  static async _onRenderChatMessage(message, html, data) {
    // Only trigger on skill checks (adjust the flavor filter for your system!)
    if (!message.isRoll || !message.rolls?.length) return;
    if (!message.flavor?.toLowerCase().includes("skill")) return;

    const roll = message.rolls[0];
    const d20 = roll.dice.find(d => d.faces === 20);
    if (!d20) return;

    const result = d20.total;
    const mod = roll.total - d20.total;

    this.showOverlay(result, mod, () => {
      // Once animation is done, show chat normally
      ui.chat.scrollBottom();
    });
  }

  static showOverlay(result, mod, onFinish) {
    // Create overlay container
    const overlay = $(`
      <div class="dice-roll-overlay">
        <div class="dice-roll-box">
          <div class="dice-face">🎲</div>
          <div class="dice-mod"></div>
        </div>
      </div>
    `);

    $("body").append(overlay);

    // Animate spinning die
    const diceFace = overlay.find(".dice-face");
    diceFace.addClass("rolling");

    setTimeout(() => {
      // Stop spin, show result
      diceFace.removeClass("rolling").text(result);

      setTimeout(() => {
        // Show modifier
        const sign = mod >= 0 ? "+" : "-";
        overlay.find(".dice-mod").text(`${sign}${Math.abs(mod)}`);
      }, 800);

      setTimeout(() => {
        // Remove overlay
        overlay.fadeOut(600, () => overlay.remove());
        if (onFinish) onFinish();
      }, 2500);
    }, 1500);
  }
}

Hooks.once("ready", () => DiceRollOverlay.init());

// CSS injection
Hooks.once("init", () => {
  const css = `
  .dice-roll-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    background: rgba(0,0,0,0.6);
  }
  .dice-roll-box {
    background: black;
    color: white;
    padding: 40px;
    border-radius: 12px;
    font-size: 48px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 0 20px rgba(0,0,0,0.8);
  }
  .dice-face {
    width: 80px;
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 64px;
    transition: transform 0.3s;
  }
  .dice-face.rolling {
    animation: spin 1s infinite linear;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .dice-mod {
    font-size: 48px;
    opacity: 0;
    animation: fadein 1s forwards;
    animation-delay: 0.8s;
  }
  @keyframes fadein {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  `;
  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);
});
