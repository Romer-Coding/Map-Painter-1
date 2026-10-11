"""
Map Painter 1 Offline — Game Engine
Talks to a local GPT4All server (OpenAI-compatible /v1/chat/completions)
and drives an alternate-history grand-strategy sandbox.
"""

import json
import os
import re
import time
import uuid
from copy import deepcopy

import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
SAVES_DIR = os.path.join(DATA_DIR, "saves")
CURRENT_PATH = os.path.join(DATA_DIR, "current.json")
SETTINGS_PATH = os.path.join(DATA_DIR, "settings.json")
PROMPTS_PATH = os.path.join(DATA_DIR, "prompts.json")

os.makedirs(SAVES_DIR, exist_ok=True)

DIFFICULTY_NOTES = {
    "Very Easy": "The world is forgiving. Rivals rarely act against the player nation, crises are mild, and the player's initiatives tend to succeed.",
    "Easy": "The world leans favorable. Setbacks are recoverable and opposition is muted.",
    "Normal": "The world behaves realistically and impartially. Success and failure both occur based on plausibility, not favoritism.",
    "Hard": "The world is unforgiving. Rivals actively exploit weakness, resources are scarce, and mistakes compound.",
    "Impossible": "The world is maximally adversarial within realism. Nearly every major power acts in its own self-interest against the player when plausible.",
}

DURATION_TO_DAYS = {
    "1 week": 7,
    "1 month": 30,
    "3 months": 91,
    "6 months": 182,
    "1 year": 365,
}

# How many discrete sub-events the AI should generate per jump length
DURATION_TO_EVENT_COUNT = {
    "1 week": 2,
    "1 month": 3,
    "3 months": 4,
    "6 months": 5,
    "1 year": 6,
}

CONSOLIDATE_START_ROUND = 15
CONSOLIDATE_CHUNK_SIZE = 5

DEFAULT_SETTINGS = {
    "base_url": "http://localhost:4891/v1",
    "model": "Llama 3 8B Instruct",
    "temperature": 0.85,
    "max_tokens": 900,
    "api_key": "not-needed",
}

