const MODULE_ID = "youtube-music-player";
let audioElement;
let isPlaying = false;

Hooks.once("ready", () => {
  if (!game.user.isGM) return;

  createMusicUI();

  game.socket.on(`module.${MODULE_ID}`, (data) => {
    if (data.action === "play") {
      playAudio(data.src);
    } else if (data.action === "stop") {
      stopAudio();
    }
  });
});

function createMusicUI() {
  const container = document.createElement("div");
  container.id = "yt-music-ui";
  Object.assign(container.style, {
    position: "fixed",
    top: "10px",
    left: "10px",
    width: "260px",
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    padding: "10px",
    borderRadius: "8px",
    boxShadow: "0 0 10px #000",
    cursor: "move",
    zIndex: 1000
  });
  container.innerHTML = `
    <label>Audio File Path:</label>
    <input id="audio-src" type="text" placeholder="modules/myModule/audio/song.mp3" style="width:100%; background:#222; color:#fff; border:1px solid #444; margin-bottom:5px;" />
    <button id="audio-toggle-btn">Play for All Players</button>
  `;
  document.body.appendChild(container);
  makeBoundedDraggable(container);

  document.getElementById("audio-toggle-btn").addEventListener("click", () => {
    const src = document.getElementById("audio-src").value.trim();
    const action = isPlaying ? "stop" : "play";
    if (action === "play" && !src) return ui.notifications.error("Please enter an audio file path.");
    game.socket.emit(`module.${MODULE_ID}`, { action, src });
    if (action === "play") playAudio(src);
    else stopAudio();
    isPlaying = !isPlaying;
    document.getElementById("audio-toggle-btn").innerText = isPlaying ? "Stop Music" : "Play for All Players";
  });
}

function playAudio(src) {
  if (!audioElement) {
    audioElement = new Audio(src);
    audioElement.loop = true;
    audioElement.volume = 0.5;
  } else {
    audioElement.src = src;
  }
  audioElement.play().catch(err => ui.notifications.error("Audio play failed: " + err.message));
}

function stopAudio() {
  if (audioElement) audioElement.pause();
}

function makeBoundedDraggable(el) {
  let dragging = false, offsetX=0, offsetY=0;

  el.addEventListener("mousedown", e => {
    if (["INPUT","BUTTON"].includes(e.target.tagName)) return;
    dragging = true;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(e) {
    if (!dragging) return;
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;
    const { innerWidth, innerHeight } = window;
    newLeft = Math.max(0, Math.min(newLeft, innerWidth - el.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, innerHeight - el.offsetHeight));
    el.style.left = newLeft + "px";
    el.style.top = newTop + "px";
  }

  function onMouseUp() {
    dragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
}
