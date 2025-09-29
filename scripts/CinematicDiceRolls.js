// dice-roll-overlay.js
class DiceRollOverlay {
  static MODULE_ID = "dice-roll-overlay"; // change to your module id if different

  // init: register setting + inject CSS
  static init() {
    console.log("DiceOverlay | init");
    game.settings.register(this.MODULE_ID, "skillOnly", {
      name: "Only trigger on skill rolls",
      hint: "If enabled, only chat messages whose flavor contains 'skill' (case-insensitive) will trigger the overlay.",
      scope: "world",
      config: true,
      default: false,
      type: Boolean
    });

    // CSS
    const css = `
    .dice-roll-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      background: rgba(0,0,0,0.75);
      pointer-events: none;
    }
    .dice-roll-box {
      background: #000;
      color: #fff;
      padding: 36px 48px;
      border-radius: 10px;
      font-size: 48px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 26px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.9);
      pointer-events: auto;
    }
    .dice-face {
      width: 96px;
      height: 96px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 64px;
      transition: transform 0.25s;
    }
    .dice-face.rolling {
      animation: dice-spin 0.9s infinite linear;
    }
    @keyframes dice-spin {
      from { transform: rotate(0deg) scale(1); }
      50%  { transform: rotate(180deg) scale(1.05); }
      to   { transform: rotate(360deg) scale(1); }
    }
    .dice-mod {
      font-size: 44px;
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    .dice-mod.visible {
      opacity: 1;
      transform: translateY(0);
    }`;
    const style = document.createElement("style");
    style.id = `${this.MODULE_ID}-style`;
    style.innerHTML = css;
    document.head.appendChild(style);
  }

  // ready: attach hooks (renderChatMessage with correct signature)
  static ready() {
    console.log("DiceOverlay | ready");
    Hooks.on("renderChatMessage", this._onRenderChatMessage.bind(this));
    // fallback (in case create fires earlier / you prefer create)
    Hooks.on("createChatMessage", this._onCreateChatMessage.bind(this));
  }

  // createChatMessage fallback - attempts to parse and then wait for render to hide/reveal
  static _onCreateChatMessage(message, options, userId) {
    try {
      console.log("DiceOverlay | createChatMessage", message?.id);
      // nothing here — we primarily act on render so we can hide the DOM node,
      // but log for debugging and leave a no-op handler as fallback.
    } catch (err) {
      console.error("DiceOverlay | createChatMessage error", err);
    }
  }

  // renderChatMessage correct signature: (app, html, data)
  static async _onRenderChatMessage(app, html, data) {
    try {
      console.log("DiceOverlay | renderChatMessage", app?.message?.id);
      const message = app?.message;
      if (!message) return;

      // Detect whether this message contains a roll
      const diceElem = html.find('.dice-roll[data-roll]').first();
      const hasDiceElem = diceElem && diceElem.length;
      const isRollFlag = (message.data?.isRoll ?? message.isRoll ?? false) || (!!message.rolls && message.rolls.length > 0);

      if (!hasDiceElem && !isRollFlag) {
        // not a roll message
        return;
      }

      // Optional: only run for skill rolls if setting enabled
      const skillOnly = game.settings.get(this.MODULE_ID, "skillOnly");
      if (skillOnly) {
        const flavor = (message.data?.flavor ?? message.flavor ?? "").toString();
        if (!flavor.toLowerCase().includes("skill")) {
          console.log("DiceOverlay | skipping (skillOnly enabled, flavor mismatch):", flavor);
          return;
        }
      }

      // Parse roll JSON (preferred) from the rendered dice element
      let rollData = null;
      if (hasDiceElem) {
        try {
          rollData = JSON.parse(diceElem.attr("data-roll"));
        } catch (e) {
          console.warn("DiceOverlay | failed to parse data-roll JSON:", e);
        }
      }

      // If we couldn't parse rollData, try message.data.flags.core.roll (older/other formats)
      if (!rollData) {
        try {
          rollData = message.data?.flags?.core?.roll ?? message.data?.roll ?? null;
          if (typeof rollData === "string") rollData = JSON.parse(rollData);
        } catch (e) {
          // ignore
        }
      }

      // Extract total, d20 face, modifier
      const parsed = this._extractTotalD20Modifier(rollData, message);
      if (!parsed) {
        console.log("DiceOverlay | Could not extract roll numbers, aborting overlay.");
        return;
      }
      const { total, d20, modifier } = parsed;
      console.log(`DiceOverlay | parsed total=${total} d20=${d20} modifier=${modifier}`);

      // hide the chat message DOM so the reveal feels cinematic
      html.css("visibility", "hidden");

      // show the overlay and wait for completion
      await this.showOverlay({ d20, modifier, total });

      // reveal chat after animation completes
      html.css("visibility", "");
      // ensure chat UI scrolls to bottom
      ui.chat?.scrollBottom?.();
    } catch (err) {
      console.error("DiceOverlay | renderChatMessage error", err);
      // try to reveal chat if something went wrong
      try { html.css("visibility", ""); } catch (e) { /* ignore */ }
    }
  }

