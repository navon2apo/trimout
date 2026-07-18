<div align="center">
  <br>
  <img src="src/renderer/src/trimout-logo.png" width="420" alt="KICKO TrimOut" />
  <h1>KICKO TrimOut</h1>
  <p><b>Find, organize, and export the soccer moments that matter.</b></p>
</div>

KICKO TrimOut is a Windows desktop editor for turning full soccer games into an organized set of player clips. Editing and project work stay on the computer. Sending selected clips to KICKO is optional and starts only after the user explicitly connects an eligible KICKO account.

## Product Features

- Build one project from multiple game videos.
- Cut and label player actions without re-encoding compatible source formats.
- Use optional position-based Scout Mode suggestions while keeping every choice under the user's control.
- Review clips by action, reorder the final selection, and replace weaker clips.
- export clips as separate named files or as one combined video.
- Continue selected clips in KICKO for player marking, tracking, effects, and final highlight creation.

Local editing is free and does not require a TrimOut license key or KICKO account. KICKO cloud transfer requires an active eligible KICKO subscription and is authorized by the KICKO server before any upload or cloud project is created.

## Windows Release

TrimOut 1.2 supports 64-bit Windows 10 and Windows 11. Electron and FFmpeg are bundled in the installer; users do not install them separately. See [installation](docs/installation.md) and [system requirements](docs/requirements.md).

Public Windows releases must be code-signed. Release operators should follow [the release checklist](release/CHECKLIST.md) and [Windows signing guide](release/WINDOWS_SIGNING.md).

## Development

```powershell
git clone https://github.com/navon2apo/trimout.git
cd trimout
yarn install --immutable
yarn dev
```

Run the automated tests and production build:

```powershell
yarn vitest run --config electron.vite.config.ts
yarn build
```

Create an unsigned local QA installer:

```powershell
yarn pack-win
```

Create a signed public installer after configuring signing credentials:

```powershell
yarn release-win
```

## Privacy And Security

Read [PRIVACY.md](PRIVACY.md) for the user-facing data flow and [SECURITY.md](SECURITY.md) for the desktop security model.

## Open Source License

KICKO TrimOut is licensed under GPL-2.0-only. It is based on [LosslessCut](https://github.com/mifi/lossless-cut) by Mikael Finstad. The bundled FFmpeg build is a separate GPLv3 component. The corresponding TrimOut source is available in this repository; FFmpeg distribution requirements are tracked in [release/FFMPEG-SOURCE.md](release/FFMPEG-SOURCE.md). See [LICENSE](LICENSE), `FFMPEG-LICENSE.txt`, [NOTICE.md](NOTICE.md), and `licenses.txt`.