# ---------------------------------------------------------------------------
# Default prompt templates (the 8 categories). Each is editable at runtime
# via /api/prompts. Template variables are substituted with str.format-style
# ${VAR} placeholders (custom substitution, see _fill()).
# ---------------------------------------------------------------------------
DEFAULT_PROMPTS = {
    "chat_with_advisor": (
        "You are the National Security Advisor to the leader of ${NATION}, "
        "in the year ${DATE}. Speak candidly, concisely, and in-world — no "
        "meta commentary about being an AI. Use the world state below to "
        "ground your advice in specifics (numbers, named rivals, recent "
        "events) rather than generic platitudes.\n\n"
        "CURRENT WORLD STATE:\n${STATE}\n\n"
        "RECENT EVENTS:\n${RECENT_EVENTS}\n\n"
        "${CONSOLIDATED_SUMMARY}\n\n"
        "The leader asks: \"${QUESTION}\"\n\n"
        "Respond in 2-4 short paragraphs as the advisor, in character."
    ),
    "chat_with_user": (
        "You are role-playing as the government of ${TARGET_NATION} in ${DATE}, "
        "engaged in direct diplomacy with ${NATION}. Stay strictly in character "
        "as ${TARGET_NATION}'s leadership — pursue ${TARGET_NATION}'s own interests, "
        "which may or may not align with ${NATION}'s. Do not be reflexively "
        "friendly; react the way this nation plausibly would given current "
        "relations and recent history.\n\n"
        "WORLD STATE:\n${STATE}\n\n"
        "RELATIONS BETWEEN ${NATION} AND ${TARGET_NATION}:\n${RELATION}\n\n"
        "RECENT EVENTS:\n${RECENT_EVENTS}\n\n"
        "${NATION}'s representative says: \"${MESSAGE}\"\n\n"
        "Reply with 1-3 in-character paragraphs as ${TARGET_NATION}'s government. "
        "End your reply with a line of the exact form:\n"
        "SENTIMENT_DELTA: <integer from -10 to 10>\n"
        "reflecting how this exchange shifted ${TARGET_NATION}'s sentiment toward ${NATION}."
    ),
    "jump_forward": (
        "You are the world-simulation engine for an alternate-history grand "
        "strategy sandbox. The player leads ${NATION}. Difficulty: ${DIFFICULTY} "
        "— ${DIFFICULTY_NOTE}\n\n"
        "${SIMULATION_RULES}\n\n"
        "CURRENT WORLD STATE (before this jump):\n${STATE}\n\n"
        "${CONSOLIDATED_SUMMARY}\n\n"
        "RECENT EVENTS (last few rounds):\n${RECENT_EVENTS}\n\n"
        "The player has queued the following actions for ${NATION}, to take "
        "effect over the next ${DURATION} (from ${DATE}):\n${ACTIONS}\n\n"
        "Simulate this time period. Generate roughly ${EVENT_COUNT} discrete "
        "world events (military, diplomatic, economic, or domestic-political) "
        "that plausibly occur, including consequences of the player's actions, "
        "independent moves by other major powers, and background world events. "
        "Not every event needs to involve ${NATION} directly.\n\n"
        "Respond with ONLY a single JSON object, no prose outside it, no "
        "markdown code fences, matching exactly this schema:\n"
        "{\n"
        '  "narrative": "<2-4 sentence high-level summary of the period>",\n'
        '  "events": [\n'
        '    {"title": "<short headline>", "category": "military|diplomacy|economy|domestic|other", "description": "<1-3 sentences>"}\n'
        "  ],\n"
        '  "stat_changes": {"economy": <int -15..15>, "military": <int -15..15>, "stability": <int -15..15>, "reputation": <int -15..15>},\n'
        '  "relation_changes": {"<Other Nation Name>": {"sentiment_delta": <int -20..20>, "note": "<short reason>"}},\n'
        '  "new_date": "${NEW_DATE}"\n'
        "}"
    ),
    "auto_jump_forward": (
        "You are the world-simulation engine. Advance ${NATION}'s world by "
        "${DURATION} from ${DATE} with NO new player actions queued — the "
        "player is passively observing. Use the same JSON schema as a normal "
        "jump. Generate background world events (other powers, economic "
        "drift, global incidents) that don't require the player's input.\n\n"
        "${SIMULATION_RULES}\n\n"
        "CURRENT WORLD STATE:\n${STATE}\n\n${CONSOLIDATED_SUMMARY}\n\n"
        "RECENT EVENTS:\n${RECENT_EVENTS}\n\n"
        "Respond with ONLY a JSON object matching:\n"
        "{\n"
        '  "narrative": "<2-4 sentences>",\n'
        '  "events": [{"title": "...", "category": "military|diplomacy|economy|domestic|other", "description": "..."}],\n'
        '  "stat_changes": {"economy": <int>, "military": <int>, "stability": <int>, "reputation": <int>},\n'
        '  "relation_changes": {},\n'
        '  "new_date": "${NEW_DATE}"\n'
        "}"
    ),
    "actions": (
        "You are polishing a player's freehand policy action for ${NATION} "
        "in ${DATE} into a clear, specific, executable directive a government "
        "would issue. Preserve the player's intent exactly — do not add new "
        "goals — but sharpen vague language, add plausible mechanism, and fix "
        "grammar. Keep it to 1-2 sentences.\n\n"
        "WORLD STATE:\n${STATE}\n\n"
        "Player's freehand action: \"${RAW_ACTION}\"\n\n"
        "Respond with ONLY the polished action text, nothing else."
    ),
    "next_speaker": (
        "This is a group diplomatic chat between ${NATION} and multiple other "
        "nations: ${PARTICIPANTS}. Given the conversation so far, decide which "
        "single nation would most plausibly speak next.\n\n"
        "CONVERSATION:\n${CONVERSATION}\n\n"
        "Respond with ONLY the nation's exact name, nothing else."
    ),
    "description_to_action": (
        "Convert this narrative description of what ${NATION} did into a "
        "concise mechanical action tag for game-logic purposes.\n\n"
        "Description: \"${DESCRIPTION}\"\n\n"
        "Respond with ONLY a short imperative phrase (max 8 words), nothing else."
    ),
    "event_consolidator": (
        "You are summarizing ${NATION}'s history for long-term AI memory. "
        "Condense the following block of rounds into a dense but readable "
        "summary (6-10 sentences) capturing: major shifts in ${NATION}'s "
        "power/economy/stability, changes in relations with other nations, "
        "wars or treaties, and any events with lasting consequences. Omit "
        "minor/flavor events. This summary will replace the detailed record "
        "of these rounds in the AI's context going forward, so preserve "
        "anything a future turn would need to remember.\n\n"
        "${PRIOR_SUMMARY}\n\n"
        "ROUNDS TO CONSOLIDATE:\n${EVENTS_BLOCK}\n\n"
        "Respond with ONLY the updated summary text."
    ),
    "new_game_briefing": (
        "Set up the start of an alternate-history grand strategy sandbox. "
        "The player leads ${NATION} beginning ${DATE}. Difficulty: ${DIFFICULTY} "
        "— ${DIFFICULTY_NOTE}\n\n"
        "${SIMULATION_RULES}\n\n"
        "Generate a realistic opening dossier for ${NATION} as it actually "
        "stood at this date, plus starting relations with 6-8 other major or "
        "regionally relevant powers.\n\n"
        "Respond with ONLY a JSON object matching exactly:\n"
        "{\n"
        '  "briefing": "<3-5 sentence scene-setting briefing for the player, in-world>",\n'
        '  "stats": {"economy": <int 0-100>, "military": <int 0-100>, "stability": <int 0-100>, "reputation": <int 0-100>},\n'
        '  "relations": {"<Nation Name>": {"sentiment": <int -100..100>, "status": "Allied|Friendly|Neutral|Tense|Rival|At War"}}\n'
        "}"
    ),
}


