# Security

## Release security model

- TrimOut loads its packaged renderer only. External navigation, popup windows,
  webviews, and browser permission requests are denied by the Electron main process.
- A restrictive Content Security Policy limits renderer resources and network access.
- API keys are encrypted with Electron `safeStorage` (Windows DPAPI) before they are
  written to disk. Older locally stored keys are migrated once and the legacy copy is
  deleted. Storage fails closed when operating-system encryption is unavailable.
- KICKO authorization, subscription eligibility, upload grants, signed upload URLs,
  and project creation are decided by the KICKO server. The desktop build contains no
  KICKO server secret.
- Local QR sharing uses a random one-time path, exposes one selected file, and expires
  automatically. The bearer URL is not written to application logs.

## Known inherited constraint

The renderer inherited from LosslessCut still uses Node integration and
`@electron/remote`, and one advanced expression worker requires `unsafe-eval`. Removing
those privileges requires a staged preload/IPC refactor across the editor. Until then,
the app mitigates that risk by loading only bundled local code and enforcing the main
process navigation, popup, webview, permission, and RPC restrictions above.

## Dependency audit

The production dependency audit has no known critical findings. The remaining
`path-to-regexp` advisory is inherited through Express. TrimOut binds its automation API
to `127.0.0.1` and compiles only fixed, simple route patterns; it does not compile route
patterns from user input and does not use the vulnerable optional-group pattern shape.

## Reporting

Please report security issues privately to `info@demente-show.com`. Do not include
passwords, access tokens, signed upload URLs, or private videos in a report.
