const MODULE_ID = "youtube-music-player";

// Create a socket namespace
Hooks.once("socketlib.ready", () => {
  game.modules.get(MODULE_ID).socket = socketlib.registerModule(MODULE_ID);
  game.modules.get(MODULE_ID).socket.register("playMusic", playYouTubeMusic);
});

Hooks.once("ready", () => {
  if (!game.user.isGM) return;

  // Create container UI
  const uiContainer = document.createElement("div");
  uiContainer.id = "yt-music-ui";
  uiContainer.style.position = "fixed";
  uiContainer.style.top = "10px";
  uiContainer.style.right = "10px";
  uiContainer.style.zIndex = 1000;
  uiContainer.style.background = "rgba(0, 0, 0, 0.8)";
  uiContainer.style.padding = "10px";
  uiContainer.style.borderRadius = "8px";
  uiContainer.style.boxShadow = "0 0 10px #000";
  uiContainer.style.color = "#fff";

  uiContainer.innerHTML = `
    <label for="yt-url" style="display:block;margin-bottom:5px;">YouTube URL:</label>
    <input id="yt-url" type="text" placeholder="https://youtube.com/watch?v=..." style="width: 200px; margin-bottom: 5px;" />
    <br/>
    <button id="yt-play-btn">Play for All Players</button>
  `;

  document.body.appendChild(uiContainer);

  document.getElementById("yt-play-btn").addEventListener("click", () => {
    const url = document.getElementById("yt-url").value.trim();
    const videoId = extractYouTubeID(url);
    if (!videoId) {
      ui.notifications.error("Invalid YouTube URL.");
      return;
    }

    game.modules.get(MODULE_ID).socket.executeForEveryone("playMusic", videoId);
  });
});

// Extract YouTube video ID from URL
function extractYouTubeID(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match ? match[1] : null;
}

// Function to play YouTube video
function playYouTubeMusic(videoId) {
  // Only insert once
  if (document.getElementById("yt-player-container")) {
    const existingPlayer = document.getElementById("yt-player-container");
    existingPlayer.innerHTML = "";
  } else {
    const container = document.createElement("div");
    container.id = "yt-player-container";
    container.style.position = "fixed";
    container.style.bottom = "10px";
    container.style.left = "10px";
    container.style.width = "300px";
    container.style.height = "0px"; // audio-only
    container.style.overflow = "hidden";
    container.style.zIndex = 1000;
    document.body.appendChild(container);
  }

  // Inject YouTube API script only once
  if (!window.YT) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }

  window.onYouTubeIframeAPIReady = () => {
    new YT.Player("yt-player-container", {
      videoId: videoId,
      events: {
        onReady: (event) => {
          event.target.setVolume(50);
          event.target.playVideo();
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.ENDED) {
            event.target.seekTo(0);
            event.target.playVideo();
          }
        }
      },
      playerVars: {
        autoplay: 1,
        controls: 0,
        loop: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        mute: 1, // autoplay requires mute
        playlist: videoId
      }
    });
  };
}