  // Robust extractor that tries common roll JSON shapes and message.rolls
  static _extractTotalD20Modifier(rollData, message) {
    let total = null, d20 = null, modifier = null;

    // Try common rollData.total
    if (rollData && (rollData.total !== undefined && rollData.total !== null)) total = Number(rollData.total);

    // Inspect typical "terms" or "dice" arrays (found in data-roll)
    const searchForDie = (container) => {
      if (!container) return null;
      // Many structures use container.terms or container.dice or container.rolls
      const tryArrays = [];
      if (Array.isArray(container.terms)) tryArrays.push(container.terms);
      if (Array.isArray(container.dice)) tryArrays.push(container.dice);
      if (Array.isArray(container.rolls)) tryArrays.push(container.rolls);

      for (const arr of tryArrays) {
        for (const term of arr) {
          // Some "term" objects have .faces for dice
          if (term?.faces === 20) {
            // result can be in term.results[0].result or .value
            const r = term.results?.[0];
            if (r !== undefined) return (r.result ?? r.value ?? r);
          }
          // Other shapes: a 'dice' element might contain .results with .v or .result
          if (term?.results && Array.isArray(term.results) && term.results.length) {
            const r = term.results[0];
            if (r?.v || r?.result || r?.value) {
              // only accept if this die had faces=20 in a sibling property
              if (term.faces === 20) return (r.result ?? r.value ?? r.v);
            }
          }
        }
      }
      return null;
    };

    if (rollData) {
      d20 = searchForDie(rollData);
    }

    // Fallback: inspect message.rolls (Roll instances serialized)
    if ((d20 === null || d20 === undefined) && Array.isArray(message?.rolls) && message.rolls.length) {
      try {
        const roll = message.rolls[0];
        if (roll?.dice && Array.isArray(roll.dice)) {
          for (const die of roll.dice) {
            if (die.faces === 20 && Array.isArray(die.results) && die.results.length) {
              const r = die.results[0];
              d20 = r?.result ?? r?.value ?? r;
              break;
            }
          }
        }
      } catch (e) { /* ignore */ }
    }

    // Another fallback: if d20 still unknown, try to infer from HTML text inside message.content
    // (rare, but sometimes the rendered HTML includes a number we can parse)
    if ((d20 === null || d20 === undefined) && typeof message?.data?.content === "string") {
      const html = message.data.content;
      // Try to find the first integer inside a dice total span
      const match = html.match(/dice-total.*?>(-?\d+)<\/span>/i) || html.match(/<span[^>]*class="[^"]*total[^"]*"[^>]*>(-?\d+)<\/span>/i) || html.match(/Total:\s*<\/strong>\s*(-?\d+)/i);
      if (match) {
        d20 = Number(match[1]);
      }
    }

    // If total is known and d20 missing, assume single d20 roll (common)
    if ((d20 === null || d20 === undefined) && total !== null) {
      d20 = total;
      modifier = 0;
    }

    // If total not yet known, try to convert from message.rolls or rollData
    if (total === null && rollData && rollData.total !== undefined) total = Number(rollData.total);
    if (total === null && Array.isArray(message?.rolls) && message.rolls.length) {
      total = Number(message.rolls[0]?.total ?? message.rolls[0]?.results?.reduce((a,b)=>a+(b?.result??b),0) ?? null);
    }

    if (total !== null && d20 !== null) modifier = Number(total) - Number(d20);

    // final sanity check: numbers must be finite
    if (!Number.isFinite(Number(total)) || !Number.isFinite(Number(d20)) || !Number.isFinite(Number(modifier))) return null;
    return { total: Number(total), d20: Number(d20), modifier: Number(modifier) };
  }

  // show overlay (returns a Promise resolved when finished)
  static showOverlay({ d20, modifier, total }) {
    return new Promise((resolve) => {
      // guard: remove any existing overlay first
      $(`.${this.MODULE_ID}-overlay`).remove();

      const overlay = $(`
        <div class="dice-roll-overlay ${this.MODULE_ID}-overlay">
          <div class="dice-roll-box">
            <div class="dice-face">🎲</div>
            <div class="dice-mod"></div>
          </div>
        </div>
      `);

      $("body").append(overlay);

      const face = overlay.find(".dice-face");
      const modEl = overlay.find(".dice-mod");

      // Start spin
      face.addClass("rolling");

      // durations (ms)
      const spinMs = 1400;
      const revealDelay = 350;
      const totalShowMs = 1800;

      // stop spinning and reveal d20 face
      setTimeout(() => {
        face.removeClass("rolling").text(String(d20));
        // show modifier shortly after
        setTimeout(() => {
          const sign = modifier >= 0 ? "+" : "-";
          if (modifier === 0) {
            modEl.text("");
          } else {
            modEl.text(`${sign}${Math.abs(modifier)}`);
            // trigger CSS transition
            setTimeout(() => modEl.addClass("visible"), 10);
          }
        }, revealDelay);

        // After showing, fade out
        setTimeout(() => {
          overlay.fadeOut(350, () => {
            overlay.remove();
            resolve();
          });
        }, totalShowMs);
      }, spinMs);
    });
  }
}

// Register hooks
Hooks.once("init", () => DiceRollOverlay.init());
Hooks.once("ready", () => DiceRollOverlay.ready());
