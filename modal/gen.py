import argparse
import json
import os
import re
import signal
import socket
import subprocess
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

os.environ["PYTHONUTF8"] = "1"
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent
MODAL_APP_PY = BASE_DIR / "modal_app.py"

HOST = "127.0.0.1"
GEN_PORT = 8765
VIEWER_PORT = 5000

APP_NAME = "krea2"
CLS_NAME = "Krea"

DEFAULT_WIDTH = 880
DEFAULT_HEIGHT = 1240
DEFAULT_NUMS = 1
UPLOAD_TO_MEGA = True

MIN_SIZE, MAX_SIZE = 64, 4096
MAX_NUMS = 25

VIEWER_PY = BASE_DIR / "flask/viewer.py"

# 日本語プロンプトの保存先（gen_1.py と同じ階層）。viewer.py 側の PROMPT_DIR と揃えること
PROMPT_DIR = BASE_DIR / "output_prompts"

krea = None
generate_lock = threading.Lock()
pending_lock = threading.Lock()
pending_request = {"data": None}

stop_event = threading.Event()

# 実行中の生成（FunctionCall）。停止ボタン(/api/stop)から cancel するために保持する
call_lock = threading.Lock()
call_state = {"fc": None, "cancelled": False}
# 停止処理（コンテナ停止の待機）が重複して走らないようにする
stop_request_lock = threading.Lock()

# -e / --end-each 指定時: 1回の生成ごとにコンテナを停止し、次の POST まで待機する
STOP_AFTER_EACH = False

CONTAINER_STOP_TIMEOUT = 300
CONTAINER_POLL_INTERVAL = 3

# MEGAアップロード(CPUコンテナで非同期実行)の完了監視。
# コンテナ停止の前に、実行中のアップロードが終わるのを待つために使う。
upload_lock = threading.Lock()
upload_threads = []

def _watch_upload(call_id):
    import modal
    try:
        modal.FunctionCall.from_id(call_id).get()
    except Exception as e:
        print(f"\033[41m  MEGAアップロード失敗: {type(e).__name__}: {e}  \033[0m")
        print("[upload] 画像はVolumeの退避フォルダに残っています。次回のアップロード時にまとめて再送されます。")

def track_upload(call_id):
    t = threading.Thread(target=_watch_upload, args=(call_id,), daemon=True)
    t.start()
    with upload_lock:
        upload_threads[:] = [x for x in upload_threads if x.is_alive()]
        upload_threads.append(t)

def wait_uploads():
    with upload_lock:
        threads = [t for t in upload_threads if t.is_alive()]
    if not threads:
        return
    print("[upload] MEGAアップロードの完了を待っています...")
    deadline = time.time() + CONTAINER_STOP_TIMEOUT
    for t in threads:
        t.join(max(0.0, deadline - time.time()))

def viewer_running() -> bool:
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex((HOST, VIEWER_PORT)) == 0

def launch_viewer():
    if viewer_running():
        print(f"[viewer] 既に起動しています: http://{HOST}:{VIEWER_PORT}/")
        return
    kwargs = {}
    if os.name == "nt":

        kwargs["creationflags"] = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    subprocess.Popen(
        [sys.executable, str(VIEWER_PY)], cwd=str(BASE_DIR),
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        close_fds=True, **kwargs,
    )
    print(f"[viewer] 別プロセスで起動しました: http://{HOST}:{VIEWER_PORT}/")

def run_modal(*args):
    cmd = [sys.executable, "-m", "modal", *args]
    result = subprocess.run(cmd, cwd=str(BASE_DIR))
    return result.returncode == 0

def deploy():
    print("Modalにデプロイしています...")
    if not run_modal("deploy", str(MODAL_APP_PY)):
        print("デプロイに失敗しました。")
        sys.exit(1)
    print("デプロイ完了。")

