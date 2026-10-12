# Map Painter 1

An AI-driven alternate-history grand strategy sandbox that runs in your browser. Pick a nation (or
invent your own), give orders in plain language, jump forward in time, and an AI of your choice
simulates what happens next — wars, diplomacy, new governments, and borders that actually move on
the map.

Map Painter 1 draws the world with a WebGL map (MapLibre GL) at state/province level. Its sister
game, Map Painter 2, uses a Leaflet map at a finer municipality level.

## What you need

- **Windows** — the launcher is a `.bat` file (see "Other systems" below for macOS/Linux).
- **Python 3** — only its built-in web server is used. There is nothing to `pip install`.
  Get it from [python.org](https://www.python.org/downloads/) and tick "Add python.exe to PATH" during install.
- **A modern browser** with WebGL — Chrome, Edge, or Firefox.
- **An internet connection** — the map library and fonts load from public CDNs.
- **An AI provider** for the simulation — a cloud API key (Anthropic, OpenAI) or a free local model
  (Ollama, LM Studio, GPT4All). See [AI_SETUP.md](AI_SETUP.md).

## How to play

1. Download this repository (green **Code** button → **Download ZIP**) and unzip it.
2. Double-click **`Play Map Painter 1.bat`**. A small minimized server window opens, and your browser
   opens the main menu at `http://localhost:8123/menu.html`. Keep the server window open while you
   play; close it when you're done.
3. Go to **Presets** and pick a starting point: *Modern Day*, *World War I: The Road to War*,
   *World War I*, *World War II: The Road to War*, or *World War II*.
4. Click **Play Now**, then choose your nation on the map or from the list — or use **Custom** to
   create your own entity with a name, color, lore, and starting regions — and start the game.
5. The first time, connect an AI: gear icon (top right of the map) → **AI Setup**. Step-by-step
   instructions for every provider are in [AI_SETUP.md](AI_SETUP.md).

**Other systems (macOS/Linux):** open a terminal in this folder, run `python3 -m http.server 8123`,
then open `http://localhost:8123/menu.html` in your browser.

## Playing the game

- **Actions** — write orders for your nation in plain language. **Enhance** sharpens the wording
  with the AI; **Brainstorm** suggests ideas.
- **Jump forward** — the **»** button on the date bar at the top. Choose how far to jump; the AI
  simulates everything that happens in that time, then reveals the events one by one while the map
  updates.
- **Advisor** — ask your AI advisor for briefings and strategy. It doesn't change the world.
- **Chats** — open diplomacy with any nation and negotiate directly.
- **Lore**, **Search**, country details, and a timeline of past events (the **‹** button on the date
  bar) round out the side panels.
- **Gear menu** — **User Settings** (map and display options), **Events**, **Prompts** (extra instructions for each AI
  task), **AI Setup**, and **Cheats**: Your Country, Difficulty, Annex Country, Annex Regions,
  AI Cheat, Modify Regions, map features, and Fog of War.

**Saving:** your game saves automatically in this browser. **Continue Playing** on the main menu shows
it as *Map Painter 1 · start date · nation*. Saves live in the browser's local storage for
`localhost:8123`, so clearing that site's data deletes them.

## Files

| Path | What it is |
|---|---|
| `Play Map Painter 1.bat` | Launcher — starts the local server and opens the menu |
| `menu.html`, `static/menu.js`, `static/menu.css` | Main menu: Games, Presets, Flags, country picker |
| `world_map_webgl.html`, `game.js` | The map game and its gameplay systems |
| `Geo/` | Map data (boundaries, regions, cities, rivers, country names, flag catalogs) |
| `presets/` | Historical era setups (1911, 1914, 1936, 1939, modern) |
| `assets/flags/`, `assets/flags_subnational/`, `Flags/eras/` | Flag images, each folder with its own attribution |
| `Geo/Play Map Painter 1 (Leaflet).bat` | Optional: opens the older Leaflet version of the map on port 8001 |
| `Scripts/` | Developer tools for checking the historical presets |
| `app.py`, `game_engine.py`, `templates/`, `static/app.js`, `static/style.css`, `requirements.txt` | An earlier text-only prototype. Not used by the map game and not needed to play |

## License

- **Code** is released under the [MIT License](LICENSE). Copyright (c) 2026 Rmprocproc. You must keep
  this copyright notice in any copy or derivative of the code.
- **Original art and documentation** (fictional flag designs, `.md` files) are under
  [CC BY 4.0](LICENSE-ART.md). You must credit **Rmprocproc** as the author.

## Credits

Created by **Rmprocproc**.

Third-party material keeps its own license:

- **geoBoundaries** boundary data (CC BY 4.0), https://www.geoboundaries.org
- **GeoNames** city data (CC BY 4.0), https://www.geonames.org
- River data derived from **OpenStreetMap** (© OpenStreetMap contributors, ODbL)
- **MapLibre GL JS** and **TopoJSON** libraries, and map fonts from **OpenMapTiles**
- Real and historical flags in `assets/flags/` and `assets/flags_subnational/` from **Wikimedia Commons**
  (see the `ATTRIBUTION.md` in each folder); menu flag thumbnails from **flagcdn.com**
- Preset photos from **Unsplash**, used under the Unsplash License
- AI features call a provider you choose (Anthropic, OpenAI, Ollama, LM Studio, GPT4All, etc.) using your own settings
