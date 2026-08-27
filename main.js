// ---------- palette (kept in sync with style.css) ----------
const COLORS = {
  core: "#5AC8E8",
  force: "#E8A33D",
  "non-force": "#5B6472",
  edge: "#33404F",
  edgeLabel: "#7C8797",
};

const BRANCH_LABEL = {
  core: "Core",
  force: "Force branch",
  "non-force": "Non-Force branch",
};

const STATUS_LABEL = {
  planned: "Planned",
  drafted: "Drafted",
  final: "Final",
};

// ---------- build vis datasets ----------

function nodeColor(branch) {
  return COLORS[branch] || COLORS.core;
}

const visNodes = new vis.DataSet(
  STORY_NODES.map((n) => ({
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
      color:
        n.branch === "force" ? "rgba(232,163,61,0.55)" : "rgba(90,200,232,0.25)",
      size: n.branch === "force" ? 14 : 6,
      x: 0,
      y: 0,
    },
    _act: n.act,
    _branch: n.branch,
  }))
);

const visEdges = new vis.DataSet(
  STORY_EDGES.map((e, i) => ({
    id: "e" + i,
    from: e.from,
    to: e.to,
    label: e.label || "",
    font: { color: COLORS.edgeLabel, face: "JetBrains Mono", size: 10, strokeWidth: 0, background: "#0A0C10" },
    color: { color: COLORS.edge, highlight: "#5AC8E8", hover: "#5AC8E8" },
    smooth: { enabled: true, type: "curvedCW", roundness: 0.15 },
    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    width: 1.4,
  }))
);

// ---------- render network ----------

const container = document.getElementById("graph");
const data = { nodes: visNodes, edges: visEdges };
const options = {
  interaction: { hover: true, dragNodes: true, zoomView: true, tooltipDelay: 120 },
  physics: {
    solver: "forceAtlas2Based",
    forceAtlas2Based: { gravitationalConstant: -60, springLength: 140, springConstant: 0.06, avoidOverlap: 0.6 },
    stabilization: { iterations: 200 },
  },
  layout: { improvedLayout: true },
};

const network = new vis.Network(container, data, options);

// ---------- gentle pulse for force-branch nodes ----------

let pulseUp = true;
setInterval(() => {
  pulseUp = !pulseUp;
  const updates = STORY_NODES.filter((n) => n.branch === "force").map((n) => ({
    id: n.id,
    shadow: {
      enabled: true,
      color: "rgba(232,163,61,0.55)",
      size: pulseUp ? 20 : 10,
      x: 0,
      y: 0,
    },
  }));
  if (updates.length) visNodes.update(updates);
}, 900);

// ---------- side panel ----------

const panel = document.getElementById("panel");
const panelAct = document.getElementById("panel-act");
const panelTitle = document.getElementById("panel-title");
const panelBranch = document.getElementById("panel-branch");
const panelStatus = document.getElementById("panel-status");
const panelSummary = document.getElementById("panel-summary");
const panelTags = document.getElementById("panel-tags");

function openPanelFor(nodeId) {
  const n = STORY_NODES.find((x) => x.id === nodeId);
  if (!n) return;
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

network.on("click", (params) => {
  if (params.nodes.length > 0) {
    openPanelFor(params.nodes[0]);
  } else {
    panel.classList.remove("open");
  }
});

document.getElementById("panel-close").addEventListener("click", () => {
  panel.classList.remove("open");
});

// ---------- act filters ----------

const acts = [...new Set(STORY_NODES.map((n) => n.act))];
const filterWrap = document.getElementById("act-filters");
let activeAct = null;

function renderFilters() {
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
  renderFilters();
  const updates = STORY_NODES.map((n) => ({
    id: n.id,
    hidden: act !== null && n.act !== act,
  }));
  visNodes.update(updates);
}

renderFilters();

// ---------- add-point help overlay ----------

const overlay = document.getElementById("add-help-overlay");
document.getElementById("add-node-help").addEventListener("click", () => {
  overlay.classList.remove("hidden");
});
document.getElementById("add-help-close").addEventListener("click", () => {
  overlay.classList.add("hidden");
});
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.classList.add("hidden");
});
