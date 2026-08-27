# Storybook

A shared story-planning tool: an interactive node graph for tracking story points in the FFG/UE5 Star Wars RPG and how they connect, including branch points (Force-sensitive vs. non-Force paths).

Live at: https://nicholasbrownworship.github.io/Storybook/

No build step, no separate accounts to run it. Plain HTML/CSS/JS, vis-network from a CDN for the graph, and GitHub itself as the shared data store.

## How access works

- **Passcode** — anyone with it can open the site and watch the story graph update live (polls every ~75 seconds). No account, no setup.
- **Editing is separate and stays with Nick.** Click "Editor sign-in" in the top bar and paste a GitHub token to unlock the add/edit/delete tools on that one browser. The token is stored only in that browser's local storage — it's never written to any file, never committed, and isn't given out with the passcode.

This split exists because GitHub actively blocks committing its own token format into any repo (there's no way around that), and a static site can't hold a write-capable secret from everyone who opens it — so only one browser is trusted with write access, and everyone else just watches it update.

If you (Nick) need a fresh token: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → generate one scoped to **only this repo**, with **Contents: Read and write** permission, nothing else. Paste it into "Editor sign-in" once — you won't need to re-enter it unless you clear that browser's storage or sign out deliberately.

To change the passcode, replace `PASSCODE_HASH` in `github-config.js` with the SHA-256 hex of the new one.

## Adding / editing story points

With editing enabled: **+ Add** for a new point or connection, click any node to view or **Edit** it, **Delete** to remove one. Every save commits straight to `story-data.json` in this repo — that's the single source of truth everyone's browser reads from.

You can also hand-edit `story-data.json` directly if you prefer:

```json
{
  "id": "new_scene",
  "label": "Short Title",
  "act": "Act 2",
  "branch": "core",
  "status": "planned",
  "summary": "What happens here.",
  "tags": ["Tank"]
}
```

## Running it locally

Open `index.html` in a browser, or `python3 -m http.server` from this folder and visit `http://localhost:8000`.

## Deployment

GitHub Pages serves from the root of `main`. Any push updates the live site within a minute or two.
