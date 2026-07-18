# TrimOut — Progress Report & Roadmap
> Last updated: 2026-05-08

---

## ✅ What's Done & Working

### Phase 1 — URL Download (yt-dlp)
- Paste a YouTube / video URL → downloads via bundled yt-dlp → opens directly in app
- Progress bar during download
- Error handling (bad URL, network failure)

### Phase 2 — AI Tools Panel
- **Remove Silence** — FFmpeg `silencedetect` filter, auto-creates speech segments
- **Find Highlights** — energy peak detection (`-18dB` threshold)
- **Scene Split** — `select=gt(scene,X)` filter, splits on visual cuts
- Results show stats (speech kept, silence cut %, avg scene duration)
- Mini segment preview list (first 5 segments with timestamps)
- **"Add to Export Queue"** button replaces current segment list
- Explainer text after each result ("Silent parts will be CUT. See darkened zones on timeline.")

### Phase 3 — Whisper Transcription
- Local ONNX inference via `@xenova/transformers` (no Python, no server)
- Cloud fallback via OpenAI Whisper API (if key is set — ~10s for long videos)
- Fixed AudioContext Node.js crash: manual WAV decode (Int16 PCM → Float32)
- Progress bar (extracting → loading model → transcribing → done)
- Models: tiny / tiny.en / base / base.en / small / small.en
- Click transcript segment → seek to that time
- Keyword search → highlight matching segments in transcript
- **"Make clips from keyword"** → creates clips from matching transcript segments
- **Export SRT** → saves .srt subtitle file

### Phase 3b — Clips Panel (Export Queue)
- Right sidebar visual clip browser ("Export Queue")
- Each clip card: color bar, name, start→end timecode, duration
- Auto-scroll to active clip
- Click → seek to clip start
- Hover → ✕ delete button
- Header: "Export Queue — N clips · Xs total · each clip = 1 exported file"

### Phase 4 — API Keys Panel
- Store OpenAI / Anthropic (Claude) / Google (Gemini) keys locally
- Encrypted at rest via `electron-store`
- Show/hide key toggle
- Green dot indicator when key is saved
- "Keys stored locally, never sent to our servers" privacy note

### Phase 5a — UX Fixes
- **Single clip view**: SegmentList hamburger button hidden — ClipsPanel is the only clips UI
- **Timeline overlay**: removed/cut regions appear as dark semi-transparent mask with red border directly on thumbnail frames strip
- **Keyword highlights**: when transcript is available, Find Highlights searches transcript text instead of energy detection

### Phase 6 — Free Desktop App + Paid KICKO Cloud
- TrimOut opens without a local account, machine fingerprint, or license key
- Local editing, project organization, and computer export remain free
- Continuing in KICKO is optional and requires browser sign-in and explicit approval
- KICKO verifies an active paid subscription before issuing upload grants or creating cloud data
- Original game videos stay local; only selected rendered clips are transferred

---

## 🔴 Still Needs Testing

| Feature | Status | Notes |
|---|---|---|
| Remove Silence → timeline overlay | ⚠️ needs visual QA | Dark mask should appear on thumbnail strip after Apply |
| Find Highlights → keyword mode | ⚠️ needs test | Requires transcribing first, then typing keyword |
| Scene Split on real footage | ⚠️ needs test | Threshold 0.3 may need tuning |
| Whisper local (tiny model) | ⚠️ needs test | First run downloads ~150MB model |
| Whisper OpenAI API fallback | ⚠️ needs test | Requires OpenAI key in settings |
| SRT export | ⚠️ needs test | |
| URL download (YouTube) | ⚠️ needs test | yt-dlp may need update for new YT format |
| Export Clips → actual file output | ⚠️ needs test | Core LosslessCut export flow |
| SegmentList completely hidden | ⚠️ confirm | No hamburger icon, no keyboard shortcut visible |
| Timeline overlay visibility | ⚠️ confirm | Only shows when >0 inverse segments exist |

---

## 🚧 Next Steps (Ordered by Priority)

### A — Gumroad Distribution
- Publish the signed Windows installer as a free download
- Position KICKO cloud continuation as the paid upgrade
- Keep GPL source and third-party notices linked from the product page

### B — Code Signing
- Windows: EV certificate (DigiCert / Sectigo) — required for SmartScreen bypass
- macOS: Apple Developer account + notarization

### C — Landing Page
- Domain: trimout.io (or similar)
- Tech: simple HTML/CSS or Next.js
- Stripe integration for purchase flow

### D — MCP Server (Phase 5 remaining)
- Extend `httpServer.ts` with AI tools endpoints
- Allow external scripts / Claude agents to control TrimOut

---

## 📁 Key Files Reference

| File | Purpose |
|---|---|
| `src/renderer/src/App.tsx` | Main app, state management, layout |
| `src/renderer/src/components/AIToolsPanel.tsx` | AI tools (silence/highlights/scenes) |
| `src/renderer/src/components/ClipsPanel.tsx` | Export queue sidebar |
| `src/renderer/src/components/TranscriptPanel.tsx` | Whisper transcription UI |
| `src/renderer/src/components/ApiKeysPanel.tsx` | API keys storage |
| `src/main/whisper.ts` | Local Whisper ONNX + OpenAI API |
| `src/main/aiAnalysis.ts` | FFmpeg-based audio/scene analysis |
| `src/renderer/src/Timeline.tsx` | Timeline with removed-parts overlay |
| `src/main/index.ts` | Electron main process, IPC handlers |

---

## 💰 Product Model

| Product | Access | Features |
|---|---|---|
| TrimOut Desktop | Free | Local cutting, categorization, projects, and computer export |
| KICKO | Active paid subscription | Cloud project, player detection, effects, and final workflow |

---

## 🌐 Landing Page Must-Haves

- Hero: short demo GIF/video of silence removal + clip export
- Feature grid: multi-game projects · Scout Mode · local export · optional KICKO handoff
- Download button for the signed Windows installer
- Clear explanation that TrimOut is free and KICKO cloud requires a paid plan
- FAQ: "Does it need internet?" / "What formats?" / "GPL license?"
- Legal: Privacy Policy, EULA, Refund Policy links
