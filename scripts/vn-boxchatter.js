// hearm-chat-notification/scripts/main.js

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

// Create and manage the notification element
let currentNotification = null;
let fadeTimeout = null;

Hooks.on("chatMessage", (message) => {
    // Only proceed if module is enabled
    if (!game.settings.get("hearme-chat-notification", "enabled")) return;

    // Only care about OOC messages
    if (message.style !== CONST.CHAT_MESSAGE_STYLES.OOC) return;

    // Only GM or Assistant GM messages
    const isGM = message.user?.isGM ?? false;
    if (!isGM) return;

    // Get the message content (strip any HTML if needed)
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

    // Position
    if (position === "top") {
        $notification.css({
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)"
        });
    } else if (position === "top-left") {
        $notification.css({
            top: "20px",
            left: "20px"
        });
    } else if (position === "top-right") {
        $notification.css({
            top: "20px",
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

// Optional: Clean up on window unload (just in case)
Hooks.once("ready", () => {
    window.addEventListener("beforeunload", () => {
        if (currentNotification) currentNotification.remove();
    });
});
