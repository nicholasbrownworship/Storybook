# Storybook

A personal planning tool: an interactive node graph for tracking story points in the FFG/UE5 Star Wars RPG and how they connect, including branch points (Force-sensitive vs. non-Force paths).

Live at: https://nicholasbrownworship.github.io/Storybook/

No build step. It's plain HTML/CSS/JS plus one CDN library (vis-network) for the graph.

## Running it locally

Just open `index.html` in a browser. (If your browser blocks local file scripts, run a tiny local server instead: `python3 -m http.server` from this folder, then visit `http://localhost:8000`.)

## Adding a story point

Open `data.js`. Add an object to `STORY_NODES`:

```js
{
  id: "new_scene",       // unique, no spaces
  label: "Short Title",  // shown on the node
  act: "Act 2",
  branch: "core",        // "core" | "force" | "non-force"
  status: "planned",     // "planned" | "drafted" | "final"
  summary: "What happens here.",
  tags: ["Tank"]
}
```

Then connect it to something by adding an object to `STORY_EDGES`:

```js
{ from: "existing_node_id", to: "new_scene", label: "optional trigger text" }
```

Reload the page — that's it.

## Deployment

This repo's GitHub Pages is already configured to serve from the root of `main`, so these files live at the repo root — no subfolder, nothing extra to configure. Any push to `main` updates the live site within a minute or two.
