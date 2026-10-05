# Standalone TFT preview

The standalone distribution runs the existing authoritative Java game engine on your computer and opens the bundled Vue UI in your default browser. It supports offline solo play in both themes. It does not require Java, Node, Git, Docker, a GitHub account, or the VPS. Multiplayer over a LAN or the internet is outside this preview.

## Install and play

Download the matching installer from [GitHub Releases](https://github.com/kono94/theme-fusion-tactics/releases):

- Windows x64: run `tft-windows-x64-VERSION.exe`. Installation is per-user and creates desktop and Start menu shortcuts.
- Apple Silicon Macs: open `tft-macos-arm64-VERSION.dmg` and drag Theme Fusion Tactics into Applications.

These are unsigned previews. Windows may display an unknown-publisher warning. On macOS, try opening the installed application, then open **System Settings → Privacy & Security → Open Anyway** if macOS blocks it. Only allow the application you downloaded from the project's release page. These previews are not notarized. Quit TFT before installing a newer launcher or replacing the application.

Launch the application icon. The launcher opens the game after the local backend is ready. Create a room, select One Piece or Pokemon, and start; empty seats fill with bots. Closing a browser tab leaves the game running. **Open Game** reopens the browser. Starting the application again opens the existing launcher/game instead of another backend. **Quit** stops the backend and confirms before ending an active match. Active matches are memory-only and cannot be saved or resumed after quitting. Completed solo matches remain in local Match History.

## Settings, history, and logs

Use **Open Configuration Folder** in the launcher. All writable files are outside the installed application:

| Platform | Directory |
| --- | --- |
| Windows | `%LOCALAPPDATA%\ThemeFusionTactics` |
| macOS | `~/Library/Application Support/ThemeFusionTactics` |

The directory contains `application.example.yaml`, optional `application.yaml`, `launcher.json`, `data/analytics.db`, `logs/game.log`, and downloaded JARs under `versions/`. Installer upgrades and game updates preserve this directory. Browser preferences and reconnect identity remain in your browser's local storage. They are separate from the SQLite match history.

Defaults require no configuration. To override backend options, copy `application.example.yaml` to `application.yaml`, edit it, and restart the launcher:

```yaml
server:
  port: 18765
logging:
  level:
    root: INFO
```

The game binds only to `127.0.0.1`. The launcher reserves profiles, loopback binding, origin policy, SQLite location, launch identity, and build metadata. Spring reads user YAML directly; the launcher discovers the actual bound port from the backend's readiness file. Keep HTTP enabled: TLS/reverse-proxy configuration and alternate databases are not supported in the standalone preview. Malformed YAML or an occupied port produce a startup error with the log location.

Changing the port changes the browser origin. Your name, settings, and reconnect identity at the old origin do not move automatically. Your SQLite history remains available. Removing an application does not intentionally remove your user-data directory.

## Updates

The default is **Check for updates**, with **Update and Play / Play Current Version** before installation. Enable automatic updates in the launcher to install compatible game updates before play; turn checks off to launch without contacting GitHub. Settings are saved in `launcher.json`:

```json
{"checkForUpdates": true, "automaticUpdates": false}
```

The check uses the public GitHub latest-release API with a five-second overall deadline. Draft and prerelease releases are ignored. Missing assets, outages, rate limiting, or failed downloads leave the installed game available. Downloads are checked against the release manifest's SHA-256 checksum before activation. No game updates occur while a backend is running.

An update backs up the stopped SQLite database, including WAL/shared-memory sidecars, and records a pending transaction. Only successful backend readiness commits the update. Failed startup or an interrupted pending update restores the previous game and database before retrying. Old JARs are retained. User YAML and launcher preferences are never restored from an update backup because updates never replace them.

Launcher or Java upgrades require a new installer; the launcher offers the matching installer download instead of installing incompatible game bytecode. Java preview code requires exactly the advertised Java feature version, not simply that version or newer. Installing a newer bundle applies its included game through the same backup/startup transaction. There is no manual downgrade feature.

## Build and verify

Build with Java 25, Maven, Node 26+, npm, and Python 3. Native packaging also needs Xcode command-line tools on macOS or WiX on Windows. Use a Temurin JDK for release builds. The launcher itself has no Spring runtime and shares the bundled Java 25 runtime with its child backend.

```sh
python3 desktop/build.py --version 3.0.2
```

On Windows, use `python` instead of `python3`. The script builds Vue, builds the standalone backend profile, verifies the launcher, creates a runtime image and native application, runs a smoke test with only OS tools on PATH, and creates an unsigned installer. Outputs are under `desktop/target/distribution/PLATFORM/release/`. `--image-only` creates and tests the application without building its installer. `--skip-build` uses already built JARs but still verifies the embedded version and assets.

The TFT icon is included in native applications, Windows shortcuts, and the running launcher. Master artwork is `desktop/icons/app-icon.svg`; packaging uses the checked-in `.ico` and `.icns` files. After changing the SVG, export it as a 1024px `app-icon.png` and regenerate both native formats on macOS with `python3 desktop/icons/build.py`. The PNG is also bundled in the launcher JAR for its window and Dock/taskbar icon. Icon conversion is not needed on CI or on players' computers.

CI builds the shared Java/frontend artifacts once, then packages that identical bundle on Windows x64 and macOS Apple Silicon:

```sh
python3 desktop/build.py --prepare-only --version 3.0.2
python3 desktop/build.py --bundle desktop/target/prepared --version 3.0.2
```

For development without native packaging, after preparing the bundle:

```sh
java -jar desktop/target/prepared/launcher.jar --bundle=desktop/target/prepared
java -jar desktop/target/prepared/launcher.jar --bundle=desktop/target/prepared --smoke-test --data-dir=/tmp/tft-smoke
```

`--headless` starts the game without a browser/window and skips network update checks. Stop it with Ctrl+C. `--smoke-test` additionally checks the embedded frontend/font, REST catalogs/history, both themes' solo room creation, seven bots, complete matches and persisted history over `/ws`, then exits. It uses real Spring, SQLite, and STOMP. CI's smoke test exercises a custom ephemeral port, a data path containing spaces and non-ASCII characters, duplicate launches, forced launcher termination and orphan recovery, malformed YAML, and occupied ports using the packaged runtime.

Run `mvn -f desktop/pom.xml verify`, backend `mvn verify`, and frontend tests/lint/build before release. Replace the temporary changelog heading before tagging. The tag workflow preserves hosted deployment, verifies every native distribution, checks shared checksums, uploads all release assets to a draft, then publishes it. Tags containing a prerelease suffix publish prerelease assets without enrolling installed launchers in prerelease updates. No release or installer has been published merely by running local builds.

VPS deployment is disabled by default. To enable it for an existing server, set the GitHub Actions repository variable `VPS_DEPLOY_ENABLED` to `true` and configure the server secrets from the deployment guide. Desktop release publishing is independent of the SSH deployment job. With the variable absent or `false`, tags publish desktop releases without contacting a VPS.

`tft-update.json` contains `gameVersion`, `requiredJava`, `minimumLauncherVersion`, `jarAsset`, `sha256`, and an `installerAssets` map keyed by `windows-x64` and `macos-arm64`. Keep game releases immutable: do not replace a version's JAR with different bytes. The launcher rejects differing contents for an already downloaded version.
