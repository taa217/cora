# Voice Companion - Real-Time Voice Chat

A production-ready React + TypeScript application for low-latency, hands-free conversations powered by DeepInfra's `sesame/csm-1b` model.

## Features

- 🎤 **Live voice capture** with pause/resume controls (MediaRecorder API)
- 📝 **Instant speech-to-text** via the browser Web Speech API
- 🤖 **Streaming DeepInfra replies** using the OpenAI-compatible `/chat/completions` endpoint
- 🔊 **Automatic spoken responses** through the Web Speech synthesis engine
- 💬 **Conversation timeline** with context memory (last ~8 turns)
- 🎨 **Glassmorphism UI** tuned for desktop and touch devices
- ⚡ **Vite + React + Tailwind** for production-grade performance

## Tech Stack

- **React 18** with hooks
- **TypeScript 5**
- **Vite 5**
- **Tailwind CSS 3**
- **Web Speech + MediaRecorder APIs**
- **DeepInfra OpenAI-compatible API** (`sesame/csm-1b`)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A DeepInfra account and API key

### Installation

1. Install dependencies
   ```bash
   npm install
   ```
2. Copy the environment template and add your keys + model ids
   ```bash
   cp .env.example .env
   # edit .env and set VITE_DEEPINFRA_API_KEY, VITE_DEEPINFRA_MODEL_ID, VITE_OPENAI_API_KEY, VITE_OPENAI_MODEL
   ```
3. Start the dev server
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`

### Build & Preview

```bash
npm run build
npm run preview
```

## Environment Variables

| Name | Description |
| --- | --- |
| `VITE_DEEPINFRA_API_KEY` | DeepInfra API key with access to Sesame CSM |
| `VITE_DEEPINFRA_MODEL_ID` | Exact TTS model slug (see instructions below) |
| `VITE_OPENAI_API_KEY` | OpenAI key for text reasoning |
| `VITE_OPENAI_MODEL` | Chat model (e.g. `gpt-4o-mini`) |

> Keep secrets out of version control. Use `.env` locally and hosting-provider secrets in deployment.

**Finding the Sesame model slug**

DeepInfra exposes a model listing over the OpenAI-compatible API. After setting your API key, run:

```bash
curl https://api.deepinfra.com/v1/openai/models \
  -H "Authorization: Bearer $VITE_DEEPINFRA_API_KEY"
```

Set `VITE_DEEPINFRA_MODEL_ID` to the `id` value that corresponds to the Sesame Conversational Speech Model (for example `sesame/csm-1b` as shown on [DeepInfra](https://deepinfra.com/sesame/csm-1b)).

**Choosing the OpenAI model**

Use `curl https://api.openai.com/v1/models -H "Authorization: Bearer $VITE_OPENAI_API_KEY"` to list the models available to your account, then reference the `id` in `VITE_OPENAI_MODEL`.

## Real-Time Voice Loop

1. Capture mic audio and stream interim transcripts with the Web Speech API.
2. Send transcripts + rolling context to DeepInfra with `{ stream: true }`.
3. Render incoming tokens immediately for sub-second perceived latency.
4. Send the completed reply to DeepInfra’s Sesame CSM endpoint and play the returned audio blob.

## Latency Tips

- Keep user prompts short; the last ~8 turns are sent to DeepInfra.
- Deploy the frontend close to DeepInfra regions.
- Prefer wired mics or high-quality Bluetooth profiles to reduce capture lag.

## DeepInfra Reference Links

- [Sesame CSM-1B model card](https://deepinfra.com/sesame/csm-1b)
- [OpenAI-compatible streaming docs](https://deepinfra.com/docs/deep_infra_api#tag/OpenAI-Compatible)

## Testing Checklist

- ✅ Microphone permission prompt and recording controls function correctly.
- ✅ Transcript updates in near real-time while speaking.
- ✅ "Send to Companion" streams OpenAI tokens with no console errors.
- ✅ Replies are played using the Sesame CSM audio returned by DeepInfra (falls back to native speech synthesis if the API call fails).
- ✅ Reset clears conversation context and aborts inflight requests.

## Project Structure

```
src/
├── components/
│   └── VoiceRecorder/
│       ├── VoiceRecorder.tsx        # Main container
│       ├── ConversationPanel.tsx    # Chat timeline
│       ├── MessageBubble.tsx        # Bubble UI
│       ├── RecordingButton.tsx      # Capture controls
│       ├── TranscriptDisplay.tsx    # Live transcript
│       ├── AudioPlayer.tsx          # Playback widget
│       └── ErrorMessage.tsx         # Alert banner
├── hooks/
│   ├── useVoiceRecorder.ts          # Mic + transcription
│   └── useVoiceAssistant.ts         # DeepInfra + chat loop
├── lib/
│   └── deepinfra.ts                 # Streaming client
├── utils/
│   └── speech.ts                    # Speech synthesis helpers
├── types/
│   ├── voice.ts                     # Voice + chat types
│   └── speech.d.ts                  # Web Speech typings
├── App.tsx                          # Root component
├── main.tsx                         # Entry point
└── index.css                        # Global styles
```

## Browser Compatibility

- **Chrome / Edge**: Full support (recommended)
- **Firefox**: Works, but speech recognition can vary by locale
- **Safari**: Limited (Web Speech API still experimental)
- **Mobile Chrome / Edge**: Supported with HTTPS and user gestures

## License

MIT
