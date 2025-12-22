Hooks.once("init", () => {
  // Existing settings...
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
    hint: "Create groups of actors that share the same custom chat notification sound.",
    icon: "fas fa-users-cog",
    type: ActorGroupsConfig,
    restricted: true
  });
});

class ActorGroupsConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Actor Chat Notification Groups",
      id: "hearme-actor-groups-config",
      template: "modules/hearme-chat-notification/templates/actor-groups.hbs",
      width: 700,
      height: "auto",
      closeOnSubmit: false,
      resizable: true
    });
  }

  getData() {
    const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
    const allActors = game.actors.map(a => ({ id: a.id, name: a.name }));

    const enrichedGroups = groups.map(group => ({
      name: group.name || "Unnamed Group",
      sound: group.sound || "",
      actorIds: group.actorIds || [],
      members: (group.actorIds || []).map(id => {
        const actor = game.actors.get(id);
        return { id, name: actor ? actor.name : `(Missing: ${id})` };
      })
    }));

    return { groups: enrichedGroups, allActors };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Add new group
    html.find("button.add-group").click(async () => {
      const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
      groups.push({ name: "New Group", sound: "", actorIds: [] });
      await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      this.render(true);
    });

    // Remove group
    html.find("button.remove-group").click(async (ev) => {
      const idx = parseInt(ev.currentTarget.dataset.idx);
      const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
      groups.splice(idx, 1);
      await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      this.render(true);
    });

    // Remove actor from group
    html.find("button.remove-actor").click(async (ev) => {
      const groupIdx = parseInt(ev.currentTarget.closest(".group").dataset.idx);
      const actorId = ev.currentTarget.dataset.actorId;
      const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
      const idx = groups[groupIdx].actorIds.indexOf(actorId);
      if (idx > -1) groups[groupIdx].actorIds.splice(idx, 1);
      await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      this.render(true);
    });

    // Reorder groups
    new Sortable(html.find("ol.groups-list")[0], {
      animation: 150,
      handle: ".group-header",
      onEnd: async (ev) => {
        const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
        const moved = groups.splice(ev.oldIndex, 1)[0];
        groups.splice(ev.newIndex, 0, moved);
        await game.settings.set("hearme-chat-notification", "actorGroups", groups);
        this.render(true);
      }
    });
  }

  async _onDrop(event) {
    event.preventDefault();
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return;
    }

    if (data.type !== "Actor") return;

    const groupEl = event.target.closest(".group");
    if (!groupEl) return;

    const groupIdx = parseInt(groupEl.dataset.idx);
    const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
    const actorId = data.id;

    if (!groups[groupIdx].actorIds.includes(actorId)) {
      groups[groupIdx].actorIds.push(actorId);
      await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      this.render(true);
    }
  }

  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    const newGroups = [];
    for (const [key, data] of Object.entries(expanded)) {
      if (data.name?.trim()) {
        newGroups.push({
          name: data.name.trim(),
          sound: data.sound || "",
          actorIds: Array.isArray(data.actorIds) ? data.actorIds : []
        });
      }
    }
    await game.settings.set("hearme-chat-notification", "actorGroups", newGroups);
    ui.notifications.info("Actor groups saved.");
    this.render(true);
  }
}

/* Sound logic and chat hook remain unchanged */
function playChatSound(src) {
  if (!game.settings.get("hearme-chat-notification", "soundEnabled")) return;
  if (!src) return;
  if (game.audio?.context?.state === "suspended") game.audio.context.resume();
  AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
}

Hooks.on("createChatMessage", (message) => {
  if (!message.visible) return;
  if (message.isRoll) return;
  if (!message.isAuthor) return;

  const content = message.content.trim().toLowerCase();
  const isOOC = content.startsWith("/ooc") || !message.speaker?.token;

  let soundSrc = isOOC
    ? game.settings.get("hearme-chat-notification", "oocPingSound")
    : game.settings.get("hearme-chat-notification", "pingSound");

  if (message.speaker?.actor) {
    const actorId = message.speaker.actor;
    const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
    const matchingGroup = groups.find(g => g.actorIds.includes(actorId));
    if (matchingGroup?.sound) {
      soundSrc = matchingGroup.sound;
    }
  }

  playChatSound(soundSrc);
});
