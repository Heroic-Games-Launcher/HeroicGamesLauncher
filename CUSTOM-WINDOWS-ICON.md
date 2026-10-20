# Icon replacement for Heroic Windows packaging

The workflow `.github/workflows/custom-windows-installer.yml` can be started from the Actions tab using **Run workflow**. It builds on a GitHub-hosted Windows runner, copies `public/win_icon.ico` to `build/win_icon.ico` after the application build, then packages the installer with electron-builder.

When the run succeeds, open its summary and download the `Heroic-Custom-Icon-Windows-Installer` artifact. Extract the artifact ZIP to get the setup EXE.

This affects the Windows installer and packaged application icon only. It does not change Linux/macOS branding or the app's runtime behavior. The workflow has not been run/tested here; if it fails, open the failed run and inspect its logs.
