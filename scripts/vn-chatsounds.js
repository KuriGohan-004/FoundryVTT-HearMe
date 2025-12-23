Hooks.once("init", () => {
  // === Sound Settings ===
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound (Normal)",
    hint: "Sound file to play when a regular chat message appears.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "oocPingSound", {
    name: "Chat Notification Sound (OOC)",
    hint: "Sound file to play when an OOC or player message appears.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ooc.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "soundEnabled", {
    name: "Enable Chat Notification Sounds",
    hint: "Play sounds for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // === Actor Groups ===
  game.settings.register("hearme-chat-notification", "actorGroups", {
    name: "Actor Notification Groups",
    scope: "world",
    config: false,
    type: Object,
    default: []
  });

  game.settings.registerMenu("hearme-chat-notification", "actorGroupsMenu", {
    name: "Configure Actor Notification Groups",
    label: "Open Configuration",
    hint: "Define groups using exact names or keywords in actor names.",
    icon: "fas fa-users-cog",
    type: ActorGroupsConfig,
    restricted: true
  });

  // === All your VN Banner settings (exactly as you posted) ===
  game.settings.register("hearme-chat-notification", "vnBannerEnabled", {
    name: "--- VN Chat Banner Settings ---",
    hint: "",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
  game.settings.register("hearme-chat-notification", "vnEnabled", {
    name: "Enable VN Chat Banner",
    hint: "Show a Visual Novel style banner for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  // ... (paste ALL the rest of your vn* settings here exactly as in your message) ...

  loadTemplates(["modules/hearme-chat-notification/templates/actor-groups.hbs"]);
});

/* === ActorGroupsConfig class (copy from your earlier working version) === */
class ActorGroupsConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Actor Chat Notification Groups",
      id: "hearme-actor-groups-config",
      template: "modules/hearme-chat-notification/templates/actor-groups.hbs",
      width: 650,
      height: "auto",
      closeOnSubmit: false
    });
  }
  getData() {
    const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
    return { groups };
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".add-group").click(async () => {
      const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
      groups.push({ name: "New Group", sound: "", exactNames: "", containsKeywords: "" });
      await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      this.render(true);
    });
    html.find(".remove-group").click(async (ev) => {
      const idx = parseInt($(ev.currentTarget).data("idx"));
      const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
      groups.splice(idx, 1);
      await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      this.render(true);
    });
    new Sortable(html.find(".groups-list")[0], {
      animation: 150,
      handle: ".drag-handle",
      onEnd: async (ev) => {
        const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
        const [moved] = groups.splice(ev.oldIndex, 1);
        groups.splice(ev.newIndex, 0, moved);
        await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      }
    });
    // File picker activation (fixes the browse button)
    html.find('a.file-picker').on('click', async (ev) => {
      ev.preventDefault();
      const input = html.find(`input[name="${ev.currentTarget.dataset.target}"]`);
      const current = input.val() || "";
      const picker = new FilePicker({
        type: "audio",
        current: current,
        callback: path => {
          input.val(path);
          this._onChangeInput(ev);
        }
      });
      await picker.browse();
    });
  }
  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    const newGroups = [];
    for (const [key, data] of Object.entries(expanded)) {
      if (data.name?.trim()) {
        newGroups.push({
          name: data.name.trim(),
          sound: data.sound?.trim() || "",
          exactNames: data.exactNames?.trim() || "",
          containsKeywords: data.containsKeywords?.trim() || ""
        });
      }
    }
    await game.settings.set("hearme-chat-notification", "actorGroups", newGroups);
    ui.notifications.info("Actor notification groups saved.");
  }
}

/* === The full VN banner ready hook with modified typeWriter === */
Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;
  // ... (paste your entire VN banner code here, including the modified typeWriter from my previous message) ...
});
