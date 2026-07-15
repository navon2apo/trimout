# FFmpeg Corresponding Source Gate

## Binary In This Release

- Version: `n8.0-23-gd1f31a829d-20251022`
- Repack release: https://github.com/mifi/ffmpeg-builds/releases/tag/8.0-1
- FFmpeg commit: `d1f31a829d`
- License: GNU GPL version 3, because the build configuration contains both `--enable-gpl` and `--enable-version3`
- License text: `FFMPEG-LICENSE.txt`

The mifi release identifies a BtbN autobuild as its source, but the referenced BtbN release URL returned 404 during the July 15, 2026 release audit. A dead upstream release link is not accepted as the public source-delivery plan.

## Public Release Requirement

Do not publish the installer until complete corresponding source for this exact FFmpeg build is available to customers next to the binary. The package must cover:

- FFmpeg source at commit `d1f31a829d`.
- Source for the enabled external GPL/LGPL components contained in the build.
- The build scripts and configuration needed to rebuild the distributed FFmpeg and FFprobe binaries and shared libraries.
- Applicable license and copyright notices.

The TrimOut repository source ZIP alone does not satisfy this separate FFmpeg requirement.

## Safe Options

1. Obtain and archive the complete corresponding source bundle from the binary provider, verify that it covers the exact build, and upload it beside the installer.
2. Replace the FFmpeg bundle with a reproducible build whose complete corresponding source is archived by KICKO, then repeat media and packaging QA.
3. Use a written source offer only after the product owner has obtained legal advice and explicitly accepts the GPL duration and third-party fulfillment obligations. No written offer has been created automatically.

This file is an engineering release gate, not legal advice.
