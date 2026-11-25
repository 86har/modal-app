import argparse
import collections
import json
import os
import re
import shutil
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

# ===== ターミナルログ（ビューアー上に gen.py の出力をそのまま表示するためのバッファ） =====
# print() の出力を実際のコンソールに出しつつ、\r(行の上書き)と\n(改行)を解釈して
# "行の配列" として溜めておく。ANSIの色コード(\033[...m)はそのまま文字列に残しておき、
# /api/log で返すときに ansi_to_segments() で色情報つきのセグメントに変換する。
TERM_LOG_MAXLINES = 1000

class TerminalLog:
    def __init__(self, maxlines=TERM_LOG_MAXLINES):
        self.lock = threading.Lock()
        self.lines = collections.deque(maxlen=maxlines)
        self.cur = ""
        self.version = 0

    def feed(self, s):
        if not s:
            return
        with self.lock:
            for ch in s:
                if ch == "\r":
                    self.cur = ""
                elif ch == "\n":
                    self.lines.append(self.cur)
                    self.cur = ""
                else:
                    self.cur += ch
            self.version += 1

    def snapshot(self, limit=300):
        with self.lock:
            completed = list(self.lines)[-limit:]
            cur = self.cur
            version = self.version
        return completed, cur, version

term_log = TerminalLog()

class _TeeStdout:
    """標準出力を実際のコンソールへ流しつつ、TerminalLog にも書き込む。"""
    def __init__(self, real, log):
        self._real = real
        self._log = log

    def write(self, s):
        try:
            self._real.write(s)
        except Exception:
            pass
        self._log.feed(s)
        return len(s)

    def flush(self):
        try:
            self._real.flush()
        except Exception:
            pass

    def isatty(self):
        try:
            return self._real.isatty()
        except Exception:
            return False

sys.stdout = _TeeStdout(sys.stdout, term_log)

# CSI(エスケープ)シーケンスのうち、色指定(m)ではないもの(\033[K など)を取り除く
_CSI_NON_SGR = re.compile(r"\x1b\[[0-9;]*[A-Za-ln-zA-Ln-z]")
# \033[...m 形式の色指定
_SGR_RE = re.compile(r"\x1b\[([0-9;]*)m")

_ANSI_FG = {
    30: "#6b7280", 31: "#e5736b", 32: "#3fb950", 33: "#d4a72c",
    34: "#4c9fe8", 35: "#c678dd", 36: "#39c5cf", 37: "#eee",
}
_ANSI_BG = {
    40: "#000000", 41: "#e5736b", 42: "#2ea043", 43: "#d4a72c",
    44: "#4c9fe8", 45: "#c678dd", 46: "#39c5cf", 47: "#eee",
}

def ansi_to_segments(line):
    """ANSIエスケープを含む1行の文字列を、{"t": テキスト, "fg": 色, "bg": 背景色} のリストに変換する。"""
    line = _CSI_NON_SGR.sub("", line)
    segments = []
    fg = bg = None
    pos = 0
    for m in _SGR_RE.finditer(line):
        text = line[pos:m.start()]
        if text:
            segments.append({"t": text, "fg": fg, "bg": bg})
        codes = m.group(1)
        if codes in ("", "0"):
            fg = bg = None
        else:
            for part in codes.split(";"):
                if not part:
                    continue
                try:
                    n = int(part)
                except ValueError:
                    continue
                if n == 0:
                    fg = bg = None
                elif n in _ANSI_FG:
                    fg = _ANSI_FG[n]
                elif n in _ANSI_BG:
                    bg = _ANSI_BG[n]
        pos = m.end()
    tail = line[pos:]
    if tail or not segments:
        segments.append({"t": tail, "fg": fg, "bg": bg})
    return segments

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

# /api/generate_edit 用: ここに置いた画像を元に編集生成する(呼び出しごとに読み直すので差し替え可能)
TEST_IMAGE_PATH = BASE_DIR / "test_image.png"
DEFAULT_REF_BOOST = 3.0
DEFAULT_GROUNDING_PX = 1024

MIN_SIZE, MAX_SIZE = 64, 4096
MAX_NUMS = 25

# 選べるGPU（拡張機能の GPU 選択と同じ値。modal の gpu= にそのまま渡す）
GPU_CHOICES = (
    "B300", "B200", "H200", "H100", "RTX-PRO-6000",
    "A100-80GB", "A100-40GB", "L40S", "A10", "L4", "T4",
)

# 参照画像(拡張機能の「画像」ボタンで選んだローカルの画像)を使った画像編集生成の設定
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
MAX_IMAGE_BYTES = 20 * 1024 * 1024   # Modal に送るので、大きすぎる画像は断る

VIEWER_PY = BASE_DIR / "flask/viewer.py"

# 日本語プロンプトの保存先（gen_1.py と同じ階層）。viewer.py 側の PROMPT_DIR と揃えること
PROMPT_DIR = BASE_DIR / "output_prompts"

krea = None
generate_lock = threading.Lock()
pending_lock = threading.Lock()
pending_request = {"data": None}

stop_event = threading.Event()

# 停止ボタン(/api/stop)で生成中に立てるフラグ。
# 実行中の生成は中断せず、その生成とMEGAアップロードが完了してからコンテナを停止する。
stop_requested = threading.Event()

# 今 krea が指しているGPU。None は modal_app.py 既定のGPU、_UNKNOWN は起動直後（既存コンテナのGPUが分からない）
_UNKNOWN = object()
gpu_state = {"current": _UNKNOWN}

# 実行中の生成（FunctionCall）。停止ボタン(/api/stop)から cancel するために保持する
call_lock = threading.Lock()
call_state = {"fc": None, "cancelled": False}
# 「画像」ボタンのファイル選択ダイアログの状態（拡張機能が開始→結果の問い合わせ、の2段階で使う）
pick_lock = threading.Lock()
pick_state = {"token": None, "done": False, "path": "", "error": ""}

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

