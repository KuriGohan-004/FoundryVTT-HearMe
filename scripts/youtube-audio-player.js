// Module name: youtube-audio-player
// Save this as: modules/youtube-audio-player/module.js (or wherever your custom module lives)

class YoutubeAudioPlayer {
  static ID = "youtube-audio-player";
  static currentVideoId = null;
  static isPlaying = false;
  static audioElement = null;

  static init() {
    // Create the control bar (only for GM)
    if (game.user.isGM) {
      this.createControlBar();
    }

    // Listen for the global playback signal
    game.socket?.on(`module.${this.ID}.play`, (data) => {
      this.playAudioForAll(data.videoId);
    });

    game.socket?.on(`module.${this.ID}.stop`, () => {
      this.stopAudio();
    });

    // When a player connects, send them the current song if any
    Hooks.on("userConnected", (user) => {
      if (game.user.isGM && this.currentVideoId) {
        setTimeout(() => {
          game.socket.emit(`module.${this.ID}.play`, { videoId: this.currentVideoId });
        }, 2000); // give them time to load
      }
    });
  }

  static createControlBar() {
    const bar = document.createElement("div");
    bar.id = "youtube-audio-control-bar";
    bar.style.position = "fixed";
    bar.style.bottom = "10px";
    bar.style.left = "50%";
    bar.style.transform = "translateX(-50%)";
    bar.style.background = "rgba(0,0,0,0.7)";
    bar.style.padding = "8px 16px";
    bar.style.borderRadius = "8px";
    bar.style.zIndex = "10000";
    bar.style.color = "white";
    bar.style.fontFamily = "Arial, sans-serif";
    bar.style.userSelect = "none";
    bar.style.cursor = "move";
    bar.style.display = "flex";
    bar.style.gap = "10px";
    bar.style.alignItems = "center";

    // Make draggable
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    
    bar.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
      isDragging = true;
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
    });
    
    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        bar.style.left = `${currentX}px`;
        bar.style.top = `${currentY}px`;
        bar.style.transform = "none";
        bar.style.bottom = "auto";
      }
    });
    
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Input + buttons
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "YouTube video ID or full URL";
    input.style.width = "240px";
    input.style.padding = "4px 8px";

    const playBtn = document.createElement("button");
    playBtn.textContent = "Play";
    playBtn.style.padding = "4px 12px";
    playBtn.style.background = "#4CAF50";
    playBtn.style.color = "white";
    playBtn.style.border = "none";
    playBtn.style.borderRadius = "4px";
    playBtn.style.cursor = "pointer";

    const stopBtn = document.createElement("button");
    stopBtn.textContent = "Stop";
    stopBtn.style.padding = "4px 12px";
    stopBtn.style.background = "#f44336";
    stopBtn.style.color = "white";
    stopBtn.style.border = "none";
    stopBtn.style.borderRadius = "4px";
    stopBtn.style.cursor = "pointer";

    playBtn.onclick = () => {
      let url = input.value.trim();
      let videoId = this.extractVideoId(url);
      if (videoId) {
        this.currentVideoId = videoId;
        this.playAudioForAll(videoId);
        game.socket.emit(`module.${this.ID}.play`, { videoId });
        ui.notifications.info(`Now playing: ${videoId}`);
      } else {
        ui.notifications.warn("Invalid YouTube URL or ID");
      }
    };

    stopBtn.onclick = () => {
      this.stopAudio();
      game.socket.emit(`module.${this.ID}.stop`);
      ui.notifications.info("Music stopped");
    };

    bar.appendChild(input);
    bar.appendChild(playBtn);
    bar.appendChild(stopBtn);
    document.body.appendChild(bar);

    // Restore position if saved
    const savedPos = game.settings.get(this.ID, "controlBarPos");
    if (savedPos) {
      bar.style.left = savedPos.left;
      bar.style.top = savedPos.top;
      bar.style.bottom = "auto";
      bar.style.transform = "none";
    }

    // Save position when moved
    const observer = new MutationObserver(() => {
      game.settings.set(this.ID, "controlBarPos", {
        left: bar.style.left,
        top: bar.style.top
      });
    });
    observer.observe(bar, { attributes: true, attributeFilter: ["style"] });
  }

  static extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
      /^([A-Za-z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  static playAudioForAll(videoId) {
    this.stopAudio(); // clean up old one

    this.currentVideoId = videoId;
    this.isPlaying = true;

    const audio = document.createElement("audio");
    audio.id = "global-youtube-audio";
    audio.loop = true;
    audio.autoplay = true;
    audio.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&mute=0&enablejsapi=1`;
    audio.style.display = "none";
    document.body.appendChild(audio);

    this.audioElement = audio;

    // Try to play (some browsers require user interaction)
    audio.play().catch(() => {
      console.warn("Autoplay blocked - waiting for user interaction");
    });
  }

  static stopAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.remove();
      this.audioElement = null;
    }
    this.isPlaying = false;
    this.currentVideoId = null;
  }
}

// Register settings for position persistence
Hooks.once("init", () => {
  game.settings.register(YoutubeAudioPlayer.ID, "controlBarPos", {
    name: "Control Bar Position",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
});

// Hook into ready to initialize
Hooks.once("ready", () => {
  YoutubeAudioPlayer.init();
});