class GPT4AllError(Exception):
    pass


def load_json(path, default):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return deepcopy(default)


def save_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)


def get_settings():
    return load_json(SETTINGS_PATH, DEFAULT_SETTINGS)


def set_settings(patch):
    s = get_settings()
    s.update(patch)
    save_json(SETTINGS_PATH, s)
    return s


def get_prompts():
    stored = load_json(PROMPTS_PATH, {})
    merged = deepcopy(DEFAULT_PROMPTS)
    merged.update(stored)
    return merged


def set_prompt(category, text):
    if category not in DEFAULT_PROMPTS:
        raise ValueError(f"Unknown prompt category: {category}")
    stored = load_json(PROMPTS_PATH, {})
    stored[category] = text
    save_json(PROMPTS_PATH, stored)


def reset_prompt(category):
    stored = load_json(PROMPTS_PATH, {})
    stored.pop(category, None)
    save_json(PROMPTS_PATH, stored)


def _fill(template, values):
    """Substitute ${VAR} placeholders."""
    def repl(m):
        key = m.group(1)
        return str(values.get(key, m.group(0)))
    return re.sub(r"\$\{([A-Z_]+)\}", repl, template)


class GPT4AllClient:
    def __init__(self, settings=None):
        self.settings = settings or get_settings()

    def chat(self, system_prompt, user_prompt=None, temperature=None, max_tokens=None):
        url = self.settings["base_url"].rstrip("/") + "/chat/completions"
        messages = [{"role": "system", "content": system_prompt}]
        if user_prompt:
            messages.append({"role": "user", "content": user_prompt})
        else:
            # GPT4All's server wants at least one user message in many builds
            messages.append({"role": "user", "content": "Proceed."})
        payload = {
            "model": self.settings["model"],
            "messages": messages,
            "temperature": temperature if temperature is not None else self.settings["temperature"],
            "max_tokens": max_tokens if max_tokens is not None else self.settings["max_tokens"],
        }
        try:
            resp = requests.post(url, json=payload, timeout=180)
        except requests.exceptions.ConnectionError as e:
            raise GPT4AllError(
                "Could not reach GPT4All's local server at "
                f"{self.settings['base_url']}. In the GPT4All app, go to "
                "Settings > Application > Enable Local API Server, then make "
                "sure a model is loaded."
            ) from e
        if resp.status_code != 200:
            raise GPT4AllError(f"GPT4All server returned {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise GPT4AllError(f"Unexpected response shape from GPT4All: {data}") from e

    def health(self):
        try:
            url = self.settings["base_url"].rstrip("/") + "/models"
            resp = requests.get(url, timeout=5)
            return resp.status_code == 200
        except requests.exceptions.RequestException:
            return False


def _extract_json(text):
    """Best-effort extraction of a JSON object from an LLM response,
    stripping markdown fences and leading/trailing prose."""
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned.strip())
    cleaned = re.sub(r"```$", "", cleaned.strip())
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # fallback: grab the first {...} block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


