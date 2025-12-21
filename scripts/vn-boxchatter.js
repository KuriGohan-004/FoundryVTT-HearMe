// Register module settings
Hooks.once("init", () => {
    game.settings.register("hearme-chat-notification", "enabled", {
        name: "Enable GM OOC Notifications",
        hint: "Show a special notification box when the GM or Assistant GM sends an OOC message.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("hearme-chat-notification", "position", {
        name: "Notification Position",
        hint: "Where on the screen the notification should appear.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "top": "Top (center)",
            "top-left": "Top Left",
            "top-right": "Top Right"
        },
        default: "top",
        requiresReload: false
    });

    // 🔽 NEW: Vertical offset slider
    game.settings.register("hearme-chat-notification", "verticalOffset", {
        name: "Vertical Offset (%)",
        hint: "How far down from the top of the screen the notification appears.",
        scope: "world",
        config: true,
        type: Number,
        range: {
            min: 0,
            max: 50,
            step: 1
        },
        default: 5,
        requiresReload: false
    });

    game.settings.register("hearme-chat-notification", "width", {
        name: "Notification Width (px)",
        hint: "Width of the notification box.",
        scope: "world",
        config: true,
        type: Number,
        default: 600,
        requiresReload: false
    });

    game.settings.register("hearme-chat-notification", "fadeOut", {
        name: "Auto-Fade Out",
        hint: "Whether the notification should disappear automatically after a delay.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("hearme-chat-notification", "fadeDelay", {
        name: "Fade Out Delay (seconds)",
        hint: "How long the notification stays visible before fading out (if Auto-Fade is enabled).",
        scope: "world",
        config: true,
        type: Number,
        default: 8,
        requiresReload: false
    });

    game.settings.register("hearme-chat-notification", "fadeDuration", {
        name: "Fade Out Animation Duration (ms)",
        hint: "How long the fade-out animation takes.",
        scope: "world",
        config: true,
        type: Number,
        default: 800,
        requiresReload: false
    });
});

// Global variables to manage the current notification
let currentNotification = null;
let fadeTimeout = null;

// Listen for new chat messages (including OOC)
Hooks.on("createChatMessage", (message) => {
    // Only proceed if module is enabled
    if (!game.settings.get("hearme-chat-notification", "enabled")) return;

    // Only OOC messages
    if (message.style !== CONST.CHAT_MESSAGE_STYLES.OOC) return;

    // Only messages from GM or Assistant GM
    const isGM = message.user?.isGM ?? false;
    if (!isGM) return;

    // Get clean content
    const content = message.content.trim();
    if (!content) return;

    // Remove any previous notification immediately
    if (currentNotification) {
        currentNotification.remove();
        currentNotification = null;
    }

    // Clear any pending fade timeout
    if (fadeTimeout) {
        clearTimeout(fadeTimeout);
        fadeTimeout = null;
    }

    // Create the notification element
    const $notification = $(`
        <div class="hearme-gm-ooc-notification">
            <div class="hearme-content">${content}</div>
        </div>
    `);

    // Apply settings
    const position = game.settings.get("hearme-chat-notification", "position");
    const width = game.settings.get("hearme-chat-notification", "width");

    // 🔽 NEW: read vertical offset
    const verticalOffset = game.settings.get("hearme-chat-notification", "verticalOffset");
    const topValue = `${verticalOffset}vh`;

    $notification.css({
        position: "fixed",
        zIndex: 10000,
        width: `${width}px`,
        maxWidth: "90vw",
        background: "rgba(0, 0, 0, 0.85)",
        color: "#ffffff",
        padding: "12px 18px",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
        fontFamily: "Signika, sans-serif",
        fontSize: "1.1rem",
        lineHeight: "1.4",
        pointerEvents: "none",
        opacity: 0,
        textAlign: "center"
    });

    // Set position
    if (position === "top") {
        $notification.css({
            top: topValue,
            left: "50%",
            transform: "translateX(-50%)"
        });
    } else if (position === "top-left") {
        $notification.css({
            top: topValue,
            left: "20px"
        });
    } else if (position === "top-right") {
        $notification.css({
            top: topValue,
            right: "20px"
        });
    }

    // Append to body
    $("body").append($notification);
    currentNotification = $notification[0];

    // Fade in
    $notification.animate({ opacity: 1 }, 400);

    // Auto-fade if enabled
    if (game.settings.get("hearme-chat-notification", "fadeOut")) {
        const delay = game.settings.get("hearme-chat-notification", "fadeDelay") * 1000;
        const duration = game.settings.get("hearme-chat-notification", "fadeDuration");

        fadeTimeout = setTimeout(() => {
            $notification.animate({ opacity: 0 }, duration, () => {
                $notification.remove();
                currentNotification = null;
            });
        }, delay);
    }
});

// Clean up on window unload (just in case)
Hooks.once("ready", () => {
    window.addEventListener("beforeunload", () => {
        if (currentNotification) {
            currentNotification.remove();
        }
    });
});
