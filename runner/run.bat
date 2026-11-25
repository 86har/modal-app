@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
set "ROOT=%~dp0"
set "BOOT=%ROOT%boot\"
set "ENGINE=%ROOT%engine"
set "EXT=%ROOT%extentions"
cd /d "%BOOT%"

if not exist "%ENGINE%\venv\Scripts\python.exe" (
    echo 仮想環境が見つかりません。先に setup.bat を実行してください。
    pause
    exit /b 1
)

set "AUTO_UPDATE=1"
if exist "%BOOT%config.json" (
    for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "try { $c = Get-Content -LiteralPath '%BOOT%config.json' -Raw -Encoding UTF8 | ConvertFrom-Json; if ([string]$c.AUTO_UPDATE -in 'false','0','off','no') { '0' } else { '1' } } catch { '1' }"`) do set "AUTO_UPDATE=%%A"
)
if "%KREA_NO_UPDATE%"=="1" set "AUTO_UPDATE=0"
if "!AUTO_UPDATE!"=="0" echo ※ 自動更新は無効です。

set "SHA_FILE=%BOOT%repo_sha.txt"
set "REMOTE_SHA="
if "!AUTO_UPDATE!"=="1" for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri 'https://api.github.com/repos/86har/modal-app/commits/HEAD' -Headers @{Accept='application/vnd.github.sha'} -TimeoutSec 5).ToString().Trim() } catch { '' }"`) do set "REMOTE_SHA=%%S"

set "LOCAL_SHA="
if exist "%SHA_FILE%" set /p LOCAL_SHA=<"%SHA_FILE%"

if not defined KREA_UPDATE_DONE if defined REMOTE_SHA if /i not "!REMOTE_SHA!"=="!LOCAL_SHA!" (
    echo 新しいコードを検出したため、更新します。
    >"%SHA_FILE%" echo !REMOTE_SHA!
    call "%BOOT%update.bat" nopause
    if errorlevel 1 (
        echo 更新に失敗しました。現在のバージョンで起動します。
        set "KREA_UPDATED="
    ) else (
        set "KREA_UPDATED=1"
    )
    start "" cmd /c "set KREA_UPDATE_DONE=1& set KREA_UPDATED=!KREA_UPDATED!& call "%~f0" %*"
    exit /b 0
)

set "GEN="
if exist "%ENGINE%\gen.py"       set "GEN=%ENGINE%\gen.py"
if exist "%ENGINE%\modal\gen.py" set "GEN=%ENGINE%\modal\gen.py"
if not defined GEN (
    echo gen.py が見つかりません。update.bat を実行してください。
    pause
    exit /b 1
)

if not exist "%BOOT%config.json" echo ※ config.json が無いため、既定の設定で起動します。

set "KREA_CONFIG=%BOOT%config.json"
set "PYTHONUTF8=1"
set "VIRTUAL_ENV=%ENGINE%\venv"
set "PATH=%ENGINE%\venv\Scripts;%PATH%"

for %%F in ("%GEN%") do set "GENDIR=%%~dpF"

set "HASH_FILE=%BOOT%config_hash.txt"
set "DEPLOY_FLAG="
if exist "%BOOT%config.json" (
    set "NEWHASH="
    for /f "usebackq delims=" %%H in (`powershell -NoProfile -Command "(Get-FileHash -LiteralPath '%BOOT%config.json' -Algorithm SHA256).Hash"`) do set "NEWHASH=%%H"

    set "OLDHASH="
    if exist "!HASH_FILE!" set /p OLDHASH=<"!HASH_FILE!"

    if /i not "!NEWHASH!"=="!OLDHASH!" (
        set "DEPLOY_FLAG=-d"
        echo config.json の変更を検出したため、modal deploy を実行します。
        >"!HASH_FILE!" echo !NEWHASH!
    )
)

if defined KREA_UPDATED set "DEPLOY_FLAG=-d"

set CMDLINE="%ENGINE%\venv\Scripts\python.exe" "%GEN%" %DEPLOY_FLAG% %*
start "Krea" /D "%GENDIR%" cmd /c "%CMDLINE% || pause"
exit /b 0