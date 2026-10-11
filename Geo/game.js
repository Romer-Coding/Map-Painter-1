/* ==========================================================================
   Map Painter 1 — Gameplay systems: Actions, Chats, Advisor, Search, Jump
   Forward / Timeline. Loaded as a plain classic script BEFORE the main inline
   script in world_map_v2.html, so it shares the same top-level lexical scope
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
   ========================================================================== */

(function () {
    'use strict';

    // ---- Storage keys -----------------------------------------------------
    const GAME_STORAGE_KEY = 'mappainter1_gamestate_v1';
    const AI_CONFIG_KEY = 'mappainter1_aiconfig_v1';

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
            // priority over the default ISO3_TO_ISO2/SUBDIVISION_FLAGS-derived flag
            // in buildFlagElement(). Not populated automatically by anything yet;
            // this is the hook for manually-supplied alternate flags (e.g. a
            // revolutionary government's real flag) to plug into later. See
            // setCountryFlagOverride().
            countryFlagOverrides: {}
        };
    }

    let GameState = defaultGameState();

    function loadGameState() {
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
        try {
            localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(GameState));
        } catch (e) { console.warn('Failed to save game state:', e); }
    }

    // ---- AI config ----------------------------------------------------------
    let AIConfig = { provider: 'anthropic', baseUrl: '', apiKey: '', model: '' };

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
            if (raw) return Object.assign({ provider: 'anthropic', baseUrl: '', apiKey: '', model: '' }, JSON.parse(raw));
        } catch (e) { console.warn('Failed to load AI config:', e); }
        return { provider: 'anthropic', baseUrl: '', apiKey: '', model: '' };
    }

    function saveAIConfig() {
        try { localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(AIConfig)); } catch (e) { console.warn('Failed to save AI config:', e); }
    }

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
        let resp;
        try {
            resp = await fetch(base + '/chat/completions', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: AIConfig.model || 'gpt-4o-mini',
                    max_tokens: maxTokens,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
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
        // every other country in SUBDIVISION_FLAGS (world_map_v2.html).
        if (window.SUBDIVISION_FLAGS) {
            const lowerName = trimmedName.toLowerCase();
            if (window.SUBDIVISION_FLAGS[lowerName]) {
                ISO3_TO_ISO2[code] = window.SUBDIVISION_FLAGS[lowerName];
            }
        }
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
            let match = fromISO ? findProvinceByName(fromISO, ch.province) : null;
            if (!match) match = findProvinceByNameAnyCountry(ch.province);
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
                applied.push({ shapeID: shapeID, shapeName: props ? props.shapeName : ch.region, fromCountry: fromISO, toCountry: toISO });
            });

            if (ch.relationship && toISO !== fromISO) {
                setPolityRelationship(toISO, ch.relationship, fromISO || resolveCountryCode(ch.overlord));
            }
        });
        if (applied.length) rebuildCountryLayers();
        return applied;
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
        // since the region-ID migration — unwrapping .shapeIDs here for
        // consistency with the live (world_map_webgl.html) engine, though
        // this page (Geo/world_map_v2.html) isn't reachable from menu.js's
        // MAP_GAME_URL and isn't part of the live play path.
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

        if (countryCode && worldRegions[countryCode]) {
            const found = searchWithin(worldRegions[countryCode]);
            if (found) return found;
        }
        // No country given, or not found under that country — search everywhere
        // (a region name like "Aragon" or "Catalonia" is unlikely to collide).
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
    // Every era-preset flag path is a full "assets/flags/..." or
    // "../assets/flags/..." relative path already; the prompt-facing keys
    // above are always the bare "TAG/name.ext" form regardless, since
    // gov.flag is prefixed at storage time (see the governmentChanges
    // handler in runJumpForward() below) exactly like the era-preset
    // wiring already does.
    function buildKnownFlagsPromptText() {
        return KNOWN_HISTORICAL_FLAGS.map(function (pair) { return pair[0] + ' (' + pair[1] + ')'; }).join(', ');
    }
    // Only two shapes of flag override are accepted, both local/offline —
    // never a CDN or arbitrary remote URL. Unlike Map Painter 2 (which stores
    // a bare "TAG/name.png" key and prefixes assets/flags/ at render time),
    // this game's overrides are stored ready-to-use as img.src, so the stored
    // form is the full "../assets/flags/TAG/name.ext" relative path — see the
    // era-preset wiring below, which already prepends '../' at storage time.
    //   1. "../assets/flags/TAG/name.ext" — the LLM flag-swap key format (see
    //      the "flag" field on governmentChanges in runJumpForward()'s system
    //      prompt, and era_*.json's entities.<CODE>.flag).
    //   2. A data: URI — the in-browser-generated flags from
    //      buildTriggeredFlagDataUri()/maybeAssignTriggeredFlag() below.
    const LOCAL_FLAG_KEY_RE = /^\.\.\/assets\/flags\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|svg)$/i;
    function isValidFlagOverride(value) {
        return typeof value === 'string' && (LOCAL_FLAG_KEY_RE.test(value) || value.slice(0, 5) === 'data:');
    }
    // Attaches an explicit flag image URL to a country, overriding the default
    // ISO3_TO_ISO2/SUBDIVISION_FLAGS-derived flag in buildFlagElement(). This is
    // the hook for manually- or AI-supplied alternate flags (e.g. a specific
    // revolutionary government's real historical flag, or an era preset's
    // entity flag). Anything that isn't a local assets/flags/ path or a data:
    // URI is rejected (logged, not applied) — this is the enforcement point
    // that keeps flag rendering strictly local/offline even when the value
    // originates from an AI response.
    function setCountryFlagOverride(code, imageUrl) {
        if (!code) return;
        if (!GameState.countryFlagOverrides) GameState.countryFlagOverrides = {};
        if (imageUrl) {
            if (!isValidFlagOverride(imageUrl)) {
                console.warn('[flags] ignoring flag override for ' + code + ' — not a local assets/flags/ path or data URI:', imageUrl);
                return;
            }
            GameState.countryFlagOverrides[code] = imageUrl;
        } else {
            delete GameState.countryFlagOverrides[code];
        }
    }
    // Auto-assign trigger table for brand-new custom/breakaway countries only
    // (never established real nations) — mirrors Map Painter 2's game.js
    // (kept as a separate, smaller copy here since the two games don't share
    // state directly). This does NOT scrape or copy any asset from any real
    // website — every spec below is original geometry rendered via the same
    // buildFlagSVG-style renderer used in menu.js.
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
        if (GameState.countryFlagOverrides && GameState.countryFlagOverrides[code]) return;
        const trigger = FICTIONAL_FLAG_TRIGGERS.find(function (t) { return t.govType === govType; });
        if (!trigger) return;
        setCountryFlagOverride(code, buildTriggeredFlagDataUri(trigger.spec));
    }

    // Small helper to get a shape's {shapeName, shapeType} back out by shapeID,
    // since applyRegionChanges works from bare shapeIDs (out of worldRegions)
    // rather than already-found feature matches. provinceLayerById is already an
    // O(1) shapeID->layer index (built once in onEachMunicipality) and Leaflet
    // keeps the original GeoJSON feature on layer.feature, so this avoids a
    // linear scan over all ~49k shapes for every one of a state's ~30-250
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
                'or drastically change what they asked for. Respond with ONLY the rewritten action text, no quotes, no preamble.',
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
                (recentHistory ? ('\n\nRecent history for context:\n' + recentHistory) : ''),
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
        if (!recent.length) return '';
        return recent.map(function (round) {
            return 'Round ' + round.round + ' (' + round.fromDate + ' → ' + round.toDate + '): ' +
                round.events.map(function (e) { return e.headline; }).join('; ');
        }).join('\n');
    }

    function initActionsPanel() {
        renderPendingActions();
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
    // buildCountrySnapshotSVG() (world_map_v2.html, shared script scope) purely
    // from pre-validated hex colors and known country codes, never from raw text.
    // ==========================================================================
    const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

    // Splits an AI reply into { text, mapConfig }. mapConfig is null unless a
    // ```mapdata``` fenced block was present AND validated (unknown country
    // codes, malformed colors, or an empty result are all treated as "no map").
    function parseMapSnapshotBlock(rawText) {
        const match = /```mapdata\s*([\s\S]*?)```/i.exec(rawText || '');
        if (!match) return { text: rawText || '', mapConfig: null };
        const textWithoutBlock = ((rawText || '').slice(0, match.index) + (rawText || '').slice(match.index + match[0].length)).trim();
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

    // Builds the title + SVG + legend + caption embed block from a validated
    // mapConfig (see parseMapSnapshotBlock). Returns null if the map hasn't
    // loaded yet (buildCountrySnapshotSVG unavailable or has no geometry cached).
    function renderMapSnapshotEmbed(mapConfig) {
        if (typeof buildCountrySnapshotSVG !== 'function') return null;
        const svgMarkup = buildCountrySnapshotSVG({ countries: mapConfig.countries });
        if (!svgMarkup) return null;
        const wrap = document.createElement('div');
        wrap.className = 'advisor-map-snapshot';
        if (mapConfig.title) {
            const title = document.createElement('div');
            title.className = 'advisor-map-snapshot-title';
            title.textContent = mapConfig.title;
            wrap.appendChild(title);
        }
        const svgHost = document.createElement('div');
        // Generated internally from pre-validated hex colors + known country
        // codes only (see parseMapSnapshotBlock) — never from raw AI text.
        svgHost.innerHTML = svgMarkup;
        wrap.appendChild(svgHost);
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
                'entirely when a map would not add value — most replies should NOT include one. ' +
                (history ? ('Recent history:\n' + history) : ''),
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
    // .game-panel-railed / .panel-icon-rail in world_map_v2.html). History
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
            const eventsSummary = chapter.rounds.map(function (r) {
                return 'Round ' + r.round + ' (' + r.fromDate + ' → ' + r.toDate + '): ' +
                    (r.events.length ? r.events.map(function (e) { return e.headline; }).join('; ') : 'No major recorded events.');
            }).join('\n');
            const reply = await callAI(
                'You are a historian narrating the alternate-history timeline of a grand strategy game, told from ' +
                'the broader perspective of ' + playerName + ' but covering all major world events. Write a short ' +
                'narrative chapter (3-5 short paragraphs) covering the events below, in an engaging in-universe ' +
                'historical-summary voice, as if written well after the fact. ' +
                'You may format with "## " for a single chapter heading, "**bold**" for emphasis, and "- " bullet ' +
                'lists where useful — do not use any other markup.',
                'Events for this chapter:\n' + eventsSummary
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
    // window.buildFlagImageUrl() in world_map_v2.html), which still resolves
    // through flagcdn.com/iso3166-flags for brand-new breakaway-state flags —
    // a known remaining CDN gap outside this pass's scope (country-level
    // flags only), matching Map Painter 2's own Geo/game.js.
    const ISO3_TO_ISO2 = {'ABW':'aw','AFG':'af','AGO':'ao','AIA':'ai','ALA':'ax','ALB':'al','AND':'ad','ARE':'ae','ARG':'ar','ARM':'am','ASM':'as','ATA':'aq','ATF':'tf','ATG':'ag','AUS':'au','AUT':'at','AZE':'az','BDI':'bi','BEL':'be','BEN':'bj','BES':'bq','BFA':'bf','BGD':'bd','BGR':'bg','BHR':'bh','BHS':'bs','BIH':'ba','BLM':'bl','BLR':'by','BLZ':'bz','BMU':'bm','BOL':'bo','BRA':'br','BRB':'bb','BRN':'bn','BTN':'bt','BVT':'bv','BWA':'bw','CAF':'cf','CAN':'ca','CCK':'cc','CHE':'ch','CHL':'cl','CHN':'cn','CIV':'ci','CMR':'cm','COD':'cd','COG':'cg','COK':'ck','COL':'co','COM':'km','CPV':'cv','CRI':'cr','CUB':'cu','CUW':'cw','CXR':'cx','CYM':'ky','CYP':'cy','CZE':'cz','DEU':'de','DJI':'dj','DMA':'dm','DNK':'dk','DOM':'do','DZA':'dz','ECU':'ec','EGY':'eg','ERI':'er','ESH':'eh','ESP':'es','EST':'ee','ETH':'et','FIN':'fi','FJI':'fj','FLK':'fk','FRA':'fr','FRO':'fo','FSM':'fm','GAB':'ga','GBR':'gb','GEO':'ge','GGY':'gg','GHA':'gh','GIB':'gi','GIN':'gn','GLP':'gp','GMB':'gm','GNB':'gw','GNQ':'gq','GRC':'gr','GRD':'gd','GRL':'gl','GTM':'gt','GUF':'gf','GUM':'gu','GUY':'gy','HKG':'hk','HMD':'hm','HND':'hn','HRV':'hr','HTI':'ht','HUN':'hu','IDN':'id','IMN':'im','IND':'in','IOT':'io','IRL':'ie','IRN':'ir','IRQ':'iq','ISL':'is','ISR':'il','ITA':'it','JAM':'jm','JEY':'je','JOR':'jo','JPN':'jp','KAZ':'kz','KEN':'ke','KGZ':'kg','KHM':'kh','KIR':'ki','KNA':'kn','KOR':'kr','KWT':'kw','LAO':'la','LBN':'lb','LBR':'lr','LBY':'ly','LCA':'lc','LIE':'li','LKA':'lk','LSO':'ls','LTU':'lt','LUX':'lu','LVA':'lv','MAC':'mo','MAF':'mf','MAR':'ma','MCO':'mc','MDA':'md','MDG':'mg','MDV':'mv','MEX':'mx','MHL':'mh','MKD':'mk','MLI':'ml','MLT':'mt','MMR':'mm','MNE':'me','MNG':'mn','MNP':'mp','MOZ':'mz','MRT':'mr','MSR':'ms','MTQ':'mq','MUS':'mu','MWI':'mw','MYS':'my','MYT':'yt','NAM':'na','NCL':'nc','NER':'ne','NFK':'nf','NGA':'ng','NIC':'ni','NIU':'nu','NLD':'nl','NOR':'no','NPL':'np','NRU':'nr','NZL':'nz','OMN':'om','PAK':'pk','PAN':'pa','PCN':'pn','PER':'pe','PHL':'ph','PLW':'pw','PNG':'pg','POL':'pl','PRI':'pr','PRK':'kp','PRT':'pt','PRY':'py','PSE':'ps','PYF':'pf','QAT':'qa','REU':'re','ROU':'ro','RUS':'ru','RWA':'rw','SAU':'sa','SDN':'sd','SEN':'sn','SGP':'sg','SGS':'gs','SHN':'sh','SJM':'sj','SLB':'sb','SLE':'sl','SLV':'sv','SMR':'sm','SOM':'so','SPM':'pm','SRB':'rs','SSD':'ss','STP':'st','SUR':'sr','SVK':'sk','SVN':'si','SWE':'se','SWZ':'sz','SXM':'sx','SYC':'sc','SYR':'sy','TCA':'tc','TCD':'td','TGO':'tg','THA':'th','TJK':'tj','TKL':'tk','TKM':'tm','TLS':'tl','TON':'to','TTO':'tt','TUN':'tn','TUR':'tr','TUV':'tv','TWN':'tw','TZA':'tz','UGA':'ug','UKR':'ua','UMI':'um','URY':'uy','USA':'us','UZB':'uz','VAT':'va','VCT':'vc','VEN':'ve','VGB':'vg','VIR':'vi','VNM':'vn','VUT':'vu','WLF':'wf','WSM':'ws','XKX':'xk','YEM':'ye','ZAF':'za','ZMB':'zm','ZWE':'zw'};

    // Local assets/flags/ tree root, relative to this file (Geo/game.js).
    // Every flag rendered by buildFlagElement() below is read from here — no
    // CDN (flagcdn.com or otherwise) is ever contacted for a country flag.
    // See assets/flags/ATTRIBUTION.md for the Wikimedia Commons source/license
    // of every shipped file.
    const FLAGS_BASE_PATH = '../assets/flags/';
    // Countries whose local default.png is confirmed missing — logged once
    // each (not spammed). Read via window.getMissingLocalFlags().
    const missingLocalFlags = new Set();
    window.getMissingLocalFlags = function () { return Array.from(missingLocalFlags); };

    // Resolves the flag image src for a country — GameState.countryFlagOverrides
    // (see setCountryFlagOverride()) wins if set (already a full ready-to-use
    // "../assets/flags/..." path or data: URI, per this file's storage
    // convention), otherwise falls back to the local
    // "../assets/flags/<code>/default.png".
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
            thread.messages.push({ id: 'msg-' + Date.now(), sender: 'player', text: text });
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
                    'Keep the reply to 1-3 short paragraphs. Respond with ONLY the in-character reply text, no labels.',
                    'Conversation so far:\n' + history + '\n\nRespond as ' + otherNames + '.'
                );
                thread.messages.push({ id: 'msg-' + Date.now() + '-r', sender: thread.participants[0], text: reply || '(No response)' });
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
    // world_map_v2.html's buildFeaturePopupContent()). Shows every world event
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

    function openCountryDetailPanel(code) {
        if (!code || !countryLookup[code]) return;
        countryDetailActiveCode = code;
        countryDetailFilterText = '';
        countryDetailMapChangesOnly = false;

        document.getElementById('country-detail-name').textContent = countryLookup[code] || code;
        document.getElementById('country-detail-search').value = '';
        document.getElementById('country-detail-filter-btn').classList.remove('active');

        const statusWrap = document.getElementById('country-detail-status-wrap');
        const notes = [getGovernmentTypeNote(code), getPolityRelationshipNote(code), getStaticNoteForCountry(code)].filter(Boolean);
        if (notes.length) {
            document.getElementById('country-detail-status-note').textContent = notes.join('\n\n');
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

    function openEventsModalForRound(index) {
        const round = GameState.history[index];
        if (!round) return;
        viewingHistoryIndex = index;
        document.getElementById('events-modal-range').textContent = formatDateLong(round.fromDate) + ' → ' + formatDateLong(round.toDate);
        const body = document.getElementById('events-modal-body');
        body.innerHTML = '';
        round.events.forEach(function (ev, evIdx) {
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

            body.appendChild(card);
        });

        document.getElementById('events-prev-round').disabled = index === 0;
        document.getElementById('events-prev-round').style.display = index === 0 ? 'none' : 'inline-block';
        document.getElementById('events-jump-btn').textContent = (index === GameState.history.length - 1) ? 'Jump Forward »' : 'Next ›';
        document.getElementById('events-modal').classList.add('open');
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
                'it\'s clear their planning mattered. Some events may transfer ' +
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
                'An event may also place new military units (battalions/militias) on the map via a "unitSpawns" ' +
                'array. If the player\'s action or the simulated timeline events describe military troops, ' +
                'militias, or battalions spawning or being raised at a location, you MUST populate the unitSpawns ' +
                'array with a descriptive name (e.g. "Texas 10k Militia"), the city or province name, and the ' +
                'country\'s display name. If no units are raised, keep this array empty — do not invent a spawn for ' +
                'every event. "location" must be the EXACT name of a known city or province/region given to you ' +
                'elsewhere in this prompt (never invent a place name); "country" is the owning country\'s name at ' +
                'the time of the spawn (may be a brand-new nation formed earlier in this same response). ' +
                'An event may also record a change in a country\'s form of government via a "governmentChanges" ' +
                'array — use this ONLY for a genuine regime-defining moment (a coup, a revolution overthrowing the ' +
                'government, a monarchy restored or abolished, a republic declared, a military junta seizing power, ' +
                'a communist/one-party state established, etc), never for routine elections or policy changes. Each ' +
                'entry needs "country" (the country\'s display name) and "type" — one of "monarchy", "republic", ' +
                '"military junta", "communist state", "revolutionary government", "provisional government", ' +
                '"colonial administration", or "other". An entry may optionally include "flag" — a real historical ' +
                'flag to swap in. These EXACT keys are the only ones that exist as local flag assets: ' +
                knownFlagsText + '. Additionally, any real country\'s own current flag is available as ' +
                '"TAG/default.png" (its 3-letter code). Use "flag" only when the regime change matches one of ' +
                'these exactly, copying the key verbatim — never invent a path, never alter one, never use a URL. ' +
                'If the regime change doesn\'t match any of them, omit "flag" entirely: a plausible flag is ' +
                'auto-generated for brand-new custom/breakaway countries, and established real nations simply ' +
                'keep whatever flag they currently have. If nothing like that happens, keep this array empty. ' +
                'Respond with ONLY a JSON object of this exact shape, nothing else:\n' +
                '{"toDate":"YYYY-MM-DD","events":[{"date":"YYYY-MM-DD","tags":[{"type":"country","label":"Country Name"}],' +
                '"headline":"SHORT HEADLINE","body":"1-3 sentence narrative paragraph",' +
                '"mapChanges":[{"province":"Exact Province Name","fromCountry":"Country Name","toCountry":"Country Name"}],' +
                '"regionChanges":[{"country":"Country Name","region":"Exact Region Name","toCountry":"Country Name",' +
                '"relationship":"independent|puppet|protectorate|vassal|autonomous","overlord":"Country Name"}],' +
                '"unitSpawns":[{"name":"Unit Name","location":"City or Province Name","country":"Country Name"}],' +
                '"governmentChanges":[{"country":"Country Name","type":"monarchy|republic|military junta|communist state|revolutionary government|provisional government|colonial administration|other","flag":"TAG/name.png (optional)"}],' +
                '"altNames":[{"country":"Country Name","name":"Nickname or alliance/treaty designation"}]}]}\n' +
                'mapChanges and regionChanges may both be empty arrays on most events — use regionChanges only for ' +
                'whole-region changes, mapChanges for individual named provinces. "relationship" and "overlord" are ' +
                'optional on each regionChanges entry and should be omitted entirely for a plain full-independence ' +
                'or ordinary annexation with no puppet dynamic. altNames, unitSpawns, and governmentChanges may ' +
                'also be empty arrays on most events — only include an altNames entry when this specific event ' +
                'plausibly earns a country a new nickname, alliance codename, or treaty/bloc designation (e.g. ' +
                'forming a pact); do not invent one for every event. Use 1-6 events depending on how eventful the ' +
                'period is. ' +
                'Keep headlines short (under 12 words) and bodies to 1-3 sentences — do not enumerate every ' +
                'individual sub-unit (e.g. every county or district) by name in the narrative text; that level of ' +
                'detail belongs in regionChanges/mapChanges, not prose. Keep the ENTIRE response compact enough to ' +
                'fit well within your output token budget — an incomplete/truncated JSON response is a failure, so ' +
                'if you are running long, favor fewer events and shorter prose over cutting the JSON short.' +
                (countryContext ? ('\n\nKnown provinces you may reference for map changes:' + countryContext) : '') +
                (recentHistory ? ('\n\nRecent history for continuity:\n' + recentHistory) : '');

            const userPrompt =
                'Current date: ' + GameState.currentDate + '\n\n' +
                'Pending actions this round:\n' + actionsText +
                (chatSummary ? ('\n\nActive diplomatic conversations:\n' + chatSummary) : '');

            const raw = await callAI(systemPrompt, userPrompt, { maxTokens: 4096 });
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

            let allMapChanges = [];
            const eventsOut = parsed.events.map(function (ev, i) {
                let applied = ev.mapChanges && ev.mapChanges.length ? applyMapChanges(ev.mapChanges) : [];
                if (ev.regionChanges && ev.regionChanges.length) {
                    applied = applied.concat(applyRegionChanges(ev.regionChanges));
                }
                allMapChanges = allMapChanges.concat(applied);
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
                // world_map_v2.html (spawnUnit(), exposed as window.spawnUnit since
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
                if (ev.governmentChanges && ev.governmentChanges.length) {
                    ev.governmentChanges.forEach(function (gov) {
                        if (!gov || !gov.country || !gov.type) return;
                        const code = getOrCreateCountryCode(gov.country);
                        setGovernmentType(code, gov.type, ev.date || fromDate);
                        // An explicit LLM-supplied local flag key wins over the
                        // synthetic auto-generated one — see isValidFlagOverride()
                        // for the strict "local path or data: URI only" check that
                        // keeps this from ever becoming a CDN/remote-URL vector.
                        // gov.flag arrives as a bare "TAG/name.ext" key (per the
                        // system prompt); this page's overrides are stored as
                        // full '../assets/flags/...' paths (see the era-preset
                        // wiring above), so the same prefix is added here too.
                        if (gov.flag) setCountryFlagOverride(code, '../assets/flags/' + gov.flag);
                        else maybeAssignTriggeredFlag(code, gov.type);
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
                    governmentChanges: ev.governmentChanges || []
                };
            });

            GameState.history.push({ round: GameState.round, fromDate: fromDate, toDate: toDate, events: eventsOut });
            GameState.round += 1;
            GameState.currentDate = toDate;
            GameState.pendingActions = [];
            saveGameState();
            renderDatePill();
            renderPendingActions();

            document.getElementById('simulating-overlay').classList.remove('open');
            openEventsModalForRound(GameState.history.length - 1);
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
        const statusLine = document.getElementById('ai-config-status');

        providerSelect.value = AIConfig.provider;
        baseUrlInput.value = AIConfig.baseUrl || '';
        apiKeyInput.value = AIConfig.apiKey || '';
        modelInput.value = AIConfig.model || '';

        function persist() {
            AIConfig.provider = providerSelect.value;
            AIConfig.baseUrl = baseUrlInput.value.trim();
            AIConfig.apiKey = apiKeyInput.value.trim();
            AIConfig.model = modelInput.value.trim();
            saveAIConfig();
        }
        [providerSelect, baseUrlInput, apiKeyInput, modelInput].forEach(function (el) {
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
    // Historical-era border overrides (era_*.json presets)
    // ==========================================================================
    // Ported from Map Painter 2's Geo/game.js / this project's own WebGL
    // engine (game.js at the project root) — this file (the restored
    // original Leaflet engine, launched via "Play Map Painter 1 (Leaflet).bat")
    // never had this system at all, which is why every historical preset
    // rendered modern-day borders regardless of which era was selected.
    // Dataset shape (see presets/era_1914.json's _readme for the annotated
    // reference copy):
    //   entities:             { CODE: {name, color?, flag?} } — new polities
    //                         (AUH, OTT, SOV, YUG...) or renames of existing
    //                         codes (RUS -> "Russian Empire").
    //   countryReassignments: { effectiveCode: newOwnerCode } — every shape
    //                         whose CURRENT effective owner matches the key
    //                         is reassigned wholesale.
    //   regionReassignments:  { countryCode: { regionId: newOwner } } — finer,
    //                         whole-ADM1-region splits, resolved through the
    //                         numeric IDs in worldRegions (world_regions.json).
    //                         Applied AFTER countryReassignments, so a country
    //                         pass can set the majority owner and region
    //                         entries carve out the exceptions.
    // The expensive expansion into per-shape overrides runs ONCE per game
    // (guarded by GameState.eraApplied) so it can never revert territory the
    // AI legitimately transfers later in play.
    function normalizeRegionKey(s) {
        let v = String(s || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
            .trim();
        v = v.replace(/\s+(voivodeship|oblast|county|province|region|governorate|department|prefecture|district|municipality|canton|state|krai|okrug|raion|rayon|parish|shire|territory)\s*$/i, '');
        return v.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    // world_regions.json (shared with the WebGL engine) already exposes every
    // region — including France's departments and Italy's Trentino/South
    // Tyrol/Trieste provinces — as real ADM1-level keys with numeric IDs, so
    // no hardcoded supplementary shapeIDs are needed here (see the WebGL
    // engine's own ADM2_SUPPLEMENTARY_REGIONS for why this stays an escape
    // hatch rather than being deleted outright).
    const ADM2_SUPPLEMENTARY_REGIONS = {};
    async function maybeApplyEraOverrides() {
        if (!GameState.era) return;
        let data = null;
        try {
            // This file is served from Geo/ but presets/ lives at the project
            // root (one level up) — see "Play Map Painter 1 (Leaflet).bat",
            // which now roots its server there specifically so this resolves.
            const resp = await fetch('../presets/era_' + GameState.era + '.json?v=1');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            data = await resp.json();
        } catch (e) {
            console.warn('Era dataset era_' + GameState.era + '.json not available — the map will show modern borders for this era until it exists.', e);
            return;
        }

        if (data.unassignedKeepModernOwner === false) {
            console.warn('Era dataset era_' + GameState.era + '.json sets unassignedKeepModernOwner: false — ' +
                'not supported by this engine, every unassigned shape keeps its modern owner regardless.');
        }

        // 1. Register era entities — names/colors/flags.
        Object.keys(data.entities || {}).forEach(function (code) {
            const ent = data.entities[code];
            if (!ent) return;
            if (ent.name) {
                countryLookup[code] = ent.name;
                GameState.customCountries[code] = ent.name;
            }
            if (ent.color && window.ERA_COLOR_OVERRIDES) window.ERA_COLOR_OVERRIDES[code] = ent.color;
            // ent.flag paths (e.g. "assets/flags/DEU/1939.png") are written
            // relative to the project root, but this page lives one level
            // down in Geo/ and buildFlagElement() here uses overrideUrl
            // directly as img.src with no base-path prefixing step of its
            // own (unlike Map Painter 2's FLAGS_BASE_PATH+key pattern) — so
            // the "../" has to be added once, here, at storage time.
            if (ent.flag && !GameState.countryFlagOverrides[code]) setCountryFlagOverride(code, '../' + ent.flag);
        });

        // 2. Expand the reassignment tables into per-shape overrides — once.
        if (!GameState.eraApplied) {
            try {
                const newOverrides = {};
                const byCountry = data.countryReassignments || {};
                targetObject.geometries.forEach(function (geom) {
                    const props = geom.properties;
                    const effective = provinceOwnerOverrides[props.shapeID] || props.shapeGroup;
                    if (byCountry[effective]) newOverrides[props.shapeID] = byCountry[effective];
                });
                const byRegion = data.regionReassignments || {};
                function regionEntryShapeIDs(entry) {
                    if (!entry) return [];
                    return Array.isArray(entry) ? entry : (entry.shapeIDs || []);
                }
                Object.keys(byRegion).forEach(function (countryCode) {
                    const wanted = byRegion[countryCode];
                    const regionIndex = Object.assign({}, worldRegions[countryCode] || {}, ADM2_SUPPLEMENTARY_REGIONS[countryCode] || {});
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
                            regionEntryShapeIDs(entry).forEach(function (shapeID) { newOverrides[shapeID] = wanted[regionKeyOrName]; });
                            return;
                        }
                        const realName = normalized[normalizeRegionKey(regionKeyOrName)];
                        if (!realName) { console.warn('Era overrides: region "' + regionKeyOrName + '" not found in ' + countryCode + ' — skipped.'); return; }
                        regionEntryShapeIDs(regionIndex[realName]).forEach(function (shapeID) {
                            newOverrides[shapeID] = wanted[regionKeyOrName];
                        });
                    });
                });
                Object.assign(provinceOwnerOverrides, newOverrides);
                GameState.provinceOwnerOverrides = Object.assign({}, GameState.provinceOwnerOverrides, newOverrides);
                GameState.eraApplied = true;
                saveGameState();
                console.log('Era overrides applied: ' + Object.keys(newOverrides).length + ' shapes reassigned for era ' + GameState.era + '.');
            } catch (eraErr) {
                console.error('Era overrides FAILED for era ' + GameState.era + ':', eraErr);
            }
        }

        // 3. Repaint — entity colors/names only just arrived, and on a first
        // load the overrides themselves did too.
        rebuildCountryLayers();
        if (typeof restyleOverriddenMunicipalities === 'function') restyleOverriddenMunicipalities();
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
            // SUBDIVISION_FLAGS in world_map_v2.html — a worldwide superset of the
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
            // restyleOverriddenMunicipalities() in world_map_v2.html for why this is
            // needed in addition to rebuildCountryLayers() (which only handles the
            // separate, mostly-transparent country-border/dissolve layer).
            if (typeof restyleOverriddenMunicipalities === 'function') restyleOverriddenMunicipalities();
        }

        // Historical presets: expand the era's country/region reassignment
        // dataset into real per-shape overrides (async — repaints on arrival;
        // deliberately not awaited so map startup never blocks on it). By the
        // time initGameSystems() runs, world_map_v2.html has already awaited
        // its own Promise.all for targetObject/worldRegions, so there's no
        // load-order race to guard against here the way the WebGL engine
        // needs to with its MP1_GEODATA_READY/MP1_PROVINCE_INDEX_READY promises.
        maybeApplyEraOverrides();

        initGameSettings();
        initActionsPanel();
        initAdvisorPanel();
        initSearchPanel();
        initChatPanel();
        initCountryDetailPanel();
        initDatePillAndModals();
    }

    window.initGameSystems = initGameSystems;
    // Kept exposed for the mint-time subdivision/secession flag mapping
    // (SUBDIVISION_FLAGS, window.buildFlagImageUrl() in world_map_v2.html) —
    // country-level flags no longer use this (see resolveFlagSrc below).
    window.ISO3_TO_ISO2 = ISO3_TO_ISO2;
    // Shared with world_map_v2.html's Map Feature popup so it resolves flags
    // the exact same local-only way buildFlagElement() above does (era
    // override first, "../assets/flags/<code>/default.png" fallback) instead
    // of duplicating — or worse, drifting from — that logic, and instead of
    // building a flagcdn.com URL straight from ISO3_TO_ISO2 with no way to
    // reach GameState.countryFlagOverrides at all. A plain function (not
    // GameState itself) since GameState gets REASSIGNED wholesale by
    // loadGameState() every initGameSystems() call.
    window.resolveFlagSrc = function (code) {
        return resolveFlagSrc(code);
    };
    // Opened from the (i) button on the Map Feature popup's country row (see
    // buildFeaturePopupContent() in world_map_v2.html).
    window.openCountryDetailPanel = openCountryDetailPanel;
})();
