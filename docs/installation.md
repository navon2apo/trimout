# Windows Installation

1. Download the signed `KICKO-TrimOut-Setup-1.2.0-x64.exe` installer from the official KICKO TrimOut product page.
2. Open the installer and review the GPL-2.0 license.
3. Choose the installation folder, then complete the installation.
4. Launch KICKO TrimOut from the Start menu or desktop shortcut.

Electron, FFmpeg, FFprobe, and the native media libraries required by TrimOut are included in the installer. The installer does not download a second dependency package, and the user does not need Python, Node.js, FFmpeg, or a codec pack.

Local cutting, cataloging, project saving, and computer export do not require an account or license key. Internet access is needed only for actions that use a network service, including downloading a video URL or explicitly continuing selected clips in KICKO.

## Updating

TrimOut does not use the former LosslessCut update link. Install a newer official KICKO TrimOut installer over the existing version when an update is announced. Projects and settings remain in the user's profile.

## Uninstalling

Use **Settings > Apps > Installed apps > KICKO TrimOut > Uninstall**. The uninstaller does not delete user projects or application data automatically.

## Windows Warning

Do not publish an unsigned QA installer. A public installer must show a valid publisher in Windows signature properties. If Windows reports an unknown publisher, stop and verify the download before running it.