# ===== 生成の進捗表示（CMD にリアルタイムで表示） =====
# Modal 側（modal_app.py）が共有 Dict に書き込む進捗を、生成中だけ定期的に読んで1行で表示する。
# modal_app.py の PROGRESS_DICT_NAME と同じ値にすること。
PROGRESS_DICT_NAME = "krea2-progress"
PROGRESS_POLL_INTERVAL = 0.5
PROGRESS_BAR_WIDTH = 24

STAGE_LABELS = {
    "sampling": "生成中",
    "encoding": "画像を保存中",
    "done": "生成完了",
    "downloading": "LoRAをダウンロード中",
}

# ===== LoRA の適用状況(生成開始時にまとめて表示) =====
# Modal 側が進捗 Dict の "loras" に入れた一覧を、最初に見えた時点で1回だけ表示する。
# その後、状態が変わったもの(ダウンロード中 → 完了 など)だけを1行ずつ追記する。
def _fmt_size(b):
    b = float(b or 0)
    if b >= 1e9:
        return f"{b / 1e9:.2f} GB"
    if b >= 1e6:
        return f"{b / 1e6:.0f} MB"
    return ""

_LORA_STATUS = {
    "cached":      ("ダウンロード済み",     "\033[32m"),
    "pending":     ("これからダウンロード", "\033[33m"),
    "downloading": ("ダウンロード中...",    "\033[33m"),
    "downloaded":  ("今回ダウンロード完了", "\033[32m"),
    "failed":      ("ダウンロード失敗",     "\033[31m"),
}

def _lora_status_text(l):
    text, color = _LORA_STATUS.get(l.get("status"), (str(l.get("status")), ""))
    extra = []
    size = _fmt_size(l.get("size"))
    if size:
        extra.append(size)
    if l.get("status") == "downloaded" and l.get("sec"):
        extra.append(f"{float(l['sec']):.0f}秒")
    if extra:
        text += f" ({', '.join(extra)})"
    return f"{color}{text}\033[0m"

def format_lora_summary(loras):
    have = sum(1 for l in loras if l.get("status") == "cached")
    lines = [f"\033[36m[LoRA] 適用 {len(loras)}件\033[0m  "
             f"(ダウンロード済み {have}件 / 新規ダウンロード {len(loras) - have}件)"]
    for i, l in enumerate(loras, 1):
        lines.append(f"  {i}/{len(loras)}  {l.get('label')}  [ver {l.get('version_id')}]  "
                     f"強度 {float(l.get('strength', 1.0)):.2f}  → {_lora_status_text(l)}")
    return lines

# ===== ビューア(ブラウザ)向けの進捗 =====
# viewer.py の /progress が /api/progress を読み、ブラウザの生成状況バーに反映する。
#   state:     "idle"(待機中) / "loop"(連続生成中) / "single"(1枚だけ生成中)
#   percent:   0〜100(複数枚・複数回の呼び出しを通した全体の進捗)
#   preparing: コンテナ起動・モデル読み込み中なら True(バーが黄色く点滅する)
progress_lock = threading.Lock()
progress_state = {"state": "idle", "percent": 0.0, "preparing": False}

def progress_set(state, percent=0.0, preparing=False):
    with progress_lock:
        if state == "idle":
            percent, preparing = 0.0, False
        progress_state.update(state=state, percent=float(percent), preparing=bool(preparing))

def progress_update(percent, preparing):
    """進捗監視スレッド用。待機中(idle)になった後に、古い値で上書きしないようにする。"""
    with progress_lock:
        if progress_state["state"] == "idle":
            return
        progress_state.update(percent=float(percent), preparing=bool(preparing))

def progress_get():
    with progress_lock:
        return dict(progress_state)

def _display_width(text):
    """端末上の表示幅。全角文字(日本語など)は2桁として数える。"""
    import unicodedata
    return sum(2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1 for ch in text)

def _fit_to_width(text, max_width):
    """表示幅が max_width を超えないように切り詰める(折り返し防止)。"""
    import unicodedata
    out, w = [], 0
    for ch in text:
        cw = 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
        if w + cw > max_width:
            break
        out.append(ch)
        w += cw
    return "".join(out)

