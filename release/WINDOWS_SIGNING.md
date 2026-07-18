# Windows Code Signing

The public Gumroad installer must be signed. The unsigned installer created by `yarn pack-win` is for local QA only.

## Supported Release Path

The current release command accepts either of these complete environment-variable pairs:

```powershell
$env:CSC_LINK = 'C:\secure\kicko-trimout-signing.pfx'
$env:CSC_KEY_PASSWORD = '<set outside source control>'
```

or:

```powershell
$env:WIN_CSC_LINK = 'C:\secure\kicko-trimout-signing.pfx'
$env:WIN_CSC_KEY_PASSWORD = '<set outside source control>'
```

Then run:

```powershell
yarn release-win
```

The command fails before packaging if a complete pair is absent, and `electron-builder` is configured to fail if code signing does not complete. Never place the certificate or password in Git, project files, documentation, Gumroad, or application code.

## Certificate Choice

For direct Gumroad distribution, obtain a Windows code-signing certificate or signing service that can sign an Electron installer and application executable. Microsoft Artifact Signing Public Trust has regional and account-type eligibility restrictions. If the publisher is not eligible, use a trusted OV code-signing provider or another supported signing route. Hardware-backed providers may require a provider-specific SignTool configuration instead of a PFX; confirm the provider workflow before purchase.

Official references:

- https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options
- https://www.electron.build/docs/features/code-signing/

## Verification

After a signed build, verify both files:

```powershell
Get-AuthenticodeSignature .\dist\KICKO-TrimOut-Setup-1.2.0-x64.exe | Format-List Status,StatusMessage,SignerCertificate
Get-AuthenticodeSignature '.\dist\win-unpacked\KICKO TrimOut.exe' | Format-List Status,StatusMessage,SignerCertificate
```

Both statuses must be `Valid`, the expected publisher must be shown, and the certificate must chain to a trusted root. Test the installer on a clean Windows 10 or Windows 11 account before publishing.
