# Creates a desktop shortcut to TrimOut.exe with proper icon.
# Run once: right-click → "Run with PowerShell"
# If PowerShell blocks: run `powershell -ExecutionPolicy Bypass -File Create-Desktop-Shortcut.ps1`

$trimoutExe = "D:\trimming soccer\player-clip-prep\dist\win-unpacked\TrimOut.exe"
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "TrimOut.lnk"

if (-not (Test-Path $trimoutExe)) {
    Write-Host ""
    Write-Host "  [X] TrimOut.exe not found:" -ForegroundColor Red
    Write-Host "      $trimoutExe"
    Write-Host ""
    Write-Host "  Run 'yarn pack-win' in the project root first." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $trimoutExe
$shortcut.WorkingDirectory = Split-Path $trimoutExe
$shortcut.IconLocation = "$trimoutExe,0"
$shortcut.Description = "TrimOut — Soccer clip editor"
$shortcut.Save()

Write-Host ""
Write-Host "  [V] Shortcut created on Desktop:" -ForegroundColor Green
Write-Host "      $shortcutPath"
Write-Host ""
Write-Host "  Tip: right-click the icon -> Pin to Start  or  Pin to Taskbar"
Write-Host ""
Read-Host "  Press Enter to exit"
