/***********************************************************************
 * HearMe Player Bar – rotated fading name aligned to sidebar
 *  • v3  (2025‑07‑16)
 *  • Adds settings menu, hide‑in‑combat toggle, and auto‑select turn
 **********************************************************************/
(() => {
  /* ---------- Module constants & settings ------------------------ */
  const MODULE_ID = "hearme-player-bar";
  const BAR_ID    = "player-token-bar";
  const LABEL_ID  = "player-token-bar-label";
  const CENTER_ID = "player-token-bar-center-label";

  /* --- Register settings & menu on init ------------------------- */
  Hooks.once("init", () => {

    /* Settings menu (opens a tiny form with the two switches) */
    game.settings.registerMenu(MODULE_ID, "configMenu", {
      name: "HearMe Player Bar",
      label: "HearMe Player Bar",
      icon: "fas fa-bars",
      type: class HearMeBarConfig extends FormApplication {
        static get defaultOptions() {
          return foundry.utils.mergeObject(super.defaultOptions, {
            id: "hearme-player-bar-config",
            title: "HearMe Player Bar",
            template: `
              <form class="flexcol">
                <div class="form-group">
                  <label>Enable Player Bar</label>
                  <input type="checkbox" name="enabled"/>
                  <p class="notes">Toggle the whole bar on or off.</p>
                </div>
                <div class="form-group">
                  <label>Hide During Combat</label>
                  <input type="checkbox" name="hideInCombat"/>
                  <p class="notes">If enabled, the bar fades out whenever combat is running.</p>
                </div>
                <footer class="sheet-footer flexrow">
                  <button type="submit" name="submit"><i class="far fa-save"></i> Save</button>
                </footer>
              </form>`,
            width: 420,
          });
        }
        getData() {
          return {
            enabled     : game.settings.get(MODULE_ID, "enabled"),
            hideInCombat: game.settings.get(MODULE_ID, "hideInCombat"),
          };
        }
        async _updateObject(_ev, formData) {
          await game.settings.set(MODULE_ID, "enabled",      !!formData.enabled);
          await game.settings.set(MODULE_ID, "hideInCombat", !!formData.hideInCombat);
          ui.notifications.info("HearMe Player Bar settings saved.");
          Hooks.callAll("hearmeBarSettingsChanged");
        }
      },
      restricted: false
    });

    /* Individual settings (so they can also appear under Module Settings) */
    game.settings.register(MODULE_ID, "enabled", {
      name: "Enable Player Bar", scope: "client", config: false, default: true,  type: Boolean
    });
    game.settings.register(MODULE_ID, "hideInCombat", {
      name: "Hide During Combat", scope: "client", config: false, default: true, type: Boolean
    });
  });

  /* ---------- Styles (unchanged from v2) ------------------------- */
  const CSS = `
  /* Bottom bar --------------------------------------------------- */
  #${BAR_ID}{
    position:fixed; bottom:0; left:25%; width:50%; height:84px;
    padding:6px 10px; display:flex;
    align-items:center; justify-content:center;      /* keep centred */
    gap:10px; overflow:hidden;                       /* no scrollbar */
    background:none; border:none;
    z-index:20; pointer-events:auto; transition:opacity .25s ease;
  }
  /* Portraits ----------------------------------------------------- */
  #${BAR_ID} img{
    width:64px; height:64px; object-fit:cover; border-radius:8px;
    border:2px solid #fff; flex:0 0 auto; cursor:pointer;
    transition:transform .15s ease;
  }
  #${BAR_ID} img:hover               {transform:scale(1.20); z-index:1;}
  #${BAR_ID} img.selected-token,
  #${BAR_ID} img.selected-token:hover{transform:scale(1.25); z-index:2;}
  /* Small label above bar ---------------------------------------- */
  #${LABEL_ID}{
    position:fixed; bottom:90px; left:25%; width:50%;
    text-align:center; font-size:16px; font-weight:bold; color:#fff;
    text-shadow:0 0 4px #000; pointer-events:none; z-index:21;
    height:24px; line-height:24px; user-select:none;
  }
  /* Rotated, pulsing name aligned to sidebar --------------------- */
  @keyframes ptbPulse{0%,100%{opacity:1;}50%{opacity:.5;}}
  #${CENTER_ID}{
    position:fixed;
    font-size:48px; font-weight:bold; font-style:italic; color:#fff; text-shadow:0 0 8px #000;
    pointer-events:none; z-index:40; user-select:none;
    animation:ptbPulse 4s infinite;
    transform:rotate(-90deg);
    transform-origin:bottom left;
    padding-left:35%;
  }`;
  document.head.appendChild(Object.assign(document.createElement("style"), {textContent: CSS}));

  /* ---------- DOM helpers --------------------------------------- */
  const el     = (id, tag = "div") => document.getElementById(id) ??
                                      document.body.appendChild(Object.assign(document.createElement(tag), {id}));
  const bar    = () => el(BAR_ID);
  const label  = () => el(LABEL_ID);
  const center = () => el(CENTER_ID);

  /* ---------- State --------------------------------------------- */
  let selectedId   = null;
  let alwaysCenter = false;
  let orderedIds   = [];
  let ownedIds     = [];

  /* ---------- Utility ------------------------------------------- */
  const combatRunning = () => !!(game.combat?.started && game.combat.scene?.id === canvas.scene?.id);
  const canControl    = t => t.isOwner || t.actor?.isOwner;
  const imgSrc        = t => t.document.texture?.src
                       || t.actor?.prototypeToken?.texture?.src
                       || t.actor?.img
                       || "icons/svg/mystery-man.svg";
  const setSmall      = (txt, b = false) => { label().textContent = txt ? (b ? `[[ ${txt} ]]` : txt) : ""; };

  /* --- Position centre label beside sidebar --------------------- */
  function positionCenter() {
    const sb = document.getElementById("sidebar");
    if (!sb) return;
    const c  = center();
    const r  = sb.getBoundingClientRect();
    c.style.left = `${r.left - 4}px`;
    c.style.top  = `${r.top + r.height}px`;
  }
  window.addEventListener("resize", positionCenter);
  const showCenter = txt => { center().textContent = txt; positionCenter(); };

  /* ---------- Token list for bar -------------------------------- */
  function displayTokens() {
    /* GM sees everything linked + offline owners */
    if (game.user.isGM) {
      const sceneLinked   = canvas.tokens.placeables.filter(t => t.document.actorLink);
      const offlineLinked = canvas.tokens.placeables.filter(t => {
        if (!t.document.actorLink) return false;
        const owners = game.users.players.filter(u => t.actor?.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER));
        return owners.length && owners.every(u => !u.active);
      });
      return [...new Set([...sceneLinked, ...offlineLinked])];
    }
    /* Regular player: only what you own */
    return canvas.tokens.placeables.filter(t => canControl(t));
  }

  /* ---------- Build / refresh bar ------------------------------- */
  function refresh() {
    /* If bar disabled – remove DOM and bail out */
    if (!game.settings.get(MODULE_ID, "enabled")) {
      bar().style.display = "none";
      label().style.display = "none";
      center().style.display = "none";
      return;
    } else {
      bar().style.display    = "";
      label().style.display  = "";
      center().style.display = "";
    }

    const b = bar();

    /* Optional hide‑during‑combat */
    if (combatRunning() && game.settings.get(MODULE_ID, "hideInCombat")) {
      b.style.opacity       = "0";
      b.style.pointerEvents = "none";
      setSmall("");
      return;
    }
    b.style.opacity       = "1";
    b.style.pointerEvents = "auto";
    b.replaceChildren();

    /* --- Gather tokens ----------------------------------------- */
    const allToks = displayTokens();
    if (!allToks.length) { setSmall(""); return; }

    /* Ensure a valid selection */
    if (!selectedId || !allToks.some(t => t.id === selectedId))
      selectedId = allToks[0].id;

    orderedIds = allToks.map(t => t.id);
    ownedIds   = allToks.filter(canControl).map(t => t.id);

    /* --- Layout maths ------------------------------------------ */
    const n      = orderedIds.length;
    const selIdx = orderedIds.indexOf(selectedId);

    const leftCount  = (n >= 3) ? 1 : 0;
    const rightCount = (n - 1) - leftCount;
    const wrap = idx => (idx + n) % n;

    const leftTokens  = [];
    const rightTokens = [];
    for (let i = 1; i <= leftCount;  i++) leftTokens .push(canvas.tokens.get(orderedIds[wrap(selIdx - i)]));
    for (let i = 1; i <= rightCount; i++) rightTokens.push(canvas.tokens.get(orderedIds[wrap(selIdx + i)]));

    /* --- Helper to build an <img> ------------------------------- */
    function makeImg(token) {
      const img = document.createElement("img");
      img.src   = imgSrc(token);
      img.alt   = token.name;
      if (token.id === selectedId) img.classList.add("selected-token");

      img.onclick      = () => selectToken(token);
      img.onmouseenter = () => setSmall(token.name, alwaysCenter && token.id === selectedId);
      img.onmouseleave = () => {
        const cur = canvas.tokens.get(selectedId);
        setSmall(cur?.name ?? "", alwaysCenter);
      };
      return img;
    }

    /* --- Containers left | selected | right --------------------- */
    const leftWrap  = Object.assign(document.createElement("div"), {style: "display:flex; gap:10px; flex-direction:row-reverse;"});
    const rightWrap = Object.assign(document.createElement("div"), {style: "display:flex; gap:10px;"});

    leftTokens .forEach(tok => leftWrap .appendChild(makeImg(tok)));
    rightTokens.forEach(tok => rightWrap.appendChild(makeImg(tok)));

    const centreImg = makeImg(canvas.tokens.get(selectedId));

    b.appendChild(leftWrap);
    b.appendChild(centreImg);
    b.appendChild(rightWrap);

    /* --- Labels ------------------------------------------------- */
    const curTok = canvas.tokens.get(selectedId);
    const nm     = curTok?.name ?? "";
    setSmall(nm, alwaysCenter);
    showCenter(nm);
  }

  /* ---------- Selection helpers --------------------------------- */
  function selectToken(t) {
    selectedId = t.id;
    if (canControl(t)) t.control({releaseOthers: true});
    canvas.animatePan(t.center);
    showCenter(t.name);
    refresh();
  }
  function toggleFollow() {
    if (!selectedId) return;
    alwaysCenter = !alwaysCenter;
    const t = canvas.tokens.get(selectedId);
    if (t && alwaysCenter) canvas.animatePan(t.center);
    setSmall(t?.name ?? "", alwaysCenter);
  }

  /* --- Keep bar centred when token moves ------------------------ */
  Hooks.on("updateToken", doc => {
    if (alwaysCenter && doc.id === selectedId) {
      const t = canvas.tokens.get(doc.id);
      if (t) canvas.animatePan(t.center);
    }
  });

  /* --- Auto‑select active combatant ----------------------------- */
  Hooks.on("updateCombat", (combat, changed) => {
    if (!("turn" in changed)) return;               // only care about turn changes
    const cb  = combat.combatant;
    const tok = cb ? canvas.tokens.get(cb.tokenId) : null;
    if (!tok) return;
    /* Only switch if that token is in our bar */
    if (displayTokens().some(t => t.id === tok.id)) selectToken(tok);
  });

  /* ---------- Key handling (unchanged) -------------------------- */
  function cycleOwned(o) {
    if (!ownedIds.length) return;
    let idx = ownedIds.indexOf(selectedId);
    if (idx === -1) idx = 0;
    const next = canvas.tokens.get(ownedIds[(idx + o + ownedIds.length) % ownedIds.length]);
    if (next) selectToken(next);
  }
  function sheetOpen() { return !!document.querySelector(".window-app.sheet:not(.minimized)"); }
  function ensureBarSel() {
    if (canvas.tokens.controlled.length === 0 && selectedId) {
      const t = canvas.tokens.get(selectedId);
      if (t && canControl(t)) t.control({releaseOthers: true});
    }
  }

  window.addEventListener("keydown", ev => {
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target.isContentEditable) return;

    /* WASD / arrows auto‑select */
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) {
      ensureBarSel(); return;
    }

    switch (ev.code) {
      case "KeyE": ev.preventDefault(); cycleOwned(+1); break;
      case "KeyQ": ev.preventDefault(); cycleOwned(-1); break;
      case "KeyR": {
        ev.preventDefault();
        const barTok = canvas.tokens.get(selectedId);
        const curTok = canvas.tokens.controlled[0];
        if (barTok && barTok.id !== curTok?.id) {
          selectToken(barTok);
          if (!alwaysCenter) toggleFollow();
        } else toggleFollow();
        break;
      }
      case "Space": {
        if (combatRunning()) {
          const cb  = game.combat.combatant;
          const tok = cb ? canvas.tokens.get(cb.tokenId) : null;
          if (tok && (game.user.isGM || tok.isOwner)) {
            ev.preventDefault(); game.combat.nextTurn();
          }
        } else { ev.preventDefault(); game.togglePause(); }
        break;
      }
    }
  });

  /* ---------- Rebuild triggers ---------------------------------- */
  Hooks.once("ready",  refresh);
  Hooks.on("canvasReady",   refresh);
  Hooks.on("createToken",   refresh);
  Hooks.on("updateToken",   refresh);
  Hooks.on("deleteToken",   refresh);
  Hooks.on("updateActor",   refresh);
  Hooks.on("deleteCombat",  refresh);
  Hooks.on("hearmeBarSettingsChanged", refresh);

  /* ---------- Improved ENTER behaviour --------------------------- */
  /**
   *  • If Enter is pressed while a text‑editable element is focused → do nothing
   *  • Otherwise → open Chat tab and focus its input
   *  • After a chat message is submitted → blur the input and
   *    re‑select the previously‑controlled token (so WASD etc. work)
   */

  const isEditable = el =>
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el?.isContentEditable;

  /* -- Keydown handler ------------------------------------------- */
  window.addEventListener("keydown", ev => {
    if (ev.code !== "Enter") return;

    /* Case 1 – typing somewhere: leave Foundry’s default alone */
    if (isEditable(ev.target)) return;

    /* Case 2 – no textbox focused: open Chat, focus input */
    ev.preventDefault();
    ui.sidebar?.activateTab("chat");
    (
      document.querySelector("#chat-message") ||
      document.querySelector("textarea[name='message']")
    )?.focus();
  });

  /* -- After chat submit: blur & re‑focus canvas ----------------- */
  Hooks.once("renderChatLog", (app, html) => {
    const form = html[0].querySelector("form");
    if (!form) return;

    form.addEventListener("submit", () => {
      setTimeout(() => {
        /* Blur chat input so keyboard controls are free again */
        form.querySelector("textarea[name='message'],#chat-message")?.blur();

        /* Re‑select previously‑controlled token for movement keys */
        if (canvas?.ready) {
          const sel = canvas.tokens.controlled[0] || canvas.tokens.get(selectedId);
          sel?.control({ releaseOthers: false });
        }
      }, 200);   /* small delay lets Foundry finish its own handlers */
    });
  });
  
  /* ---------- After a chat message is created -------------------- */
  Hooks.on("createChatMessage", () => {
    /* Let Foundry finish its own focus work first */
    requestAnimationFrame(() => {
      /* 1) Blur the chat input ------------------------------------- */
      const chatInput =
        document.querySelector("#chat-message") ||
        document.querySelector("textarea[name='message']");
      chatInput?.blur();

      /* 2) Re‑focus the previously selected token ------------------ */
      const tok =
        canvas.tokens.controlled[0] || canvas.tokens.get(selectedId);
      tok?.control({ releaseOthers: false });
    });
  });

