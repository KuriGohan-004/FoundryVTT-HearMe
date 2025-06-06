Hooks.once("init", () => {
  // GM-configurable default chat sound
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Default Chat Ping Sound",
    hint: "Default sound used when no actor-specific sound is defined.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });
});

Hooks.on("ready", () => {
  if (game.audio?.context?.state === "suspended") {
    game.audio.context.resume();
  }

  // Add custom UI to actor sheet
  Hooks.on("renderActorSheet", async (app, html, data) => {
    if (!game.user.isGM && app.actor.isOwner === false) return;

    const actor = app.actor;
    const currentSound = actor.getFlag("hearme-chat-notification", "pingSound") || "";

    // Create HTML for the input + file picker
    const settingHtml = $(`
      <div class="form-group">
        <label>Chat Notification Sound</label>
        <div class="form-fields">
          <input type="text" name="pingSound" value="${currentSound}" placeholder="Path to audio file"/>
          <button type="button" class="file-picker" data-type="audio" data-target="input[name='pingSound']" title="Browse Files">
            <i class="fas fa-file-audio"></i>
          </button>
        </div>
        <p class="notes">Optional: This sound will play when this actor sends a chat message.</p>
      </div>
    `);

    // Insert just before the sheet's footer
    html.find('.sheet-footer').before(settingHtml);

    // Activate the file picker
    settingHtml.find('.file-picker').on('click', event => {
      const input = settingHtml.find("input[name='pingSound']");
      new FilePicker({
        type: "audio",
        callback: path => {
          input.val(path);
          actor.setFlag("hearme-chat-notification", "pingSound", path);
        }
      }).render(true);
    });

    // Save on blur
    settingHtml.find("input[name='pingSound']").on("change", (event) => {
      const path = event.target.value;
      actor.setFlag("hearme-chat-notification", "pingSound", path);
    });
  });

  // Chat sound logic
  Hooks.on("createChatMessage", async (message) => {
    if (message.isRoll) return;

    if (game.audio?.context?.state === "suspended") {
      game.audio.context.resume();
    }

    const speaker = message.speaker;
    const actor = speaker.actor ? game.actors.get(speaker.actor) : null;

    let soundPath = actor?.getFlag("hearme-chat-notification", "pingSound") ||
                    game.settings.get("hearme-chat-notification", "pingSound");

    if (soundPath) {
      AudioHelper.play({
        src: soundPath,
        volume: 0.8,
        autoplay: true,
        loop: false
      }, true);
    }
  });
});
