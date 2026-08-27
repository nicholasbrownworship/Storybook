// ================= palette / labels =================

const COLORS = {
  core: "#5AC8E8",
  force: "#E8A33D",
  "non-force": "#5B6472",
  edge: "#33404F",
  edgeLabel: "#7C8797",
};
const BRANCH_LABEL = { core: "Core", force: "Force branch", "non-force": "Non-Force branch" };
const STATUS_LABEL = { planned: "Planned", drafted: "Drafted", final: "Final" };

const NAME_KEY = "storyweb_name";
const AUTH_KEY = "storyweb_authed";

// ================= passcode gate =================

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const gateOverlay = document.getElementById("gate-overlay");
const gateForm = document.getElementById("gate-form");
const gateError = document.getElementById("gate-error");

let myName = localStorage.getItem(NAME_KEY) || "";

async function tryEnter(passcode, name) {
  const hash = await sha256Hex(passcode);
  if (hash !== PASSCODE_HASH) {
    gateError.classList.remove("hidden");
    return false;
  }
  myName = name.trim() || "Someone";
  localStorage.setItem(NAME_KEY, myName);
  sessionStorage.setItem(AUTH_KEY, "1");
  gateOverlay.classList.add("hidden");
  document.getElementById("topbar").classList.remove("hidden");
  document.getElementById("graph-wrap").classList.remove("hidden");
  boot();
  return true;
}

gateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  gateError.classList.add("hidden");
  tryEnter(document.getElementById("gate-passcode").value, document.getElementById("gate-name").value);
});

// if already verified this session, skip straight to the app
if (sessionStorage.getItem(AUTH_KEY) === "1" && myName) {
  gateOverlay.classList.add("hidden");
  document.getElementById("topbar").classList.remove("hidden");
  document.getElementById("graph-wrap").classList.remove("hidden");
  boot();
} else if (myName) {
  document.getElementById("gate-name").value = myName;
}

// ================= GitHub-backed storage =================

const API_BASE = `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_PATH}`;

let remoteSha = null; // sha of the last-fetched version of story-data.json
let state = { nodes: [], edges: [] };

