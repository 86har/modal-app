import hashlib
import json
import os
import shutil
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request, send_from_directory
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

try:
    from PIL import Image
except ImportError:
    Image = None

BASE_DIR = Path(__file__).resolve().parent

HOST = "127.0.0.1"
VIEWER_PORT = 5000
GEN_PORT = 8765

PROMPT_DIR = BASE_DIR.parent / "output_prompts"

CONFIG_PATH = Path(os.environ.get("KREA_CONFIG") or (BASE_DIR.parent.parent.parent / "config.json"))

DEFAULT_WATCH_DIR = BASE_DIR.parent / "output_images"

def load_watch_dir() -> Path:
    if not CONFIG_PATH.is_file():
        return DEFAULT_WATCH_DIR
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"[viewer] config.json を読み取れませんでした。既定のフォルダを使用します: {e}")
        return DEFAULT_WATCH_DIR
    watch_dir = data.get("WATCH_DIR") if isinstance(data, dict) else None
    if not watch_dir:
        return DEFAULT_WATCH_DIR
    return Path(watch_dir)

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
    _watch = str(_cfg_dir / _watch)
WATCH_DIR = _watch

WATCH_OVERRIDE_PATH = BASE_DIR / "watch_config.json"

def load_watch_override():
    try:
        with open(WATCH_OVERRIDE_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    folder = data.get("folder") if isinstance(data, dict) else None
    if folder and os.path.isdir(folder):
        return folder
    return None

def persist_watch_override(folder):
    try:
        with open(WATCH_OVERRIDE_PATH, "w", encoding="utf-8") as f:
            json.dump({"folder": folder}, f, ensure_ascii=False)
    except OSError:
        pass

_watch_override = load_watch_override()
if _watch_override:
    WATCH_DIR = _watch_override

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
GRACE_SECONDS = 2.0
NO_CONNECT_TIMEOUT = 120
PING_INTERVAL = 0.5

SETTLE_SECONDS = 1.0

THUMB_DIR = BASE_DIR / ".thumb_cache"
THUMB_SIZE = 384
THUMB_SEM = threading.Semaphore(2)

FAVORITE_CONFIG_PATH = BASE_DIR / "favorite_config.json"

viewer_app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
)

current_image = {"name": None}
viewer_lock = threading.Lock()
new_image_event = threading.Event()

watch_lock = threading.Lock()
watch_state = {"dir": WATCH_DIR, "observer": None}

def get_watch_dir():
    with watch_lock:
        return watch_state["dir"]

favorite_lock = threading.Lock()
favorite_folder = {"path": None}

