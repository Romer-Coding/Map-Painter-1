"""
Map Painter 1 Offline — Flask backend.
Run with: python app.py
Then open http://localhost:5050 in a browser.
Requires GPT4All's Local API Server enabled (Settings > Application in GPT4All).
"""

from flask import Flask, jsonify, request, render_template

import game_engine as ge

app = Flask(__name__)


def state_or_404():
    state = ge.load_current()
    if state is None:
        return None, (jsonify({"error": "No active game. Start one via /api/new_game."}), 404)
    return state, None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/health")
def health():
    client = ge.GPT4AllClient()
    ok = client.health()
    return jsonify({"gpt4all_reachable": ok, "base_url": client.settings["base_url"]})


@app.route("/api/settings", methods=["GET", "POST"])
def settings_route():
    if request.method == "GET":
        return jsonify(ge.get_settings())
    patch = request.json or {}
    return jsonify(ge.set_settings(patch))


@app.route("/api/prompts", methods=["GET"])
def get_prompts_route():
    return jsonify(ge.get_prompts())


@app.route("/api/prompts/<category>", methods=["POST"])
def set_prompt_route(category):
    body = request.json or {}
    if body.get("reset"):
        ge.reset_prompt(category)
        return jsonify(ge.get_prompts())
    try:
        ge.set_prompt(category, body.get("text", ""))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(ge.get_prompts())


@app.route("/api/state")
def get_state():
    state = ge.load_current()
    if state is None:
        return jsonify({"active": False})
    return jsonify({"active": True, "state": state})


@app.route("/api/new_game", methods=["POST"])
def new_game_route():
    body = request.json or {}
    nation = body.get("nation", "").strip()
    start_year = body.get("start_year", 1999)
    difficulty = body.get("difficulty", "Normal")
    simulation_rules = (body.get("simulation_rules") or "").strip()
    preset_title = (body.get("preset_title") or "").strip()
    entity_meta = body.get("entity_meta") if isinstance(body.get("entity_meta"), dict) else None
    if not nation:
        return jsonify({"error": "nation is required"}), 400
    try:
        start_year = int(start_year)
    except (TypeError, ValueError):
        return jsonify({"error": "start_year must be an integer"}), 400
    if difficulty not in ge.DIFFICULTY_NOTES:
        return jsonify({"error": f"difficulty must be one of {list(ge.DIFFICULTY_NOTES)}"}), 400
    try:
        state = ge.new_game(nation, start_year, difficulty, simulation_rules, preset_title, entity_meta)
    except ge.GPT4AllError as e:
        return jsonify({"error": str(e)}), 502
    return jsonify({"state": state})


@app.route("/api/action", methods=["POST"])
def action_route():
    state, err = state_or_404()
    if err:
        return err
    body = request.json or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    state = ge.queue_action(state, text)
    return jsonify({"state": state})


@app.route("/api/action/polish", methods=["POST"])
def polish_route():
    state, err = state_or_404()
    if err:
        return err
    body = request.json or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    try:
        polished = ge.polish_action(state, text)
    except ge.GPT4AllError as e:
        return jsonify({"error": str(e)}), 502
    return jsonify({"polished": polished})


@app.route("/api/action/<int:index>", methods=["DELETE"])
def delete_action_route(index):
    state, err = state_or_404()
    if err:
        return err
    if 0 <= index < len(state["pending_actions"]):
        state["pending_actions"].pop(index)
        ge.save_current(state)
    return jsonify({"state": state})


@app.route("/api/jump", methods=["POST"])
def jump_route():
    state, err = state_or_404()
    if err:
        return err
    body = request.json or {}
    duration = body.get("duration", "1 month")
    auto = bool(body.get("auto", False))
    if duration not in ge.DURATION_TO_DAYS:
        return jsonify({"error": f"duration must be one of {list(ge.DURATION_TO_DAYS)}"}), 400
    try:
        state = ge.jump_forward(state, duration, auto=auto)
    except ge.GPT4AllError as e:
        return jsonify({"error": str(e)}), 502
    return jsonify({"state": state})


@app.route("/api/advisor", methods=["POST"])
def advisor_route():
    state, err = state_or_404()
    if err:
        return err
    body = request.json or {}
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"error": "question is required"}), 400
    try:
        answer = ge.ask_advisor(state, question)
    except ge.GPT4AllError as e:
        return jsonify({"error": str(e)}), 502
    return jsonify({"answer": answer})


@app.route("/api/diplomacy", methods=["POST"])
def diplomacy_route():
    state, err = state_or_404()
    if err:
        return err
    body = request.json or {}
    target = (body.get("nation") or "").strip()
    message = (body.get("message") or "").strip()
    if not target or not message:
        return jsonify({"error": "nation and message are required"}), 400
    try:
        reply, delta = ge.diplomacy_message(state, target, message)
    except ge.GPT4AllError as e:
        return jsonify({"error": str(e)}), 502
    return jsonify({"reply": reply, "sentiment_delta": delta, "state": ge.load_current()})


@app.route("/api/rewind", methods=["POST"])
def rewind_route():
    state, err = state_or_404()
    if err:
        return err
    body = request.json or {}
    round_number = body.get("round")
    try:
        round_number = int(round_number)
    except (TypeError, ValueError):
        return jsonify({"error": "round (integer) is required"}), 400
    try:
        state = ge.rewind(state, round_number)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"state": state})


@app.route("/api/saves", methods=["GET"])
def list_saves_route():
    return jsonify({"saves": ge.list_saves()})


@app.route("/api/save", methods=["POST"])
def save_route():
    state, err = state_or_404()
    if err:
        return err
    body = request.json or {}
    name = (body.get("name") or state["nation"]).strip()
    saved_name = ge.save_as(state, name)
    return jsonify({"saved_as": saved_name})


@app.route("/api/load", methods=["POST"])
def load_route():
    body = request.json or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    try:
        state = ge.load_save(name)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    return jsonify({"state": state})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=False)
