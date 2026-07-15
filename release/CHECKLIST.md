# KICKO TrimOut 1.2 Release Checklist

## Automated Gate

- [ ] `yarn install --immutable`
- [ ] `yarn vitest run --config electron.vite.config.ts`
- [ ] `yarn build`
- [ ] `yarn generate-licenses`
- [ ] `yarn release-win`
- [ ] Installer and application signatures both report `Valid`.
- [ ] SHA-256 file matches the signed installer.
- [ ] Source ZIP is created from the exact released commit or tag.

## Clean Windows Test

- [ ] Install on a supported 64-bit Windows account that does not have the development repository.
- [ ] Confirm the new TrimOut icon in the installer, desktop shortcut, taskbar, Start menu, and installed-app list.
- [ ] Confirm version `1.2.0` and English-only UI.
- [ ] Open MP4 and MOV test files.
- [ ] Create cuts, label actions, save and reopen a multi-game project.
- [ ] Export separate named clips and one combined video.
- [ ] Confirm local editing never asks for a license key or KICKO account.
- [ ] Confirm Download to computer works without KICKO.
- [ ] Confirm the KICKO explanation appears before connection.
- [ ] Confirm an ineligible account cannot upload or create a cloud project.
- [ ] Confirm an eligible test account can send selected clips and open playable KICKO media.
- [ ] Cancel one transfer and confirm the local project remains unchanged.
- [ ] Uninstall and confirm user projects are not deleted.

## Gumroad

- [ ] Upload only the signed installer, checksum, and corresponding source archive.
- [ ] Disable Gumroad license keys.
- [ ] Use the English copy in `release/GUMROAD.md`.
- [ ] Publish links to source, privacy, support, and system requirements.
- [ ] Do not upload secrets, `.env` files, test accounts, private media, or unsigned builds.

## Manual Owner Actions

- [ ] Choose and obtain the Windows signing certificate or signing service.
- [ ] Confirm the final publisher name exactly as it should appear in Windows.
- [ ] Merge the approved release branch and create the `v1.2.0` tag.
- [ ] Run the signed release command in a protected environment.
- [ ] Perform the clean-machine test.
- [ ] Upload the approved files to the existing Gumroad account and publish only after final review.
