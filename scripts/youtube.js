const MODULE_ID = "my-youtube-sync";
let player;
let currentVideoId = "";

// UI + YouTube API setup
Hooks.once("ready", () => {
  createUI();
  loadYouTubeAPI();

  // Listen for GM actions
  game.socket.on(`module.${MODULE_ID}`, ({ action, videoId }) => {
    if (action === "play") {
      currentVideoId = videoId;
      loadVideo(videoId);
    } else if (action === "stop" && player) {
      player.stopVideo();
    }
  });
});

// UI creation
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
    maxWidth: "90vw",
    boxShadow: "0 0 10px #000",
    fontFamily: "sans-serif"
  });

  panel.innerHTML = `
    ${game.user.isGM ? `
      <label style="color:white;">YouTube URL or ID:</label><br/>
      <input type="text" id="yt-url" style="width: 100%; margin-bottom: 5px; color: white; background-color: #222; border: none; padding: 4px;"/><br/>
      <button id="yt-play">Play for All</button>
      <button id="yt-stop">Stop</button><br/><br/>
    ` : ''}
    <div id="yt-player" style="width:100%; aspect-ratio:16/9; background: black;"></div>
  `;

  document.body.appendChild(panel);
  makeBoundedDraggable(panel);

  if (game.user.isGM) {
    document.getElementById("yt-play").onclick = () => {
      const input = document.getElementById("yt-url").value.trim();
      const videoId = extractYouTubeID(input);
      if (!videoId || videoId.length !== 11) {
        ui.notifications.warn("Invalid YouTube URL or ID.");
        return;
      }
      currentVideoId = videoId;
      game.socket.emit(`module.${MODULE_ID}`, { action: "play", videoId });
      loadVideo(videoId);
    };

    document.getElementById("yt-stop").onclick = () => {
      game.socket.emit(`module.${MODULE_ID}`, { action: "stop" });
      if (player) player.stopVideo();
    };
  }
}

// YouTube ID extractor
function extractYouTubeID(input) {
  try {
    const url = new URL(input.includes("http") ? input : `https://youtube.com/watch?v=${input}`);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1);
    }
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v");
    }
  } catch (e) {
    // If it's not a URL, assume raw ID
    return input.length === 11 ? input : null;
  }
  return null;
}

// Load the YouTube Player API
function loadYouTubeAPI() {
  if (window.YT && typeof YT.Player === "function") {
    if (currentVideoId) loadVideo(currentVideoId);
    return;
  }

  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(script);

  window.onYouTubeIframeAPIReady = () => {
    if (currentVideoId) loadVideo(currentVideoId);
  };
}

// Load a video into the embedded player
function loadVideo(videoId) {
  if (!window.YT || !YT.Player) return;

  const container = document.getElementById("yt-player");
  container.innerHTML = ""; // Clear existing iframe

  player = new YT.Player("yt-player", {
    videoId,
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      loop: 1,
      playlist: videoId
    },
    events: {
      onReady: (e) => e.target.playVideo(),
      onError: (e) => {
        console.warn("YouTube error code:", e.data);
        ui.notifications.error("This video cannot be embedded. Try a different video.");
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) e.target.playVideo();
      }
    }
  });
}

// Draggable and bounded
function makeBoundedDraggable(el) {
  let isDragging = false, offsetX = 0, offsetY = 0;

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
    const x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, e.clientX - offsetX));
    const y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - offsetY));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
  }
}