# ---------------------------------------------------------------------------
# Game state
# ---------------------------------------------------------------------------

def new_state_skeleton(nation, start_year, difficulty, simulation_rules="", preset_title="", entity_meta=None):
    return {
        "id": str(uuid.uuid4())[:8],
        "nation": nation,
        "start_year": start_year,
        "current_date": f"{start_year}-01-01",
        "difficulty": difficulty,
        "simulation_rules": simulation_rules or "",
        "preset_title": preset_title or "",
        "entity_meta": entity_meta or {},  # {"color": "#hex", "lore": "...", "flag_emoji": "...", "custom": bool}
        "round_number": 0,
        "stats": {"economy": 50, "military": 50, "stability": 50, "reputation": 50},
        "relations": {},
        "events_log": [],       # list of {round, date, narrative, events:[...]}
        "pending_actions": [],  # list of strings queued for next jump
        "consolidated_summary": "",
        "consolidated_through_round": 0,
        "history_snapshots": [],  # list of full-state dicts, for rewind
        "created_at": time.time(),
    }


def load_current():
    if not os.path.exists(CURRENT_PATH):
        return None
    return load_json(CURRENT_PATH, None)


def save_current(state):
    save_json(CURRENT_PATH, state)


def recent_events_text(state, n_rounds=5):
    rounds = state["events_log"][-n_rounds:]
    if not rounds:
        return "(No events yet — the game has just begun.)"
    lines = []
    for r in rounds:
        lines.append(f"[Round {r['round']} — {r['date']}] {r['narrative']}")
        for ev in r.get("events", []):
            lines.append(f"  - ({ev.get('category', 'other')}) {ev.get('title', '')}: {ev.get('description', '')}")
    return "\n".join(lines)


def consolidated_summary_block(state):
    if not state.get("consolidated_summary"):
        return ""
    return f"LONG-TERM SUMMARY (rounds 1-{state['consolidated_through_round']}):\n{state['consolidated_summary']}"


def state_text(state):
    stats = state["stats"]
    rel_lines = []
    for nation, r in state.get("relations", {}).items():
        rel_lines.append(f"  - {nation}: sentiment {r.get('sentiment', 0)} ({r.get('status', 'Neutral')})")
    rel_text = "\n".join(rel_lines) if rel_lines else "  (no established relations yet)"
    return (
        f"Nation: {state['nation']}\n"
        f"Date: {state['current_date']}\n"
        f"Round: {state['round_number']}\n"
        f"Stats — Economy: {stats['economy']}, Military: {stats['military']}, "
        f"Stability: {stats['stability']}, Reputation: {stats['reputation']}\n"
        f"Relations:\n{rel_text}"
    )


def clamp(v, lo=0, hi=100):
    return max(lo, min(hi, v))


def apply_stat_changes(state, changes):
    for k, delta in (changes or {}).items():
        if k in state["stats"] and isinstance(delta, (int, float)):
            state["stats"][k] = clamp(int(state["stats"][k] + delta))


def apply_relation_changes(state, changes):
    for nation, info in (changes or {}).items():
        rel = state["relations"].setdefault(nation, {"sentiment": 0, "status": "Neutral"})
        delta = info.get("sentiment_delta", 0)
        try:
            rel["sentiment"] = max(-100, min(100, int(rel["sentiment"] + delta)))
        except (TypeError, ValueError):
            pass
        rel["status"] = _status_from_sentiment(rel["sentiment"])
        if info.get("note"):
            rel["last_note"] = info["note"]


def _status_from_sentiment(sentiment):
    if sentiment >= 60:
        return "Allied"
    if sentiment >= 25:
        return "Friendly"
    if sentiment >= -24:
        return "Neutral"
    if sentiment >= -59:
        return "Tense"
    if sentiment >= -89:
        return "Rival"
    return "At War"


def snapshot(state):
    snap = deepcopy(state)
    snap.pop("history_snapshots", None)
    return snap


