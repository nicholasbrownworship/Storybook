// GitHub-backed shared storage config.
// Deliberately does NOT contain the GitHub token — GitHub blocks committing
// its own token formats to any repo, no exceptions, so the token can't live
// in a file at all. Instead each browser stores its own copy locally (see
// the "connect" step in main.js) after someone pastes it in once.

const GITHUB_REPO = "nicholasbrownworship/Storybook";
const GITHUB_BRANCH = "main";
const DATA_PATH = "story-data.json";

// SHA-256 hex of the passcode ("kesselrun"). To change the passcode,
// replace this with the SHA-256 hex of the new one.
const PASSCODE_HASH = "9b867dd8f76dc04aff6a0885a071abed8f922a7bd527fa96f09a027a7dcff5d8";

// How often (ms) each open browser checks the repo for changes made elsewhere.
const POLL_INTERVAL_MS = 8000;
