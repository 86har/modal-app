import modal

#   GPU種別              $/秒        $/時間(目安)  $30クレジットでの稼働時間目安
#   ------------------- ---------- ----------- --------------------------
#   Nvidia B300          0.001972   $7.10     4.2 時間
#   Nvidia B200          0.001736   $6.25     4.8 時間
#   Nvidia H200 SXM      0.001261   $4.54     6.6 時間
#   Nvidia H100 SXM5     0.001097   $3.95     7.6 時間
#   Nvidia RTX PRO 6000  0.000842   $3.03     9.9 時間
#   Nvidia A100 (80GB)   0.000694   $2.50     12.0 時間
#   Nvidia A100 (40GB)   0.000583   $2.10     14.3 時間
#   Nvidia L40S          0.000542   $1.95     15.4 時間
#   Nvidia A10           0.000306   $1.10     27.3 時間
#   Nvidia L4            0.000222   $0.80     37.5 時間
#   Nvidia T4            0.000164   $0.59     50.8 時間

APP_NAME = "krea2"
GPU = "A10"  
IDLE_SECONDS = 600
MODELS = "/models"
COMFY = "/root/ComfyUI"
STAGE_DIR = f"{MODELS}/upload_stage"
MODEL_DIRS = ["diffusion_models", "text_encoders", "vae", "loras"]
MAX_BATCH = 4
UPLOAD_IDLE_SECONDS = 900   # 生成が止まってもMEGAのログイン状態を保持する時間(CPUのみなので安価)
UPLOAD_CONCURRENCY = 4      # 同時に走らせる mega-put の数(不安定なら 1 にする)

CKPT_NAME = "lustify-v10-krea-turbo-fp8.safetensors"
CKPT_VERSION_ID = "3112728"
TE_NAME = "qwen3vl_4b_fp8_scaled.safetensors"
VAE_NAME = "qwen_image_vae.safetensors"
HF_REPOS = ["Comfy-Org/Krea-2", "Comfy-Org/Krea2"]
MEGA_DEST = "/outputs/Echs/"

app = modal.App(APP_NAME)
vol = modal.Volume.from_name("krea2-models", create_if_missing=True)
secret = modal.Secret.from_name("krea2-tokens")

# MEGAcmd までを共通ベースにする(レイヤーは従来と同じ内容なのでキャッシュも効く)
_base = (
    modal.Image.from_registry("ubuntu:22.04", add_python="3.11")
    .apt_install("git", "wget", "ca-certificates", "libgl1", "libglib2.0-0")
    .run_commands(
        "wget -q https://mega.nz/linux/repo/xUbuntu_22.04/amd64/megacmd-xUbuntu_22.04_amd64.deb -O /tmp/megacmd.deb",
        "apt-get update -qq && apt-get install -y -qq /tmp/megacmd.deb && rm -f /tmp/megacmd.deb",
    )
)

# アップロード専用: torch / ComfyUI を含まないので、コンテナの起動が速い
uploader_image = _base

image = (
    _base
    .pip_install("torch", "torchvision", "torchaudio")
    .run_commands(
        f"git clone -q --depth 1 https://github.com/comfyanonymous/ComfyUI {COMFY}",
        f"pip install -q -r {COMFY}/requirements.txt",
    )
    .pip_install("huggingface_hub", "requests")
    .env({"HF_HOME": "/tmp/hf_cache", "PIP_NO_CACHE_DIR": "1"})
)

def _scrub(msg, *secrets):
    for s in secrets:
        if s:
            msg = msg.replace(s, "***")
    return msg

def download_file(url, dest, token=None, label="DOWNLOAD", force=False):
    import os
    import re
    import requests

    if os.path.exists(dest) and not force:
        print(f"既にあります。ダウンロード不要: {dest}")
        return dest

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    if os.path.exists(tmp):
        os.remove(tmp)

    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        with requests.get(url, headers=headers, stream=True,
                          allow_redirects=True, timeout=60) as r:
            r.raise_for_status()
            cd = r.headers.get("content-disposition", "")
            m = re.search(r'filename="?([^";]+)"?', cd)
            print("配信側のファイル名:", m.group(1) if m else "(不明)")
            total = int(r.headers.get("content-length", 0))

            downloaded = 0
            last = 0
            with open(tmp, "wb") as f:
                for chunk in r.iter_content(chunk_size=1 << 20):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total and downloaded - last >= 200 * (1 << 20):
                        last = downloaded
                        print(f"[{label}] {downloaded/1e9:.2f} / {total/1e9:.2f} GB", flush=True)

        if total and downloaded != total:
            raise RuntimeError(f"サイズ不一致(途中で切れた可能性): {downloaded} / {total} bytes")
        os.replace(tmp, dest)
        print("保存先:", dest)
    except Exception as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise RuntimeError(f"{label} 失敗: {type(e).__name__}: {_scrub(str(e), token)}") from None
    return dest

