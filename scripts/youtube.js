const MODULE_ID = "youtube-music-player";
let ytPlayer;
let isPlaying = false;

Hooks.once("ready", () => {
  if (!game.user.isGM) return;

  // Inject YouTube API script
  if (!window.YT) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }

  createMusicUI();

  game.socket.on(`module.${MODULE_ID}`, (data) => {
    if (data.action === "play") {
      loadAndPlayYouTube(data.videoId);
    } else if (data.action === "stop") {
      stopYouTube();
    }
  });
});

function createMusicUI() {
  const uiContainer = document.createElement("div");
  uiContainer.id = "yt-music-ui";
  uiContainer.style.position = "fixed";
  uiContainer.style.top = "10px";
  uiContainer.style.right = "10px";
  uiContainer.style.zIndex = 1000;
  uiContainer.style.background = "rgba(0, 0, 0, 0.85)";
  uiContainer.style.padding = "10px";
  uiContainer.style.borderRadius = "8px";
  uiContainer.style.boxShadow = "0 0 10px #000";
  uiContainer.style.color = "#fff";
  uiContainer.style.cursor = "move";

  uiContainer.innerHTML = `
    <label for="yt-url" style="display:block;margin-bottom:5px;">YouTube URL:</label>
    <input id="yt-url" type="text" placeholder="https://youtube.com/watch?v=..." style="width: 200px; margin-bottom: 5px; background: #222; color: white; border: 1px solid #444;" />
    <br/>
    <button id="yt-toggle-btn">Play for All Players</button>
  `;

  document.body.appendChild(uiContainer);

  // Make draggable
  makeDraggable(uiContainer);

  document.getElementById("yt-toggle-btn").addEventListener("click", () => {
    const url = document.getElementById("yt-url").value.trim();
    const videoId = extractYouTubeID(url);
    const action = isPlaying ? "stop" : "play";

    if (action === "play" && !videoId) {
      ui.notifications.error("Invalid YouTube URL.");
      return;
    }

    const payload = { action, videoId };
    game.socket.emit(`module.${MODULE_ID}`, payload);

    // Also run locally for GM
    if (action === "play") {
      loadAndPlayYouTube(videoId);
    } else {
      stopYouTube();
    }

    isPlaying = !isPlaying;
    document.getElementById("yt-toggle-btn").innerText = isPlaying ? "Stop Music" : "Play for All Players";
  });
}

function extractYouTubeID(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match ? match[1] : null;
}

function loadAndPlayYouTube(videoId) {
  // Create container if not exists
  if (!document.getElementById("yt-player-container")) {
    const container = document.createElement("div");
    container.id = "yt-player-container";
    container.style.position = "fixed";
    container.style.bottom = "10px";
    container.style.left = "10px";
    container.style.width = "300px";
    container.style.height = "0px"; // audio only
    container.style.overflow = "hidden";
    container.style.zIndex = 1000;
    document.body.appendChild(container);
  }

  if (window.YT && YT.Player) {
    createPlayer(videoId);
  } else {
    window.onYouTubeIframeAPIReady = () => createPlayer(videoId);
  }
}

function createPlayer(videoId) {
  if (ytPlayer) {
    ytPlayer.loadVideoById(videoId);
    return;
  }

  ytPlayer = new YT.Player("yt-player-container", {
    videoId,
    playerVars: {
      autoplay: 1,
      controls: 0,
      loop: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      mute: 1,
      playlist: videoId
    },
    events: {
      onReady: (event) => event.target.playVideo(),
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          event.target.seekTo(0);
          event.target.playVideo();
        }
      }
    }
  });
}

function stopYouTube() {
  if (ytPlayer && ytPlayer.stopVideo) {
    ytPlayer.stopVideo();
  }
}

function makeDraggable(element) {
  let isDragging = false;
  let offsetX, offsetY;

  element.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    element.style.left = `${e.clientX - offsetX}px`;
    element.style.top = `${e.clientY - offsetY}px`;
    element.style.right = "auto";
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
}
