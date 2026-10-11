/* ==========================================================================
   Map Painter 1 — Gameplay systems: Actions, Chats, Advisor, Search, Jump
   Forward / Timeline. Loaded as a plain classic script BEFORE the main inline
   script in world_map_webgl.html, so it shares the same top-level lexical scope
   (map, countryLookup, cities, targetObject, provinceOwnerOverrides,
   provinceLayerById, getCountryColor, getEffectiveCountry, rebuildCountryLayers,
   clamp, L, TERRAIN_FILL_OPACITY, WORLD_OFFSETS, topology are all declared
   there with let/const/function and are visible here — classic <script> tags
   on one page share one global lexical environment regardless of tag order,
   as long as the reference only happens once actual code RUNS, not at parse
   time). This file only ever touches those through function bodies that get
   called after initGameSystems() runs (itself called from the end of
   loadMapData(), once everything above is ready), so declaration order in the
   HTML doesn't matter here.

   NOTE (WebGL port): this file is an UNMODIFIED copy of the original
   Leaflet-based game.js. It has zero direct dependency on Leaflet's API —
   the handful of map/layer calls it makes (map.setView/getZoom/fitBounds,
   layer.getBounds().getCenter(), layer.setStyle, layer.options.color/weight,
   layer.feature.properties, layer.setTooltipContent) are all satisfied by a
   compatibility shim defined in the new world_map_webgl.html's own inline
   script, so this file never needed to change for the MapLibre GL rewrite.
   L, TERRAIN_FILL_OPACITY, WORLD_OFFSETS, clamp are named above only because
   they're available in scope — none of them are actually referenced anywhere
   in this file's real logic.
   ========================================================================== */