/* ---------- Q key: toggle sheet for the active token -------------- */
window.addEventListener("keydown", ev => {
  if (ev.code !== "Tab") return;             /* only react to Tab        */

  /* Ignore Q when typing in an input / textarea / content‑editable */
  if (
    ev.target instanceof HTMLInputElement ||
    ev.target instanceof HTMLTextAreaElement ||
    ev.target?.isContentEditable
  ) return;

  ev.preventDefault();

  const tok = canvas.tokens.get(selectedId);
  if (!tok || !tok.actor) return;

  const sheet = tok.actor.sheet;
  if (!sheet) return;

  /* If sheet is open and not minimised → close it, else → open it  */
  if (sheet.rendered && !sheet._minimized) {
    sheet.close();
  } else {
    sheet.render(true);
  }
});


  /* ===========================================================
   ACTOR‑SPECIFIC HOTBAR  (save & load on token switch)
   =========================================================== */
const HB_FLAG = "ptb.hotbar";    // where we store per‑actor layouts
let   hotbarActorId = null;      // actor whose layout is currently shown

/* ------------- helpers ------------------------------------------ */
/* Return an object {slot: macroId, …} for slots 1‑10 of page 1      */
function captureHotbar(){
  const map = game.user.getHotbarMacros(1);   // Map<slot, Macro|null>
  const out = {};
  for (let s = 1; s <= 10; s++){
    const macro = map[s];
    if (macro) out[s] = macro.id;
  }
  return out;                                 // empty object = none
}