def find_container_ids():
    cmd = [sys.executable, "-m", "modal", "container", "list", "--json"]
    result = subprocess.run(cmd, cwd=str(BASE_DIR), capture_output=True,
                            text=True, encoding="utf-8")
    if result.returncode != 0:
        print(result.stderr.strip())
        return None
    try:
        rows = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("コンテナ一覧(JSON)を読み取れませんでした。")
        return None

    ids = []
    for row in rows:
        norm = {k.lower().replace("_", " ").replace("-", " "): v for k, v in row.items()}
        app_name = str(norm.get("app name", ""))
        container_id = norm.get("container id")
        if container_id and APP_NAME in app_name:
            ids.append(container_id)
    return ids

def stop_containers():
    # アップロード用コンテナを途中で止めてしまわないよう、先に完了を待つ
    wait_uploads()
    print("起動中のコンテナを確認しています...")
    ids = find_container_ids()
    if ids is None:
        print("確認に失敗しました。手動で確認してください: python -m modal container list")
        return
    if not ids:
        print("停止するコンテナはありません。")
        return

    for cid in ids:
        if run_modal("container", "stop", "-y", cid) or run_modal("container", "stop", cid):
            print(f"コンテナの停止を要求しました: {cid}")
        else:
            print(f"停止に失敗しました。手動で実行してください: python -m modal container stop {cid}")

    wait_containers_gone()

def wait_containers_gone():
    deadline = time.time() + CONTAINER_STOP_TIMEOUT
    while time.time() < deadline:
        ids = find_container_ids()
        if ids is not None and not ids:
            print("コンテナが完全に終了しました。")
            return
        time.sleep(CONTAINER_POLL_INTERVAL)
    print("タイムアウトしました。コンテナが残っている可能性があります: "
          "python -m modal container list")

def make_image_names(nums):
    stamp = time.strftime("%Y%m%d-%H%M%S")
    return [f"{stamp}_{uuid.uuid4().hex[:8]}.png" for _ in range(nums)]