function ghHeaders() {
  return { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" };
}

function b64EncodeUnicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUnicode(str) {
  return decodeURIComponent(escape(atob(str)));
}

async function fetchRemote() {
  const res = await fetch(`${API_BASE}?ref=${GITHUB_BRANCH}&_=${Date.now()}`, { headers: ghHeaders() });
  if (!res.ok) throw new Error("Fetch failed: " + res.status);
  const json = await res.json();
  remoteSha = json.sha;
  return JSON.parse(b64DecodeUnicode(json.content));
}

// Writes an updater(currentRemoteState) -> newState, with retry-on-conflict:
// if someone else saved in between, refetch, reapply, retry once more.
async function commitUpdate(updater, commitMessage) {
  setSyncState("saving", "Saving…");
  for (let attempt = 0; attempt < 3; attempt++) {
    const latest = attempt === 0 ? state : await fetchRemote();
    const next = updater(latest);
    const body = {
      message: commitMessage,
      content: b64EncodeUnicode(JSON.stringify(next, null, 2)),
      branch: GITHUB_BRANCH,
      sha: remoteSha,
    };
    const res = await fetch(API_BASE, { method: "PUT", headers: { ...ghHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      remoteSha = json.content.sha;
      state = next;
      renderFromState();
      setSyncState("saved", "Saved to repo");
      return true;
    }
    if (res.status === 409 || res.status === 422) continue; // conflict: retry with fresh sha
    setSyncState("error", "Save failed — retry");
    return false;
  }
  setSyncState("error", "Save failed after retries");
  return false;
}

function setSyncState(kind, text) {
  const el = document.getElementById("sync-indicator");
  el.textContent = text;
  el.className = "state-" + kind;
}

// ================= vis dataset helpers =================

let visNodes, visEdges, network;

function nodeColor(branch) { return COLORS[branch] || COLORS.core; }

function buildVisNode(n) {
  return {
    id: n.id,
    label: n.label,
    shape: "dot",
    size: n.branch === "force" ? 20 : 16,
    font: { color: "#D7DEE8", face: "JetBrains Mono", size: 13, vadjust: -22 },
    color: {
      background: nodeColor(n.branch),
      border: n.branch === "force" ? "#E8A33D" : "#0A0C10",
      highlight: { background: nodeColor(n.branch), border: "#FFFFFF" },
      hover: { background: nodeColor(n.branch), border: "#FFFFFF" },
    },
    borderWidth: n.branch === "force" ? 2 : 1,
    shadow: { enabled: true, color: n.branch === "force" ? "rgba(232,163,61,0.55)" : "rgba(90,200,232,0.25)", size: n.branch === "force" ? 14 : 6, x: 0, y: 0 },
    _act: n.act,
  };
}

function buildVisEdge(e) {
  return {
    id: e.id,
    from: e.from,
    to: e.to,
    label: e.label || "",
    font: { color: COLORS.edgeLabel, face: "JetBrains Mono", size: 10, strokeWidth: 0, background: "#0A0C10" },
    color: { color: COLORS.edge, highlight: "#5AC8E8", hover: "#5AC8E8" },
    smooth: { enabled: true, type: "curvedCW", roundness: 0.15 },
    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    width: 1.4,
  };
}

// Diff-based render: only touches nodes/edges that actually changed, so
// dragged positions and open panels aren't disturbed by a poll refresh.
function renderFromState() {
  const nodeIds = new Set(state.nodes.map((n) => n.id));
  const existingIds = new Set(visNodes.getIds());

  state.nodes.forEach((n) => {
    const built = buildVisNode(n);
    if (existingIds.has(n.id)) visNodes.update(built);
    else visNodes.add(built);
  });
  existingIds.forEach((id) => { if (!nodeIds.has(id)) visNodes.remove(id); });

  const edgeIds = new Set(state.edges.map((e) => e.id));
  const existingEdgeIds = new Set(visEdges.getIds());
  state.edges.forEach((e) => {
    const built = buildVisEdge(e);
    if (existingEdgeIds.has(e.id)) visEdges.update(built);
    else visEdges.add(built);
  });
  existingEdgeIds.forEach((id) => { if (!edgeIds.has(id)) visEdges.remove(id); });

  refreshActFilters();
  applyActFilter();
  if (currentNodeId && findNode(currentNodeId)) openPanelFor(currentNodeId, true);
  else if (currentNodeId) panel.classList.remove("open");
}

// ================= boot =================

let pollTimer = null;

async function boot() {
  visNodes = new vis.DataSet([]);
  visEdges = new vis.DataSet([]);
  network = new vis.Network(
    document.getElementById("graph"),
    { nodes: visNodes, edges: visEdges },
    {
      interaction: { hover: true, dragNodes: true, zoomView: true, tooltipDelay: 120 },
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: { gravitationalConstant: -60, springLength: 140, springConstant: 0.06, avoidOverlap: 0.6 },
        stabilization: { iterations: 200 },
      },
      layout: { improvedLayout: true },
    }
  );
  network.on("click", (params) => {
    if (params.nodes.length > 0) openPanelFor(params.nodes[0]);
    else panel.classList.remove("open");
  });

  setSyncState("saving", "Loading…");
  try {
    state = await fetchRemote();
  } catch (e) {
    setSyncState("error", "Couldn't load story");
    console.error(e);
    return;
  }
  renderFromState();
  setSyncState("saved", "Up to date");

  // pulse force-branch nodes
  let pulseUp = true;
  setInterval(() => {
    pulseUp = !pulseUp;
    const updates = state.nodes.filter((n) => n.branch === "force").map((n) => ({ id: n.id, shadow: { enabled: true, color: "rgba(232,163,61,0.55)", size: pulseUp ? 20 : 10, x: 0, y: 0 } }));
    if (updates.length) visNodes.update(updates);
  }, 900);

  // poll for changes made elsewhere
  pollTimer = setInterval(async () => {
    try {
      const latest = await fetchRemote();
      if (JSON.stringify(latest) !== JSON.stringify(state)) {
        state = latest;
        renderFromState();
        setSyncState("saved", "Updated from others");
        setTimeout(() => setSyncState("saved", "Up to date"), 2000);
      }
    } catch (e) {
      console.warn("poll failed", e);
    }
  }, POLL_INTERVAL_MS);

  wireUI();
}

// ================= side panel =================

const panel = document.getElementById("panel");
const panelView = document.getElementById("panel-view");
const panelEditForm = document.getElementById("panel-edit-form");
let currentNodeId = null;

function findNode(id) { return state.nodes.find((n) => n.id === id); }

function openPanelFor(nodeId, silent) {
  const n = findNode(nodeId);
  if (!n) return;
  currentNodeId = nodeId;
  showViewMode();
  document.getElementById("panel-act").textContent = n.act;
  document.getElementById("panel-title").textContent = n.label;
  document.getElementById("panel-branch").textContent = BRANCH_LABEL[n.branch] || n.branch;
  document.getElementById("panel-status").textContent = STATUS_LABEL[n.status] || n.status;
  document.getElementById("panel-summary").textContent = n.summary;
  const tagsEl = document.getElementById("panel-tags");
  tagsEl.innerHTML = "";
  (n.tags || []).forEach((t) => {
    const el = document.createElement("span");
    el.className = "tag";
    el.textContent = t;
    tagsEl.appendChild(el);
  });
  document.getElementById("panel-attribution").textContent = n.updatedBy ? `Last edited by ${n.updatedBy}` : "";
  if (!silent) panel.classList.add("open");
}

function showViewMode() { panelView.classList.remove("hidden"); panelEditForm.classList.add("hidden"); }

function showEditMode() {
  const n = findNode(currentNodeId);
  if (!n) return;
  document.getElementById("edit-label").value = n.label;
  document.getElementById("edit-act").value = n.act;
  document.getElementById("edit-branch").value = n.branch;
  document.getElementById("edit-status").value = n.status;
  document.getElementById("edit-summary").value = n.summary;
  document.getElementById("edit-tags").value = (n.tags || []).join(", ");
  panelView.classList.add("hidden");
  panelEditForm.classList.remove("hidden");
}

// ================= id helpers =================

function slugify(label) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "point";
}
function uniqueNodeId(base, currentState) {
  let id = base, i = 2;
  while (currentState.nodes.some((n) => n.id === id)) { id = `${base}_${i}`; i++; }
  return id;
}
function newEdgeId() { return "e_" + Math.random().toString(36).slice(2, 10); }

// ================= wire up forms (called once, after boot) =================

function wireUI() {
  document.getElementById("panel-close").addEventListener("click", () => panel.classList.remove("open"));
  document.getElementById("panel-edit-btn").addEventListener("click", showEditMode);
  document.getElementById("edit-cancel-btn").addEventListener("click", showViewMode);

  panelEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = currentNodeId;
    const patch = {
      label: document.getElementById("edit-label").value.trim(),
      act: document.getElementById("edit-act").value.trim(),
      branch: document.getElementById("edit-branch").value,
      status: document.getElementById("edit-status").value,
      summary: document.getElementById("edit-summary").value.trim(),
      tags: document.getElementById("edit-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
      updatedBy: myName,
      updatedAt: new Date().toISOString(),
    };
    await commitUpdate((latest) => ({
      ...latest,
      nodes: latest.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }), `Edit "${patch.label}" (${myName})`);
    showViewMode();
    openPanelFor(id);
  });

  document.getElementById("panel-delete-btn").addEventListener("click", async () => {
    const n = findNode(currentNodeId);
    if (!n) return;
    if (!confirm(`Delete "${n.label}"? This also removes any connections to/from it.`)) return;
    const id = currentNodeId;
    await commitUpdate((latest) => ({
      nodes: latest.nodes.filter((x) => x.id !== id),
      edges: latest.edges.filter((e) => e.from !== id && e.to !== id),
    }), `Delete "${n.label}" (${myName})`);
    panel.classList.remove("open");
    currentNodeId = null;
  });

  // act filters
  refreshActFilters();

  // add overlay
  const addOverlay = document.getElementById("add-overlay");
  document.getElementById("add-point-btn").addEventListener("click", () => {
    populateConnectDropdowns();
    addOverlay.classList.remove("hidden");
  });
  document.getElementById("add-close").addEventListener("click", () => addOverlay.classList.add("hidden"));
  addOverlay.addEventListener("click", (e) => { if (e.target === addOverlay) addOverlay.classList.add("hidden"); });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      btn.classList.add("active");
      document.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"]`).classList.remove("hidden");
    });
  });

  document.getElementById("new-connect-from").addEventListener("change", (e) => {
    document.getElementById("new-connect-label-wrap").classList.toggle("hidden", !e.target.value);
  });

  document.getElementById("add-point-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const label = document.getElementById("new-label").value.trim();
    if (!label) return;
    const connectFrom = document.getElementById("new-connect-from").value;
    const connectLabel = document.getElementById("new-connect-label").value.trim();

    await commitUpdate((latest) => {
      const node = {
        id: uniqueNodeId(slugify(label), latest),
        label,
        act: document.getElementById("new-act").value.trim() || "Act 1",
        branch: document.getElementById("new-branch").value,
        status: document.getElementById("new-status").value,
        summary: document.getElementById("new-summary").value.trim(),
        tags: document.getElementById("new-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
        updatedBy: myName,
        updatedAt: new Date().toISOString(),
      };
      const edges = [...latest.edges];
      if (connectFrom && latest.nodes.some((n) => n.id === connectFrom)) {
        edges.push({ id: newEdgeId(), from: connectFrom, to: node.id, label: connectLabel });
      }
      return { nodes: [...latest.nodes, node], edges };
    }, `Add "${label}" (${myName})`);

    e.target.reset();
    document.getElementById("new-connect-label-wrap").classList.add("hidden");
    addOverlay.classList.add("hidden");
  });

  document.getElementById("add-edge-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const from = document.getElementById("edge-from").value;
    const to = document.getElementById("edge-to").value;
    if (!from || !to || from === to) { alert("Pick two different story points."); return; }
    const label = document.getElementById("edge-label").value.trim();

    await commitUpdate((latest) => ({
      ...latest,
      edges: [...latest.edges, { id: newEdgeId(), from, to, label }],
    }), `Connect points (${myName})`);

    e.target.reset();
    addOverlay.classList.add("hidden");
  });

  document.getElementById("export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "story-data-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function populateConnectDropdowns() {
  const opts = state.nodes.map((n) => `<option value="${n.id}">${n.label}</option>`).join("");
  document.getElementById("new-connect-from").innerHTML = `<option value="">— none —</option>` + opts;
  document.getElementById("edge-from").innerHTML = opts;
  document.getElementById("edge-to").innerHTML = opts;
}

// ================= act filters =================

const filterWrap = document.getElementById("act-filters");
let activeAct = null;

function refreshActFilters() {
  const acts = [...new Set(state.nodes.map((n) => n.act))];
  filterWrap.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn" + (activeAct === null ? " active" : "");
  allBtn.textContent = "All";
  allBtn.addEventListener("click", () => { activeAct = null; refreshActFilters(); applyActFilter(); });
  filterWrap.appendChild(allBtn);
  acts.forEach((act) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (activeAct === act ? " active" : "");
    btn.textContent = act;
    btn.addEventListener("click", () => { activeAct = act; refreshActFilters(); applyActFilter(); });
    filterWrap.appendChild(btn);
  });
}

function applyActFilter() {
  visNodes.update(state.nodes.map((n) => ({ id: n.id, hidden: activeAct !== null && n.act !== activeAct })));
}
