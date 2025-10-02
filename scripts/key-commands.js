// modules/hearme-chat-notification/scripts/chat-focus.js

export class HearMeChatNotification {
  static init() {
    // Listen for key presses globally
    document.addEventListener("keydown", HearMeChatNotification._onKeyDown, true);
  }

  static _onKeyDown(event) {
    // Only care about Enter
    if (event.key !== "Enter") return;

    const activeElement = document.activeElement;

    // 1. If an input/textarea/contenteditable is active → do nothing
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
       activeElement.tagName === "TEXTAREA" ||
       activeElement.isContentEditable)
    ) {
      return;
    }

    // 2. If a sheet is open → do nothing
    if (ui.windows && Object.values(ui.windows).some(w => w.rendered)) {
      return;
    }

    // 3. Locate chat input
    const chatInput = ui.chat?.element?.find("textarea#chat-message")[0];
    if (!chatInput) return;

    if (document.activeElement !== chatInput) {
      // Focus chat input
      chatInput.focus();
      chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
    } else {
      // Already focused → wait 1 second then blur
      setTimeout(() => {
        chatInput.blur();
      }, 1000);
    }
  }
}

// Register on init
Hooks.once("init", () => {
  HearMeChatNotification.init();
});
