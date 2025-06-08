const MODULE_ID = "my-youtube-sync";
let player;
let currentVideoId = "";

// When Foundry is ready, build the interface
Hooks.once("ready", () => {
  createUI();
  loadYouTubeAPI();

  // Listen for GM play/stop actions
  game.socket.on(`module.${MODULE_ID}`, ({ action, videoId }) => {
    if (action === "play") {
      currentVideoId = videoId;
      loadVideo(videoId);
    } else if (action === "stop") {
      if (player) player.stopVideo();
    }
  });
});

// UI setup
function createUI() {
  const panel = document.createElement("div");
  panel.id = "yt-sync-panel";
  Object.assign(panel.style, {
    position: "fixed",
    top: "10px",
    left: "10px",
    background: "#000",
    color: "#fff",
    padding: "10px",
    borderRadius: "8px",
    zIndex: 10000,
    width: "300px",
    boxShadow: "0 0 8px #000"
  });

  panel.innerHTML = `
    ${game.user.isGM ? `
      <label style="color:white;">YouTube URL or ID:</label><br/>
      <input type="text" id="yt-url" style="width: 100%; margin-bottom: 5px; color: white; background-color: #222;"/><br/>
      <button id="yt-play">Play for All</button>
      <button id="yt-stop">Stop</button><br/><br/>
    ` : ''}
    <div id="yt-player" style="width:100%; aspect-ratio:16/9;"></div>
  `;

  document.body.appendChild(panel);

  if (game.user.isGM) {
    document.getElementById("yt-play").onclick = () => {
      const input = document.getElementById("yt-url").value.trim();
      const videoId = extractYouTubeID(input);
      if (!videoId) return ui.notifications.warn("Invalid YouTube URL or ID");
      game.socket.emit(`module.${MODULE_ID}`, { action: "play", videoId });
      loadVideo(videoId);
    };

    document.getElementById("yt-stop").onclick = () => {
      game.socket.emit(`module.${MODULE_ID}`, { action: "stop" });
      if (player) player.stopVideo();
    };
  }

  makeBoundedDraggable(panel);
}

// YouTube video ID extractor
function extractYouTubeID(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\\?v=|embed\/|v\/))([\\w-]{11})/);
  return match ? match[1] : url;
}

// Inject YouTube API script
function loadYouTubeAPI() {
  if (window.YT) return;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = () => {
    if (currentVideoId) loadVideo(currentVideoId);
  };
}

// Load or reload the video
function loadVideo(videoId) {
  if (!window.YT || !YT.Player) return;

  const options = {
    videoId,
    width: "100%",
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      loop: 1,
      playlist: videoId
    },
    events: {
      onReady: (e) => e.target.playVideo(),
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) {
          e.target.playVideo();
        }
      }
    }
  };

  if (player) {
    player.loadVideoById(videoId);
  } else {
    player = new YT.Player("yt-player", options);
  }
}

// Make the panel draggable within bounds
function makeBoundedDraggable(el) {
  let isDragging = false;
  let offsetX, offsetY;

  el.addEventListener("mousedown", (e) => {
    if (["INPUT", "BUTTON"].includes(e.target.tagName)) return;
    isDragging = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stopDrag);
  });

  function drag(e) {
    if (!isDragging) return;
    const x = Math.min(window.innerWidth - el.offsetWidth, Math.max(0, e.clientX - offsetX));
    const y = Math.min(window.innerHeight - el.offsetHeight, Math.max(0, e.clientY - offsetY));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
  }
}
