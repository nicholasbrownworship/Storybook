# Storybook

A personal planning tool: an interactive node graph for tracking story points in the FFG/UE5 Star Wars RPG and how they connect, including branch points (Force-sensitive vs. non-Force paths).

Live at: https://nicholasbrownworship.github.io/Storybook/

No build step. It's plain HTML/CSS/JS plus one CDN library (vis-network) for the graph.

## Running it locally

Just open `index.html` in a browser. (If your browser blocks local file scripts, run a tiny local server instead: `python3 -m http.server` from this folder, then visit `http://localhost:8000`.)

## Adding / editing story points

Use the in-page editor: **+ Add** to create a new point or connection, click any node to view or **Edit** it, **Delete** to remove one. Every change auto-saves to your browser's local storage, so it survives refreshes and closing the tab — but it only lives in that one browser.

`data.js` is the version everyone (and every browser/device) sees when they open the live site. To get your local edits into it:

1. Click **Export data.js** in the top bar — downloads the current state as a `data.js` file.
2. Replace the repo's `data.js` with that file and commit/push (or ask Claude to push it, same as this deploy).
3. Next time you or anyone else opens the site fresh (no local edits saved yet), it'll load from that updated `data.js`.

**Reset to file** clears your local edits and reloads straight from `data.js` — useful right after you've pushed an export, so your browser and the repo agree again.

You can still hand-edit `data.js` directly if you prefer code to forms — same object shape either way:

```js
{
  id: "new_scene",
  label: "Short Title",
  act: "Act 2",
  branch: "core",        // "core" | "force" | "non-force"
  status: "planned",     // "planned" | "drafted" | "final"
  summary: "What happens here.",
  tags: ["Tank"]
}
```
```js
{ from: "existing_node_id", to: "new_scene", label: "optional trigger text" }
```

## Deployment

This repo's GitHub Pages is already configured to serve from the root of `main`, so these files live at the repo root — no subfolder, nothing extra to configure. Any push to `main` updates the live site within a minute or two.
