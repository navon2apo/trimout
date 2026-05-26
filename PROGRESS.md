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

### Phase 6 — License System (in app)
- **LicenseGate screen**: shown on first launch before main UI — dark, polished design
- **Machine ID displayed**: user sees their machine fingerprint before purchasing (stable UUID stored in userData)
- **Key entry + activation**: calls Vercel API, validates against Supabase, stores locally encrypted
- **7-day offline grace period**: app works offline if last check < 7 days ago
- **Max 2 machines**: enforced server-side, graceful error with deactivation instructions
- **Dev bypass**: `TRIMOUT_DEV_BYPASS=1` env var skips all server calls
- **Deactivation support**: machine slot freed, key reusable on another machine
- **Files**: `src/main/license.ts`, `src/renderer/src/components/LicenseGate.tsx`, wired into `App.tsx`

### Phase 6b — License Server (Vercel + Supabase, $0 cost)
- **`license-server/api/activate.ts`**: registers machine, enforces max_activations limit
- **`license-server/api/status.ts`**: validates machine on app startup
- **`license-server/api/deactivate.ts`**: frees a machine slot
- **`license-server/api/webhook-gumroad.ts`**: creates license on Gumroad sale, revokes on refund
- **`license-server/schema.sql`**: Supabase tables (`licenses`, `activations`)
- Key format: `TRIM-XXXX-XXXX-XXXX-XXXX` (auto-generated on sale webhook)

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

### A — Licensing & DRM (next sprint)
See full plan below ↓

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

## 🚀 License Server — Deploy Checklist (one-time setup)

### Step 1 — Supabase (free)
1. Create project at supabase.com (free tier)
2. Go to SQL Editor → paste contents of `license-server/schema.sql` → Run
3. Settings → API → copy **Project URL** and **service_role key** (not anon key)

### Step 2 — Vercel (free)
```bash
cd license-server
npm install
npx vercel login
npx vercel --prod
```
Then in Vercel dashboard → Settings → Environment Variables, add:
| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `GUMROAD_WEBHOOK_SECRET` | Any random string (e.g. `mysecret123`) |

After adding env vars → Vercel → Deployments → Redeploy.

Note the deployed URL (e.g. `https://trimout-license.vercel.app`).
Update `LICENSE_SERVER` constant in `src/main/license.ts` to match.

### Step 3 — Gumroad (free, 10% cut)
1. Create product at gumroad.com
2. Product Settings → Advanced → Ping URL → `https://trimout-license.vercel.app/api/webhook-gumroad`
3. Add passphrase = same value as `GUMROAD_WEBHOOK_SECRET`
4. Set up email receipt: tell buyers their key is in the receipt (use Gumroad's "Custom receipt" to show `{{ key }}` — OR set up Make.com to email keys from Supabase)

### Step 4 — Test end-to-end
```bash
# Test activate
curl -X POST https://trimout-license.vercel.app/api/activate \
  -H "Content-Type: application/json" \
  -d '{"key":"TRIM-TEST-0000-0000-0001","machineId":"test123"}'

# Test status
curl -X POST https://trimout-license.vercel.app/api/status \
  -H "Content-Type: application/json" \
  -d '{"key":"TRIM-TEST-0000-0000-0001","machineId":"test123"}'
```

### Dev testing (bypass license gate)
```bash
TRIMOUT_DEV_BYPASS=1 yarn dev
```

---

## 🔑 Licensing & Sales Plan (Full Detail)

### Goal
- User purchases license → receives a **license key**
- Key must be entered on first launch
- Key is tied to **max 2 machines**
- If machine count exceeded → graceful error with support contact

### Architecture Options

#### Option 1 — Self-hosted (full control)
```
Purchase (Stripe) → webhook → our server generates key → email to user
App startup → calls our API with key + machine fingerprint → validates → stores locally
```
- Server: small Node.js/Express on Railway / Fly.io / VPS
- DB: Postgres or SQLite with machine activations table
- Cost: ~$5/month hosting

#### Option 2 — Keygen.sh (recommended for speed)
```
keygen.sh handles: key generation, machine fingerprinting, activation limits, revocation
We integrate their SDK → ~2 days of work
```
- Cost: $29/month (up to 500 licenses)
- Handles all edge cases: transfer between machines, offline validation, webhooks

#### Option 3 — LemonSqueezy + custom validation
- LemonSqueezy handles payment + key generation
- We validate against their API
- Cheaper but less control

### Machine Fingerprint (what we hash)
```
CPU serial + motherboard UUID + username + OS install ID
→ SHA256 hash stored on our server per activation
```

### License Key Format
```
TRIM-XXXX-XXXX-XXXX-XXXX   (20 chars, grouped)
```

### Activation Flow (UX)
```
1. First launch → License Gate screen (before main UI)
2. User enters key → app calls validation API
3. If valid & <2 machines → activate, store locally, show main UI
4. If 2 machines already → "Max activations reached. Deactivate another machine at trimout.io/account"
5. If offline → allow 7-day grace period from last validation
```

### Legal Checklist
- [ ] **EULA** (End User License Agreement) — must be accepted on install
  - Single-user license, 2-machine limit
  - No redistribution
  - No reverse engineering
  - Governing law clause (Israel / your jurisdiction)
- [ ] **Privacy Policy** — what data we collect (machine fingerprint, email)
- [ ] **Refund Policy** — common: 14-day no-questions refund
- [ ] **GPL-2.0 compliance** — TrimOut is a fork of LosslessCut
  - ⚠️ **CRITICAL**: GPL-2.0 requires source code to be available
  - Must provide source (GitHub repo is sufficient)
  - Cannot restrict redistribution of the GPL portions
  - The license system / our additions can be kept proprietary IF structured correctly
  - **Recommended**: split into GPL core (open) + proprietary plugin (closed)

### GPL-2.0 Compliance Strategy
LosslessCut is GPL-2.0. As a fork we must:
1. Keep our modified source publicly available (GitHub ✓ already done)
2. Not add restrictions on the GPL portions
3. Our AI additions (AIToolsPanel, TranscriptPanel, etc.) technically fall under GPL
4. **Safest approach**: Consult a software IP lawyer before selling
5. Alternative: Re-license if Mikael Finstad (original author) grants permission

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

## 💰 Pricing Suggestion (for landing page)

| Tier | Price | Machines | Features |
|---|---|---|---|
| Solo | $29 one-time | 1 machine | All features |
| **Pro** | **$49 one-time** | **2 machines** | **All features** |
| Team | $149/year | 5 machines | All + priority support |

---

## 🌐 Landing Page Must-Haves

- Hero: short demo GIF/video of silence removal + clip export
- Feature grid: Lossless · AI Tools · Whisper · No subscription
- Download button (Windows EXE, macOS DMG coming)
- Pricing section
- FAQ: "Does it need internet?" / "What formats?" / "GPL license?"
- Legal: Privacy Policy, EULA, Refund Policy links