def maybe_consolidate(state, client):
    round_n = state["round_number"]
    through = state["consolidated_through_round"]
    if round_n < CONSOLIDATE_START_ROUND:
        return
    unconsolidated = round_n - through
    if unconsolidated < CONSOLIDATE_CHUNK_SIZE:
        return
    chunk_rounds = [r for r in state["events_log"] if through < r["round"] <= through + CONSOLIDATE_CHUNK_SIZE]
    if not chunk_rounds:
        return
    events_block = "\n".join(
        f"[Round {r['round']} — {r['date']}] {r['narrative']}" for r in chunk_rounds
    )
    prompts = get_prompts()
    prior = state["consolidated_summary"]
    system = _fill(prompts["event_consolidator"], {
        "NATION": state["nation"],
        "PRIOR_SUMMARY": f"PRIOR SUMMARY:\n{prior}" if prior else "(no prior summary)",
        "EVENTS_BLOCK": events_block,
    })
    try:
        result = client.chat(system)
        state["consolidated_summary"] = result.strip()
        state["consolidated_through_round"] = through + CONSOLIDATE_CHUNK_SIZE
    except GPT4AllError:
        # non-fatal — just skip consolidation this round
        pass


# ---------------------------------------------------------------------------
# High-level game actions
# ---------------------------------------------------------------------------

def new_game(nation, start_year, difficulty, simulation_rules="", preset_title="", entity_meta=None):
    state = new_state_skeleton(nation, start_year, difficulty, simulation_rules, preset_title, entity_meta)
    client = GPT4AllClient()
    prompts = get_prompts()
    rules_block = f"SIMULATION RULES FOR THIS WORLD:\n{simulation_rules}" if simulation_rules else ""
    system = _fill(prompts["new_game_briefing"], {
        "NATION": nation,
        "DATE": state["current_date"],
        "DIFFICULTY": difficulty,
        "DIFFICULTY_NOTE": DIFFICULTY_NOTES.get(difficulty, ""),
        "SIMULATION_RULES": rules_block,
    })
    raw = client.chat(system)
    data = _extract_json(raw)
    if data:
        if isinstance(data.get("stats"), dict):
            for k in state["stats"]:
                if k in data["stats"]:
                    try:
                        state["stats"][k] = clamp(int(data["stats"][k]))
                    except (TypeError, ValueError):
                        pass
        if isinstance(data.get("relations"), dict):
            for nname, info in data["relations"].items():
                sentiment = info.get("sentiment", 0)
                try:
                    sentiment = int(sentiment)
                except (TypeError, ValueError):
                    sentiment = 0
                state["relations"][nname] = {
                    "sentiment": sentiment,
                    "status": info.get("status") or _status_from_sentiment(sentiment),
                }
        briefing = data.get("briefing", raw)
    else:
        briefing = raw
    state["events_log"].append({
        "round": 0,
        "date": state["current_date"],
        "narrative": briefing,
        "events": [{"title": "Briefing", "category": "other", "description": briefing}],
    })
    save_current(state)
    return state


def queue_action(state, text):
    state["pending_actions"].append(text)
    save_current(state)
    return state


def clear_pending_actions(state):
    state["pending_actions"] = []
    save_current(state)
    return state


def polish_action(state, raw_text):
    client = GPT4AllClient()
    prompts = get_prompts()
    system = _fill(prompts["actions"], {
        "NATION": state["nation"],
        "DATE": state["current_date"],
        "STATE": state_text(state),
        "RAW_ACTION": raw_text,
    })
    result = client.chat(system, temperature=0.6)
    return result.strip()


def _advance_date(date_str, days):
    from datetime import datetime, timedelta
    d = datetime.strptime(date_str, "%Y-%m-%d")
    d2 = d + timedelta(days=days)
    return d2.strftime("%Y-%m-%d")