class ProgressMonitor:
    def __init__(self, label="", part=0, parts=1):
        self.id = uuid.uuid4().hex
        self.label = label
        # 画像編集のように「1枚ずつ別の呼び出し」を繰り返す場合に、ブラウザのバーを全体の進捗にする。
        # part 番目(0始まり) / parts 回中
        self.part = part
        self.parts = max(1, parts)
        self._stop = threading.Event()
        self._thread = None
        self._t0 = time.time()
        self._drawn = False
        self._lora_seen = None   # 表示済みのLoRA状態(None = まだ一覧を表示していない)

    def start(self):
        self._t0 = time.time()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return self

    def stop(self):
        if self._stop.is_set():
            return  # 二重呼び出し対策
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)
        if self._drawn:
            sys.stdout.write("\r\033[K")  # 行を消去してカーソルを行頭へ
            sys.stdout.flush()
        try:
            import modal
            modal.Dict.from_name(PROGRESS_DICT_NAME, create_if_missing=True).pop(self.id)
        except Exception:
            pass

    @staticmethod
    def _calc(st):
        """Modal 側の進捗 st から (この呼び出しの進捗 0.0〜1.0, 準備中か) を返す。"""
        if not st:
            return 0.0, True  # まだ何も書かれていない = コンテナ起動/モデル読み込み中
        n = max(1, int(st.get("n", 1)))
        done = int(st.get("done", 0))
        step, total = int(st.get("step", 0)), int(st.get("total", 0))
        stage = st.get("stage", "sampling")
        if stage in ("encoding", "done"):
            frac = 1.0
        else:
            frac = (done + (step / total if total else 0.0)) / n
        frac = min(max(frac, 0.0), 1.0)
        preparing = (stage == "sampling" and total == 0 and done == 0) or stage == "downloading"
        return frac, preparing

    def _publish(self, st):
        frac, preparing = self._calc(st)
        overall = (self.part + frac) / self.parts
        progress_update(min(max(overall, 0.0), 1.0) * 100.0, preparing)

    def _format(self, st):
        elapsed = int(time.time() - self._t0)
        prefix = f"{self.label} " if self.label else ""
        if not st:
            return f"{prefix}コンテナ起動/モデル準備を待っています... {elapsed}秒"
        n = max(1, int(st.get("n", 1)))
        done = int(st.get("done", 0))
        step, total = int(st.get("step", 0)), int(st.get("total", 0))
        stage = st.get("stage", "sampling")
        frac, _ = self._calc(st)
        filled = int(PROGRESS_BAR_WIDTH * frac)
        bar = "#" * filled + "-" * (PROGRESS_BAR_WIDTH - filled)
        detail = STAGE_LABELS.get(stage, stage)
        if stage == "downloading":
            cur = [l for l in (st.get("loras") or []) if l.get("status") == "downloading"]
            if cur:
                detail += f" (ver {cur[0].get('version_id')})"
        if stage == "sampling":
            detail += f" ステップ {step}/{total}" if total else " 準備中"
            if n > 1:
                detail += f" ・ {min(done + 1, n)}/{n}枚目"
        return f"{prefix}[{bar}] {frac * 100:5.1f}%  {detail}  経過{elapsed}秒"

    def _emit(self, lines):
        """進捗の1行を消してから複数行を出力する(次の周回で進捗行が下に描き直される)。"""
        sys.stdout.write("\r\033[K" + "\n".join(lines) + "\n")
        sys.stdout.flush()

    def _report_loras(self, st):
        loras = (st or {}).get("loras")
        if not loras:
            return
        if self._lora_seen is None:
            self._emit(format_lora_summary(loras))
            self._lora_seen = [l.get("status") for l in loras]
            return
        lines = []
        for i, l in enumerate(loras):
            if i < len(self._lora_seen) and self._lora_seen[i] != l.get("status"):
                self._lora_seen[i] = l.get("status")
                lines.append(f"[LoRA] {l.get('label')}: {_lora_status_text(l)}")
        if lines:
            self._emit(lines)

    def _run(self):
        try:
            import modal
            pdict = modal.Dict.from_name(PROGRESS_DICT_NAME, create_if_missing=True)
        except Exception as e:
            print(f"[progress] 進捗表示を開始できませんでした: {type(e).__name__}")
            return
        while not self._stop.is_set():
            try:
                st = pdict.get(self.id)
            except Exception:
                st = None
            self._publish(st)
            self._report_loras(st)
            width = shutil.get_terminal_size((80, 20)).columns
            line = _fit_to_width(self._format(st), width - 1)
            # \r で行頭に戻り、\033[K で行末までを消してから上書きする(1行で更新され続ける)
            sys.stdout.write("\r\033[K" + line)
            sys.stdout.flush()
            self._drawn = True
            self._stop.wait(PROGRESS_POLL_INTERVAL)
        # 停止の直前に起きた状態変化(ダウンロード完了など)も取りこぼさない
        try:
            self._report_loras(pdict.get(self.id))
        except Exception:
            pass

def viewer_running() -> bool:
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex((HOST, VIEWER_PORT)) == 0

def _viewer_python():
    # コンソールを持たない pythonw.exe があればそれを使う(空のウィンドウを出さない)
    if os.name == "nt":
        pyw = Path(sys.executable).with_name("pythonw.exe")
        if pyw.exists():
            return str(pyw)
    return sys.executable

