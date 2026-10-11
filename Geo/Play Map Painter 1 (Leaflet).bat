@echo off
REM Starts a local web server rooted at the PROJECT folder (one level up from
REM this .bat, i.e. the same root "Play Map Painter 1.bat"/menu.html use) and
REM opens the Leaflet-based Map Painter 1 map in your default
REM browser. Rooted here — not in Geo/ itself, like before — because
REM Geo/game.js's era-override loader and Geo/world_map_v2.html's own asset
REM paths resolve relative URLs like "../presets/era_1939.json" and
REM "Flags/eras/..." against the PROJECT root, not Geo/: serving from Geo/
REM made those requests 404 (silently falling back to modern borders for
REM every historical preset) since a browser clamps ".." at the server root
REM and can't reach a folder that was never served at all.
cd /d "%~dp0.."

start "Map Painter 1 (Leaflet) Server" /min cmd /k "python -m http.server 8001"

REM Give the server a moment to spin up before opening the browser.
timeout /t 2 /nobreak >nul

start "" "http://localhost:8001/Geo/world_map_v2.html"