@app.cls(
    image=uploader_image,
    volumes={MODELS: vol},
    secrets=[secret],
    timeout=1800,
    max_containers=1,                    # mega-cmd のセッションは1コンテナで使い回す
    scaledown_window=UPLOAD_IDLE_SECONDS,
)
@modal.concurrent(max_inputs=UPLOAD_CONCURRENCY)
class MegaUploader:
    """GPUなし(CPUのみ)のコンテナで、MEGAへのログイン状態を保ったままアップロードする。

    旧 upload_to_mega は呼び出しのたびに login → put → logout をしていたため、
    ログイン(アカウントのノード一覧取得を含む)の待ち時間が毎回かかり、
    max_containers=1 で直列に処理されるので生成より遅くなっていた。
    ここではログインを起動時の1回だけにし、複数の mega-put を同時に走らせる。

    失敗した場合、その回の画像は STAGE_DIR(Volume) に退避され、
    次回以降の成功時にまとめて再送される。
    """

    @modal.enter()
    def start(self):
        import os
        import threading

        self.email = os.environ.get("MEGA_EMAIL")
        self.password = os.environ.get("MEGA_PASS")
        self.login_lock = threading.Lock()
        self.stash_lock = threading.Lock()
        self._ensure_login()
        print("MEGAにログインしました(セッションを保持します)")

    @modal.exit()
    def stop(self):
        import subprocess

        subprocess.run(["mega-logout"], check=False, capture_output=True)

    def _mega(self, *args):
        import subprocess

        try:
            subprocess.run(list(args), check=True, capture_output=True)
        except subprocess.CalledProcessError as e:
            # コマンドラインにメール/パスワードが入る場合があるので、str(e) は使わない
            detail = ((e.stderr or b"") + (e.stdout or b"")).decode(errors="ignore")[-300:]
            raise RuntimeError(_scrub(detail, self.email, self.password)) from None

    def _ensure_login(self):
        import subprocess

        with self.login_lock:
            if subprocess.run(["mega-whoami"], capture_output=True).returncode != 0:
                self._mega("mega-login", self.email, self.password)

    def _put(self, paths):
        try:
            self._mega("mega-put", "-c", *paths, MEGA_DEST)
        except RuntimeError:
            # セッション切れの可能性。ログイン状態を確認し、必要なら入り直して1回だけ再試行
            self._ensure_login()
            self._mega("mega-put", "-c", *paths, MEGA_DEST)

    def _stash(self, paths):
        import os
        import shutil

        os.makedirs(STAGE_DIR, exist_ok=True)
        for p in paths:
            dst = f"{STAGE_DIR}/{os.path.basename(p)}"
            shutil.copy2(p, dst + ".part")
            os.replace(dst + ".part", dst)   # 書きかけを再送しないよう、完成後に名前を確定
        vol.commit()

    def _drain_stash(self):
        """退避分があれば再送する。他のスレッドが処理中なら何もしない。"""
        import glob
        import os

        if not self.stash_lock.acquire(blocking=False):
            return
        try:
            try:
                vol.reload()   # GPU側が退避した画像も見えるようにする
            except Exception:
                return         # Volume使用中。次回に回す
            stashed = glob.glob(f"{STAGE_DIR}/*.png")
            if not stashed:
                return
            self._put(stashed)
            for p in stashed:
                if os.path.exists(p):
                    os.remove(p)
            vol.commit()
            print(f"退避分 {len(stashed)}枚を再送しました")
        except Exception as e:
            print(f"退避分の再送に失敗(次回再試行): {e}")
        finally:
            self.stash_lock.release()

    @modal.method()
    def upload(self, items):
        """items: [(ファイル名, PNGのバイト列), ...]"""
        import os
        import shutil
        import tempfile
        import time

        t0 = time.time()
        tmp_dir = tempfile.mkdtemp(prefix="mega_up_")
        try:
            paths = []
            for name, data in items:
                p = f"{tmp_dir}/{os.path.basename(name)}"
                with open(p, "wb") as f:
                    f.write(data)
                paths.append(p)

            try:
                self._put(paths)
            except Exception as e:
                self._stash(paths)
                raise RuntimeError(f"MEGAアップロード失敗(画像は{STAGE_DIR}に退避): {e}") from None
            print(f"{len(paths)}枚アップロード完了 {time.time() - t0:.1f}秒 → {MEGA_DEST}")
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

        self._drain_stash()


