# Map Painter 1 — Offline

An AI-powered alternate-history grand-strategy sandbox that runs entirely on your machine,
powered by your local **GPT4All** model. Pick a nation and a starting moment in history
(defaults to 1999), then reshape the world through free-text actions, AI diplomacy, and
time-jumps — no internet or API key required.

## 1. Enable GPT4All's local server

1. Open the **GPT4All** desktop app and make sure a model is downloaded and loaded
   (a solid, fast option is `Llama 3 8B Instruct`; anything instruction-tuned works —
   bigger models will give richer, more consistent simulation output).
2. Go to **Settings → Application** and turn on **"Enable Local API Server"**.
3. Note the port shown (GPT4All defaults to `4891`). Leave GPT4All running in the background.

## 2. Install and run this app

```bash
cd "Map Painter 1"
pip install -r requirements.txt
python app.py
```

Then open **http://localhost:5050** in your browser.

If your GPT4All server is on a different port, or you renamed the loaded model, open
**Settings** (top right, in-app) and update the **Base URL** / **Model Name** to match —
the model name must exactly match what's shown in GPT4All's model dropdown.

## 3. How to play

- **Games / Presets / Flags** — the app now opens on a menu, not a form. **Presets**
  (currently *Modern Day* and *World War II*) each have their own About/Before-start
  copy and an editable **Simulation Rules** block — click **Edit** on a preset's detail
  page to rewrite its constraints, allowed actions, or special mechanics; it's saved
  in your browser and folded into every prompt for games started from that preset.
- **Play Now** on a preset opens the country picker (map + searchable list, or **Custom**
  to invent your own entity with a name, color, lore, and starting regions). Picking a
  country or confirming a custom entity calls `/api/new_game` with that preset's rules,
  start year, and your chosen difficulty, then drops you into the in-game screen.
- **Continue Playing** on the Games tab shows your active timeline, if any, so you don't
  have to re-pick a country each session — click it to resume where you left off.
- **Diplomatic Chats are in-game only** — the Diplomacy tab only appears once a game is
  active and a nation is picked; there's no diplomacy entry point on the main menu.
- **Actions tab** — write freehand orders for your nation ("open trade talks with X",
  "mobilize reserves near the border"). Optionally hit **Polish with AI** to sharpen the
  wording, then **Queue Action**. Queuing costs nothing — the AI is only called when you jump.
- **Advisor tab** — ask your AI advisor for situation summaries or strategic guidance at
  any time; this doesn't affect the simulation, just your understanding of it.
- **Diplomacy tab** — pick any known nation (or add a new one) and negotiate directly.
  Each exchange nudges that nation's sentiment toward you up or down.
- **Time Jump** (bottom bar) — pick a duration (1 week to 1 year) and hit **Jump Forward**.
  The world simulates everything that happens in that window: consequences of your queued
  actions, independent moves by other powers, and background events. Longer jumps generate
  more events (and use more tokens/time); short jumps are cheap and fast.
- **☰ Menu** (top right, in-game) — returns to Games/Presets/Flags without ending your
  timeline; your save stays active until you start a new one.
- **Rewind** — revert to the end of any previous round if a jump went somewhere you didn't want.
- **Save / Load** — name and store as many parallel timelines as you like.

## 4. Prompt editor

Open **Settings → Prompt Category** to view or rewrite any of the 8 prompts driving the
simulation (Jump Forward, Chat with Advisor, Chat with User, Actions, Event Consolidator,
etc.). This is the same "Local vs Default" concept as the game this is inspired by — edit
a category to change how the AI behaves in that situation, or **Reset to Default** to revert.
Template variables like `${STATE}`, `${RECENT_EVENTS}`, and `${DIFFICULTY_NOTE}` are filled
in automatically; keep them if you edit a prompt, so the AI still gets context.

## 5. Long games — event consolidation

From round 15 onward, every 5 rounds get automatically summarized by the AI into a running
"long-term memory" block, which replaces the detailed blow-by-blow in future prompts. This
keeps context small enough for local models to handle even in 50+ round games. You can edit
the **Event Consolidator** prompt if you want denser or looser summaries.

## Notes on local models

Small/quantized local models sometimes don't follow the JSON-output instructions perfectly.
If a jump or new-game response can't be parsed as JSON, the app falls back gracefully — it
shows the AI's raw text as the narrative and simply skips stat/relation updates for that
round rather than crashing. If you see this often, try a stronger model (8B+ instruct-tuned
models are noticeably more reliable at structured output than smaller ones) or lower the
temperature in Settings.

## Project structure

```
Map Painter 1/
├── app.py              Flask backend / REST API
├── game_engine.py       Game state, prompt templates, GPT4All client
├── requirements.txt
├── templates/
│   └── index.html        Menu shell (Games/Presets/Flags) + game shell, both in one page
├── static/
│   ├── style.css          In-game HUD theme (dossier/feed/console)
│   ├── menu.css           Menu/hub theme (Games/Presets/Flags/picker) — namespaced under #menu-shell
│   ├── menu.js             Menu data + logic, calls /api/new_game to launch a game
│   └── app.js              In-game logic (actions/advisor/diplomacy/jump/save/load)
└── data/                 Save games and settings (created on first run)
    ├── current.json
    ├── settings.json
    ├── prompts.json
    └── saves/
```

## Extending it

- `game_engine.py` has a `next_speaker` and `description_to_action` prompt already
  scaffolded (matching the original 8 categories) but not wired into the UI — useful if
  you want to add group diplomacy chats with multiple AI nations at once.
- Diplomacy and advisor chat history are currently kept client-side (per browser session)
  for simplicity; persist them into `game_state` in `game_engine.py` if you want them
  saved with the game.

## License

- **Code** is released under the [MIT License](LICENSE). Copyright (c) 2026 Rmprocproc. You must keep
  this copyright notice in any copy or derivative of the code.
- **Original art and documentation** (fictional flag designs, `.md` files) are under
  [CC BY 4.0](LICENSE-ART.md). You must credit **Rmprocproc** as the author.

## Credits

Created by **Rmprocproc**.

Third-party material keeps its own license:

- **geoBoundaries** map data (CC BY 4.0), https://www.geoboundaries.org
- **MapLibre GL JS** (BSD-3-Clause) and **Leaflet** (BSD-2-Clause) map libraries
- Real national flags loaded at runtime from **flagcdn.com**
- Preset photos from **Unsplash**, used under the Unsplash License
- AI features call a provider you choose (Anthropic, OpenAI, Gemini, GPT4All, Ollama, etc.) using your own API key
