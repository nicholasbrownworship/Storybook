// ---------- palette ----------
const COLORS = {
  core: "#5AC8E8",
  force: "#E8A33D",
  "non-force": "#5B6472",
  edge: "#33404F",
  edgeLabel: "#7C8797",
};

const BRANCH_LABEL = { core: "Core", force: "Force branch", "non-force": "Non-Force branch" };
const STATUS_LABEL = { planned: "Planned", drafted: "Drafted", final: "Final" };

const STORAGE_KEY = "storyweb_state_v1";

// ---------- state: localStorage overrides base data.js on load ----------

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.nodes && parsed.edges) return parsed;
    } catch (e) {
      console.warn("Could not parse saved state, falling back to data.js", e);
    }
  }
  // first run / no local edits yet: seed from data.js
  return {
    nodes: JSON.parse(JSON.stringify(STORY_NODES)),
    edges: JSON.parse(JSON.stringify(STORY_EDGES)),
  };
}

let state = loadState();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  flashSaveIndicator();
}

function flashSaveIndicator() {
  const el = document.getElementById("save-indicator");
  el.textContent = "Saved locally";
  el.classList.add("show");
  clearTimeout(flashSaveIndicator._t);
  flashSaveIndicator._t = setTimeout(() => el.classList.remove("show"), 1600);
}

// ---------- id helpers ----------

function slugify(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "point";
}

function uniqueId(base) {
  let id = base;
  let i = 2;
  while (state.nodes.some((n) => n.id === id)) {
    id = `${base}_${i}`;
    i++;
  }
  return id;
}

// ---------- vis dataset builders ----------

function nodeColor(branch) {
  return COLORS[branch] || COLORS.core;
}

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
    shadow: {
      enabled: true,
      color: n.branch === "force" ? "rgba(232,163,61,0.55)" : "rgba(90,200,232,0.25)",
      size: n.branch === "force" ? 14 : 6,
      x: 0,
      y: 0,
    },
    _act: n.act,
    _branch: n.branch,
  };
}

function buildVisEdge(e, i) {
  return {
    id: e._id || "e" + i,
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

// assign stable edge ids once
state.edges.forEach((e, i) => { if (!e._id) e._id = "e" + i + "_" + Math.random().toString(36).slice(2, 7); });

const visNodes = new vis.DataSet(state.nodes.map(buildVisNode));
const visEdges = new vis.DataSet(state.edges.map(buildVisEdge));

const container = document.getElementById("graph");
const network = new vis.Network(
  container,
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

// ---------- pulse for force-branch nodes ----------

let pulseUp = true;
setInterval(() => {
  pulseUp = !pulseUp;
  const updates = state.nodes
    .filter((n) => n.branch === "force")
    .map((n) => ({ id: n.id, shadow: { enabled: true, color: "rgba(232,163,61,0.55)", size: pulseUp ? 20 : 10, x: 0, y: 0 } }));
  if (updates.length) visNodes.update(updates);
}, 900);

// ---------- side panel: view ----------

const panel = document.getElementById("panel");
const panelView = document.getElementById("panel-view");
const panelEditForm = document.getElementById("panel-edit-form");
const panelAct = document.getElementById("panel-act");
const panelTitle = document.getElementById("panel-title");
const panelBranch = document.getElementById("panel-branch");
const panelStatus = document.getElementById("panel-status");
const panelSummary = document.getElementById("panel-summary");
const panelTags = document.getElementById("panel-tags");

let currentNodeId = null;

function findNode(id) { return state.nodes.find((n) => n.id === id); }

function openPanelFor(nodeId) {
  const n = findNode(nodeId);
  if (!n) return;
  currentNodeId = nodeId;
  showViewMode();
  panelAct.textContent = n.act;
  panelTitle.textContent = n.label;
  panelBranch.textContent = BRANCH_LABEL[n.branch] || n.branch;
  panelStatus.textContent = STATUS_LABEL[n.status] || n.status;
  panelSummary.textContent = n.summary;
  panelTags.innerHTML = "";
  (n.tags || []).forEach((t) => {
    const el = document.createElement("span");
    el.className = "tag";
    el.textContent = t;
    panelTags.appendChild(el);
  });
  panel.classList.add("open");
}

function showViewMode() {
  panelView.classList.remove("hidden");
  panelEditForm.classList.add("hidden");
}

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

network.on("click", (params) => {
  if (params.nodes.length > 0) openPanelFor(params.nodes[0]);
  else panel.classList.remove("open");
});

document.getElementById("panel-close").addEventListener("click", () => panel.classList.remove("open"));
document.getElementById("panel-edit-btn").addEventListener("click", showEditMode);
document.getElementById("edit-cancel-btn").addEventListener("click", showViewMode);

panelEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const n = findNode(currentNodeId);
  if (!n) return;
  n.label = document.getElementById("edit-label").value.trim();
  n.act = document.getElementById("edit-act").value.trim();
  n.branch = document.getElementById("edit-branch").value;
  n.status = document.getElementById("edit-status").value;
  n.summary = document.getElementById("edit-summary").value.trim();
  n.tags = document.getElementById("edit-tags").value.split(",").map((t) => t.trim()).filter(Boolean);

  visNodes.update(buildVisNode(n));
  persist();
  refreshActFilters();
  openPanelFor(n.id);
});

document.getElementById("panel-delete-btn").addEventListener("click", () => {
  const n = findNode(currentNodeId);
  if (!n) return;
  if (!confirm(`Delete "${n.label}"? This also removes any connections to/from it.`)) return;

  state.edges = state.edges.filter((e) => e.from !== n.id && e.to !== n.id);
  state.nodes = state.nodes.filter((x) => x.id !== n.id);

  visNodes.remove(n.id);
  const edgeIdsToRemove = visEdges.get().filter((e) => e.from === n.id || e.to === n.id).map((e) => e.id);
  visEdges.remove(edgeIdsToRemove);

  persist();
  refreshActFilters();
  panel.classList.remove("open");
});

// ---------- act filters ----------

const filterWrap = document.getElementById("act-filters");
let activeAct = null;

function refreshActFilters() {
  const acts = [...new Set(state.nodes.map((n) => n.act))];
  filterWrap.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn" + (activeAct === null ? " active" : "");
  allBtn.textContent = "All";
  allBtn.addEventListener("click", () => setActiveAct(null));
  filterWrap.appendChild(allBtn);

  acts.forEach((act) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (activeAct === act ? " active" : "");
    btn.textContent = act;
    btn.addEventListener("click", () => setActiveAct(act));
    filterWrap.appendChild(btn);
  });
}

