const API = {
  async get(path) {
    const r = await fetch(path);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return { ok: r.ok, status: r.status, data: await r.json() };
  },
  async del(path) {
    const r = await fetch(path, { method: "DELETE" });
    return r.json();
  },
};

let currentState = null;
let selectedDuration = "1 month";
let advisorHistory = [];
let diploHistories = {}; // nation -> [{who, text}]

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showLoading(text) {
  $("#loadingText").textContent = text || "Working…";
  $("#loadingVeil").classList.add("show");
}
function hideLoading() {
  $("#loadingVeil").classList.remove("show");
}
function showError(msg) {
  const el = $("#errorBanner");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 9000);
}

// ---------------- Rendering ----------------

function renderHeader(state) {
  $("#hdrNation").textContent = state.nation;
  $("#hdrDate").textContent = state.current_date;
  $("#hdrRound").textContent = state.round_number;
  $("#difficultyTag").textContent = state.difficulty;
}

function renderStats(state) {
  const labels = { economy: "Economy", military: "Military", stability: "Stability", reputation: "Reputation" };
  const box = $("#statsBox");
  box.innerHTML = "";
  for (const key of ["economy", "military", "stability", "reputation"]) {
    const val = state.stats[key];
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <div class="stat-label"><span>${labels[key]}</span><b>${val}</b></div>
      <div class="stat-bar"><div class="stat-bar-fill ${key}" style="width:${val}%"></div></div>
    `;
    box.appendChild(row);
  }
}

function renderRelations(state) {
  const box = $("#relationsBox");
  const entries = Object.entries(state.relations || {});
  if (entries.length === 0) {
    box.innerHTML = '<div class="empty-note">No relations established yet.</div>';
  } else {
    box.innerHTML = "";
    entries
      .sort((a, b) => b[1].sentiment - a[1].sentiment)
      .forEach(([name, rel]) => {
        const div = document.createElement("div");
        const statusClass = (rel.status || "Neutral").replace(/\s+/g, "-");
        div.className = `relation-item ${statusClass}`;
        div.innerHTML = `<div class="rname">${name}</div><div class="rstatus">${rel.status} · sentiment ${rel.sentiment}</div>`;
        div.addEventListener("click", () => {
          switchTab("diplomacy");
          const sel = $("#diploTarget");
          if ([...sel.options].some((o) => o.value === name)) sel.value = name;
        });
        box.appendChild(div);
      });
  }
  // populate diplomacy target dropdown
  const sel = $("#diploTarget");
  const prev = sel.value;
  sel.innerHTML = "";
  entries.forEach(([name]) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  const otherOpt = document.createElement("option");
  otherOpt.value = "__other__";
  otherOpt.textContent = "Other nation…";
  sel.appendChild(otherOpt);
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function renderFeed(state) {
  const box = $("#feedBox");
  const log = state.events_log || [];
  if (log.length === 0) {
    box.innerHTML = '<div class="empty-note">No dispatches yet.</div>';
    return;
  }
  box.innerHTML = "";
  [...log].reverse().forEach((r) => {
    const hasAlert = (r.events || []).some((e) => e.category === "military");
    const card = document.createElement("div");
    card.className = "dispatch" + (hasAlert ? " has-alert" : "");
    const head = document.createElement("div");
    head.className = "dispatch-head";
    head.innerHTML = `<span><span class="rd">ROUND ${r.round}</span> · SITREP</span><span>${r.date}</span>`;
    card.appendChild(head);
    const narr = document.createElement("div");
    narr.className = "dispatch-narrative";
    narr.textContent = r.narrative;
    card.appendChild(narr);
    if (r.events && r.events.length) {
      const evBox = document.createElement("div");
      evBox.className = "dispatch-events";
      r.events.forEach((ev) => {
        const line = document.createElement("div");
        line.className = "event-line";
        line.innerHTML = `<span class="event-cat ${ev.category || "other"}">${ev.category || "other"}</span><span><span class="event-title">${ev.title || ""}</span> — ${ev.description || ""}</span>`;
        evBox.appendChild(line);
      });
      card.appendChild(evBox);
    }
    box.appendChild(card);
  });
}

function renderPending(state) {
  const box = $("#pendingList");
  const actions = state.pending_actions || [];
  if (actions.length === 0) {
    box.innerHTML = '<div class="empty-note">No actions queued. A jump with no actions lets the world drift on its own.</div>';
    return;
  }
  box.innerHTML = "";
  actions.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "pending-item";
    div.innerHTML = `<span>${a}</span><button class="x" data-i="${i}">✕</button>`;
    div.querySelector(".x").addEventListener("click", async () => {
      await API.del(`/api/action/${i}`);
      await refreshState();
    });
    box.appendChild(div);
  });
}

function renderAll(state) {
  currentState = state;
  renderHeader(state);
  renderStats(state);
  renderRelations(state);
  renderFeed(state);
  renderPending(state);
  $("#btnJump").disabled = false;
}

async function refreshState() {
  const res = await API.get("/api/state");
  if (res.active) {
    renderAll(res.state);
  }
  return res.active;
}

// ---------------- Health check ----------------

async function checkHealth() {
  try {
    const res = await API.get("/api/health");
    $("#connDot").className = "dot " + (res.gpt4all_reachable ? "ok" : "bad");
    $("#connLabel").textContent = res.gpt4all_reachable ? "connected" : "unreachable";
  } catch {
    $("#connDot").className = "dot bad";
    $("#connLabel").textContent = "unreachable";
  }
}

// ---------------- Tabs ----------------

function switchTab(name) {
  $$(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
}
$$(".tab-btn").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

// ---------------- New Game (now launched from the menu — see menu.js) ----------------

function resetChatHistories() {
  advisorHistory = [];
  diploHistories = {};
  $("#advisorLog").innerHTML = "";
  $("#diploLog").innerHTML = "";
}
window.resetChatHistories = resetChatHistories;

function backToMenu() {
  $("#game-shell").style.display = "none";
  $("#menu-shell").style.display = "block";
  if (window.renderGames) window.renderGames();
  if (window.go) window.go("games");
}
window.backToMenu = backToMenu;
window.renderAll = renderAll;
window.refreshState = refreshState;
$("#btnNewGame").addEventListener("click", backToMenu);

// ---------------- Actions ----------------

$("#btnPolish").addEventListener("click", async () => {
  const text = $("#actionInput").value.trim();
  if (!text) return showError("Write an action first.");
  showLoading("Polishing action…");
  const { ok, data } = await API.post("/api/action/polish", { text });
  hideLoading();
  if (!ok) return showError(data.error || "Could not polish action.");
  $("#actionInput").value = data.polished;
});

$("#btnQueue").addEventListener("click", async () => {
  const text = $("#actionInput").value.trim();
  if (!text) return showError("Write an action first.");
  const { ok, data } = await API.post("/api/action", { text });
  if (!ok) return showError(data.error || "Could not queue action.");
  $("#actionInput").value = "";
  renderAll(data.state);
});

// ---------------- Advisor ----------------

$("#btnAskAdvisor").addEventListener("click", async () => {
  const question = $("#advisorInput").value.trim();
  if (!question) return showError("Ask the advisor something first.");
  showLoading("Consulting the advisor…");
  const { ok, data } = await API.post("/api/advisor", { question });
  hideLoading();
  if (!ok) return showError(data.error || "Advisor unavailable.");
  advisorHistory.push({ q: question, a: data.answer });
  $("#advisorInput").value = "";
  renderAdvisorLog();
});

function renderAdvisorLog() {
  const box = $("#advisorLog");
  box.innerHTML = "";
  advisorHistory.forEach((item) => {
    const div = document.createElement("div");
    div.className = "qa-item";
    div.innerHTML = `<div class="q">YOU ASKED: ${item.q}</div><div class="a">${item.a}</div>`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

// ---------------- Diplomacy ----------------

$("#diploTarget").addEventListener("change", (e) => {
  if (e.target.value === "__other__") {
    const name = prompt("Nation to contact:");
    if (name) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      e.target.insertBefore(opt, e.target.lastChild);
      e.target.value = name;
    }
  }
  renderDiploLog();
});

function renderDiploLog() {
  const target = $("#diploTarget").value;
  const box = $("#diploLog");
  box.innerHTML = "";
  (diploHistories[target] || []).forEach((m) => {
    const div = document.createElement("div");
    div.className = "chat-msg " + (m.who === "you" ? "mine" : "theirs");
    div.innerHTML = `<div class="who">${m.who === "you" ? "You" : target}</div>${m.text}`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

$("#btnSendDiplo").addEventListener("click", async () => {
  const target = $("#diploTarget").value;
  const message = $("#diploInput").value.trim();
  if (!target || target === "__other__") return showError("Choose who to contact.");
  if (!message) return showError("Write a message first.");
  diploHistories[target] = diploHistories[target] || [];
  diploHistories[target].push({ who: "you", text: message });
  renderDiploLog();
  $("#diploInput").value = "";
  showLoading(`Awaiting reply from ${target}…`);
  const { ok, data } = await API.post("/api/diplomacy", { nation: target, message });
  hideLoading();
  if (!ok) return showError(data.error || "Diplomacy channel unavailable.");
  diploHistories[target].push({ who: "them", text: data.reply });
  renderDiploLog();
  if (data.state) renderAll(data.state);
});

// ---------------- Time Jump ----------------

$$(".duration-btn").forEach((b) =>
  b.addEventListener("click", () => {
    selectedDuration = b.dataset.d;
    $$(".duration-btn").forEach((x) => x.classList.toggle("selected", x === b));
  })
);

$("#btnJump").addEventListener("click", async () => {
  if (!currentState) return showError("Start a game first.");
  $("#btnJump").disabled = true;
  showLoading(`Simulating ${selectedDuration}…`);
  const { ok, data } = await API.post("/api/jump", { duration: selectedDuration });
  hideLoading();
  $("#btnJump").disabled = false;
  if (!ok) return showError(data.error || "Jump failed.");
  renderAll(data.state);
});

// ---------------- Save / Load / Rewind ----------------

$("#btnSave").addEventListener("click", async () => {
  if (!currentState) return showError("No active game.");
  const name = prompt("Save name:", currentState.nation);
  if (!name) return;
  const { ok, data } = await API.post("/api/save", { name });
  if (!ok) return showError(data.error || "Save failed.");
  showError(`Saved as "${data.saved_as}".`);
});

$("#btnLoad").addEventListener("click", async () => {
  const res = await API.get("/api/saves");
  const box = $("#savesList");
  box.innerHTML = "";
  if (res.saves.length === 0) {
    box.innerHTML = '<div class="empty-note">No saved games yet.</div>';
  } else {
    res.saves.forEach((name) => {
      const div = document.createElement("div");
      div.className = "pending-item";
      div.style.cursor = "pointer";
      div.innerHTML = `<span>${name}</span><span>▶</span>`;
      div.addEventListener("click", async () => {
        showLoading("Loading timeline…");
        const { ok, data } = await API.post("/api/load", { name });
        hideLoading();
        if (!ok) return showError(data.error || "Load failed.");
        advisorHistory = [];
        diploHistories = {};
        renderAll(data.state);
        $("#loadModal").style.display = "none";
      });
      box.appendChild(div);
    });
  }
  $("#loadModal").style.display = "flex";
});
$("#btnCloseLoad").addEventListener("click", () => ($("#loadModal").style.display = "none"));

$("#btnRewind").addEventListener("click", () => {
  if (!currentState) return showError("No active game.");
  const box = $("#rewindList");
  box.innerHTML = "";
  const snaps = currentState.history_snapshots || [];
  if (snaps.length === 0) {
    box.innerHTML = '<div class="empty-note">Nothing to rewind to yet.</div>';
  } else {
    [...snaps].reverse().forEach((s) => {
      const div = document.createElement("div");
      div.className = "pending-item";
      div.style.cursor = "pointer";
      div.innerHTML = `<span>Round ${s.round_number} — ${s.current_date}</span><span>↺</span>`;
      div.addEventListener("click", async () => {
        const { ok, data } = await API.post("/api/rewind", { round: s.round_number });
        if (!ok) return showError(data.error || "Rewind failed.");
        renderAll(data.state);
        $("#rewindModal").style.display = "none";
      });
      box.appendChild(div);
    });
  }
  $("#rewindModal").style.display = "flex";
});
$("#btnCloseRewind").addEventListener("click", () => ($("#rewindModal").style.display = "none"));

// ---------------- Settings ----------------

const PROMPT_LABELS = {
  chat_with_advisor: "Chat with Advisor",
  chat_with_user: "Chat with User (Diplomacy)",
  jump_forward: "Jump Forward",
  auto_jump_forward: "Auto Jump Forward",
  actions: "Actions (Polish)",
  next_speaker: "Next Speaker",
  description_to_action: "Description to Action",
  event_consolidator: "Event Consolidator",
  new_game_briefing: "New Game Briefing",
};

let promptsCache = {};

$("#btnSettings").addEventListener("click", async () => {
  const settings = await API.get("/api/settings");
  $("#stBaseUrl").value = settings.base_url;
  $("#stModel").value = settings.model;
  $("#stTemp").value = settings.temperature;
  $("#stMaxTokens").value = settings.max_tokens;

  promptsCache = await API.get("/api/prompts");
  const sel = $("#promptCategory");
  sel.innerHTML = "";
  Object.keys(PROMPT_LABELS).forEach((key) => {
    if (!(key in promptsCache)) return;
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = PROMPT_LABELS[key];
    sel.appendChild(opt);
  });
  $("#promptText").value = promptsCache[sel.value] || "";
  $("#settingsModal").style.display = "flex";
});

$("#promptCategory").addEventListener("change", (e) => {
  $("#promptText").value = promptsCache[e.target.value] || "";
});

$("#btnSaveSettings").addEventListener("click", async () => {
  const patch = {
    base_url: $("#stBaseUrl").value.trim(),
    model: $("#stModel").value.trim(),
    temperature: parseFloat($("#stTemp").value),
    max_tokens: parseInt($("#stMaxTokens").value, 10),
  };
  await API.post("/api/settings", patch);
  await checkHealth();
  showError("Connection settings saved.");
});

$("#btnSavePrompt").addEventListener("click", async () => {
  const cat = $("#promptCategory").value;
  const text = $("#promptText").value;
  const { ok, data } = await API.post(`/api/prompts/${cat}`, { text });
  if (!ok) return showError(data.error || "Could not save prompt.");
  promptsCache = data;
  showError("Prompt saved.");
});

$("#btnResetPrompt").addEventListener("click", async () => {
  const cat = $("#promptCategory").value;
  const { data } = await API.post(`/api/prompts/${cat}`, { reset: true });
  promptsCache = data;
  $("#promptText").value = promptsCache[cat] || "";
});

$("#btnCloseSettings").addEventListener("click", () => ($("#settingsModal").style.display = "none"));

// ---------------- Init ----------------

(async function init() {
  checkHealth();
  setInterval(checkHealth, 15000);
  // The menu (Games/Presets/Flags) is the landing screen — see menu.js.
  // If this script runs standalone (game-shell already visible), sync state.
  await refreshState();
})();
