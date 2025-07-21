(() => {
// scripts/token-bar.js
Hooks.once('ready', async () => {
  const isGM = game.user.isGM;
  const followState = {
    enabled: true,
    selectedToken: null,
    lastCenter: { x: 0, y: 0 },
    lastMoveTime: 0
  };

  const bar = document.createElement('div');
  bar.id = 'token-portrait-bar';
  bar.innerHTML = `
    <button id="follow-mode-toggle">Follow Mode: On</button>
    <div id="token-portraits"></div>
  `;
  document.body.appendChild(bar);

  const style = document.createElement('style');
  style.innerHTML = `
    #token-portrait-bar {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: rgba(0,0,0,0.7);
      padding: 5px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #token-portraits {
      display: flex;
      gap: 6px;
      margin-top: 5px;
    }
    .token-portrait {
      width: 40px;
      height: 40px;
      border: 2px solid transparent;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .token-portrait img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .selected-token {
      transform: scale(1.5);
      border-color: yellow;
    }
  `;
  document.head.appendChild(style);

  function getRelevantTokens() {
    const tokens = canvas.tokens.placeables;

    if (isGM) {
      const offlineUsers = game.users.filter(u => !u.active && !u.isGM);
      const offlineUserIds = offlineUsers.map(u => u.id);

      return tokens.filter(t => {
        const owners = t.actor?.ownership || {};
        return Object.entries(owners).some(([userId, level]) =>
          offlineUserIds.includes(userId) && level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
        );
      });
    } else {
      return tokens.filter(t => t.actor?.isOwner);
    }
  }

  function updatePortraitBar() {
    const tokens = getRelevantTokens();
    const container = bar.querySelector('#token-portraits');
    container.innerHTML = '';

    tokens.forEach((t) => {
      const div = document.createElement('div');
      div.className = 'token-portrait';
      if (t === followState.selectedToken) div.classList.add('selected-token');
      const img = document.createElement('img');
      img.src = t.document.texture.src;
      div.appendChild(img);
      div.onclick = () => selectToken(t);
      container.appendChild(div);
    });
  }

  function selectToken(token) {
    followState.selectedToken = token;
    token.control({ releaseOthers: true });
    canvas.animatePan({ x: token.x, y: token.y });
    followState.lastCenter = { x: token.x, y: token.y };
    updatePortraitBar();
  }

  function toggleFollowMode() {
    followState.enabled = !followState.enabled;
    document.getElementById('follow-mode-toggle').textContent = `Follow Mode: ${followState.enabled ? 'On' : 'Off'}`;
    if (followState.enabled) {
      if (!followState.selectedToken) {
        const tokens = getRelevantTokens();
        if (tokens.length > 0) selectToken(tokens[0]);
      } else {
        canvas.animatePan({ x: followState.selectedToken.x, y: followState.selectedToken.y });
        followState.lastCenter = { x: followState.selectedToken.x, y: followState.selectedToken.y };
      }
    }
  }

  document.getElementById('follow-mode-toggle').onclick = toggleFollowMode;

  Hooks.on('updateToken', (doc, changes, options, userId) => {
    if (!followState.enabled || !followState.selectedToken) return;
    if (doc.id !== followState.selectedToken.id) return;

    const dx = Math.abs(doc.x - followState.lastCenter.x);
    const dy = Math.abs(doc.y - followState.lastCenter.y);
    const gridSize = canvas.grid.size;
    const moved = dx > 0 || dy > 0;

    if (dx > 3 * gridSize || dy > 3 * gridSize) {
      canvas.animatePan({ x: doc.x, y: doc.y });
      followState.lastCenter = { x: doc.x, y: doc.y };
    } else if (moved) {
      followState.lastMoveTime = Date.now();
    }
  });

  Hooks.on('canvasReady', () => {
    if (!followState.selectedToken) {
      const tokens = getRelevantTokens();
      if (tokens.length > 0) selectToken(tokens[0]);
    }
  });

  setInterval(() => {
    if (!followState.enabled || !followState.selectedToken) return;
    if (Date.now() - followState.lastMoveTime > 1000 && followState.lastMoveTime !== 0) {
      canvas.animatePan({ x: followState.selectedToken.x, y: followState.selectedToken.y });
      followState.lastCenter = { x: followState.selectedToken.x, y: followState.selectedToken.y };
      followState.lastMoveTime = 0;
    }
  }, 500);

  document.addEventListener('mousedown', evt => {
    if (!followState.enabled) return;
    const tokenObject = evt.target.closest(".token");
    if (!tokenObject) return;
    const token = canvas.tokens.placeables.find(t => t.object && t.object.id === tokenObject.id);
    if (!token) return;
    if (evt.button === 0) {
      evt.preventDefault();
      evt.stopPropagation();
      game.user.updateTokenTargets([token.id]);
    }
  }, true);

  window.addEventListener('keydown', (evt) => {
    if (!followState.enabled) return;
    const key = evt.key.toLowerCase();
    const movementKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];

    const tokens = getRelevantTokens();
    if (!followState.selectedToken && (movementKeys.includes(key) || key === 'q' || key === 'e')) {
      if (tokens.length > 0) selectToken(tokens[0]);
      return;
    }

    if (movementKeys.includes(key)) {
      const controlled = canvas.tokens.controlled;
      if (!controlled.includes(followState.selectedToken)) {
        if (followState.selectedToken) selectToken(followState.selectedToken);
      }
    }

    if (key === 'q' || key === 'e') {
      const index = tokens.indexOf(followState.selectedToken);
      if (index === -1) return;
      const nextIndex = key === 'q' ? (index - 1 + tokens.length) % tokens.length : (index + 1) % tokens.length;
      selectToken(tokens[nextIndex]);
    }
  }, true);

  updatePortraitBar();
});



  /* ---------- Improved ENTER behaviour --------------------------- */
  /**
   *  • If Enter is pressed while a text‑editable element is focused → do nothing
   *  • Otherwise → open Chat tab and focus its input
   *  • After a chat message is submitted → blur the input and
   *    re‑select the previously‑controlled token (so WASD etc. work)
   */

  const isEditable = el =>
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el?.isContentEditable;

  /* -- Keydown handler ------------------------------------------- */
  window.addEventListener("keydown", ev => {
    if (ev.code !== "Enter") return;

    /* Case 1 – typing somewhere: leave Foundry’s default alone */
    if (isEditable(ev.target)) return;

    /* Case 2 – no textbox focused: open Chat, focus input */
    ev.preventDefault();
    ui.sidebar?.activateTab("chat");
    (
      document.querySelector("#chat-message") ||
      document.querySelector("textarea[name='message']")
    )?.focus();
  });

  /* -- After chat submit: blur & re‑focus canvas ----------------- */
  Hooks.once("renderChatLog", (app, html) => {
    const form = html[0].querySelector("form");
    if (!form) return;

    form.addEventListener("submit", () => {
      setTimeout(() => {
        /* Blur chat input so keyboard controls are free again */
        form.querySelector("textarea[name='message'],#chat-message")?.blur();

        /* Re‑select previously‑controlled token for movement keys */
        if (canvas?.ready) {
          const sel = canvas.tokens.controlled[0] || canvas.tokens.get(selectedId);
          sel?.control({ releaseOthers: false });
        }
      }, 200);   /* small delay lets Foundry finish its own handlers */
    });
  });
  

  // Close all character-type sheets
async function closeCharacterSheets() {
  for (const app of Object.values(ui.windows)) {
    if (app.rendered && app.document?.entity?.type === "character") {
      await app.close();
    }
  }
}

// Wrap selectToken to automatically close sheets before changing selection
const _originalSelectToken = selectToken;
selectToken = async function(token) {
  if (followState.selectedToken !== token) {
    await closeCharacterSheets();
  }
  return _originalSelectToken(token);
};


  
// Trigger when combat begins
//Hooks.on("ready", (combat, update) => {
//  const combatant = combat.combatant;
//  focusCombatant(combatant);
// });

// Trigger at every turn change
// Hooks.on("combatTurnChange", (combat, prior, current) => {
//  const combatant = combat.getCombatant(current.tokenId ? current : prior)?.combatant ?? combat.combatant;
//  focusCombatant(combatant);
// });

// function focusCombatant(combatant) {
//  if (!combatant?.tokenId) return;
//  const token = canvas.tokens.get(combatant.tokenId);
//  if (!token) return;
//  token.control({ releaseOthers: true });
//  canvas.animatePan({ x: token.x, y: token.y });
// }

        Hooks.on("ready",()=> 
        {
           const combatant = combat.combatant;
           focusCombatant(combatant);
           selectToken(tokens[combatant]);
            Hooks.on("updateCombat", (combat, update, options, userId) => {
                  const combatant = combat.getCombatant(current.tokenId ? current : prior)?.combatant ?? combat.combatant;
                  focusCombatant(combatant);
                    selectToken(tokens[combatant]);
            });
        });

  
})();
