(() => {
// scripts/token-bar.js
Hooks.once('ready', async () => {
  const isGM = game.user.isGM;
  const followState = { enabled: true, selectedToken: null, lastCenter: { x: 0, y: 0 } };

  const bar = document.createElement('div');
  bar.id = 'token-portrait-bar';
  bar.innerHTML = `
    <div id="token-portraits"></div>
    <button id="follow-mode-toggle">Follow Mode: On</button>
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
    }
    .token-portrait {
      width: 40px;
      height: 40px;
      border: 2px solid transparent;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
    }
    .token-portrait img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .selected-token {
      transform: scale(1.25);
      border-color: yellow;
    }
  `;
  document.head.appendChild(style);

  function getRelevantTokens() {
    const tokens = canvas.tokens.placeables;

    if (isGM) {
      // Show tokens owned by offline players
      const offlineUsers = game.users.filter(u => !u.active && !u.isGM);
      const offlineUserIds = offlineUsers.map(u => u.id);

      return tokens.filter(t => {
        const owners = t.actor?.ownership || {};
        return Object.entries(owners).some(([userId, level]) =>
          offlineUserIds.includes(userId) && level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
        );
      });
    } else {
      // Show tokens the current player owns
      return tokens.filter(t => t.actor?.isOwner);
    }
  }

  function updatePortraitBar() {
    const tokens = getRelevantTokens();
    const container = bar.querySelector('#token-portraits');
    container.innerHTML = '';

    tokens.forEach((t, index) => {
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
    token.control();
    canvas.animatePan({ x: token.x, y: token.y });
    followState.lastCenter = { x: token.x, y: token.y };
    updatePortraitBar();
  }

  function toggleFollowMode() {
    followState.enabled = !followState.enabled;
    document.getElementById('follow-mode-toggle').textContent = `Follow Mode: ${followState.enabled ? 'On' : 'Off'}`;
  }

  document.getElementById('follow-mode-toggle').onclick = toggleFollowMode;

  Hooks.on('updateToken', (doc, changes, options, userId) => {
    if (!followState.enabled || !followState.selectedToken) return;
    if (doc.id !== followState.selectedToken.id) return;

    const dx = Math.abs(doc.x - followState.lastCenter.x);
    const dy = Math.abs(doc.y - followState.lastCenter.y);
    const gridSize = canvas.grid.size;
    if (dx > 3 * gridSize || dy > 3 * gridSize) {
      canvas.animatePan({ x: doc.x, y: doc.y });
      followState.lastCenter = { x: doc.x, y: doc.y };
    }
  });

  canvas.stage.on('mousedown', evt => {
    if (!followState.enabled) return;
    const interaction = canvas.tokens.interactionManager._target;
    if (interaction && interaction.document && followState.selectedToken) {
      const alreadyTargeted = game.user.targets.has(interaction);
      if (alreadyTargeted) {
        game.user.updateTokenTargets(game.user.targets.filter(t => t !== interaction).map(t => t.id));
      } else {
        game.user.updateTokenTargets([interaction.id], { releaseOthers: false });
      }
      evt.stopPropagation();
    }
  }, true);

  document.addEventListener('keydown', evt => {
    if (['KeyQ', 'KeyE'].includes(evt.code)) {
      const tokens = getRelevantTokens();
      if (!tokens.length) return;
      const currentIndex = tokens.indexOf(followState.selectedToken);
      let newIndex = 0;
      if (evt.code === 'KeyQ') {
        newIndex = (currentIndex - 1 + tokens.length) % tokens.length;
      } else if (evt.code === 'KeyE') {
        newIndex = (currentIndex + 1) % tokens.length;
      }
      selectToken(tokens[newIndex]);
    }
  });

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
  
  /* ---------- After a chat message is created -------------------- */
  Hooks.on("createChatMessage", () => {
    /* Let Foundry finish its own focus work first */
    requestAnimationFrame(() => {
      /* 1) Blur the chat input ------------------------------------- */
      const chatInput =
        document.querySelector("#chat-message") ||
        document.querySelector("textarea[name='message']");
      chatInput?.blur();

      /* 2) Re‑focus the previously selected token ------------------ */
      const tok =
        canvas.tokens.controlled[0] || canvas.tokens.get(selectedId);
      tok?.control({ releaseOthers: false });
    });
  });
  
})();