def launch_viewer():
    if viewer_running():
        print(f"[viewer] 既に起動しています: http://{HOST}:{VIEWER_PORT}/")
        return
    kwargs = {}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    subprocess.Popen(
        [_viewer_python(), str(VIEWER_PY)], cwd=str(BASE_DIR),
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

def _gpu_label(gpu):
    if gpu is _UNKNOWN:
        return "不明"
    return gpu or "既定"

def _make_krea(gpu):
    import modal
    cls = modal.Cls.from_name(APP_NAME, CLS_NAME)
    if gpu:
        # デプロイ済みのクラスを、GPUだけ差し替えて呼び出す（再デプロイは不要）
        cls = cls.with_options(gpu=gpu)
    return cls()

def ensure_gpu(gpu):
    """生成に使うGPUを gpu にそろえる。初回はそのまま起動し、2回目以降にGPUが変わったときだけ、コンテナを停止してから切り替える。"""
    global krea
    current = gpu_state["current"]
    if gpu == current:
        return
    if current is _UNKNOWN:
        # 初めての生成: 既存のコンテナは止めず、そのまま起動する
        if gpu:
            krea = _make_krea(gpu)
        gpu_state["current"] = gpu
        return
    print(f"[gpu] GPUを {_gpu_label(current)} -> {_gpu_label(gpu)} に変更します。コンテナを停止します。")
    stop_containers()  # 完全に終了するまで待つ
    krea = _make_krea(gpu)
    gpu_state["current"] = gpu

def make_image_names(nums):
    stamp = time.strftime("%Y%m%d-%H%M%S")
    return [f"{stamp}_{uuid.uuid4().hex[:8]}.png" for _ in range(nums)]

# prompt_jp にはグループ情報（<group name="…" color="…"> 〜 </group> のマーカー行）が含まれることがある。
# そのまま保存するので、保存したプロンプトをコピーして拡張機能のエディタに貼り付けると、グループが復元される。
def save_prompt_files(names, prompt_jp, image_path=None, ref_boost=None, grounding_px=None, loras=None):
    """画像ごとに output_prompts/<画像名>.json を保存する。内容:
      prompt        : 日本語プロンプト
      image_path    : 参照画像のパス（参照画像なしなら null）
      ref_boost     : REF_BOOST（参照画像なしなら null）
      grounding_px  : GROUNDING_PX（参照画像なしなら null）
      loras         : 使った LoRA の [{"version_id": ID, "strength": 重み}, ...]（なしなら []）
    """
    PROMPT_DIR.mkdir(parents=True, exist_ok=True)
    data = {
        "prompt": prompt_jp,
        "image_path": str(image_path) if image_path else None,
        "ref_boost": ref_boost if image_path else None,
        "grounding_px": grounding_px if image_path else None,
        "loras": [
            {"version_id": str(l.get("version_id")), "strength": l.get("strength", 1.0)}
            for l in (loras or [])
        ],
    }
    for name in names:
        path = PROMPT_DIR / (Path(name).stem + ".json")
        tmp = path.with_name(path.name + ".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)

def generate(krea, prompt_en, prompt_jp, width, height, nums, loras=None):
    print("生成中...")
    t0 = time.time()
    names = make_image_names(nums)
    call_state["cancelled"] = False
    monitor = ProgressMonitor().start()
    try:
        # 生成には英語、保存には日本語を使う。
        # remote() は途中で中断できないため、spawn() で FunctionCall を受け取り、
        # 停止ボタンから cancel できるようにする（get() で完了まで待つ点は remote() と同じ）
        fc = krea.generate.spawn(
            prompt_en, w=width, h=height, n=nums, mega=UPLOAD_TO_MEGA, names=names,
            loras=loras, progress_id=monitor.id,
        )
        with call_lock:
            call_state["fc"] = fc
        result = fc.get()
        call_id = result.get("upload_call_id") if isinstance(result, dict) else None
        if call_id:
            track_upload(call_id)
    except Exception as e:
        monitor.stop()
        if call_state["cancelled"]:
            print("\033[43m  停止ボタンにより生成を中断しました  \033[0m")
        else:
            print(f"生成に失敗しました: {type(e).__name__}: {e}")
        return False
    finally:
        monitor.stop()
        with call_lock:
            call_state["fc"] = None

    print(f"\033[42m  完了({time.time() - t0:.0f}秒) {width}*{height}, {nums}枚  \033[0m")
    try:
        save_prompt_files(names, prompt_jp, loras=loras)
    except OSError as e:
        print(f"プロンプトの保存に失敗しました: {type(e).__name__}: {e}")
    return True

def _wait_call(fc):
    """FunctionCall を停止ボタンから cancel できるように登録して、完了まで待つ。"""
    with call_lock:
        call_state["fc"] = fc
    try:
        return fc.get()
    finally:
        with call_lock:
            call_state["fc"] = None

def generate_with_image(krea, prompt_en, prompt_jp, width, height, nums, image_path,
                        ref_boost=DEFAULT_REF_BOOST, grounding_px=DEFAULT_GROUNDING_PX, loras=None):
    """参照画像を元に、英文プロンプトを編集指示として生成する。generate_edit は1回1枚なので、nums 回くり返す。"""
    print(f"画像編集で生成中...(参照画像: {image_path}, REF_BOOST={ref_boost}, GROUNDING_PX={grounding_px}"
          + (f", LoRA {len(loras)}件)" if loras else ")"))
    t0 = time.time()
    try:
        image_bytes = Path(image_path).read_bytes()
    except OSError as e:
        print(f"参照画像を読み込めませんでした: {type(e).__name__}: {e}")
        return False

    names = make_image_names(nums)
    done = []
    ok = True
    call_state["cancelled"] = False
    try:
        for i, name in enumerate(names):
            if stop_requested.is_set() and done:
                # 停止ボタン: 生成中だった1枚は完了済み。残りは作らずにここで終える
                print("[edit] 停止要求を受け付けているため、残りの枚数はスキップします")
                break
            print(f"[edit] {i + 1}/{nums}枚目")
            monitor = ProgressMonitor(label=f"[edit {i + 1}/{nums}]", part=i, parts=nums).start()
            try:
                edit_kwargs = dict(
                    w=width, h=height,
                    ref_boost=ref_boost, grounding_px=grounding_px,
                    mega=UPLOAD_TO_MEGA, return_png=False, name=name,
                    progress_id=monitor.id,
                )
                if loras:
                    edit_kwargs["loras"] = loras  # LoRA指定がある時だけ渡す
                fc = krea.generate_edit.spawn(prompt_en, image_bytes, **edit_kwargs)
                result = _wait_call(fc)
            finally:
                monitor.stop()
            call_id = result.get("upload_call_id") if isinstance(result, dict) else None
            if call_id:
                track_upload(call_id)
            done.append(name)
    except Exception as e:
        ok = False
        if call_state["cancelled"]:
            print("\033[43m  停止ボタンにより生成を中断しました  \033[0m")
        else:
            print(f"画像編集での生成に失敗しました: {type(e).__name__}: {e}")

    # 生成できた分だけ、日本語プロンプトを保存する
    if done:
        try:
            save_prompt_files(done, prompt_jp, image_path, ref_boost, grounding_px, loras)
        except OSError as e:
            print(f"プロンプトの保存に失敗しました: {type(e).__name__}: {e}")
    if ok:
        print(f"\033[42m  完了({time.time() - t0:.0f}秒) {width}*{height}, {len(done)}枚（参照画像あり）  \033[0m")
    return ok

def generate_edit_run(krea, instruction_en, instruction_jp, width, height, ref_boost, grounding_px, image_path):
    print(f"編集生成中...(元画像: {image_path})")
    t0 = time.time()
    try:
        image_bytes = Path(image_path).read_bytes()
    except OSError as e:
        print(f"テスト画像を読み込めませんでした: {type(e).__name__}: {e}")
        return False

    names = make_image_names(1)
    call_state["cancelled"] = False
    monitor = ProgressMonitor(label="[edit]").start()
    try:
        # generate() と同様、spawn() で FunctionCall を受け取り、停止ボタンから cancel できるようにする
        fc = krea.generate_edit.spawn(
            instruction_en, image_bytes, w=width, h=height,
            ref_boost=ref_boost, grounding_px=grounding_px,
            mega=UPLOAD_TO_MEGA, name=names[0], progress_id=monitor.id,
        )
        with call_lock:
            call_state["fc"] = fc
        result = fc.get()
        call_id = result.get("upload_call_id") if isinstance(result, dict) else None
        if call_id:
            track_upload(call_id)
    except Exception as e:
        monitor.stop()
        if call_state["cancelled"]:
            print("\033[43m  停止ボタンにより生成を中断しました  \033[0m")
        else:
            print(f"編集生成に失敗しました: {type(e).__name__}: {e}")
        return False
    finally:
        monitor.stop()
        with call_lock:
            call_state["fc"] = None

    print(f"\033[42m  完了({time.time() - t0:.0f}秒) {width}*{height}  \033[0m")
    try:
        save_prompt_files(names, instruction_jp, image_path, ref_boost, grounding_px)
    except OSError as e:
        print(f"プロンプトの保存に失敗しました: {type(e).__name__}: {e}")
    return True

class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message

def _get_float(data: dict, key: str, default: float, lo: float, hi: float) -> float:
    value = data.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ApiError(400, f"{key} は数値で指定してください")
    try:
        value = float(value)
    except ValueError:
        raise ApiError(400, f"{key} は数値で指定してください")
    if not lo <= value <= hi:
        raise ApiError(400, f"{key} は {lo}〜{hi} の範囲で指定してください")
    return value

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

# グループのマーカー行（<group ...> / </group>）。英文には含めないので、念のためここで取り除く
GROUP_MARKER_LINE = re.compile(r"^\s*</?group\b.*>\s*$")

def strip_group_markers(text: str) -> str:
    lines = [ln for ln in text.split("\n") if not GROUP_MARKER_LINE.match(ln)]
    return "\n".join(lines).strip()

def _get_prompt(data: dict, key: str, collapse: bool = True) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ApiError(400, f"{key} は空でない文字列で指定してください")
    # 改行コードは \n に統一（\r\n のままだとクリップボード経由で改行が二重になることがある）
    text = value.strip().replace("\r\n", "\n").replace("\r", "\n")
    return restore_line_breaks(text) if (collapse and COLLAPSE_PARAGRAPH_BREAKS) else text

def _get_gpu(data: dict):
    value = data.get("GPU")
    if value is None or value == "":
        return None
    if not isinstance(value, str) or value not in GPU_CHOICES:
        raise ApiError(400, f"GPU は {', '.join(GPU_CHOICES)} のいずれかで指定してください")
    return value

def _check_image_file(value):
    """画像ファイルとして使えるか確かめて、Path を返す。ダメなら ApiError。"""
    p = Path(str(value).strip().strip('"')).expanduser()
    if not p.is_file():
        raise ApiError(400, f"画像が見つかりません: {p}")
    if p.suffix.lower() not in IMAGE_EXTS:
        raise ApiError(400, f"画像ファイル({' '.join(sorted(IMAGE_EXTS))})を選んでください: {p.name}")
    size = p.stat().st_size
    if size > MAX_IMAGE_BYTES:
        raise ApiError(400, f"画像が大きすぎます({size / 1e6:.1f}MB / 上限{MAX_IMAGE_BYTES // (1 << 20)}MB): {p.name}")
    return p

MAX_LORAS = 10

def _get_loras(data: dict):
    """拡張機能から送られたLoRA指定。civitaiのversionIDで指定する。
    形式: [{"version_id": "3409322", "file_id": 省略可, "strength": 1.0}, ...]
    （versionID.safetensors が無ければ、生成時にModal側でその場でダウンロードする）"""
    value = data.get("loras")
    if value is None or value == "":
        return None
    if not isinstance(value, list):
        raise ApiError(400, "loras はリストで指定してください")
    if len(value) > MAX_LORAS:
        raise ApiError(400, f"loras は最大{MAX_LORAS}件までです")

    result = []
    for i, item in enumerate(value):
        if not isinstance(item, dict):
            raise ApiError(400, f"loras[{i}] はオブジェクトで指定してください")

        version_id = item.get("version_id")
        if isinstance(version_id, bool) or not isinstance(version_id, (int, str)) or str(version_id).strip() == "":
            raise ApiError(400, f"loras[{i}].version_id は空でない数値/文字列で指定してください")
        version_id = str(version_id).strip()
        if not version_id.isdigit():
            raise ApiError(400, f"loras[{i}].version_id は civitai のversionID(数字)で指定してください: {version_id}")

        file_id = item.get("file_id")
        if file_id is not None and file_id != "":
            if isinstance(file_id, bool) or not isinstance(file_id, (int, str)):
                raise ApiError(400, f"loras[{i}].file_id は数値/文字列で指定してください")
            file_id = str(file_id).strip()
        else:
            file_id = None

        strength = _get_float(item, "strength", 1.0, -10.0, 10.0)

        name = item.get("name")
        name = name.strip()[:60] if isinstance(name, str) and name.strip() else None   # 表示用(任意)

        result.append({"version_id": version_id, "file_id": file_id, "strength": strength, "name": name})

    return result or None

def _get_edit_params(data: dict):
    """REF_BOOST / GROUNDING_PX(小文字の ref_boost / grounding_px でも可)を読む。無ければ既定値。"""
    d = {}
    for dst in ("ref_boost", "grounding_px"):
        for key in (dst.upper(), dst):
            if data.get(key) not in (None, ""):
                d[dst] = data[key]
                break
    ref_boost = _get_float(d, "ref_boost", DEFAULT_REF_BOOST, 0.1, 20.0)
    grounding_px = _get_int(d, "grounding_px", DEFAULT_GROUNDING_PX, 128, 2048)
    return ref_boost, grounding_px

def _get_image_path(data: dict):
    """拡張機能から送られた参照画像のパス。無ければ None。"""
    value = data.get("image_path")
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ApiError(400, "image_path は文字列で指定してください")
    return str(_check_image_file(value))

def _set_pending(prompt_jp, prompt_en, width, height, nums, gpu, once, image_path=None, loras=None,
                 ref_boost=DEFAULT_REF_BOOST, grounding_px=DEFAULT_GROUNDING_PX):
    with pending_lock:
        pending_request["data"] = (prompt_jp, prompt_en, width, height, nums, gpu, once, image_path, loras,
                                   ref_boost, grounding_px)

def _pop_pending():
    with pending_lock:
        data = pending_request["data"]
        pending_request["data"] = None
    return data

def _graceful_stop():
    """停止ボタンが押されていれば、(生成はすでに終わっているので)MEGAアップロードの完了を待って
    コンテナを停止する。処理したら True を返す。generate_lock を持ったスレッドから呼ぶこと。
    停止が終わるまで stop_requested は立てたままにし、その間の新規リクエストは 503 で断る。"""
    if not stop_requested.is_set():
        return False
    _pop_pending()          # 停止後に勝手に次の生成が始まらないように、予約は破棄する
    progress_set("idle")
    print("[停止] 生成が完了しました。アップロードの完了を待ってコンテナを停止します。")
    try:
        stop_containers()   # 先に wait_uploads() でアップロード完了を待つ
    finally:
        stop_requested.clear()
    return True

def _run_generate(prompt_jp, prompt_en, width, height, nums, gpu, once, image_path=None, loras=None,
                  ref_boost=DEFAULT_REF_BOOST, grounding_px=DEFAULT_GROUNDING_PX):
    try:
        current = (prompt_jp, prompt_en, width, height, nums, gpu, once, image_path, loras, ref_boost, grounding_px)
        while current is not None and not stop_event.is_set():
            c_jp, c_en, c_width, c_height, c_nums, c_gpu, c_once, c_image, c_loras, c_boost, c_ground = current
            # 1枚だけ生成 / -e 指定時は1回で止まるので「一枚」、それ以外は連続生成の「ループ」
            progress_set("single" if (c_once or STOP_AFTER_EACH) else "loop", 0.0, True)
            try:
                ensure_gpu(c_gpu)  # GPUが違えばコンテナを停止して切り替える
                if c_image:
                    ok = generate_with_image(krea, c_en, c_jp, c_width, c_height, c_nums, c_image,
                                         c_boost, c_ground, c_loras)
                else:
                    ok = generate(krea, c_en, c_jp, c_width, c_height, c_nums, c_loras)
            except Exception as e:
                print(f"GPUの切り替えに失敗しました: {type(e).__name__}: {e}")
                ok = False

            if stop_event.is_set():
                break

            # 停止ボタン: いまの生成(とアップロード)が終わったので、ここで止める
            if _graceful_stop():
                break

            # 生成中に次のリクエストが来ていた場合は、コンテナを停止せずにそのまま切り替える。
            #   once=True  [1枚だけ生成] → 1回生成して、リクエストが無ければ止まる
            #   once=False [生成]        → 受け取ったプロンプトで連続生成(ループ)に入る
            pending = _pop_pending()
            if pending is not None:
                current = pending
                continue

            if ok and not c_once and not STOP_AFTER_EACH:
                continue  # 前回と同じ内容で連続生成する

            # ここに来るのは、次のリクエストが無く、連続生成も続けない場合
            progress_set("idle")
            if not ok:
                print("生成に失敗または中断されたため、連続生成を止めます。次のリクエストを待ちます。")
            if STOP_AFTER_EACH:
                # -e 指定時は、生成が終わるたびにコンテナを停止する（成功・失敗どちらでも）。
                # 次のリクエストが来たとき、Modal が自動でコンテナを起動し直す。
                print("[-e] 生成が完了したためコンテナを停止します。")
                stop_containers()
            elif ok and c_once:
                print("[1枚だけ生成] 完了。次のリクエストが無いためコンテナを停止します。")
                stop_containers()

            if stop_event.is_set() or _graceful_stop():
                break
            # コンテナ停止を待っている間に届いたリクエストがあれば、続けて実行する
            # (コンテナは Modal が自動で起動し直す)
            current = _pop_pending()

        # ループを抜ける直前に押された停止ボタンも取りこぼさない
        if not stop_event.is_set():
            _graceful_stop()
    finally:
        stop_requested.clear()
        progress_set("idle")
        generate_lock.release()

def _run_generate_edit(instruction_jp, instruction_en, width, height, ref_boost, grounding_px, gpu, image_path):
    """generate_edit 用。_run_generate と違い連続生成はせず、1回実行したら終わる(-e 指定時はコンテナも停止)。"""
    try:
        progress_set("single", 0.0, True)
        try:
            ensure_gpu(gpu)
            generate_edit_run(krea, instruction_en, instruction_jp, width, height, ref_boost, grounding_px, image_path)
        except Exception as e:
            print(f"GPUの切り替えに失敗しました: {type(e).__name__}: {e}")
        progress_set("idle")

        if not stop_event.is_set() and not _graceful_stop() and STOP_AFTER_EACH:
            print("[-e] 生成が完了したためコンテナを停止します。")
            stop_containers()
    finally:
        stop_requested.clear()
        progress_set("idle")
        generate_lock.release()

def handle_generate_edit(data: dict) -> dict:
    """テスト画像(既定: TEST_IMAGE_PATH、呼び出しごとに読み直す)を元に、指示文で編集生成する。"""
    if not isinstance(data, dict):
        raise ApiError(400, "JSON オブジェクトを送ってください")

    jp_exact = data.get("jp_exact") is True
    prompt_jp = _get_prompt(data, "prompt_jp", collapse=not jp_exact)
    prompt_en = strip_group_markers(_get_prompt(data, "prompt_en"))
    if not prompt_en:
        raise ApiError(400, "prompt_en は空でない文字列で指定してください")

    width = _get_int(data, "width", DEFAULT_WIDTH, MIN_SIZE, MAX_SIZE)
    height = _get_int(data, "height", DEFAULT_HEIGHT, MIN_SIZE, MAX_SIZE)
    ref_boost, grounding_px = _get_edit_params(data)
    gpu = _get_gpu(data)
    gpu_text = f"(GPU: {gpu})" if gpu else ""

    # 既定のテスト画像を使う。image_path が指定されればそちらを優先する
    image_path = data.get("image_path") or str(TEST_IMAGE_PATH)
    if not Path(image_path).is_file():
        raise ApiError(400, f"テスト画像が見つかりません: {image_path}")

    if stop_event.is_set() or stop_requested.is_set():
        raise ApiError(503, "停止処理中のため、リクエストを受け付けられません")

    # generate() 側のような「待機中リクエストで上書き」はせず、生成中は素直に busy を返す
    if not generate_lock.acquire(blocking=False):
        raise ApiError(409, "現在生成中のため、完了を待ってからもう一度お試しください")

    threading.Thread(
        target=_run_generate_edit,
        args=(prompt_jp, prompt_en, width, height, ref_boost, grounding_px, gpu, image_path),
        daemon=True,
    ).start()
    return {"result": f"テスト画像からの編集生成を開始しました{gpu_text}", "queued": False}

def handle_generate(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ApiError(400, "JSON オブジェクトを送ってください")

    # jp_exact: 拡張機能が行の区切りを正確に組み立てて送ってきた（グループのマーカーつき）。改行の補正はしない
    jp_exact = data.get("jp_exact") is True
    prompt_jp = _get_prompt(data, "prompt_jp", collapse=not jp_exact)
    # 生成に使う英文は、グループ情報を含まない純粋な英文だけにする
    prompt_en = strip_group_markers(_get_prompt(data, "prompt_en"))
    if not prompt_en:
        raise ApiError(400, "prompt_en は空でない文字列で指定してください")

    width = _get_int(data, "width", DEFAULT_WIDTH, MIN_SIZE, MAX_SIZE)
    height = _get_int(data, "height", DEFAULT_HEIGHT, MIN_SIZE, MAX_SIZE)
    nums = _get_int(data, "nums", DEFAULT_NUMS, 1, MAX_NUMS)
    gpu = _get_gpu(data)
    once = data.get("once") is True  # 「1枚だけ生成」: 1回生成したら連続生成せずに止まる
    image_path = _get_image_path(data)  # 参照画像(拡張機能の「画像」ボタン)。あれば画像編集で生成する
    loras = _get_loras(data)  # LoRA指定(civitaiのversionID)。無ければ None
    ref_boost, grounding_px = _get_edit_params(data)  # 参照画像あり時の REF_BOOST / GROUNDING_PX
    gpu_text = f"（GPU: {gpu}）" if gpu else ""
    image_text = f"（参照画像: {Path(image_path).name}）" if image_path else ""
    loras_text = f"（LoRA: {len(loras)}件）" if loras else ""

    if stop_event.is_set() or stop_requested.is_set():
        raise ApiError(503, "停止処理中のため、リクエストを受け付けられません")

    if not generate_lock.acquire(blocking=False):
        _set_pending(prompt_jp, prompt_en, width, height, nums, gpu, once, image_path, loras,
                     ref_boost, grounding_px)
        mode_text = "もう1回(1枚だけ生成)" if once else "連続生成(ループ)"
        return {
            "result": f"現在生成中のため、{width}x{height} を {nums}枚{gpu_text}{image_text}{loras_text} のリクエストを保存しました。"
                       f"今の生成が終わり次第、コンテナを停止せずにこの内容で{mode_text}に切り替わります",
            "queued": True,
        }

    threading.Thread(
        target=_run_generate,
        args=(prompt_jp, prompt_en, width, height, nums, gpu, once, image_path, loras, ref_boost, grounding_px),
        daemon=True,
    ).start()
    return {"result": f"{width}x{height} を {nums}枚{gpu_text}{image_text}{loras_text} 生成を開始しました", "queued": False}

def _stop_containers_in_background():
    # コンテナ停止の完了待ち(最大 CONTAINER_STOP_TIMEOUT 秒)でHTTP応答を塞がないよう、別スレッドで実行する
    if not stop_request_lock.acquire(blocking=False):
        return  # すでに停止処理中
    try:
        stop_containers()
    finally:
        stop_request_lock.release()

def _stop_now():
    """何も動いていないときの停止。コンテナを(アップロード完了を待ってから)停止する。"""
    _pop_pending()
    progress_set("idle")
    threading.Thread(target=_stop_containers_in_background, daemon=True).start()
    return {"result": "停止を要求しました。コンテナを停止します", "stopped": True}

def handle_stop(data: dict) -> dict:
    if stop_event.is_set():
        raise ApiError(503, "停止処理中のため、リクエストを受け付けられません")

    # ロックが取れる = 生成中ではない。すぐにコンテナを停止する
    if generate_lock.acquire(blocking=False):
        generate_lock.release()
        return _stop_now()

    if stop_requested.is_set():
        return {"result": "すでに停止を要求済みです。生成とアップロードの完了後に停止します", "stopped": True}

    # 生成中: 生成は中断しない。いまの生成を最後まで行い、アップロードが完了したら停止する。
    # 予約済みのリクエストは破棄する（停止後に勝手に次の生成が始まらないように）
    _pop_pending()
    stop_requested.set()

    # フラグを立てている間に生成が終わっていた場合(誰も拾わない)は、そのまま停止する
    if generate_lock.acquire(blocking=False):
        generate_lock.release()
        stop_requested.clear()
        return _stop_now()

    return {
        "result": "停止を要求しました。現在の生成とアップロードが完了したらコンテナを停止します",
        "stopped": True,
    }

def _warmup_container(gpu):
    """generate_lock を持った状態で呼ばれる。終わったらロックを解放するか、
    待機中のリクエストがあればそのまま生成に引き継ぐ(_run_generate がロックを解放する)。"""
    try:
        ensure_gpu(gpu)
        krea.ping.spawn()  # 空メソッドを投げて、コンテナだけ先に起動させる
        print(f"[warmup] コンテナを先に起動しています（GPU: {_gpu_label(gpu)}）")
    except Exception as e:
        print(f"[warmup] 失敗しました: {type(e).__name__}: {e}")
    if not stop_event.is_set() and _graceful_stop():
        generate_lock.release()
        return
    pending = _pop_pending()
    if pending is not None and not stop_event.is_set():
        _run_generate(*pending)
    else:
        generate_lock.release()

def handle_warmup(data: dict) -> dict:
    """プロンプトを入力している間にコンテナを起動しておく(GPU 選択時などに拡張機能から呼ぶ)。"""
    if not isinstance(data, dict):
        raise ApiError(400, "JSON オブジェクトを送ってください")
    gpu = _get_gpu(data)
    if stop_event.is_set():
        raise ApiError(503, "停止処理中のため、リクエストを受け付けられません")
    if not generate_lock.acquire(blocking=False):
        return {"result": "生成中のため、事前起動は行いません", "warmed": False}
    threading.Thread(target=_warmup_container, args=(gpu,), daemon=True).start()
    return {"result": "コンテナの事前起動を要求しました", "warmed": True}

# ===== 参照画像の選択 =====
# ブラウザの拡張機能はローカルファイルの「本当のパス」を取得できないので、このサーバー(=ローカルPC上)で
# OSのファイル選択ダイアログを開き、選ばれたパスを拡張機能に返す。
# tkinter のダイアログは別プロセスで開く（スレッドから直接開くと、環境によって固まったり落ちたりするため）。
IMAGE_PICKER_CODE = r'''
import sys
import tkinter as tk
from tkinter import filedialog

root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)  # ブラウザの後ろに隠れないようにする
root.update()
path = filedialog.askopenfilename(
    parent=root,
    title="参照する画像を選択",
    filetypes=[("画像", "*.png *.jpg *.jpeg *.webp *.bmp"), ("すべてのファイル", "*.*")],
)
root.destroy()
sys.stdout.buffer.write(path.encode("utf-8"))
'''

def _run_image_picker(token):
    path, error = "", ""
    kwargs = {}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW  # コンソールの黒い窓を出さない
    try:
        proc = subprocess.run(
            [sys.executable, "-c", IMAGE_PICKER_CODE],
            capture_output=True, timeout=600,
            env={**os.environ, "PYTHONUTF8": "1"}, **kwargs,
        )
        if proc.returncode == 0:
            path = proc.stdout.decode("utf-8", errors="replace").strip()
            if path:
                try:
                    path = str(_check_image_file(path))  # 選んだ時点で、画像として使えるか確かめる
                except ApiError as e:
                    path, error = "", e.message
        else:
            tail = proc.stderr.decode("utf-8", errors="replace").strip().splitlines()[-1:]
            error = "ファイル選択ダイアログを開けませんでした（tkinter が使えない可能性があります）" + (f": {tail[0]}" if tail else "")
    except subprocess.TimeoutExpired:
        error = "ファイル選択がタイムアウトしました"
    except Exception as e:
        error = f"{type(e).__name__}: {e}"
    with pick_lock:
        if pick_state["token"] == token:
            pick_state.update(done=True, path=path, error=error)

def handle_pick_image(data: dict) -> dict:
    """ファイル選択ダイアログを開く(すぐ戻る)。結果は /api/pick_image_result で token を渡して受け取る。"""
    with pick_lock:
        if pick_state["token"] is not None and not pick_state["done"]:
            return {"token": pick_state["token"], "running": True}  # すでに開いている
        token = uuid.uuid4().hex
        pick_state.update(token=token, done=False, path="", error="")
    threading.Thread(target=_run_image_picker, args=(token,), daemon=True).start()
    return {"token": token, "running": False}

def handle_pick_image_result(data: dict) -> dict:
    token = data.get("token") if isinstance(data, dict) else None
    with pick_lock:
        if token is None or token != pick_state["token"]:
            raise ApiError(404, "ファイル選択の情報が見つかりません")
        if not pick_state["done"]:
            return {"done": False}
        return {"done": True, "path": pick_state["path"], "error": pick_state["error"]}

ROUTES = {
    "/api/pick_image": handle_pick_image,
    "/api/pick_image_result": handle_pick_image_result,
    "/api/warmup": handle_warmup,
    "/api/generate": handle_generate,
    "/api/generate_edit": handle_generate_edit,
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
        elif self.path == "/api/progress":
            self._send_json(200, progress_get())
        elif self.path == "/api/log":
            completed, cur, version = term_log.snapshot()
            self._send_json(200, {
                "lines": [ansi_to_segments(line) for line in completed],
                "cur": ansi_to_segments(cur) if cur else [],
                "version": version,
            })
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        func = ROUTES.get(self.path)
        if func is None:
            self._send_json(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) or b"{}"
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                print(f"\r\033[K\033[31m[request] {self.path} JSONとして読めないリクエスト: "
                      f"{raw[:500]!r}\033[0m")
                raise ApiError(400, "JSON として読み取れませんでした")

            self._send_json(200, func(data))
        except ApiError as e:
            self._send_json(e.status, {"error": e.message})
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def log_message(self, format, *args):
        pass

class GenServer(ThreadingHTTPServer):
    # 二重起動の検出用: 使用中のポートには bind できないようにする。
    # (HTTPServer 既定の allow_reuse_address=True だと、Windows では
    #  使用中のポートにも bind できてしまい、複数のプロセスが同時に起動する)
    allow_reuse_address = False

    def server_bind(self):
        if os.name == "nt":
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

def main():
    global krea, STOP_AFTER_EACH

    parser = argparse.ArgumentParser(description="Krea 画像生成サーバー + 画像ビューア")
    parser.add_argument("-d", "--deploy", action="store_true",
                        help="起動時に modal deploy を実行する")
    parser.add_argument("-e", "--end-each", action="store_true",
                        help="1回生成するごとにコンテナを停止し、次のPOSTが来るまで待機する")
    args = parser.parse_args()

    # 何よりも先にポートを確保する。すでに起動中なら bind に失敗するので、何も表示せずに終了する。
    # (デプロイ・ビューア起動・コンテナ停止はいずれも実行されない)
    try:
        server = GenServer((HOST, GEN_PORT), Handler)
    except OSError:
        sys.exit(0)

    STOP_AFTER_EACH = args.end_each

    if args.deploy:
        deploy()

    krea = _make_krea(None)  # GPUは最初のリクエストで ensure_gpu() が決める

    launch_viewer()

    print(f"[gen] Listening on http://{HOST}:{GEN_PORT}  (Ctrl+C で停止)")
    print(f"[edit] テスト画像の置き場所: {TEST_IMAGE_PATH}")
    if STOP_AFTER_EACH:
        print("[-e] 有効: 生成ごとにコンテナを停止します。")
    print("\033[42m  準備完了  \033[0m")
    print("Modal Dashboard      -> \033[36mhttps://modal.com/apps/haru028/main\033[0m")
    print("Modal Billing usage  -> \033[36mhttps://modal.com/settings/usage\033[0m")
    print("Ctrl+リンクをクリックでページにJump!")
    print("Ctrl+Cでプログラムを停止")
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
    print("Good bye!!")

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