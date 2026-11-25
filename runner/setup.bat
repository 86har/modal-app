@echo off
chcp 65001 >nul
set "HERE=%~dp0"
set "WANT=3.13.17"

REM ===== 配置の決定 =====
REM setup.bat を置いたフォルダを ROOT とし、bat 類は ROOT\boot にまとめる。
REM (すでに boot フォルダ内から実行された場合は、その1つ上を ROOT とする)
for %%I in ("%~dp0.") do set "HN=%%~nxI"
if /i "%HN%"=="boot" (
    set "BOOT=%HERE%"
    for %%I in ("%~dp0..") do set "ROOT=%%~fI\"
    set "FIRST_RUN="
) else (
    set "ROOT=%HERE%"
    set "BOOT=%HERE%boot\"
    set "FIRST_RUN=1"
)
set "ENGINE=%ROOT%engine"
set "EXT=%ROOT%extentions"

if not exist "%BOOT%" mkdir "%BOOT%"
if defined FIRST_RUN (
    REM 同じ階層にある update.bat を boot へ移す (setup.bat は終了時に boot 版へ置き換わる)
    if exist "%ROOT%update.bat" move /y "%ROOT%update.bat" "%BOOT%update.bat" >nul
    if exist "%ROOT%deploy_and_run.bat" move /y "%ROOT%deploy_and_run.bat" "%BOOT%deploy_and_run.bat" >nul
    copy /y "%~f0" "%BOOT%setup.bat" >nul
)
cd /d "%BOOT%"

REM ===== 0. config.json の作成(無い場合のみ) =====
if exist "%BOOT%config.json" goto :cfg_done
set "CFG_WATCH=%USERPROFILE%\Downloads\outputs"
set "CFG_GPU=A10"
set "IN="
set /p "IN=画像の監視フォルダ [%CFG_WATCH%]: "
if defined IN set "CFG_WATCH=%IN%"
set "IN="
set /p "IN=GPU の種類 (T4 / L4 / A10 / A100 / H100 など) [%CFG_GPU%]: "
if defined IN set "CFG_GPU=%IN%"
powershell -NoProfile -Command "[pscustomobject]@{WATCH_DIR=$env:CFG_WATCH;GPU=$env:CFG_GPU} | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath '%BOOT%config.json'" || goto :error
echo config.json を作成しました。
:cfg_done

if not exist "%ENGINE%" mkdir "%ENGINE%"

REM ===== 1. 仮想環境の作成 (engine\venv) =====
set "FOUND="
for /f "tokens=2" %%v in ('py -3.13 --version 2^>nul') do set "FOUND=%%v"
if not defined FOUND (
    echo Python 3.13 が見つかりません。インストールしてください。
    goto :error
)
echo 検出 Python: %FOUND%
if not "%FOUND%"=="%WANT%" (
    echo ※ 指定は %WANT% ですが %FOUND% が使われます。
    choice /c YN /m "続行しますか"
    if errorlevel 2 exit /b 1
)

if not exist "%ENGINE%\venv\Scripts\python.exe" (
    py -3.13 -m venv "%ENGINE%\venv" || goto :error
)
set "VPY=%ENGINE%\venv\Scripts\python.exe"

REM ===== 2. パッケージのインストール =====
"%VPY%" -m pip install --upgrade pip || goto :error
"%VPY%" -m pip install flask watchdog modal || goto :error

REM ===== 3. modal setup (ブラウザ認証) =====
"%VPY%" -m modal setup || goto :error

REM ===== 4-5. 認証情報の入力 と modal secret 作成 =====
set "PS=$t=Read-Host 'CivitAI トークン' -AsSecureString;"
set "PS=%PS% $e=Read-Host 'MEGA メールアドレス';"
set "PS=%PS% $p=Read-Host 'MEGA パスワード' -AsSecureString;"
set "PS=%PS% $tp=[System.Net.NetworkCredential]::new('',$t).Password;"
set "PS=%PS% $pp=[System.Net.NetworkCredential]::new('',$p).Password;"
set "PS=%PS% & '%VPY%' -m modal secret create krea2-tokens ('CIVITAI_TOKEN='+$tp) ('MEGA_EMAIL='+$e) ('MEGA_PASS='+$pp) --force;"
set "PS=%PS% exit $LASTEXITCODE"
powershell -NoProfile -ExecutionPolicy Bypass -Command "%PS%" || goto :error

REM ===== 6. GitHub から取得 → engine へ配置 → config.json 参照パッチ =====
REM (update.bat と同じ処理を呼び出します)
REM boot 内の setup.bat を直接実行している場合のみ、自分自身の上書きを避ける
if not defined FIRST_RUN set "KREA_IN_SETUP=1"
if not exist "%BOOT%update.bat" (
    echo update.bat が見つかりません。setup.bat と同じ場所に置いてください。
    goto :error
)
call "%BOOT%update.bat" nopause || goto :error

echo.
echo 完了しました。run.bat で起動できます。
pause

REM 最初に置いた setup.bat は boot へ移したので、実行終了と同時に削除する
if defined FIRST_RUN (goto) 2>nul & del "%~f0"
exit /b 0

:error
echo.
echo エラーが発生したため中断しました。
pause
exit /b 1