def load_favorite_folder():
    try:
        with open(FAVORITE_CONFIG_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    folder = data.get("folder") if isinstance(data, dict) else None
    if folder and os.path.isdir(folder):
        return folder
    return None

def persist_favorite_folder(folder):
    try:
        with open(FAVORITE_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump({"folder": folder}, f, ensure_ascii=False)
    except OSError:
        pass

def ask_directory_dialog(title="フォルダを選択"):
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        return None
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        folder = filedialog.askdirectory(title=title)
        root.destroy()
    except Exception:
        return None
    return folder or None

def unique_dest_path(folder, filename):
    base, ext = os.path.splitext(filename)
    dest = os.path.join(folder, filename)
    i = 1
    while os.path.exists(dest):
        dest = os.path.join(folder, f"{base}_{i}{ext}")
        i += 1
    return dest

def favorite_name_set():
    with favorite_lock:
        folder = favorite_folder["path"]
    if not folder or not os.path.isdir(folder):
        return set()
    try:
        return {
            f for f in os.listdir(folder)
            if is_image(f) and os.path.isfile(os.path.join(folder, f))
        }
    except OSError:
        return set()

def is_image(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTS

def list_images():
    watch_dir = get_watch_dir()
    try:
        files = [
            f for f in os.listdir(watch_dir)
            if is_image(f) and os.path.isfile(os.path.join(watch_dir, f))
        ]
    except FileNotFoundError:
        return []
    files.sort(key=lambda f: os.path.getmtime(os.path.join(watch_dir, f)), reverse=True)
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
    return send_from_directory(get_watch_dir(), name)

@viewer_app.route("/image/<path:filename>")
def image_by_name(filename):
    name = os.path.basename(filename)
    if not name or not is_image(name):
        return "不正なファイル名です", 400
    watch_dir = get_watch_dir()
    if not os.path.isfile(os.path.join(watch_dir, name)):
        return "画像が見つかりません", 404
    return send_from_directory(watch_dir, name)

def make_thumb(src_path):
    """縮小JPEGを作ってキャッシュし、そのパスを返す。失敗時は None。"""
    if Image is None:
        return None
    try:
        st = os.stat(src_path)
        key = hashlib.sha1(f"{src_path}|{st.st_mtime_ns}|{st.st_size}".encode("utf-8")).hexdigest()
        dest = THUMB_DIR / f"{key}.jpg"
        if dest.is_file():
            return dest
        THUMB_DIR.mkdir(exist_ok=True)
        with THUMB_SEM:
            if dest.is_file():
                return dest
            tmp = THUMB_DIR / f"{key}.{threading.get_ident()}.tmp"
            with Image.open(src_path) as im:
                im.draft("RGB", (THUMB_SIZE * 2, THUMB_SIZE * 2))
                im = im.convert("RGB")
                im.thumbnail((THUMB_SIZE, THUMB_SIZE))
                im.save(tmp, "JPEG", quality=82)
            os.replace(tmp, dest)
        return dest
    except Exception:
        return None

_prewarm_lock = threading.Lock()
_prewarm_running = False

def prewarm_thumbs(folder, names):
    """一覧を返したあと、バックグラウンドで（新しい順に）サムネイルを先に作っておく。
    1スレッドだけ使い、同時実行枠(THUMB_SEM)の1つは画面からの要求用に空けておく。"""
    global _prewarm_running
    if Image is None or not folder:
        return
    with _prewarm_lock:
        if _prewarm_running:
            return
        _prewarm_running = True

    def worker():
        global _prewarm_running
        try:
            for name in names:
                make_thumb(os.path.join(folder, name))
        finally:
            with _prewarm_lock:
                _prewarm_running = False

    threading.Thread(target=worker, daemon=True).start()

def serve_thumb(folder, filename):
    name = os.path.basename(filename)
    if not name or not is_image(name):
        return "不正なファイル名です", 400
    if not folder or not os.path.isdir(folder):
        return "フォルダが見つかりません", 404
    src = os.path.join(folder, name)
    if not os.path.isfile(src):
        return "画像が見つかりません", 404
    thumb = make_thumb(src)
    if thumb is None:
        return send_from_directory(folder, name)
    resp = send_from_directory(str(THUMB_DIR), thumb.name)
    resp.headers["Cache-Control"] = "public, max-age=2592000"
    return resp

@viewer_app.route("/thumb/<path:filename>")
def thumb_by_name(filename):
    return serve_thumb(get_watch_dir(), filename)

@viewer_app.route("/favorite/thumb/<path:filename>")
def favorite_thumb_by_name(filename):
    with favorite_lock:
        folder = favorite_folder["path"]
    return serve_thumb(folder, filename)

def load_prompt_data(filename):
    """画像名に対応する output_prompts/*.json を読む。読めなければ (None, エラー応答)。"""
    name = os.path.basename(filename)
    if not name or not is_image(name):
        return None, (jsonify({"error": "不正なファイル名です"}), 400)
    path = PROMPT_DIR / (os.path.splitext(name)[0] + ".json")
    if not path.is_file():
        return None, (jsonify({"error": "プロンプトが見つかりません"}), 404)
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None, (jsonify({"error": "プロンプトを読み取れませんでした"}), 500)
    if not isinstance(data, dict) or not isinstance(data.get("prompt"), str):
        return None, (jsonify({"error": "プロンプトが見つかりません"}), 404)
    return data, None

def _ref_image_file(data):
    """JSON に記録された参照画像のパスが、実在する画像ファイルならその絶対パスを返す。"""
    p = data.get("image_path")
    if not isinstance(p, str) or not p.strip():
        return None
    p = os.path.expanduser(p.strip())
    if is_image(p) and os.path.isfile(p):
        return p
    return None

@viewer_app.route("/prompt/<path:filename>")
def prompt_by_name(filename):
    data, err = load_prompt_data(filename)
    if err:
        return err
    ref_boost = data.get("ref_boost")
    grounding_px = data.get("grounding_px")
    loras = []
    for item in (data.get("loras") if isinstance(data.get("loras"), list) else []):
        if isinstance(item, dict) and item.get("version_id") not in (None, ""):
            loras.append({"version_id": str(item.get("version_id")), "strength": item.get("strength")})
    image_path = data.get("image_path") if isinstance(data.get("image_path"), str) and data.get("image_path").strip() else None
    return jsonify({
        "prompt": data["prompt"],
        "image_path": image_path,
        "ref_image_exists": bool(_ref_image_file(data)),
        "ref_boost": ref_boost if isinstance(ref_boost, (int, float)) and not isinstance(ref_boost, bool) else None,
        "grounding_px": grounding_px if isinstance(grounding_px, (int, float)) and not isinstance(grounding_px, bool) else None,
        "loras": loras,
    })

@viewer_app.route("/ref_image/<path:filename>")
def ref_image_by_name(filename):
    data, err = load_prompt_data(filename)
    if err:
        return err
    src = _ref_image_file(data)
    if not src:
        return "参照画像が見つかりません", 404
    thumb = make_thumb(src)
    if thumb is None:
        return send_from_directory(os.path.dirname(src), os.path.basename(src))
    return send_from_directory(str(THUMB_DIR), thumb.name)

@viewer_app.route("/images")
def images():
    watch_dir = get_watch_dir()
    favorites = favorite_name_set()
    result = []
    for name in list_images():
        try:
            stat = os.stat(os.path.join(watch_dir, name))
        except OSError:
            continue
        result.append({
            "name": name,
            "size": stat.st_size,
            "mtime": stat.st_mtime,
            "favorite": name in favorites,
        })
    prewarm_thumbs(watch_dir, [r["name"] for r in result])
    return jsonify({"images": result})

@viewer_app.route("/favorite/images")
def favorite_images():
    with favorite_lock:
        folder = favorite_folder["path"]
    result = []
    if folder and os.path.isdir(folder):
        try:
            names = [
                f for f in os.listdir(folder)
                if is_image(f) and os.path.isfile(os.path.join(folder, f))
            ]
        except OSError:
            names = []
        for name in names:
            try:
                stat = os.stat(os.path.join(folder, name))
            except OSError:
                continue
            result.append({"name": name, "size": stat.st_size, "mtime": stat.st_mtime, "favorite": True})
        result.sort(key=lambda item: item["mtime"], reverse=True)
        prewarm_thumbs(folder, [r["name"] for r in result])
    return jsonify({"images": result})

@viewer_app.route("/favorite/image/<path:filename>")
def favorite_image_by_name(filename):
    name = os.path.basename(filename)
    if not name or not is_image(name):
        return "不正なファイル名です", 400
    with favorite_lock:
        folder = favorite_folder["path"]
    if not folder or not os.path.isdir(folder):
        return "保存先フォルダが設定されていません", 404
    if not os.path.isfile(os.path.join(folder, name)):
        return "画像が見つかりません", 404
    return send_from_directory(folder, name)

def start_watch_observer(path):
    observer = Observer()
    observer.schedule(NewImageHandler(), str(path), recursive=False)
    observer.start()
    return observer

def change_watch_dir(new_dir):
    """監視フォルダを切り替える：Observerを貼り直し、設定を保存し、表示中の画像を更新する"""
    new_dir = os.path.normpath(new_dir)
    os.makedirs(new_dir, exist_ok=True)

    with watch_lock:
        old_observer = watch_state["observer"]
        watch_state["dir"] = new_dir

    if old_observer is not None:
        try:
            old_observer.stop()
            old_observer.join(timeout=2)
        except Exception:
            pass

    new_observer = start_watch_observer(new_dir)
    with watch_lock:
        watch_state["observer"] = new_observer

    with viewer_lock:
        current_image["name"] = get_latest_image()

    persist_watch_override(new_dir)
    new_image_event.set()

@viewer_app.route("/watch/folder", methods=["GET", "POST"])
def watch_folder_route():
    if request.method == "POST":
        folder = ask_directory_dialog(title="監視フォルダを選択")
        if folder:
            change_watch_dir(folder)
    return jsonify({"folder": get_watch_dir()})

@viewer_app.route("/favorite/folder", methods=["GET", "POST"])
def favorite_folder_route():
    if request.method == "POST":
        folder = ask_directory_dialog()
        if folder:
            with favorite_lock:
                favorite_folder["path"] = folder
            persist_favorite_folder(folder)
    with favorite_lock:
        return jsonify({"folder": favorite_folder["path"]})

@viewer_app.route("/favorite/save", methods=["POST"])
def favorite_save():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if not isinstance(name, str) or not is_image(name):
        return jsonify({"error": "不正なファイル名です"}), 400
    name = os.path.basename(name)
    src = os.path.join(get_watch_dir(), name)
    if not os.path.isfile(src):
        return jsonify({"error": "画像が見つかりません"}), 404

    with favorite_lock:
        folder = favorite_folder["path"]
    if not folder:
        return jsonify({"error": "保存先が設定されていません"}), 400
    if not os.path.isdir(folder):
        return jsonify({"error": "保存先フォルダが見つかりません"}), 400

    dest = unique_dest_path(folder, name)
    try:
        shutil.copy2(src, dest)
    except OSError:
        return jsonify({"error": "保存に失敗しました"}), 500
    try:
        os.utime(dest, None)
    except OSError:
        pass
    return jsonify({"saved": True, "path": dest})

@viewer_app.route("/favorite/delete", methods=["POST"])
def favorite_delete():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if not isinstance(name, str) or not is_image(name):
        return jsonify({"error": "不正なファイル名です"}), 400
    name = os.path.basename(name)

    with favorite_lock:
        folder = favorite_folder["path"]
    if not folder:
        return jsonify({"error": "保存先が設定されていません"}), 400
    if not os.path.isdir(folder):
        return jsonify({"error": "保存先フォルダが見つかりません"}), 400

    target = os.path.join(folder, name)
    if not os.path.isfile(target):
        return jsonify({"error": "お気に入りに画像がありません"}), 404
    try:
        os.remove(target)
    except OSError:
        return jsonify({"error": "削除に失敗しました"}), 500
    return jsonify({"deleted": True})

@viewer_app.route("/delete_image", methods=["POST"])
def delete_image():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if not isinstance(name, str) or not is_image(name):
        return jsonify({"error": "不正なファイル名です"}), 400
    name = os.path.basename(name)
    target = os.path.join(get_watch_dir(), name)
    if not os.path.isfile(target):
        return jsonify({"error": "画像が見つかりません"}), 404
    try:
        os.remove(target)
    except OSError:
        return jsonify({"error": "削除に失敗しました"}), 500
    return jsonify({"deleted": True})

@viewer_app.route("/reveal_image", methods=["POST"])
def reveal_image():
    import subprocess
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if not isinstance(name, str) or not is_image(name):
        return jsonify({"error": "不正なファイル名です"}), 400
    name = os.path.basename(name)
    if data.get("favorite"):
        with favorite_lock:
            folder = favorite_folder["path"]
        if not folder:
            return jsonify({"error": "保存先が設定されていません"}), 400
    else:
        folder = get_watch_dir()
    target = os.path.normpath(os.path.join(folder, name))
    if not os.path.isfile(target):
        return jsonify({"error": "画像が見つかりません"}), 404
    try:
        if sys.platform == "win32":
            subprocess.Popen(["explorer", "/select,", target])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", "-R", target])
        else:
            subprocess.Popen(["xdg-open", os.path.dirname(target)])
    except OSError:
        return jsonify({"error": "エクスプローラを開けませんでした"}), 500
    return jsonify({"opened": True})

_local_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
_IDLE_PROGRESS = {"state": "idle", "percent": 0.0, "preparing": False}

@viewer_app.route("/progress")
def progress():
    try:
        with _local_opener.open(f"http://{HOST}:{GEN_PORT}/api/progress", timeout=1.0) as r:
            data = json.loads(r.read().decode("utf-8"))
        if not isinstance(data, dict):
            data = _IDLE_PROGRESS
    except Exception:
        data = _IDLE_PROGRESS
    resp = jsonify(data)
    resp.headers["Cache-Control"] = "no-store"
    return resp

_IDLE_LOG = {"lines": [], "cur": [], "version": 0}

@viewer_app.route("/log")
def log():
    try:
        with _local_opener.open(f"http://{HOST}:{GEN_PORT}/api/log", timeout=1.0) as r:
            data = json.loads(r.read().decode("utf-8"))
        if not isinstance(data, dict):
            data = _IDLE_LOG
    except Exception:
        data = _IDLE_LOG
    resp = jsonify(data)
    resp.headers["Cache-Control"] = "no-store"
    return resp

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

def _watchdog():
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
            with watch_lock:
                observer = watch_state["observer"]
            if observer is not None:
                observer.stop()
            os._exit(0)

def main():
    watch_dir = get_watch_dir()
    os.makedirs(watch_dir, exist_ok=True)
    print(f"[viewer] 監視フォルダ: {watch_dir}")

    with favorite_lock:
        favorite_folder["path"] = load_favorite_folder()

    current_image["name"] = get_latest_image()
    if current_image["name"] is None:
        print(f"[viewer] フォルダ内に画像が見つかりません: {watch_dir}")

    observer = start_watch_observer(watch_dir)
    with watch_lock:
        watch_state["observer"] = observer

    threading.Thread(target=_watchdog, daemon=True).start()
    threading.Timer(1.0, lambda: webbrowser.open_new(f"http://{HOST}:{VIEWER_PORT}/")).start()

    print(f"[viewer] http://{HOST}:{VIEWER_PORT}/ で画像ビューアを起動しました")
    viewer_app.run(host=HOST, port=VIEWER_PORT, debug=False, use_reloader=False, threaded=True)

if __name__ == "__main__":
    main()