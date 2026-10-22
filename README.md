# InterviewPilot: AI Voice Mock Interviews

> Practice your next job interview **out loud** with Maya, an AI interviewer who reads your CV and the job post, asks questions by voice, and digs deeper when your answers are vague.

## What it does

- 🎙️ **Real voice conversation:** Maya speaks her questions (text-to-speech) and listens to your spoken answers (speech recognition), like a real call.
- 🧠 **Adapts to you:** every question is grounded in your CV and the job description, and vague answers get follow-ups, as a senior interviewer would do.
- ⚡ **Low latency:** the interviewer's reply streams from the model and starts speaking sentence by sentence before the full reply has arrived.
- 🌍 **English or Arabic:** full right-to-left support and Arabic speech in and out.
- 📄 **CV upload:** upload a PDF and Claude converts it to text once, so each turn sends compact text.
- ⌨️ **Accessible fallbacks:** type your answers if you have no microphone, mute the voice, repeat a question.
- 🆓 **Demo mode:** runs without an API key using a scripted interviewer, so anyone can try it.

## Tech

| Layer | Tech |
| --- | --- |
| App | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| AI | Claude via the Anthropic SDK: streaming responses, prompt caching, server-side refusal fallbacks |
| Voice | Web Speech API (`SpeechRecognition` + `speechSynthesis`) wrapped in custom React hooks |
| Streaming | Route Handler returns a `ReadableStream`; the client reads the stream and feeds a sentence-chunking speech queue |

## Architecture highlights

- **Append-only conversation → prompt cache hits.** The transcript is converted to Messages API turns where each turn's wrapper depends only on its position, so earlier turns never change and the CV + job context is cached across the whole interview (`src/lib/prompts.ts`).
- **Streaming speech pipeline.** `useSpeaker` exposes `begin() → feed(chunk) → end()`: complete sentences are spoken as soon as they arrive, and `end()` resolves when the voice finishes, which is when the mic opens (`src/hooks/useSpeaker.ts`).
- **Robust listening.** Browsers stop recognition after pauses; `useSpeechRecognition` restarts it transparently and keeps the text it has already heard (`src/hooks/useSpeechRecognition.ts`).
- **Server-controlled flow.** The API validates the transcript shape and length and signals the closing turn with an `X-Interview-Final` header.
- **Prompt-injection aware:** CV, job post and answers are treated as untrusted data.

## Run locally

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (optional, demo mode works without it)
npm run dev
```

Open http://localhost:3000 in **Chrome or Edge**, allow the microphone, and click **Try with a sample**.

## Roadmap

- [x] Voice interview loop with adaptive follow-ups
- [ ] AI scorecard: per-answer scores, skills radar, filler words, speaking pace, improved answers
- [ ] Live coding round with an in-browser editor
- [ ] Accounts and interview history
- [ ] Natural neural voices

---

Built by **[Sireen Alzoughbi](https://github.com/SireenZo)** · Also see **[MatchMyCV](https://github.com/SireenZo/matchmycv)**.
