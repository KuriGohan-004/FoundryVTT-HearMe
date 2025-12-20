Hooks.once("init", () => {

  // -----------------------------
  // Visual separator in settings
  // -----------------------------
  game.settings.register("hearme-chat-notification", "vnBannerEnabled", {
    name: "--- VN Chat Banner Settings ---",
    hint: "",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // -----------------------------
  // Core enable
  // -----------------------------
  game.settings.register("hearme-chat-notification", "vnEnabled", {
    name: "Enable VN Chat Banner",
    hint: "Show a Visual Novel style banner for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Banner sizing & position (% of screen)
  game.settings.register("hearme-chat-notification", "vnWidthPct", {
    name: "Banner Width (%)",
    hint: "Width of the VN banner as % of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 60,
    range: { min: 10, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnHeightPct", {
    name: "Banner Height (%)",
    hint: "Height of the VN banner as % of screen height.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: { min: 5, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnOffsetXPct", {
    name: "Banner Offset X (%)",
    hint: "Distance from left edge of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: { min: 0, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnOffsetYPct", {
    name: "Banner Offset Y (%)",
    hint: "Distance from bottom edge of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 50, step: 1 }
  });

  // Text customization
  game.settings.register("hearme-chat-notification", "vnFontSizeNamePct", {
    name: "Font Size Name (%)",
    hint: "Font size of the character's name (percentage of screen width).",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: { min: 0.5, max: 10, step: 0.1 }
  });

  game.settings.register("hearme-chat-notification", "vnFontSizeMsgPct", {
    name: "Font Size Message (%)",
    hint: "Font size of the message text (percentage of screen width).",
    scope: "world",
    config: true,
    type: Number,
    default: 3,
    range: { min: 0.5, max: 10, step: 0.1 }
  });

  game.settings.register("hearme-chat-notification", "vnFontColor", {
    name: "Font Color",
    hint: "Color of the text in the VN banner.",
    scope: "world",
    config: true,
    type: String,
    default: "#ffffff"
  });

  game.settings.register("hearme-chat-notification", "vnBackgroundColor", {
    name: "Background Color",
    hint: "Background color of the VN banner.",
    scope: "world",
    config: true,
    type: String,
    default: "rgba(0,0,0,0.75)"
  });

  game.settings.register("hearme-chat-notification", "vnFontFamily", {
    name: "Font Family",
    hint: "Font used for VN banner text.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "Arial, sans-serif": "Arial",
      "Courier New, monospace": "Courier New",
      "Georgia, serif": "Georgia",
      "Times New Roman, serif": "Times New Roman",
      "Verdana, sans-serif": "Verdana"
    },
    default: "Arial, sans-serif"
  });

  // Auto-hide / skip options
  game.settings.register("hearme-chat-notification", "vnAutoHideTimePerChar", {
    name: "Auto-hide Delay (s/char)",
    hint: "Time in seconds per character before banner disappears. 0 disables.",
    scope: "world",
    config: true,
    type: Number,
    default: 0.3,
    range: { min: 0, max: 10, step: 0.1 }
  });

  game.settings.register("hearme-chat-notification", "vnSkipKey", {
    name: "Skip Key",
    hint: "Key to skip VN banner (while no input focused).",
    scope: "world",
    config: true,
    type: String,
    default: " "
  });

  game.settings.register("hearme-chat-notification", "vnHideUntilDismissed", {
    name: "Hide Chat Until Banner Dismissed",
    hint: "If enabled, the chat message is hidden until the VN banner disappears.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("hearme-chat-notification", "vnHideInCombat", {
    name: "Hide Banner In Combat",
    hint: "If enabled, VN banners are hidden during combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Portrait
  game.settings.register("hearme-chat-notification", "vnPortraitEnabled", {
    name: "Enable Portrait",
    hint: "Show a character portrait below the VN banner.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnPortraitSizePct", {
    name: "Portrait Size (%)",
    hint: "Width/height of the portrait as % of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 15,
    range: { min: 5, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnPortraitOffsetXPct", {
    name: "Portrait Offset X (%)",
    hint: "Distance from left screen edge.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnPortraitOffsetYPct", {
    name: "Portrait Offset Y (%)",
    hint: "Distance from bottom of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 50, step: 1 }
  });

});



Hooks.once("ready", () => {

  // Only run if VN banner enabled
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let banner, nameBar, nameEl, msgBar, msgEl, portrait, timerBar;
  let typing = false;
  let messageQueue = [];
  let currentMessage = null;
  let typeInterval = null;
  let typeProgress = 0;
  let hideTimeout = null;

  // -----------------------------
  // DOM Setup
  // -----------------------------
  function createBannerDom() {
    if (banner) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    banner = document.createElement("div");
    Object.assign(banner.style, {
      position: "fixed",
      display: "none",
      flexDirection: "column",
      justifyContent: "flex-start",
      zIndex: 9999,
      left: `${vw * 0.25}px`,
      bottom: `${vh * 0.1}px`,
      boxShadow: "0 -2px 10px rgba(0,0,0,0.7)",
      transition: "opacity 0.25s ease",
      opacity: "0",
      overflow: "hidden",
      fontFamily: game.settings.get("hearme-chat-notification","vnFontFamily") || "Arial, sans-serif",
      width: `${vw * 0.5}px`,
      height: `${vh * 0.2}px`
    });

    // Name Bar
    nameBar = document.createElement("div");
    Object.assign(nameBar.style, {
      display: "flex",
      alignItems: "center",
      padding: "0 10px",
      fontWeight: "bold",
      backgroundColor: game.settings.get("hearme-chat-notification", "vnNameBackgroundColor") || "rgba(0,0,0,0.6)",
      color: game.settings.get("hearme-chat-notification","vnFontColorName") || "white",
      fontSize: `${vw*0.015}px`,
      height: `${vh*0.04}px`
    });
    nameEl = document.createElement("div");
    nameBar.appendChild(nameEl);
    banner.appendChild(nameBar);

    // Message Bar
    msgBar = document.createElement("div");
    Object.assign(msgBar.style, {
      position: "relative",
      flex: "1",
      padding: "0 10px",
      backgroundColor: game.settings.get("hearme-chat-notification", "vnBackgroundColor") || "rgba(0,0,0,0.8)",
      color: game.settings.get("hearme-chat-notification","vnFontColor") || "white",
      fontSize: `${vw*0.012}px`
    });
    msgEl = document.createElement("div");
    msgBar.appendChild(msgEl);

    timerBar = document.createElement("div");
    Object.assign(timerBar.style, {
      position: "absolute",
      bottom: "0",
      left: "0",
      height: "5px",
      width: "100%",
      backgroundColor: "white",
      transformOrigin: "left",
      transform: "scaleX(0)",
      transition: "transform linear",
      opacity: "0.7"
    });
    msgBar.appendChild(timerBar);

    banner.appendChild(msgBar);
    document.body.appendChild(banner);

    // Portrait
    portrait = document.createElement("img");
    Object.assign(portrait.style, {
      position: "fixed",
      opacity: "0",
      transition: "opacity 0.5s ease"
    });
    document.body.appendChild(portrait);

    applyBannerSettings();
    window.addEventListener("resize", applyBannerSettings);
  }

  // -----------------------------
  // Apply Settings
  // -----------------------------
  function applyBannerSettings() {
    if (!banner) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const widthPct = game.settings.get("hearme-chat-notification", "vnWidthPct") || 50;
    const heightPct = game.settings.get("hearme-chat-notification", "vnHeightPct") || 20;
    const offsetXPct = game.settings.get("hearme-chat-notification", "vnOffsetXPct") || 25;
    const offsetYPct = game.settings.get("hearme-chat-notification", "vnOffsetYPct") || 10;

    banner.style.width = `${vw * (widthPct/100)}px`;
    banner.style.height = `${vh * (heightPct/100)}px`;
    banner.style.left = `${vw * (offsetXPct/100)}px`;
    banner.style.bottom = `${vh * (offsetYPct/100)}px`;

    nameBar.style.fontSize = `${vw * 0.015}px`;
    msgEl.style.fontSize = `${vw * 0.012}px`;

    if (game.settings.get("hearme-chat-notification","vnPortraitEnabled")) {
      portrait.style.display = "block";
      const size = vw * (game.settings.get("hearme-chat-notification","vnPortraitSizePct")||0.1);
      portrait.style.width = portrait.style.height = `${size}px`;
      portrait.style.left = `${vw*(game.settings.get("hearme-chat-notification","vnPortraitOffsetXPct")||0)/100}px`;
      portrait.style.bottom = `${vh*(game.settings.get("hearme-chat-notification","vnPortraitOffsetYPct")||0)/100}px`;
    } else portrait.style.display = "none";
  }

  // -----------------------------
  // Typewriter w/ punctuation slowdown
  // -----------------------------
  function formatMessageText(text) {
    return text.replace(/\*(.*?)\*/g, "<i>$1</i>").replace(/\n/g,"<br>");
  }

  function typeWriter(element,text,callback) {
    typing = true;
    element.innerHTML = "";
    typeProgress = 0;
    if (typeInterval) clearInterval(typeInterval);

    typeInterval = setInterval(()=>{
      if(typeProgress>=text.length){
        clearInterval(typeInterval);
        typing=false;
        callback?.();
        return;
      }

      let char = text[typeProgress];
      element.innerHTML+=char;
      typeProgress++;

      // Slow for punctuation
      let delay = 30;
      if(char.match(/[.,!?]/)) delay=200;
      if(char==='.') delay=100;

      const progressRatio = typeProgress/text.length;
      timerBar.style.transform = `scaleX(${progressRatio})`;

      clearInterval(typeInterval);
      typeInterval = setInterval(arguments.callee, delay);
    },30);
  }

  // -----------------------------
  // Show / Hide Banner
  // -----------------------------
  function hideBanner() {
    banner.style.opacity="0";
    portrait.style.opacity="0";
    timerBar.style.transform="scaleX(0)";
    setTimeout(()=>{
      banner.style.display="none";
      currentMessage=null;
      processNextMessage();
    },250);
  }

  function showBanner(message){
    if(!banner) createBannerDom();
    currentMessage=message;
    applyBannerSettings();

    const actorName = message.speaker?.actor ? game.actors.get(message.speaker.actor)?.name : message.user?.name || "Unknown";
    nameEl.innerHTML=actorName;

    if(game.settings.get("hearme-chat-notification","vnPortraitEnabled")){
      portrait.src = message.speaker?.token
        ? game.scenes.active?.tokens.get(message.speaker.token)?.texture.src
        : game.actors.get(message.speaker.actor)?.img || "";
      portrait.style.opacity="1";
    }

    banner.style.display="flex";
    banner.style.opacity="1";

    typeWriter(msgEl, message.content, ()=>{
      const delayPerChar = game.settings.get("hearme-chat-notification","vnAutoHideTimePerChar")||0.3;
      const duration = delayPerChar>0 ? message.content.length*delayPerChar*1000:3000;
      timerBar.style.transition=`transform ${duration}ms linear`;
      timerBar.style.transform="scaleX(0)";

      hideTimeout = setTimeout(()=>{
        timerBar.style.transition="none";
        hideBanner();
      },duration);

      if(game.settings.get("hearme-chat-notification","vnHideUntilDismissed") && !message.getFlag("hearme-chat-notification","vnSent")){
        message.setFlag("hearme-chat-notification","vnSent",true);
        ChatMessage.create({content:message.content,speaker:message.speaker});
      }
    });
  }

  // -----------------------------
  // Queue Messages
  // -----------------------------
  function queueMessage(message){
    messageQueue.push(message);
    if(!typing && !currentMessage) processNextMessage();
  }

  function processNextMessage(){
    if(messageQueue.length===0) return;
    const next=messageQueue.shift();
    showBanner(next);
  }

  document.addEventListener("keydown",(ev)=>{
    if(["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
    const skipKey = game.settings.get("hearme-chat-notification","vnSkipKey")||" ";
    if(!currentMessage) return;

    if(ev.key===skipKey){
      if(typing){
        clearInterval(typeInterval);
        msgEl.innerHTML=formatMessageText(currentMessage.content);
        typing=false;
        const delayPerChar = game.settings.get("hearme-chat-notification","vnAutoHideTimePerChar")||0.3;
        hideTimeout=setTimeout(hideBanner,currentMessage.content.length*delayPerChar*1000);
      }else hideBanner();
    }
  });

  // -----------------------------
  // Chat Hook
  // -----------------------------
  createBannerDom();
  Hooks.on("createChatMessage",(message)=>{
    if(!message.visible || message.isRoll) return;
    if(message.type===CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    if(message.getFlag("hearme-chat-notification","vnSent")) return;
    const content = message.content.trim();
    if(!content || content.startsWith("/ooc") || !message.speaker?.actor) return;

    queueMessage(message);
  });
});
