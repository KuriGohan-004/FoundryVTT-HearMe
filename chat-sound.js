Hooks.once("init", () => {
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

  // Chat notification sound logic
  Hooks.on("createChatMessage", async (message) => {
    if (message.isRoll) return;
    if (game.audio?.context?.state === "suspended") game.audio.context.resume();

    const speaker = message.speaker;
    const actor = speaker.actor ? game.actors.get(speaker.actor) : null;

    const actorSound = actor?.getFlag("hearme-chat-notification", "pingSound");
    const defaultSound = game.settings.get("hearme-chat-notification", "pingSound");

    const soundPath = actorSound || defaultSound;

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

// Add custom bell icon to actor sheet header
Hooks.on("renderActorSheet", (app, html, data) => {
  if (!game.user.isGM && !app.actor.isOwner) return;

  const actor = app.actor;
  const bellBtn = {
    label: "Chat Ping Sound",
    icon: "fas fa-bell",
    class: "chat-ping-config",
    onclick: async () => {
      const current = actor.getFlag("hearme-chat-notification", "pingSound") || "";
      new Dialog({
        title: "Chat Ping Sound",
        content: `
          <div class="form-group">
            <label>Custom Chat Sound</label>
            <div class="form-fields">
              <input type="text" id="ping-sound-path" value="${current}" style="width: 80%">
              <button class="file-picker" data-type="audio" title="Browse Files">
                <i class="fas fa-folder-open"></i>
              </button>
              <button id="play-sound" title="Play">
                <i class="fas fa-play"></i>
              </button>
            </div>
            <p class="notes">Choose a sound for this character’s chat messages. Leave blank to use the default.</p>
          </div>
        `,
        buttons: {
          save: {
            label: "Save",
            callback: async (html) => {
              const path = html.find("#ping-sound-path").val();
              await actor.setFlag("hearme-chat-notification", "pingSound", path || null);
            }
          },
          reset: {
            label: "Reset",
            callback: async () => {
              await actor.unsetFlag("hearme-chat-notification", "pingSound");
            }
          },
          cancel: { label: "Cancel" }
        },
        render: html => {
          html.find(".file-picker").click(ev => {
            new FilePicker({
              type: "audio",
              current: current,
              callback: path => html.find("#ping-sound-path").val(path)
            }).render(true);
          });

          html.find("#play-sound").click(ev => {
            const path = html.find("#ping-sound-path").val();
            if (path) {
              AudioHelper.play({ src: path, volume: 0.8, autoplay: true, loop: false }, true);
            }
          });
        },
        default: "save"
      }).render(true);
    }
  };

  // Append bell icon to title bar
  const titleElement = html.closest('.app').find('.window-header .window-title');
  const headerButtons = html.closest('.app').find('.window-header .window-actions');
  const button = $(`<a class="chat-ping-config" title="Configure Chat Notification Sound"><i class="fas fa-bell"></i></a>`);
  button.on("click", bellBtn.onclick);
  headerButtons.prepend(button);
});