/* Apply a saved layout object to the user’s hotbar (page 1)        */
async function applyHotbar(layout){
  /* Clear first */
  const current = game.user.getHotbarMacros(1);
  for (let s = 1; s <= 10; s++){
    if (current[s]) await game.user.assignHotbarMacro(null, s);
  }
  /* Re‑populate */
  for (const [slot, mid] of Object.entries(layout)){
    const macro = game.macros.get(mid);
    if (macro) await game.user.assignHotbarMacro(macro, Number(slot));
  }
}

/* Save the current bar to the given actor’s flag ----------------- */
async function saveActorHotbar(actor){
  if (!actor) return;
  const layout = captureHotbar();
  await actor.setFlag("ptb", HB_FLAG, layout);
}

/* Load (if any) from actor; otherwise leave bar empty ------------- */
async function loadActorHotbar(actor){
  if (!actor) return;
  const layout = actor.getFlag("ptb", HB_FLAG) ?? {};
  await applyHotbar(layout);
  hotbarActorId = actor.id;
}

/* ------------- master switch routine ---------------------------- */
async function switchActorHotbar(newActor){
  if (!newActor || newActor.id === hotbarActorId) return;

  /* Save previous */
  const prevActor = game.actors.get(hotbarActorId);
  await saveActorHotbar(prevActor);

  /* Load new */
  await loadActorHotbar(newActor);
}

/* ------------- hook into every way the active token can change -- */
Hooks.on("controlToken", (tok, controlled)=>{
  if (controlled && canControl(tok)) switchActorHotbar(tok.actor);
});

Hooks.on("updateCombat", (c,chg)=>{
  if (chg.turn === undefined) return;
  const com = c.combatant;
  if (com?.sceneId !== canvas.scene?.id) return;
  const tok = canvas.tokens.get(com.tokenId);
  if (tok && canControl(tok)) switchActorHotbar(tok.actor);
});

/* When the module first loads (e.g. page refresh) ---------------- */
Hooks.once("ready", () =>{
  const tok = canvas.tokens.controlled[0] || canvas.tokens.placeables.find(t=>t.isOwner);
  if (tok) switchActorHotbar(tok.actor);
});

  
})();
