// Add this to your Foundry VTT module or execute in the console
Hooks.on("chatMessage", (chatLog, messageText, chatData) => {
  // Only act on GM OOC messages
  if (chatData.type === CONST.CHAT_MESSAGE_TYPES.OOC && game.user.isGM) {
    const existingBox = document.getElementById("gm-ooc-box");
    if (existingBox) existingBox.remove(); // Remove old box

    const box = document.createElement("div");
    box.id = "gm-ooc-box";
    box.style.position = "fixed";
    box.style.top = "20%";
    box.style.left = "50%";
    box.style.transform = "translateX(-50%)";
    box.style.backgroundColor = "black";
    box.style.color = "white";
    box.style.padding = "10px 20px";
    box.style.borderRadius = "5px";
    box.style.fontSize = "14px";
    box.style.opacity = "0";
    box.style.transition = "all 0.5s ease";

    box.textContent = messageText;
    document.body.appendChild(box);

    // Trigger fade/slide animation
    requestAnimationFrame(() => {
      box.style.opacity = "1";
      box.style.top = "50%";
      box.style.transform = "translate(-50%, -50%)";
    });

    // Calculate duration: 2s + 0.5s per letter
    const duration = 2000 + 500 * messageText.length;

    setTimeout(() => {
      box.style.opacity = "0";
      box.style.top = "40%";
      setTimeout(() => box.remove(), 500); // Remove after fade
    }, duration);
  }
});
