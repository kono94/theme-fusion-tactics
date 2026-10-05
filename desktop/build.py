#!/usr/bin/env python3
"""Build a shared game bundle, then package it on each target operating system."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import socket
import subprocess
import tempfile
import time
import zipfile

ROOT = Path(__file__).resolve().parent.parent

# Temurin 25 links from its runtime image, without a jmods directory. Explicit
# providers avoid pulling build tools (including the non-linkable jdk.jlink) in.
RUNTIME_MODULES = (
    'java.se',
    'jdk.charsets',
    'jdk.crypto.ec',
    'jdk.httpserver',
    'jdk.jfr',
    'jdk.localedata',
    'jdk.management',
    'jdk.naming.dns',
    'jdk.net',
    'jdk.security.auth',
    'jdk.unsupported',
    'jdk.zipfs',
)


def run(*command, cwd=ROOT, env=None):
    subprocess.run([str(value) for value in command], cwd=cwd, env=env, check=True)


def build_runtime(java_home, runtime, suffix):
    run(java_home / 'bin' / ('jlink' + suffix), '--add-modules', ','.join(RUNTIME_MODULES),
        '--strip-debug', '--no-man-pages', '--no-header-files', '--output', runtime)
    java = runtime / 'bin' / ('java' + suffix)
    linked_modules = {line.split('@')[0] for line in subprocess.check_output(
        [str(java), '--list-modules'], text=True).splitlines()}
    missing = set(RUNTIME_MODULES) - linked_modules
    if missing or {'jdk.jlink', 'jdk.jpackage'} & linked_modules:
        raise RuntimeError('Packaged Java runtime has an unexpected module set: ' + ','.join(sorted(linked_modules)))


def prepare(version, skip_build):
    windows = platform.system() == 'Windows'
    maven = 'mvn.cmd' if windows else 'mvn'
    npm = 'npm.cmd' if windows else 'npm'
    if not skip_build:
        env = dict(os.environ, VITE_GIT_TAG=version, VITE_GIT_COMMIT=subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True).strip(), VITE_BUILD_TIME=datetime.now(timezone.utc).isoformat())
        run(npm, 'ci', cwd=ROOT / 'frontend')
        run(npm, 'run', 'build', cwd=ROOT / 'frontend', env=env)
        run(maven, '-B', '-f', 'backend/pom.xml', 'clean', 'package', '-Pstandalone', '-DskipTests',
            '-Dstandalone.game-version=' + version, '-Dstandalone.git-commit=' + env['VITE_GIT_COMMIT'],
            '-Dstandalone.build-time=' + env['VITE_BUILD_TIME'])
        run(maven, '-B', '-f', 'desktop/pom.xml', 'verify')
    jars = list((ROOT / 'backend/target').glob('*.jar'))
    if len(jars) != 1:
        raise RuntimeError('Expected exactly one packaged backend JAR')
    with zipfile.ZipFile(jars[0]) as archive:
        properties = archive.read('BOOT-INF/classes/standalone-build.properties').decode()
        if 'standalone.game-version=' + version + '\n' not in properties:
            raise RuntimeError('Backend build version differs from requested bundle version')
        for name in ('BOOT-INF/classes/static/index.html', 'BOOT-INF/classes/static/assets/fonts/barlow/barlow-400.ttf'):
            archive.getinfo(name)
    bundle = ROOT / 'desktop/target/prepared'
    if bundle.exists():
        shutil.rmtree(bundle)
    bundle.mkdir(parents=True)
    jar_asset = f'tft-game-{version}.jar'
    shutil.copy2(jars[0], bundle / jar_asset)
    shutil.copy2(ROOT / 'desktop/target/launcher.jar', bundle / 'launcher.jar')
    installers = {key: f'tft-{key}-{version}.' + ('exe' if key == 'windows-x64' else 'dmg')
                  for key in ('windows-x64', 'macos-arm64')}
    manifest = dict(gameVersion=version, requiredJava=25, minimumLauncherVersion='1.0.0', jarAsset=jar_asset,
                    sha256=hashlib.sha256((bundle / jar_asset).read_bytes()).hexdigest(), installerAssets=installers)
    (bundle / 'tft-update.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return bundle


def smoke(executable, env):
    with tempfile.TemporaryDirectory(prefix='TFT smoke ü ') as directory:
        data = Path(directory)
        (data / 'application.yaml').write_text('server:\n  port: 0\nlogging:\n  level:\n    root: WARN\n', encoding='utf-8')
        command = [str(executable), '--headless', '--data-dir=' + str(data)]
        first = subprocess.Popen(command, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 100
            while not (data / 'game-ready.json').exists():
                if first.poll() is not None or time.monotonic() > deadline:
                    if first.poll() is None:
                        first.kill()
                    raise RuntimeError('Packaged launcher did not start: ' + first.communicate(timeout=10)[0].decode(errors='replace'))
                time.sleep(0.1)
            identity = (data / 'game-process.json').read_bytes()
            run(*command, env=env)
            if first.poll() is not None or (data / 'game-process.json').read_bytes() != identity:
                raise RuntimeError('Duplicate launch disturbed the primary game')
            first.kill()
            first.wait(timeout=10)
            run(executable, '--smoke-test', '--data-dir=' + str(data), env=env)
            if (data / 'game-process.json').exists():
                raise RuntimeError('Smoke did not stop its owned game')
        finally:
            if first.poll() is None:
                first.kill()
                first.wait(timeout=10)
        (data / 'application.yaml').write_text('server: [malformed yaml\n', encoding='utf-8')
        failed = subprocess.run([str(executable), '--smoke-test', '--data-dir=' + str(data)], env=env,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=110)
        if failed.returncode == 0:
            raise RuntimeError('Malformed YAML was unexpectedly accepted')
        with socket.socket() as occupied:
            occupied.bind(('127.0.0.1', 0))
            occupied.listen()
            (data / 'application.yaml').write_text('server:\n  port: ' + str(occupied.getsockname()[1]) + '\n', encoding='utf-8')
            failed = subprocess.run([str(executable), '--smoke-test', '--data-dir=' + str(data)], env=env,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=110)
            if failed.returncode == 0:
                raise RuntimeError('Occupied port was unexpectedly accepted')
        print('Packaged lifecycle smoke passed: duplicate launch, orphan recovery, malformed YAML, and occupied port')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', default=os.environ.get('TFT_RELEASE_VERSION', '1.0.0-dev'))
    parser.add_argument('--skip-build', action='store_true', help='Use locally built JARs')
    parser.add_argument('--prepare-only', action='store_true', help='Build shared artifacts without native packaging')
    parser.add_argument('--bundle', type=Path, help='Package a previously prepared shared bundle')
    parser.add_argument('--image-only', action='store_true', help='Skip native installer creation')
    args = parser.parse_args()
    version = args.version.removeprefix('v')
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?', version):
        parser.error('Version must be major.minor.patch with an optional prerelease suffix')
    system = platform.system()
    suffix = '.exe' if system == 'Windows' else ''
    java_home = Path(os.environ.get('JAVA_HOME') or subprocess.check_output(
        ['java', '-XshowSettings:properties', '-version'], stderr=subprocess.STDOUT, text=True).split('java.home = ')[1].splitlines()[0].strip())
    java = java_home / 'bin' / ('java' + suffix)
    if not re.search(r'version "25[.\"]', subprocess.check_output([str(java), '-version'], stderr=subprocess.STDOUT, text=True)):
        parser.error('Java 25 is required to build and run preview bytecode')
    bundle = args.bundle.resolve() if args.bundle else prepare(version, args.skip_build)
    manifest = json.loads((bundle / 'tft-update.json').read_text())
    if manifest['gameVersion'] != version or hashlib.sha256((bundle / manifest['jarAsset']).read_bytes()).hexdigest() != manifest['sha256']:
        raise RuntimeError('Shared bundle version or checksum mismatch')
    if args.prepare_only:
        print('Shared bundle ready:', bundle)
        return
    architecture = {'arm64': 'arm64', 'aarch64': 'arm64', 'x86_64': 'x64', 'AMD64': 'x64'}.get(platform.machine())
    if (system, architecture) not in (('Windows', 'x64'), ('Darwin', 'arm64')):
        parser.error('Native packaging requires Windows x64 or macOS Apple Silicon')
    platform_id = ('windows' if system == 'Windows' else 'macos') + '-' + architecture
    output = ROOT / 'desktop/target/distribution' / platform_id
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    runtime = output / 'runtime'
    build_runtime(java_home, runtime, suffix)
    images = output / 'images'
    package = [java_home / 'bin' / ('jpackage' + suffix), '--type', 'app-image', '--name', 'Theme Fusion Tactics',
               '--app-version', version.split('-')[0], '--vendor', 'Theme Fusion Tactics', '--description',
               'Offline solo auto-battler with One Piece and Pokemon themes', '--input', bundle,
               '--main-jar', 'launcher.jar', '--runtime-image', runtime, '--dest', images,
               '--icon', ROOT / 'desktop/icons' / ('app-icon.ico' if system == 'Windows' else 'app-icon.icns')]
    if system == 'Darwin':
        package += ['--mac-package-identifier', 'net.lwenstrom.tft', '--mac-package-name', 'TFT', '--mac-app-category', 'public.app-category.games']
    run(*package)
    image = images / ('Theme Fusion Tactics.app' if system == 'Darwin' else 'Theme Fusion Tactics')
    executable = image / ('Contents/MacOS/Theme Fusion Tactics' if system == 'Darwin' else 'Theme Fusion Tactics.exe')
    smoke_env = {key: value for key, value in os.environ.items() if key not in ('JAVA_HOME', 'JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS')}
    smoke_env['PATH'] = str(Path(os.environ.get('SystemRoot', 'C:/Windows')) / 'System32') if system == 'Windows' else '/usr/bin:/bin'
    smoke(executable, smoke_env)
    release = output / 'release'
    release.mkdir()
    shutil.copy2(bundle / manifest['jarAsset'], release / manifest['jarAsset'])
    shutil.copy2(bundle / 'tft-update.json', release / 'tft-update.json')
    if not args.image_only:
        command = [java_home / 'bin' / ('jpackage' + suffix), '--type', 'exe' if system == 'Windows' else 'dmg',
                   '--app-image', image, '--name', 'Theme Fusion Tactics', '--app-version', version.split('-')[0],
                   '--vendor', 'Theme Fusion Tactics', '--dest', output / 'installers']
        if system == 'Windows':
            command += ['--win-per-user-install', '--win-shortcut', '--win-menu', '--win-menu-group', 'Theme Fusion Tactics',
                        '--win-upgrade-uuid', 'ab931cde-ae41-46c8-84cc-f0f4b133c67c']
        else:
            command += ['--mac-package-name', 'TFT']
        run(*command)
        candidates = list((output / 'installers').glob('*.exe' if system == 'Windows' else '*.dmg'))
        if len(candidates) != 1:
            raise RuntimeError('Expected exactly one native installer')
        shutil.copy2(candidates[0], release / manifest['installerAssets'][platform_id])
    print('Distribution ready:', release)


if __name__ == '__main__':
    main()
