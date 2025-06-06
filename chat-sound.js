Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Default Chat Ping Sound",
    hint: "Sound played when an actor sends a chat message (if no actor-specific sound is set).",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });
});

Hooks.on("ready", () => {
  Hooks.on("createChatMessage", (message) => {
    if (message.isRoll || !message.visible) return;

    const actor = message.actor ?? game.actors?.get(message.speaker.actor);
    const actorSound = actor?.getFlag("hearme-chat-notification", "pingSound");
    const defaultSound = game.settings.get("hearme-chat-notification", "pingSound");

    const soundPath = actorSound || defaultSound;
    if (!soundPath) return;

    AudioHelper.play({
      src: soundPath,
      volume: 0.8,
      autoplay: true,
      loop: false
    }, true);
  });

  // Add bell icon to all Actor sheets
  Hooks.on("renderActorSheet", (app, html, data) => {
    if (!game.user.isGM && !app.actor.isOwner) return;

    const header = html.closest('.app').find('.window-header .window-actions');
    if (header.find('.chat-ping-config').length) return;

    const button = $(`<a class="chat-ping-config" title="Chat Ping Sound"><i class="fas fa-bell"></i></a>`);
    button.on("click", async () => {
      const current = app.actor.getFlag("hearme-chat-notification", "pingSound") || "";

      new Dialog({
        title: "Set Chat Notification Sound",
        content: `
          <div class="form-group">
            <label>Sound File Path</label>
            <div class="form-fields">
              <input type="text" id="ping-sound-path" value="${current}" style="width: 100%;">
              <button class="file-picker" data-type="audio" title="Browse Files">
                <i class="fas fa-folder-open"></i>
              </button>
            </div>
            <p class="notes">Leave blank to use the default GM sound.</p>
          </div>
        `,
        buttons: {
          save: {
            label: "Save",
            callback: async (html) => {
              const path = html.find("#ping-sound-path").val();
              await app.actor.setFlag("hearme-chat-notification", "pingSound", path || null);
            }
          },
          reset: {
            label: "Reset",
            callback: async () => {
              await app.actor.unsetFlag("hearme-chat-notification", "pingSound");
            }
          },
          cancel: { label: "Cancel" }
        },
        render: html => {
          html.find(".file-picker").on("click", () => {
            new FilePicker({
              type: "audio",
              current: current,
              callback: path => html.find("#ping-sound-path").val(path)
            }).render(true);
          });
        },
        default: "save"
      }).render(true);
    });

    header.prepend(button);
  });
});