def jump_forward(state, duration_label, auto=False):
    if duration_label not in DURATION_TO_DAYS:
        raise ValueError(f"Unknown duration: {duration_label}")
    client = GPT4AllClient()
    prompts = get_prompts()
    days = DURATION_TO_DAYS[duration_label]
    new_date = _advance_date(state["current_date"], days)
    event_count = DURATION_TO_EVENT_COUNT[duration_label]

    actions_text = "\n".join(f"- {a}" for a in state["pending_actions"]) or "(No explicit actions queued — government largely maintains current course.)"

    template_key = "auto_jump_forward" if auto else "jump_forward"
    rules_block = f"SIMULATION RULES FOR THIS WORLD:\n{state.get('simulation_rules', '')}" if state.get("simulation_rules") else ""
    system = _fill(prompts[template_key], {
        "NATION": state["nation"],
        "DATE": state["current_date"],
        "NEW_DATE": new_date,
        "DIFFICULTY": state["difficulty"],
        "DIFFICULTY_NOTE": DIFFICULTY_NOTES.get(state["difficulty"], ""),
        "SIMULATION_RULES": rules_block,
        "STATE": state_text(state),
        "CONSOLIDATED_SUMMARY": consolidated_summary_block(state),
        "RECENT_EVENTS": recent_events_text(state),
        "ACTIONS": actions_text,
        "DURATION": duration_label,
        "EVENT_COUNT": event_count,
    })
    raw = client.chat(system)
    data = _extract_json(raw)

    state["history_snapshots"].append(snapshot(state))
    # cap snapshot history to last 50 to keep file size sane
    state["history_snapshots"] = state["history_snapshots"][-50:]

    state["round_number"] += 1
    state["current_date"] = new_date

    if data:
        narrative = data.get("narrative", raw)
        events = data.get("events", [])
        apply_stat_changes(state, data.get("stat_changes"))
        apply_relation_changes(state, data.get("relation_changes"))
    else:
        narrative = raw
        events = []

    state["events_log"].append({
        "round": state["round_number"],
        "date": state["current_date"],
        "narrative": narrative,
        "events": events,
    })
    clear_pending_actions(state)
    maybe_consolidate(state, client)
    save_current(state)
    return state


def ask_advisor(state, question):
    client = GPT4AllClient()
    prompts = get_prompts()
    system = _fill(prompts["chat_with_advisor"], {
        "NATION": state["nation"],
        "DATE": state["current_date"],
        "STATE": state_text(state),
        "RECENT_EVENTS": recent_events_text(state),
        "CONSOLIDATED_SUMMARY": consolidated_summary_block(state),
        "QUESTION": question,
    })
    return client.chat(system, temperature=0.7).strip()


def diplomacy_message(state, target_nation, message):
    client = GPT4AllClient()
    prompts = get_prompts()
    rel = state["relations"].get(target_nation, {"sentiment": 0, "status": "Neutral"})
    rel_text = f"Sentiment: {rel.get('sentiment', 0)} ({rel.get('status', 'Neutral')})"
    system = _fill(prompts["chat_with_user"], {
        "NATION": state["nation"],
        "TARGET_NATION": target_nation,
        "DATE": state["current_date"],
        "STATE": state_text(state),
        "RELATION": rel_text,
        "RECENT_EVENTS": recent_events_text(state),
        "MESSAGE": message,
    })
    raw = client.chat(system, temperature=0.85)
    delta = 0
    m = re.search(r"SENTIMENT_DELTA:\s*(-?\d+)", raw)
    reply_text = raw
    if m:
        delta = int(m.group(1))
        reply_text = raw[:m.start()].strip()
    apply_relation_changes(state, {target_nation: {"sentiment_delta": delta, "note": "Direct diplomacy exchange"}})
    save_current(state)
    return reply_text, delta


def rewind(state, round_number):
    for snap in state["history_snapshots"]:
        if snap["round_number"] == round_number:
            restored = deepcopy(snap)
            restored["history_snapshots"] = [
                s for s in state["history_snapshots"] if s["round_number"] <= round_number
            ]
            save_current(restored)
            return restored
    raise ValueError(f"No snapshot found for round {round_number}")


def list_saves():
    out = []
    for fname in os.listdir(SAVES_DIR):
        if fname.endswith(".json"):
            out.append(fname[:-5])
    return sorted(out)


def save_as(state, name):
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)[:64] or "save"
    path = os.path.join(SAVES_DIR, f"{safe}.json")
    save_json(path, state)
    return safe


def load_save(name):
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)[:64]
    path = os.path.join(SAVES_DIR, f"{safe}.json")
    if not os.path.exists(path):
        raise ValueError(f"No save named {name}")
    state = load_json(path, None)
    save_current(state)
    return state
