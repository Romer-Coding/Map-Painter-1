# Connecting an AI to Map Painter 1

This applies to Map Painter 1. Map Painter 2 has its own copy of this file — the AI fields are the same in both games, only where you open them differs.

Open the gear icon (top right of the map) → **AI Setup** (also reachable from **Cheats → AI Model**). There are five fields: **AI Provider**, **Base URL**, **API Key**, **Model**, and a **Test Connection** button. Nothing here is sent anywhere except directly from your browser to whichever provider you choose — it's stored only in this browser's local storage.

## Option A — Anthropic (Claude API): cloud, paid, easiest setup

1. Get an API key at [console.anthropic.com](https://console.anthropic.com) (Settings → API Keys → Create Key). This requires a billing method on the Anthropic Console.
2. In the game:
   - **AI Provider:** `Anthropic (Claude API)`
   - **Base URL:** leave blank
   - **API Key:** paste your key (starts with `sk-ant-...`)
   - **Model:** a current Claude model string, e.g. `claude-sonnet-4-5`
3. Click **Test Connection**.

## Option B — OpenAI (cloud, paid)

1. Get an API key at [platform.openai.com](https://platform.openai.com/api-keys).
2. In the game:
   - **AI Provider:** `OpenAI-compatible (OpenAI, Ollama, LM Studio, local, custom...)`
   - **Base URL:** leave blank (defaults to `https://api.openai.com/v1`)
   - **API Key:** paste your key (starts with `sk-...`)
   - **Model:** e.g. `gpt-4o-mini`
3. Click **Test Connection**.

## Option C — Ollama: free, runs models locally

1. Install [Ollama](https://ollama.com) and pull a model, e.g. `ollama pull llama3.1` in a terminal. Ollama runs its server automatically once installed — no separate "enable server" step.
2. In the game:
   - **AI Provider:** `OpenAI-compatible (OpenAI, Ollama, LM Studio, local, custom...)`
   - **Base URL:** `http://localhost:11434/v1`
   - **API Key:** leave blank
   - **Model:** the exact model name you pulled, e.g. `llama3.1`
3. Click **Test Connection**.

## Option D — LM Studio: free, runs models locally, GUI-based

1. Open LM Studio, download a model from its search tab, then go to the **Developer/Server** tab and start the local server (default port **1234**).
2. In the game:
   - **AI Provider:** `OpenAI-compatible (OpenAI, Ollama, LM Studio, local, custom...)`
   - **Base URL:** `http://localhost:1234/v1`
   - **API Key:** leave blank
   - **Model:** the model name exactly as shown loaded in LM Studio
3. Click **Test Connection**.

## Option E — GPT4All: free, runs models locally, simplest local GUI

1. Open GPT4All with a model loaded, then go to **Settings → Application → Advanced** and check **"Enable Local API Server"** (default port **4891**). Keep GPT4All running — the server only works while the app is open.
2. In the game:
   - **AI Provider:** `OpenAI-compatible (OpenAI, Ollama, LM Studio, local, custom...)`
   - **Base URL:** `http://localhost:4891/v1`
   - **API Key:** leave blank
   - **Model:** the exact model name as it appears in GPT4All, e.g. `Phi-3 Mini Instruct`
3. Click **Test Connection**.

## Option F — any other OpenAI-compatible endpoint

Anything that speaks the OpenAI chat-completions API works the same way: set **AI Provider** to the OpenAI-compatible option, **Base URL** to that service's API root (it should end in `/v1`, no trailing slash needed beyond that), **API Key** if it requires one, and **Model** to whatever model name that service expects.

## Troubleshooting

- **"Connected, but got an empty response"** — some "thinking"/reasoning models spend their token budget on internal reasoning before the visible reply. If Advisor/Actions replies still come through during actual play, this is harmless.
- **Test fails outright with a local option (Ollama/LM Studio/GPT4All)** — make sure that app is still open, its local server toggle is on (Ollama has none; it's automatic), and a model is actually loaded, not just downloaded.
- **Wrong port** — if you changed the port in Ollama/LM Studio/GPT4All's own settings, use that port in the Base URL instead of the default listed above.
- **Model name mismatch** — the Model field must match exactly what the provider expects; for local servers this is usually visible in that app's own UI.

Sources: [GPT4All API Server docs](https://docs.gpt4all.io/gpt4all_api_server/home.html), [Ollama OpenAI compatibility docs](https://docs.ollama.com/api/openai-compatibility), [LM Studio OpenAI-compat docs](https://lmstudio.ai/docs/developer/openai-compat)
