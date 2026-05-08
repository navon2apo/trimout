<div align="center">
  <br>
  <img src="src/renderer/src/icon.svg" width="100" alt="TrimOut" />
  <h1>TrimOut</h1>
  <p><b>Any video. Any moment. Any use.</b></p>
  <p>Instant lossless cuts — no rendering, no waiting, original quality.</p>
  <br>
</div>

## What is TrimOut?

TrimOut is a fast, local video trimming tool for content creators who want to cut clips without re-encoding. Built for soccer coaches, podcast editors, content creators, and anyone who needs to extract the good parts from long recordings — in seconds.

- ✂️ **Lossless cuts** — no re-encode, no quality loss, no waiting
- 🔇 **Remove Silence** — auto-detect and cut quiet parts with one click
- ⚡ **Find Highlights** — mark the loudest, most exciting moments
- 🎬 **Scene Split** — auto-split every time the scene changes
- 🎙️ **Whisper Transcription** — local AI speech-to-text, works offline
- 🔗 **URL Download** — paste a YouTube / video URL to download and edit directly
- 📄 **Export SRT** — save transcripts as subtitle files
- 🔑 **API Keys** — optional OpenAI / Claude / Gemini integration for smarter analysis

## Download

Coming soon — Windows EXE, macOS DMG, Linux AppImage.

## Supported Formats

Any format supported by FFmpeg — MP4, MKV, MOV, AVI, WebM, and hundreds more.

## Getting Started (Development)

```bash
git clone https://github.com/navon2apo/trimout.git
cd trimout
yarn install
yarn dev
```

## Build

```bash
yarn pack-win    # Windows
yarn pack-mac    # macOS
yarn pack-linux  # Linux
```

## Tech Stack

- Electron + React + TypeScript
- FFmpeg (bundled) for all video operations
- @xenova/transformers for local Whisper AI
- yt-dlp for URL downloads

## License

GPL-2.0. TrimOut is a fork of [LosslessCut](https://github.com/mifi/lossless-cut) by Mikael Finstad, adapted and extended for new use cases. The GPL-2.0 license is preserved as required.

---

Made with ❤️ by [Navon Amos](https://github.com/navon2apo)
