let player;
let currentVideoId = null;

Hooks.once('ready', () => {
  createYoutubePlayerUI();
  loadYoutubeAPI();

  game.socket.on("module.youtube-sync", ({ action, time, url }) => {
    const videoId = extractVideoId(url);

    switch (action) {
      case "load":
        if (videoId) {
          currentVideoId = videoId;
          if (player) {
            player.loadVideoById(videoId);
          } else {
            waitForAPI(() => createYoutubePlayer(videoId));
          }
        }
        break;
      case "play":
        player?.playVideo();
        break;
      case "pause":
        player?.pauseVideo();
        break;
      case "seek":
        player?.seekTo(time, true);
        break;
    }
  });
});

function createYoutubePlayerUI() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.left = '10px';
  container.style.background = '#222';
  container.style.color = '#fff';
  container.style.padding = '10px';
  container.style.borderRadius = '6px';
  container.style.zIndex = 10000;
  container.style.width = '300px';

  let html = '';
  if (game.user.isGM) {
    html += `
      <input id="yt-url" type="text" placeholder="Enter YouTube URL" style="width:100%; margin-bottom:5px; padding:4px;" />
      <button id="yt-load" style="width:100%; margin-bottom:5px;">Load Video</button>
      <button id="yt-play" style="width:100%; margin-bottom:5px;">Play</button>
      <button id="yt-pause" style="width:100%;">Pause</button>
    `;
  }
  html += `<div id="player" style="margin-top:10px;"></div>`;

  container.innerHTML = html;
  document.body.appendChild(container);

  if (game.user.isGM) {
    document.getElementById("yt-load").onclick = () => {
      const url = document.getElementById("yt-url").value;
      const videoId = extractVideoId(url);
      if (!videoId) return ui.notifications.error("Invalid YouTube URL.");
      currentVideoId = videoId;
      game.socket.emit("module.youtube-sync", { action: "load", url });
      waitForAPI(() => createYoutubePlayer(videoId));
    };

    document.getElementById("yt-play").onclick = () => {
      game.socket.emit("module.youtube-sync", { action: "play" });
      player?.playVideo();
    };

    document.getElementById("yt-pause").onclick = () => {
      game.socket.emit("module.youtube-sync", { action: "pause" });
      player?.pauseVideo();
    };
  }
}

function loadYoutubeAPI() {
  if (window.YT) return;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}

function waitForAPI(callback) {
  if (window.YT && window.YT.Player) {
    callback();
  } else {
    setTimeout(() => waitForAPI(callback), 200);
  }
}

function createYoutubePlayer(videoId) {
  player = new YT.Player("player", {
    height: "200",
    width: "100%",
    videoId,
    playerVars: {
      autoplay: 0,
      loop: 1,
      playlist: videoId,
    },
    events: {
      onReady: () => {
        if (!game.user.isGM) player.pauseVideo(); // clients wait for GM
      }
    }
  });
}

function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}
