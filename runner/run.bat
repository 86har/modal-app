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

REM ===== GitHub に新しいコードがあれば自動更新 =====
REM (更新で run.bat 自身も置き換わるため、更新後は新しい版で起動し直す)
REM 自動更新の有効/無効: config.json の "AUTO_UPDATE": false か、環境変数 KREA_NO_UPDATE=1 で無効化
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
    REM 先に SHA を記録する。再起動後は必ず一致するので、二度目の更新に入らない
    >"%SHA_FILE%" echo !REMOTE_SHA!
    call "%BOOT%update.bat" nopause
    if errorlevel 1 (
        echo 更新に失敗しました。現在のバージョンで起動します。
        set "KREA_UPDATED="
    ) else (
        set "KREA_UPDATED=1"
    )
    REM 更新で bat 自身が書き換わっている可能性があるため、起動し直して終了する
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

REM プログラムから参照できるように config.json の場所を環境変数で渡す
set "KREA_CONFIG=%BOOT%config.json"
set "PYTHONUTF8=1"
set "VIRTUAL_ENV=%ENGINE%\venv"
set "PATH=%ENGINE%\venv\Scripts;%PATH%"

for %%F in ("%GEN%") do set "GENDIR=%%~dpF"

REM config.json の内容が前回起動時から変わっていたら、gen.py に -d (modal deploy) を渡す
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

REM batファイルを経由せず「cmd /c」で起動する。
REM (batファイル実行中に Ctrl+C を押すと出る「Terminate batch job (Y/N)?」を避けるため)
REM 正常終了したらウィンドウは自動で閉じ、エラー終了のときだけ内容を確認できるよう一時停止する
set CMDLINE="%ENGINE%\venv\Scripts\python.exe" "%GEN%" %DEPLOY_FLAG% %*
start "Krea" /D "%GENDIR%" cmd /c "%CMDLINE% || pause"
exit /b 0