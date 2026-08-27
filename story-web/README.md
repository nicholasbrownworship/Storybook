# Story Web

A personal planning tool: an interactive node graph for tracking story points in the FFG/UE5 Star Wars RPG and how they connect, including branch points (Force-sensitive vs. non-Force paths).

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

## Deploying to GitHub Pages

1. Create a new repo (e.g. `story-web`) on GitHub, or add this as a folder in an existing repo.
2. Push these files (`index.html`, `style.css`, `main.js`, `data.js`) to the repo's default branch.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment," set **Source** to "Deploy from a branch," pick your default branch and the `/ (root)` folder (or `/story-web` if it's a subfolder — GitHub Pages serves from root or `/docs`, so you may need to move these files to the repo root or a `docs/` folder).
5. Save. GitHub will give you a URL like `https://<username>.github.io/story-web/` within a minute or two.

Since this is a planning tool for yourself, you don't need it public — a private repo works fine with GitHub Pages on a paid plan, or you can just keep running it locally.
