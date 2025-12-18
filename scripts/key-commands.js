Hooks.once("ready", () => {
  console.log("hearme-chat-notification | Chat focus handler loaded");

  let _previouslyControlledTokenId = null;

  /** Return true if an Actor (character) sheet appears to be open. */
  function _isActorSheetOpen() {
    try {
      if (typeof ActorSheet !== "undefined") {
        if (Object.values(ui.windows).some(w => w instanceof ActorSheet && w.rendered)) return true;
      }
    } catch (e) { /* ignore */ }
    // DOM fallback: many actor sheets include ".app.sheet.actor" on the sheet element
    return !!document.querySelector(".app.sheet.actor");
  }

  /* ---------- Improved ENTER behaviour --------------------------- */
  // Pressing Enter -> Focus chat input if nothing else is focused and no actor sheet is open
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;

    const active = document.activeElement;
    const isInput = active && (
      active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.isContentEditable
    );
    const isButton = active && active.tagName === "BUTTON";

    const chatInput = document.querySelector("#chat-message");

    // If the chat input is already focused, allow normal Enter behaviour (send newline/submit)
    if (chatInput && active === chatInput) return;

    // If any input/button is focused or an actor sheet is open, don't steal Enter
    if (isInput || isButton || _isActorSheetOpen()) return;

    // Otherwise focus chat input and remember what token was selected
    event.preventDefault();
    if (chatInput) {
      const controlled = canvas?.tokens?.controlled?.[0];
      _previouslyControlledTokenId = controlled?.id ?? null;
      chatInput.focus();
      try {
        chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
      } catch (err) { /* ignore for non-textareas */ }
    }
  }, true);

  /* When user sends a message -> wait 1 second then blur the input */
  Hooks.on("chatMessage", () => {
    const chatInput = document.querySelector("#chat-message");
    if (chatInput && document.activeElement === chatInput) {
      setTimeout(() => chatInput.blur(), 100);
    }
  });

  /* -- After chat submit: blur & re-focus previously-controlled token ---------- */
  Hooks.once("renderChatLog", (app, html) => {
    const form = html[0].querySelector("form");
    if (!form) return;

    form.addEventListener("submit", () => {
      setTimeout(() => {
        // Blur chat input so keyboard controls are free again
        form.querySelector("textarea[name='message'],#chat-message")?.blur();

        // Re-select the previously-controlled token if it exists
        if (canvas?.ready && _previouslyControlledTokenId) {
          const prev = canvas.tokens.get(_previouslyControlledTokenId)
                    || canvas.tokens.placeables.find(t => t.id === _previouslyControlledTokenId);
          prev?.control({ releaseOthers: false });
        }
        _previouslyControlledTokenId = null;
      }, 200); // small delay to let Foundry finish its handlers
    });
  });

  /* -- Detect normal chat messages (not rolls) from a speaking token ---------- */
  // Fires a module-specific hook when a token's actor speaks a plain chat line
  // Hook name: "hearmeChatNotification.speak" -> (message, token)
  Hooks.on("createChatMessage", (message/*ChatMessage*/, options, userId) => {
    try {
      // Detect if the ChatMessage contains dice/roll data; if so, skip it.
      const hasRolls = (message?.rolls && message.rolls.length > 0) ||
                       (message?.data?.rolls && message.data.rolls.length > 0);
      if (hasRolls) return;

      // Try to find the speaking token on the current canvas
      const tokenId = message?.speaker?.token;
      let token = null;
      if (tokenId && canvas?.tokens) token = canvas.tokens.get(tokenId);

      // Fallback: find a token for the message's actor on the scene
      if (!token && message?.speaker?.actor && canvas?.tokens) {
        token = canvas.tokens.placeables.find(t => t.actor?.id === message.speaker.actor);
      }

      if (!token) return; // No speaking token present on the canvas

      // Emit a module-specific hook so other code (or your module) can react:
      Hooks.callAll("hearmeChatNotification.speak", message, token);

      // Optional: debug log
      console.log("hearme-chat-notification | token", token.id, "spoke:", message.content);
    } catch (err) {
      console.error("hearme-chat-notification | createChatMessage handler error", err);
    }
  });

});
