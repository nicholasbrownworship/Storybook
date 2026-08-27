/*
  STORY DATA
  ----------
  Add a new story point by adding an object to STORY_NODES.
  Add a connection between two points by adding an object to STORY_EDGES.

  Node fields:
    id        - unique short string, no spaces (e.g. "post_tutorial")
    label     - short title shown on the node in the graph
    act       - "Act 1" | "Act 2" | "Act 3" | etc. (used for the act filter)
    branch    - "core" | "force" | "non-force"
                core       = happens in every playthrough
                force      = only happens if the player/party goes Force-sensitive
                non-force  = only happens if they don't
    status    - "planned" | "drafted" | "final"
    summary   - the actual story content / notes for this point
    tags      - array of freeform strings (characters present, systems touched, etc.)

  Edge fields:
    from, to  - node ids
    label     - optional short text on the connecting line (e.g. a choice or trigger)
*/

const STORY_NODES = [
  {
    id: "prison_break",
    label: "Prison Break",
    act: "Act 1",
    branch: "core",
    status: "drafted",
    summary:
      "Opening sequence. The whole crew wakes up captured on an Imperial Remnant ship, in separate cells. Smuggler is the player's cellmate (or is the player, if chosen) and helps them break out first. The rest of the crew is found and freed from nearby cells during the escape.",
    tags: ["Mechanic", "Smuggler", "Tank", "Ambassador", "tutorial"],
  },
  {
    id: "post_tutorial",
    label: "Post-Tutorial: The Holocron",
    act: "Act 1",
    branch: "core",
    status: "planned",
    summary:
      "Right after the escape resolves. The crew doesn't get to just 'go home' — they walk away from the wreck with a holocron the prison ship was holding. The player character is the one who ends up with it (either it's obviously important when they spot it, or it's already stashed among their belongings by an unknown party). This is the seed of 'something bigger' — not galaxy-scale, but bigger than a prison break.",
    tags: ["holocron", "Mechanic", "macguffin"],
  },
  {
    id: "why_mechanic_was_taken",
    label: "Why Mechanic Was Imprisoned",
    act: "Act 1",
    branch: "core",
    status: "planned",
    summary:
      "Mechanic was the original finder of the holocron before the story started, and didn't realize what they'd found. The Imperial Remnant did — that's why Mechanic specifically was captured. This can surface gradually rather than all at once.",
    tags: ["Mechanic", "holocron", "backstory"],
  },
  {
    id: "force_pivot",
    label: "Force Sensitivity Pivot",
    act: "Act 2",
    branch: "core",
    status: "planned",
    summary:
      "The pivot point, roughly late Act 1 / early Act 2. Whoever is able to open the holocron is revealed as Force sensitive. Player gets first choice, available only up to this window — after it passes, the player can't choose it this playthrough. If the player takes it, all companions' Force-sensitive branches lock out. If not, the game rolls among eligible companions in the party.",
    tags: ["holocron", "Force Sensitivity", "branch point"],
  },
  {
    id: "player_force_branch",
    label: "Player Goes Force-Sensitive",
    act: "Act 2",
    branch: "force",
    status: "planned",
    summary:
      "Player chose Force Sensitivity at the pivot. All companions play their non-Force branch content from here forward. Guardian/Sentinel/Consular subclass (Paladin/Ranger/Wizard chassis) is revealed later, after the player has committed to and 'proven' the Jedi path.",
    tags: ["Force Sensitivity", "player"],
  },
  {
    id: "companion_force_branch",
    label: "A Companion Goes Force-Sensitive",
    act: "Act 2",
    branch: "non-force",
    status: "planned",
    summary:
      "Player did not take Force Sensitivity within the window. The game randomly rolls among eligible companions in the current party to determine which one (if any) is Force-sensitive this playthrough. That companion's Force-sensitive branch activates; the player and other companions stay on non-Force content.",
    tags: ["Force Sensitivity", "companions"],
  },
];

const STORY_EDGES = [
  { from: "prison_break", to: "post_tutorial", label: "" },
  { from: "post_tutorial", to: "why_mechanic_was_taken", label: "" },
  { from: "post_tutorial", to: "force_pivot", label: "story progresses" },
  { from: "force_pivot", to: "player_force_branch", label: "player opens holocron" },
  { from: "force_pivot", to: "companion_force_branch", label: "player does not" },
];