(function () {
    'use strict';

    // Cross-script readiness signal: buildProvinceLayerIndex() in the main
    // inline script (world_map_webgl.html) populates provinceLayerById
    // asynchronously, AFTER the WebGL map's tiles/style finish loading. This
    // file's maybeApplyEraOverrides() also runs asynchronously (it awaits its
    // own era_*.json fetch) and used to try recoloring provinceLayerById
    // entries immediately once that fetch resolved — with no guarantee the
    // province index existed yet. On a slow/cold map load (or a fast local
    // era-data fetch) the recolor loop would run first, find every lookup
    // undefined, and silently skip ALL shapes (no error, no border change).
    // A warm/cached reload — e.g. via the browser Back button — often let
    // the map finish first, which is why the bug looked intermittent.
    // Exposed on window (not a bare var) since this IIFE and the inline
    // script are separate top-level scripts, not nested scopes.
    window.MP1_PROVINCE_INDEX_READY = new Promise(function (resolve) {
        window.__resolveMP1ProvinceIndexReady = resolve;
    });

    // Earlier readiness signal: resolves as soon as targetObject/worldRegions
    // hold their real fetched values (right after loadMapData()'s initial
    // Promise.all resolves), well before the province layer index exists.
    // maybeApplyEraOverrides() needs THIS one before computing newOverrides
    // (its country/region-reassignment expansion reads targetObject.geometries
    // and worldRegions directly) — waiting only for MP1_PROVINCE_INDEX_READY
    // would let that computation run too early on a cold load and silently
    // produce an empty/partial newOverrides for that regionDataVersion. A
    // later version bump gets another chance at whatever it missed (see
    // eraOverridesVersion below), but there's no reason to rely on that for
    // a mistake this wait already prevents outright.
    window.MP1_GEODATA_READY = new Promise(function (resolve) {
        window.__resolveMP1GeoDataReady = resolve;
    });

    // Picker mode — menu.js embeds world_map_webgl.html in the country picker
    // via ?pickerMode=1 (see PICKER_MODE there). In that mode this file must
    // treat the map as a stateless world preview: never LOAD the real save (a
    // prior playthrough's conquests shouldn't repaint the picker) and,
    // critically, never WRITE to it either — otherwise the picker iframe could
    // silently overwrite the player's actual game with a fresh default state.
    const MP1_PICKER_MODE = (function () {
        try { return new URLSearchParams(window.location.search).get('pickerMode') === '1'; }
        catch (e) { return false; }
    })();

    // ---- Storage keys -----------------------------------------------------
    const GAME_STORAGE_KEY = 'mappainter1_gamestate_v1';
    const AI_CONFIG_KEY = 'mappainter1_aiconfig_v1';
    // Event-history consolidator settings — see maybeConsolidateHistory() below.
    // Separate storage key (not part of GameState) since this is a player-level
    // preference, not per-save game data, matching how AI_CONFIG_KEY is kept
    // separate from GAME_STORAGE_KEY.
    const CONSOLIDATOR_CONFIG_KEY = 'mappainter1_consolidator_v1';
    // Region-name display language ('en' or 'local') — see world_regions.json's
    // name_en/name_local fields, added by the region-ID migration. Separate
    // storage key for the same reason as AI_CONFIG_KEY/CONSOLIDATOR_CONFIG_KEY:
    // a player-level display preference, not per-save game data.
    const DISPLAY_LANGUAGE_KEY = 'mappainter1_display_language_v1';

    // Somaliland isn't broken out as its own shapeGroup in the source
    // geoBoundaries data — all of its districts carry Somalia's "SOM" group.
    // It's split into its own country ("SOML") at game start via these
    // province-ownership overrides instead, covering the traditional Awdal,
    // Woqooyi Galbeed, Togdheer, Sanaag, and Sool regions as administered by
    // Somaliland as of the 2016 game start (before the later Las Anod/SSC-
    // Khaatumo conflict).
    const SOMALILAND_DISTRICT_SHAPE_IDS = [
        '84685775B58560427797094', // Zeila
        '84685775B41100750476456', // Borama
        '84685775B40091123389404', // Baki
        '84685775B17570807087791', // Lughaya
        '84685775B71114106442910', // Hargeisa
        '84685775B16729211759375', // Gabiley
        '84685775B4618356108906',  // Baligubadle
        '84685775B1722628585645',  // Berbera
        '84685775B49158080079573', // Burao
        '84685775B26651098111953', // Odweyne
        '84685775B82555432245075', // Buhodle
        '84685775B34990175799989', // Erigavo
        '84685775B49212368266991', // El Afweyn
        '84685775B5876262576033',  // Badhan
        '84685775B17415415044999', // Las Anod
        '84685775B65673290719307', // Taleh
        '84685775B13490583966346', // Aynabo
        '84685775B18508481977999'  // Hudun
    ];

    function defaultSomalilandOverrides() {
        const overrides = {};
        SOMALILAND_DISTRICT_SHAPE_IDS.forEach(function (id) { overrides[id] = 'SOML'; });
        return overrides;
    }

    // geoBoundaries classifies 20 shapes as "DISP" (disputed) with their own
    // numeric/special shapeGroup codes (111-129, ESH) instead of folding them
    // into a normal country — meaning by default they'd render as their own
    // distinct phantom "countries" rather than under whoever actually
    // administers them as of Jan 1 2016. Only the confidently-resolvable ones
    // are mapped here (verified via research, not assumed from memory alone);
    // genuinely disputed/unclaimed ones (Abyei, the vague "CH-IN Disputed
    // Area", Demchok, Koualou, Spratly Islands, Bir Tawil/"No Man's Land") are
    // deliberately left unmapped since no single country actually administers
    // them in reality — that's the historically accurate state, not a gap.
    // Gaza Strip (DIS008) is also deliberately left unmapped here — it isn't
    // reassigned to any country because no country actually administers it.
    // Its shapeGroup ('118') already resolves it to its own standalone entity
    // by default (no override needed), which functionally represents de facto
    // Hamas control without normalizing Hamas as a recognized sovereign actor
    // in the main display. See STATIC_COUNTRY_NOTES below for the explicit
    // "administered by Hamas, not internationally recognized as legitimate"
    // status note shown on its Country Details panel.
    const DISPUTED_TERRITORY_OVERRIDES_BY_SHAPEID = {
        'DIS002': 'CHN', // Aksai Chin — Chinese-administered since 1962, disputed by India
        'DIS005': 'SVN', // Dragonja (Bay of Piran area) — de facto Slovenian administration as of Jan 2016
        'DIS006': 'BTN', // Dramana-Shakatoe — still Bhutanese-patrolled as of Jan 2016 (Chinese village construction there didn't begin until Dec 2020)
        'DIS007': 'GBR', // Falkland Islands — British-administered, claimed by Argentina
        'DIS009': 'IND', // Kalapani — Indian-administered since 1962, disputed by Nepal
        'DIS010': 'BRA', // Isla Brasilera — Brazilian military post, disputed by Uruguay
        'DIS011': 'IND', // Siachen-Saltoro — Indian military control since 1984, disputed by Pakistan
        'DIS013': 'KOR', // Liancourt Rocks (Dokdo/Takeshima) — South Korean-administered, claimed by Japan
        'DIS015': 'CHN', // Paracel Islands — Chinese-administered since 1974, disputed by Vietnam/Taiwan
        'DIS016': 'EGY', // Sanafir & Tiran Islands — still Egyptian as of Jan 2016 (transfer to Saudi Arabia wasn't agreed until April 2016 and only finalized in 2017)
        'DIS017': 'JPN', // Senkaku/Diaoyu Islands — Japanese-administered, claimed by China/Taiwan
        // DIS019 (the old single undivided "West Bank" DISP shape) no longer exists —
        // it was replaced in custom_geo.json with two real sub-shapes built from
        // B'Tselem's "Conquer and Divide" Areas A/B/C boundary data: 'DIS019A'
        // (Areas A & B, Palestinian Authority civil control — shapeGroup 'PSE',
        // ~41% of West Bank land area) and 'DIS019C' (Area C, full Israeli control —
        // shapeGroup 'ISR', ~59%). Both resolve to their real country codes directly
        // via shapeGroup, same as any normal ADM2 shape — no override entry needed
        // for either. This replaced the earlier whole-shape "give it all to Israel"
        // approximation, which was a stopgap for when no sub-division existed.
        'DIS020': 'MAR'  // Western Sahara — Morocco administers the populated majority (~80% of land area); the Polisario Front/SADR-controlled "Free Zone" is mostly the sparsely-populated eastern desert
    };
    function defaultDisputedTerritoryOverrides() {
        return Object.assign({}, DISPUTED_TERRITORY_OVERRIDES_BY_SHAPEID);
    }

    // Fixed, curated status notes for specific country codes — distinct from
    // GameState.countryAltNames (which are earned dynamically through AI-
    // generated events). These are facts we already know at game start and
    // want recorded on the Country Details panel regardless of how the game
    // plays out. Shown in a dedicated "Status" section when present; most
    // countries have no entry and the section is simply omitted.
    const STATIC_COUNTRY_NOTES = {
        '118': 'As of January 2016, Gaza Strip is administered by Hamas, which seized control from the ' +
            'Palestinian Authority in 2007. This governance is not recognized as legitimate by Israel or by ' +
            'the Palestinian Authority — the internationally recognized Palestinian governing body, based in ' +
            'the West Bank. Hamas is designated a terrorist organization by Israel, the United States, the ' +
            'European Union, and others.'
    };
    function getStaticNoteForCountry(code) {
        return STATIC_COUNTRY_NOTES[code] || null;
    }

    // ---- Game state ---------------------------------------------------------
    function defaultGameState() {
        return {
            // Game starts January 1st, 2016 to match the real-world date the
            // underlying boundary/geography data represents.
            currentDate: '2016-01-01',
            round: 1,
            playerCountry: null,
            // Cheats > Difficulty — injected into runJumpForward()'s system
            // prompt as a short behavior modifier. 'normal' matches the
            // engine's existing (unmodified) balance, so an old save with no
            // difficulty field behaves exactly as before.
            difficulty: 'normal',
            // Cheats > Prompts (formerly a dead letter: menu.js's preset-
            // browser "Simulation Rules" editor saved to localStorage under
            // 'mp1_preset_rules' but nothing ever read it back into an actual
            // AI call). Seeded once from the preset's rules text at game
            // creation (see applyPresetRulesToNewGame() in the loader below);
            // editable mid-game via the Prompts menu and read directly by
            // runJumpForward() on every Jump Forward from here on. Seeded at
            // creation time by menu.js's launchGame() (see freshState.simulationRules
            // there) — this '' default only applies to a save started some other
            // way (e.g. picker-mode preview).
            simulationRules: '',
            // The preset's "World Before Start Date" text (menu.js's BASE_PRESETS
            // `before` field, shown on the preset page above Simulation Rules).
            // By design (prompt-variable matrix), World
            // Before is fed to the SAME prompts as Simulation Rules everywhere
            // except Event Consolidator — seeded alongside simulationRules by
            // menu.js's launchGame() and spliced in next to it below.
            worldBefore: '',
            // Cheats > Modify Regions — shapeID -> hand-edited GeoJSON geometry
            // (Polygon/MultiPolygon), overriding that shape's geometry from
            // custom_geo.json. Only ever holds standalone (non-merged) shapes —
            // see initCheatsModifyRegions()'s own scoping note for why a
            // dissolved multi-shape "REGION_N" cluster can't be edited this way.
            // Re-applied to the live render on load by
            // world_map_webgl.html's reapplyGeometryOverrides(), the geometry
            // equivalent of provinceOwnerOverrides/restyleOverriddenMunicipalities.
            geometryOverrides: {},
            // Cheats > Prompts, one card per real AI call site beyond Jump
            // Forward (advisor/enhanceAction/consolidator/chat/actions) — each
            // an "extra instructions" string appended to that call's system
            // prompt, same additive pattern as simulationRules above. Keyed
            // to match standard "AI Prompts" card names where a
            // real equivalent exists in this codebase; the Catalyst
            // Creation/Runner/Summarizer and Next Speaker prompts have no
            // equivalent mechanic here at all and were deliberately not
            // faked.
            promptOverrides: { advisor: '', enhanceAction: '', consolidator: '', chat: '', actions: '' },
            // Cheats > Edit/Add/Clear Map Feature — overrides layered on top of
            // the preset's static Geo/cities.json, same override-layer pattern
            // as geometryOverrides/provinceOwnerOverrides above. Base entries
            // have no stable id, so they're addressed by "name|country" (see
            // keyOfCity() in world_map_webgl.html); `added` holds brand-new
            // player-created features (which DO get a real id at creation
            // time), `removedKeys`/`edited` only ever reference base entries.
            // Re-applied to the live render on load by
            // world_map_webgl.html's applyMapFeatureOverrides().
            mapFeatureOverrides: { added: [], removedKeys: [], edited: {} },
            // Cheats > Fog of War — original shapeIDs currently hidden under a
            // fog overlay. Purely visual (does not affect what the AI knows or
            // can act on) — see applyFogOverrides() in world_map_webgl.html.
            fogOfWarShapeIDs: [],
            provinceOwnerOverrides: Object.assign(defaultSomalilandOverrides(), defaultDisputedTerritoryOverrides()),
            pendingActions: [],
            chatThreads: [],
            advisorMessages: [],
            history: [],
            // Cache of AI-generated Lore chapter prose, keyed by chapter index
            // (see LORE_CHAPTER_SIZE) — generated once on demand, then persisted
            // so it's never regenerated/rewritten on subsequent visits.
            loreChapters: {},
            // Nicknames/aliases a country earns through gameplay events (e.g. an
            // alliance codename or treaty designation) — keyed by country code,
            // each value an array of strings. Populated by runJumpForward() when
            // the AI's response includes an "altNames" entry for an event; shown
            // on the Country Details panel (see openCountryDetailPanel()).
            countryAltNames: {},
            // Brand-new "countries" minted mid-game (e.g. a US state seceding)
            // that don't exist in country_lookup.json — code -> display name. See
            // getOrCreateCountryCode(). Merged into the live countryLookup object
            // on load (initGameSystems()) so these persist across reloads.
            customCountries: {},
            // Dynamic diplomatic relationships created via region secessions,
            // e.g. "Spain releases Catalonia as a protectorate" -> Catalonia's
            // code maps to { type: 'protectorate', overlord: 'ESP' }. See
            // setPolityRelationship()/getPolityRelationship() and
            // applyRegionChanges(). Absence of an entry means fully independent.
            polityRelationships: {},
            // Current form of government per country code, e.g. { 'PEN': 'military
            // junta' } — set by runJumpForward() when the AI's response includes a
            // "governmentChanges" entry (a coup, revolution, restoration of a
            // monarchy, declaration of a republic, etc). Absence of an entry means
            // no regime-change event has happened yet this game. See
            // setGovernmentType()/getGovernmentType() and the Country Details panel.
            governmentTypes: {},
            // Explicit flag image URL overrides, keyed by country code — takes
            // priority over the default flag in buildFlagElement(). Populated
            // both automatically (assignDefaultFlagForNewCountry(), the
            // instant a brand-new country/breakaway republic is minted — see
            // getOrCreateCountryCode()) and deliberately (an AI-supplied
            // governmentChanges.flag, or maybeAssignTriggeredFlag() on a
            // matching regime change). See setCountryFlagOverride().
            countryFlagOverrides: {},
            // Which countryFlagOverrides entries were assigned automatically
            // (assignDefaultFlagForNewCountry()/maybeAssignTriggeredFlag()) as
            // opposed to a deliberate AI-authored governmentChanges.flag —
            // an auto-assigned flag can still be upgraded later by a more
            // specific automatic match (e.g. a generic founding flag getting
            // replaced once a matching regime-type trigger fires), but a
            // deliberate one never gets silently overwritten. See
            // setCountryFlagOverride()'s isAuto parameter.
            autoAssignedFlags: {},
            // Named alliances/blocs/organizations — distinct from
            // polityRelationships (which is one country's whole-sovereignty
            // status, e.g. "Poland IS a puppet of Germany") and from
            // countryAltNames (a flavor nickname with no structured
            // membership). An alliance is { name, leaderCode, members:
            // {countryCode: rank} }, where rank is a free-form AI-chosen
            // label like "Core Member", "Synchronized Partner", "Vassal",
            // "Protectorate" — deliberately not a fixed enum, so campaigns
            // can use whatever vocabulary fits their setting. See
            // applyAllianceChanges()/getAlliancesForCountry() and the
            // Country Details panel's status pills.
            alliances: [],
            // AI-generated short-paragraph summaries of old, already-simulated
            // rounds, produced by maybeConsolidateHistory() once GameState.history
            // grows past the consolidator's configured startRound. Each entry is
            // { fromRound, toRound, fromDate, toDate, summary }. These (not the
            // raw rounds they replace) are what summarizeRecentHistory() feeds the
            // simulation AI for long-past context, keeping the prompt from
            // growing unbounded in long games.
            // The raw rounds themselves are left untouched in GameState.history
            // (still viewable in the Event Manager); only what gets fed to the AI
            // is compressed.
            historyConsolidations: []
        };
    }

    let GameState = defaultGameState();

    function loadGameState() {
        // Picker preview: baseline modern world only (Somaliland split + disputed-
        // territory resolution still apply via defaultGameState()'s own seeds),
        // PLUS whichever era menu.js's mountPickerMap() passed in the URL (so the
        // preview shows THIS preset's borders, not always modern-day). This is a
        // preview-only era — it's never persisted (saveGameState() below is a
        // hard no-op in picker mode) so it can't bleed into a real save.
        if (MP1_PICKER_MODE) {
            const state = defaultGameState();
            try {
                const eraParam = new URLSearchParams(window.location.search).get('era');
                if (eraParam) state.era = eraParam;
            } catch (e) { /* ignore */ }
            return state;
        }
        try {
            const raw = localStorage.getItem(GAME_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const base = defaultGameState();
                const defaultOverrides = base.provinceOwnerOverrides;
                const merged = Object.assign(base, parsed);
                // provinceOwnerOverrides needs a key-by-key merge, not the plain
                // top-level Object.assign above (which just replaces whole property
                // values) — otherwise an older save made before some new baseline
                // override was added (a disputed-territory fix, a future Somaliland-
                // style split, etc.) would silently lose that new default entirely,
                // since the save's own (older, smaller) overrides object would
                // wholesale-replace the current default one. Saved/player-made
                // overrides still win over defaults for any shapeID both touch.
                merged.provinceOwnerOverrides = Object.assign({}, defaultOverrides, parsed.provinceOwnerOverrides || {});
                return merged;
            }
        } catch (e) { console.warn('Failed to load game state:', e); }
        return defaultGameState();
    }

    function saveGameState() {
        // Hard write-guard for picker mode — see MP1_PICKER_MODE above. This is
        // the single writer for the save key, so gating it here protects the
        // real save no matter which code path tries to persist.
        if (MP1_PICKER_MODE) return;
        try {
            localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(GameState));
        } catch (e) { console.warn('Failed to save game state:', e); }
    }

    // ---- Historical-era map overrides ---------------------------------------
    // Non-Modern presets set GameState.era ('1914' / '1936' / '1939') via
    // menu.js's launchGame(). The matching era_<era>.json dataset (project
    // root, next to world_map_webgl.html) describes that era's world at the
    // COUNTRY level (plus optional ADM1-region-level refinements), and this
    // expands it into the exact same per-shape provinceOwnerOverrides mechanism
    // the AI's own map changes already use — so era borders recolor, label,
    // and transfer exactly like any other ownership state.
    // See era_1914.json's _readme for the dataset schema. The expansion is
    // versioned per era_*.json's own regionDataVersion field (GameState.
    // eraOverridesVersion[era] tracks what's already been applied) and every
    // write is guarded on the shapeID having no override yet — so re-running
    // it after a data fix can only fill shapes the expansion never reached
    // the first time, never touch one the AI (or an earlier run of this same
    // expansion) already resolved. See the version-check block below for why
    // this replaced a plain "ran once ever" boolean.
    function normalizeRegionKey(s) {
        let v = String(s || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
            .trim();
        // Strip a trailing administrative-unit designation word before the final
        // alphanumeric-only reduction below. world_regions.json's actual region
        // names come straight from geoBoundaries' own per-country ADM1 shapeName
        // convention, which varies country to country — e.g. Poland's are "X
        // Voivodeship", Ukraine's are "X Oblast", Lithuania's are "X County" —
        // while era_*.json's regionReassignments wanted-names are written as the
        // short, bare place name ("Pomeranian", "Lviv", "Klaipeda") with no way
        // to know or predict which designation word a given country uses. Without
        // this, the exact-match lookup below silently matched nothing for any
        // such country, which is exactly why Danzig/Pomorskie never went to
        // Germany in 1914, Lviv/Ivano-Frankivsk never went to Austria-Hungary,
        // and Klaipeda never went to Germany in 1939 — not a data problem, a
        // matching-logic one. Word-boundary + end-anchored so it only strips a
        // genuine trailing designation, never a legitimate word that merely
        // contains one of these as a substring.
        v = v.replace(/\s+(voivodeship|oblast|county|province|region|governorate|department|prefecture|district|municipality|canton|state|krai|okrug|raion|rayon|parish|shire|territory)\s*$/i, '');
        return v.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    // Historically held real ADM2/ADM3-level shapes that world_regions.json's
    // own ADM1 grouping didn't use to expose at a fine enough level for
    // specific historical border carves (e.g. France's 96 ADM2 shapes ARE its
    // real departments — Bas-Rhin/Haut-Rhin/Moselle each exist individually —
    // but world_regions.json used to only group them up to the ADM1
    // "Grand Est" region). Stage 2/3 of this project's map work regrouped
    // world_regions.json itself to expose Bas-Rhin/Haut-Rhin/Moselle and
    // Italy's real Trentino/South Tyrol/Trieste provinces (see
    // Scripts/mp1_fetch_adm2_subregions.py) directly as their own ADM1-level
    // keys, so this supplementary table is no longer needed for either
    // country — worldRegions[countryCode] alone now resolves them. Left empty
    // (rather than deleted outright) since maybeApplyEraOverrides() below
    // still merges it in unconditionally; a future country needing the same
    // kind of one-off carve before world_regions.json is updated for it can
    // still use this as an escape hatch. IMPORTANT: don't add an entry here
    // for any region name that ALSO exists as a real key in
    // world_regions.json — this object is merged in AFTER (and so silently
    // wins over) worldRegions[countryCode] in the Object.assign() below, so a
    // stale entry here would shadow a correct, real one there (this exact bug
    // shipped briefly: the old FRA/ITA entries pointed at shapeIDs that Stage
    // 2 had since deleted from custom_geo.json entirely, once Italy's two
    // coarse region polygons were replaced by 6 real province shapes).
    const ADM2_SUPPLEMENTARY_REGIONS = {};
    async function maybeApplyEraOverrides() {
        // Deliberately allowed to run in picker mode too (unlike loadGameState's
        // real-save guard) — this only computes in-memory overrides and repaints
        // the preview map; saveGameState() below is still a hard no-op in picker
        // mode, so there's no way for this to write into the real save. Without
        // this, the country picker always showed modern-day borders regardless
        // of which historical preset was actually selected.
        if (!GameState.era) return;
        let data = null;
        try {
            const resp = await fetch('presets/era_' + GameState.era + '.json?v=1');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            data = await resp.json();
        } catch (e) {
            console.warn('Era dataset era_' + GameState.era + '.json not available — the map will show modern borders for this era until it exists.', e);
            return;
        }

        // 0. unassignedKeepModernOwner (from open-historia's spec schema —
        // github.com/Open-Historia/open-historia): makes this engine's actual
        // fallback behavior an explicit, self-documenting per-preset flag
        // instead of an implicit side effect nobody could see just from
        // reading the preset. Every shapeID NOT touched by countryReassignments/
        // regionReassignments below already keeps its own real shapeGroup —
        // see getEffectiveCountry() — so this only ever reads `true` today;
        // `false` isn't implemented (there's no unassigned-owner concept to
        // fall back to instead), so it's called out loudly rather than
        // silently ignored.
        if (data.unassignedKeepModernOwner === false) {
            console.warn('Era dataset era_' + GameState.era + '.json sets unassignedKeepModernOwner: false — ' +
                'not supported by this engine, every unassigned shape keeps its modern owner regardless.');
        }

        // 1. Register era entities — names into the live countryLookup (and, for
        // brand-new codes, into customCountries so every other system that
        // resolves codes-by-name finds them), colors into the map engine's
        // ERA_COLOR_OVERRIDES hook, flags into countryFlagOverrides.
        Object.keys(data.entities || {}).forEach(function (code) {
            const ent = data.entities[code];
            if (!ent) return;
            if (ent.name) {
                countryLookup[code] = ent.name;
                GameState.customCountries[code] = ent.name;
            }
            if (ent.color && window.ERA_COLOR_OVERRIDES) window.ERA_COLOR_OVERRIDES[code] = ent.color;
            if (ent.flag && !GameState.countryFlagOverrides[code]) GameState.countryFlagOverrides[code] = ent.flag;
        });
        // buildLayers() bakes each country's default map color into a static
        // expression the moment it runs, using whatever getCountryColor()
        // returns at that instant — which can be BEFORE the era colors just
        // registered above exist, since this whole function only got here via
        // an async fetch(). Without this, a country's own native/unreassigned
        // territory (e.g. Germany's actual 1937 heartland) stays stuck on its
        // modern default color forever, even though territory reassigned INTO
        // that country (Austria, Sudetenland, East Prussia) correctly shows
        // the historical color via the per-shape override below — see
        // refreshCountryFillColors()'s own comment in world_map_webgl.html.
        if (window.refreshCountryFillColors) window.refreshCountryFillColors();

        // 2. Expand the reassignment tables into per-shape overrides.
        //
        // Versioned + incremental, not "once ever": era_*.json's own
        // regionDataVersion (bump it whenever a reassignment table entry is
        // added/fixed) is compared against GameState.eraOverridesVersion[era].
        // A stale/missing version re-runs this expansion, but every write
        // below is guarded on the shapeID having NO override yet in the real
        // (not scratch) provinceOwnerOverrides — so a re-run can only fill in
        // shapes the expansion never reached the first time (e.g. a
        // regionReassignments entry that didn't exist yet, or one a matching
        // bug silently skipped), never touch a shape the AI legitimately
        // transferred since, and never re-litigate a shape this same
        // expansion already got right. This is what let the N. Mariana
        // Islands DEU carve (id 3097, regionReassignments.USA) reach saves
        // that had already run the old one-shot expansion before that entry
        // existed — the plain boolean gate this replaced had no way to ever
        // reach an existing save again once GameState.eraApplied was true,
        // so a correct data fix could sit in the JSON forever without
        // affecting anyone already mid-game (2026-08-24 bug report).
        //
        // "Fill gaps only" can't CORRECT an already-wrong value, though —
        // exactly what was needed for USA region id 3363, which regionData
        // Version 1 shipped as "Marshall Islands" -> DEU/JPN but was actually
        // 12 ordinary US counties named "Marshall" (a name-matching bug in
        // whatever built world_regions.json, not the real Pacific nation —
        // see era_1914.json's _readme). data.clearShapeIDs below is the
        // explicit escape hatch for that: shapeIDs to unconditionally drop
        // from provinceOwnerOverrides (falling back to their real shapeGroup)
        // on a version bump, for the rare case where the correction itself
        // is "stop touching this shape," not "reassign it differently."
        const dataVersion = data.regionDataVersion || 1;
        if (!GameState.eraOverridesVersion) GameState.eraOverridesVersion = {};
        const appliedVersion = GameState.eraOverridesVersion[GameState.era] || 0;
        if (appliedVersion < dataVersion) {
            // Wait for targetObject/worldRegions to hold their real fetched
            // values before reading them — see the readiness-promise comment
            // near the top of this file. Getting this wrong here (unlike the
            // repaint step below) is unrecoverable on a fresh game (nothing
            // yet exists to re-derive a missed shape from), though a later
            // regionDataVersion bump still gets another chance at it.
            if (window.MP1_GEODATA_READY) {
                try { await window.MP1_GEODATA_READY; } catch (e) { /* ignore */ }
            }
            try {
                // Unconditional corrections first (see the comment block
                // above) — deleting rather than reassigning, so the shape
                // just falls back to its real shapeGroup/whatever the AI has
                // since done with it. Applied straight to the live objects,
                // not newOverrides, since there's nothing to merge: this is
                // strictly undoing a previous version's mistake.
                (data.clearShapeIDs || []).forEach(function (shapeID) {
                    delete provinceOwnerOverrides[shapeID];
                    if (GameState.provinceOwnerOverrides) delete GameState.provinceOwnerOverrides[shapeID];
                });
                const newOverrides = {};
                const byCountry = data.countryReassignments || {};
                targetObject.geometries.forEach(function (geom) {
                    const props = geom.properties;
                    if (provinceOwnerOverrides[props.shapeID] !== undefined) return;
                    const effective = provinceOwnerOverrides[props.shapeID] || props.shapeGroup;
                    if (byCountry[effective]) newOverrides[props.shapeID] = byCountry[effective];
                });
                const byRegion = data.regionReassignments || {};
                const regionsAvailable = (typeof worldRegions !== 'undefined') && worldRegions;
                // Post region-ID migration: a regionReassignments key is EITHER
                // a stable numeric region ID (world_regions.json's own .id per
                // bucket — exact lookup, no ambiguity, immune to renames) or a
                // legacy region NAME (deprecated fuzzy-matched fallback, kept
                // only for the handful of regions — MP2's ADM2_SUPPLEMENTARY_REGIONS
                // entries — that were never migrated because they have no
                // world_regions.json entry to assign an ID to in the first
                // place). regionEntryShapeIDs() bridges the two possible leaf
                // shapes a regionIndex entry can be: {id, name_en, name_local,
                // shapeIDs} for a real world_regions.json bucket, or a bare
                // shapeID array for an ADM2_SUPPLEMENTARY_REGIONS entry.
                function regionEntryShapeIDs(entry) {
                    if (!entry) return [];
                    return Array.isArray(entry) ? entry : (entry.shapeIDs || []);
                }
                Object.keys(byRegion).forEach(function (countryCode) {
                    const wanted = byRegion[countryCode];
                    const regionIndex = regionsAvailable
                        ? Object.assign({}, worldRegions[countryCode] || {}, ADM2_SUPPLEMENTARY_REGIONS[countryCode] || {})
                        : (ADM2_SUPPLEMENTARY_REGIONS[countryCode] || null);
                    if (!regionIndex) { console.warn('Era overrides: no ADM1 region index for ' + countryCode); return; }
                    const idLookup = {};
                    const normalized = {};
                    Object.keys(regionIndex).forEach(function (realName) {
                        const entry = regionIndex[realName];
                        if (entry && !Array.isArray(entry) && entry.id != null) idLookup[String(entry.id)] = entry;
                        normalized[normalizeRegionKey(realName)] = realName;
                    });
                    Object.keys(wanted).forEach(function (regionKeyOrName) {
                        if (/^\d+$/.test(regionKeyOrName)) {
                            const entry = idLookup[regionKeyOrName];
                            if (!entry) { console.warn('Era overrides: region ID ' + regionKeyOrName + ' not found in ' + countryCode + ' — skipped.'); return; }
                            regionEntryShapeIDs(entry).forEach(function (shapeID) {
                                if (provinceOwnerOverrides[shapeID] !== undefined) return;
                                newOverrides[shapeID] = wanted[regionKeyOrName];
                            });
                            return;
                        }
                        // Legacy fallback — deprecated, only still reachable for
                        // ADM2_SUPPLEMENTARY_REGIONS entries (see above).
                        const realName = normalized[normalizeRegionKey(regionKeyOrName)];
                        if (!realName) { console.warn('Era overrides: region "' + regionKeyOrName + '" not found in ' + countryCode + ' — skipped.'); return; }
                        regionEntryShapeIDs(regionIndex[realName]).forEach(function (shapeID) {
                            if (provinceOwnerOverrides[shapeID] !== undefined) return;
                            newOverrides[shapeID] = wanted[regionKeyOrName];
                        });
                    });
                });
                Object.assign(provinceOwnerOverrides, newOverrides);
                GameState.provinceOwnerOverrides = Object.assign({}, GameState.provinceOwnerOverrides, newOverrides);
                GameState.eraApplied = true;
                GameState.eraOverridesVersion[GameState.era] = dataVersion;
                saveGameState();
                console.log('Era overrides applied: ' + Object.keys(newOverrides).length + ' shapes reassigned for era ' + GameState.era +
                    ' (data v' + dataVersion + (appliedVersion ? ', catch-up from v' + appliedVersion : '') + ').');
            } catch (eraErr) {
                // Previously uncaught here — any exception in the block above
                // (malformed era JSON, a worldRegions lookup issue, etc.) became
                // a silent unhandled promise rejection: neither eraApplied nor
                // eraOverridesVersion got set, provinceOwnerOverrides stayed
                // empty/stale, and nothing in the UI or console explained why
                // borders looked unmodified. Now it logs loudly instead of
                // vanishing, so this is actually debuggable next time it
                // happens rather than requiring a full manual re-trace from
                // scratch — and since the version wasn't recorded, the next
                // load just retries the same catch-up rather than getting
                // stuck permanently the way the old boolean gate would have.
                console.error('Era overrides FAILED for era ' + GameState.era + ':', eraErr);
            }
        }

        // 3. Repaint — entity colors/names only just arrived, and on a first
        // load the overrides themselves did too. The WebGL engine has no
        // restyleOverriddenMunicipalities(), so repaint each overridden shape
        // directly through its compat layer object (same per-shape path the
        // AI's own applyMapChanges() uses).
        // Wait for the map's province layer index to exist before trying to
        // recolor anything through it — see the readiness-promise comment
        // near the top of this file for why this matters.
        if (window.MP1_PROVINCE_INDEX_READY) {
            try { await window.MP1_PROVINCE_INDEX_READY; } catch (e) { /* ignore */ }
        }
        Object.keys(provinceOwnerOverrides).forEach(function (shapeID) {
            const layer = provinceLayerById[shapeID];
            if (!layer || !layer.setStyle) return;
            const code = provinceOwnerOverrides[shapeID];
            layer.setStyle({ fillColor: getCountryColor(code) });
            if (layer.setTooltipContent && layer.feature) {
                layer.setTooltipContent(
                    '<strong>' + layer.feature.properties.shapeName + '</strong><br><span style="color:#9ca3af;">' +
                    (countryLookup[code] || code) + ' (' + (layer.feature.properties.shapeType || 'ADM2') + ')</span>'
                );
            }
        });
        rebuildCountryLayers();
    }

    // ---- AI config ----------------------------------------------------------
    let AIConfig = { provider: 'anthropic', baseUrl: '', apiKey: '', model: '', useStructuredOutput: false };

    // Set by callAI() right before it returns, based on the provider's own
    // stop/finish reason — true means the response was cut off because it hit
    // maxTokens, NOT that the model chose to stop naturally. Checked by callers
    // (e.g. runJumpForward) that want to tell a truncation apart from a
    // genuinely malformed response, since those need very different, actionable
    // error messages. A simple flag (rather than changing callAI's return type
    // to an object) keeps every other existing call site untouched.
    let lastAICallTruncated = false;

    function loadAIConfig() {
        try {
            const raw = localStorage.getItem(AI_CONFIG_KEY);
            if (raw) return Object.assign({ provider: 'anthropic', baseUrl: '', apiKey: '', model: '', useStructuredOutput: false }, JSON.parse(raw));
        } catch (e) { console.warn('Failed to load AI config:', e); }
        return { provider: 'anthropic', baseUrl: '', apiKey: '', model: '', useStructuredOutput: false };
    }

    function saveAIConfig() {
        try { localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(AIConfig)); } catch (e) { console.warn('Failed to save AI config:', e); }
    }

    // ---- Event-history consolidator config ----------------------------------
    // Defaults: round 15, chunk size 5. No UI is
    // wired up for these yet — they can be tuned by editing this localStorage
    // key directly (mappainter1_consolidator_v1) until a settings control
    // exists for it.
    function defaultConsolidatorConfig() {
        return { enabled: true, startRound: 15, chunkSize: 5 };
    }
    function loadConsolidatorConfig() {
        try {
            const raw = localStorage.getItem(CONSOLIDATOR_CONFIG_KEY);
            if (raw) return Object.assign(defaultConsolidatorConfig(), JSON.parse(raw));
        } catch (e) { console.warn('Failed to load consolidator config:', e); }
        return defaultConsolidatorConfig();
    }
    function saveConsolidatorConfig(cfg) {
        try { localStorage.setItem(CONSOLIDATOR_CONFIG_KEY, JSON.stringify(cfg)); } catch (e) { console.warn('Failed to save consolidator config:', e); }
    }

    // ---- Region-name display language ('en' | 'local') ----------------------
    // Exposed on window since the settings-panel toggle and the region-name
    // rendering path both live in world_map_webgl.html's own inline script,
    // not this file. name_local is currently identical to name_en for every
    // region — no real translation data is wired in yet — so toggling this
    // has no visible effect today; it's real, working plumbing (setting,
    // storage, lookup) ready for genuine localized names to be dropped into
    // world_regions.json's name_local field later without touching anything
    // else. Defaults to 'en'.
    function loadDisplayLanguage() {
        try {
            const v = localStorage.getItem(DISPLAY_LANGUAGE_KEY);
            if (v === 'en' || v === 'local') return v;
        } catch (e) { /* ignore */ }
        return 'en';
    }
    function saveDisplayLanguage(v) {
        try { localStorage.setItem(DISPLAY_LANGUAGE_KEY, v === 'local' ? 'local' : 'en'); } catch (e) { console.warn('Failed to save display language:', e); }
    }
    window.getDisplayLanguage = loadDisplayLanguage;
    window.setDisplayLanguage = saveDisplayLanguage;

    // ---- Generic themed confirm modal (replaces window.confirm()) -----------
    function showConfirm(title, body) {
        return new Promise(function (resolve) {
            const overlay = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-modal-title');
            const bodyEl = document.getElementById('confirm-modal-body');
            const okBtn = document.getElementById('confirm-modal-confirm');
            const cancelBtn = document.getElementById('confirm-modal-cancel');
            titleEl.textContent = title;
            bodyEl.textContent = body || '';
            overlay.classList.add('open');

            function cleanup(result) {
                overlay.classList.remove('open');
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(result);
            }
            function onOk() { cleanup(true); }
            function onCancel() { cleanup(false); }
            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    // ---- Generic themed alert modal (replaces window.alert()) ---------------
    // window.alert() blocks the page's JS thread the same way window.confirm()
    // does, which both looks inconsistent with the rest of this UI and freezes
    // any automated/CDP-driven control of the page. Reuses the confirm modal
    // markup with the Cancel button hidden and the Confirm button relabeled.
    function showAlert(title, body) {
        return new Promise(function (resolve) {
            const overlay = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-modal-title');
            const bodyEl = document.getElementById('confirm-modal-body');
            const okBtn = document.getElementById('confirm-modal-confirm');
            const cancelBtn = document.getElementById('confirm-modal-cancel');
            titleEl.textContent = title;
            bodyEl.textContent = body || '';
            cancelBtn.style.display = 'none';
            okBtn.textContent = 'OK';
            overlay.classList.add('open');

            function cleanup() {
                overlay.classList.remove('open');
                okBtn.removeEventListener('click', onOk);
                cancelBtn.style.display = '';
                okBtn.textContent = 'Confirm';
                resolve();
            }
            function onOk() { cleanup(); }
            okBtn.addEventListener('click', onOk);
        });
    }

    // Turns a raw HTTP-error response body into a short, actionable headline
    // plus the original detail underneath — instead of just dumping the
    // provider's raw JSON (which is often accurate but not obviously
    // actionable to someone who isn't reading API docs). Handles both plain
    // {"error":{...}} shapes (OpenAI/Anthropic-style) and array-wrapped
    // [{"error":{...}}] shapes (seen from Gemini's OpenAI-compat endpoint).
    function humanizeAIError(status, rawText) {
        let parsed = null;
        try { parsed = JSON.parse(rawText); } catch (e) { /* not JSON */ }
        if (Array.isArray(parsed)) parsed = parsed[0];
        const err = parsed && parsed.error ? parsed.error : null;
        const rawMessage = (err && err.message) ? err.message : (rawText || '(empty response body)').slice(0, 300);

        let headline;
        if (/api.?key/i.test(rawMessage) && /valid|invalid|missing|required|pass/i.test(rawMessage)) {
            // Some providers (e.g. Gemini) return this as a plain 400 rather than
            // 401/403, so check the message text itself, not just the status code.
            headline = 'Invalid API key (' + status + '): the key in Settings is missing, malformed, or not ' +
                'recognized by this provider. Double-check it was copied in full with nothing extra/missing.';
        } else if (status === 404 || /not found|does not exist/i.test(rawMessage)) {
            headline = 'Model not found (404): the Model field doesn\'t match a real model name on this endpoint. ' +
                'Double-check the exact current model name for whichever provider the Base URL points at ' +
                '(e.g. "gemini-3.5-flash" for Gemini, "claude-sonnet-5" for Anthropic, "gpt-4o-mini" for OpenAI) ' +
                '— model names change over time, so check that provider\'s own docs if unsure.';
        } else if (status === 401 || status === 403) {
            headline = 'Authentication failed (' + status + '): the API key is missing, wrong, or doesn\'t have ' +
                'access to this endpoint/model. Double-check the key in Settings.';
        } else if (status === 429) {
            headline = 'Rate limited or out of quota (429): too many requests too quickly, or this account has ' +
                'no remaining credits/quota with this provider.';
        } else if (status >= 500) {
            headline = 'Server error (' + status + '): this looks like a problem on the provider\'s end, not with ' +
                'your settings. Worth trying again in a moment.';
        } else if (status === 400) {
            headline = 'Bad request (400): the request was rejected — often the Base URL needs a slightly ' +
                'different path/shape for this specific provider, or a required field is missing.';
        } else {
            headline = 'Request failed (' + status + ').';
        }
        return headline + '\nRaw response: ' + rawMessage;
    }

    // A fetch() that never even gets a response (offline, wrong/unreachable
    // Base URL, or the provider blocking direct browser requests via CORS) throws
    // a generic, unhelpful browser error like "Failed to fetch" with zero context.
    // This wraps that into something that actually suggests what to check.
    function humanizeNetworkError(e) {
        return 'Couldn\'t reach the server at all. This usually means the Base URL is wrong or unreachable, ' +
            'you\'re offline, or the provider is blocking direct browser requests (CORS) and needs a server-side ' +
            'proxy instead of a direct connection.\nRaw: ' + (e && e.message ? e.message : String(e));
    }

    // ---- AI call dispatcher --------------------------------------------------
    // Supports Anthropic's native Messages API, and a generic "OpenAI-compatible"
    // Chat Completions shape, which is what covers not just OpenAI itself but
    // nearly every local-AI server (Ollama's OpenAI-compat endpoint, LM Studio,
    // text-generation-webui, vLLM, llama.cpp server, etc.) — so "any API or my
    // local AI" both reduce to picking the right base URL against that one shape.
    async function callAI(systemPrompt, userPrompt, opts) {
        opts = opts || {};
        const maxTokens = opts.maxTokens || 1500;

        if (AIConfig.provider === 'anthropic') {
            const base = (AIConfig.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
            let resp;
            try {
                resp = await fetch(base + '/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': AIConfig.apiKey || '',
                        'anthropic-version': '2023-06-01',
                        // Required for calling the Anthropic API directly from a browser
                        // page rather than through a server-side proxy.
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: AIConfig.model || 'claude-sonnet-4-5',
                        max_tokens: maxTokens,
                        system: systemPrompt,
                        messages: [{ role: 'user', content: userPrompt }]
                    })
                });
            } catch (networkErr) {
                throw new Error(humanizeNetworkError(networkErr));
            }
            if (!resp.ok) {
                const errText = await resp.text().catch(function () { return ''; });
                throw new Error(humanizeAIError(resp.status, errText));
            }
            const data = await resp.json();
            lastAICallTruncated = data.stop_reason === 'max_tokens';
            const textBlock = (data.content || []).find(function (b) { return b.type === 'text'; });
            return textBlock ? textBlock.text : '';
        }

        // openai-compatible
        const base = (AIConfig.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
        const headers = { 'Content-Type': 'application/json' };
        if (AIConfig.apiKey) headers['Authorization'] = 'Bearer ' + AIConfig.apiKey;

        function buildBody(includeSchema) {
            const body = {
                model: AIConfig.model || 'gpt-4o-mini',
                max_tokens: maxTokens,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            };
            if (includeSchema && opts.jsonSchema) {
                body.response_format = { type: 'json_schema', json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema } };
            }
            return body;
        }

        // Cheats > AI Setup > "Use structured JSON output" — grammar-constrains
        // the model's decoding to opts.jsonSchema via the OpenAI-compatible
        // response_format param (LM Studio/llama.cpp server support this by
        // converting the schema to a GBNF grammar, making malformed JSON
        // mechanically impossible rather than hoped-for). Opt-in and
        // provider-gated (Anthropic uses a different mechanism entirely, not
        // implemented here) specifically because response_format support
        // varies a lot across "openai-compatible" backends (Ollama, various
        // proxies, etc.) — a server that doesn't understand it could reject
        // the whole request, so a call that included it gets ONE silent retry
        // without it before surfacing any error, rather than ever hard-failing
        // a working setup just because this toggle was left on somewhere it
        // doesn't apply.
        const wantsSchema = !!(AIConfig.useStructuredOutput && opts.jsonSchema);
        async function doFetch(includeSchema) {
            return fetch(base + '/chat/completions', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(buildBody(includeSchema))
            });
        }

        let resp;
        try {
            resp = await doFetch(wantsSchema);
            if (wantsSchema && !resp.ok) {
                resp = await doFetch(false);
            }
        } catch (networkErr) {
            throw new Error(humanizeNetworkError(networkErr));
        }
        if (!resp.ok) {
            const errText = await resp.text().catch(function () { return ''; });
            throw new Error(humanizeAIError(resp.status, errText));
        }
        const data = await resp.json();
        lastAICallTruncated = !!(data.choices && data.choices[0] && data.choices[0].finish_reason === 'length');
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    }

    // Pulls a JSON object out of an AI response that may have prose around it or
    // be wrapped in a ```json fence.
    function extractJSON(text) {
        if (!text) return null;
        let t = text.trim();
        const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenceMatch) t = fenceMatch[1].trim();
        try { return JSON.parse(t); } catch (e) { /* fall through */ }
        const first = t.indexOf('{');
        const last = t.lastIndexOf('}');
        if (first >= 0 && last > first) {
            try { return JSON.parse(t.slice(first, last + 1)); } catch (e) { /* fall through */ }
        }
        return null;
    }

    // ---- Country/province resolution helpers ---------------------------------
    // Resolves either an ISO3 code or a free-text country name (as an AI would
    // write it) back to the ISO3 code used everywhere else in this app.
    function resolveCountryCode(nameOrCode) {
        if (!nameOrCode) return null;
        const trimmed = String(nameOrCode).trim();
        if (countryLookup[trimmed.toUpperCase()]) return trimmed.toUpperCase();
        const lower = trimmed.toLowerCase();
        for (const code in countryLookup) {
            if (countryLookup[code].toLowerCase() === lower) return code;
        }
        for (const code in countryLookup) {
            const name = countryLookup[code].toLowerCase();
            if (name.includes(lower) || lower.includes(name)) return code;
        }
        return null;
    }

    function getProvinceNamesForCountry(iso3, limit) {
        const out = [];
        if (!targetObject) return out;
        for (let i = 0; i < targetObject.geometries.length; i++) {
            const props = targetObject.geometries[i].properties;
            if (getEffectiveCountry(props.shapeID, props.shapeGroup) === iso3) {
                out.push(props.shapeName);
                if (limit && out.length >= limit) break;
            }
        }
        return out;
    }

    function findProvinceByName(countryISO3, provinceName) {
        if (!targetObject || !provinceName) return null;
        const target = String(provinceName).trim().toLowerCase();
        let exact = null, partial = null;
        for (let i = 0; i < targetObject.geometries.length; i++) {
            const props = targetObject.geometries[i].properties;
            if (getEffectiveCountry(props.shapeID, props.shapeGroup) !== countryISO3) continue;
            const name = (props.shapeName || '').toLowerCase();
            if (name === target) { exact = props; break; }
            if (!partial && (name.includes(target) || target.includes(name))) partial = props;
        }
        return exact || partial;
    }

    function findProvinceByNameAnyCountry(provinceName) {
        if (!targetObject || !provinceName) return null;
        const target = String(provinceName).trim().toLowerCase();
        let exact = null, partial = null;
        for (let i = 0; i < targetObject.geometries.length; i++) {
            const props = targetObject.geometries[i].properties;
            const name = (props.shapeName || '').toLowerCase();
            if (name === target) { exact = props; break; }
            if (!partial && name.includes(target)) partial = props;
        }
        return exact || partial;
    }

    // Resolves a country name to its code same as resolveCountryCode(), but if
    // nothing matches (e.g. the AI declares a brand-new nation like "Pennsylvania"
    // seceding, which obviously isn't in country_lookup.json), MINTS a new code
    // for it instead of silently failing — this is what actually makes
    // secession/new-nation events take effect on the map rather than just
    // appearing in the narrative text with no real territorial change. Reuses
    // the same generated code for the same declared name later in the same game
    // (persisted in GameState.customCountries), so repeated references to
    // "Pennsylvania" don't each mint a different throwaway code.
    function getOrCreateCountryCode(name) {
        const existing = resolveCountryCode(name);
        if (existing) return existing;
        if (!name) return null;
        const trimmedName = String(name).trim();
        if (!trimmedName) return null;

        if (!GameState.customCountries) GameState.customCountries = {};
        for (const code in GameState.customCountries) {
            if (GameState.customCountries[code].toLowerCase() === trimmedName.toLowerCase()) return code;
        }

        let base = trimmedName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        if (base.length < 3) base = (base + 'XXX').slice(0, 3);
        let code = base;
        let n = 1;
        while (countryLookup[code] || GameState.customCountries[code]) {
            code = base.slice(0, 2) + n;
            n++;
        }
        GameState.customCountries[code] = trimmedName;
        countryLookup[code] = trimmedName;
        // Mint-time state/province/region flag mapping: covers a newly-seceded
        // subdivision in the same session without waiting for a reload
        // (initGameSystems() handles the reload/reapply case). Covers the US plus
        // every other country in SUBDIVISION_FLAGS (world_map_webgl.html).
        if (window.SUBDIVISION_FLAGS) {
            const lowerName = trimmedName.toLowerCase();
            if (window.SUBDIVISION_FLAGS[lowerName]) {
                ISO3_TO_ISO2[code] = window.SUBDIVISION_FLAGS[lowerName];
            }
        }
        // Give it a flag right now — a real historical one if the name
        // matches a known nation, otherwise a generated one — instead of
        // leaving it a plain colored-initials badge until/unless a separate
        // governmentChanges event happens to fire later (see
        // assignDefaultFlagForNewCountry()).
        assignDefaultFlagForNewCountry(code, trimmedName);
        return code;
    }

    // Applies a batch of AI-declared map changes to actual province ownership,
    // restyling the affected municipality polygons immediately and re-dissolving
    // country borders once at the end (expensive, so only ever once per batch —
    // never per individual change).
    function applyMapChanges(changes) {
        const applied = [];
        (changes || []).forEach(function (ch) {
            const toISO = getOrCreateCountryCode(ch.toCountry);
            if (!toISO) return;
            const fromISO = resolveCountryCode(ch.fromCountry);
            // Only fall back to the cross-country name search when the AI gave no
            // fromCountry at all (or it didn't resolve to a real code) — if it DID
            // resolve but that country simply has no province by this name, that's
            // the AI naming the wrong owner (e.g. confusing Belgium's own province
            // "Luxemburg" with the separate country of Luxembourg's like-named
            // capital commune), and grabbing a same-named shape from some other
            // country instead is virtually never the intended change. Confirmed
            // live: "annex Belgium" pulled in the real Luxembourg's capital
            // commune because Belgium has no exact/partial "Luxembourg" province
            // match once "Luxemburg" itself is already spoken for, and the search
            // used to keep going into every other country's shapes regardless.
            const match = fromISO
                ? findProvinceByName(fromISO, ch.province)
                : findProvinceByNameAnyCountry(ch.province);
            if (!match) return;

            applyOneProvinceOverride(match.shapeID, toISO, match.shapeName, match.shapeType);
            applied.push({ shapeID: match.shapeID, shapeName: match.shapeName, fromCountry: fromISO, toCountry: toISO });
        });
        if (applied.length) rebuildCountryLayers();
        return applied;
    }

    // Shared by applyMapChanges (one named province at a time) and
    // applyRegionChanges (a whole US state's worth of counties at once) — sets
    // the override and restyles that one municipality's fill/tooltip. Does NOT
    // call rebuildCountryLayers() itself since that's an expensive full-world
    // re-dissolve meant to run once per batch, not once per province.
    function applyOneProvinceOverride(shapeID, toISO, shapeName, shapeType) {
        provinceOwnerOverrides[shapeID] = toISO;
        GameState.provinceOwnerOverrides[shapeID] = toISO;
        const layer = provinceLayerById[shapeID];
        if (layer) {
            layer.setStyle({ fillColor: getCountryColor(toISO) });
            if (layer.setTooltipContent) {
                layer.setTooltipContent(
                    '<strong>' + shapeName + '</strong><br/><span style="color:#9ca3af;">' +
                    (countryLookup[toISO] || toISO) + ' (' + (shapeType || 'ADM2') + ')</span>'
                );
            }
        }
    }

    // Applies whole-region transfers (any country's states/provinces/regions,
    // via worldRegions — built from geoBoundaries' global ADM1 dataset) — lets
    // the AI declare "all of Aragon secedes" or "Catalonia becomes a Spanish
    // protectorate" as one small directive instead of having to name and
    // enumerate every one of its constituent shapes itself (unreliable and
    // token-expensive). toCountry may be a brand-new name (see
    // getOrCreateCountryCode). An optional relationship (+ overlord) records a
    // puppet/protectorate/vassal tie via setPolityRelationship().
    function applyRegionChanges(changes) {
        const applied = [];
        (changes || []).forEach(function (ch) {
            if (!ch || !ch.region) return;
            const fromISO = resolveCountryCode(ch.country);
            const shapeIDs = findRegionShapeIDs(fromISO, ch.region);
            if (!shapeIDs || !shapeIDs.length) return;
            const toISO = getOrCreateCountryCode(ch.toCountry);
            if (!toISO) return;

            shapeIDs.forEach(function (shapeID) {
                const props = findPropsByShapeID(shapeID);
                applyOneProvinceOverride(shapeID, toISO, props ? props.shapeName : ch.region, props ? props.shapeType : 'ADM1');
            });
            // One summary line per whole-region change, not one per constituent
            // shape: findPropsByShapeID's fast path returns the merged/dissolved
            // region layer's properties for every shape inside it (the map
            // renders at whole-province granularity, not individual counties —
            // see world_map_webgl.html), so a per-shape name here is always just
            // the region's own name repeated once per county it contains. A
            // single line matches what the AI actually declared and avoids a
            // "23 identical Map Changes" list for one region-level transfer.
            applied.push({ shapeID: null, shapeName: ch.region, fromCountry: fromISO, toCountry: toISO, shapeCount: shapeIDs.length });

            if (ch.relationship && toISO !== fromISO) {
                setPolityRelationship(toISO, ch.relationship, fromISO || resolveCountryCode(ch.overlord));
            }
        });
        if (applied.length) rebuildCountryLayers();
        return applied;
    }

    // Applies a full-country annexation/merger — ALL of a country's currently-
    // held territory transfers to another country in one directive, e.g. "annex
    // all of Switzerland". Lets the AI declare this without enumerating every
    // one of the country's regions itself (unreliable for a country with many
    // subdivisions — a local model asked to annex all 26 Swiss cantons via
    // regionChanges will typically only produce one or two of them). Purely a
    // territorial transfer: for a puppet/vassal relationship with NO territory
    // moving, see applyDiplomaticChanges() instead — the two are deliberately
    // separate primitives, not combined here.
    function applyCountryChanges(changes) {
        const applied = [];
        (changes || []).forEach(function (ch) {
            if (!ch || !ch.country) return;
            const fromISO = resolveCountryCode(ch.country);
            if (!fromISO) return;
            const toISO = getOrCreateCountryCode(ch.toCountry);
            if (!toISO || toISO === fromISO) return;

            const shapeIDs = [];
            for (let i = 0; i < targetObject.geometries.length; i++) {
                const props = targetObject.geometries[i].properties;
                if (getEffectiveCountry(props.shapeID, props.shapeGroup) === fromISO) shapeIDs.push(props.shapeID);
            }
            if (!shapeIDs.length) return;

            shapeIDs.forEach(function (shapeID) { applyOneProvinceOverride(shapeID, toISO, ch.country, 'Country'); });
            // One summary line for the whole country, same reasoning as
            // applyRegionChanges() above — this can be thousands of shapes for
            // a large country. "All of X" (not just "X") so the Map Changes
            // list reads clearly instead of "Switzerland: Switzerland → Germany".
            applied.push({ shapeID: null, shapeName: 'All of ' + ch.country, fromCountry: fromISO, toCountry: toISO, shapeCount: shapeIDs.length });
        });
        if (applied.length) rebuildCountryLayers();
        return applied;
    }

    // Records/clears a whole-country puppet/vassal/protectorate/autonomous
    // relationship with NO territory changing hands — e.g. "Germany makes
    // Poland a puppet" while Poland keeps its own borders. Distinct from the
    // "relationship" field on regionChanges (which only fires as a side effect
    // of an actual region transferring/seceding); this is the primitive for a
    // pure status change on a country that already exists on the map exactly
    // as it stands. "independent" clears an existing relationship via
    // setPolityRelationship()'s own handling of that case; a missing/empty
    // relationship field is a no-op (setPolityRelationship requires a truthy
    // relationshipType).
    function applyDiplomaticChanges(changes) {
        (changes || []).forEach(function (dc) {
            if (!dc || !dc.country) return;
            const code = getOrCreateCountryCode(dc.country);
            if (!code) return;
            const overlordCode = dc.overlord ? resolveCountryCode(dc.overlord) : null;
            // A non-independent relationship with no resolvable overlord is
            // meaningless (a "vassal" of nobody) — a real response was
            // observed doing exactly this (relationship:"vassal", overlord
            // omitted). setPolityRelationship() itself doesn't validate this
            // (it's also called from the regionChanges path, where fromISO
            // is a safe implicit default), so guard it here instead of
            // silently storing a broken relationship.
            if (dc.relationship !== 'independent' && dc.relationship !== 'free' && !overlordCode) return;
            setPolityRelationship(code, dc.relationship, overlordCode);
        });
    }

    // Strips accents/diacritics for loose matching (e.g. "Aragon" vs "Aragón",
    // "Cataluna" vs "Cataluña") — worldRegions' region names come straight from
    // geoBoundaries' own-language ADM1 names, but players and the AI will often
    // use the plain-ASCII or English form instead.
    function stripDiacritics(s) {
        return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    // Looks up a region's shapeIDs within one specific country (worldRegions is
    // keyed by country code first, then by that country's own ADM1 region names
    // — see world_regions.json). Tries an exact case-insensitive match first,
    // then an accent-stripped match, then a substring match in either direction
    // (handles bilingual names like "Cataluña/Catalunya" matching a plain
    // "Catalunya" or "Cataluna"). Falls back to searching every country if no
    // country code was resolved (e.g. the AI only gave a region name), since a
    // region name is usually unambiguous even without its parent country.
    function findRegionShapeIDs(countryCode, regionName) {
        if (!worldRegions || !regionName) return null;
        const target = stripDiacritics(regionName).trim().toLowerCase();

        // world_regions.json's leaf value is {id, name_en, name_local, shapeIDs}
        // since the region-ID migration — this is a plain name-based lookup
        // (the AI names a region in prose, it has no reason to know or use the
        // numeric ID), so it stays name-only, just unwrapping .shapeIDs now.
        function shapeIDsOf(entry) { return entry ? (entry.shapeIDs || entry) : null; }
        function searchWithin(regions) {
            if (!regions) return null;
            for (const name in regions) {
                if (name.toLowerCase() === regionName.trim().toLowerCase()) return shapeIDsOf(regions[name]);
            }
            for (const name in regions) {
                const normalized = stripDiacritics(name).toLowerCase();
                if (normalized === target) return shapeIDsOf(regions[name]);
            }
            for (const name in regions) {
                const normalized = stripDiacritics(name).toLowerCase();
                if (normalized.includes(target) || target.includes(normalized)) return shapeIDsOf(regions[name]);
            }
            return null;
        }

        if (countryCode) {
            // A country WAS resolved — trust it. Falling through to the global
            // search below when this country simply has no region by this name
            // used to let a wrong-country name collision (e.g. Belgium's own
            // province "Luxemburg" vs. the separate country of Luxembourg) grab
            // an unrelated country's region instead of failing closed. If the AI
            // got the owning country wrong, that's a bad instruction, not a
            // reason to guess at a same-named region anywhere else in the world.
            return worldRegions[countryCode] ? searchWithin(worldRegions[countryCode]) : null;
        }
        // No country given at all — search everywhere (a region name like
        // "Aragon" or "Catalonia" is unlikely to collide).
        for (const code in worldRegions) {
            const found = searchWithin(worldRegions[code]);
            if (found) return found;
        }
        return null;
    }

    // Returns a country's known region/state/province (ADM1) names from
    // worldRegions, for inclusion in the AI prompt context so it can reference
    // real region names for regionChanges (secessions, puppet/protectorate
    // declarations, etc.) without inventing one.
    function getRegionNamesForCountry(iso3, limit) {
        if (!worldRegions || !worldRegions[iso3]) return [];
        const names = Object.keys(worldRegions[iso3]);
        return (limit && names.length > limit) ? names.slice(0, limit) : names;
    }

    // Records that one code is a puppet/protectorate/vassal of another — shown
    // on the Country Details panel (see renderCountryDetailPills()). Distinct
    // from provinceOwnerOverrides (which only tracks literal territory) since a
    // puppet keeps its own separate territory/color, just with a noted overlord.
    function setPolityRelationship(code, relationshipType, overlordCode) {
        if (!code || !relationshipType) return;
        if (!GameState.polityRelationships) GameState.polityRelationships = {};
        if (relationshipType === 'independent' || relationshipType === 'free') {
            delete GameState.polityRelationships[code];
            return;
        }
        GameState.polityRelationships[code] = { type: relationshipType, overlord: overlordCode || null };
    }
    function getPolityRelationship(code) {
        return (GameState.polityRelationships && GameState.polityRelationships[code]) || null;
    }

    // Human-readable one-line summary of a polity relationship, for display in
    // the Country Details panel's Status section (see openCountryDetailPanel).
    function getPolityRelationshipNote(code) {
        const rel = getPolityRelationship(code);
        if (!rel) return null;
        const overlordName = rel.overlord ? (countryLookup[rel.overlord] || rel.overlord) : 'another nation';
        const typeLabel = {
            puppet: 'a puppet state',
            protectorate: 'a protectorate',
            vassal: 'a vassal',
            autonomous: 'an autonomous region'
        }[rel.type] || ('a ' + rel.type);
        return countryLookup[code] + ' is ' + typeLabel + ' of ' + overlordName + '.';
    }

    // Records a country's current form of government, set by runJumpForward()
    // when the AI reports a regime-defining event (coup, revolution, restored
    // monarchy, declared republic, etc — see the "governmentChanges" field in
    // its system prompt). This is deliberately just a label + timestamp, not a
    // new flag image — see countryFlagOverrides in defaultGameState() for the
    // hook that lets a real alternate flag be attached later.
    function setGovernmentType(code, type, date) {
        if (!code || !type) return;
        if (!GameState.governmentTypes) GameState.governmentTypes = {};
        GameState.governmentTypes[code] = { type: type, since: date || GameState.currentDate };
    }
    function getGovernmentType(code) {
        return (GameState.governmentTypes && GameState.governmentTypes[code]) || null;
    }
    // Human-readable one-line summary for the Country Details panel, mirroring
    // getPolityRelationshipNote() above.
    function getGovernmentTypeNote(code) {
        const gov = getGovernmentType(code);
        if (!gov) return null;
        return (countryLookup[code] || code) + '’s current government: ' + gov.type +
            (gov.since ? ' (since ' + gov.since + ')' : '') + '.';
    }
    // Short tag for an alliance's status pill (e.g. "World Peace Corps" ->
    // "WPC") so a member's pill reads "WPC Founding Member"/"WPC Observer"
    // instead of just "Founding Member"/"Observer" with no indication of
    // WHICH alliance — the full name is still available via the pill's
    // title tooltip. Single-word names (an AI that names it "NATO" outright)
    // are used as-is rather than reduced to one letter; multi-word names
    // build an acronym from each significant word's first letter, skipping
    // minor connector words the way a real acronym would (e.g. "Union of
    // Free Nations" -> "UFN", not "UOFN").
    const ALLIANCE_ACRONYM_STOPWORDS = new Set(['of', 'the', 'and', 'for', 'in', 'on', 'a', 'an', 'to']);
    function allianceAcronym(name) {
        const words = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (words.length <= 1) return words[0] || '';
        const significant = words.filter(function (w) { return !ALLIANCE_ACRONYM_STOPWORDS.has(w.toLowerCase()); });
        const source = significant.length ? significant : words;
        return source.map(function (w) { return w[0].toUpperCase(); }).join('');
    }

    // Named alliances/blocs (World Peace Corps, CPPC, etc) — see
    // GameState.alliances in defaultGameState() for the shape. Matched by
    // case-insensitive name so the AI re-referencing "the WPC" later updates
    // the SAME alliance instead of creating a duplicate every time.
    function findAllianceByName(name) {
        if (!name) return null;
        const target = String(name).trim().toLowerCase();
        return (GameState.alliances || []).find(function (a) { return a.name.toLowerCase() === target; }) || null;
    }
    function getOrCreateAlliance(name) {
        const existing = findAllianceByName(name);
        if (existing) return existing;
        if (!GameState.alliances) GameState.alliances = [];
        const alliance = { name: String(name).trim(), leaderCode: null, members: {} };
        GameState.alliances.push(alliance);
        return alliance;
    }
    // Every alliance a country belongs to, with its rank in each — used by
    // renderCountryDetailStatusPills() and buildAllianceContextText().
    function getAlliancesForCountry(code) {
        if (!code) return [];
        // Include the leader even when it's not separately listed in
        // members — the AI naming a founding/leading nation doesn't imply it
        // also redundantly listed itself as a member (my own test data hit
        // exactly this: Germany as leaderCode but absent from members,
        // which silently dropped its pill entirely before this fix).
        return (GameState.alliances || [])
            .filter(function (a) {
                return (a.members && Object.prototype.hasOwnProperty.call(a.members, code)) || a.leaderCode === code;
            })
            .map(function (a) { return { alliance: a, rank: (a.members && a.members[code]) || null }; });
    }
    // Applies a batch of AI-declared alliance directives — see the
    // "allianceChanges" field in runJumpForward()'s system prompt. Member
    // countries are resolved via resolveCountryCode ONLY (never
    // getOrCreateCountryCode): an alliance member must be a real, already-
    // existing country — minting a brand-new "country" for something that's
    // actually just an organization is exactly the confusion this feature
    // exists to prevent (a local model asked to "create the World Peace
    // Corps" has no clean way to express that without this, and previously
    // had nothing better than misusing countryChanges/governmentChanges).
    function applyAllianceChanges(changes) {
        (changes || []).forEach(function (ch) {
            if (!ch || !ch.alliance) return;
            if (ch.disband) {
                const existing = findAllianceByName(ch.alliance);
                if (existing) GameState.alliances = GameState.alliances.filter(function (a) { return a !== existing; });
                return;
            }
            const alliance = getOrCreateAlliance(ch.alliance);
            if (ch.leader) {
                const leaderCode = resolveCountryCode(ch.leader);
                if (leaderCode) alliance.leaderCode = leaderCode;
            }
            if (Array.isArray(ch.members)) {
                ch.members.forEach(function (m) {
                    if (!m || !m.country) return;
                    const code = resolveCountryCode(m.country);
                    if (!code) return;
                    alliance.members[code] = (m.rank && String(m.rank).trim()) || 'Member';
                });
            }
            if (Array.isArray(ch.removeMembers)) {
                ch.removeMembers.forEach(function (name) {
                    const code = resolveCountryCode(name);
                    if (code) delete alliance.members[code];
                });
            }
        });
    }
    // Plain-text summary of every current alliance, injected into the
    // Advisor's system prompt (handleAdvisorAsk()) so "what alliances are
    // there?" is answered from real GameState.alliances data instead of the
    // model inventing/hallucinating one.
    function buildAllianceContextText() {
        if (!GameState.alliances || !GameState.alliances.length) return '';
        return GameState.alliances.map(function (a) {
            const leaderName = a.leaderCode ? (countryLookup[a.leaderCode] || a.leaderCode) : null;
            const memberLines = Object.keys(a.members).map(function (code) {
                return (countryLookup[code] || code) + ' (' + a.members[code] + ')';
            }).join(', ');
            return '- ' + a.name + (leaderName ? ' (led by ' + leaderName + ')' : '') + ': ' + (memberLines || 'no members yet');
        }).join('\n');
    }

    // Ground truth for the "flag" field on governmentChanges (see
    // runJumpForward()'s system prompt below) — every non-default historical
    // variant actually present under assets/flags/, sourced via
    // Scripts/fetch_flags_wikimedia.py's HISTORICAL list (keep both in sync;
    // see assets/flags/ATTRIBUTION.md for licensing per file). Injected
    // directly into the prompt so the AI picks from real, confirmed-existing
    // assets instead of guessing whether a path exists — it previously had
    // no way to know, and would either invent paths or omit "flag" out of
    // caution even when a real matching flag was on disk.
    const KNOWN_HISTORICAL_FLAGS = [
        ['AUH/1914.png', 'Austria-Hungary'],
        ['OTT/1914.png', 'the Ottoman Empire'],
        ['RAJ/1914.png', 'the British Raj'],
        ['MAR/1911.png', 'the pre-protectorate Sultanate of Morocco'],
        ['SOV/1939.png', 'the Soviet Union'],
        ['YUG/1939.png', 'the Kingdom of Yugoslavia'],
        ['DEU/1914.png', 'the German Empire (Kaiserreich)'],
        ['DEU/1939.png', 'Nazi Germany / the Third Reich'],
        ['MAN/1932.png', 'Manchukuo'],
        ['BOH/1939.png', 'the Protectorate of Bohemia and Moravia'],
        ['XJW/1934.png', "Sheng Shicai's Xinjiang"],
        ['NGM/1930.png', 'the Xibei San Ma (Ma family cliques)'],
        ['YNW/1927.png', 'the Yunnan Clique'],
        ['RUS/1914.png', 'Tsarist/Imperial Russia'],
        ['CHN/1911.png', 'the Qing Empire'],
        ['CHN/1912.png', 'the early Republic of China (five-colored flag)'],
        ['CHN/1928.png', "the Nationalist Republic of China (Blue Sky White Sun)"],
        ['ITA/1861.png', 'the Kingdom of Italy'],
        ['ESP/1875.png', 'the Kingdom of Spain (Restoration monarchy)'],
        ['ESP/1931.png', 'the Second Spanish Republic'],
        ['ESP/1938.png', 'Francoist/Nationalist Spain'],
        ['ROU/1881.png', 'the Kingdom of Romania'],
        ['SRB/1882.png', 'the Kingdom of Serbia'],
        ['HUN/1920.png', 'the Kingdom of Hungary (Horthy regency)'],
        ['SAU/1902.png', 'the Emirate of Nejd'],
        ['IRN/1907.png', 'Qajar Persia'],
        ['THA/1855.png', 'Siam'],
        ['TIB/1912.png', 'Tibet'],
        ['DZG/1920.png', 'the Free City of Danzig'],
        ['ZAF/1928.png', 'the Union of South Africa'],
    ];
    function buildKnownFlagsPromptText() {
        return KNOWN_HISTORICAL_FLAGS.map(function (pair) { return pair[0] + ' (' + pair[1] + ')'; }).join(', ');
    }
    // isValidFlagOverride() below only checks PATH FORMAT/safety (blocks a
    // CDN/remote-URL vector) — it has no way to know whether a well-formed
    // local path actually exists on disk. A real response was observed
    // inventing "FRN/1939.png" and "BEL/1934.png" despite the system prompt
    // listing the exact valid keys (small/local models don't reliably copy
    // them verbatim) — both are format-valid but 404 in the browser,
    // silently leaving a broken flag icon with no fallback. This checks the
    // bare "TAG/name.ext" key (before the "assets/flags/" prefix is added)
    // against what's actually known to exist: either an exact
    // KNOWN_HISTORICAL_FLAGS entry, or "<TAG>/default.png" for a TAG that's
    // a real resolvable country — every country has a default.png, so that
    // one case doesn't need enumerating. Used only to gate an AI-authored
    // governmentChanges.flag; a miss falls through to the same robust
    // automatic flag-matching chain already used when no flag is given at
    // all, rather than trusting an unverified path.
    function isKnownFlagAssetKey(key) {
        if (typeof key !== 'string') return false;
        if (KNOWN_HISTORICAL_FLAGS.some(function (pair) { return pair[0] === key; })) return true;
        const m = key.match(/^([A-Za-z0-9_-]+)\/default\.(png|jpg|jpeg|svg)$/i);
        return !!(m && countryLookup[m[1].toUpperCase()]);
    }
    // Only two shapes of flag override are accepted, both local/offline —
    // never a CDN or arbitrary remote URL. This file sits at the project
    // root (unlike Geo/game.js, one level down), so overrides here are bare
    // "assets/flags/TAG/name.ext" paths with no "../" prefix.
    //   1. "assets/flags/TAG/name.ext" — the LLM flag-swap key format (see
    //      the "flag" field on governmentChanges in runJumpForward()'s system
    //      prompt, and era_*.json's entities.<CODE>.flag).
    //   2. A data: URI — the in-browser-generated flags from
    //      buildTriggeredFlagDataUri()/maybeAssignTriggeredFlag() below.
    //   3. "assets/flags_community/REGION/CATEGORY/name.ext" (region + category subfolders) — the
    //      community-flag fallback from findBestCommunityFlagEntry()
    //      below.
    //   4. "assets/flags_subnational/name.ext" (flat) — the real US
    //      state/territory and European regional flags from
    //      findBestSubnationalFlagEntry() below.
    const LOCAL_FLAG_KEY_RE = /^assets\/flags\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|svg)$/i;
    const LOCAL_COMMUNITY_FLAG_KEY_RE = /^assets\/flags_community\/[a-z_]+\/[a-z_]+\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|svg)$/i;
    const LOCAL_SUBNATIONAL_FLAG_KEY_RE = /^assets\/flags_subnational\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|svg)$/i;
    function isValidFlagOverride(value) {
        return typeof value === 'string' && (LOCAL_FLAG_KEY_RE.test(value) || LOCAL_COMMUNITY_FLAG_KEY_RE.test(value) ||
            LOCAL_SUBNATIONAL_FLAG_KEY_RE.test(value) || value.slice(0, 5) === 'data:');
    }
    // Attaches an explicit flag image URL to a country, overriding the default
    // ISO3_TO_ISO2/SUBDIVISION_FLAGS-derived flag in buildFlagElement(). This is
    // the hook for manually- or AI-supplied alternate flags (e.g. a specific
    // revolutionary government's real historical flag, or an era preset's
    // entity flag). Anything that isn't a local assets/flags/ path or a data:
    // URI is rejected (logged, not applied) — this is the enforcement point
    // that keeps flag rendering strictly local/offline even when the value
    // originates from an AI response.
    // isAuto marks a flag as automatically assigned (assignDefaultFlagForNew
    // Country()/maybeAssignTriggeredFlag()) rather than deliberately chosen
    // (an AI-authored governmentChanges.flag) — see autoAssignedFlags in
    // defaultGameState(). An auto flag can still be replaced later by a more
    // specific automatic match; a deliberate one is never silently
    // overwritten by either automatic path.
    function setCountryFlagOverride(code, imageUrl, isAuto) {
        if (!code) return;
        if (!GameState.countryFlagOverrides) GameState.countryFlagOverrides = {};
        if (!GameState.autoAssignedFlags) GameState.autoAssignedFlags = {};
        if (imageUrl) {
            if (!isValidFlagOverride(imageUrl)) {
                console.warn('[flags] ignoring flag override for ' + code + ' — not a local assets/flags/ path or data URI:', imageUrl);
                return;
            }
            GameState.countryFlagOverrides[code] = imageUrl;
            if (isAuto) GameState.autoAssignedFlags[code] = true;
            else delete GameState.autoAssignedFlags[code];
        } else {
            delete GameState.countryFlagOverrides[code];
            delete GameState.autoAssignedFlags[code];
        }
    }
    // True if this code has no flag yet, or only an automatically-assigned
    // one that a more specific automatic match is free to replace.
    function hasOnlyAutoFlag(code) {
        if (!GameState.countryFlagOverrides || !GameState.countryFlagOverrides[code]) return true;
        return !!(GameState.autoAssignedFlags && GameState.autoAssignedFlags[code]);
    }

    // Auto-assign trigger table for brand-new custom/breakaway countries only
    // (never established real nations) — mirrors the design in
    // static/menu.js's FICTIONAL_FLAGS (kept as a separate, smaller copy here
    // since game.js and menu.js run on different pages/scopes and don't share
    // state directly). Every spec below is original geometry rendered
    // via the same buildFlagSVG-style renderer used in menu.js. Mirrored 1:1
    // from Map Painter 2's Geo/game.js — keep both in sync.
    const FICTIONAL_FLAG_TRIGGERS = [
        { govType: 'communist state', spec: { layout: 'horizontal', colors: ['#1c3f94', '#ffffff', '#a3252a'] } },
        { govType: 'military junta', spec: { layout: 'horizontal', colors: ['#2b2b2b', '#8a1f1f', '#2b2b2b'], symbol: 'star', symbolColor: '#e0b84a' } },
        { govType: 'revolutionary government', spec: { layout: 'vertical', colors: ['#1c3f94', '#ffffff', '#c0392b'] } },
        { govType: 'provisional government', spec: { layout: 'horizontal', colors: ['#4a4a4a', '#ffffff'] } }
    ];
    // Renders the same compact spec format as menu.js's buildFlagSVG(), then
    // encodes it as a data: URI so it can be dropped straight into
    // setCountryFlagOverride() / buildFlagElement() without any extra fetch.
    function buildTriggeredFlagDataUri(spec) {
        const W = 300, H = 200;
        let bg = '';
        if (spec.layout === 'horizontal') {
            const n = spec.colors.length, h = H / n;
            bg = spec.colors.map(function (c, i) { return '<rect x="0" y="' + (i * h) + '" width="' + W + '" height="' + h + '" fill="' + c + '"/>'; }).join('');
        } else if (spec.layout === 'vertical') {
            const n = spec.colors.length, w = W / n;
            bg = spec.colors.map(function (c, i) { return '<rect x="' + (i * w) + '" y="0" width="' + w + '" height="' + H + '" fill="' + c + '"/>'; }).join('');
        } else {
            bg = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + spec.colors[0] + '"/>';
        }
        let symbol = '';
        if (spec.symbol === 'star') {
            symbol = '<text x="' + (W / 2) + '" y="' + (H / 2 + 14) + '" font-size="46" text-anchor="middle" fill="' + (spec.symbolColor || '#fff') + '">★</text>';
        } else if (spec.symbol === 'circle') {
            symbol = '<circle cx="' + (W / 2) + '" cy="' + (H / 2) + '" r="' + (H * 0.22) + '" fill="' + (spec.symbolColor || '#fff') + '"/>';
        }
        const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' + bg + symbol + '</svg>';
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }
    // Only ever touches brand-new custom/breakaway countries (tracked in
    // GameState.customCountries) — established real nations always keep their
    // real flag. Also never overwrites a flag a country already has, so this
    // only fires once per country, on its first matching government change.
    function maybeAssignTriggeredFlag(code, govType) {
        if (!code || !govType) return;
        if (!GameState.customCountries || !GameState.customCountries[code]) return;
        if (!hasOnlyAutoFlag(code)) return;
        const trigger = FICTIONAL_FLAG_TRIGGERS.find(function (t) { return t.govType === govType; });
        if (!trigger) return;
        setCountryFlagOverride(code, buildTriggeredFlagDataUri(trigger.spec), true);
    }

    // Broader palette pool for assignDefaultFlagForNewCountry() below — used
    // for ANY brand-new custom/breakaway country regardless of government
    // type (most don't have one yet at the moment they're founded), unlike
    // FICTIONAL_FLAG_TRIGGERS above which only fires on a specific regime-
    // change type. Picked deterministically per country name (hashStringToIndex)
    // so the same name always gets the same flag and different new countries
    // visibly differ from each other, without needing any AI involvement.
    const GENERIC_FICTIONAL_FLAG_PALETTES = [
        { layout: 'horizontal', colors: ['#1c3f94', '#ffffff', '#a3252a'] },
        { layout: 'vertical', colors: ['#2e7d4f', '#ffffff', '#c0392b'] },
        { layout: 'horizontal', colors: ['#4a4a4a', '#e0b84a', '#4a4a4a'] },
        { layout: 'vertical', colors: ['#1c3f94', '#ffffff'] },
        { layout: 'horizontal', colors: ['#8a1f1f', '#ffffff', '#8a1f1f'], symbol: 'star', symbolColor: '#e0b84a' },
        { layout: 'vertical', colors: ['#2b2b2b', '#c0392b', '#2b2b2b'], symbol: 'circle', symbolColor: '#ffffff' },
        { layout: 'horizontal', colors: ['#0f6b5c', '#ffffff'] },
        { layout: 'vertical', colors: ['#5b3a8e', '#ffffff', '#5b3a8e'] },
        { layout: 'horizontal', colors: ['#c0392b', '#ffffff', '#1c3f94'], symbol: 'circle', symbolColor: '#ffffff' },
        { layout: 'vertical', colors: ['#e0b84a', '#2b2b2b'], symbol: 'star', symbolColor: '#ffffff' }
    ];
    function hashStringToIndex(s, mod) {
        let h = 0;
        for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
        return Math.abs(h) % mod;
    }
    // Rich per-flag metadata (Geo/flag_catalog.json — fetched into the
    // top-level `flagCatalog` bridge var by world_map_webgl.html's
    // loadMapData(), same pattern as worldRegions) — one entry per real
    // asset under assets/flags/<TAG>/<file>.png, with historical context,
    // years in use, layout, colors, symbols, aliases, and a disambiguation
    // note, following a consistent flag-description structure
    // (context -> adoption/years -> layout/colors -> symbols
    // -> notes -> aliases -> disambiguation). Assembling it here from
    // structured fields (rather than storing full prose per entry) keeps the
    // data file compact and lets findBestFlagEntry() below query on
    // yearFrom/yearTo directly.
    function buildFlagDescription(entry) {
        if (!entry) return '';
        const parts = [];
        if (entry.context) parts.push(entry.context);
        if (entry.adopted) parts.push(entry.adopted);
        const colorList = (entry.colors || []).join(', ');
        if (entry.layout) {
            parts.push('Its layout is a ' + entry.layout + (colorList ? ' in ' + colorList : '') +
                (entry.orientation ? ' (' + entry.orientation + ')' : '') + '.');
        }
        if (entry.symbols && entry.symbols.length) parts.push(entry.symbols.join(' '));
        if (entry.notes) parts.push(entry.notes);
        if (entry.aliases && entry.aliases.length) parts.push('Also known as ' + entry.aliases.join(', ') + '.');
        if (entry.disambiguation) parts.push(entry.disambiguation);
        return parts.join(' ');
    }
    function findFlagEntriesForCode(code) {
        return (flagCatalog || []).filter(function (e) { return e.tag === code; });
    }
    // Picks the historically-correct flag for a country at a given in-game
    // date — this is the actual "AI relies on the description to pull the
    // correct flag" behavior, just implemented as reliable date-range
    // matching in client code instead of asking a (possibly small/local)
    // model to browse hundreds of descriptions itself and name an exact
    // filename. `keywords` (e.g. a governmentChanges "type") only comes into
    // play to break a tie when more than one entry is valid for the same
    // year (rival flags during a civil war, say).
    function findBestFlagEntry(code, dateStr, keywords) {
        const entries = findFlagEntriesForCode(code);
        if (!entries.length) return null;
        const year = dateStr ? parseInt(String(dateStr).slice(0, 4), 10) : NaN;
        let candidates = entries;
        if (!isNaN(year)) {
            const inRange = entries.filter(function (e) {
                return (e.yearFrom == null || year >= e.yearFrom) && (e.yearTo == null || year <= e.yearTo);
            });
            if (inRange.length) candidates = inRange;
        }
        if (candidates.length === 1) return candidates[0];
        if (keywords && keywords.length) {
            const kw = keywords.filter(Boolean).map(function (k) { return String(k).toLowerCase(); });
            if (kw.length) {
                const scored = candidates.map(function (e) {
                    const text = (buildFlagDescription(e) + ' ' + (e.type || '') + ' ' + (e.polity || '')).toLowerCase();
                    const score = kw.reduce(function (acc, k) { return acc + (text.includes(k) ? 1 : 0); }, 0);
                    return { entry: e, score: score };
                }).sort(function (a, b) { return b.score - a.score; });
                if (scored[0].score > 0) return scored[0].entry;
            }
        }
        // No further disambiguation signal — prefer the country's plain
        // current flag if one of the candidates is it, else the most
        // recently-adopted candidate.
        const withDefault = candidates.find(function (e) { return e.file === 'default.png'; });
        if (withDefault) return withDefault;
        return candidates.slice().sort(function (a, b) { return (b.yearFrom || 0) - (a.yearFrom || 0); })[0];
    }

    // Fuzzy name match against KNOWN_HISTORICAL_FLAGS' real-flag labels (e.g.
    // "Yugoslavia" -> the "the Kingdom of Yugoslavia" / YUG/1939.png entry) —
    // kept as a fallback for a flagCatalog miss (e.g. before the catalog is
    // fully populated for a given tag), so a newly-formed historical nation
    // still gets SOME real flag immediately rather than only if the AI
    // separately remembers to specify one via governmentChanges.flag.
    function findKnownHistoricalFlag(name) {
        if (!name) return null;
        const target = String(name).trim().toLowerCase();
        if (!target) return null;
        const match = KNOWN_HISTORICAL_FLAGS.find(function (pair) { return pair[1].toLowerCase().includes(target); });
        return match ? match[0] : null;
    }

    // Shared by findBestSubnationalFlagEntry() and findBestCommunityFlagEntry()
    // below: matches a brand-new custom/fictional country's declared name
    // against a {name, ...}[] catalog by, in order: (1) normalized-exact
    // match, (2) the catalog entry's full name appearing verbatim as a
    // wrapped phrase in the target (e.g. target "Republic of California"
    // contains entry "California" whole — the single most likely AI-
    // generated naming pattern for a newly-independent single-word-named
    // region, so this has to work even for a 1-token entry name), (3) loose
    // token overlap (>=2 shared words, >=60% coverage of the longer side,
    // for multi-word entries not fully contained either way). Tiebreak
    // scores higher entries by rank (e.g. netLikes) when the caller supplies
    // one — a weak/ambiguous match returns null rather than guessing, since
    // a wrong flag is worse than falling through to the next tier.
    const NAME_MATCH_STOPWORDS = ['the', 'of', 'and', 'a', 'an', 'for', 'in'];
    function tokenizeForNameMatch(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(function (w) { return w && NAME_MATCH_STOPWORDS.indexOf(w) === -1; });
    }
    function findBestNameMatch(catalog, name, rankField) {
        if (!name || !catalog || !catalog.length) return null;
        const targetTokens = tokenizeForNameMatch(name);
        if (!targetTokens.length) return null;
        const targetSet = {};
        targetTokens.forEach(function (t) { targetSet[t] = true; });
        const normalizedTarget = targetTokens.join(' ');
        let best = null, bestScore = 0;
        catalog.forEach(function (e) {
            const entryTokens = tokenizeForNameMatch(e.name);
            if (!entryTokens.length) return;
            let score = 0;
            if (entryTokens.join(' ') === normalizedTarget) {
                score = 100;
            } else {
                const shared = entryTokens.filter(function (t) { return targetSet[t]; }).length;
                const entryFullyContained = shared === entryTokens.length;
                if (entryFullyContained) {
                    score = 10 + entryTokens.length;
                } else {
                    const coverage = shared / Math.max(targetTokens.length, entryTokens.length);
                    if (shared >= 2 && coverage >= 0.6) score = shared + coverage;
                }
            }
            if (score > 0 && (score > bestScore || (score === bestScore && best && rankField && (e[rankField] || 0) > (best[rankField] || 0)))) {
                bestScore = score;
                best = e;
            }
        });
        return best;
    }
    // Real official/traditional flags for US states+territories and a
    // curated set of European regions (see Scripts/fetch_flags_subnational.py
    // and Geo/flag_catalog_subnational.json) — checked BEFORE
    // findBestCommunityFlagEntry() below since these are authoritative real flags,
    // not fan art, so they should win a name collision (e.g. a newly
    // independent "Bavaria" gets the real Bavarian flag, not a coincidental
    // community submission also named "Bavaria").
    function findBestSubnationalFlagEntry(name) {
        return findBestNameMatch(subnationalFlagCatalog, name);
    }
    // Fallback tier below findBestSubnationalFlagEntry(): matches a brand-new
    // custom/fictional country's declared name against the user-submitted
    // community flag gallery fetched into Geo/flag_catalog_mappainter1.json
    // — individually-authored fan flags, not public domain (sources listed
    // in assets/flags_community/ATTRIBUTION.md), kept in their own
    // assets/flags_community/ folder and catalog, fetched for personal/
    // hobby use per explicit project-owner decision (2026-08-24).
    function findBestCommunityFlagEntry(name) {
        return findBestNameMatch(communityFlagCatalog, name, 'netLikes');
    }
    // Called the instant getOrCreateCountryCode() mints a brand-new country
    // (unification, secession, puppet creation, alliance-founded state,
    // etc.) so it never sits flagless/badge-only waiting for a separate
    // governmentChanges event that may never come. Prefers a real historical
    // flag if the declared name matches one, then a real US-state/European-
    // region flag, then a community flag by name match, then
    // finally a deterministic generated flag from
    // GENERIC_FICTIONAL_FLAG_PALETTES. Never overwrites an existing
    // deliberate flag (see hasOnlyAutoFlag/setCountryFlagOverride).
    function assignDefaultFlagForNewCountry(code, name) {
        if (!code || !hasOnlyAutoFlag(code)) return;
        const catalogEntry = findBestFlagEntry(code, GameState.currentDate);
        if (catalogEntry) {
            setCountryFlagOverride(code, 'assets/flags/' + code + '/' + catalogEntry.file, true);
            return;
        }
        const historicalKey = findKnownHistoricalFlag(name);
        if (historicalKey) {
            setCountryFlagOverride(code, 'assets/flags/' + historicalKey, true);
            return;
        }
        const subnationalEntry = findBestSubnationalFlagEntry(name);
        if (subnationalEntry) {
            setCountryFlagOverride(code, 'assets/flags_subnational/' + subnationalEntry.file, true);
            return;
        }
        const communityEntry = findBestCommunityFlagEntry(name);
        if (communityEntry) {
            setCountryFlagOverride(code, 'assets/flags_community/' + communityEntry.file, true);
            return;
        }
        const palette = GENERIC_FICTIONAL_FLAG_PALETTES[hashStringToIndex(String(name || code), GENERIC_FICTIONAL_FLAG_PALETTES.length)];
        setCountryFlagOverride(code, buildTriggeredFlagDataUri(palette), true);
    }

    // Small helper to get a shape's {shapeName, shapeType} back out by shapeID,
    // since applyRegionChanges works from bare shapeIDs (out of worldRegions)
    // rather than already-found feature matches. provinceLayerById is already an
    // O(1) shapeID->layer index (built once in onEachMunicipality) and the map
    // engine keeps the original GeoJSON feature on layer.feature, so this avoids
    // a linear scan over all ~49k shapes for every one of a state's ~30-250
    // counties — falls back to the slower scan only if a layer somehow isn't
    // found (e.g. called before the map finished rendering).
    function findPropsByShapeID(shapeID) {
        const layer = provinceLayerById[shapeID];
        if (layer && layer.feature && layer.feature.properties) return layer.feature.properties;
        if (!targetObject) return null;
        for (let i = 0; i < targetObject.geometries.length; i++) {
            if (targetObject.geometries[i].properties.shapeID === shapeID) return targetObject.geometries[i].properties;
        }
        return null;
    }

    // ---- Date helpers ---------------------------------------------------------
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    function formatDateLong(isoDate) {
        const d = new Date(isoDate + 'T00:00:00Z');
        return MONTH_NAMES[d.getUTCMonth()] + ' ' + ordinal(d.getUTCDate()) + ', ' + d.getUTCFullYear();
    }
    function formatDateShort(isoDate) {
        const d = new Date(isoDate + 'T00:00:00Z');
        return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear();
    }
    function addToDate(isoDate, amount, unit) {
        const d = new Date(isoDate + 'T00:00:00Z');
        if (unit === 'days') d.setUTCDate(d.getUTCDate() + amount);
        else if (unit === 'months') d.setUTCMonth(d.getUTCMonth() + amount);
        else if (unit === 'years') d.setUTCFullYear(d.getUTCFullYear() + amount);
        return d.toISOString().slice(0, 10);
    }

    // ==========================================================================
    // UI: panel open/close plumbing — the four corner panels (Actions, Advisor,
    // Search, Chat) are mutually exclusive; opening one closes the others.
    // ==========================================================================
    // Actions, Advisor, Search, and Chat (plus Country Details) are independent
    // floating panels that can all be open at the same time — see the CSS
    // positions for #actions-panel/#advisor-panel/#search-panel/#chat-panel/
    // #country-detail-panel, which are laid out side-by-side (right-anchored
    // cluster: actions, search, advisor; left-anchored cluster: chat, country
    // details) specifically so they don't overlap when several are visible at
    // once. closeAllPanels() is kept only for cases that genuinely want to
    // clear everything (e.g. none currently call it that way, but it's left
    // available); ordinary panel toggling/opening no longer closes the others.
    const PANEL_IDS = ['actions-panel', 'advisor-panel', 'search-panel', 'chat-panel', 'country-detail-panel'];
    function closeAllPanels(except) {
        PANEL_IDS.forEach(function (id) {
            if (id === except) return;
            const el = document.getElementById(id);
            if (el) el.classList.remove('open');
        });
    }
    // Toggles a single panel open/closed without affecting any other panel.
    // Used by each corner launcher button (Actions/Advisor/Search/Chat), which
    // should each independently show/hide only their own panel.
    function togglePanel(panelId, launcherId) {
        const panel = document.getElementById(panelId);
        const launcher = document.getElementById(launcherId);
        const willOpen = !panel.classList.contains('open');
        panel.classList.toggle('open', willOpen);
        if (launcher) launcher.classList.toggle('active', willOpen);
    }
    // Forces a single panel open (never closes it if already open) without
    // affecting any other panel. Used by programmatic "jump to this panel"
    // actions (e.g. Country Details' Advisor Report / Open Diplomacy buttons)
    // where the intent is always "show this," not "toggle this."
    function openPanel(panelId, launcherId) {
        const panel = document.getElementById(panelId);
        const launcher = document.getElementById(launcherId);
        panel.classList.add('open');
        if (launcher) launcher.classList.add('active');
    }

    // ==========================================================================
    // Actions panel
    // ==========================================================================
    let brainstormIdeas = [];

    function renderPendingActions() {
        const list = document.getElementById('pending-actions-list');
        const empty = document.getElementById('pending-actions-empty');
        list.innerHTML = '';
        if (GameState.pendingActions.length === 0) {
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        GameState.pendingActions.forEach(function (action) {
            const row = document.createElement('div');
            row.className = 'pending-action-row';
            const text = document.createElement('div');
            text.className = 'pa-text';
            text.textContent = action.text;
            const remove = document.createElement('div');
            remove.className = 'pa-remove';
            remove.textContent = '✕';
            remove.title = 'Remove this action';
            remove.addEventListener('click', function () {
                GameState.pendingActions = GameState.pendingActions.filter(function (a) { return a.id !== action.id; });
                saveGameState();
                renderPendingActions();
            });
            row.appendChild(text);
            row.appendChild(remove);
            list.appendChild(row);
        });
    }

    // Read-only record of what was actually submitted each already-resolved
    // round — GameState.pendingActions itself is wiped by finalizeEventReveal()
    // once a round commits, so without this a player has no way to see what
    // they ordered last round vs. what actually happened. Sourced from
    // GameState.history[i].actionsSubmitted (captured at finalize time, see
    // finalizeEventReveal()); most recent round first, capped to the last 10
    // rounds that had any actions (a long game's full log is still available
    // via Events, this is just quick recent-turn context).
    function renderPreviousActions() {
        const list = document.getElementById('previous-actions-list');
        const empty = document.getElementById('previous-actions-empty');
        list.innerHTML = '';
        const roundsWithActions = (GameState.history || [])
            .filter(function (r) { return r.actionsSubmitted && r.actionsSubmitted.length; })
            .slice(-10)
            .reverse();
        if (!roundsWithActions.length) {
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        roundsWithActions.forEach(function (r) {
            const block = document.createElement('div');
            block.className = 'previous-action-round';
            const meta = document.createElement('div');
            meta.className = 'par-meta';
            meta.textContent = 'Round ' + r.round + ' — ' + formatDateShort(r.fromDate);
            block.appendChild(meta);
            r.actionsSubmitted.forEach(function (text) {
                const line = document.createElement('div');
                line.className = 'pa-text';
                line.textContent = text;
                block.appendChild(line);
            });
            list.appendChild(block);
        });
    }

    function renderBrainstormChips() {
        const wrap = document.getElementById('brainstorm-chips');
        wrap.innerHTML = '';
        brainstormIdeas.forEach(function (idea) {
            const chip = document.createElement('span');
            chip.className = 'brainstorm-chip';
            chip.textContent = idea;
            chip.addEventListener('click', function () {
                document.getElementById('action-input').value = idea;
            });
            wrap.appendChild(chip);
        });
    }

    async function handleAddAction() {
        const input = document.getElementById('action-input');
        const text = input.value.trim();
        if (!text) return;
        GameState.pendingActions.push({ id: 'act-' + Date.now(), text: text });
        saveGameState();
        input.value = '';
        renderPendingActions();
    }

    async function handleEnhanceAction() {
        const input = document.getElementById('action-input');
        const status = document.getElementById('actions-status');
        const text = input.value.trim();
        if (!text) return;
        status.textContent = 'Enhancing…';
        try {
            const playerName = GameState.playerCountry ? (countryLookup[GameState.playerCountry] || GameState.playerCountry) : 'the player nation';
            const result = await callAI(
                'You are a writing assistant for a grand-strategy geopolitical role-play game. ' +
                'The player controls ' + playerName + '. Rewrite their drafted action into a clearer, ' +
                'more vivid, specific action of similar length and scope. Do not add new unrelated intentions ' +
                'or drastically change what they asked for. Respond with ONLY the rewritten action text, no quotes, no preamble.' +
                (GameState.worldBefore ? ('\n\nThe World Before this game\'s start date:\n' + GameState.worldBefore) : '') +
                (GameState.simulationRules ? ('\n\nThis game\'s simulation rules:\n' + GameState.simulationRules) : '') +
                (((GameState.promptOverrides || {}).enhanceAction) ? ('\n\nAdditional instructions:\n' + GameState.promptOverrides.enhanceAction) : ''),
                text
            );
            if (result) input.value = result.trim();
            status.textContent = '';
        } catch (e) {
            status.textContent = 'Enhance failed: ' + e.message;
        }
    }

    async function handleBrainstorm() {
        const status = document.getElementById('actions-status');
        status.textContent = 'Brainstorming…';
        try {
            const playerName = GameState.playerCountry ? (countryLookup[GameState.playerCountry] || GameState.playerCountry) : 'the player nation';
            const recentHistory = summarizeRecentHistory(2);
            const result = await callAI(
                'You are a strategy-game brainstorming assistant. The player controls ' + playerName + ' on ' +
                formatDateLong(GameState.currentDate) + '. Suggest 5 distinct, concrete actions they could take ' +
                'this turn (military, diplomatic, economic, or domestic). Respond with ONLY a JSON array of 5 short strings, nothing else.' +
                (recentHistory ? ('\n\nRecent history for context:\n' + recentHistory) : '') +
                (((GameState.promptOverrides || {}).actions) ? ('\n\nAdditional instructions:\n' + GameState.promptOverrides.actions) : ''),
                'Give me action ideas.'
            );
            const parsed = extractJSON(result) || tryParseJSONArray(result);
            if (Array.isArray(parsed)) {
                brainstormIdeas = parsed.slice(0, 6).map(String);
            } else {
                brainstormIdeas = String(result).split('\n').filter(Boolean).slice(0, 6);
            }
            renderBrainstormChips();
            status.textContent = '';
        } catch (e) {
            status.textContent = 'Brainstorm failed: ' + e.message;
        }
    }

    function tryParseJSONArray(text) {
        if (!text) return null;
        const first = text.indexOf('[');
        const last = text.lastIndexOf(']');
        if (first >= 0 && last > first) {
            try { return JSON.parse(text.slice(first, last + 1)); } catch (e) { return null; }
        }
        return null;
    }

    function summarizeRecentHistory(n) {
        const recent = GameState.history.slice(-n);
        const recentText = recent.length ? recent.map(function (round) {
            return 'Round ' + round.round + ' (' + round.fromDate + ' → ' + round.toDate + '): ' +
                round.events.map(function (e) { return e.headline; }).join('; ');
        }).join('\n') : '';
        // Prepend any AI-generated consolidated summaries of older rounds (see
        // maybeConsolidateHistory()) so long-past events aren't simply forgotten
        // once they age out of the raw "recent" window above — this is what
        // gives long games continuity without feeding the full event log.
        const consolidations = (GameState.historyConsolidations || []).map(function (c) {
            return 'Rounds ' + c.fromRound + '-' + c.toRound + ' (' + c.fromDate + ' → ' + c.toDate + ') summary: ' + c.summary;
        }).join('\n');
        return [consolidations, recentText].filter(Boolean).join('\n\n');
    }

    // ==========================================================================
    // Event-history consolidator: instead
    // of every past round's full event log getting fed to the simulation AI
    // forever (which would make the prompt grow without bound in long games and
    // degrade AI quality), old rounds get periodically compressed into one short
    // AI-written paragraph. Runs in fixed, non-overlapping chunks of
    // config.chunkSize rounds, starting once GameState.round passes
    // config.startRound — e.g. with the defaults (15 / 5): rounds 1-5 get
    // consolidated once round 15 is reached, rounds 6-10 once round 20 is
    // reached, and so on. The raw rounds are left alone in GameState.history
    // (still fully visible in the Event Manager) — only what's fed to the
    // simulation/advisor/action-brainstorm AI via summarizeRecentHistory() above
    // is affected.
    // ==========================================================================
    function maybeConsolidateHistory() {
        const cfg = loadConsolidatorConfig();
        if (!cfg.enabled) return Promise.resolve();
        if (GameState.round < cfg.startRound) return Promise.resolve();

        const chunksExpected = Math.floor((GameState.round - cfg.startRound) / cfg.chunkSize) + 1;
        const chunksDone = (GameState.historyConsolidations || []).length;
        if (chunksDone >= chunksExpected) return Promise.resolve();

        const chunkIndex = chunksDone; // 0-based — which chunk to build next
        const fromRound = chunkIndex * cfg.chunkSize + 1;
        const toRound = fromRound + cfg.chunkSize - 1;
        const roundsToConsolidate = GameState.history.filter(function (r) { return r.round >= fromRound && r.round <= toRound; });
        if (!roundsToConsolidate.length) return Promise.resolve();

        const eventText = roundsToConsolidate.map(function (r) {
            return 'Round ' + r.round + ' (' + r.fromDate + ' → ' + r.toDate + '):\n' +
                r.events.map(function (e) { return '- ' + e.headline + ': ' + e.body; }).join('\n');
        }).join('\n\n');

        const systemPrompt =
            'Summarize the following grand-strategy game history into ONE short paragraph (4-8 sentences), ' +
            'plain narrative prose, no lists or headers. Keep only major, lasting developments — territorial ' +
            'changes, new alliances or governments, wars started or ended — and skip minor/flavor details.' +
            (((GameState.promptOverrides || {}).consolidator) ? ('\n\nAdditional instructions:\n' + GameState.promptOverrides.consolidator) : '');

        // Fire-and-forget from the caller's perspective (runJumpForward doesn't
        // await this) — a failed consolidation just means this chunk gets
        // retried on the next Jump Forward, it never blocks or breaks gameplay.
        return callAI(systemPrompt, eventText, { maxTokens: 512 }).then(function (summary) {
            if (!GameState.historyConsolidations) GameState.historyConsolidations = [];
            GameState.historyConsolidations.push({
                fromRound: fromRound,
                toRound: toRound,
                fromDate: roundsToConsolidate[0].fromDate,
                toDate: roundsToConsolidate[roundsToConsolidate.length - 1].toDate,
                summary: (summary || '').trim()
            });
            saveGameState();
        }).catch(function (e) {
            console.warn('History consolidation failed (will retry on next Jump Forward):', e);
        });
    }

    function initActionsPanel() {
        renderPendingActions();
        renderPreviousActions();
        document.getElementById('actions-launcher').addEventListener('click', function () { togglePanel('actions-panel', 'actions-launcher'); });
        document.getElementById('actions-close').addEventListener('click', function () { document.getElementById('actions-panel').classList.remove('open'); document.getElementById('actions-launcher').classList.remove('active'); });
        document.getElementById('action-add-btn').addEventListener('click', handleAddAction);
        document.getElementById('action-enhance-btn').addEventListener('click', handleEnhanceAction);
        document.getElementById('action-brainstorm-btn').addEventListener('click', handleBrainstorm);
        document.getElementById('action-brainstorm-clear-btn').addEventListener('click', function () {
            brainstormIdeas = [];
            renderBrainstormChips();
        });
    }

    // ==========================================================================
    // Rich text rendering — a small markdown-lite subset ("## "/"### " headers,
    // "**bold**", "- " bullet lists) for Advisor/Lore prose, plus an optional
    // fenced ```mapdata``` JSON block the Advisor's system prompt invites the AI
    // to emit for illustrative country-highlight map snapshots. Everything here
    // builds real DOM nodes via textContent/createElement — never innerHTML of
    // raw AI text — so AI-authored prose can never inject markup. The one
    // exception is the generated SVG snapshot itself, which is assembled by
    // buildCountrySnapshotSVG() (world_map_webgl.html, shared script scope) purely
    // from pre-validated hex colors and known country codes, never from raw text.
    // ==========================================================================
    const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

    // Splits an AI reply into { text, mapConfig }. mapConfig is null unless a
    // fenced block was present AND validated (unknown country codes, malformed
    // colors, or an empty result are all treated as "no map"). The fence's
    // language tag is optional and, if present, not required to say
    // "mapdata" — smaller/local models reliably emit the JSON itself per the
    // system prompt's example but very inconsistently copy the exact
    // "```mapdata" tag verbatim, instead defaulting to a bare ``` or the far
    // more common ```json. A stray unrelated fence is harmless here: it just
    // fails the JSON.parse/shape validation below and falls back to plain
    // text, same as no fence at all.
    // Safety net for a weak model that ignores the "never mention mapdata in
    // prose" instruction (see the Advisor's system prompt) and narrates its own
    // decision instead of silently including/omitting the fenced block — e.g.
    // a stray line like "Mapdata (no map will be shown)" with no real fence at
    // all. Strips any line that mentions the word regardless of whether a real
    // map ends up rendering, since it's never meant to be player-visible text.
    function stripStrayMapdataMentions(text) {
        return (text || '').split('\n').filter(function (line) { return !/\bmapdata\b/i.test(line); }).join('\n').trim();
    }

    function parseMapSnapshotBlock(rawText) {
        const match = /```(?:mapdata|json)?\s*([\s\S]*?)```/i.exec(rawText || '');
        if (!match) return { text: stripStrayMapdataMentions(rawText), mapConfig: null };
        const textWithoutBlock = stripStrayMapdataMentions((rawText || '').slice(0, match.index) + (rawText || '').slice(match.index + match[0].length));
        let parsed = null;
        try { parsed = JSON.parse(match[1]); } catch (e) { return { text: textWithoutBlock, mapConfig: null }; }
        if (!parsed || typeof parsed !== 'object') return { text: textWithoutBlock, mapConfig: null };

        const legend = Array.isArray(parsed.legend) ? parsed.legend
            .filter(function (l) { return l && typeof l.label === 'string' && HEX_COLOR_RE.test(l.color || ''); })
            .slice(0, 8)
            .map(function (l) { return { label: String(l.label).slice(0, 40), color: l.color }; }) : [];

        const countries = Array.isArray(parsed.countries) ? parsed.countries
            .map(function (c) {
                if (!c || !c.code) return null;
                const code = resolveCountryCode(c.code) || String(c.code).trim().toUpperCase();
                if (!countryLookup[code]) return null;
                let color = null;
                if (typeof c.categoryIndex === 'number' && legend[c.categoryIndex]) color = legend[c.categoryIndex].color;
                else if (HEX_COLOR_RE.test(c.color || '')) color = c.color;
                if (!color) return null;
                return { code: code, color: color };
            })
            .filter(Boolean)
            .slice(0, 60) : [];

        if (!countries.length) return { text: textWithoutBlock, mapConfig: null };

        return {
            text: textWithoutBlock,
            mapConfig: {
                title: typeof parsed.title === 'string' ? parsed.title.slice(0, 80) : '',
                caption: typeof parsed.caption === 'string' ? parsed.caption.slice(0, 140) : '',
                legend: legend,
                countries: countries
            }
        };
    }

    // Inline-level: turns "**bold**" spans into <strong> text nodes; everything
    // else is appended as plain text nodes.
    function appendInlineRich(parent, line) {
        const re = /\*\*(.+?)\*\*/g;
        let last = 0, m;
        while ((m = re.exec(line))) {
            if (m.index > last) parent.appendChild(document.createTextNode(line.slice(last, m.index)));
            const strong = document.createElement('strong');
            strong.textContent = m[1];
            parent.appendChild(strong);
            last = re.lastIndex;
        }
        if (last < line.length) parent.appendChild(document.createTextNode(line.slice(last)));
    }

    // Block-level: "## "/"### " headers, "**bold**", "- "/"* " bullet lists,
    // blank-line-separated paragraphs (single newlines within a paragraph become
    // <br>). Appends directly into `container`.
    function renderRichProse(container, text) {
        const lines = (text || '').split('\n');
        let listEl = null;
        let paraLines = [];

        function flushPara() {
            if (!paraLines.length) return;
            const p = document.createElement('p');
            paraLines.forEach(function (l, i) {
                if (i > 0) p.appendChild(document.createElement('br'));
                appendInlineRich(p, l);
            });
            container.appendChild(p);
            paraLines = [];
        }

        lines.forEach(function (line) {
            const trimmed = line.trim();
            if (!trimmed) { flushPara(); listEl = null; return; }
            if (/^###\s+/.test(trimmed)) {
                flushPara(); listEl = null;
                const h = document.createElement('h4');
                appendInlineRich(h, trimmed.replace(/^###\s+/, ''));
                container.appendChild(h);
                return;
            }
            if (/^##\s+/.test(trimmed)) {
                flushPara(); listEl = null;
                const h = document.createElement('h3');
                appendInlineRich(h, trimmed.replace(/^##\s+/, ''));
                container.appendChild(h);
                return;
            }
            if (/^[-*]\s+/.test(trimmed)) {
                flushPara();
                if (!listEl) { listEl = document.createElement('ul'); container.appendChild(listEl); }
                const li = document.createElement('li');
                appendInlineRich(li, trimmed.replace(/^[-*]\s+/, ''));
                listEl.appendChild(li);
                return;
            }
            listEl = null;
            paraLines.push(trimmed);
        });
        flushPara();
    }

    // Lightweight pointer-drag-to-pan + wheel-to-zoom for an embedded map
    // snapshot's <svg viewBox>. All listeners are scoped to svgHost itself
    // (pointer capture, not window-level) so they're garbage-collected with
    // the element instead of leaking across a long chat/advisor history.
    // resetBtn restores the auto-fit crop buildCountrySnapshotSVG() computed
    // (stashed on the <svg> as data-crop-viewbox); zooming out is clamped to
    // data-full-viewbox (the whole world) so it can't be panned/zoomed into
    // nonsense past the map's actual bounds.
    function wireMapSnapshotInteractivity(svgHost, resetBtn) {
        const svg = svgHost.querySelector('svg');
        if (!svg) return;
        function parseVB(str) { return (str || '').trim().split(/\s+/).map(Number); }
        const fullVB = parseVB(svg.getAttribute('data-full-viewbox')) || [0, 0, 360, 180];
        const cropVB = parseVB(svg.getAttribute('data-crop-viewbox')) || fullVB;
        let vb = cropVB.slice();
        function setVB() { svg.setAttribute('viewBox', vb.join(' ')); }

        svgHost.addEventListener('wheel', function (e) {
            e.preventDefault();
            const rect = svg.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width;
            const py = (e.clientY - rect.top) / rect.height;
            const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
            const newW = Math.min(fullVB[2], Math.max(vb[2] * factor, fullVB[2] / 60));
            const newH = newW * (vb[3] / vb[2]);
            const cx = vb[0] + vb[2] * px, cy = vb[1] + vb[3] * py;
            vb = [cx - newW * px, cy - newH * py, newW, newH];
            setVB();
        }, { passive: false });

        let dragging = false, lastX = 0, lastY = 0;
        svgHost.addEventListener('pointerdown', function (e) {
            dragging = true; lastX = e.clientX; lastY = e.clientY;
            svgHost.classList.add('dragging');
            svgHost.setPointerCapture(e.pointerId);
        });
        svgHost.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            const rect = svg.getBoundingClientRect();
            vb = [vb[0] - (e.clientX - lastX) / rect.width * vb[2], vb[1] - (e.clientY - lastY) / rect.height * vb[3], vb[2], vb[3]];
            setVB();
            lastX = e.clientX; lastY = e.clientY;
        });
        function endDrag() { dragging = false; svgHost.classList.remove('dragging'); }
        svgHost.addEventListener('pointerup', endDrag);
        svgHost.addEventListener('pointercancel', endDrag);

        if (resetBtn) resetBtn.addEventListener('click', function () { vb = cropVB.slice(); setVB(); });
    }

    // Builds the title + SVG + legend + caption embed block from a validated
    // mapConfig (see parseMapSnapshotBlock). Returns null if the map hasn't
    // loaded yet (buildCountrySnapshotSVG unavailable or has no geometry cached).
    function renderMapSnapshotEmbed(mapConfig) {
        if (typeof buildCountrySnapshotSVG !== 'function') return null;
        const svgMarkup = buildCountrySnapshotSVG({ countries: mapConfig.countries });
        if (!svgMarkup) return null;
        const wrap = document.createElement('div');
        wrap.className = 'advisor-map-snapshot';
        const titleRow = document.createElement('div');
        titleRow.className = 'advisor-map-snapshot-title';
        const titleText = document.createElement('span');
        titleText.textContent = mapConfig.title || 'Map';
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'advisor-map-snapshot-reset-btn';
        resetBtn.textContent = '⤢ Reset View';
        resetBtn.title = 'Scroll to zoom, drag to pan';
        titleRow.appendChild(titleText);
        titleRow.appendChild(resetBtn);
        wrap.appendChild(titleRow);
        const svgHost = document.createElement('div');
        svgHost.className = 'advisor-map-snapshot-svg-host';
        // Generated internally from pre-validated hex colors + known country
        // codes only (see parseMapSnapshotBlock) — never from raw AI text.
        svgHost.innerHTML = svgMarkup;
        wrap.appendChild(svgHost);
        wireMapSnapshotInteractivity(svgHost, resetBtn);
        if (mapConfig.legend.length) {
            const legendRow = document.createElement('div');
            legendRow.className = 'advisor-map-legend';
            mapConfig.legend.forEach(function (l) {
                const item = document.createElement('div');
                item.className = 'advisor-map-legend-item';
                const sw = document.createElement('span');
                sw.className = 'advisor-map-legend-swatch';
                sw.style.background = l.color;
                const label = document.createElement('span');
                label.textContent = l.label;
                item.appendChild(sw);
                item.appendChild(label);
                legendRow.appendChild(item);
            });
            wrap.appendChild(legendRow);
        }
        if (mapConfig.caption) {
            const cap = document.createElement('div');
            cap.className = 'advisor-map-snapshot-caption';
            cap.textContent = mapConfig.caption;
            wrap.appendChild(cap);
        }
        return wrap;
    }

    // Full render of one advisor/lore message body: optional map snapshot first,
    // then markdown-lite prose underneath.
    function renderRichMessageBody(bodyEl, rawText) {
        bodyEl.innerHTML = '';
        bodyEl.classList.add('rich-text');
        const parsed = parseMapSnapshotBlock(rawText || '');
        if (parsed.mapConfig) {
            const embed = renderMapSnapshotEmbed(parsed.mapConfig);
            if (embed) bodyEl.appendChild(embed);
        }
        renderRichProse(bodyEl, parsed.text);
    }

    // ==========================================================================
    // Advisor panel
    // ==========================================================================
    const ADVISOR_SUGGESTIONS = [
        { label: 'Game summary', prompt: 'Give me a concise summary of the current state of the game: my nation\'s standing, recent history, and the broader geopolitical situation.' },
        { label: 'Strategic advice', prompt: 'What should my top strategic priority be right now, and why?' },
        { label: 'Threats & opportunities', prompt: 'What are the biggest threats and opportunities facing my nation right now?' }
    ];

    function renderAdvisorMessages() {
        const wrap = document.getElementById('advisor-messages');
        if (GameState.advisorMessages.length === 0) {
            wrap.innerHTML = '<div class="empty-hint">Ask your advisor for guidance on foreign policy, domestic affairs, or what\'s happening in the world.</div>';
            return;
        }
        wrap.innerHTML = '';
        GameState.advisorMessages.forEach(function (msg) {
            const div = document.createElement('div');
            div.className = 'chat-msg ' + (msg.role === 'user' ? 'from-player' : 'from-advisor');
            const sender = document.createElement('div');
            sender.className = 'chat-msg-sender';
            sender.textContent = msg.role === 'user' ? 'You' : 'Advisor';
            div.appendChild(sender);
            const body = document.createElement('div');
            if (msg.role === 'user') {
                body.textContent = msg.text;
            } else {
                renderRichMessageBody(body, msg.text);
            }
            div.appendChild(body);
            wrap.appendChild(div);
        });
        wrap.scrollTop = wrap.scrollHeight;
    }

    function renderAdvisorSuggestions() {
        const wrap = document.getElementById('advisor-suggestions');
        wrap.innerHTML = '';
        ADVISOR_SUGGESTIONS.forEach(function (s) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'advisor-suggestion';
            btn.textContent = s.label;
            btn.addEventListener('click', function () { document.getElementById('advisor-input').value = s.prompt; });
            wrap.appendChild(btn);
        });
    }

    async function handleAdvisorAsk() {
        const input = document.getElementById('advisor-input');
        const status = document.getElementById('advisor-status');
        const text = input.value.trim();
        if (!text) return;
        GameState.advisorMessages.push({ id: 'adv-' + Date.now(), role: 'user', text: text });
        saveGameState();
        renderAdvisorMessages();
        input.value = '';
        status.textContent = 'Thinking…';
        try {
            const playerName = GameState.playerCountry ? (countryLookup[GameState.playerCountry] || GameState.playerCountry) : 'an unspecified nation';
            const history = summarizeRecentHistory(3);
            const allianceText = buildAllianceContextText();
            const reply = await callAI(
                'You are the trusted advisor to the leader of ' + playerName + ' in an alternate-history grand ' +
                'strategy game. The current in-game date is ' + formatDateLong(GameState.currentDate) + '. ' +
                'Give concise, strategic, in-character advice (2-4 short paragraphs max). ' +
                'You may format your reply with "## " section headers, "**bold**" for emphasis, and "- " bullet ' +
                'lists — do not use any other markup (no other symbols, no HTML). ' +
                'If, and only if, an illustrated map would genuinely clarify your answer (e.g. listing members of ' +
                'an alliance/bloc, comparing territorial claims, highlighting threats by location), you may ' +
                'append, after all of your prose, exactly one fenced block in this precise format:\n' +
                '```mapdata\n{"title":"short title","legend":[{"label":"Category name","color":"#3d6b45"}],' +
                '"countries":[{"code":"USA","categoryIndex":0}],"caption":"optional one-line caption"}\n```\n' +
                'Use real country names or ISO-3166 alpha-3-style codes for "code", valid 6-digit hex strings for ' +
                'every "color", and "categoryIndex" as the zero-based index into "legend". Omit the mapdata block ' +
                'entirely when a map would not add value — most replies should NOT include one. Never mention the ' +
                'word "mapdata", the fenced block, or whether a map is/isn\'t included anywhere in your visible ' +
                'prose — either silently include the fenced block after your prose, or silently say nothing about ' +
                'a map at all; the block itself is parsed and rendered separately, so narrating your own decision ' +
                'about it (e.g. "here is a map" or "no map will be shown") is never correct. ' +
                (allianceText ? ('\n\nCURRENT ALLIANCES/BLOCS (this is the real, authoritative list — do not invent ' +
                    'or assume any alliance beyond it):\n' + allianceText) :
                    '\n\nNo named alliances/blocs currently exist in this game — if asked about alliances, say so ' +
                    'plainly rather than inventing one.') +
                (history ? ('\n\nRecent history:\n' + history) : '') +
                (GameState.worldBefore ? ('\n\nThe World Before this game\'s start date:\n' + GameState.worldBefore) : '') +
                (GameState.simulationRules ? ('\n\nThis game\'s simulation rules:\n' + GameState.simulationRules) : '') +
                (((GameState.promptOverrides || {}).advisor) ? ('\n\nAdditional instructions:\n' + GameState.promptOverrides.advisor) : ''),
                text
            );
            GameState.advisorMessages.push({ id: 'adv-' + Date.now() + '-r', role: 'advisor', text: reply || '(No response)' });
            saveGameState();
            renderAdvisorMessages();
            status.textContent = '';
        } catch (e) {
            status.textContent = 'Advisor failed: ' + e.message;
        }
    }

    async function handleAdvisorClear() {
        const ok = await showConfirm('Clear advisor history?', 'This permanently deletes every message to and from your advisor. This cannot be undone.');
        if (!ok) return;
        GameState.advisorMessages = [];
        saveGameState();
        renderAdvisorMessages();
    }

    function initAdvisorPanel() {
        renderAdvisorMessages();
        renderAdvisorSuggestions();
        document.getElementById('advisor-launcher').addEventListener('click', function () { togglePanel('advisor-panel', 'advisor-launcher'); });
        document.getElementById('advisor-close').addEventListener('click', function () { document.getElementById('advisor-panel').classList.remove('open'); document.getElementById('advisor-launcher').classList.remove('active'); });
        document.getElementById('advisor-send-btn').addEventListener('click', handleAdvisorAsk);
        document.getElementById('advisor-clear').addEventListener('click', handleAdvisorClear);
        // Style the advisor launcher ring in the player's chosen nation color once known.
        updateAdvisorLauncherColor();
        initLorePanel();
    }

    function updateAdvisorLauncherColor() {
        const btn = document.getElementById('advisor-launcher');
        if (!btn) return;
        if (GameState.playerCountry) {
            btn.style.borderColor = getCountryColor(GameState.playerCountry);
        }
    }

    // ==========================================================================
    // Lore panel — shares the Advisor's game-panel via a left icon rail (see
    // .game-panel-railed / .panel-icon-rail in world_map_webgl.html). History
    // rounds (GameState.history, produced by Jump Forward) are grouped into
    // fixed-size "chapters"; each chapter's narrative prose is generated
    // on-demand by the AI and cached (persisted) in GameState.loreChapters so it
    // is only ever written once. The reference screenshots' Export button is
    // intentionally not implemented (explicitly out of scope per user).
    // ==========================================================================
    const LORE_CHAPTER_SIZE = 5;
    let loreActiveChapterIndex = null;

    function getLoreChapters() {
        const rounds = GameState.history || [];
        if (!rounds.length) return [];
        const chapters = [];
        for (let i = 0; i < rounds.length; i += LORE_CHAPTER_SIZE) {
            const slice = rounds.slice(i, i + LORE_CHAPTER_SIZE);
            chapters.push({
                index: chapters.length,
                startRound: slice[0].round,
                endRound: slice[slice.length - 1].round,
                fromDate: slice[0].fromDate,
                toDate: slice[slice.length - 1].toDate,
                rounds: slice
            });
        }
        return chapters;
    }

    function switchAdvisorTab(tab) {
        const isAdvisor = tab === 'advisor';
        document.getElementById('advisor-view').style.display = isAdvisor ? '' : 'none';
        document.getElementById('lore-view').style.display = isAdvisor ? 'none' : '';
        document.getElementById('advisor-tab-btn').classList.toggle('active', isAdvisor);
        document.getElementById('lore-tab-btn').classList.toggle('active', !isAdvisor);
        if (!isAdvisor) {
            renderLoreTimeline();
            renderLoreChapterContent();
        }
    }

    function renderLoreTimeline() {
        const track = document.getElementById('lore-timeline-track');
        const chapters = getLoreChapters();
        track.innerHTML = '';
        if (!chapters.length) {
            track.innerHTML = '<div class="empty-hint">No history yet — advance the game with Jump Forward to start generating lore chapters.</div>';
            return;
        }
        if (loreActiveChapterIndex === null || loreActiveChapterIndex >= chapters.length) {
            loreActiveChapterIndex = chapters.length - 1;
        }
        chapters.forEach(function (ch) {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'lore-chapter-chip' + (ch.index === loreActiveChapterIndex ? ' active' : '');
            const dateEl = document.createElement('div');
            dateEl.className = 'lore-chapter-date';
            dateEl.textContent = ch.index === 0 ? ('Before ' + formatDateLong(ch.toDate)) : formatDateLong(ch.toDate);
            const roundsEl = document.createElement('div');
            roundsEl.className = 'lore-chapter-rounds';
            roundsEl.textContent = 'Rounds ' + ch.startRound + '–' + ch.endRound;
            chip.appendChild(dateEl);
            chip.appendChild(roundsEl);
            chip.addEventListener('click', function () {
                loreActiveChapterIndex = ch.index;
                renderLoreTimeline();
                renderLoreChapterContent();
            });
            track.appendChild(chip);
        });
    }

    function renderLoreChapterContent() {
        const host = document.getElementById('lore-chapter-content');
        host.innerHTML = '';
        const chapters = getLoreChapters();
        if (!chapters.length || loreActiveChapterIndex === null) return;
        const chapter = chapters[loreActiveChapterIndex];
        const cached = (GameState.loreChapters || {})[String(chapter.index)];
        if (cached) {
            const body = document.createElement('div');
            renderRichMessageBody(body, cached);
            host.appendChild(body);
            return;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lore-generate-btn';
        btn.textContent = 'Generate chapter narrative';
        btn.addEventListener('click', function () { handleGenerateLoreChapter(chapter); });
        host.appendChild(btn);
        const status = document.createElement('div');
        status.className = 'ai-status-line';
        status.id = 'lore-status';
        host.appendChild(status);
    }

    async function handleGenerateLoreChapter(chapter) {
        const status = document.getElementById('lore-status');
        const genBtn = document.querySelector('#lore-chapter-content .lore-generate-btn');
        if (genBtn) genBtn.disabled = true;
        if (status) status.textContent = 'Writing chapter…';
        try {
            const playerName = GameState.playerCountry ? (countryLookup[GameState.playerCountry] || GameState.playerCountry) : 'the world';
            // Full event body text, not just headlines — good Lore
            // chapters carry real figures (GDP, growth rates) and named
            // institutions/leaders that only live in event bodies, never in the
            // short headline alone.
            const eventsSummary = chapter.rounds.map(function (r) {
                return 'Round ' + r.round + ' (' + r.fromDate + ' → ' + r.toDate + '):\n' +
                    (r.events.length ? r.events.map(function (e) { return '- ' + e.date + ' ' + e.headline + ': ' + e.body; }).join('\n') : '(No major recorded events.)');
            }).join('\n\n');

            // Diplomatic exchanges that happened within this chapter's date
            // range — Lore chapters pair
            // the narrative with a dated "Chat History Summary" section. Chat
            // messages only started carrying gameDate this session, so an
            // older save's pre-existing messages (no gameDate) are simply
            // excluded rather than guessed at.
            const chatExcerpt = (GameState.chatThreads || []).map(function (t) {
                const inRange = t.messages.filter(function (m) { return m.gameDate && m.gameDate >= chapter.fromDate && m.gameDate <= chapter.toDate; });
                if (!inRange.length) return null;
                const lines = inRange.map(function (m) {
                    const who = m.sender === 'player' ? playerName : (countryLookup[m.sender] || m.sender);
                    return m.gameDate + ' — ' + who + ': ' + m.text;
                }).join('\n');
                return t.title + ':\n' + lines;
            }).filter(Boolean).join('\n\n');

            // The previous chapter's own generated prose, so recurring figures
            // and named entities can be carried forward and evolved instead of
            // the AI reinventing the world from scratch every chapter.
            const priorChapter = chapter.index > 0 ? (GameState.loreChapters || {})[String(chapter.index - 1)] : null;

            const reply = await callAI(
                'You are a historian narrating the alternate-history timeline of a grand strategy game, told from ' +
                'the broader perspective of ' + playerName + ' but covering all major world events. Write a rich, ' +
                'dense narrative chapter (as many paragraphs as the material below actually supports — do not pad, ' +
                'but do not skip real detail either) covering the events below, in an engaging in-universe ' +
                'historical-summary voice, as if written well after the fact. Carry forward and evolve concrete, ' +
                'recurring details across the chapter — economic figures (GDP, growth rates), named acts/' +
                'institutions/operations, and named leaders — rather than restating the world in vague terms; if a ' +
                'figure or named entity was introduced in the previous chapter (given below, if any), continue its ' +
                'thread rather than ignoring it. ' +
                (chatExcerpt ? ('If diplomatic exchanges are given below, end the chapter with a "Chat History ' +
                    'Summary" section: one dated sentence or two per exchange, in the same historian voice, not a ' +
                    'raw transcript. ') : '') +
                'You may format with "## " for a single chapter heading, "**bold**" for emphasis, and "- " bullet ' +
                'lists where useful — do not use any other markup.',
                'Events for this chapter:\n' + eventsSummary +
                (chatExcerpt ? ('\n\nDiplomatic exchanges during this period:\n' + chatExcerpt) : '') +
                (priorChapter ? ('\n\nPrevious chapter, for continuity (do not repeat it — continue from it):\n' + priorChapter) : ''),
                { maxTokens: 2000 }
            );
            GameState.loreChapters = GameState.loreChapters || {};
            GameState.loreChapters[String(chapter.index)] = reply || '(No narrative generated.)';
            saveGameState();
            renderLoreChapterContent();
        } catch (e) {
            if (status) status.textContent = 'Chapter generation failed: ' + e.message;
            if (genBtn) genBtn.disabled = false;
        }
    }

    function initLorePanel() {
        GameState.loreChapters = GameState.loreChapters || {};
        document.getElementById('advisor-tab-btn').addEventListener('click', function () { switchAdvisorTab('advisor'); });
        document.getElementById('lore-tab-btn').addEventListener('click', function () { switchAdvisorTab('lore'); });
        document.getElementById('lore-close').addEventListener('click', function () {
            document.getElementById('advisor-panel').classList.remove('open');
            document.getElementById('advisor-launcher').classList.remove('active');
        });
    }

    // ==========================================================================
    // Search panel — provinces, cities, countries
    // ==========================================================================
    function runSearch(query) {
        const q = query.trim().toLowerCase();
        const results = [];
        if (q.length < 2) return results;

        // Countries
        for (const code in countryLookup) {
            if (countryLookup[code].toLowerCase().includes(q)) {
                results.push({ type: 'Country', name: countryLookup[code], meta: code, kind: 'country', code: code });
            }
            if (results.length >= 40) break;
        }
        // Cities
        (cities || []).forEach(function (c) {
            if (results.length >= 60) return;
            if (c.name.toLowerCase().includes(q)) {
                results.push({ type: c.capital ? 'Capital' : 'City', name: c.name, meta: countryLookup[c.country] || c.country, kind: 'city', lat: c.lat, lon: c.lon });
            }
        });
        // Provinces/municipalities
        if (targetObject && results.length < 80) {
            for (let i = 0; i < targetObject.geometries.length && results.length < 80; i++) {
                const props = targetObject.geometries[i].properties;
                if ((props.shapeName || '').toLowerCase().includes(q)) {
                    const eff = getEffectiveCountry(props.shapeID, props.shapeGroup);
                    results.push({ type: 'Province', name: props.shapeName, meta: countryLookup[eff] || eff, kind: 'province', shapeID: props.shapeID });
                }
            }
        }
        return results.slice(0, 60);
    }

    function renderSearchResults(results) {
        const wrap = document.getElementById('search-results');
        wrap.innerHTML = '';
        if (results.length === 0) {
            wrap.innerHTML = '<div class="empty-hint">No matches yet — keep typing.</div>';
            return;
        }
        results.forEach(function (r) {
            const row = document.createElement('div');
            row.className = 'search-result-row';
            row.innerHTML = '<div class="sr-name">' + r.name + '</div><div class="sr-meta">' + r.type + (r.meta ? ' · ' + r.meta : '') + '</div>';
            row.addEventListener('click', function () { goToSearchResult(r); });
            wrap.appendChild(row);
        });
    }

    function goToSearchResult(r) {
        if (r.kind === 'city') {
            map.setView([r.lat, r.lon], Math.max(map.getZoom(), 7));
        } else if (r.kind === 'country') {
            // Find any municipality belonging to this country to center on.
            if (targetObject) {
                for (let i = 0; i < targetObject.geometries.length; i++) {
                    const props = targetObject.geometries[i].properties;
                    if (getEffectiveCountry(props.shapeID, props.shapeGroup) === r.code) {
                        const layer = provinceLayerById[props.shapeID];
                        if (layer && layer.getBounds) {
                            map.fitBounds(layer.getBounds().pad ? layer.getBounds() : layer.getBounds());
                        }
                        if (layer && layer.getBounds) {
                            const b = layer.getBounds();
                            map.setView(b.getCenter(), Math.max(map.getZoom(), 4));
                        }
                        break;
                    }
                }
            }
        } else if (r.kind === 'province') {
            const layer = provinceLayerById[r.shapeID];
            if (layer && layer.getBounds) {
                const b = layer.getBounds();
                map.setView(b.getCenter(), 7);
                if (layer.setStyle) {
                    const original = { color: layer.options.color, weight: layer.options.weight };
                    layer.setStyle({ color: '#ffffff', weight: 2.5 });
                    setTimeout(function () { layer.setStyle(original); }, 1800);
                }
            }
        }
        document.getElementById('search-panel').classList.remove('open');
        document.getElementById('search-launcher').classList.remove('active');
    }

    function initSearchPanel() {
        document.getElementById('search-launcher').addEventListener('click', function () {
            togglePanel('search-panel', 'search-launcher');
            document.getElementById('search-input').focus();
        });
        document.getElementById('search-close').addEventListener('click', function () { document.getElementById('search-panel').classList.remove('open'); document.getElementById('search-launcher').classList.remove('active'); });
        document.getElementById('search-input').addEventListener('input', function (e) {
            renderSearchResults(runSearch(e.target.value));
        });
    }

    // ==========================================================================
    // Chat panel
    // ==========================================================================
    let activeChatThreadId = null;

    function renderChatPanel() {
        if (activeChatThreadId) {
            renderChatThreadView(activeChatThreadId);
        } else {
            renderChatThreadList();
        }
    }

    function renderChatThreadList() {
        document.getElementById('chat-panel-title').textContent = 'Chats';
        document.getElementById('chat-back-btn').style.display = 'none';
        const body = document.getElementById('chat-panel-body');
        const footer = document.getElementById('chat-panel-footer');
        body.innerHTML = '';

        if (GameState.chatThreads.length) {
            GameState.chatThreads.forEach(function (thread) {
                const row = document.createElement('div');
                row.className = 'chat-thread-row';
                const lastMsg = thread.messages[thread.messages.length - 1];
                row.innerHTML = '<div class="ctr-title">' + thread.title + '</div><div class="ctr-preview">' + (lastMsg ? lastMsg.text : 'No messages yet') + '</div>';
                row.addEventListener('click', function () { activeChatThreadId = thread.id; renderChatPanel(); });
                body.appendChild(row);
            });
        } else {
            body.innerHTML = '<div class="empty-hint">No conversations yet.</div>';
        }

        footer.innerHTML = '';
        const newBtn = document.createElement('button');
        newBtn.type = 'button';
        newBtn.className = 'game-btn primary';
        newBtn.style.width = '100%';
        newBtn.textContent = 'Start New Chat';
        newBtn.addEventListener('click', renderNationPicker);
        footer.appendChild(newBtn);
    }

    // ISO3 (our country codes, matching geoBoundaries shapeGroup) -> ISO2. NOT
    // used by buildFlagElement() below anymore (country flags are local-only,
    // see FLAGS_BASE_PATH/resolveFlagSrc) — this table is now only consumed by
    // the mint-time subdivision/secession flag mapping (SUBDIVISION_FLAGS,
    // window.buildFlagImageUrl() in world_map_webgl.html), which still
    // resolves through flagcdn.com/iso3166-flags for brand-new breakaway-state
    // flags — a known remaining CDN gap outside this pass's scope (country-
    // level flags only), matching Map Painter 2's own Geo/game.js.
    const ISO3_TO_ISO2 = {'ABW':'aw','AFG':'af','AGO':'ao','AIA':'ai','ALA':'ax','ALB':'al','AND':'ad','ARE':'ae','ARG':'ar','ARM':'am','ASM':'as','ATA':'aq','ATF':'tf','ATG':'ag','AUS':'au','AUT':'at','AZE':'az','BDI':'bi','BEL':'be','BEN':'bj','BES':'bq','BFA':'bf','BGD':'bd','BGR':'bg','BHR':'bh','BHS':'bs','BIH':'ba','BLM':'bl','BLR':'by','BLZ':'bz','BMU':'bm','BOL':'bo','BRA':'br','BRB':'bb','BRN':'bn','BTN':'bt','BVT':'bv','BWA':'bw','CAF':'cf','CAN':'ca','CCK':'cc','CHE':'ch','CHL':'cl','CHN':'cn','CIV':'ci','CMR':'cm','COD':'cd','COG':'cg','COK':'ck','COL':'co','COM':'km','CPV':'cv','CRI':'cr','CUB':'cu','CUW':'cw','CXR':'cx','CYM':'ky','CYP':'cy','CZE':'cz','DEU':'de','DJI':'dj','DMA':'dm','DNK':'dk','DOM':'do','DZA':'dz','ECU':'ec','EGY':'eg','ERI':'er','ESH':'eh','ESP':'es','EST':'ee','ETH':'et','FIN':'fi','FJI':'fj','FLK':'fk','FRA':'fr','FRO':'fo','FSM':'fm','GAB':'ga','GBR':'gb','GEO':'ge','GGY':'gg','GHA':'gh','GIB':'gi','GIN':'gn','GLP':'gp','GMB':'gm','GNB':'gw','GNQ':'gq','GRC':'gr','GRD':'gd','GRL':'gl','GTM':'gt','GUF':'gf','GUM':'gu','GUY':'gy','HKG':'hk','HMD':'hm','HND':'hn','HRV':'hr','HTI':'ht','HUN':'hu','IDN':'id','IMN':'im','IND':'in','IOT':'io','IRL':'ie','IRN':'ir','IRQ':'iq','ISL':'is','ISR':'il','ITA':'it','JAM':'jm','JEY':'je','JOR':'jo','JPN':'jp','KAZ':'kz','KEN':'ke','KGZ':'kg','KHM':'kh','KIR':'ki','KNA':'kn','KOR':'kr','KWT':'kw','LAO':'la','LBN':'lb','LBR':'lr','LBY':'ly','LCA':'lc','LIE':'li','LKA':'lk','LSO':'ls','LTU':'lt','LUX':'lu','LVA':'lv','MAC':'mo','MAF':'mf','MAR':'ma','MCO':'mc','MDA':'md','MDG':'mg','MDV':'mv','MEX':'mx','MHL':'mh','MKD':'mk','MLI':'ml','MLT':'mt','MMR':'mm','MNE':'me','MNG':'mn','MNP':'mp','MOZ':'mz','MRT':'mr','MSR':'ms','MTQ':'mq','MUS':'mu','MWI':'mw','MYS':'my','MYT':'yt','NAM':'na','NCL':'nc','NER':'ne','NFK':'nf','NGA':'ng','NIC':'ni','NIU':'nu','NLD':'nl','NOR':'no','NPL':'np','NRU':'nr','NZL':'nz','OMN':'om','PAK':'pk','PAN':'pa','PCN':'pn','PER':'pe','PHL':'ph','PLW':'pw','PNG':'pg','POL':'pl','PRI':'pr','PRK':'kp','PRT':'pt','PRY':'py','PSE':'ps','PYF':'pf','QAT':'qa','REU':'re','ROU':'ro','RUS':'ru','RWA':'rw','SAU':'sa','SDN':'sd','SEN':'sn','SGP':'sg','SGS':'gs','SHN':'sh','SJM':'sj','SLB':'sb','SLE':'sl','SLV':'sv','SMR':'sm','SOM':'so','SPM':'pm','SRB':'rs','SSD':'ss','STP':'st','SUR':'sr','SVK':'sk','SVN':'si','SWE':'se','SWZ':'sz','SXM':'sx','SYC':'sc','SYR':'sy','TCA':'tc','TCD':'td','TGO':'tg','THA':'th','TJK':'tj','TKL':'tk','TKM':'tm','TLS':'tl','TON':'to','TTO':'tt','TUN':'tn','TUR':'tr','TUV':'tv','TWN':'tw','TZA':'tz','UGA':'ug','UKR':'ua','UMI':'um','URY':'uy','USA':'us','UZB':'uz','VAT':'va','VCT':'vc','VEN':'ve','VGB':'vg','VIR':'vi','VNM':'vn','VUT':'vu','WLF':'wf','WSM':'ws','XKX':'xk','YEM':'ye','ZAF':'za','ZMB':'zm','ZWE':'zw'};

    // Local assets/flags/ tree root, relative to this file (game.js, at the
    // project root — see setCountryFlagOverride()'s own comment on why
    // overrides here are stored as full paths with no separate base-path
    // prefixing step). Every flag rendered by buildFlagElement() below is
    // read from here — no CDN (flagcdn.com or otherwise) is ever contacted
    // for a country flag. See assets/flags/ATTRIBUTION.md for the Wikimedia
    // Commons source/license of every shipped file.
    const FLAGS_BASE_PATH = 'assets/flags/';
    // Countries whose local default.png is confirmed missing — logged once
    // each (not spammed). Read via window.getMissingLocalFlags().
    const missingLocalFlags = new Set();
    window.getMissingLocalFlags = function () { return Array.from(missingLocalFlags); };

    // Resolves the flag image src for a country — GameState.countryFlagOverrides
    // (see setCountryFlagOverride()) wins if set (already a full ready-to-use
    // path or data: URI), otherwise falls back to the local
    // "assets/flags/<code>/default.png".
    function resolveFlagSrc(code) {
        const override = GameState.countryFlagOverrides && GameState.countryFlagOverrides[code];
        return override || (FLAGS_BASE_PATH + code + '/default.png');
    }

    // Builds the flag/badge element for one nation-picker card. Flags are
    // loaded strictly from the local assets/flags/ tree (or a data: URI for
    // in-browser-generated fictional-government flags) — never a CDN — with
    // a graceful colored-initials badge fallback if the local file 404s (a
    // custom/fictional entity with no local flag asset yet).
    function buildFlagElement(code) {
        const src = resolveFlagSrc(code);
        const img = document.createElement('img');
        img.className = 'country-flag-img';
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', function () {
            if (!missingLocalFlags.has(src)) {
                missingLocalFlags.add(src);
                console.warn('[flags] missing local flag asset: ' + src + ' (country code ' + code + ')');
            }
            if (img.parentNode) img.parentNode.replaceChild(buildFlagBadge(code), img);
        });
        return img;
    }
    function buildFlagBadge(code) {
        const badge = document.createElement('div');
        badge.className = 'country-flag-badge';
        badge.style.background = getCountryColor(code);
        badge.textContent = code.slice(0, 2);
        return badge;
    }

    function renderNationPicker() {
        document.getElementById('chat-panel-title').textContent = 'Start New Chat';
        document.getElementById('chat-back-btn').style.display = 'inline-flex';
        const body = document.getElementById('chat-panel-body');
        const footer = document.getElementById('chat-panel-footer');
        body.innerHTML = '';

        const selected = new Set();

        const selectedHeader = document.createElement('div');
        selectedHeader.className = 'country-picker-selected-header';
        const selectedList = document.createElement('div');
        selectedList.className = 'country-picker-selected-list';
        body.appendChild(selectedHeader);
        body.appendChild(selectedList);

        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.className = 'game-input';
        searchBox.placeholder = 'Search countries...';
        body.appendChild(searchBox);

        const grid = document.createElement('div');
        grid.className = 'country-flag-grid';
        body.appendChild(grid);

        const codes = Object.keys(countryLookup).filter(function (c) { return c !== GameState.playerCountry; }).sort(function (a, b) {
            return countryLookup[a].localeCompare(countryLookup[b]);
        });

        footer.innerHTML = '';
        const btnRow = document.createElement('div');
        btnRow.className = 'game-btn-row';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'game-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', renderChatThreadList);
        const chatWithBtn = document.createElement('button');
        chatWithBtn.type = 'button';
        chatWithBtn.className = 'game-btn primary';
        chatWithBtn.disabled = true;
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(chatWithBtn);
        footer.appendChild(btnRow);

        function updateSelectedSummary() {
            selectedHeader.textContent = 'Selected Countries (' + selected.size + '):';
            selectedList.textContent = selected.size
                ? Array.from(selected).map(function (c) { return countryLookup[c] || c; }).join(', ')
                : 'No countries selected yet';
            chatWithBtn.textContent = 'Chat with ' + selected.size + ' countr' + (selected.size === 1 ? 'y' : 'ies');
            chatWithBtn.disabled = selected.size === 0;
        }

        function renderGrid(filter) {
            grid.innerHTML = '';
            codes.filter(function (c) { return !filter || countryLookup[c].toLowerCase().includes(filter.toLowerCase()); })
                .forEach(function (code) {
                    const card = document.createElement('button');
                    card.type = 'button';
                    card.className = 'country-flag-card' + (selected.has(code) ? ' selected' : '');
                    card.appendChild(buildFlagElement(code));
                    const label = document.createElement('div');
                    label.className = 'country-flag-name';
                    label.textContent = countryLookup[code];
                    card.appendChild(label);
                    card.addEventListener('click', function () {
                        if (selected.has(code)) selected.delete(code); else selected.add(code);
                        card.classList.toggle('selected');
                        updateSelectedSummary();
                    });
                    grid.appendChild(card);
                });
        }
        renderGrid('');
        searchBox.addEventListener('input', function () { renderGrid(searchBox.value); });
        updateSelectedSummary();

        chatWithBtn.addEventListener('click', function () {
            if (!selected.size) return;
            const selectedArr = Array.from(selected);
            const thread = {
                id: 'chat-' + Date.now(),
                participants: selectedArr,
                title: selectedArr.map(function (c) { return countryLookup[c]; }).join(', '),
                messages: []
            };
            GameState.chatThreads.push(thread);
            saveGameState();
            activeChatThreadId = thread.id;
            renderChatPanel();
        });
    }

    function renderChatThreadView(threadId) {
        const thread = GameState.chatThreads.find(function (t) { return t.id === threadId; });
        if (!thread) { activeChatThreadId = null; renderChatPanel(); return; }
        document.getElementById('chat-panel-title').textContent = thread.title;
        document.getElementById('chat-back-btn').style.display = 'inline-flex';
        const body = document.getElementById('chat-panel-body');
        const footer = document.getElementById('chat-panel-footer');
        body.innerHTML = '';
        if (!thread.messages.length) {
            body.innerHTML = '<div class="empty-hint">Say something to open the conversation.</div>';
        } else {
            thread.messages.forEach(function (msg) {
                const div = document.createElement('div');
                div.className = 'chat-msg ' + (msg.sender === 'player' ? 'from-player' : 'from-other');
                const sender = document.createElement('div');
                sender.className = 'chat-msg-sender';
                sender.textContent = msg.sender === 'player' ? (GameState.playerCountry ? countryLookup[GameState.playerCountry] : 'You') : (countryLookup[msg.sender] || msg.sender);
                const text = document.createElement('div');
                text.textContent = msg.text;
                div.appendChild(sender);
                div.appendChild(text);
                body.appendChild(div);
            });
        }

        footer.innerHTML = '';
        const textarea = document.createElement('textarea');
        textarea.className = 'game-input';
        textarea.rows = 2;
        textarea.placeholder = 'Write a message...';
        footer.appendChild(textarea);
        const btnRow = document.createElement('div');
        btnRow.className = 'game-btn-row';
        const sendBtn = document.createElement('button');
        sendBtn.type = 'button';
        sendBtn.className = 'game-btn primary';
        sendBtn.textContent = 'Send';
        btnRow.appendChild(sendBtn);
        footer.appendChild(btnRow);
        const status = document.createElement('div');
        status.className = 'ai-status-line';
        footer.appendChild(status);

        sendBtn.addEventListener('click', async function () {
            const text = textarea.value.trim();
            if (!text) return;
            thread.messages.push({ id: 'msg-' + Date.now(), sender: 'player', text: text, gameDate: GameState.currentDate });
            saveGameState();
            // Append the player's bubble directly instead of doing a full
            // renderChatThreadView() here — a full re-render would replace
            // this footer's textarea/status/button with fresh DOM nodes,
            // detaching the ones this handler closes over, so any later
            // status update (waiting / error) would silently write to an
            // element no longer attached to the page.
            const bodyEl = document.getElementById('chat-panel-body');
            const emptyHint = bodyEl.querySelector('.empty-hint');
            if (emptyHint) emptyHint.remove();
            const playerDiv = document.createElement('div');
            playerDiv.className = 'chat-msg from-player';
            const playerSender = document.createElement('div');
            playerSender.className = 'chat-msg-sender';
            playerSender.textContent = GameState.playerCountry ? countryLookup[GameState.playerCountry] : 'You';
            const playerText = document.createElement('div');
            playerText.textContent = text;
            playerDiv.appendChild(playerSender);
            playerDiv.appendChild(playerText);
            bodyEl.appendChild(playerDiv);
            textarea.value = '';
            bodyEl.scrollTop = bodyEl.scrollHeight;
            sendBtn.disabled = true;
            status.textContent = 'Waiting for reply…';
            try {
                const playerName = GameState.playerCountry ? countryLookup[GameState.playerCountry] : 'An unspecified nation';
                const otherNames = thread.participants.map(function (c) { return countryLookup[c] || c; }).join(' and ');
                const history = thread.messages.slice(-10).map(function (m) {
                    return (m.sender === 'player' ? playerName : (countryLookup[m.sender] || m.sender)) + ': ' + m.text;
                }).join('\n');
                const reply = await callAI(
                    'You are role-playing the government/leadership of ' + otherNames + ' in a diplomatic ' +
                    'conversation with ' + playerName + ' during an alternate-history grand strategy game (current ' +
                    'date: ' + formatDateLong(GameState.currentDate) + '). Respond in character, diplomatically but ' +
                    'realistically — tone should shift based on how ' + playerName + ' addresses you (respectful ' +
                    'proposals should be met with genuine consideration; threats or insults should increase hostility). ' +
                    'Keep the reply to 1-3 short paragraphs. Respond with ONLY the in-character reply text, no labels.' +
                    '\n\n' + (DIFFICULTY_PROMPT_TEXT[GameState.difficulty] || DIFFICULTY_PROMPT_TEXT.normal) +
                    (GameState.worldBefore ? ('\n\nThe World Before this game\'s start date:\n' + GameState.worldBefore) : '') +
                    (GameState.simulationRules ? ('\n\nThis game\'s simulation rules:\n' + GameState.simulationRules) : '') +
                    (((GameState.promptOverrides || {}).chat) ? ('\n\nAdditional instructions:\n' + GameState.promptOverrides.chat) : ''),
                    'Conversation so far:\n' + history + '\n\nRespond as ' + otherNames + '.'
                );
                thread.messages.push({ id: 'msg-' + Date.now() + '-r', sender: thread.participants[0], text: reply || '(No response)', gameDate: GameState.currentDate });
                saveGameState();
                status.textContent = '';
                renderChatThreadView(threadId);
                bodyEl.scrollTop = bodyEl.scrollHeight;
            } catch (e) {
                status.textContent = 'Message failed: ' + e.message;
                sendBtn.disabled = false;
            }
        });
    }

    function initChatPanel() {
        document.getElementById('chat-launcher').addEventListener('click', function () {
            activeChatThreadId = null;
            togglePanel('chat-panel', 'chat-launcher');
            renderChatPanel();
        });
        document.getElementById('chat-close').addEventListener('click', function () {
            document.getElementById('chat-panel').classList.remove('open');
            document.getElementById('chat-launcher').classList.remove('active');
        });
        document.getElementById('chat-back-btn').addEventListener('click', function () {
            activeChatThreadId = null;
            renderChatPanel();
        });
    }

    // Opens (or reuses) a single-country chat thread — used by the Country
    // Details panel's "Open Diplomacy" button. Mirrors the multi-country thread
    // creation in renderNationPicker()'s chatWithBtn handler, but for exactly
    // one country and without going through the picker UI.
    function openOrCreateChatWithCountry(code) {
        let thread = GameState.chatThreads.find(function (t) {
            return t.participants.length === 1 && t.participants[0] === code;
        });
        if (!thread) {
            thread = {
                id: 'chat-' + Date.now(),
                participants: [code],
                title: countryLookup[code] || code,
                messages: []
            };
            GameState.chatThreads.push(thread);
            saveGameState();
        }
        activeChatThreadId = thread.id;
        openPanel('chat-panel', 'chat-launcher');
        renderChatPanel();
    }

    // ==========================================================================
    // Country Details panel — opened via the (i) button on a country's row in
    // the Map Feature popup (see openCountryDetailPanel() in
    // world_map_webgl.html's buildFeaturePopupContent()). Shows every world event
    // tagged with this country across GameState.history, plus alternative
    // names earned through gameplay (see the altNames handling in
    // runJumpForward() above) and the country's currently-owned provinces.
    // ==========================================================================
    let countryDetailActiveCode = null;
    let countryDetailFilterText = '';
    let countryDetailMapChangesOnly = false;

    function getRelatedEventsForCountry(code) {
        const out = [];
        GameState.history.forEach(function (round) {
            (round.events || []).forEach(function (ev) {
                const tagged = (ev.tags || []).some(function (t) {
                    return t.type === 'country' && resolveCountryCode(t.label) === code;
                });
                if (tagged) out.push(ev);
            });
        });
        return out;
    }

    function getAlternativeNamesForCountry(code) {
        return (GameState.countryAltNames && GameState.countryAltNames[code]) || [];
    }

    function renderCountryDetailEvents(code) {
        const listEl = document.getElementById('country-detail-events-list');
        const countEl = document.getElementById('country-detail-events-count');
        listEl.innerHTML = '';

        let events = getRelatedEventsForCountry(code);
        if (countryDetailMapChangesOnly) {
            events = events.filter(function (ev) { return ev.mapChanges && ev.mapChanges.length; });
        }
        const q = countryDetailFilterText.trim().toLowerCase();
        if (q) {
            events = events.filter(function (ev) {
                return (ev.headline || '').toLowerCase().includes(q) ||
                    (ev.body || '').toLowerCase().includes(q) ||
                    (ev.tags || []).some(function (t) { return (t.label || '').toLowerCase().includes(q); });
            });
        }
        countEl.textContent = events.length + ' shown';

        if (!events.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-hint';
            empty.textContent = GameState.history.length ? 'No related events match.' : 'No related events yet — events appear here after you Jump Forward.';
            listEl.appendChild(empty);
            return;
        }

        events.forEach(function (ev) {
            const card = document.createElement('div');
            card.className = 'event-card';

            const top = document.createElement('div');
            top.className = 'event-card-top';
            const dateChip = document.createElement('div');
            dateChip.className = 'event-date-chip';
            dateChip.textContent = formatDateLong(ev.date);
            top.appendChild(dateChip);
            if (ev.mapChanges && ev.mapChanges.length) {
                const mcChip = document.createElement('div');
                mcChip.className = 'map-change-chip';
                mcChip.textContent = ev.mapChanges.length + ' Map Change' + (ev.mapChanges.length > 1 ? 's' : '');
                top.appendChild(mcChip);
            }
            card.appendChild(top);

            const tagsWrap = document.createElement('div');
            (ev.tags || []).forEach(function (tag) {
                const chip = document.createElement('span');
                chip.className = 'event-tag-chip';
                const dot = document.createElement('span');
                dot.className = 'event-tag-dot';
                dot.style.background = tag.type === 'country' ? (getCountryColor(resolveCountryCode(tag.label) || '') || '#8fb0d9') : '#9b78dc';
                chip.appendChild(dot);
                chip.appendChild(document.createTextNode(tag.label));
                tagsWrap.appendChild(chip);
            });
            card.appendChild(tagsWrap);

            const headline = document.createElement('div');
            headline.className = 'event-headline';
            headline.textContent = ev.headline;
            card.appendChild(headline);

            const bodyText = document.createElement('div');
            bodyText.className = 'event-body';
            bodyText.textContent = ev.body;
            card.appendChild(bodyText);

            listEl.appendChild(card);
        });
    }

    function renderCountryDetailPills(code) {
        const altWrap = document.getElementById('country-detail-altnames');
        const regionsWrap = document.getElementById('country-detail-regions');
        const regionsCountEl = document.getElementById('country-detail-regions-count');

        altWrap.innerHTML = '';
        const altNames = getAlternativeNamesForCountry(code);
        if (!altNames.length) {
            const hint = document.createElement('div');
            hint.className = 'empty-hint';
            hint.textContent = 'None yet.';
            altWrap.appendChild(hint);
        } else {
            altNames.forEach(function (n) {
                const pill = document.createElement('span');
                pill.className = 'detail-pill';
                pill.textContent = n;
                altWrap.appendChild(pill);
            });
        }

        regionsWrap.innerHTML = '';
        // Some countries' ADM2 boundaries go down to commune/municipality level
        // (Romania alone has 3000+), so the full list can be huge — show the
        // true total in the header but cap the rendered pills so the panel
        // stays usable, with a "+N more" note for the rest.
        const REGION_PILL_DISPLAY_CAP = 60;
        const regions = getProvinceNamesForCountry(code);
        regionsCountEl.textContent = 'Regions Owned (' + regions.length + ')';
        if (!regions.length) {
            const hint = document.createElement('div');
            hint.className = 'empty-hint';
            hint.textContent = 'No provinces currently on record.';
            regionsWrap.appendChild(hint);
        } else {
            regions.slice(0, REGION_PILL_DISPLAY_CAP).forEach(function (r) {
                const pill = document.createElement('span');
                pill.className = 'detail-pill';
                pill.textContent = r;
                regionsWrap.appendChild(pill);
            });
            if (regions.length > REGION_PILL_DISPLAY_CAP) {
                const more = document.createElement('span');
                more.className = 'detail-pill detail-pill-more';
                more.textContent = '+' + (regions.length - REGION_PILL_DISPLAY_CAP) + ' more';
                regionsWrap.appendChild(more);
            }
        }
    }

    // Small "standing state" pills shown right under the flag/name — puppet/
    // vassal/protectorate/autonomous relationship and current government type,
    // if either is set. Kept separate from renderCountryDetailPills() (which
    // handles the lower "Details" section's Alternative Names/Regions Owned
    // pills) since these two read as a country's current STATUS, not
    // reference info, and the reference UI shows them in that top position.
    function capitalizeWords(s) {
        return String(s).replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    function renderCountryDetailStatusPills(code) {
        const wrap = document.getElementById('country-detail-status-pills');
        wrap.innerHTML = '';
        const rel = getPolityRelationship(code);
        if (rel) {
            const pill = document.createElement('span');
            pill.className = 'status-pill relationship';
            pill.textContent = capitalizeWords(rel.type);
            pill.title = getPolityRelationshipNote(code) || '';
            wrap.appendChild(pill);
        }
        const gov = getGovernmentType(code);
        if (gov) {
            const pill = document.createElement('span');
            pill.className = 'status-pill government';
            pill.textContent = capitalizeWords(gov.type);
            pill.title = getGovernmentTypeNote(code) || '';
            wrap.appendChild(pill);
        }
        getAlliancesForCountry(code).forEach(function (entry) {
            const isLeader = entry.alliance.leaderCode === code;
            const tag = allianceAcronym(entry.alliance.name);
            const pill = document.createElement('span');
            pill.className = 'status-pill alliance';
            pill.textContent = (tag ? tag + ' ' : '') + (isLeader ? 'Leader' : entry.rank);
            pill.title = (isLeader ? 'Leads ' : (entry.rank + ' of ')) + entry.alliance.name + '.';
            wrap.appendChild(pill);
        });
    }

    function openCountryDetailPanel(code) {
        if (!code || !countryLookup[code]) return;
        countryDetailActiveCode = code;
        countryDetailFilterText = '';
        countryDetailMapChangesOnly = false;

        document.getElementById('country-detail-name').textContent = countryLookup[code] || code;
        document.getElementById('country-detail-search').value = '';
        document.getElementById('country-detail-filter-btn').classList.remove('active');

        renderCountryDetailStatusPills(code);

        // Static lore notes (e.g. Somaliland) are the only thing left in the
        // free-text Status block now — government type and polity relationship
        // moved to the pill row above (renderCountryDetailStatusPills) so they
        // read as standing state at a glance, matching how a Vassal/puppet tag
        // is shown right under the name rather than buried in a paragraph.
        const statusWrap = document.getElementById('country-detail-status-wrap');
        const staticNote = getStaticNoteForCountry(code);
        if (staticNote) {
            document.getElementById('country-detail-status-note').textContent = staticNote;
            statusWrap.style.display = '';
        } else {
            statusWrap.style.display = 'none';
        }

        const flagWrap = document.getElementById('country-detail-flag-wrap');
        flagWrap.innerHTML = '';
        flagWrap.appendChild(buildFlagElement(code));

        renderCountryDetailEvents(code);
        renderCountryDetailPills(code);

        document.getElementById('country-detail-panel').classList.add('open');
    }

    function initCountryDetailPanel() {
        document.getElementById('country-detail-close').addEventListener('click', function () {
            document.getElementById('country-detail-panel').classList.remove('open');
        });
        document.getElementById('country-detail-search').addEventListener('input', function (e) {
            countryDetailFilterText = e.target.value;
            if (countryDetailActiveCode) renderCountryDetailEvents(countryDetailActiveCode);
        });
        document.getElementById('country-detail-filter-btn').addEventListener('click', function () {
            countryDetailMapChangesOnly = !countryDetailMapChangesOnly;
            document.getElementById('country-detail-filter-btn').classList.toggle('active', countryDetailMapChangesOnly);
            if (countryDetailActiveCode) renderCountryDetailEvents(countryDetailActiveCode);
        });
        document.getElementById('country-detail-advisor-btn').addEventListener('click', function () {
            if (!countryDetailActiveCode) return;
            const name = countryLookup[countryDetailActiveCode] || countryDetailActiveCode;
            openPanel('advisor-panel', 'advisor-launcher');
            switchAdvisorTab('advisor');
            document.getElementById('advisor-input').value = 'Give me a report on ' + name + ': their current standing, alliances, and strategic posture.';
            handleAdvisorAsk();
        });
        document.getElementById('country-detail-diplomacy-btn').addEventListener('click', function () {
            if (!countryDetailActiveCode) return;
            openOrCreateChatWithCountry(countryDetailActiveCode);
        });
    }

    // ==========================================================================
    // Date pill + Jump Forward Timeline + Events-between-dates
    // ==========================================================================
    let viewingHistoryIndex = null; // null = at present; otherwise index into GameState.history being viewed

    function renderDatePill() {
        document.getElementById('date-pill-text').textContent = formatDateLong(GameState.currentDate);
        document.getElementById('date-pill-round').textContent = 'Round ' + GameState.round;
        document.getElementById('date-pill-back').disabled = GameState.history.length === 0;
    }

    // Builds one event's full card (date chip, map-change chip, tags,
    // headline, body, expandable map-changes list) — unchanged from the
    // original per-round renderer, just pulled out so the stacked view
    // below (openEventsModalForRound) can reuse it for the active round's
    // events without duplicating this markup.
    function buildEventCard(ev) {
        const card = document.createElement('div');
        card.className = 'event-card';

        const top = document.createElement('div');
        top.className = 'event-card-top';
        const dateChip = document.createElement('div');
        dateChip.className = 'event-date-chip';
        dateChip.textContent = formatDateLong(ev.date);
        top.appendChild(dateChip);
        if (ev.mapChanges && ev.mapChanges.length) {
            const mcChip = document.createElement('div');
            mcChip.className = 'map-change-chip';
            mcChip.textContent = ev.mapChanges.length + ' Map Change' + (ev.mapChanges.length > 1 ? 's' : '');
            top.appendChild(mcChip);
        }
        card.appendChild(top);

        const tagsWrap = document.createElement('div');
        (ev.tags || []).forEach(function (tag) {
            const chip = document.createElement('span');
            chip.className = 'event-tag-chip';
            const dot = document.createElement('span');
            dot.className = 'event-tag-dot';
            dot.style.background = tag.type === 'country' ? (getCountryColor(resolveCountryCode(tag.label) || '') || '#8fb0d9') : '#9b78dc';
            chip.appendChild(dot);
            chip.appendChild(document.createTextNode(tag.label));
            tagsWrap.appendChild(chip);
        });
        card.appendChild(tagsWrap);

        const headline = document.createElement('div');
        headline.className = 'event-headline';
        headline.textContent = ev.headline;
        card.appendChild(headline);

        const bodyText = document.createElement('div');
        bodyText.className = 'event-body';
        bodyText.textContent = ev.body;
        card.appendChild(bodyText);

        if (ev.mapChanges && ev.mapChanges.length) {
            const toggle = document.createElement('div');
            toggle.className = 'view-map-changes-toggle';
            toggle.innerHTML = '<span>▾</span><span>View Map Changes</span>';
            const list = document.createElement('div');
            list.className = 'map-changes-list';
            ev.mapChanges.forEach(function (mc) {
                const line = document.createElement('div');
                line.className = 'map-change-line';
                const fromName = mc.fromCountry ? (countryLookup[mc.fromCountry] || mc.fromCountry) : 'Unclaimed';
                const toName = countryLookup[mc.toCountry] || mc.toCountry;
                line.textContent = mc.shapeName + ': ' + fromName + ' → ' + toName;
                list.appendChild(line);
            });
            toggle.addEventListener('click', function () { list.classList.toggle('open'); });
            card.appendChild(toggle);
            card.appendChild(list);
        }
        return card;
    }

    // Stacked-history rework (500ms/cubic-bezier(0.2,0,0.1,1) motion
    // timing, with collapsed rows stacked above the active card; this
    // implementation and markup are original). Every round from the start of GameState.history up
    // through `index` renders in one persistent stack: earlier rounds as
    // thin collapsed summary rows (click one to jump straight back to it —
    // same code path as Prev/Next, just a different starting index), the
    // requested round fully expanded with its real event cards. Previously
    // this rendered ONLY round `index` and threw everything else away on
    // every Prev/Next click; now the whole history stays visible and only
    // the active round's card set is rebuilt, so a returning player can see
    // how far the story has come without re-clicking back through it.
    function openEventsModalForRound(index) {
        const round = GameState.history[index];
        if (!round) return;
        viewingHistoryIndex = index;
        document.getElementById('events-modal-range').textContent = formatDateLong(round.fromDate) + ' → ' + formatDateLong(round.toDate);
        const body = document.getElementById('events-modal-body');
        body.innerHTML = '';

        const enteringEls = [];
        for (let i = 0; i <= index; i++) {
            const r = GameState.history[i];
            if (i === index) {
                const activeWrap = document.createElement('div');
                activeWrap.className = 'event-round-active event-round-entering';
                r.events.forEach(function (ev) { activeWrap.appendChild(buildEventCard(ev)); });
                body.appendChild(activeWrap);
                enteringEls.push(activeWrap);
            } else {
                const row = document.createElement('div');
                row.className = 'event-round-collapsed event-round-entering';
                const roundLabel = document.createElement('span');
                roundLabel.className = 'event-round-collapsed-round';
                roundLabel.textContent = 'Round ' + r.round;
                const summary = document.createElement('span');
                summary.className = 'event-round-collapsed-summary';
                const firstHeadline = r.events.length ? r.events[0].headline : '';
                summary.textContent = firstHeadline + (r.events.length > 1 ? ' (+' + (r.events.length - 1) + ' more)' : '');
                row.appendChild(roundLabel);
                row.appendChild(summary);
                row.addEventListener('click', function () { openEventsModalForRound(i); });
                body.appendChild(row);
                enteringEls.push(row);
            }
        }
        // Two-step enter transition: elements start via .event-round-entering's
        // CSS (opacity 0, translateY, and for collapsed rows height 0) then,
        // one frame later, that class is removed so the "settled" CSS state
        // (set in the .event-round-collapsed / .event-round-active base
        // rules) transitions in over 500ms — the same duration/easing the
        // reference prototype used for its history-row collapse animation.
        // requestAnimationFrame is used when available, but a page/tab that's
        // backgrounded (document.hidden) never gets an rAF callback at all —
        // confirmed live: a hidden tab left double-rAF waiting indefinitely,
        // permanently stuck at opacity:0/height:0 — so a short setTimeout
        // fallback races it and whichever fires first wins, guarded so the
        // removal only ever runs once.
        let entranceSettled = false;
        function settleEntrance() {
            if (entranceSettled) return;
            entranceSettled = true;
            enteringEls.forEach(function (el) { el.classList.remove('event-round-entering'); });
        }
        requestAnimationFrame(function () { requestAnimationFrame(settleEntrance); });
        setTimeout(settleEntrance, 50);

        document.getElementById('events-prev-round').disabled = index === 0;
        document.getElementById('events-prev-round').style.display = index === 0 ? 'none' : 'inline-block';
        document.getElementById('events-jump-btn').textContent = (index === GameState.history.length - 1) ? 'Jump Forward »' : 'Next ›';
        document.getElementById('events-modal').classList.add('open');
        // Active round's cards are always last — keep them in view instead
        // of leaving the scroll position wherever the previous render left it.
        body.scrollTop = body.scrollHeight;
    }

    function initDatePillAndModals() {
        renderDatePill();
        document.getElementById('date-pill-back').addEventListener('click', function () {
            if (!GameState.history.length) return;
            openEventsModalForRound(GameState.history.length - 1);
        });
        document.getElementById('date-pill-forward').addEventListener('click', function () {
            openTimelineModal();
        });
        document.getElementById('events-close').addEventListener('click', function () {
            document.getElementById('events-modal').classList.remove('open');
        });
        document.getElementById('events-prev-round').addEventListener('click', function () {
            if (viewingHistoryIndex > 0) openEventsModalForRound(viewingHistoryIndex - 1);
        });
        document.getElementById('events-jump-btn').addEventListener('click', function () {
            if (viewingHistoryIndex < GameState.history.length - 1) {
                openEventsModalForRound(viewingHistoryIndex + 1);
            } else {
                document.getElementById('events-modal').classList.remove('open');
                openTimelineModal();
            }
        });
        document.getElementById('events-save-btn').addEventListener('click', function () {
            saveGameState();
            const btn = document.getElementById('events-save-btn');
            const original = btn.textContent;
            btn.textContent = 'Saved ✓';
            setTimeout(function () { btn.textContent = original; }, 1200);
        });
        document.getElementById('timeline-close').addEventListener('click', function () {
            document.getElementById('timeline-modal').classList.remove('open');
        });
    }

    function openTimelineModal() {
        const track = document.getElementById('timeline-track');
        track.innerHTML = '';

        const majorBtn = document.createElement('button');
        majorBtn.type = 'button';
        majorBtn.className = 'timeline-major-btn';
        majorBtn.textContent = 'To Next Major Event';
        majorBtn.addEventListener('click', function () { runJumpForward(null); });
        track.appendChild(majorBtn);

        const orLabel = document.createElement('div');
        orLabel.className = 'timeline-or';
        orLabel.textContent = 'OR';
        track.appendChild(orLabel);

        const nowNode = document.createElement('div');
        nowNode.className = 'timeline-now-node';
        nowNode.innerHTML = '<div>NOW</div><div>' + formatDateShort(GameState.currentDate) + '</div>';
        track.appendChild(nowNode);

        const presets = [
            { label: '1 week', amount: 1, unit: 'weeks' },
            { label: '1 month', amount: 1, unit: 'months' },
            { label: '3 months', amount: 3, unit: 'months' },
            { label: '6 months', amount: 6, unit: 'months' },
            { label: '1 year', amount: 1, unit: 'years' }
        ];
        presets.forEach(function (p) {
            const connector = document.createElement('div');
            connector.className = 'timeline-connector';
            track.appendChild(connector);

            const days = p.unit === 'weeks' ? p.amount * 7 : 0;
            const target = p.unit === 'weeks' ? addToDate(GameState.currentDate, days, 'days') : addToDate(GameState.currentDate, p.amount, p.unit);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'timeline-option-btn';
            btn.innerHTML = '<div class="tob-date">' + formatDateShort(target) + '</div><div class="tob-label">' + p.label + '</div>';
            btn.addEventListener('click', function () { runJumpForward(target); });
            track.appendChild(btn);
        });

        const connector2 = document.createElement('div');
        connector2.className = 'timeline-connector';
        track.appendChild(connector2);
        const customRow = document.createElement('div');
        customRow.className = 'timeline-custom-row';
        const customInput = document.createElement('input');
        customInput.type = 'date';
        customInput.className = 'game-input';
        customInput.value = addToDate(GameState.currentDate, 1, 'months');
        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.className = 'game-btn primary';
        customBtn.textContent = 'Go';
        customBtn.addEventListener('click', function () { runJumpForward(customInput.value); });
        customRow.appendChild(customInput);
        customRow.appendChild(customBtn);
        track.appendChild(customRow);

        document.getElementById('timeline-modal').classList.add('open');
    }

    // Builds the country context (province name lists) to include for any country
    // explicitly mentioned in this round's pending actions or active chat threads,
    // so the AI has real ground-truth province names to reference for map changes
    // without needing every one of the ~49k provinces on Earth in the prompt.
    function buildRelevantCountryContext() {
        const mentioned = new Set();
        if (GameState.playerCountry) mentioned.add(GameState.playerCountry);
        GameState.chatThreads.forEach(function (t) { t.participants.forEach(function (c) { mentioned.add(c); }); });
        const haystack = GameState.pendingActions.map(function (a) { return a.text; }).join(' ').toLowerCase();
        for (const code in countryLookup) {
            if (haystack.includes(countryLookup[code].toLowerCase())) mentioned.add(code);
        }
        // Also catch actions that name specific states/provinces without naming
        // their owning country at all (e.g. "invade Lubusz and West Pomeranian" —
        // real Polish voivodeships, but the word "Poland" never appears). Without
        // this, that country's province/region lists never make it into the
        // prompt, and the system prompt explicitly forbids mapChanges for a
        // country whose lists weren't given — so an invasion the AI narrates as
        // happening never actually moves the border on the map.
        if (worldRegions && haystack) {
            for (const code in worldRegions) {
                if (mentioned.has(code)) continue;
                const regionNames = Object.keys(worldRegions[code]);
                for (let i = 0; i < regionNames.length; i++) {
                    if (haystack.includes(regionNames[i].toLowerCase())) {
                        mentioned.add(code);
                        break;
                    }
                }
            }
        }
        let context = '';
        mentioned.forEach(function (code) {
            const provinces = getProvinceNamesForCountry(code, 40);
            if (provinces.length) {
                context += '\n' + (countryLookup[code] || code) + ' provinces/states: ' + provinces.join(', ');
            }
            const regions = getRegionNamesForCountry(code, 60);
            if (regions.length) {
                context += '\n' + (countryLookup[code] || code) + ' regions/states/provinces (for regionChanges): ' + regions.join(', ');
            }
        });
        return context;
    }

    // ==========================================================================
    // One-event-at-a-time reveal ("Timeline" modal): Jump Forward gets the AI's
    // full batch of events back in one call as before, but instead of applying
    // and committing all of them immediately, they're applied and shown ONE AT
    // A TIME so the player can stop the sequence with Intervene before a not-
    // yet-shown event takes effect. Next Event commits the currently-shown
    // event (its effects stay applied) and reveals the next one. Intervene
    // rolls back ONLY the currently-shown event's effects (whatever came before
    // it in this batch stays committed and remembered) and ends the round here.
    // ==========================================================================

    // Applies one raw AI event's effects and returns it in the same shape the
    // event log/UI has always expected. Factored out of runJumpForward() so
    // the reveal flow below can apply events one at a time instead of all at
    // once — the logic itself is unchanged from before.
    function processEvent(ev, i, fromDate) {
        let applied = ev.mapChanges && ev.mapChanges.length ? applyMapChanges(ev.mapChanges) : [];
        if (ev.regionChanges && ev.regionChanges.length) {
            applied = applied.concat(applyRegionChanges(ev.regionChanges));
        }
        if (ev.countryChanges && ev.countryChanges.length) {
            applied = applied.concat(applyCountryChanges(ev.countryChanges));
        }
        if (ev.diplomaticChanges && ev.diplomaticChanges.length) {
            applyDiplomaticChanges(ev.diplomaticChanges);
        }
        if (ev.allianceChanges && ev.allianceChanges.length) {
            applyAllianceChanges(ev.allianceChanges);
        }
        if (ev.altNames && ev.altNames.length) {
            ev.altNames.forEach(function (an) {
                const code = resolveCountryCode(an.country);
                if (!code || !an.name) return;
                if (!GameState.countryAltNames[code]) GameState.countryAltNames[code] = [];
                if (GameState.countryAltNames[code].indexOf(an.name) === -1) {
                    GameState.countryAltNames[code].push(an.name);
                }
            });
        }
        // Battalion/unit spawns — the actual map-placement bridge lives in
        // world_map_webgl.html (spawnUnit(), exposed as window.spawnUnit since
        // that file's top-level functions aren't otherwise reachable from
        // inside this IIFE). Resolved/newly-minted country codes from this
        // same event's mapChanges/regionChanges are already applied above,
        // so a spawn for a brand-new nation formed earlier in this event
        // resolves correctly here too.
        if (ev.unitSpawns && ev.unitSpawns.length && typeof window.spawnUnit === 'function') {
            ev.unitSpawns.forEach(function (spawn) {
                if (!spawn || !spawn.name || !spawn.location) return;
                const code = getOrCreateCountryCode(spawn.country);
                window.spawnUnit(spawn.name, spawn.location, code);
            });
        }
        // Unit dissolutions — the mirror of unitSpawns. Typically triggered
        // after a campaign concludes (e.g. "the invasion force is disbanded")
        // rather than persisting forever as an inert marker. The actual
        // lookup/removal logic lives in world_map_webgl.html (dissolveUnit(),
        // exposed as window.dissolveUnit), which matches by unit name with
        // lenient substring matching to handle minor narration variations.
        if (ev.unitDissolutions && ev.unitDissolutions.length && typeof window.dissolveUnit === 'function') {
            ev.unitDissolutions.forEach(function (dissolution) {
                if (!dissolution || !dissolution.name) return;
                window.dissolveUnit(dissolution.name);
            });
        }
        if (ev.governmentChanges && ev.governmentChanges.length) {
            ev.governmentChanges.forEach(function (gov) {
                if (!gov || !gov.country || !gov.type) return;
                const code = getOrCreateCountryCode(gov.country);
                setGovernmentType(code, gov.type, ev.date || fromDate);
                // An explicit LLM-supplied local flag key wins over anything
                // automatic — see isValidFlagOverride() for the strict
                // "local path or data: URI only" check that keeps this from
                // ever becoming a CDN/remote-URL vector. gov.flag arrives as
                // a bare "TAG/name.ext" key (per the system prompt); this
                // file sits at the project root, so the assets/flags/ prefix
                // is added here, with no "../". Without an explicit flag,
                // try the flagCatalog first (works for real established
                // countries too, e.g. Germany 1914 vs 1939 vs modern —
                // maybeAssignTriggeredFlag below only ever applies to
                // brand-new custom/fictional countries and has no way to
                // pick a REAL historical flag), then the real US-state/
                // European-region catalog, then the community
                // catalog, both by name match, then finally fall back to the
                // generic regime-type-triggered palette.
                if (gov.flag && isKnownFlagAssetKey(gov.flag)) {
                    setCountryFlagOverride(code, 'assets/flags/' + gov.flag);
                } else {
                    const catalogEntry = findBestFlagEntry(code, ev.date || fromDate, [gov.type]);
                    if (catalogEntry) {
                        setCountryFlagOverride(code, 'assets/flags/' + code + '/' + catalogEntry.file, true);
                    } else {
                        // No real historical flag on record for this code —
                        // try the real US-state/European-region catalog, then
                        // the community catalog (e.g. a
                        // custom/fictional country's name matching either),
                        // before falling back to the hand-rendered
                        // regime-type palette. See findBestSubnationalFlagEntry()
                        // / findBestCommunityFlagEntry() for match confidence rules.
                        const displayName = countryLookup[code] || gov.country;
                        const subnationalEntry = findBestSubnationalFlagEntry(displayName);
                        const communityEntry = subnationalEntry ? null : findBestCommunityFlagEntry(displayName);
                        if (subnationalEntry) setCountryFlagOverride(code, 'assets/flags_subnational/' + subnationalEntry.file, true);
                        else if (communityEntry) setCountryFlagOverride(code, 'assets/flags_community/' + communityEntry.file, true);
                        else maybeAssignTriggeredFlag(code, gov.type);
                    }
                }
            });
        }
        return {
            id: 'ev-' + Date.now() + '-' + i,
            date: ev.date || fromDate,
            tags: ev.tags || [],
            headline: ev.headline || 'Untitled Event',
            body: ev.body || '',
            mapChanges: applied,
            altNames: ev.altNames || [],
            unitSpawns: ev.unitSpawns || [],
            governmentChanges: ev.governmentChanges || [],
            diplomaticChanges: ev.diplomaticChanges || [],
            allianceChanges: ev.allianceChanges || []
        };
    }

    // Captures everything a single event's processEvent() call can mutate, so
    // Intervene can put it all back exactly as it was before that one event.
    // Deliberately whole-state-copy rather than tracking individual diffs —
    // far less likely to miss a field as new event types get added later.
    function snapshotMutableGameState() {
        return {
            provinceOwnerOverrides: Object.assign({}, GameState.provinceOwnerOverrides),
            polityRelationships: JSON.parse(JSON.stringify(GameState.polityRelationships || {})),
            countryAltNames: JSON.parse(JSON.stringify(GameState.countryAltNames || {})),
            governmentTypes: JSON.parse(JSON.stringify(GameState.governmentTypes || {})),
            countryFlagOverrides: JSON.parse(JSON.stringify(GameState.countryFlagOverrides || {})),
            autoAssignedFlags: JSON.parse(JSON.stringify(GameState.autoAssignedFlags || {})),
            alliances: JSON.parse(JSON.stringify(GameState.alliances || [])),
            units: (typeof window.getUnitsSnapshot === 'function') ? window.getUnitsSnapshot() : null
        };
    }

    // Restores exactly what snapshotMutableGameState() captured. Any
    // provinceOwnerOverrides entry that didn't exist in the snapshot was
    // created by the event being rolled back, so it's cleared back to that
    // shape's natural (shapeGroup-based) color/tooltip rather than just
    // deleted-and-left-stale; everything else is a straight restore, then a
    // single repaint pass — restyleOverriddenMunicipalities() mirrors exactly
    // what a fresh page load already does for a saved game's overrides (see
    // world_map_webgl.html), so reusing it here keeps this in one place.
    function restoreMutableGameState(snap) {
        Object.keys(provinceOwnerOverrides).forEach(function (shapeID) {
            if (snap.provinceOwnerOverrides.hasOwnProperty(shapeID)) return;
            delete provinceOwnerOverrides[shapeID];
            delete GameState.provinceOwnerOverrides[shapeID];
            const props = findPropsByShapeID(shapeID);
            const layer = provinceLayerById[shapeID];
            if (layer && props) {
                layer.setStyle({ fillColor: getCountryColor(props.shapeGroup) });
                if (layer.setTooltipContent) {
                    layer.setTooltipContent(
                        '<strong>' + props.shapeName + '</strong><br/><span style="color:#9ca3af;">' +
                        (countryLookup[props.shapeGroup] || props.shapeGroup) + ' (' + (props.shapeType || 'ADM2') + ')</span>'
                    );
                }
            }
        });
        Object.keys(snap.provinceOwnerOverrides).forEach(function (shapeID) {
            provinceOwnerOverrides[shapeID] = snap.provinceOwnerOverrides[shapeID];
            GameState.provinceOwnerOverrides[shapeID] = snap.provinceOwnerOverrides[shapeID];
        });
        GameState.polityRelationships = snap.polityRelationships;
        GameState.countryAltNames = snap.countryAltNames;
        GameState.governmentTypes = snap.governmentTypes;
        GameState.countryFlagOverrides = snap.countryFlagOverrides;
        GameState.autoAssignedFlags = snap.autoAssignedFlags;
        GameState.alliances = snap.alliances;
        if (snap.units && typeof window.restoreUnits === 'function') window.restoreUnits(snap.units);
        if (typeof restyleOverriddenMunicipalities === 'function') restyleOverriddenMunicipalities();
        rebuildCountryLayers();
    }

    let eventReveal = null; // { events, index, committed, fromDate, toDate, snapshot, currentProcessed }

    function beginEventReveal(events, fromDate, toDate) {
        eventReveal = { events: events || [], index: 0, committed: [], fromDate: fromDate, toDate: toDate, snapshot: null, currentProcessed: null };
        document.getElementById('event-reveal-from').textContent = 'from ' + formatDateLong(fromDate);
        document.getElementById('event-reveal-modal').classList.add('open');
        if (eventReveal.events.length) {
            showCurrentRevealEvent();
        } else {
            finalizeEventReveal();
        }
    }

    function showCurrentRevealEvent() {
        const ev = eventReveal.events[eventReveal.index];
        eventReveal.snapshot = snapshotMutableGameState();
        eventReveal.currentProcessed = processEvent(ev, eventReveal.index, eventReveal.fromDate);

        const body = document.getElementById('event-reveal-body');
        body.innerHTML = '';
        body.appendChild(buildEventCard(eventReveal.currentProcessed));

        document.getElementById('event-reveal-progress').textContent =
            'Event ' + (eventReveal.index + 1) + ' of ' + eventReveal.events.length;
        document.getElementById('event-reveal-next-btn').textContent =
            (eventReveal.index === eventReveal.events.length - 1) ? 'Finish »' : 'Next Event ›';
    }

    function advanceEventReveal() {
        eventReveal.committed.push(eventReveal.currentProcessed);
        eventReveal.index += 1;
        if (eventReveal.index < eventReveal.events.length) {
            showCurrentRevealEvent();
        } else {
            finalizeEventReveal();
        }
    }

    function interveneEventReveal() {
        restoreMutableGameState(eventReveal.snapshot);
        finalizeEventReveal();
    }

    function finalizeEventReveal() {
        document.getElementById('event-reveal-modal').classList.remove('open');
        const committed = eventReveal.committed;
        const fromDate = eventReveal.fromDate, toDate = eventReveal.toDate;
        eventReveal = null;

        GameState.history.push({
            round: GameState.round, fromDate: fromDate, toDate: toDate, events: committed,
            actionsSubmitted: GameState.pendingActions.map(function (a) { return a.text; })
        });
        GameState.round += 1;
        GameState.currentDate = toDate;
        GameState.pendingActions = [];
        saveGameState();
        // Not awaited on purpose — consolidation is a background AI call that
        // shouldn't hold up the player seeing this round's results. It
        // re-saves GameState itself once it resolves.
        maybeConsolidateHistory();
        renderDatePill();
        renderPendingActions();
        renderPreviousActions();
        openEventsModalForRound(GameState.history.length - 1);
    }

    function initEventRevealModal() {
        document.getElementById('event-reveal-close').addEventListener('click', function () {
            if (eventReveal) interveneEventReveal();
        });
        document.getElementById('event-reveal-intervene-btn').addEventListener('click', interveneEventReveal);
        document.getElementById('event-reveal-next-btn').addEventListener('click', advanceEventReveal);
    }

    // JSON Schema fragments for Cheats > AI Setup > "Use structured JSON
    // output" (see callAI()'s response_format wiring above) — mirrors the
    // exact shape described in prose in runJumpForward()'s/initCheatsGameMaster()'s
    // system prompts, so both the schema and the fallback prose instructions
    // stay in sync if that shape ever changes. Every array field is left
    // optional (not everything needs to be in "required") since most events
    // legitimately have most of these empty — only the fields every event
    // genuinely always has (date/headline/body) are required.
    // Enum-constrained where the prose system prompt already names a fixed
    // value set — under structured output this makes an invented value (a
    // real response set diplomaticChanges relationship:"overlord", which
    // isn't one of the allowed values and is nonsensical: "overlord" is
    // supposed to be a SEPARATE field naming the controlling country, not a
    // relationship type itself) mechanically impossible at the decoding
    // level, not just discouraged in prose.
    const RELATIONSHIP_ENUM = ['independent', 'puppet', 'protectorate', 'vassal', 'autonomous'];
    const GOVERNMENT_TYPE_ENUM = ['monarchy', 'republic', 'military junta', 'communist state', 'revolutionary government', 'provisional government', 'colonial administration', 'other'];
    const MAP_CHANGE_SCHEMA = { type: 'object', properties: { province: { type: 'string' }, fromCountry: { type: 'string' }, toCountry: { type: 'string' } }, required: ['province', 'toCountry'] };
    const REGION_CHANGE_SCHEMA = { type: 'object', properties: { country: { type: 'string' }, region: { type: 'string' }, toCountry: { type: 'string' }, relationship: { type: 'string', enum: RELATIONSHIP_ENUM }, overlord: { type: 'string' } }, required: ['country', 'region', 'toCountry'] };
    const COUNTRY_CHANGE_SCHEMA = { type: 'object', properties: { country: { type: 'string' }, toCountry: { type: 'string' } }, required: ['country', 'toCountry'] };
    // "overlord" is schema-required (not just optional) specifically so
    // structured output can't produce a non-independent relationship with a
    // missing overlord the way free-text generation did (see
    // applyDiplomaticChanges()'s own runtime guard for the same protection
    // when structured output is off) — for relationship:"independent" the
    // value is simply unused, so requiring a (possibly empty) string here is
    // harmless.
    const DIPLOMATIC_CHANGE_SCHEMA = { type: 'object', properties: { country: { type: 'string' }, relationship: { type: 'string', enum: RELATIONSHIP_ENUM }, overlord: { type: 'string' } }, required: ['country', 'relationship', 'overlord'] };
    const TERRITORY_CHANGE_PROPERTIES = {
        mapChanges: { type: 'array', items: MAP_CHANGE_SCHEMA },
        regionChanges: { type: 'array', items: REGION_CHANGE_SCHEMA },
        countryChanges: { type: 'array', items: COUNTRY_CHANGE_SCHEMA },
        diplomaticChanges: { type: 'array', items: DIPLOMATIC_CHANGE_SCHEMA }
    };
    const JUMP_FORWARD_EVENT_SCHEMA = {
        type: 'object',
        properties: Object.assign({
            date: { type: 'string' },
            tags: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, label: { type: 'string' } }, required: ['type', 'label'] } },
            headline: { type: 'string' },
            body: { type: 'string' },
            allianceChanges: {
                type: 'array', items: {
                    type: 'object',
                    properties: {
                        alliance: { type: 'string' }, leader: { type: 'string' },
                        members: { type: 'array', items: { type: 'object', properties: { country: { type: 'string' }, rank: { type: 'string' } }, required: ['country'] } },
                        removeMembers: { type: 'array', items: { type: 'string' } },
                        disband: { type: 'boolean' }
                    },
                    required: ['alliance']
                }
            },
            unitSpawns: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, location: { type: 'string' }, country: { type: 'string' } }, required: ['name', 'location', 'country'] } },
            unitDissolutions: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
            governmentChanges: { type: 'array', items: { type: 'object', properties: { country: { type: 'string' }, type: { type: 'string', enum: GOVERNMENT_TYPE_ENUM }, flag: { type: 'string' } }, required: ['country', 'type'] } },
            altNames: { type: 'array', items: { type: 'object', properties: { country: { type: 'string' }, name: { type: 'string' } }, required: ['country', 'name'] } }
        }, TERRITORY_CHANGE_PROPERTIES),
        required: ['date', 'headline', 'body']
    };
    const JUMP_FORWARD_JSON_SCHEMA = { name: 'jump_forward_response', schema: { type: 'object', properties: { toDate: { type: 'string' }, events: { type: 'array', items: JUMP_FORWARD_EVENT_SCHEMA } }, required: ['toDate', 'events'] } };
    const GAME_MASTER_JSON_SCHEMA = { name: 'game_master_response', schema: { type: 'object', properties: TERRITORY_CHANGE_PROPERTIES, required: [] } };

    // Cheats > Difficulty guidance, appended to the system prompt in
    // runJumpForward() below. 'normal' is deliberately terse — it's the
    // engine's existing unmodified balance, so an old save with no difficulty
    // field (or one left on Normal) sees no behavior change at all.
    const DIFFICULTY_PROMPT_TEXT = {
        very_easy: 'Difficulty: Very Easy. Give the player\'s plans the benefit of the doubt — let ambitious or unlikely schemes largely succeed, and keep opposition to them light and easily overcome.',
        easy: 'Difficulty: Easy. Favor the player somewhat — their actions should mostly succeed, with only occasional, minor setbacks.',
        normal: 'Difficulty: Normal. Judge the player\'s actions the same as any other polity\'s — plausibility, resources, and opposing strength decide the outcome, with no thumb on the scale either way.',
        hard: 'Difficulty: Hard. Rival polities act competently and react intelligently to the player. The player\'s plans need real merit (detail, resources, timing) to succeed, and setbacks should be common when they don\'t.',
        impossible: 'Difficulty: Impossible. The world is actively unfavorable to the player. Rivals coordinate against them, capable opposition is the default assumption, and even well-planned actions should frequently run into serious complications.'
    };

    // Deterministic territorial-action ENGAGEMENT guard (not a geography/
    // adjacency check — see this session's plan file for why that's a
    // separate, deferred concern). This only verifies that when the player
    // gives an unambiguous invasion/annexation order, the AI's response
    // contains SOME real, structurally-VALID territorial/military effect
    // against that target somewhere in its events — trusting whatever
    // province/region/unit name the AI itself picked, exactly like every
    // other action already does. Catches two distinct observed failure
    // modes with the same check: the AI declining to engage at all
    // (narrating "diplomatic talks continue" with zero mapChanges/
    // unitSpawns), and the AI attempting a change but emitting a malformed
    // entry that silently no-ops — e.g. a real response to "annexes Namen
    // in belgium" came back with regionChanges: [{"country":"France",
    // "region":"Namen","toCountry":null}], which is backwards (the
    // schema's "country" field is the CURRENT owner, so this should have
    // been "Belgium") and has toCountry:null instead of a real target —
    // applyRegionChanges() silently drops that entry (findRegionShapeIDs
    // for France's "Namen" finds nothing), so the map never changed and
    // nothing in the app said why. eventEngagesTarget() below resolves
    // both fields through resolveCountryCode() and requires an actual
    // match against the target ISO, so a backwards/null entry like that
    // correctly counts as "not engaged" and triggers a retry instead of
    // silently doing nothing.
    // "invade"-class verbs describe an ATTEMPT that can legitimately fail —
    // a unit spawning at the border with no territory changing hands is a
    // real, valid "repelled" outcome, so unitSpawns alone counts as
    // engagement. "annex"-class verbs describe a claimed OWNERSHIP change —
    // there's no such thing as a legitimate "attempted but repelled
    // annexation" the way there is for an invasion, so a unit spawning
    // without an actual matching territorial-change entry is exactly what
    // the broken "annexes Namen" response above looked like (a unitSpawns
    // entry present, but the only regionChanges entry was backwards/null)
    // and must NOT count as engaged.
    const INVASION_VERBS = ['invade', 'invasion', 'attack', 'assault', 'conquer', 'seize', 'storm', 'march into', 'march on'];
    const ANNEXATION_VERBS = ['annex', 'annexes', 'annexation'];
    function detectInvasionTargets(actionText) {
        const lower = (actionText || '').toLowerCase();
        const isAnnexation = ANNEXATION_VERBS.some(function (v) { return lower.indexOf(v) !== -1; });
        const isInvasion = INVASION_VERBS.some(function (v) { return lower.indexOf(v) !== -1; });
        if (!isAnnexation && !isInvasion) return [];
        const targets = [];
        for (const code in countryLookup) {
            if (code === GameState.playerCountry) continue;
            if (lower.indexOf(countryLookup[code].toLowerCase()) !== -1) targets.push({ code: code, requireTerritoryChange: isAnnexation });
        }
        return targets;
    }
    function eventEngagesTarget(ev, targetISO, attackerISO, requireTerritoryChange) {
        function matches(name) { return name && resolveCountryCode(name) === targetISO; }
        function matchesAttacker(name) { return name && resolveCountryCode(name) === attackerISO; }
        const hasTerritoryChange =
            (ev.mapChanges || []).some(function (c) { return matches(c.fromCountry) || matches(c.toCountry); }) ||
            (ev.regionChanges || []).some(function (c) { return matches(c.country) || matches(c.toCountry); }) ||
            (ev.countryChanges || []).some(function (c) { return matches(c.country) || matches(c.toCountry); });
        if (hasTerritoryChange) return true;
        if (requireTerritoryChange) return false;
        return !!(attackerISO && (ev.unitSpawns || []).some(function (u) { return matchesAttacker(u.country); }));
    }

    async function runJumpForward(targetDateOrNull) {
        document.getElementById('timeline-modal').classList.remove('open');
        document.getElementById('simulating-overlay').classList.add('open');

        try {
            const playerName = GameState.playerCountry ? (countryLookup[GameState.playerCountry] || GameState.playerCountry) : 'the player nation';
            const actionsText = GameState.pendingActions.length
                ? GameState.pendingActions.map(function (a, i) { return (i + 1) + '. ' + a.text; }).join('\n')
                : '(No actions were submitted this round — simulate plausible autonomous world developments instead.)';
            const chatSummary = GameState.chatThreads.map(function (t) {
                const last = t.messages.slice(-6).map(function (m) { return (m.sender === 'player' ? playerName : (countryLookup[m.sender] || m.sender)) + ': ' + m.text; }).join('\n');
                return t.title + ':\n' + last;
            }).join('\n\n');
            const countryContext = buildRelevantCountryContext();
            const recentHistory = summarizeRecentHistory(2);
            const knownFlagsText = buildKnownFlagsPromptText();

            const targetInstruction = targetDateOrNull
                ? ('Simulate events from ' + GameState.currentDate + ' up to and including ' + targetDateOrNull + '.')
                : ('Simulate events from ' + GameState.currentDate + ' forward until the next genuinely significant/major event occurs (use your judgement for how much time that takes — usually days to a few weeks), then stop.');

            const systemPrompt =
                'You are the game master AI for an alternate-history grand strategy role-play game. ' +
                'The player controls ' + playerName + '. ' + targetInstruction + ' ' +
                'Resolve the player\'s submitted actions and any ongoing diplomatic conversations into a sequence ' +
                'of concrete narrative events, each with a specific date in the range. ' +
                'Judge outcomes by how much real strategic/tactical detail the player actually gave, not just by ' +
                'what they said they want to happen. A vague one-liner (e.g. "we invade X" or "we attack the border ' +
                'province") should have an uncertain or even unfavorable outcome — do not treat stating an intent as ' +
                'guaranteeing its success. A detailed submission that addresses things like force size, overall ' +
                'strategy, battlefield tactics, logistics/supply lines and equipment, officer/troop quality and ' +
                'training, how enemy counterattacks and defenses are accounted for, and air/naval support (as ' +
                'applicable to the era) should be rewarded with a meaningfully better chance of a favorable, more ' +
                'specific outcome. Reference the specific details the player gave in the event\'s narrative body so ' +
                'it\'s clear their planning mattered. "Uncertain outcome" for a vague action means the ATTEMPT still ' +
                'happens and is narrated (troops move, fighting breaks out, ground is gained or lost, a demand is ' +
                'delivered) with a less favorable or partial result — it does NOT mean silently ignoring the action ' +
                'and narrating something else instead (e.g. diplomacy continuing) as if it were never given. If the ' +
                'player\'s action explicitly ends or overrides an ongoing diplomatic conversation (e.g. "break off ' +
                'talks and invade"), the events must show that actually happening, not a continuation of the old ' +
                'diplomatic status quo — an active chat thread is background context for tone/relationships, never a ' +
                'reason to override what the player just ordered this round. Some events may transfer ' +
                'named provinces/states between countries — ONLY do this using the EXACT province names given to ' +
                'you below (never invent a province name), and only for countries whose province lists are given. ' +
                'toCountry (in both mapChanges and regionChanges below) does NOT have to already exist — if an ' +
                'event is a secession, revolution, or new nation forming, just give the new nation\'s name as ' +
                'toCountry and it will be created automatically; do not skip or water down a secession/independence ' +
                'event just because the new country isn\'t on any existing list. ' +
                'For a WHOLE state/province/region changing hands or seceding (not just one county/district), in ANY ' +
                'country in the world (not just the US — e.g. Aragon or Catalonia from Spain, a German state, an ' +
                'Indian state, etc.), use regionChanges instead of enumerating every sub-division: ' +
                '{"country":"Country Name","region":"Exact Region Name","toCountry":"Country Name or new nation name"}. ' +
                'In BOTH mapChanges and regionChanges, "country"/"fromCountry" is always the CURRENT owner losing the ' +
                'territory — e.g. for "France annexes Namen from Belgium," country/fromCountry is "Belgium" (the ' +
                'loser) and toCountry is "France" (the winner), never the reverse. Both fields are required strings ' +
                'when you include an entry at all — never write null/empty for toCountry. If an attempted invasion/ ' +
                'annexation FAILS (no territory actually changes hands), do not include a mapChanges/regionChanges ' +
                'entry for it at all — omit it entirely rather than including a placeholder with a missing or null ' +
                'toCountry, which is never valid. ' +
                'Only use a region name that appears in the "regions/states/provinces" list given to you below for ' +
                'that country — never invent one; if a country\'s region list isn\'t given, use mapChanges with ' +
                'individual named provinces instead, or omit the change. ' +
                'A region/province change can also establish a dynamic diplomatic relationship instead of full ' +
                'independence — e.g. the player says "Spain releases Catalonia as a protectorate" or "we grant ' +
                'Aragon independence": add "relationship" (one of "independent", "puppet", "protectorate", "vassal", ' +
                '"autonomous") and, if not independent, "overlord" (the controlling country\'s name, usually the ' +
                'original owner) to that regionChanges entry. Omit "relationship" (or use "independent") for a ' +
                'clean, fully free secession with no strings attached. This relationship field also applies when a ' +
                'whole new country is formed via mapChanges/regionChanges as someone else\'s puppet. ' +
                'For annexing or merging an ENTIRE existing country\'s territory into another in a single directive ' +
                '(e.g. "annex all of Switzerland", "Germany absorbs Austria completely") — not just one region — use ' +
                'a "countryChanges" array instead of enumerating every one of that country\'s regions yourself: ' +
                '{"country":"Country Name","toCountry":"Country Name"}. This transfers ALL of that country\'s ' +
                'current territory in one step; use it ONLY for a full, unconditional annexation/merger, never a ' +
                'partial land grab (use mapChanges/regionChanges for a partial one instead). ' +
                'A country can also become a puppet/vassal/protectorate/autonomous region of another, or be ' +
                'released back to full independence, WITHOUT any territory changing hands at all — e.g. "Germany ' +
                'makes Poland a puppet" while Poland keeps its own borders and government exactly as they are. Use a ' +
                '"diplomaticChanges" array for this: {"country":"Country Name","relationship":"puppet|vassal|' +
                'protectorate|autonomous|independent","overlord":"Country Name (omit when relationship is ' +
                'independent)"}. "overlord" is REQUIRED and must be a real country whenever relationship is ' +
                'anything other than "independent" — a puppet/vassal/protectorate/autonomous relationship with no ' +
                'overlord named is meaningless and will be dropped entirely, so never omit it or leave it blank ' +
                'except for "independent". Use "independent" to end an existing relationship (fully release that country). ' +
                'Never use diplomaticChanges to describe territory actually changing hands — that always belongs in ' +
                'mapChanges/regionChanges/countryChanges instead; diplomaticChanges is ONLY for a pure status change ' +
                'with no land moving. ' +
                'When a country is FULLY conquered and turned into a puppet/protectorate in the same stroke (not ' +
                'merely given puppet status while keeping its own name/government, and not merely losing some ' +
                'territory) — e.g. "France conquers Belgium and installs a puppet regime" — prefer DISSOLVING the ' +
                'old country and replacing it with a newly-named successor state, rather than just puppeting the ' +
                'existing country under its old name: use countryChanges with toCountry set to a NEW descriptive ' +
                'name (e.g. "French Protectorate of Belgium", not plain "Belgium") to transfer all of the old ' +
                'country\'s territory to that new name (this mints it automatically), THEN a diplomaticChanges ' +
                'entry putting that SAME new name under the conquering country as overlord. This produces a ' +
                'cleaner, more historically legible result (a distinct successor entity, like Vichy France or a ' +
                'colonial protectorate, rather than the original country just wearing a puppet tag) and gives the ' +
                'new state its own flag/color instead of inheriting the conquered country\'s old one. Only use this ' +
                'pattern for a full conquest-into-puppet in one action — a partial territory loss, or a puppet ' +
                'status granted without conquest, should still use the simpler existing-country diplomaticChanges ' +
                'form described above. ' +
                'The player may found, rename the membership of, or disband a named alliance/bloc/organization (e.g. ' +
                '"found the World Peace Corps and invite Poland, Italy, and Russia") — use an "allianceChanges" ' +
                'array for this, NEVER mapChanges/regionChanges/countryChanges/diplomaticChanges/governmentChanges: ' +
                'an alliance is an organization, not a country, and must never be given territory, a government ' +
                'type, or treated as a country in toCountry/country fields elsewhere. Each entry: {"alliance":' +
                '"Exact Alliance Name","leader":"Country Name (optional — the leading/founding nation, if any)",' +
                '"members":[{"country":"Country Name","rank":"short rank/role label"}],"removeMembers":["Country ' +
                'Name", ...],"disband":true (optional)}. "alliance" must match an EXISTING alliance\'s name exactly ' +
                '(case-insensitive) to update it, or a NEW name to found one. "rank" is free-form — invent whatever ' +
                'fits the alliance\'s character (e.g. "Founding Member", "Core Member", "Synchronized Partner", ' +
                '"Vassal", "Protectorate", "Observer") rather than always using the same generic word. Set ' +
                '"disband":true to dissolve an existing alliance entirely (omit "members"/"leader" when disbanding). ' +
                'Every member in "members"/"removeMembers" must be a real, already-established country — never a ' +
                'newly-invented name (found a new COUNTRY via mapChanges/regionChanges/countryChanges instead if ' +
                'that\'s actually what\'s happening). Omit allianceChanges entirely on most events. ' +
                'An event may also place new military units (battalions/militias) on the map via a "unitSpawns" ' +
                'array. If the player\'s action or the simulated timeline events describe military troops, ' +
                'militias, or battalions spawning or being raised at a location, you MUST populate the unitSpawns ' +
                'array with a descriptive name (e.g. "Texas 10k Militia"), the city or province name, and the ' +
                'country\'s display name. This applies to an INVASION exactly as much as a domestic militia — ' +
                '"France invades with 120,000 troops" MUST include a unitSpawns entry (e.g. {"name":"French 120k ' +
                'Invasion Force","location":"<a real border province/city name>","country":"France"}) placing that ' +
                'force at the border province it crosses from; narrating an invasion in prose without a matching ' +
                'unitSpawns entry is a mistake, not an acceptable shortcut. If no units are raised, keep this array ' +
                'empty — do not invent a spawn for every event. "location" must be the EXACT name of a known city ' +
                'or province/region given to you elsewhere in this prompt (never invent a place name); "country" is ' +
                'the owning country\'s name at the time of the spawn (may be a brand-new nation formed earlier in ' +
                'this same response). ' +
                'An event may also REMOVE/DISSOLVE previously spawned military units via a "unitDissolutions" array ' +
                '(the inverse of unitSpawns). If the player\'s action or the simulated timeline describes units being ' +
                'disbanded, demobilized, or removed after a campaign concludes, include a unitDissolutions entry with ' +
                'the unit\'s name — e.g. {"name":"French 120k Invasion Force"} dissolves that same unit spawned in an ' +
                'earlier event. Matching is lenient (substring-based), so minor variations in narration (e.g. "the ' +
                'invasion force" vs "French Invasion Force") are tolerated. If units are NOT being dissolved, keep this ' +
                'array empty — do not invent a dissolution. ' +
                'An event may also record a change in a country\'s form of government via a "governmentChanges" ' +
                'array — use this ONLY for a genuine regime-defining moment (a coup, a revolution overthrowing the ' +
                'government, a monarchy restored or abolished, a republic declared, a military junta seizing power, ' +
                'a communist/one-party state established, etc), never for routine elections or policy changes. Each ' +
                'entry needs "country" (the country\'s display name) and "type" — one of "monarchy", "republic", ' +
                '"military junta", "communist state", "revolutionary government", "provisional government", ' +
                '"colonial administration", or "other". The correct flag for the country/date/regime-type is ' +
                'usually picked automatically — you do NOT need to specify one. Only include an optional "flag" ' +
                'field to force a SPECIFIC flag when you have a concrete reason the automatic pick would be wrong ' +
                '(e.g. two rival flags existed at once, like a Nationalist vs Republican Spain in the same year). ' +
                'These EXACT keys are the only ones that exist as local flag assets if you do: ' +
                knownFlagsText + ' (or "TAG/default.png" for any real country\'s own current flag). Copy a key ' +
                'verbatim — never invent a path, never alter one, never use a URL. If nothing like a regime change ' +
                'happens, keep this array empty. ' +
                'Respond with ONLY a JSON object of this exact shape, nothing else:\n' +
                '{"toDate":"YYYY-MM-DD","events":[{"date":"YYYY-MM-DD","tags":[{"type":"country","label":"Country Name"}],' +
                '"headline":"SHORT HEADLINE","body":"1-3 sentence narrative paragraph",' +
                '"mapChanges":[{"province":"Exact Province Name","fromCountry":"Country Name","toCountry":"Country Name"}],' +
                '"regionChanges":[{"country":"Country Name","region":"Exact Region Name","toCountry":"Country Name",' +
                '"relationship":"independent|puppet|protectorate|vassal|autonomous","overlord":"Country Name"}],' +
                '"countryChanges":[{"country":"Country Name","toCountry":"Country Name"}],' +
                '"diplomaticChanges":[{"country":"Country Name","relationship":"independent|puppet|protectorate|vassal|autonomous","overlord":"Country Name"}],' +
                '"allianceChanges":[{"alliance":"Exact Alliance Name","leader":"Country Name (optional)",' +
                '"members":[{"country":"Country Name","rank":"short rank/role label"}],"removeMembers":["Country Name"],"disband":true}],' +
                '"unitSpawns":[{"name":"Unit Name","location":"City or Province Name","country":"Country Name"}],' +
                '"unitDissolutions":[{"name":"Unit Name"}],' +
                '"governmentChanges":[{"country":"Country Name","type":"monarchy|republic|military junta|communist state|revolutionary government|provisional government|colonial administration|other","flag":"TAG/name.png (optional)"}],' +
                '"altNames":[{"country":"Country Name","name":"Nickname"}]}]}\n' +
                'mapChanges, regionChanges, countryChanges, and diplomaticChanges may all be empty arrays on most ' +
                'events — use countryChanges for a full country annexation/merger, regionChanges for one or more ' +
                'whole regions, mapChanges for individual named provinces, and diplomaticChanges for a pure puppet/ ' +
                'vassal/independence status change with no territory moving at all. "relationship" and "overlord" ' +
                'are optional on each regionChanges entry and should be omitted entirely for a plain full-' +
                'independence or ordinary annexation with no puppet dynamic; on diplomaticChanges, "relationship" is ' +
                'required. allianceChanges, altNames, unitSpawns, unitDissolutions, and governmentChanges may ' +
                'also be empty arrays on most events — only include an altNames entry for a country\'s own flavor ' +
                'nickname or war-name (e.g. "the Iron Kingdom"), NOT for alliance/bloc membership — that always ' +
                'belongs in allianceChanges instead now; do not invent an altNames entry for every event. Use 1-6 ' +
                'events depending on how eventful the period is. ' +
                'Keep headlines short (under 12 words) and bodies to 1-3 sentences — do not enumerate every ' +
                'individual sub-unit (e.g. every county or district) by name in the narrative text; that level of ' +
                'detail belongs in regionChanges/mapChanges, not prose. Keep the ENTIRE response compact enough to ' +
                'fit well within your output token budget — an incomplete/truncated JSON response is a failure, so ' +
                'if you are running long, favor fewer events and shorter prose over cutting the JSON short.' +
                (countryContext ? ('\n\nKnown provinces you may reference for map changes:' + countryContext) : '') +
                (recentHistory ? ('\n\nRecent history for continuity:\n' + recentHistory) : '') +
                '\n\n' + (DIFFICULTY_PROMPT_TEXT[GameState.difficulty] || DIFFICULTY_PROMPT_TEXT.normal) +
                (GameState.worldBefore ? ('\n\nThe World Before this game\'s start date (already true, background only — do not narrate it as new):\n' + GameState.worldBefore) : '') +
                (GameState.simulationRules ? ('\n\nAdditional simulation rules set for this game (follow these as strictly as the rules above):\n' + GameState.simulationRules) : '');

            const userPrompt =
                'Current date: ' + GameState.currentDate + '\n\n' +
                'Pending actions this round (these are ' + playerName + '\'s direct orders — resolve them into ' +
                'concrete events per the system instructions above; do not substitute a different outcome or let ' +
                'an older diplomatic thread below silently override them):\n' + actionsText +
                (chatSummary ? ('\n\nActive diplomatic conversations (background context only, does not override the orders above unless the player\'s own action says it does):\n' + chatSummary) : '');

            const raw = await callAI(systemPrompt, userPrompt, { maxTokens: 4096, jsonSchema: JUMP_FORWARD_JSON_SCHEMA });
            const parsed = extractJSON(raw);
            if (!parsed || !Array.isArray(parsed.events)) {
                if (lastAICallTruncated) {
                    throw new Error(
                        'The AI\'s response was cut off before it finished (it hit the token limit), so the JSON ' +
                        'came back incomplete and unusable. Nothing was applied — your pending actions are still ' +
                        'queued, so it\'s safe to just try Jump Forward again. If this keeps happening, try asking ' +
                        'for a shorter jump (fewer days) or fewer/simpler pending actions per round.\n' +
                        'Raw response (truncated): ' + String(raw).slice(-200)
                    );
                }
                throw new Error('The AI response could not be parsed into events. Raw response: ' + String(raw).slice(0, 200));
            }

            const fromDate = GameState.currentDate;
            const toDate = parsed.toDate || targetDateOrNull || addToDate(GameState.currentDate, 1, 'months');

            // Deterministic sanity checks — the AI's own JSON can't be trusted
            // to get these right on its own (smaller local models especially),
            // so reject rather than silently accept a round that didn't
            // actually move the story forward. ISO YYYY-MM-DD strings sort
            // correctly with plain string comparison.
            if (toDate <= fromDate) {
                throw new Error(
                    'The AI reported this round ending on ' + toDate + ', which is not after the current date (' +
                    fromDate + ') — no time actually passed. Nothing was applied; your pending actions are still ' +
                    'queued, so it\'s safe to just try Jump Forward again.'
                );
            }
            const lastRound = GameState.history.length ? GameState.history[GameState.history.length - 1] : null;
            const lastEvent = lastRound && lastRound.events.length ? lastRound.events[lastRound.events.length - 1] : null;
            if (lastEvent && lastEvent.headline) {
                const repeated = parsed.events.some(function (e) {
                    return e && e.headline && e.headline.trim().toLowerCase() === lastEvent.headline.trim().toLowerCase();
                });
                if (repeated) {
                    throw new Error(
                        'The AI repeated last round\'s headline ("' + lastEvent.headline + '") instead of generating ' +
                        'a new development — a known failure mode for smaller/local models. Nothing was applied; ' +
                        'your pending actions are still queued, so it\'s safe to just try Jump Forward again.'
                    );
                }
            }
            const invasionTargets = {}; // ISO -> requireTerritoryChange (true wins if any pending action was annexation-worded)
            GameState.pendingActions.forEach(function (a) {
                detectInvasionTargets(a.text).forEach(function (t) {
                    invasionTargets[t.code] = invasionTargets[t.code] || t.requireTerritoryChange;
                });
            });
            Object.keys(invasionTargets).forEach(function (targetISO) {
                const requireTerritoryChange = invasionTargets[targetISO];
                const engaged = parsed.events.some(function (e) { return eventEngagesTarget(e, targetISO, GameState.playerCountry, requireTerritoryChange); });
                if (!engaged) {
                    throw new Error(
                        'You ordered an invasion/annexation targeting ' + (countryLookup[targetISO] || targetISO) +
                        ', but the AI\'s response included no valid territorial change or military unit against it ' +
                        'anywhere — either it declined to engage, or it attempted one but got the fields backwards/ ' +
                        'incomplete (a known failure mode) so it silently did nothing. Nothing was applied; your ' +
                        'pending actions are still queued, so it\'s safe to just try Jump Forward again.'
                    );
                }
            });

            document.getElementById('simulating-overlay').classList.remove('open');
            beginEventReveal(parsed.events, fromDate, toDate);
        } catch (e) {
            document.getElementById('simulating-overlay').classList.remove('open');
            showAlert('Jump Forward Failed', e.message);
        }
    }

    // ==========================================================================
    // Settings: player nation + AI config
    // ==========================================================================
    function initGameSettings() {
        const countrySelect = document.getElementById('player-country-select');
        const codes = Object.keys(countryLookup).sort(function (a, b) { return countryLookup[a].localeCompare(countryLookup[b]); });
        codes.forEach(function (code) {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = countryLookup[code];
            countrySelect.appendChild(opt);
        });
        if (GameState.playerCountry) countrySelect.value = GameState.playerCountry;
        countrySelect.addEventListener('change', function () {
            GameState.playerCountry = countrySelect.value;
            saveGameState();
            updateAdvisorLauncherColor();
        });

        // "Start New Game" — wipes the persisted save (history, chats, pending
        // actions, advisor messages, map overrides/custom countries/polity
        // relationships, alt-names) so a genuinely fresh game starts with an
        // empty chat list and an unmodified map, without touching AIConfig
        // (stored under a separate localStorage key). Reloads the page rather
        // than trying to manually reset every in-memory structure/UI panel,
        // since a full reload guarantees a clean re-initialization of the map
        // layers, markers, and all panels from scratch.
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', async function () {
                const ok = await showConfirm(
                    'Start New Game?',
                    'This clears your current save — history, chats, pending actions, advisor messages, and any map changes (secessions, puppets, custom countries) — and starts over. Your AI provider/key settings are kept. This cannot be undone.'
                );
                if (!ok) return;
                try { localStorage.removeItem(GAME_STORAGE_KEY); } catch (e) { console.warn('Failed to clear game state:', e); }
                location.reload();
            });
        }

        const providerSelect = document.getElementById('ai-provider-select');
        const baseUrlInput = document.getElementById('ai-base-url');
        const apiKeyInput = document.getElementById('ai-api-key');
        const modelInput = document.getElementById('ai-model');
        const structuredOutputCheckbox = document.getElementById('ai-structured-output-checkbox');
        const statusLine = document.getElementById('ai-config-status');

        providerSelect.value = AIConfig.provider;
        baseUrlInput.value = AIConfig.baseUrl || '';
        apiKeyInput.value = AIConfig.apiKey || '';
        modelInput.value = AIConfig.model || '';
        structuredOutputCheckbox.checked = !!AIConfig.useStructuredOutput;

        function persist() {
            AIConfig.provider = providerSelect.value;
            AIConfig.baseUrl = baseUrlInput.value.trim();
            AIConfig.apiKey = apiKeyInput.value.trim();
            AIConfig.model = modelInput.value.trim();
            AIConfig.useStructuredOutput = structuredOutputCheckbox.checked;
            saveAIConfig();
        }
        [providerSelect, baseUrlInput, apiKeyInput, modelInput, structuredOutputCheckbox].forEach(function (el) {
            el.addEventListener('change', persist);
        });

        document.getElementById('ai-test-btn').addEventListener('click', async function () {
            persist();
            statusLine.textContent = 'Testing…';
            try {
                // maxTokens is deliberately generous (not a tiny value like 10) —
                // "thinking"/reasoning-style models (Gemini 3.5, etc.) spend some of
                // their token budget on internal reasoning before the visible reply,
                // so a too-small budget can hit finish_reason:"length" with zero
                // visible output — a real connection success that looked like a
                // failure ("Connected, but got an empty response").
                const reply = await callAI('Respond with only the single word: OK', 'Test connection.', { maxTokens: 200 });
                statusLine.textContent = reply && reply.trim() ? ('Connected ✓ (' + reply.trim().slice(0, 40) + ')') : 'Connected, but got an empty response — this can happen with reasoning models that spend tokens thinking before replying; if your actual Advisor/Actions calls work, this is likely harmless.';
            } catch (e) {
                statusLine.textContent = 'Failed: ' + e.message;
            }
        });
    }

    // ==========================================================================
    // Menu hub (gear icon) — hamburger-menu
    // structure: a flat list of rows (User Settings/Events/Cheats/Prompts/AI
    // Setup), each swapping the panel body into a dedicated back-navigable
    // subview. All the actual settings controls (fullscreen toggle, sliders,
    // AI provider fields, etc.) are untouched — initGameSettings() above
    // still owns their behavior; this only handles which subview is visible.
    // ==========================================================================
    function showMenuView(viewId) {
        document.querySelectorAll('.menu-subview').forEach(function (el) { el.classList.remove('active'); });
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');
    }
    window.showMenuView = showMenuView;

    // Each cheat that's actually implemented routes straight to its own
    // subview; everything else routes to the shared "not yet implemented"
    // stub so the row is honestly present (full
    // Cheats list) without pretending to do something it doesn't.
    const CHEAT_ROWS = [
        { id: 'ai-model', icon: '\u{1F916}', label: 'AI Model', desc: 'Configure AI model settings', view: 'menu-view-ai-setup' },
        { id: 'your-country', icon: '\u{1F464}', label: 'Your Country', desc: "Change which country you're playing as", view: 'menu-view-cheat-your-country' },
        { id: 'difficulty', icon: '⚡', label: 'Difficulty', desc: 'Adjust the game difficulty level', view: 'menu-view-cheat-difficulty' },
        { id: 'annex-country', icon: '↗', label: 'Annex Country', desc: 'Click a country to annex it into another', view: 'menu-view-cheat-annex-country' },
        { id: 'annex-regions', icon: '◎', label: 'Annex Regions', desc: 'Click individual regions to transfer them to a country', view: 'menu-view-cheat-annex-regions' },
        { id: 'game-master', icon: '\u{1FA84}', label: 'AI Cheat', desc: 'Describe a territory/diplomacy change in plain English and let the AI make it', view: 'menu-view-cheat-game-master' },
        { id: 'modify-regions', icon: '\u{270F}\u{FE0F}', label: 'Modify Regions', desc: 'Drag a shape\'s points to reshape it — for fixing broken/degenerate borders', view: 'menu-view-cheat-modify-regions' },
        { id: 'edit-country', icon: '\u{1F3F7}', label: 'Edit Country', desc: 'Modify existing country properties' },
        { id: 'add-country', icon: '\u{1F310}', label: 'Add Country', desc: 'Create a new country on the map' },
        { id: 'regions', icon: '\u{1F4CD}', label: 'Regions', desc: 'Edit region names, tags, and properties' },
        { id: 'edit-map-feature', icon: '⭐', label: 'Edit Map Feature', desc: 'Edit existing map features like cities and landmarks', view: 'menu-view-cheat-map-features' },
        { id: 'add-map-feature', icon: '➕', label: 'Add Map Feature', desc: 'Create new map features with custom properties', view: 'menu-view-cheat-map-features' },
        { id: 'clear-map-features', icon: '\u{1F5D1}', label: 'Clear Map Features', desc: 'Clean up old and irrelevant features', view: 'menu-view-cheat-map-features' },
        { id: 'fog-of-war', icon: '\u{1F32B}', label: 'Fog of War', desc: 'Hide regions from view, region by region or a whole country at a time', view: 'menu-view-cheat-fog-of-war' },
        { id: 'events', icon: '\u{1F4C5}', label: 'Events', desc: 'Edit historical events and their descriptions' }
    ];

    function renderCheatRows(filterText) {
        const list = document.getElementById('cheat-row-list');
        list.innerHTML = '';
        const q = (filterText || '').trim().toLowerCase();
        CHEAT_ROWS.forEach(function (c) {
            if (q && c.label.toLowerCase().indexOf(q) === -1 && c.desc.toLowerCase().indexOf(q) === -1) return;
            const row = document.createElement('div');
            row.className = 'menu-row' + (c.view ? '' : ' disabled');
            row.innerHTML = '<span class="menu-row-icon">' + c.icon + '</span>' +
                '<span class="menu-row-text"><span class="menu-row-label">' + c.label + '</span>' +
                '<span class="menu-row-desc">' + c.desc + '</span></span>' +
                '<span class="menu-row-chevron">›</span>';
            row.addEventListener('click', function () {
                if (c.view) {
                    showMenuView(c.view);
                } else {
                    document.getElementById('menu-cheat-stub-title').textContent = c.label;
                    showMenuView('menu-view-cheat-stub');
                }
            });
            list.appendChild(row);
        });
    }

    // ---- Cheats > Annex Country / Annex Regions: shared map-click-mode
    // plumbing. Arms window.__cheatMapClick (read by world_map_webgl.html's
    // municipality click handler, which intercepts clicks ahead of the
    // normal Country Details popup while this is set) and shows a small
    // banner over the map so it's obvious a click means something different
    // right now. ----
    function armCheatMapClickMode(bannerText, onPick) {
        window.__cheatMapClick = onPick;
        document.getElementById('cheat-mode-banner-text').textContent = bannerText;
        document.getElementById('cheat-mode-banner').classList.add('open');
        document.getElementById('settings-panel').classList.remove('open');
    }
    function disarmCheatMapClickMode() {
        window.__cheatMapClick = null;
        document.getElementById('cheat-mode-banner').classList.remove('open');
    }

    // Renders a searchable, click-to-select list of every real+custom
    // country into `listEl`, calling onSelect(iso, name) when a row is
    // clicked. Shared by Annex Country and Annex Regions' target pickers.
    function renderCountryPickList(listEl, searchInput, onSelect) {
        function render(filterText) {
            const q = (filterText || '').trim().toLowerCase();
            const codes = Object.keys(countryLookup)
                .filter(function (code) { return !q || countryLookup[code].toLowerCase().indexOf(q) !== -1; })
                .sort(function (a, b) { return countryLookup[a].localeCompare(countryLookup[b]); })
                .slice(0, 80);
            listEl.innerHTML = '';
            codes.forEach(function (code) {
                const row = document.createElement('div');
                row.className = 'cheat-country-row';
                row.textContent = countryLookup[code];
                row.addEventListener('click', function () { onSelect(code, countryLookup[code]); });
                listEl.appendChild(row);
            });
        }
        searchInput.addEventListener('input', function () { render(searchInput.value); });
        render('');
    }

    function initCheatsAnnexCountry() {
        let targetISO = null;
        const startBtn = document.getElementById('annex-country-start-btn');
        renderCountryPickList(
            document.getElementById('annex-country-target-list'),
            document.getElementById('annex-country-target-search'),
            function (iso, name) {
                targetISO = iso;
                startBtn.disabled = false;
                startBtn.textContent = 'Click a country on the map to annex it into ' + name;
            }
        );
        startBtn.addEventListener('click', function () {
            if (!targetISO) return;
            armCheatMapClickMode('Click a country to annex into ' + countryLookup[targetISO], function (info) {
                const fromISO = info.countryCode;
                if (fromISO === targetISO) { disarmCheatMapClickMode(); return; }
                const shapeIDs = [];
                for (let i = 0; i < targetObject.geometries.length; i++) {
                    const props = targetObject.geometries[i].properties;
                    if (getEffectiveCountry(props.shapeID, props.shapeGroup) === fromISO) shapeIDs.push(props.shapeID);
                }
                shapeIDs.forEach(function (shapeID) { applyOneProvinceOverride(shapeID, targetISO, info.shapeName, 'Country'); });
                if (shapeIDs.length) rebuildCountryLayers();
                saveGameState();
                disarmCheatMapClickMode();
                showAlert('Annexed', (countryLookup[fromISO] || fromISO) + ' (' + shapeIDs.length + ' provinces) is now part of ' + countryLookup[targetISO] + '.');
            });
        });
    }

    function initCheatsAnnexRegions() {
        let targetISO = null;
        const startBtn = document.getElementById('annex-regions-start-btn');
        renderCountryPickList(
            document.getElementById('annex-regions-target-list'),
            document.getElementById('annex-regions-target-search'),
            function (iso, name) {
                targetISO = iso;
                startBtn.disabled = false;
                startBtn.textContent = 'Click regions on the map to transfer them to ' + name;
            }
        );
        startBtn.addEventListener('click', function () {
            if (!targetISO) return;
            armCheatMapClickMode('Click regions to transfer to ' + countryLookup[targetISO] + ' — Cancel when done', function (info) {
                info.memberShapeIDs.forEach(function (shapeID) {
                    applyOneProvinceOverride(shapeID, targetISO, info.shapeName, info.shapeType);
                });
                rebuildCountryLayers();
                saveGameState();
                // Stays armed — "Annex Regions" is a click-several,
                // Cancel-when-done tool, not a one-shot like Annex Country.
            });
        });
    }

    function initCheatsDifficulty() {
        const DIFFICULTY_UI = [
            { id: 'very_easy', emoji: '\u{1F601}', label: 'Very Easy', desc: 'The player\'s plans largely succeed; opposition is light.' },
            { id: 'easy', emoji: '\u{1F60A}', label: 'Easy', desc: 'The player is favored; setbacks are occasional and minor.' },
            { id: 'normal', emoji: '\u{1F642}', label: 'Normal', desc: 'Standard balance — plausibility and resources decide outcomes.' },
            { id: 'hard', emoji: '\u{1F610}', label: 'Hard', desc: 'Rivals are competent and reactive; plans need real merit.' },
            { id: 'impossible', emoji: '\u{1F62C}', label: 'Impossible', desc: 'The world actively resists the player at every turn.' }
        ];
        const list = document.getElementById('cheat-difficulty-list');
        function render() {
            list.innerHTML = '';
            DIFFICULTY_UI.forEach(function (d) {
                const row = document.createElement('div');
                row.className = 'difficulty-option' + (GameState.difficulty === d.id ? ' selected' : '');
                row.innerHTML = '<div class="difficulty-option-title">' + d.emoji + ' ' + d.label + '</div>' +
                    '<div class="difficulty-option-desc">' + d.desc + '</div>';
                row.addEventListener('click', function () {
                    GameState.difficulty = d.id;
                    saveGameState();
                    render();
                });
                list.appendChild(row);
            });
        }
        render();
    }

    // Cheats > AI Cheat — a freeform natural-language edit, reusing the exact
    // mapChanges/regionChanges/countryChanges/diplomaticChanges contract
    // runJumpForward() already asks the AI for and already has apply*()
    // functions to execute — so this is genuinely the same machinery, not a
    // parallel one, and every existing safety property (province-name
    // resolution, getOrCreateCountryCode for a brand-new nation, etc.) comes
    // along for free. Applies directly and silently (no narrative event, no
    // GameState.history entry) — this is a data edit, not a simulated turn.
    function initCheatsGameMaster() {
        document.getElementById('game-master-submit-btn').addEventListener('click', async function () {
            const input = document.getElementById('game-master-input');
            const status = document.getElementById('game-master-status');
            const text = input.value.trim();
            if (!text) return;
            status.textContent = 'Thinking…';
            try {
                const systemPrompt =
                    'You are a direct data-editing tool for an alternate-history grand strategy game\'s current map ' +
                    'state (NOT a narrative turn — no story, no dates, just the edit itself). Convert the ' +
                    'instruction below into JSON: {"mapChanges":[{"province":"Exact Province Name",' +
                    '"fromCountry":"Country Name","toCountry":"Country Name"}],"regionChanges":[{"country":' +
                    '"Country Name","region":"Exact Region Name","toCountry":"Country Name","relationship":' +
                    '"independent|puppet|protectorate|vassal|autonomous (optional)","overlord":"Country Name ' +
                    '(optional)"}],"countryChanges":[{"country":"Country Name","toCountry":"Country Name"}],' +
                    '"diplomaticChanges":[{"country":"Country Name","relationship":"independent|puppet|' +
                    'protectorate|vassal|autonomous","overlord":"Country Name"}]}. Use countryChanges for a full ' +
                    'country annexation/merger, regionChanges for one or more whole named regions, mapChanges for ' +
                    'individual named provinces, diplomaticChanges for a pure puppet/vassal/independence status ' +
                    'change with no territory moving. toCountry does not have to already exist — a new nation name ' +
                    'is created automatically. "country"/"fromCountry" is always the CURRENT owner losing the ' +
                    'territory, toCountry the winner — never the reverse — and both are required non-null strings ' +
                    'on any entry you include; if the instruction doesn\'t clearly resolve to a real change, omit ' +
                    'the entry entirely rather than including a placeholder. Only ever use EXACT province/region ' +
                    'names you can reasonably infer exist in this world; when unsure, prefer regionChanges/' +
                    'countryChanges over guessing a province name. Every array may be empty. Respond with ONLY the ' +
                    'JSON object, nothing else.' +
                    (GameState.worldBefore ? ('\n\nThe World Before this game\'s start date:\n' + GameState.worldBefore) : '') +
                    (GameState.simulationRules ? ('\n\nThis game\'s simulation rules:\n' + GameState.simulationRules) : '');
                const raw = await callAI(systemPrompt, text, { maxTokens: 2048, jsonSchema: GAME_MASTER_JSON_SCHEMA });
                const parsed = extractJSON(raw);
                if (!parsed) throw new Error('Could not parse a response from the AI.');
                const applied = []
                    .concat(applyMapChanges(parsed.mapChanges))
                    .concat(applyRegionChanges(parsed.regionChanges))
                    .concat(applyCountryChanges(parsed.countryChanges));
                applyDiplomaticChanges(parsed.diplomaticChanges);
                saveGameState();
                if (!applied.length && !(parsed.diplomaticChanges || []).length) {
                    status.textContent = 'The AI didn\'t make any changes it was confident enough to apply — try rephrasing.';
                    return;
                }
                input.value = '';
                status.textContent = '';
                showAlert('Done', applied.map(function (a) {
                    return a.shapeName + ': ' + (countryLookup[a.fromCountry] || a.fromCountry || 'Unclaimed') + ' → ' + (countryLookup[a.toCountry] || a.toCountry);
                }).join('\n') || 'Diplomatic status updated.');
            } catch (e) {
                status.textContent = 'Failed: ' + e.message;
            }
        });
    }

    // Cheats > Modify Regions — an Advanced Map Editor "Modify
    // Regions Tool" (drag a shape's own vertices). Scoped deliberately narrow:
    // ONLY a standalone shape (memberShapeIDs.length === 1, i.e. shapeID ===
    // renderId) can be edited — a merged multi-shape "REGION_N" cluster (see
    // buildLayers() in world_map_webgl.html) is a dissolved union of many
    // original shapes' borders, and there's no way to tell which original
    // shape a given stretch of that dissolved border belongs to, so there's
    // no sound way to edit it vertex-by-vertex here. ONLY a shape under
    // MAX_EDIT_VERTICES points is offered — this tool exists to hand-fix the
    // genuinely degenerate shapes (a Marshall Islands stub is 4-6 points), not
    // to redraw an already-detailed province by dragging hundreds of pins.
    const MAX_EDIT_VERTICES = 80;
    function collectVertexRefs(geometry) {
        const refs = [];
        function walkRing(ring) { ring.forEach(function (pt) { refs.push(pt); }); }
        if (geometry.type === 'Polygon') geometry.coordinates.forEach(walkRing);
        else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(function (poly) { poly.forEach(walkRing); });
        return refs;
    }
    function initCheatsModifyRegions() {
        let editingShapeID = null;
        let workingGeometry = null;
        let vertexMarkers = [];
        let previewSourceReady = false;

        function ensurePreviewLayer() {
            if (previewSourceReady) return;
            map.addSource('geometry-edit-preview', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addLayer({ id: 'geometry-edit-preview-fill', type: 'fill', source: 'geometry-edit-preview', paint: { 'fill-color': '#ff5555', 'fill-opacity': 0.25 } });
            map.addLayer({ id: 'geometry-edit-preview-line', type: 'line', source: 'geometry-edit-preview', paint: { 'line-color': '#ff5555', 'line-width': 3 } });
            previewSourceReady = true;
        }
        function updatePreview() {
            map.getSource('geometry-edit-preview').setData({ type: 'Feature', geometry: workingGeometry });
        }
        function exitEditMode() {
            vertexMarkers.forEach(function (m) { m.remove(); });
            vertexMarkers = [];
            editingShapeID = null;
            workingGeometry = null;
            if (previewSourceReady) map.getSource('geometry-edit-preview').setData({ type: 'FeatureCollection', features: [] });
            document.getElementById('geometry-edit-banner').classList.remove('open');
        }
        function enterEditMode(shapeID, geometry) {
            editingShapeID = shapeID;
            workingGeometry = JSON.parse(JSON.stringify(geometry));
            ensurePreviewLayer();
            updatePreview();
            const layer = provinceLayerById[shapeID];
            if (layer && layer.getBounds) map.fitBounds(layer.getBounds());
            collectVertexRefs(workingGeometry).forEach(function (pt) {
                const marker = new maplibregl.Marker({ draggable: true, color: '#ff5555', scale: 0.6 })
                    .setLngLat([pt[0], pt[1]])
                    .addTo(map);
                marker.on('drag', function () {
                    const ll = marker.getLngLat();
                    pt[0] = ll.lng;
                    pt[1] = ll.lat;
                    updatePreview();
                });
                vertexMarkers.push(marker);
            });
            document.getElementById('geometry-edit-banner-text').textContent =
                'Editing ' + (layer && layer.feature ? layer.feature.properties.shapeName : shapeID) + ' — drag the points, then Save.';
            document.getElementById('geometry-edit-banner').classList.add('open');
        }

        document.getElementById('modify-regions-start-btn').addEventListener('click', function () {
            document.getElementById('modify-regions-status').textContent = '';
            // Rejection messages below update the floating cheat-mode banner
            // text, not #modify-regions-status — armCheatMapClickMode() closes
            // the settings panel that status line lives in, so it'd be
            // invisible right when it matters.
            const bannerText = document.getElementById('cheat-mode-banner-text');
            armCheatMapClickMode('Click a shape to edit its points', function (info) {
                if (info.memberShapeIDs.length > 1) {
                    bannerText.textContent = 'That\'s a merged multi-county region — Modify Regions only works on individual shapes. Try clicking elsewhere.';
                    return; // stays armed — the banner's own Cancel button is still live
                }
                const shapeID = info.memberShapeIDs[0];
                const layer = provinceLayerById[shapeID];
                if (!layer || !layer.feature) { bannerText.textContent = 'Could not find that shape\'s geometry. Try clicking elsewhere.'; return; }
                const vertexCount = collectVertexRefs(layer.feature.geometry).length;
                if (vertexCount > MAX_EDIT_VERTICES) {
                    bannerText.textContent = info.shapeName + ' has ' + vertexCount + ' points — too many to hand-edit here (limit ' + MAX_EDIT_VERTICES + '). Try clicking a smaller shape.';
                    return;
                }
                disarmCheatMapClickMode();
                enterEditMode(shapeID, layer.feature.geometry);
            });
        });

        document.getElementById('geometry-edit-save-btn').addEventListener('click', function () {
            if (!editingShapeID) return;
            const ok = window.applyGeometryOverride && window.applyGeometryOverride(editingShapeID, workingGeometry);
            if (!ok) { showAlert('Could Not Save', 'That shape could not be updated — it may no longer exist as a standalone shape.'); return; }
            GameState.geometryOverrides = GameState.geometryOverrides || {};
            GameState.geometryOverrides[editingShapeID] = workingGeometry;
            saveGameState();
            exitEditMode();
        });
        document.getElementById('geometry-edit-cancel-btn').addEventListener('click', exitEditMode);
    }

    // Cheats > Edit/Add/Clear Map Feature — one shared editor (search list +
    // Edit/Delete per row, Add form at top) backing all three CHEAT_ROWS
    // entries, since they're really the same tool. Base Geo/cities.json
    // entries have no stable id, so they're addressed by "name|country" (see
    // keyOfCity() in world_map_webgl.html); a brand-new entry gets a real id
    // at creation time. See GameState.mapFeatureOverrides in
    // defaultGameState() for the { added, removedKeys, edited } shape.
    function initCheatsMapFeatures() {
        const nameInput = document.getElementById('map-feature-name-input');
        const countrySelect = document.getElementById('map-feature-country-select');
        const capitalCheckbox = document.getElementById('map-feature-capital-checkbox');
        const pickBtn = document.getElementById('map-feature-pick-location-btn');
        const locationStatus = document.getElementById('map-feature-location-status');
        const saveBtn = document.getElementById('map-feature-save-btn');
        const cancelBtn = document.getElementById('map-feature-cancel-edit-btn');
        const formTitle = document.getElementById('map-feature-form-title');
        const searchInput = document.getElementById('map-feature-search-input');
        const listEl = document.getElementById('map-feature-list');
        const statusEl = document.getElementById('map-feature-status');

        const codes = Object.keys(countryLookup).sort(function (a, b) { return countryLookup[a].localeCompare(countryLookup[b]); });
        codes.forEach(function (code) {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = countryLookup[code];
            countrySelect.appendChild(opt);
        });

        let editingKey = null; // null = adding new; 'base:<name>|<country>' or 'added:<id>' otherwise
        let pickedLngLat = null;

        function resetForm() {
            editingKey = null;
            pickedLngLat = null;
            nameInput.value = '';
            capitalCheckbox.checked = false;
            formTitle.textContent = 'Add New Feature';
            locationStatus.textContent = 'No location picked yet.';
            saveBtn.textContent = 'Add Feature';
            saveBtn.disabled = true;
            cancelBtn.style.display = 'none';
            statusEl.textContent = '';
        }

        function mergedFeatures() {
            const overrides = GameState.mapFeatureOverrides || { added: [], removedKeys: [], edited: {} };
            const removed = new Set(overrides.removedKeys || []);
            const edited = overrides.edited || {};
            const out = [];
            (window.getBaseCities ? window.getBaseCities() : []).forEach(function (c) {
                const k = c.name + '|' + c.country;
                if (removed.has(k)) return;
                const merged = edited[k] ? Object.assign({}, c, edited[k]) : c;
                out.push({ key: 'base:' + k, origKey: k, isBase: true, name: merged.name, country: merged.country, capital: !!merged.capital, lon: merged.lon, lat: merged.lat });
            });
            (overrides.added || []).forEach(function (c) {
                out.push({ key: 'added:' + c.id, isBase: false, name: c.name, country: c.country, capital: !!c.capital, lon: c.lon, lat: c.lat });
            });
            return out;
        }

        function renderList(filterText) {
            const q = (filterText || '').trim().toLowerCase();
            const feats = mergedFeatures().filter(function (f) {
                if (!q) return true;
                return f.name.toLowerCase().indexOf(q) !== -1 || (countryLookup[f.country] || '').toLowerCase().indexOf(q) !== -1;
            }).sort(function (a, b) { return a.name.localeCompare(b.name); }).slice(0, 100);
            listEl.innerHTML = '';
            if (!feats.length) {
                const empty = document.createElement('div');
                empty.className = 'empty-hint';
                empty.textContent = q ? 'No features match that search.' : 'No map features found.';
                listEl.appendChild(empty);
                return;
            }
            feats.forEach(function (f) {
                const row = document.createElement('div');
                row.className = 'cheat-country-row';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.justifyContent = 'space-between';
                row.style.gap = '6px';
                const label = document.createElement('span');
                label.textContent = f.name + (f.capital ? ' ★' : '') + ' — ' + (countryLookup[f.country] || f.country);
                label.style.overflow = 'hidden';
                label.style.textOverflow = 'ellipsis';
                label.style.whiteSpace = 'nowrap';
                const actions = document.createElement('span');
                actions.style.flexShrink = '0';
                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'feature-popup-icon-btn';
                editBtn.textContent = '✏️';
                editBtn.title = 'Edit';
                editBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    editingKey = f.key;
                    pickedLngLat = { lng: f.lon, lat: f.lat };
                    nameInput.value = f.name;
                    countrySelect.value = f.country;
                    capitalCheckbox.checked = f.capital;
                    formTitle.textContent = 'Edit Feature';
                    locationStatus.textContent = 'Location: ' + f.lat.toFixed(2) + ', ' + f.lon.toFixed(2) + ' (Pick Location on Map to change)';
                    saveBtn.textContent = 'Save Changes';
                    saveBtn.disabled = false;
                    cancelBtn.style.display = '';
                    statusEl.textContent = '';
                });
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'feature-popup-icon-btn';
                delBtn.textContent = '\u{1F5D1}';
                delBtn.title = 'Delete';
                delBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const overrides = GameState.mapFeatureOverrides;
                    if (f.isBase) {
                        overrides.removedKeys = overrides.removedKeys || [];
                        if (overrides.removedKeys.indexOf(f.origKey) === -1) overrides.removedKeys.push(f.origKey);
                        if (overrides.edited) delete overrides.edited[f.origKey];
                    } else {
                        const id = f.key.slice('added:'.length);
                        overrides.added = (overrides.added || []).filter(function (c) { return c.id !== id; });
                    }
                    saveGameState();
                    if (window.applyMapFeatureOverrides) window.applyMapFeatureOverrides(GameState.mapFeatureOverrides);
                    if (editingKey === f.key) resetForm();
                    renderList(searchInput.value);
                });
                actions.appendChild(editBtn);
                actions.appendChild(delBtn);
                row.appendChild(label);
                row.appendChild(actions);
                listEl.appendChild(row);
            });
        }

        nameInput.addEventListener('input', function () {
            saveBtn.disabled = !nameInput.value.trim() || !pickedLngLat;
        });
        searchInput.addEventListener('input', function () { renderList(searchInput.value); });

        pickBtn.addEventListener('click', function () {
            armCheatMapClickMode('Click on the map to place this feature', function (info) {
                pickedLngLat = info.lngLat;
                if (!editingKey) countrySelect.value = info.countryCode || countrySelect.value;
                disarmCheatMapClickMode();
                document.getElementById('settings-panel').classList.add('open');
                showMenuView('menu-view-cheat-map-features');
                locationStatus.textContent = 'Location: ' + pickedLngLat.lat.toFixed(2) + ', ' + pickedLngLat.lng.toFixed(2);
                saveBtn.disabled = !nameInput.value.trim() || !pickedLngLat;
            });
        });

        saveBtn.addEventListener('click', function () {
            const name = nameInput.value.trim();
            if (!name || !pickedLngLat) return;
            const overrides = GameState.mapFeatureOverrides;
            const fields = { name: name, country: countrySelect.value, capital: capitalCheckbox.checked, lon: pickedLngLat.lng, lat: pickedLngLat.lat };
            if (!editingKey) {
                overrides.added = overrides.added || [];
                overrides.added.push(Object.assign({ id: 'feat-' + Date.now() }, fields));
            } else if (editingKey.indexOf('base:') === 0) {
                const origKey = editingKey.slice('base:'.length);
                overrides.edited = overrides.edited || {};
                overrides.edited[origKey] = fields;
            } else {
                const id = editingKey.slice('added:'.length);
                overrides.added = (overrides.added || []).map(function (c) { return c.id === id ? Object.assign({ id: id }, fields) : c; });
            }
            saveGameState();
            if (window.applyMapFeatureOverrides) window.applyMapFeatureOverrides(GameState.mapFeatureOverrides);
            statusEl.textContent = 'Saved ✓';
            resetForm();
            renderList(searchInput.value);
        });
        cancelBtn.addEventListener('click', resetForm);

        resetForm();
        renderList('');
    }

    // Cheats > Fog of War — purely visual (see applyFogOverrides()/
    // setFogState() in world_map_webgl.html); does not change what the AI
    // knows or can act on, only what the player sees rendered.
    function initCheatsFogOfWar() {
        const statusEl = document.getElementById('fog-status');

        document.getElementById('fog-toggle-region-btn').addEventListener('click', function () {
            armCheatMapClickMode('Click regions to toggle fog — Cancel when done', function (info) {
                const fogged = new Set(GameState.fogOfWarShapeIDs || []);
                const nowFogging = !fogged.has(info.memberShapeIDs[0]);
                info.memberShapeIDs.forEach(function (sid) {
                    if (nowFogging) fogged.add(sid); else fogged.delete(sid);
                    window.setFogState(sid, nowFogging);
                });
                GameState.fogOfWarShapeIDs = Array.from(fogged);
                saveGameState();
                // Stays armed, same as Annex Regions — Cancel via the banner when done.
            });
        });

        renderCountryPickList(
            document.getElementById('fog-country-list'),
            document.getElementById('fog-country-search'),
            function (iso, name) {
                const shapeIDs = [];
                for (let i = 0; i < targetObject.geometries.length; i++) {
                    const props = targetObject.geometries[i].properties;
                    if (getEffectiveCountry(props.shapeID, props.shapeGroup) === iso) shapeIDs.push(props.shapeID);
                }
                const fogged = new Set(GameState.fogOfWarShapeIDs || []);
                shapeIDs.forEach(function (sid) { fogged.add(sid); window.setFogState(sid, true); });
                GameState.fogOfWarShapeIDs = Array.from(fogged);
                saveGameState();
                statusEl.textContent = 'Fogged all of ' + name + ' (' + shapeIDs.length + ' regions).';
            }
        );

        document.getElementById('fog-clear-all-btn').addEventListener('click', function () {
            (GameState.fogOfWarShapeIDs || []).forEach(function (sid) { window.setFogState(sid, false); });
            GameState.fogOfWarShapeIDs = [];
            saveGameState();
            statusEl.textContent = 'Fog cleared.';
        });
    }

    function initMenuHub() {
        document.querySelectorAll('.menu-row[data-open-view]').forEach(function (row) {
            row.addEventListener('click', function () { showMenuView(row.getAttribute('data-open-view')); });
        });
        document.querySelectorAll('.menu-back-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showMenuView(btn.getAttribute('data-back-to') || 'menu-view-hub');
            });
        });
        document.getElementById('cheat-search-input').addEventListener('input', function (e) {
            renderCheatRows(e.target.value);
        });
        renderCheatRows('');
        document.getElementById('cheat-mode-cancel-btn').addEventListener('click', disarmCheatMapClickMode);

        document.getElementById('menu-open-events-modal').addEventListener('click', function () {
            document.getElementById('settings-panel').classList.remove('open');
            if (!GameState.history.length) { showAlert('No Events Yet', 'Nothing has happened yet — use Jump Forward to advance the game.'); return; }
            openEventsModalForRound(GameState.history.length - 1);
        });

        renderPromptCards();
        initCheatsAnnexCountry();
        initCheatsAnnexRegions();
        initCheatsDifficulty();
        initCheatsGameMaster();
        initCheatsModifyRegions();
        initCheatsMapFeatures();
        initCheatsFogOfWar();
    }

    // Each real AI call site this game makes, one card per prompt. `get`/`set`
    // read and write wherever that prompt's text actually lives — Jump
    // Forward uses the pre-existing top-level GameState.simulationRules (see
    // its own comment in defaultGameState()); the rest are additive entries
    // under GameState.promptOverrides (see the splice points in
    // handleEnhanceAction/handleAdvisorAsk/maybeConsolidateHistory/the chat
    // reply handler for exactly how each is appended to that call's system
    // prompt at request time).
    const PROMPT_CARDS = [
        {
            id: 'jump-forward', icon: '\u{1F4C5}', label: 'Jump Forward',
            desc: 'Constraints and guidelines for the AI. Sent alongside the engine\'s own rules on every Jump Forward.',
            get: function () { return GameState.simulationRules || ''; },
            set: function (v) { GameState.simulationRules = v; }
        },
        {
            id: 'advisor', icon: '\u{1F9E0}', label: 'Chat with Advisor',
            desc: 'Extra instructions appended whenever you ask your Advisor a question.',
            get: function () { return (GameState.promptOverrides || {}).advisor || ''; },
            set: function (v) { GameState.promptOverrides = GameState.promptOverrides || {}; GameState.promptOverrides.advisor = v; }
        },
        {
            id: 'enhance-action', icon: '✨', label: 'Description to Action',
            desc: 'Extra instructions appended when "Enhance" rewrites a drafted action.',
            get: function () { return (GameState.promptOverrides || {}).enhanceAction || ''; },
            set: function (v) { GameState.promptOverrides = GameState.promptOverrides || {}; GameState.promptOverrides.enhanceAction = v; }
        },
        {
            id: 'consolidator', icon: '\u{1F4C4}', label: 'Event Consolidator',
            desc: 'Extra instructions appended when old rounds are summarized into a compact history entry.',
            get: function () { return (GameState.promptOverrides || {}).consolidator || ''; },
            set: function (v) { GameState.promptOverrides = GameState.promptOverrides || {}; GameState.promptOverrides.consolidator = v; }
        },
        {
            id: 'chat', icon: '\u{1F4AC}', label: 'Chat with User',
            desc: 'Extra instructions appended to every AI-roleplayed reply in a diplomatic chat thread.',
            get: function () { return (GameState.promptOverrides || {}).chat || ''; },
            set: function (v) { GameState.promptOverrides = GameState.promptOverrides || {}; GameState.promptOverrides.chat = v; }
        },
        {
            id: 'actions', icon: '\u{26A1}', label: 'Actions',
            desc: 'Extra instructions appended when "Help brainstorm actions" generates suggested actions. By design, Actions does NOT see World Before/Simulation Rules/Difficulty, so this is the only lever here.',
            get: function () { return (GameState.promptOverrides || {}).actions || ''; },
            set: function (v) { GameState.promptOverrides = GameState.promptOverrides || {}; GameState.promptOverrides.actions = v; }
        }
    ];

    function renderPromptCards() {
        const grid = document.getElementById('prompt-card-grid');
        grid.innerHTML = '';
        PROMPT_CARDS.forEach(function (p) {
            const card = document.createElement('div');
            card.className = 'prompt-card' + (p.get() ? ' has-override' : '');
            card.innerHTML = '<span class="prompt-card-icon">' + p.icon + '</span><span class="prompt-card-label">' + p.label + '</span>';
            card.addEventListener('click', function () {
                document.getElementById('prompt-detail-title').textContent = p.label;
                document.getElementById('prompt-detail-desc').textContent = p.desc;
                document.getElementById('prompt-detail-textarea').value = p.get();
                document.getElementById('prompt-detail-status').textContent = '';
                document.getElementById('prompt-detail-save-btn').onclick = function () {
                    p.set(document.getElementById('prompt-detail-textarea').value);
                    saveGameState();
                    const status = document.getElementById('prompt-detail-status');
                    status.textContent = 'Saved ✓';
                    setTimeout(function () { status.textContent = ''; }, 1500);
                    renderPromptCards();
                };
                showMenuView('menu-view-prompt-detail');
            });
            grid.appendChild(card);
        });
    }

    // ==========================================================================
    // Entry point, called from the end of loadMapData() in the main script.
    // ==========================================================================
    function initGameSystems() {
        GameState = loadGameState();
        AIConfig = loadAIConfig();
        // Re-register any countries minted mid-game (e.g. a seceded US state —
        // see getOrCreateCountryCode()) into the live countryLookup BEFORE
        // reapplying province overrides below, so anything that resolves a
        // custom code's display name/color during that step (tooltips, the
        // country-border dissolve) already has it available.
        Object.keys(GameState.customCountries || {}).forEach(function (code) {
            if (!countryLookup[code]) countryLookup[code] = GameState.customCountries[code];
            // Re-apply state/province/region flag mapping on load/reload, since
            // ISO3_TO_ISO2 is rebuilt fresh each page load and won't remember a
            // prior session's custom-country flag assignment otherwise (see
            // SUBDIVISION_FLAGS in world_map_webgl.html — a worldwide superset of the
            // old US-only map — and the mint-time equivalent in getOrCreateCountryCode()).
            if (window.SUBDIVISION_FLAGS) {
                const lowerName = (GameState.customCountries[code] || '').toLowerCase();
                if (window.SUBDIVISION_FLAGS[lowerName]) {
                    ISO3_TO_ISO2[code] = window.SUBDIVISION_FLAGS[lowerName];
                }
            }
        });
        // Re-apply any saved province ownership overrides to the live map state
        // used by getEffectiveCountry() everywhere else, before anything renders.
        Object.keys(GameState.provinceOwnerOverrides || {}).forEach(function (shapeID) {
            provinceOwnerOverrides[shapeID] = GameState.provinceOwnerOverrides[shapeID];
        });
        if (Object.keys(provinceOwnerOverrides).length) {
            rebuildCountryLayers();
            // Also repaint each overridden municipality's own fill — see
            // restyleOverriddenMunicipalities() in world_map_webgl.html for why this is
            // needed in addition to rebuildCountryLayers() (which only handles the
            // separate, mostly-transparent country-border/dissolve layer).
            if (typeof restyleOverriddenMunicipalities === 'function') restyleOverriddenMunicipalities();
        }
        // Re-apply any saved Cheats > Modify Regions geometry edits (see
        // reapplyGeometryOverrides() in world_map_webgl.html).
        if (typeof reapplyGeometryOverrides === 'function') reapplyGeometryOverrides(GameState.geometryOverrides);
        // Re-apply any saved Cheats > Edit/Add/Clear Map Feature overrides and
        // Cheats > Fog of War shapes (see applyMapFeatureOverrides()/
        // applyFogOverrides() in world_map_webgl.html).
        if (typeof window.applyMapFeatureOverrides === 'function') window.applyMapFeatureOverrides(GameState.mapFeatureOverrides);
        if (typeof window.applyFogOverrides === 'function') window.applyFogOverrides(GameState.fogOfWarShapeIDs);

        // Historical presets: expand the era's country/region reassignment
        // dataset into real per-shape overrides (async — repaints on arrival;
        // deliberately not awaited so map startup never blocks on it).
        maybeApplyEraOverrides();

        initGameSettings();
        initMenuHub();
        initActionsPanel();
        initAdvisorPanel();
        initSearchPanel();
        initChatPanel();
        initCountryDetailPanel();
        initDatePillAndModals();
        initEventRevealModal();
    }

    window.initGameSystems = initGameSystems;
    // Kept exposed for the mint-time subdivision/secession flag mapping
    // (SUBDIVISION_FLAGS, window.buildFlagImageUrl() in world_map_webgl.html)
    // — country-level flags no longer use this (see resolveFlagSrc below).
    window.ISO3_TO_ISO2 = ISO3_TO_ISO2;
    // Shared with world_map_webgl.html's Map Feature popup so it resolves
    // flags the exact same local-only way buildFlagElement() above does (era
    // override first, "assets/flags/<code>/default.png" fallback) instead of
    // duplicating — or worse, drifting from — that logic. A plain function
    // (not GameState itself) since GameState gets REASSIGNED wholesale by
    // loadGameState() every initGameSystems() call, so exposing the object
    // once at declaration time would go stale after the very first load.
    // Bug this fixes: clicking a historical-era nation on the map (e.g.
    // German Empire in 1914) correctly showed its era name but always
    // rendered the MODERN flag, fetched from flagcdn.com — buildFeaturePopupHTML()
    // built its flag URL straight from ISO3_TO_ISO2 + buildFlagImageUrl() (a
    // CDN call this project otherwise deliberately never makes for country
    // flags), with no way to reach GameState.countryFlagOverrides or the
    // local assets/flags/ tree at all.
    window.resolveFlagSrc = function (code) {
        return resolveFlagSrc(code);
    };
    // Opened from the (i) button on the Map Feature popup's country row (see
    // buildFeaturePopupContent() in world_map_webgl.html).
    window.openCountryDetailPanel = openCountryDetailPanel;
})();
