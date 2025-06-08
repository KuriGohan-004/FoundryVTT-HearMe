Hooks.once("ready", () => {
  const YT_VIDEO_ID = "dQw4w9WgXcQ"; // Replace with your video ID

  // Only insert once
  if (document.getElementById("yt-player-container")) return;

  const container = document.createElement("div");
  container.id = "yt-player-container";
  container.style.position = "fixed";
  container.style.bottom = "10px";
  container.style.right = "10px";
  container.style.zIndex = 1000;
  container.style.width = "300px";
  container.style.height = "0px";
  container.style.overflow = "hidden"; // hide video
  document.body.appendChild(container);

  // Inject YouTube API script
  if (!window.YT) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }

  // Create the iframe player once API is ready
  window.onYouTubeIframeAPIReady = () => {
    new YT.Player("yt-player-container", {
      videoId: YT_VIDEO_ID,
      events: {
        onReady: (event) => {
          event.target.setVolume(50);
          event.target.playVideo();
        },
        onStateChange: (event) => {
          // Loop if video ends
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
        mute: 1, // browsers block autoplay unless muted
        playlist: YT_VIDEO_ID // required for loop to work
      }
    });
  };
});
