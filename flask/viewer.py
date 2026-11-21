import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request, send_from_directory
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

BASE_DIR = Path(__file__).resolve().parent

HOST = "127.0.0.1"
VIEWER_PORT = 5000

import json
import os
from pathlib import Path

def _load_config():
    """config.json を探して読み込む。KREA_CONFIG 環境変数を優先し、
    無ければこのファイルの親フォルダを順にさかのぼって探す。"""
    candidates = []
    env = os.environ.get("KREA_CONFIG")
    if env:
        candidates.append(Path(env))
    candidates += [p / "config.json" for p in Path(__file__).resolve().parents]
    for path in candidates:
        if path.is_file():
            try:
                return json.loads(path.read_text(encoding="utf-8-sig")), path.parent
            except Exception as e:
                print(f"[config] 読み込みに失敗しました: {path}: {e}")
    return {}, None

_cfg, _cfg_dir = _load_config()

_watch = os.path.expandvars(os.path.expanduser(
    _cfg.get("WATCH_DIR") or str(Path.home() / "Downloads" / "outputs")
))
if not os.path.isabs(_watch) and _cfg_dir:
    _watch = str(_cfg_dir / _watch)   # 相対パスは config.json のある場所が基準
WATCH_DIR = _watch
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
GRACE_SECONDS = 2.0
NO_CONNECT_TIMEOUT = 120
PING_INTERVAL = 0.5

SETTLE_SECONDS = 1.0

viewer_app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
)

current_image = {"name": None}
viewer_lock = threading.Lock()
new_image_event = threading.Event()

def is_image(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTS

def list_images():
    try:
        files = [
            f for f in os.listdir(WATCH_DIR)
            if is_image(f) and os.path.isfile(os.path.join(WATCH_DIR, f))
        ]
    except FileNotFoundError:
        return []
    files.sort(key=lambda f: os.path.getmtime(os.path.join(WATCH_DIR, f)), reverse=True)
    return files

def get_latest_image():
    files = list_images()
    return files[0] if files else None

class NewImageHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        filename = os.path.basename(event.src_path)
        if not is_image(filename):
            return
        time.sleep(0.5)
        with viewer_lock:
            current_image["name"] = filename
        new_image_event.set()

@viewer_app.route("/")
def index():
    return render_template("index.html", ts=int(time.time()))

@viewer_app.route("/image")
def image():
    with viewer_lock:
        name = current_image["name"]
    if name is None:
        return "画像が見つかりません", 404
    return send_from_directory(WATCH_DIR, name)

@viewer_app.route("/image/<path:filename>")
def image_by_name(filename):
    name = os.path.basename(filename)
    if not name or not is_image(name):
        return "不正なファイル名です", 400
    if not os.path.isfile(os.path.join(WATCH_DIR, name)):
        return "画像が見つかりません", 404
    return send_from_directory(WATCH_DIR, name)

@viewer_app.route("/images")
def images():
    result = []
    for name in list_images():
        try:
            stat = os.stat(os.path.join(WATCH_DIR, name))
        except OSError:
            continue
        result.append({"name": name, "size": stat.st_size, "mtime": stat.st_mtime})
    return jsonify({"images": result})

@viewer_app.route("/wait")
def wait():
    triggered = new_image_event.wait(timeout=30)
    if triggered:

        while True:
            new_image_event.clear()
            if not new_image_event.wait(timeout=SETTLE_SECONDS):
                break
    return jsonify({"updated": triggered})

_state_lock = threading.Lock()
_conns = 0
_ever_connected = False
_zero_since = None

def _conn_opened():
    global _conns, _ever_connected, _zero_since
    with _state_lock:
        _conns += 1
        _ever_connected = True
        _zero_since = None

def _conn_closed():
    global _conns, _zero_since
    with _state_lock:
        _conns -= 1
        if _conns <= 0:
            _conns = 0
            _zero_since = time.time()

@viewer_app.route("/_alive")
def alive():
    def stream():
        _conn_opened()
        try:
            yield "retry: 1000\n\n"
            while True:
                time.sleep(PING_INTERVAL)
                yield ": ping\n\n"
        finally:
            _conn_closed()

    return Response(
        stream(), mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

_ALIVE_SNIPPET = "<script>new EventSource('/_alive');</script>"

@viewer_app.after_request
def inject_alive_script(resp):
    if request.path == "/" and resp.mimetype == "text/html":
        html = resp.get_data(as_text=True)
        if "</body>" in html:
            html = html.replace("</body>", _ALIVE_SNIPPET + "</body>", 1)
        else:
            html += _ALIVE_SNIPPET
        resp.set_data(html)
    return resp

def _watchdog(observer):
    started = time.time()
    while True:
        time.sleep(0.25)
        with _state_lock:
            closed = (
                _ever_connected and _conns == 0
                and _zero_since is not None
                and time.time() - _zero_since >= GRACE_SECONDS
            )
            never_opened = (not _ever_connected) and time.time() - started >= NO_CONNECT_TIMEOUT
        if closed or never_opened:
            print("[viewer] ウィンドウが閉じられたため終了します" if closed
                  else "[viewer] 一定時間ページが開かれなかったため終了します")
            if observer is not None:
                observer.stop()
            os._exit(0)

def main():
    observer = None
    os.makedirs(WATCH_DIR, exist_ok=True)
    print(f"[viewer] 監視フォルダ: {WATCH_DIR}")

    current_image["name"] = get_latest_image()
    if current_image["name"] is None:
        print(f"[viewer] フォルダ内に画像が見つかりません: {WATCH_DIR}")

    observer = Observer()
    observer.schedule(NewImageHandler(), WATCH_DIR, recursive=False)
    observer.start()

    threading.Thread(target=_watchdog, args=(observer,), daemon=True).start()
    threading.Timer(1.0, lambda: webbrowser.open_new(f"http://{HOST}:{VIEWER_PORT}/")).start()

    print(f"[viewer] http://{HOST}:{VIEWER_PORT}/ で画像ビューアを起動しました")
    viewer_app.run(host=HOST, port=VIEWER_PORT, debug=False, use_reloader=False, threaded=True)

if __name__ == "__main__":
    main()