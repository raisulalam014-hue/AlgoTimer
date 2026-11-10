# AlgoTimer Windows Companion

This optional package provides AlgoTimer with a genuine Windows always-on-top timer window and system-wide hotkeys. The Chrome extension remains the source of timer state and is fully usable without this companion.

## Install

1. Install AlgoTimer in Chrome and copy its 32-character extension ID from `chrome://extensions`.
2. Extract this ZIP to a folder you will keep. The companion executable is registered by its full path, so do not move or delete the folder after installation.
3. Open PowerShell in the extracted folder and run:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
   ```

4. Enter the extension ID when prompted, then reload AlgoTimer in Chrome.

No .NET SDK or administrator access is required. The installer registers the native-messaging host for the current Windows user only.

## Uninstall

Run this from the same folder and confirm the prompt:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1
```

This removes the current-user Chrome registration and the matching package-generated manifest. It does not delete the executable or other package files.

## How it works

Chrome launches the native companion when AlgoTimer connects to it. It is not a standalone always-running application, Windows service, or startup task. The native timer window and system-wide hotkeys are available only while the companion is connected and running. If it is not installed or connected, the Chrome extension continues to work normally.

## Native window controls

The companion window shows the live timer state supplied by AlgoTimer in Chrome; it does not keep a separate timer. Use **Start / Resume**, **Pause**, **Lap**, and **Reset** to send commands to the extension. The timer window stays above other windows while the companion is running.

Choose a display and one of its four corners, then select **Pin corner** to keep the timer there. When unpinned, drag the header to move it; releasing near a corner snaps and pins it. Press **P** while the timer window is focused to toggle pinning.

Select **Manage** under **System-wide shortcuts** to review each binding and whether Windows registered it. Use **Edit shortcut settings** to open the companion settings file; save changes and reload AlgoTimer in Chrome for them to take effect. A shortcut marked unavailable may be claimed by another application.

The package is a self-contained Windows x64 build and includes no installer or automatic update mechanism. Obtain it from the `AlgoTimer-Companion-windows-x64` artifact of a successful **Package Windows Companion** GitHub Actions run.
