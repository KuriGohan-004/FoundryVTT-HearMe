Hooks.once("init", () => {
  // Existing settings
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

  // New setting: array of groups { name: string, sound: string, actorIds: array }
  game.settings.register("hearme-chat-notification", "actorGroups", {
    name: "Actor Notification Groups",
    scope: "world",
    config: false,
    type: Object,
    default: []
  });

  // Menu button
  game.settings.registerMenu("hearme-chat-notification", "actorGroupsMenu", {
    name: "Configure Actor Notification Groups",
    label: "Open Configuration",
    hint: "Create groups of actors that share the same custom chat notification sound.",
    icon: "fas fa-users-cog",
    type: ActorGroupsConfig,
    restricted: true
  });
});

/* =========================================================
 * CONFIG FORM
 * =======================================================*/
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

    const enrichedGroups = groups.map(group => {
      const members = group.actorIds.map(id => {
        const actor = game.actors.get(id);
        return actor ? { id, name: actor.name } : { id, name: `(Missing: ${id})` };
      });
      return {
        name: group.name || "Unnamed Group",
        sound: group.sound || "",
        actorIds: group.actorIds,
        members
      };
    });

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

    // Make groups sortable
    new Sortable(html.find("ol.groups-list")[0], {
      animation: 150,
      handle: ".group-header",
      onEnd: async (ev) => {
        const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
        const moved = groups.splice(ev.oldIndex, 1)[0];
        groups.splice(ev.newIndex, 0, moved);
        await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      }
    });

    // Make actor list inside each group sortable and allow drag from available actors
    html.find(".group-actors").each((i, el) => {
      new Sortable(el, {
        group: "actors",
        animation: 150,
        onAdd: async (ev) => {
          const groupIdx = parseInt(ev.to.closest(".group").dataset.idx);
          const actorId = ev.item.dataset.actorId;
          const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
          if (!groups[groupIdx].actorIds.includes(actorId)) {
            groups[groupIdx].actorIds.push(actorId);
            await game.settings.set("hearme-chat-notification", "actorGroups", groups);
          }
          ev.item.remove(); // remove from source list
        },
        onSort: async (ev) => {
          // Reorder within group if needed (optional)
        }
      });
    });
  }

  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    const newGroups = [];
    for (const [key, data] of Object.entries(expanded)) {
      if (data.name && data.name.trim()) {
        newGroups.push({
          name: data.name.trim(),
          sound: data.sound || "",
          actorIds: data.actorIds || []
        });
      }
    }
    await game.settings.set("hearme-chat-notification", "actorGroups", newGroups);
    ui.notifications.info("Actor groups saved.");
    this.render(true);
  }
}

/* =========================================================
 * SOUND LOGIC
 * =======================================================*/
function playChatSound(src) {
  if (!game.settings.get("hearme-chat-notification", "soundEnabled")) return;
  if (!src) return;
  if (game.audio?.context?.state === "suspended") game.audio.context.resume();
  AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
}

/* =========================================================
 * CHAT HOOK
 * =======================================================*/
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

    // First group that contains this actor wins
    const matchingGroup = groups.find(g => g.actorIds.includes(actorId));
    if (matchingGroup && matchingGroup.sound) {
      soundSrc = matchingGroup.sound;
    }
  }

  playChatSound(soundSrc);
});