@app.cls(
    gpu=GPU,
    image=image,
    volumes={MODELS: vol},
    secrets=[secret],
    scaledown_window=IDLE_SECONDS,
    timeout=3600,
    max_containers=1,
)
class Krea:
    @modal.enter()
    def setup(self):
        import asyncio
        import glob
        import inspect
        import os
        import shutil
        import struct
        import sys

        self.civitai_token = os.environ.get("CIVITAI_TOKEN")
        self.mega_email = os.environ.get("MEGA_EMAIL")
        self.mega_pass = os.environ.get("MEGA_PASS")

        for d in MODEL_DIRS:
            os.makedirs(f"{MODELS}/{d}", exist_ok=True)
            link = f"{COMFY}/models/{d}"
            if os.path.islink(link):
                os.unlink(link)
            elif os.path.isdir(link):
                shutil.rmtree(link)
            os.symlink(f"{MODELS}/{d}", link)

        ckpt = f"{MODELS}/diffusion_models/{CKPT_NAME}"
        download_file(
            f"https://civitai.com/api/download/models/{CKPT_VERSION_ID}",
            ckpt, token=self.civitai_token, label="CKPT",
        )

        from huggingface_hub import HfApi, hf_hub_download
        wanted = {TE_NAME: "text_encoders", VAE_NAME: "vae"}
        for name, folder in list(wanted.items()):
            if os.path.exists(f"{MODELS}/{folder}/{name}"):
                del wanted[name]

        if wanted:
            for repo in HF_REPOS:
                try:
                    files = HfApi().list_repo_files(repo)
                except Exception as e:
                    print(repo, "→ 取得失敗:", type(e).__name__)
                    continue
                for name, folder in list(wanted.items()):
                    hit = [f for f in files if f.endswith("/" + name) or f == name]
                    if hit:
                        tmp_dir = "/tmp/hf_tmp"
                        try:
                            got = hf_hub_download(repo, hit[0], local_dir=tmp_dir)
                            shutil.move(got, f"{MODELS}/{folder}/{name}")
                        finally:
                            shutil.rmtree(tmp_dir, ignore_errors=True)
                            shutil.rmtree("/tmp/hf_cache", ignore_errors=True)
                        print("取得:", repo, hit[0])
                        del wanted[name]
                if not wanted:
                    break
        assert not wanted, f"取得できませんでした: {list(wanted)}"

        dummy = f"{MODELS}/loras/dummy_none.safetensors"
        if not os.path.exists(dummy):
            with open(dummy, "wb") as f:
                f.write(struct.pack("<Q", 2) + b"{}")

        vol.commit()

        sys.path.insert(0, COMFY)
        os.chdir(COMFY)
        sys.argv = [sys.argv[0]]

        import nodes
        r = nodes.init_extra_nodes()
        if inspect.isawaitable(r):
            asyncio.run(r)
        self.NCM = nodes.NODE_CLASS_MAPPINGS
        print("ノード読み込みOK。登録数:", len(self.NCM))

        self.PERSIST_CLASSES = {"UNETLoader", "CLIPLoader", "VAELoader"}
        self.LOADER_CACHE = {}
        self._run_graph(self._loader_graph())
        print("モデル読み込み完了")

    def _loader_graph(self):
        return {
            "1": {"class_type": "UNETLoader", "inputs": {"unet_name": CKPT_NAME, "weight_dtype": "default"}},
            "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": TE_NAME, "type": "krea2", "device": "default"}},
            "3": {"class_type": "VAELoader", "inputs": {"vae_name": VAE_NAME}},
        }

    def _run_graph(self, wf):
        import json
        import torch

        cache = {}

        def resolve(node_id):
            if node_id in cache:
                return cache[node_id]
            spec = wf[node_id]

            pkey = None
            if spec["class_type"] in self.PERSIST_CLASSES:
                pkey = (spec["class_type"], json.dumps(spec["inputs"], sort_keys=True))
                if pkey in self.LOADER_CACHE:
                    cache[node_id] = self.LOADER_CACHE[pkey]
                    return cache[node_id]

            inst = self.NCM[spec["class_type"]]()
            inputs = {}
            for key, val in spec["inputs"].items():
                if isinstance(val, list) and len(val) == 2 and val[0] in wf:
                    inputs[key] = resolve(val[0])[val[1]]
                else:
                    inputs[key] = val
            result = getattr(inst, inst.FUNCTION)(**inputs)

            if pkey:
                self.LOADER_CACHE[pkey] = result
            cache[node_id] = result
            return result

        with torch.inference_mode():
            for node_id in wf:
                resolve(node_id)
        return cache

    def _encode_pngs(self, images, names=None):
        """画像をメモリ上でPNGにエンコードし、[(ファイル名, バイト列), ...] を返す。"""
        import io
        import os
        import time
        import uuid

        import numpy as np
        from PIL import Image

        items = []
        for i, img in enumerate(images):
            arr = np.clip(255.0 * img.cpu().numpy(), 0, 255).astype(np.uint8)
            if names and i < len(names):
                name = os.path.basename(names[i])
            else:
                name = f"{time.strftime('%Y%m%d-%H%M%S')}_{uuid.uuid4().hex[:8]}.png"
            buf = io.BytesIO()
            Image.fromarray(arr).save(buf, format="PNG")
            items.append((name, buf.getvalue()))
        return items

    def _stash_to_volume(self, items):
        """アップロード処理を起動できなかったときの保険。画像を Volume に退避する。"""
        import os

        os.makedirs(STAGE_DIR, exist_ok=True)
        for name, data in items:
            with open(f"{STAGE_DIR}/{os.path.basename(name)}", "wb") as f:
                f.write(data)
        vol.commit()

    @modal.method()
    def generate(self, prompt, seed=None, steps=8, cfg=1.0, w=1024, h=1024, n=1,
                 loras=None, mega=True, return_png=False, names=None):
        import os
        import random
        import time

        seed = random.randint(0, 2**32 - 1) if seed is None or seed < 0 else seed

        wf = self._loader_graph()
        model_ref, clip_ref = ["1", 0], ["2", 0]

        if loras:
            for i, (lora_name, strength) in enumerate(loras):
                node_id = f"lora_{i}"
                wf[node_id] = {
                    "class_type": "LoraLoader",
                    "inputs": {
                        "model": model_ref, "clip": clip_ref,
                        "lora_name": lora_name,
                        "strength_model": strength, "strength_clip": strength,
                    },
                }
                model_ref, clip_ref = [node_id, 0], [node_id, 1]

        base = wf

        def run_chunk(batch, chunk_seed):
            g = dict(base)
            g.update({
                "4": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": clip_ref}},
                "5": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["4", 0]}},
                "6": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": batch}},
                "7": {"class_type": "KSampler", "inputs": {
                    "model": model_ref, "seed": chunk_seed, "steps": steps, "cfg": cfg,
                    "sampler_name": "euler", "scheduler": "simple",
                    "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0], "denoise": 1.0}},
                "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
            })
            return self._run_graph(g)["8"][0]

        import gc

        import torch
        import comfy.model_management as mm

        oom_types = (torch.cuda.OutOfMemoryError,)
        if getattr(mm, "OOM_EXCEPTION", None) is not None:
            oom_types += (mm.OOM_EXCEPTION,)

        images = []
        remaining, batch_limit, chunk_index = n, min(n, MAX_BATCH), 0
        t0 = time.time()
        while remaining > 0:
            cur = min(batch_limit, remaining)
            try:
                imgs = run_chunk(cur, (seed + chunk_index) % (2**32))
            except oom_types:
                gc.collect()
                try:
                    mm.soft_empty_cache()
                except Exception:
                    torch.cuda.empty_cache()
                if cur == 1:
                    raise
                batch_limit = max(1, cur // 2)
                print(f"OOM のためバッチを {cur} → {batch_limit} に減らして再試行します")
                continue
            images.extend(list(imgs))
            remaining -= cur
            chunk_index += 1
        print(f"seed={seed}  {n}枚(同時生成 最大{batch_limit}枚ずつ)  {time.time()-t0:.0f}秒")

        items = self._encode_pngs(images, names)

        # MEGAへのアップロードは GPU なしの別コンテナ(MegaUploader)に任せる。
        # spawn() はすぐ戻るので、GPU はアップロードを待たずに次の生成へ進める。
        upload_call_id = None
        if mega:
            try:
                upload_call_id = MegaUploader().upload.spawn(items).object_id
                print(f"{len(items)}枚をアップロード処理(CPU)に渡しました")
            except Exception as e:
                self._stash_to_volume(items)
                raise RuntimeError(
                    f"アップロード処理の起動に失敗(画像は{STAGE_DIR}に退避): {type(e).__name__}"
                ) from None

        return {
            "pngs": [data for _, data in items] if return_png else [],
            "upload_call_id": upload_call_id,
        }

    @modal.method()
    def vram_probe(self, w=1024, h=1440, steps=1, ns=None):
        import gc
        import time

        import torch
        import comfy.model_management as mm

        oom_types = (torch.cuda.OutOfMemoryError,)
        if getattr(mm, "OOM_EXCEPTION", None) is not None:
            oom_types += (mm.OOM_EXCEPTION,)

        ns = ns or [1, 2, 4, 8, 12, 16]
        gib = 1024 ** 3

        free, total = torch.cuda.mem_get_info()
        info = {
            "gpu": torch.cuda.get_device_name(0),
            "total_gb": round(total / gib, 2),
            "free_gb_after_load": round(free / gib, 2),
        }
        print(f"GPU: {info['gpu']}  合計 {info['total_gb']} GB / 空き {info['free_gb_after_load']} GB(モデル読み込み後)")

        rows = []
        for n in ns:
            wf = self._loader_graph()
            wf.update({
                "4": {"class_type": "CLIPTextEncode", "inputs": {"text": "test", "clip": ["2", 0]}},
                "5": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["4", 0]}},
                "6": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": n}},
                "7": {"class_type": "KSampler", "inputs": {
                    "model": ["1", 0], "seed": 0, "steps": steps, "cfg": 1.0,
                    "sampler_name": "euler", "scheduler": "simple",
                    "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0], "denoise": 1.0}},
                "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
            })

            torch.cuda.synchronize()
            torch.cuda.reset_peak_memory_stats()
            t0 = time.time()
            row = {"n": n}
            try:
                out = self._run_graph(wf)
                torch.cuda.synchronize()
                sec = time.time() - t0
                row.update(
                    ok=True,
                    peak_alloc_gb=round(torch.cuda.max_memory_allocated() / gib, 2),
                    peak_reserved_gb=round(torch.cuda.max_memory_reserved() / gib, 2),
                    seconds=round(sec, 1),
                    sec_per_img=round(sec / n, 2),
                )
                del out
            except oom_types:
                row.update(ok=False, note="OOM")
            finally:
                gc.collect()
                try:
                    mm.soft_empty_cache()
                except Exception:
                    torch.cuda.empty_cache()

            rows.append(row)
            print(row, flush=True)
            if not row["ok"]:
                break

        info["rows"] = rows
        return info

    @modal.method()
    def download_lora(self, lora_name, version_id, force=False):
        path = f"{MODELS}/loras/{lora_name}"
        download_file(f"https://civitai.com/api/download/models/{version_id}", path,
                      token=self.civitai_token, label="LORA", force=force)
        vol.commit()
        return path

    @modal.method()
    def delete_lora(self, lora_name):
        import os
        p = f"{MODELS}/loras/{lora_name}"
        if os.path.exists(p):
            size = os.path.getsize(p)
            os.remove(p)
            vol.commit()
            print(f"削除: {lora_name} ({size/1e9:.2f} GB)")
        else:
            print("見つかりません:", p)

    @modal.method()
    def disk_report(self, top=10):
        import os
        files = []
        for root, _, names in os.walk(MODELS):
            for n_ in names:
                p = os.path.join(root, n_)
                try:
                    files.append((os.path.getsize(p), p))
                except OSError:
                    pass
        for size, p in sorted(files, reverse=True)[:top]:
            print(f"  {size/1e9:6.2f} GB  {p}")

@app.local_entrypoint()
def main(prompt: str, seed: int = -1, steps: int = 8, w: int = 880, h: int = 1240,
         n: int = 1, mega: bool = True, save_local: bool = False):
    import time

    result = Krea().generate.remote(
        prompt, seed=seed, steps=steps, w=w, h=h, n=n,
        mega=mega, return_png=save_local,
    )
    if save_local:
        for i, png in enumerate(result["pngs"]):
            name = f"{time.strftime('%Y%m%d-%H%M%S')}_{i}.png"
            with open(name, "wb") as f:
                f.write(png)
            print("保存:", name)

    # アップロードは別コンテナで非同期に動いている。
    # ここで待たないと、modal run の終了と同時に中断されてしまう。
    call_id = result.get("upload_call_id")
    if call_id:
        print("MEGAアップロードの完了を待っています...")
        modal.FunctionCall.from_id(call_id).get()
        print("MEGAアップロード完了")