function setActiveAct(act) {
  activeAct = act;
  refreshActFilters();
  visNodes.update(state.nodes.map((n) => ({ id: n.id, hidden: act !== null && n.act !== act })));
}

refreshActFilters();

// ---------- add overlay: tabs ----------

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

function populateConnectDropdowns() {
  const opts = state.nodes.map((n) => `<option value="${n.id}">${n.label}</option>`).join("");
  const connectFrom = document.getElementById("new-connect-from");
  connectFrom.innerHTML = `<option value="">— none —</option>` + opts;
  document.getElementById("edge-from").innerHTML = opts;
  document.getElementById("edge-to").innerHTML = opts;
}

document.getElementById("new-connect-from").addEventListener("change", (e) => {
  document.getElementById("new-connect-label-wrap").classList.toggle("hidden", !e.target.value);
});

// ---------- add: new story point ----------

document.getElementById("add-point-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const label = document.getElementById("new-label").value.trim();
  if (!label) return;

  const node = {
    id: uniqueId(slugify(label)),
    label,
    act: document.getElementById("new-act").value.trim() || "Act 1",
    branch: document.getElementById("new-branch").value,
    status: document.getElementById("new-status").value,
    summary: document.getElementById("new-summary").value.trim(),
    tags: document.getElementById("new-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
  };
  state.nodes.push(node);
  visNodes.add(buildVisNode(node));

  const connectFrom = document.getElementById("new-connect-from").value;
  if (connectFrom) {
    const edge = { from: connectFrom, to: node.id, label: document.getElementById("new-connect-label").value.trim(), _id: "e_" + Math.random().toString(36).slice(2, 9) };
    state.edges.push(edge);
    visEdges.add(buildVisEdge(edge));
  }

  persist();
  refreshActFilters();
  e.target.reset();
  document.getElementById("new-connect-label-wrap").classList.add("hidden");
  addOverlay.classList.add("hidden");
});

// ---------- add: new connection between existing points ----------

document.getElementById("add-edge-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const from = document.getElementById("edge-from").value;
  const to = document.getElementById("edge-to").value;
  if (!from || !to || from === to) { alert("Pick two different story points."); return; }

  const edge = { from, to, label: document.getElementById("edge-label").value.trim(), _id: "e_" + Math.random().toString(36).slice(2, 9) };
  state.edges.push(edge);
  visEdges.add(buildVisEdge(edge));

  persist();
  e.target.reset();
  addOverlay.classList.add("hidden");
});

// ---------- export data.js ----------

document.getElementById("export-btn").addEventListener("click", () => {
  const nodesOut = state.nodes.map(({ id, label, act, branch, status, summary, tags }) => ({ id, label, act, branch, status, summary, tags }));
  const edgesOut = state.edges.map(({ from, to, label }) => ({ from, to, label: label || "" }));

  const fileText = `/*
  STORY DATA
  ----------
  Add a new story point by adding an object to STORY_NODES.
  Add a connection between two points by adding an object to STORY_EDGES.
  This file was last exported from the in-page editor — edit it by hand
  or through the site; either way, re-export after hand edits to keep
  the site's local copy in sync (or use "Reset to file" on the site).
*/

const STORY_NODES = ${JSON.stringify(nodesOut, null, 2)};

const STORY_EDGES = ${JSON.stringify(edgesOut, null, 2)};
`;

  const blob = new Blob([fileText], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.js";
  a.click();
  URL.revokeObjectURL(url);
});

// ---------- reset to file (discard local edits) ----------

document.getElementById("reset-btn").addEventListener("click", () => {
  if (!confirm("Discard local edits and reload the story exactly as it is in data.js?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});
