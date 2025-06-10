let player = null;
let pendingVideoId = null;
let vmReady = false;

Hooks.once("ready", () => {
  setupUI();
  loadYouTubeAPI();

  game.socket.on("module.youtube-sync", ({ action, url }) => {
    const vid = extractId(url);
    if (action === "load" && vid) {
      pendingVideoId = vid;
      if (vmReady) loadVideo(vid);
    } else if (action === "play") {
      player?.playVideo();
    } else if (action === "pause") {
      player?.pauseVideo();
    }
  });
});

function setupUI() {
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed", top: "10px", left: "10px",
    background: "#222", color: "#fff", padding: "10px",
    borderRadius: "6px", zIndex: 10000, width: "300px"
  });

  container.innerHTML = `
    ${game.user.isGM ? `
      <input id="yt-url" placeholder="YouTube URL" style="width:100%;margin-bottom:5px;padding:4px;" />
      <button id="yt-load" style="width:100%;margin-bottom:5px;">Load Video</button>
      <button id="yt-play" style="width:100%;margin-bottom:5px;">Play</button>
      <button id="yt-pause" style="width:100%;">Pause</button>
    ` : ""}
    <div id="player" style="margin-top:10px;">
      <iframe id="yt-iframe" width="100%" height="200"
        frameborder="0" allow="autoplay; encrypted-media"
        allowfullscreen></iframe>
    </div>`;
  document.body.appendChild(container);

  if (game.user.isGM) {
    document.getElementById("yt-load").onclick = () => {
      const url = document.getElementById("yt-url").value;
      const vid = extractId(url);
      if (!vid) return ui.notifications.error("Invalid YouTube URL.");
      pendingVideoId = vid;
      game.socket.emit("module.youtube-sync", {action: "load", url});
      if (vmReady) loadVideo(vid);
    };
    document.getElementById("yt-play").onclick = () => {
      game.socket.emit("module.youtube-sync", {action: "play"});
      player?.playVideo();
    };
    document.getElementById("yt-pause").onclick = () => {
      game.socket.emit("module.youtube-sync", {action: "pause"});
      player?.pauseVideo();
    };
  }
}

function loadYouTubeAPI() {
  if (window.YT && YT.Player) return onAPIReady();
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
  window.onYouTubeIframeAPIReady = onAPIReady;
}

function onAPIReady() {
  const iframe = document.getElementById("yt-iframe");
  // Add enablejsapi and correct origin for all clients
  const origin = window.location.origin;
  iframe.src = `https://www.youtube.com/embed/?enablejsapi=1&origin=${encodeURIComponent(origin)}`;
  
  player = new YT.Player(iframe, {
    height: "200",
    width: "100%",
    videoId: "",
    playerVars: { loop: 1, playlist: "" },
    events: { onReady: () => {
      vmReady = true;
      if (pendingVideoId) loadVideo(pendingVideoId);
    }}
  });
}

function loadVideo(vid) {
  player.loadVideoById(vid);
  player.setLoop(true);
  player.cuePlaylist({ list: vid, listType: 'playlist' });
}

function extractId(url) {
  const m = url.match(/(?:youtu\.com\/.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