def save_prompt_files(names, prompt_jp):
    PROMPT_DIR.mkdir(parents=True, exist_ok=True)
    for name in names:
        path = PROMPT_DIR / (Path(name).stem + ".json")
        tmp = path.with_name(path.name + ".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"prompt": prompt_jp}, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)

def generate(krea, prompt_en, prompt_jp, width, height, nums):
    print("生成中...")
    t0 = time.time()
    names = make_image_names(nums)
    call_state["cancelled"] = False
    try:
        # 生成には英語、保存には日本語を使う。
        # remote() は途中で中断できないため、spawn() で FunctionCall を受け取り、
        # 停止ボタンから cancel できるようにする（get() で完了まで待つ点は remote() と同じ）
        fc = krea.generate.spawn(
            prompt_en, w=width, h=height, n=nums, mega=UPLOAD_TO_MEGA, names=names,
        )
        with call_lock:
            call_state["fc"] = fc
        result = fc.get()
        call_id = result.get("upload_call_id") if isinstance(result, dict) else None
        if call_id:
            track_upload(call_id)
    except Exception as e:
        if call_state["cancelled"]:
            print("\033[43m  停止ボタンにより生成を中断しました  \033[0m")
        else:
            print(f"生成に失敗しました: {type(e).__name__}: {e}")
        return False
    finally:
        with call_lock:
            call_state["fc"] = None

    print(f"\033[42m  完了({time.time() - t0:.0f}秒) {width}*{height}, {nums}枚  \033[0m")
    try:
        save_prompt_files(names, prompt_jp)
    except OSError as e:
        print(f"プロンプトの保存に失敗しました: {type(e).__name__}: {e}")
    return True

class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message

def _get_int(data: dict, key: str, default: int, lo: int, hi: int) -> int:
    value = data.get(key, default)

    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise ApiError(400, f"{key} は整数で指定してください")
    try:
        value = int(value)
    except ValueError:
        raise ApiError(400, f"{key} は整数で指定してください")
    if not lo <= value <= hi:
        raise ApiError(400, f"{key} は {lo}〜{hi} の範囲で指定してください")
    return value

# 送信元のエディタが段落単位でテキストを送ってくる場合、改行が
# 「1回→2回」「空行1つ→5回」のように増えて届く（k = 3m-1 回の連続改行が本来 m 回）。
# 全ての連続改行がこの形のときだけ、見た目どおりの改行数に戻す。
# 送信元が最初から正しい改行で送ってくるなら False にする。
COLLAPSE_PARAGRAPH_BREAKS = True

def restore_line_breaks(text: str) -> str:
    runs = re.findall(r"\n+", text)
    if not runs or any((len(r) + 1) % 3 != 0 for r in runs):
        return text
    return re.sub(r"\n+", lambda m: "\n" * ((len(m.group()) + 1) // 3), text)

def _get_prompt(data: dict, key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ApiError(400, f"{key} は空でない文字列で指定してください")
    # 改行コードは \n に統一（\r\n のままだとクリップボード経由で改行が二重になることがある）
    text = value.strip().replace("\r\n", "\n").replace("\r", "\n")
    return restore_line_breaks(text) if COLLAPSE_PARAGRAPH_BREAKS else text

def _set_pending(prompt_jp, prompt_en, width, height, nums):
    with pending_lock:
        pending_request["data"] = (prompt_jp, prompt_en, width, height, nums)

def _pop_pending():
    with pending_lock:
        data = pending_request["data"]
        pending_request["data"] = None
    return data

def _run_generate(prompt_jp, prompt_en, width, height, nums):
    try:
        current = (prompt_jp, prompt_en, width, height, nums)
        while current is not None and not stop_event.is_set():
            c_jp, c_en, c_width, c_height, c_nums = current
            ok = generate(krea, c_en, c_jp, c_width, c_height, c_nums)

            if stop_event.is_set():
                break

            # -e 指定時は、生成が終わるたびにコンテナを停止する（成功・失敗どちらでも）。
            # 次のリクエストが来たとき、Modal が自動でコンテナを起動し直す。
            if STOP_AFTER_EACH:
                print("[-e] 生成が完了したためコンテナを停止します。")
                stop_containers()
                if stop_event.is_set():
                    break

            pending = _pop_pending()
            if pending is not None:
                current = pending
            elif ok and not STOP_AFTER_EACH:
                pass
            elif ok:
                # -e 指定時は次の POST が来るまで待機する
                current = None
                print("[-e] 次のリクエストを待機します。")
            else:
                current = None
                print("生成に失敗または中断されたため、連続生成を止めます。次のリクエストを待ちます。")
    finally:
        generate_lock.release()

def handle_generate(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ApiError(400, "JSON オブジェクトを送ってください")

    prompt_jp = _get_prompt(data, "prompt_jp")
    prompt_en = _get_prompt(data, "prompt_en")

    width = _get_int(data, "width", DEFAULT_WIDTH, MIN_SIZE, MAX_SIZE)
    height = _get_int(data, "height", DEFAULT_HEIGHT, MIN_SIZE, MAX_SIZE)
    nums = _get_int(data, "nums", DEFAULT_NUMS, 1, MAX_NUMS)

    if stop_event.is_set():
        raise ApiError(503, "停止処理中のため、リクエストを受け付けられません")

    if not generate_lock.acquire(blocking=False):
        _set_pending(prompt_jp, prompt_en, width, height, nums)
        return {
            "result": f"現在生成中のため、{width}x{height} を {nums}枚 のリクエストを保存しました。"
                       f"今の生成が終わり次第、この内容に切り替わります",
            "queued": True,
        }

    threading.Thread(
        target=_run_generate, args=(prompt_jp, prompt_en, width, height, nums), daemon=True
    ).start()
    return {"result": f"{width}x{height} を {nums}枚 生成を開始しました", "queued": False}

def _stop_containers_in_background():
    # コンテナ停止の完了待ち(最大 CONTAINER_STOP_TIMEOUT 秒)でHTTP応答を塞がないよう、別スレッドで実行する
    if not stop_request_lock.acquire(blocking=False):
        return  # すでに停止処理中
    try:
        stop_containers()
    finally:
        stop_request_lock.release()

def handle_stop(data: dict) -> dict:
    if stop_event.is_set():
        raise ApiError(503, "停止処理中のため、リクエストを受け付けられません")

    # 予約済みのリクエストは破棄する（停止後に勝手に次の生成が始まらないように）
    _pop_pending()

    # 実行中の生成があればキャンセルする。
    # `modal container stop` だけだと実行中の入力が別コンテナへ再スケジュールされ、生成が続いてしまうため、
    # 先に FunctionCall 自体をキャンセルする。
    with call_lock:
        fc = call_state["fc"]
        if fc is not None:
            call_state["cancelled"] = True
    if fc is not None:
        try:
            try:
                fc.cancel(terminate_containers=True)
            except TypeError:
                fc.cancel()  # terminate_containers 非対応の古い modal
        except Exception as e:
            print(f"生成のキャンセルに失敗しました: {type(e).__name__}: {e}")

    # 念のため、起動中のコンテナも停止する
    threading.Thread(target=_stop_containers_in_background, daemon=True).start()
    return {
        "result": "停止を要求しました。生成を中断し、コンテナを停止します"
                  if fc is not None else
                  "停止を要求しました。コンテナを停止します",
        "stopped": True,
    }

ROUTES = {
    "/api/generate": handle_generate,
    "/api/stop": handle_stop,
}

class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/ping":
            self._send_json(200, {"result": "pong"})
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        func = ROUTES.get(self.path)
        if func is None:
            self._send_json(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                raise ApiError(400, "JSON として読み取れませんでした")
            self._send_json(200, func(data))
        except ApiError as e:
            self._send_json(e.status, {"error": e.message})
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def log_message(self, format, *args):

        pass

def main():
    global krea, STOP_AFTER_EACH

    parser = argparse.ArgumentParser(description="Krea 画像生成サーバー + 画像ビューア")
    parser.add_argument("-d", "--deploy", action="store_true",
                        help="起動時に modal deploy を実行する")
    parser.add_argument("-e", "--end-each", action="store_true",
                        help="1回生成するごとにコンテナを停止し、次のPOSTが来るまで待機する")
    args = parser.parse_args()
    STOP_AFTER_EACH = args.end_each

    if args.deploy:
        deploy()

    import modal
    krea = modal.Cls.from_name(APP_NAME, CLS_NAME)()

    launch_viewer()

    server = ThreadingHTTPServer((HOST, GEN_PORT), Handler)
    print(f"[gen] Listening on http://{HOST}:{GEN_PORT}  (Ctrl+C で停止)")
    if STOP_AFTER_EACH:
        print("[-e] 有効: 生成ごとにコンテナを停止します。")
    print("\033[42m  準備完了  \033[0m")
    print("Modal Dashboard      -> https://modal.com/apps/main?sort=modified_at&order=desc")
    print("Modal Billing usage  -> https://modal.com/settings/usage")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nCtrl+C を受け付けました。実行中の生成が終わるのを待って停止します。\n\033[31mパソコンの電源を落としたり、ウィンドウを閉じないでください。\033[0m")
    finally:

        stop_event.set()
        server.server_close()
        _wait_for_generation()

        if _pop_pending() is not None:
            print("保存されていたリクエストは実行せずに破棄しました。")

        stop_containers()
    print("終了します")

def _on_sigint_while_stopping(signum, frame):
    print("\n停止処理中です。")

def _wait_for_generation():
    if generate_lock.acquire(blocking=False):
        generate_lock.release()
        return
    while not generate_lock.acquire(timeout=1):
        pass
    generate_lock.release()

if __name__ == "__main__":
    main()