const CONFIG = {
  // true: DeepLがライトモードのとき、ページ全体を強制的にダーク表示にする
  forceDark: true,

  // true: mainSectionWrapper 以外の要素（同じ親の中の兄弟）を非表示にする
  hideSiblings: true,
  mainSectionSelector: '[data-layout-id="mainSectionWrapper"]',

  targetSelector: '[data-layout-id="editor-layout-footer"]',
  // mainSectionWrapper の中では、この見出しの「辞書」カードより後ろの要素を非表示にする。
  // DeepLの表示言語が日本語以外のときは書き換える（例: "Dictionary"）。
  // 見出しが見つからないときは targetSelector（editor-layout-footer）より後ろを隠す。
  dictionaryHeading: "辞書",

  targetSelector: '[data-layout-id="editor-layout-footer"]',
  position: "beforebegin",
  injectedId: "my-injected-element",

  // 翻訳結果（出力側）のテキストを取得するセレクタ。上から順に試して、最初に文字が取れたものを使う。
  // ※DeepL側の構造が変わったら、ここを書き換える
  translationSelectors: [
    '[data-testid="translator-target-input"]',
    "#target-dummydiv",
  ],

  // 翻訳元（入力側）エディタのセレクタ。ここにフォーカスがある状態でCtrl+Enterを押すと生成を実行する。
  // ※DeepL側の構造が変わったら、ここを書き換える
  sourceSelectors: [
    '[data-testid="translator-source-input"]',
    "#source-dummydiv",
  ],
};

const SLIDER = { min: 512, max: 2048, step: 16 };

// 「詳細設定」ポップアップの項目。サーバーには REF_BOOST / GROUNDING_PX という名前で送る
const ADV = {
  refBoost: { min: 0.1, max: 5, step: 0.1, def: 1 },
  groundingPx: { min: 128, max: 2048, step: 64, def: 1024 }, // 64の倍数ごと
};

// 「詳細設定」ポップアップの LoRA 欄。サーバーには loras: [{ version_id: "3409322", strength: 0.8 }, ...] として送る
//   max: 同時に指定できる LoRA の数 / strength: 重み（min〜max の範囲に収める。def は追加したときの初期値）
const LORA = { max: 8, strength: { min: -2, max: 2, step: 0.05, def: 1 } };

// 前回「生成」を実行したときの width / height / 生成枚数 を保存しておくキー
// （prompt は保存しない。リロード後の初期値として復元するためだけに使う）
const STORAGE_KEYS = {
  width: "lastGenWidth",
  height: "lastGenHeight",
  nums: "lastGenNums",
  aspect: "lastGenAspect",
  gpu: "lastGenGpu",
  refBoost: "lastGenRefBoost",
  groundingPx: "lastGenGroundingPx",
  loras: "lastGenLoras",
};

// 選べるGPU。value がフェッチ時に GPU という名前で送られる文字列。
// 左から: 表示名 / 1秒あたりの料金($) / 1時間あたりの料金 / $30で動かせる時間
const GPU_OPTIONS = [
  { name: "Nvidia B300",         value: "B300",         perSec: "0.001972", perHour: "$7.10", hours: "4.2 時間" },
  { name: "Nvidia B200",         value: "B200",         perSec: "0.001736", perHour: "$6.25", hours: "4.8 時間" },
  { name: "Nvidia H200 SXM",     value: "H200",         perSec: "0.001261", perHour: "$4.54", hours: "6.6 時間" },
  { name: "Nvidia H100 SXM5",    value: "H100",         perSec: "0.001097", perHour: "$3.95", hours: "7.6 時間" },
  { name: "Nvidia RTX PRO 6000", value: "RTX-PRO-6000", perSec: "0.000842", perHour: "$3.03", hours: "9.9 時間" },
  { name: "Nvidia A100 (80GB)",  value: "A100-80GB",    perSec: "0.000694", perHour: "$2.50", hours: "12.0 時間" },
  { name: "Nvidia A100 (40GB)",  value: "A100-40GB",    perSec: "0.000583", perHour: "$2.10", hours: "14.3 時間" },
  { name: "Nvidia L40S",         value: "L40S",         perSec: "0.000542", perHour: "$1.95", hours: "15.4 時間" },
  { name: "Nvidia A10",          value: "A10",          perSec: "0.000306", perHour: "$1.10", hours: "27.3 時間" },
  { name: "Nvidia L4",           value: "L4",           perSec: "0.000222", perHour: "$0.80", hours: "37.5 時間" },
  { name: "Nvidia T4",           value: "T4",           perSec: "0.000164", perHour: "$0.59", hours: "50.8 時間" },
];
const GPU_DEFAULT = "L4"; // 保存値がないときの初期選択

// アスペクト比ドロップダウン右側の図形の設定（数値で調整できる）
const ASPECT_PREVIEW = {
  size: 132, // 図形の長いほうの辺の長さ(px)。短いほうは比に合わせて決まる
  duration: 320, // 幅・高さが変わるときのアニメーションの長さ(ms)。0 で即座に変える
  easing: "cubic-bezier(0.22, 1, 0.36, 1)", // 動き方（最初は速く、終わりにぬるっと止まる）
};
// ===== グループ（選択した文字を含む行の左側に、色付きの縦線を付ける） =====
// 選べる色（8色）。パレットにも縦線にも使う。
// ※ページ全体が反転フィルターで表示されるため、彩度の高すぎる色は少し色味がずれる。淡めの色にしてある
const GROUP_COLORS = [
  { name: "赤",       value: "#f87171" },
  { name: "オレンジ", value: "#fb923c" },
  { name: "黄",       value: "#facc15" },
  { name: "緑",       value: "#4ade80" },
  { name: "ティール", value: "#2dd4bf" },
  { name: "青",       value: "#60a5fa" },
  { name: "紫",       value: "#c084fc" },
  { name: "ピンク",   value: "#f472b6" },
];
const GROUP_BAR = {
  width: 4, // 縦線の太さ(px)
  gap: 10, // 行の左端から縦線までの距離(px)
  step: 6, // 縦に重なる範囲があるとき、縦線を左へずらす幅(px)
};
const GROUP_TAG = {
  maxWidth: 120, // グループ名の突起の最大幅(px)。名前が長いときは「…」で省略する（全文はホバーで見られる）
};
const GROUP_NAME_MAX = 40; // グループ名の最大文字数
const GROUP_ITEM_MAX = 40; // アイテム名の最大文字数
const GROUP_SUGGEST_MAX = 10; // グループ追加ポップアップで、グループ名の入力中に出す候補の最大数
const GROUP_KEEP_MAX = 30; // ライブラリの1グループが、解除・削除したアイテムとして覚えておく最大数
const GROUP_TARGET_HIGHLIGHT = "my-group-target"; // ポップアップを開いている間、対象の文字を見せるためのハイライト名
const GROUP_STORAGE_KEY = "savedGroups"; // リロード後もグループを復元するために、グループを保存しておくキー
const GROUP_SNAP_HISTORY = 10; // 範囲ごとに覚えておく「行の文字」の履歴の数（Ctrl+Z で元に戻ったとき、どの行か探すために使う）
const GROUP_SNAP_TEXT_MAX = 200; // 1行ぶんとして覚える文字数の上限（照合用。保存サイズを抑えるため）
const GROUP_ORPHAN_MAX = 30; // 行が消えて「宙に浮いた」範囲を、元に戻す/再読み込みに備えて覚えておく最大数

const HTML = `
<div class="my-injected-element">
    <div class="top-section">
    <h3>画像を生成する</h3>
    <div class="meta-container">
        <div class="meta-data-container">
            <div class="dd aspect-dd">
                <select class="aspect-select" aria-label="アスペクト比" hidden>
                <option value="">自由</option>
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
                <option value="3:2">3:2</option>
                <option value="16:9">16:9</option>
                <option value="21:9">21:9</option>
                <option value="3:4">3:4</option>
                <option value="2:3">2:3</option>
                <option value="9:16">9:16</option>
                <option value="9:21">9:21</option>
                            </select>
                <button type="button" class="dd-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="アスペクト比を選択">
                    <span class="dd-trigger-label">比率</span>
                    <span class="dd-trigger-value"></span>
                    <svg class="dd-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
                </button>
                <div class="dd-menu" hidden>
                    <div class="aspect-body">
                        <div class="dd-list" role="listbox" aria-label="アスペクト比"></div>
                        <div class="aspect-preview" aria-hidden="true">
                            <div class="aspect-rect"><span class="aspect-rect-label"></span></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="meta-data-item" data-slider data-unit="px">
                <input type="range" class="slider-range"
                    min="${SLIDER.min}" max="${SLIDER.max}" step="${SLIDER.step}" value="1024">
                <div class="slider-label-row">
                    <span class="slider-label">Width</span>
                    <span class="slider-value">1024px</span>
                </div>
            </div>
            <button type="button" class="swap-button" aria-label="widthとheightを入れ替える">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 8h15M15 4l4 4-4 4"/>
                    <path d="M20 16H5M9 12l-4 4 4 4"/>
                </svg>
            </button>
            <div class="meta-data-item" data-slider data-unit="px">
                <input type="range" class="slider-range"
                    min="${SLIDER.min}" max="${SLIDER.max}" step="${SLIDER.step}" value="1024">
                <div class="slider-label-row">
                    <span class="slider-label">Height</span>
                    <span class="slider-value">1024px</span>
                </div>
            </div>
            <div class="meta-data-item nums-of-gen" data-slider data-unit="枚">
                <input type="range" class="slider-range"
                    min="1" max="25" step="1" value="1">
                <div class="slider-label-row">
                    <span class="slider-label">生成枚数</span>
                    <span class="slider-value">1枚</span>
                </div>
            </div>
        </div>
    </div>
        <p class="generate-status status-top" data-state="idle"><span class="status-text">翻訳画面に入力してください</span></p>
    </div>
    <div class="action-container">
        <div class="dd gpu-select" data-value="">
            <button type="button" class="dd-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="GPUを選択">
                <span class="dd-trigger-label">GPU</span>
                <span class="dd-trigger-value"></span>
                <span class="dd-trigger-price"></span>
                <svg class="dd-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>
            <div class="dd-menu" hidden>
                <div class="gpu-head" aria-hidden="true">
                    <span>GPU</span>
                    <span class="gpu-num gpu-sec">$/秒</span>
                    <span class="gpu-num">$/時間</span>
                    <span class="gpu-num">$30で稼働</span>
                </div>
                <div class="dd-list" role="listbox" aria-label="GPU"></div>
            </div>
        </div>
        <div class="image-pick">
            <button type="button" class="image-pick-btn" aria-label="参照画像を選択">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <circle cx="9" cy="10" r="1.6"/>
                    <path d="M21 16l-5-5-8 8"/>
                </svg>
                <span class="image-pick-text">
                    <span class="image-pick-label">画像</span>
                    <span class="image-pick-hover" aria-hidden="true">別の画像を選択</span>
                </span>
            </button>
            <button type="button" class="image-pick-clear" aria-label="選択した画像を外す" title="画像を外す" hidden>×</button>
        </div>
        <div class="adv-wrap">
            <button type="button" class="adv-button" aria-haspopup="dialog" aria-expanded="false">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/>
                    <circle cx="16" cy="6" r="2"/>
                    <circle cx="10" cy="12" r="2"/>
                    <circle cx="18" cy="18" r="2"/>
                </svg>
                <span>詳細設定</span>
            </button>
            <div class="adv-pop" role="dialog" aria-label="詳細設定" hidden>
                <div class="meta-data-item" data-slider data-unit="" data-decimals="1">
                    <input type="range" class="slider-range adv-ref-boost"
                        min="${ADV.refBoost.min}" max="${ADV.refBoost.max}" step="${ADV.refBoost.step}" value="${ADV.refBoost.def}">
                    <div class="slider-label-row">
                        <span class="slider-label">REF_BOOST</span>
                        <span class="slider-value"></span>
                    </div>
                </div>
                <div class="meta-data-item" data-slider data-unit="px">
                    <input type="range" class="slider-range adv-grounding-px"
                        min="${ADV.groundingPx.min}" max="${ADV.groundingPx.max}" step="${ADV.groundingPx.step}" value="${ADV.groundingPx.def}">
                    <div class="slider-label-row">
                        <span class="slider-label">GROUNDING_PX</span>
                        <span class="slider-value"></span>
                    </div>
                </div>
                <div class="lora-section">
                    <div class="lora-head">
                        <span class="lora-title">LoRA</span>
                        <button type="button" class="lora-add">＋ 追加</button>
                    </div>
                    <div class="lora-cols" hidden>
                        <span>version ID</span>
                        <span>重み</span>
                    </div>
                    <div class="lora-list"></div>
                    <p class="lora-empty">LoRA は使いません</p>
                </div>
                <button type="button" class="adv-reset">初期値に戻す</button>
            </div>
        </div>
        <p class="generate-status status-bottom" data-state="idle"><span class="status-text">翻訳画面に入力してください</span></p>
        <div class="generates">
            <button type="button" id="stop_btn">停止</button>
            <button type="button" id="generate_one_btn" disabled>1枚だけ生成</button>
            <button type="button" id="generate_btn" disabled>生成</button>
        </div>
    </div>
    <div class="image-drop" aria-hidden="true"><span>参照する画像をここにドラッグ</span></div>
</div>
`;

// ローカルPythonサーバーへリクエストを送る（background.js経由）
// 例: const res = await callApi("/api/echo", { text: "hello" });
// 拡張機能の再読み込み直後などで通信できない場合は { ok: false, extensionError } が返る
function callApi(path, body, method = "POST") {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "api", path, body, method }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, extensionError: chrome.runtime.lastError.message });
        } else {
          resolve(res);
        }
      });
    } catch (err) {
      resolve({ ok: false, extensionError: String(err) });
    }
  });
}

// chrome.storage.local から値を読み込む（取得できなければ空オブジェクトを返す）
function storageGet(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          resolve({});
        } else {
          resolve(result || {});
        }
      });
    } catch (err) {
      resolve({});
    }
  });
}

// chrome.storage.local へ値を書き込む（失敗しても生成処理自体は止めない）
function storageSet(obj) {
  try {
    chrome.storage.local.set(obj);
  } catch (err) {
    console.warn("[storage] 保存に失敗しました:", err);
  }
}

// 前回生成時の width / height / 生成枚数 を復元し、スライダーと表示に反映する
async function restoreSavedParams(el) {
  const saved = await storageGet(Object.values(STORAGE_KEYS));
  const [widthRange, heightRange, numsRange] = el.querySelectorAll(".slider-range");
  const apply = (range, val) => {
    if (val === undefined || val === null || range == null) return;
    range.value = val;
    range.dispatchEvent(new Event("input")); // 表示テキストと塗り(--fill)を更新
  };
  apply(widthRange, saved[STORAGE_KEYS.width]);
  apply(heightRange, saved[STORAGE_KEYS.height]);
  apply(numsRange, saved[STORAGE_KEYS.nums]);
  apply(el.querySelector(".adv-ref-boost"), saved[STORAGE_KEYS.refBoost]);
  apply(el.querySelector(".adv-grounding-px"), saved[STORAGE_KEYS.groundingPx]);
  el.querySelector(".adv-wrap")?.setLoras?.(saved[STORAGE_KEYS.loras]); // LoRA（version ID と重み）

  // アスペクト比は最後に、changeイベントを出さずに復元する（保存済みのwidth/heightを書き換えないため）
  const aspectSelect = el.querySelector(".aspect-select");
  const savedAspect = saved[STORAGE_KEYS.aspect];
  if (aspectSelect && savedAspect !== undefined && [...aspectSelect.options].some((o) => o.value === savedAspect)) {
    aspectSelect.value = savedAspect;
    el.querySelector(".aspect-dd")?.sync?.(); // 独自ドロップダウンの表示も合わせる
  }

  // GPU（保存値が今の選択肢にあるときだけ反映）
  el.querySelector(".gpu-select")?.setGpu?.(saved[STORAGE_KEYS.gpu]);
}

// スライダー行の右側にある状態表示。data-state は CSS 側のボーダー色に対応（noServer / error はどちらも赤）
const STATUS = {
  idle: { text: "翻訳画面に入力してください" },
  ready: { text: "" },
  queued: { text: "予約完了、次回の生成で出力されます" },
  started: { text: "生成が開始されました" },
  stopped: { text: "停止を要求しました（コンテナを停止します）" },
  noServer: { text: "gen.pyを起動しているか確認してください" },
  error: { text: "予期せぬエラーが発生しました" },
};

// detail を渡すと「基本メッセージ（詳細）」の形で表示する。全文はマウスホバー(title)でも見られる
const DETAIL_MAX = 120;
function setStatus(el, key, detail = "") {
  // 状態表示は2か所（スライダー行の右 / GPU選択行の下）にあり、レイアウトに応じてCSSでどちらかを表示する。
  // 状態(data-state)は <p> が、文言は中の .status-text が持つ。両方を同じ内容に更新する
  // （.status-text は CSS で最大2行に収め、はみ出す分は「…」で省略する。全文は title で見られる）
  const labels = el.querySelectorAll(".generate-status");
  const box = labels[0];
  const short = detail.length > DETAIL_MAX ? detail.slice(0, DETAIL_MAX) + "…" : detail;
  const text = STATUS[key].text + (short ? `（${short}）` : "");
  if (box.dataset.state === key && box.querySelector(".status-text").textContent === text) return; // 変化がなければDOMに触らない
  labels.forEach((label) => {
    label.dataset.state = key;
    label.querySelector(".status-text").textContent = text;
    label.title = detail;
  });
}

// サーバーの応答からエラー内容の文字列を取り出す（FastAPI形式の detail、error、message、生の本文に対応）
function extractServerMessage(res) {
  const d = res?.data;
  if (d && typeof d === "object") {
    const v = d.detail ?? d.error ?? d.message;
    if (Array.isArray(v)) {
      return v
        .map((x) => (x?.msg ? `${(x.loc || []).join(".")}: ${x.msg}` : JSON.stringify(x)))
        .join(", ");
    }
    if (v !== undefined) return typeof v === "string" ? v : JSON.stringify(v);
    return JSON.stringify(d);
  }
  if (typeof d === "string") return d;
  return (res?.text || "").replace(/\s+/g, " ").trim();
}

// 「HTTP 422 Unprocessable Entity: サーバーのメッセージ」の形にする
function describeHttpError(res) {
  const head = `HTTP ${res?.status ?? "?"}${res?.statusText ? " " + res.statusText : ""}`;
  const msg = extractServerMessage(res);
  return msg ? `${head}: ${msg}` : head;
}

// 翻訳結果の有無でボタンの有効/無効を切り替える
function updateGenerateState() {
  const el = document.getElementById(CONFIG.injectedId);
  if (!el) return;
  const btn = el.querySelector("#generate_btn");
  const hasText = !!getTranslatedText();
  if (btn.disabled === hasText) btn.disabled = !hasText;
  const oneBtn = el.querySelector("#generate_one_btn");
  if (oneBtn && oneBtn.disabled === hasText) oneBtn.disabled = !hasText;

  // 待機中の表示だけは入力の有無に追従させる（結果表示は上書きしない）
  const state = el.querySelector(".generate-status").dataset.state;
  if (state === "idle" || state === "ready") {
    setStatus(el, hasText ? "ready" : "idle");
  }
}

// スライダーの塗り部分の長さをCSS変数に反映する
function updateFill(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.setProperty("--fill", `${pct}%`);
}

// スライダーと現在値の表示を連動させる
function setupSlider(item) {
  const range = item.querySelector(".slider-range");
  const value = item.querySelector(".slider-value");
  const unit = item.dataset.unit || "";
  const decimals = Number(item.dataset.decimals || 0);

  const sync = () => {
    value.textContent = `${Number(range.value).toFixed(decimals)}${unit}`;
    updateFill(range);
  };
  sync();
  range.addEventListener("input", sync);
}

// 現在の翻訳結果を取得する。取れなければ空文字
function getTranslatedText() {
  for (const selector of CONFIG.translationSelectors) {
    const node = document.querySelector(selector);
    const text = (node?.innerText || node?.textContent || "").trim();
    if (text) return text;
  }
  return "";
}

// 翻訳元（入力側）のテキストを取得する。取れなければ空文字
function getSourceText() {
  for (const selector of CONFIG.sourceSelectors) {
    const node = document.querySelector(selector);
    const text = (node?.innerText || node?.textContent || "").trim();
    if (text) return text;
  }
  return "";
}

// 画面の端をふわっと光らせる。kind: "press"(青) / "error"(赤)
function flashGlow(kind = "press") {
  let glow = document.getElementById("my-glow-overlay");
  if (!glow) {
    glow = document.createElement("div");
    glow.id = "my-glow-overlay";
    glow.className = "my-glow-overlay";
    glow.addEventListener("animationend", () => glow.classList.remove("is-active"));
    document.body.appendChild(glow);
  }
  glow.dataset.kind = kind;
  glow.classList.remove("is-active");
  void glow.offsetWidth; // 連打してもアニメーションを最初からやり直す
  glow.classList.add("is-active");
}

// ===== ダークモード対応 =====
// DeepLにはダークモードがないので、ページ全体の色を反転して擬似的にダークにする。
// CSSファイルの読み込み状況に左右されないよう、ルールはここから <style> として直接注入する。
const FORCE_DARK_CSS = `
html.my-force-dark {
  background-color: #ffffff !important;
  filter: invert(1) hue-rotate(180deg) !important;
}
html.my-force-dark img,
html.my-force-dark picture,
html.my-force-dark video,
html.my-force-dark canvas,
html.my-force-dark iframe,
html.my-force-dark [style*="background-image"],
html.my-force-dark .my-injected-element,
html.my-force-dark .my-glow-overlay {
  filter: invert(1) hue-rotate(180deg) !important;
}
.my-hidden-below {
  display: none !important;
}
`;

function ensureForceDarkStyle() {
  if (document.getElementById("my-force-dark-style")) return;
  const style = document.createElement("style");
  style.id = "my-force-dark-style";
  style.textContent = FORCE_DARK_CSS;
  (document.head || document.documentElement).appendChild(style);
}

// mainSectionWrapper の兄弟要素（前後どちらも）を隠す
function ensureHideSiblingsStyle() {
  const id = "my-hide-siblings-style";
  const existing = document.getElementById(id);

  if (!CONFIG.hideSiblings) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const s = CONFIG.mainSectionSelector;
  const style = document.createElement("style");
  style.id = id;
  // 後ろの兄弟: s ~ *  /  前の兄弟: :has(~ s)
  style.textContent = `
${s} ~ *,
:has(~ ${s}) {
  display: none !important;
}`;
  (document.head || document.documentElement).appendChild(style);
}

// ページがスクロールできないとき（パネルより下に行けないとき）の対策。
// DeepL側の入れ物（html / body / 親要素）が overflow: hidden で内容を切っていると、下に余白を付けてもスクロールできない。
// パネルを囲む要素のうち、中身が収まらずに切られているものだけを、縦にスクロールできるようにする。
function ensureScrollable() {
  const mine = document.getElementById(CONFIG.injectedId);
  if (!mine) return;
  const clips = (v) => v === "hidden" || v === "clip";
  const scrolls = (v) => v === "auto" || v === "scroll";

  // 1) 以前に付けた overflow-y が、もう不要（中身が収まっている）なら元に戻す。
  //    付けっぱなしだと、入れ子のスクロール領域ができてホイールが固まる原因になる
  for (const n of document.querySelectorAll("[data-my-scroll]")) {
    if (n.scrollHeight <= n.clientHeight + 1) {
      n.style.removeProperty("overflow-y");
      delete n.dataset.myScroll;
      if (GROUP_DEBUG) console.log("[scroll] 縦スクロールの指定を戻しました:", n);
    }
  }

  // 2) パネルから外側へたどり、最初に見つかった「切っている祖先」1つだけをスクロール可能にする。
  //    すでにスクロールできる祖先（auto / scroll）が先にあれば、何も触らない
  for (let n = mine.parentElement; n; n = n.parentElement) {
    if (n.dataset.myScroll) return; // すでに対応済み
    const oy = getComputedStyle(n).overflowY;
    if (scrolls(oy)) return; // 先にスクロール領域がある（DeepL本来のもの）
    if (!clips(oy)) continue;
    if (n.scrollHeight <= n.clientHeight + 1) continue; // 切られている中身がなければ触らない
    n.dataset.myScroll = "1";
    n.style.setProperty("overflow-y", "auto", "important");
    if (GROUP_DEBUG) console.log("[scroll] 縦スクロールを有効にしました:", n);
    return; // 1つだけ
  }
}

// body の overflow:hidden（DeepL側のスクロールロックなど）は、html が overflow:visible のとき画面全体に引き継がれて、
// ホイール・タッチでのスクロールを止める（scrollTo だけは動く）。
// そこで html 側にスクロールを持たせ、body の指定は打ち消す。ロック用の属性付き指定（body[data-scroll-locked] など）にも勝つ
function ensureViewportScrollStyle() {
  const id = "my-viewport-scroll";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
html {
  overflow-y: auto !important;
}
html body,
html body[data-scroll-locked],
html body[style] {
  overflow: visible !important;
}`;
  (document.head || document.documentElement).appendChild(style);
}

function applyTheme() {
  ensureHideSiblingsStyle();
  ensureViewportScrollStyle();

  // forceDark が false のときだけ、CSS側の反転を打ち消す
  let off = document.getElementById("my-force-dark-off");
  if (!CONFIG.forceDark) {
    if (!off) {
      off = document.createElement("style");
      off.id = "my-force-dark-off";
      off.textContent = `html { filter: none !important; }`;
      (document.head || document.documentElement).appendChild(off);
    }
  } else {
    off?.remove();
  }

  const el = document.getElementById(CONFIG.injectedId);
  if (el && el.dataset.theme !== "dark") el.dataset.theme = "dark";
}

// ===== mainSectionWrapper 以外・辞書より後ろを消す =====
// 辞書の見出しから「辞書のカード全体」を割り出す（mainSectionWrapper の中だけを探す）
function findDictionaryCard(main) {
  const heading = [...main.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span,p")].find(
    (n) => n.children.length === 0 && n.textContent.trim() === CONFIG.dictionaryHeading
  );
  if (!heading) return null;

  let card = heading;
  while (card.parentElement && card.parentElement !== main) {
    const parent = card.parentElement;
    if (parent.querySelector(CONFIG.sourceSelectors.join(","))) break; // 翻訳欄まで含んだら行き過ぎ
    if (parent.getBoundingClientRect().height > 300) break;
    card = parent;
  }
  return card;
}

function hideEl(el) {
  if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
  if (el.classList.contains("my-hidden-below")) return;
  const mine = document.getElementById(CONFIG.injectedId);
  if (mine && el.contains(mine)) return; // 差し込んだパネルを含む要素は隠さない
  el.classList.add("my-hidden-below");
}

// 要素は削除せず display:none にする（DeepLの再描画と衝突しないため）
function hideOutsideMainSection() {
  if (!CONFIG.hideOutsideMainSection) return;
  const main = document.querySelector(CONFIG.mainSectionSelector);
  if (!main || !main.parentElement) return;

  // 1) mainSectionWrapper の兄弟をすべて隠す
  for (const sib of main.parentElement.children) {
    if (sib !== main) hideEl(sib);
  }

  // 2) mainSectionWrapper の中では、辞書（なければ editor-layout-footer）より後ろを隠す
  const anchor = findDictionaryCard(main) || main.querySelector(CONFIG.targetSelector);
  if (!anchor) return;
  for (let node = anchor; node && node !== main; node = node.parentElement) {
    for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
      hideEl(sib);
    }
  }
}

// ===== 文字の置換（翻訳前の文章を書き換える） =====
// 翻訳元エディタ（contenteditable）の要素を取得する。見つからなければ null
function getSourceEditor() {
  for (const selector of CONFIG.sourceSelectors) {
    const node = document.querySelector(selector);
    if (!node) continue;
    if (node.isContentEditable) return node;
    const editable = node.querySelector('[contenteditable="true"]');
    if (editable) return editable;
  }
  return null;
}

// エディタ内のテキストノードから、from に一致する位置をすべて集める（大文字小文字は区別する）
function findMatches(editor, from) {
  const matches = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue;
    let i = text.indexOf(from);
    while (i !== -1) {
      matches.push({ node: n, start: i });
      i = text.indexOf(from, i + from.length);
    }
  }
  return matches;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

// ===== ドロップダウン共通（GPU選択・アスペクト比選択） =====
// root の中の .dd-trigger / .dd-menu / .dd-list（中に .dd-option）を、開閉・キーボード操作できるようにする。
//   onPick(value): 項目が選ばれたとき / onOpen(): メニューを開いた直後 / onClose(): 閉じた直後
function setupDropdown(root, { onPick, onOpen, onClose } = {}) {
  const trigger = root.querySelector(".dd-trigger");
  const menu = root.querySelector(".dd-menu");
  const list = root.querySelector(".dd-list");
  const getOptions = () => [...list.querySelectorAll(".dd-option")];

  const isOpen = () => root.classList.contains("is-open");

  const close = (returnFocus = false) => {
    if (!isOpen()) return;
    root.classList.remove("is-open", "is-up");
    trigger.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    menu.style.maxHeight = "";
    onClose?.();
    if (returnFocus) trigger.focus();
  };

  const focusOption = (i) => {
    const options = getOptions();
    options[(i + options.length) % options.length]?.focus();
  };
  const selectedIndex = () => Math.max(0, getOptions().findIndex((b) => b.getAttribute("aria-selected") === "true"));

  const open = (focusIndex = selectedIndex()) => {
    if (isOpen()) return;
    root.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    menu.style.maxHeight = "";
    onOpen?.();

    // 下に収まらず、上のほうが広いときは上向きに開く。どちらにも収まらないときは広いほうに合わせてスクロールさせる
    const r = trigger.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 16;
    const above = r.top - 16;
    const natural = menu.offsetHeight;
    const up = natural > below && above > below;
    root.classList.toggle("is-up", up);
    menu.style.maxHeight = `${Math.floor(Math.max(160, Math.min(natural, up ? above : below)))}px`;

    focusOption(focusIndex);
  };

  trigger.addEventListener("click", () => (isOpen() ? close() : open()));
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      open();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      open(getOptions().length - 1);
    }
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".dd-option");
    if (!btn) return;
    onPick?.(btn.dataset.value);
    close(true);
  });

  menu.addEventListener("keydown", (e) => {
    const options = getOptions();
    const i = options.indexOf(document.activeElement);
    const handled = { ArrowDown: () => focusOption(i + 1), ArrowUp: () => focusOption(i - 1),
                      Home: () => focusOption(0), End: () => focusOption(options.length - 1),
                      Escape: () => close(true) }[e.key];
    if (handled) {
      e.preventDefault();
      e.stopPropagation(); // DeepL側のショートカットに渡さない
      handled();
    } else if (e.key === "Tab") {
      close();
    }
  });

  // メニューの外を押したら閉じる（要素が作り直されて消えたら、自分のリスナーも外す）
  const onOutside = (e) => {
    if (!root.isConnected) {
      document.removeEventListener("pointerdown", onOutside, true);
      return;
    }
    if (isOpen() && !root.contains(e.target)) close();
  };
  document.addEventListener("pointerdown", onOutside, true);

  return { open, close, isOpen };
}

// ===== GPU選択ドロップダウン =====
// 選択中のGPU名（フェッチで GPU として送る値。例: "L4" / "RTX-PRO-6000"）
function getSelectedGpu(el) {
  return el.querySelector(".gpu-select")?.dataset.value || GPU_DEFAULT;
}

function setupGpuSelect(el) {
  const root = el.querySelector(".gpu-select");
  if (!root) return;
  const valueLabel = root.querySelector(".dd-trigger-value");
  const priceLabel = root.querySelector(".dd-trigger-price");
  const list = root.querySelector(".dd-list");

  list.innerHTML = GPU_OPTIONS.map(
    (o) => `<button type="button" class="dd-option" role="option" tabindex="-1" aria-selected="false" data-value="${o.value}">
      <span class="gpu-name">${o.name}</span>
      <span class="gpu-num gpu-sec">${o.perSec}</span>
      <span class="gpu-num gpu-hour">${o.perHour}</span>
      <span class="gpu-num">${o.hours}</span>
    </button>`
  ).join("");
  const options = [...list.querySelectorAll(".dd-option")];

  // 値を選ぶ。選択肢にない値なら何もしない（false を返す）
  const select = (value) => {
    const index = GPU_OPTIONS.findIndex((o) => o.value === value);
    if (index < 0) return false;
    const o = GPU_OPTIONS[index];
    root.dataset.value = o.value;
    valueLabel.textContent = o.name;
    priceLabel.textContent = `${o.perHour}/時`;
    options.forEach((btn, i) => btn.setAttribute("aria-selected", String(i === index)));
    return true;
  };
  root.setGpu = select;
  select(GPU_DEFAULT);

  setupDropdown(root, { onPick: select });
}

// ===== 詳細設定ポップアップ（画像選択ボタンの右のボタン） =====
function setupAdvanced(el) {
  const root = el.querySelector(".adv-wrap");
  if (!root) return;
  const btn = root.querySelector(".adv-button");
  const pop = root.querySelector(".adv-pop");
  const ref = root.querySelector(".adv-ref-boost");
  const ground = root.querySelector(".adv-grounding-px");
  setupLoras(root);

  const isOpen = () => root.classList.contains("is-open");
  const close = (returnFocus = false) => {
    if (!isOpen()) return;
    root.classList.remove("is-open", "is-right");
    btn.setAttribute("aria-expanded", "false");
    pop.hidden = true;
    if (returnFocus) btn.focus();
  };
  const open = () => {
    if (isOpen()) return;
    root.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    pop.hidden = false;
    // 右にはみ出すときは、ボタンの右端にそろえて左へ開く
    const r = pop.getBoundingClientRect();
    root.classList.toggle("is-right", r.right > window.innerWidth - 8);
  };

  btn.addEventListener("click", () => (isOpen() ? close() : open()));
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // DeepL側のショートカットに渡さない
      close(true);
    }
  });

  root.querySelector(".adv-reset").addEventListener("click", () => {
    ref.value = ADV.refBoost.def;
    ground.value = ADV.groundingPx.def;
    ref.dispatchEvent(new Event("input"));
    ground.dispatchEvent(new Event("input"));
    root.setLoras([]); // LoRA も指定なしに戻す
  });

  const onOutside = (e) => {
    if (!root.isConnected) {
      document.removeEventListener("pointerdown", onOutside, true);
      return;
    }
    if (isOpen() && !root.contains(e.target)) close();
  };
  document.addEventListener("pointerdown", onOutside, true);
}

// ===== LoRA（version ID と重み）。詳細設定ポップアップの中の欄 =====
// 1行 = 1つの LoRA。[version ID] [重み] [×]。「＋ 追加」で行を増やす（最大 LORA.max 個）。
// version ID は数字だけ。CivitAI のURL（...?modelVersionId=123 / .../api/download/models/123）を貼ると、数字だけ取り出す。
// 空の行は送らない。生成のとき、loras: [{ version_id: "123", strength: 0.8 }, ...] としてサーバーへ送る。
const cleanLoraId = (s) => {
  const m = /(?:modelVersionId=|\/api\/download\/models\/)(\d+)/i.exec(String(s));
  return (m ? m[1] : String(s)).replace(/\D/g, "").slice(0, 12);
};

const clampLoraStrength = (v) => {
  const n = Number(v);
  if (v === "" || !Number.isFinite(n)) return LORA.strength.def;
  return Number(Math.min(LORA.strength.max, Math.max(LORA.strength.min, n)).toFixed(2));
};

// 送る LoRA の一覧（version ID が入っている行だけ）
function getLoras(el) {
  return el.querySelector(".adv-wrap")?.getLoras?.() ?? [];
}

function setupLoras(root) {
  const section = root.querySelector(".lora-section");
  if (!section) return;
  const list = section.querySelector(".lora-list");
  const addBtn = section.querySelector(".lora-add");
  const cols = section.querySelector(".lora-cols");
  const empty = section.querySelector(".lora-empty");
  const { min, max, step, def } = LORA.strength;

  // 行の有無に合わせて、見出し・「なし」の表示・追加ボタンを切り替える
  const paint = () => {
    const n = list.children.length;
    cols.hidden = n === 0;
    empty.hidden = n !== 0;
    addBtn.disabled = n >= LORA.max;
  };

  const addRow = (versionId = "", strength = def, focus = false) => {
    if (list.children.length >= LORA.max) return;
    const row = document.createElement("div");
    row.className = "lora-row";
    row.innerHTML = `<input type="text" class="lora-id" inputmode="numeric" placeholder="例: 3409322"
        autocomplete="off" spellcheck="false" aria-label="version ID">
      <input type="number" class="lora-strength" min="${min}" max="${max}" step="${step}"
        aria-label="重み">
      <button type="button" class="lora-remove" aria-label="このLoRAを外す" title="外す">×</button>`;
    const idInput = row.querySelector(".lora-id");
    const strengthInput = row.querySelector(".lora-strength");
    idInput.value = cleanLoraId(versionId);
    strengthInput.value = String(clampLoraStrength(strength));

    idInput.addEventListener("input", () => {
      const v = cleanLoraId(idInput.value);
      if (v !== idInput.value) idInput.value = v; // 変わったときだけ書き換える（カーソル位置を保つ）
    });
    // 重みは、入力を終えたときに範囲内へ収める（入力途中の「-」や「0.」を邪魔しない）
    strengthInput.addEventListener("change", () => {
      strengthInput.value = String(clampLoraStrength(strengthInput.value));
    });
    row.querySelector(".lora-remove").addEventListener("click", () => {
      row.remove();
      paint();
    });

    list.appendChild(row);
    paint();
    if (focus) idInput.focus({ preventScroll: true });
  };

  addBtn.addEventListener("click", () => addRow("", def, true));

  // DeepL側のショートカットにキー入力を渡さない（Esc だけは、ポップアップを閉じるために通す）
  section.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") e.stopPropagation();
  });
  ["keyup", "keypress"].forEach((type) => section.addEventListener(type, (e) => e.stopPropagation()));

  root.getLoras = () =>
    [...list.querySelectorAll(".lora-row")]
      .map((row) => ({
        version_id: cleanLoraId(row.querySelector(".lora-id").value),
        strength: clampLoraStrength(row.querySelector(".lora-strength").value),
      }))
      .filter((x) => x.version_id);

  // 保存してあった内容を入れ直す（形が違うものは無視する）
  root.setLoras = (items) => {
    list.textContent = "";
    if (Array.isArray(items)) {
      for (const x of items) {
        if (!x || typeof x !== "object") continue;
        const id = cleanLoraId(x.version_id ?? "");
        if (id) addRow(id, x.strength);
      }
    }
    paint();
  };
  paint();
}

// ===== 参照画像の選択（GPU選択の右のボタン） =====
// ブラウザの拡張機能は、ローカルファイルの「本当のパス」を取得できない（<input type=file> は fakepath しか返さない）。
// そこで、ローカルで動いている gen.py にOSのファイル選択ダイアログを開いてもらい、選ばれたパスを受け取る。
// 選んだパスは「生成」「1枚だけ生成」のときに image_path として送る（gen.py 側で画像編集モードで生成する）。
// ※ページを再読み込みすると選択は外れる（古い画像が知らないうちに使われ続けるのを防ぐため、保存はしない）
let selectedImagePath = "";

const imageBaseName = (p) => String(p).split(/[\\/]/).pop();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// callApi の失敗を状態表示に出す。失敗していたら true（呼び出し側はそこで中断する）
function reportApiFailure(el, tag, res) {
  if (res?.networkError) {
    console.error(`[${tag}] サーバーに接続できません:`, res);
    setStatus(el, "noServer", res.error || "");
  } else if (res?.extensionError) {
    console.error(`[${tag}] 拡張機能との通信に失敗:`, res);
    setStatus(el, "error", "拡張機能との通信に失敗しました。ページをリロードしてください");
  } else if (!res?.ok) {
    console.error(`[${tag}] サーバーがエラーを返しました:`, res);
    setStatus(el, "error", describeHttpError(res));
  } else {
    return false;
  }
  flashGlow("error");
  return true;
}

// gen.py にファイル選択ダイアログを開かせ、選ばれたパスを返す（キャンセル・失敗なら空文字）。
// ダイアログを開いている間 HTTP 接続を握りっぱなしにしないよう、開始 → 結果を何度か問い合わせる、の2段階にしている
async function pickImageFromServer(el) {
  const start = await callApi("/api/pick_image", {});
  if (reportApiFailure(el, "image", start)) return "";
  const token = start.data?.token;
  if (!token) return "";

  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(400);
    const res = await callApi("/api/pick_image_result", { token });
    if (reportApiFailure(el, "image", res)) return "";
    const d = res.data || {};
    if (!d.done) continue;
    if (d.error) {
      setStatus(el, "error", d.error);
      flashGlow("error");
      return "";
    }
    return d.path || "";
  }
  return "";
}

function setupImagePick(el) {
  const root = el.querySelector(".image-pick");
  if (!root) return;
  const pickBtn = root.querySelector(".image-pick-btn");
  const label = root.querySelector(".image-pick-label");
  const clearBtn = root.querySelector(".image-pick-clear");

  // 選択中の画像を表示に反映する（DeepLの再描画でパネルが作り直されても、変数に残っているので復元できる）
  // 画像を選ぶと、ボタンの文字が画像名になる。ホバー（キーボードならフォーカス）中は「別の画像を選択」に変わる（CSS側）
  const paint = () => {
    const has = !!selectedImagePath;
    const name = has ? imageBaseName(selectedImagePath) : "";
    root.classList.toggle("has-image", has);
    clearBtn.hidden = !has;
    label.textContent = has ? name : "画像";
    pickBtn.setAttribute("aria-label", has ? `別の画像を選択（現在: ${name}）` : "参照画像を選択");
    // フルパスはホバーのツールチップで見られる
    pickBtn.title = has ? selectedImagePath : "参照画像を選ぶ（選ぶと、その画像を元にした画像編集で生成します）";
  };
  paint();

  pickBtn.addEventListener("click", async () => {
    if (pickBtn.disabled) return;
    pickBtn.disabled = true; // ダイアログを開いている間は押せない
    root.classList.add("is-busy");
    try {
      const path = await pickImageFromServer(el);
      if (path) {
        selectedImagePath = path;
        paint();
      }
    } finally {
      pickBtn.disabled = false;
      root.classList.remove("is-busy");
    }
  });

  clearBtn.addEventListener("click", () => {
    selectedImagePath = "";
    paint();
  });
}

// ===== アスペクト比ドロップダウン =====
// 左に比の一覧、右にその比の実際の形（四角形）を出す。項目にホバー（キーボードなら選択移動）すると、
// 四角形が今の形から新しい比へ、なめらかに変形する。「自由」は今の width:height の比で表示する。
// 値の持ち主は非表示の <select class="aspect-select">（既存の処理はそのまま select を読み書きする）。
function setupAspectDropdown(el) {
  const root = el.querySelector(".aspect-dd");
  const select = el.querySelector(".aspect-select");
  if (!root || !select) return;
  const valueLabel = root.querySelector(".dd-trigger-value");
  const list = root.querySelector(".dd-list");
  const rect = root.querySelector(".aspect-rect");
  const rectLabel = root.querySelector(".aspect-rect-label");
  const [widthRange, heightRange] = el.querySelectorAll(".slider-range");

  // 図形のサイズをCSS変数としてSCSS側に渡す（右側の領域の幅に使う）
  root.style.setProperty("--aspect-box", `${ASPECT_PREVIEW.size}px`);

  list.innerHTML = [...select.options]
    .map((o) => `<button type="button" class="dd-option" role="option" tabindex="-1" aria-selected="false" data-value="${o.value}">${o.textContent}</button>`)
    .join("");
  const options = [...list.querySelectorAll(".dd-option")];

  // 選択中の値を select から読み、トリガーと一覧の表示に反映する（swap・復元など外から変えられたときにも使う）
  const sync = () => {
    const found = options.findIndex((b) => b.dataset.value === select.value);
    const index = Math.max(0, found);
    valueLabel.textContent = options[index].textContent;
    options.forEach((btn, i) => btn.setAttribute("aria-selected", String(i === index)));
  };
  root.sync = sync;
  sync();

  // 四角形を value の比の形にする。animate=true のときは、今表示されている大きさから新しい大きさへ
  // Web Animations API で動かす（CSSの transition や OS の「視差効果を減らす」設定に左右されない）。
  // アニメーション中に別の比へ移っても、今の途中の大きさから滑らかにつなぐ。
  let anim = null;
  const showShape = (value, animate = true) => {
    const [w, h] = value ? value.split(":").map(Number) : [Number(widthRange?.value) || 1, Number(heightRange?.value) || 1];
    const k = ASPECT_PREVIEW.size / Math.max(w, h);
    const toW = `${(w * k).toFixed(1)}px`;
    const toH = `${(h * k).toFixed(1)}px`;

    const from = rect.getBoundingClientRect(); // 動いている最中ならその途中の大きさ
    anim?.cancel();
    anim = null;
    rect.style.width = toW;
    rect.style.height = toH;
    rectLabel.textContent = value || "自由";

    if (!animate || ASPECT_PREVIEW.duration <= 0 || !from.width || !from.height) return;
    anim = rect.animate(
      [{ width: `${from.width}px`, height: `${from.height}px` }, { width: toW, height: toH }],
      { duration: ASPECT_PREVIEW.duration, easing: ASPECT_PREVIEW.easing }
    );
  };

  setupDropdown(root, {
    onPick: (value) => {
      if (select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event("change")); // setupAspect の連動（width/heightの補正）を走らせる
      }
      sync();
    },
    onOpen: () => showShape(select.value, false), // 開いた直後は、選択中の比の形から始める
  });

  const preview = (e) => {
    const btn = e.target.closest(".dd-option");
    if (btn) showShape(btn.dataset.value);
  };
  list.addEventListener("mouseover", preview);
  list.addEventListener("focusin", preview);
  list.addEventListener("mouseleave", () => showShape(select.value)); // 一覧から出たら、選択中の比に戻す
}

// アスペクト比の連動。比率が選ばれているとき、widthかheightを動かすともう一方が自動で変わる。
// 範囲(SLIDER.min〜max)とstepは必ず守る。範囲を超えてしまう場合は、超えない側に合わせて動かした側も補正する。
function setupAspect(el) {
  const select = el.querySelector(".aspect-select");
  const [widthRange, heightRange] = el.querySelectorAll(".slider-range");
  if (!select || !widthRange || !heightRange) return;

  const clamp = (v) => Math.min(SLIDER.max, Math.max(SLIDER.min, v));
  const snap = (v) => clamp(Math.round(v / SLIDER.step) * SLIDER.step);
  // 比率 = width / height。「自由」のときは null
  const getRatio = () => {
    if (!select.value) return null;
    const [w, h] = select.value.split(":").map(Number);
    return w / h;
  };
  const setValue = (range, v) => {
    range.value = v;
    range.dispatchEvent(new Event("input")); // 表示テキストと塗り(--fill)を更新
  };

  let applying = false; // 自分で値を変えたときにinputイベントが再度反応しないようにする
  const apply = (source) => {
    const ratio = getRatio();
    if (!ratio) return;

    const fromWidth = source === widthRange;
    const target = fromWidth ? heightRange : widthRange;
    let sourceVal = snap(Number(source.value));
    const exact = fromWidth ? sourceVal / ratio : sourceVal * ratio;
    let targetVal = snap(exact);

    // もう一方が範囲外になるときは、範囲内に収めた値から動かした側を逆算する
    if (exact > SLIDER.max || exact < SLIDER.min) {
      sourceVal = snap(fromWidth ? targetVal * ratio : targetVal / ratio);
    }

    applying = true;
    setValue(source, sourceVal);
    setValue(target, targetVal);
    applying = false;
  };

  widthRange.addEventListener("input", () => { if (!applying) apply(widthRange); });
  heightRange.addEventListener("input", () => { if (!applying) apply(heightRange); });
  // 比率を変えたときは、widthを基準にheightを合わせる
  select.addEventListener("change", () => apply(widthRange));
}

// ===== 選択した文字と同じ文字をマークする =====
// DOMは書き換えず、CSS Custom Highlight API で描画だけ重ねる（DeepLのエディタと衝突しない）
const SAME_HIGHLIGHT_NAME = "my-same-text";
const SAME_HIGHLIGHT_MAX = 500; // 一致が多すぎるときの上限

// 現状 body に invert(1) hue-rotate(180deg) がかかっているため、
// フィルター適用後に「オレンジ背景＋黒文字」になるよう、色を逆算した値を使う。
// （ダークにしない設定のときは、そのまま指定する）
// マークの色（背景 / 文字）。マルチカーソルの縦棒の色にも使う
function sameMarkColors() {
  return CONFIG.forceDark
    ? { bg: "#c04d00", fg: "#ffffff" }
    : { bg: "#ff8c40", fg: "#000000" };
}

function ensureSameHighlightStyle() {
  const id = "my-same-highlight-style";
  document.getElementById(id)?.remove();
  const { bg, fg } = sameMarkColors();
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
::highlight(${SAME_HIGHLIGHT_NAME}) {
  background-color: ${bg};
  color: ${fg};
}`;
  (document.head || document.documentElement).appendChild(style);
}

function clearSameHighlight() {
  if (window.CSS && CSS.highlights) CSS.highlights.delete(SAME_HIGHLIGHT_NAME);
}

function updateSameHighlight() {
  if (!(window.CSS && CSS.highlights) || typeof Highlight === "undefined") return;
  if (multi) return; // Ctrl+D のマルチ編集中は、マーク表示を multi 側で管理する

  const editor = getSourceEditor();
  const sel = window.getSelection();
  if (!editor || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
    clearSameHighlight();
    return;
  }
  // 選択が翻訳元エディタの中にあるときだけ反応する
  if (!editor.contains(sel.anchorNode) || !editor.contains(sel.focusNode)) {
    clearSameHighlight();
    return;
  }

  const text = sel.toString();
  // 空白だけ・改行をまたぐ選択はマークしない
  if (!text.trim() || /[\r\n]/.test(text)) {
    clearSameHighlight();
    return;
  }

  const selRange = sel.getRangeAt(0);
  const ranges = [];
  for (const m of findMatches(editor, text)) {
    // 選択中の箇所そのものは、選択色が見えるようにマークしない
    if (m.node === selRange.startContainer && m.start === selRange.startOffset) continue;
    const r = new Range();
    r.setStart(m.node, m.start);
    r.setEnd(m.node, m.start + text.length);
    ranges.push(r);
    if (ranges.length >= SAME_HIGHLIGHT_MAX) break;
  }

  if (ranges.length === 0) {
    clearSameHighlight();
    return;
  }
  CSS.highlights.set(SAME_HIGHLIGHT_NAME, new Highlight(...ranges));
}

function setupSameHighlight() {
  ensureSameHighlightStyle();
  let raf = null;
  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = null;
      updateSameHighlight();
    });
  };
  // 選択範囲が増減するたびに発火する
  document.addEventListener("selectionchange", schedule);
  // 文章を編集したら古いマークは消す（再選択で付け直される）
  document.addEventListener("input", clearSameHighlight, true);
}

// ===== Ctrl+D：選択した文字と同じ文字を、すべて同時に編集する（マルチカーソル） =====
// contenteditable には複数カーソルがないので、「カーソル位置の一覧」を自前で持ち、
// 入力・削除を一覧の全位置に同じように適用する。位置は DOM ノードではなく
// 「エディタ内テキストの先頭からの文字数」で持つ（DeepLが再描画してもずれないように）。
const MULTI_HIGHLIGHT_NAME = "my-multi-text";
const MULTI_MAX = 50; // 同時に編集できる最大数（1か所ごとに描画を待つため、多いと重くなる）
const MULTI_EXIT_KEYS = [
  "Escape", "Enter", "Tab",
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
  "Home", "End", "PageUp", "PageDown",
];

let multi = null; // { carets: [{s, e}], primary: 主カーソルの番号 }  s/e は文字数オフセット
let multiBusy = Promise.resolve(); // 編集を1つずつ順番に処理するためのキュー
let multiApplying = false; // 自分で execCommand を実行している間だけ true（自分のイベントを無視する）
let multiComp = null; // IME変換中の状態 { len: 変換開始時のテキスト全体の文字数 }
let multiRaf = 0;

function enqueueMulti(fn) {
  multiBusy = multiBusy.then(fn).catch((err) => console.error("[multi]", err));
  return multiBusy;
}

function editorTextNodes(editor) {
  const nodes = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
  return nodes;
}

// テキストノードが属する「行（段落）」の要素
const BLOCK_TAGS = /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE)$/;
function blockOf(editor, node) {
  for (let el = node.parentElement; el && el !== editor; el = el.parentElement) {
    if (BLOCK_TAGS.test(el.tagName)) return el;
  }
  return editor;
}

// エディタ内のテキストを「先頭からの文字数」で扱うための地図。
// 行（段落）が変わるところ・<br> をまたぐところには、1文字ぶんの区切り（改行）を入れて数える。
// こうしないと「前の行の末尾」と「次の行の先頭」が同じ文字数になってしまい、
// 行頭にカーソルを置いたとき前の行の末尾に飛んでしまう。
// segs: [{ node, start, len }]（start はその行内テキストの開始位置）
function editorLayout(editor) {
  const nodes = editorTextNodes(editor);
  const brs = [...editor.querySelectorAll("br")];
  const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
  const PRECEDING = Node.DOCUMENT_POSITION_PRECEDING;
  const segs = [];
  let pos = 0;
  let prev = null;
  for (const n of nodes) {
    if (prev) {
      const newBlock = blockOf(editor, prev) !== blockOf(editor, n);
      const hasBr =
        !newBlock &&
        brs.some(
          (br) => prev.compareDocumentPosition(br) & FOLLOWING && n.compareDocumentPosition(br) & PRECEDING
        );
      if (newBlock || hasBr) pos += 1; // 行の区切り
    }
    const len = n.nodeValue.length;
    segs.push({ node: n, start: pos, len });
    pos += len;
    prev = n;
  }
  return { segs, total: pos };
}

// 区切りを含めた文字数の合計
function multiTextLength(editor) {
  return editorLayout(editor).total;
}

// 区切りを "\n" にした文字列（サロゲートペアの判定用）
function multiTextString(editor) {
  const { segs } = editorLayout(editor);
  let out = "";
  for (const sg of segs) {
    while (out.length < sg.start) out += "\n";
    out += sg.node.nodeValue;
  }
  return out;
}

// DOM上の位置 → エディタ先頭からの文字数。エディタの外なら null
function offsetOf(editor, node, off) {
  if (!node || !editor.contains(node)) return null;
  const { segs, total } = editorLayout(editor);
  if (node.nodeType === Node.TEXT_NODE) {
    const sg = segs.find((x) => x.node === node);
    return sg ? sg.start + off : null;
  }
  // 要素の中の位置（例：<p> の先頭や末尾）
  const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
  const child = node.childNodes[off];
  if (child) {
    const inside = segs.find((x) => x.node === child || child.contains(x.node));
    if (inside) return inside.start;
    const after = segs.find((x) => child.compareDocumentPosition(x.node) & FOLLOWING);
    return after ? after.start : total;
  }
  let last = null;
  for (const x of segs) if (node.contains(x.node)) last = x;
  if (last) return last.start + last.len;
  const after = segs.find(
    (x) => !node.contains(x.node) && node.compareDocumentPosition(x.node) & FOLLOWING
  );
  return after ? after.start : total;
}

// 文字数オフセット → Range（テキストが無ければ null）
function rangeFromOffsets(editor, s, e) {
  const { segs } = editorLayout(editor);
  if (segs.length === 0) return null;
  // preferNext: 境界ぴったりのとき、次のノード側に置く（選択範囲の先頭用）
  const locate = (p, preferNext) => {
    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i];
      if (p < sg.start) {
        // 行の区切りの上：先頭側なら次の行の頭、末尾側なら前の行の終わり
        if (preferNext || i === 0) return { node: sg.node, off: 0 };
        return { node: segs[i - 1].node, off: segs[i - 1].len };
      }
      const end = sg.start + sg.len;
      if (preferNext ? p < end : p <= end) return { node: sg.node, off: p - sg.start };
    }
    const last = segs[segs.length - 1];
    return { node: last.node, off: last.len };
  };
  const a = locate(s, s !== e);
  const b = locate(e, false);
  const r = document.createRange();
  r.setStart(a.node, a.off);
  r.setEnd(b.node, b.off);
  return r;
}

// 同じ位置になったカーソルをまとめる（削除で隣同士がくっついたときなど）
function normalizeCarets(carets, primary) {
  const out = [];
  let newPrimary = 0;
  carets.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && last.s === c.s && last.e === c.e) {
      if (i === primary) newPrimary = out.length - 1;
      return;
    }
    if (i === primary) newPrimary = out.length;
    out.push(c);
  });
  return { carets: out, primary: newPrimary };
}

// --- 表示（まだ選択状態のものは紫のマーク、カーソルだけになったものは紫の縦棒） ---
// 背景は紫、文字は白。ページ全体に反転フィルターがかかっているときは、
// 反転後に紫・白に見えるよう逆算した色を使う（純粋な紫は反転で表現できないので近い紫になる）
function multiMarkColors() {
  return CONFIG.forceDark
    ? { bg: "#ab81ff", fg: "#000000" }
    : { bg: "#7c3aed", fg: "#ffffff" };
}

function ensureMultiStyle() {
  const id = "my-multi-style";
  document.getElementById(id)?.remove();
  const { bg, fg } = multiMarkColors();
  // 主カーソルの本物の選択範囲も同じ色にする（翻訳元エディタの中だけ）
  const selectionSelectors = CONFIG.sourceSelectors
    .map((sel) => `${sel}::selection, ${sel} ::selection`)
    .join(",\n");
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
::highlight(${MULTI_HIGHLIGHT_NAME}) {
  background-color: ${bg};
  color: ${fg};
}
${selectionSelectors} {
  background-color: ${bg};
  color: ${fg};
}
#my-multi-caret-layer {
  position: absolute; left: 0; top: 0; width: 0; height: 0;
  pointer-events: none; z-index: 2147483646;
}
.my-multi-caret {
  position: absolute; width: 2px; background: ${bg};
  animation: my-multi-caret-blink 1.06s steps(1) infinite;
}
@keyframes my-multi-caret-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}`;
  (document.head || document.documentElement).appendChild(style);
}

function refreshMultiMarks() {
  if (!multi || !(window.CSS && CSS.highlights) || typeof Highlight === "undefined") return;
  const editor = getSourceEditor();
  if (!editor) return;
  const ranges = [];
  multi.carets.forEach((c, i) => {
    if (i === multi.primary || c.s === c.e) return; // 主カーソルは本物の選択が見えている
    const r = rangeFromOffsets(editor, c.s, c.e);
    if (r) ranges.push(r);
  });
  if (ranges.length) CSS.highlights.set(MULTI_HIGHLIGHT_NAME, new Highlight(...ranges));
  else clearMultiHighlight();
}

function clearMultiHighlight() {
  if (window.CSS && CSS.highlights) CSS.highlights.delete(MULTI_HIGHLIGHT_NAME);
}

// カーソル（幅0のRange）の画面上の位置。幅0だと座標が取れないことがあるので、隣の文字から補う
function caretRect(editor, s) {
  const r = rangeFromOffsets(editor, s, s);
  if (!r) return null;
  const own = r.getClientRects()[0];
  if (own && own.height > 0) return { left: own.left, top: own.top, height: own.height };

  const prev = s > 0 ? rangeFromOffsets(editor, s - 1, s) : null;
  const pr = prev ? prev.getClientRects() : [];
  if (pr.length && pr[pr.length - 1].height > 0) {
    const q = pr[pr.length - 1];
    return { left: q.right, top: q.top, height: q.height };
  }
  const next = rangeFromOffsets(editor, s, s + 1);
  const nr = next ? next.getClientRects() : [];
  if (nr.length && nr[0].height > 0) {
    return { left: nr[0].left, top: nr[0].top, height: nr[0].height };
  }
  return null;
}

function renderMultiCarets() {
  const editor = getSourceEditor();
  let layer = document.getElementById("my-multi-caret-layer");
  if (!multi || !editor) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "my-multi-caret-layer";
    document.body.appendChild(layer);
  }
  // body に filter があると position の基準が変わるので、レイヤー自身の位置を原点にして座標を出す
  const origin = layer.getBoundingClientRect();
  const targets = multi.carets.filter((c, i) => i !== multi.primary && c.s === c.e);
  while (layer.children.length > targets.length) layer.lastChild.remove();
  while (layer.children.length < targets.length) {
    const d = document.createElement("div");
    d.className = "my-multi-caret";
    layer.appendChild(d);
  }
  targets.forEach((c, k) => {
    const d = layer.children[k];
    const rect = caretRect(editor, c.s);
    if (!rect) {
      d.style.display = "none";
      return;
    }
    d.style.display = "block";
    d.style.left = `${rect.left - origin.left}px`;
    d.style.top = `${rect.top - origin.top}px`;
    d.style.height = `${rect.height}px`;
  });
}

function multiLoop() {
  if (!multi) {
    multiRaf = 0;
    return;
  }
  renderMultiCarets();
  multiRaf = requestAnimationFrame(multiLoop);
}

// --- 開始 / 終了 ---
function enterMultiEdit() {
  if (multi) return;
  const editor = getSourceEditor();
  const sel = window.getSelection();
  if (!editor || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  if (!editor.contains(sel.anchorNode) || !editor.contains(sel.focusNode)) return;

  const text = sel.toString();
  if (!text.trim() || /[\r\n]/.test(text)) return;

  const selRange = sel.getRangeAt(0);
  const selStart = offsetOf(editor, selRange.startContainer, selRange.startOffset);
  if (selStart === null) return;

  const carets = [];
  for (const m of findMatches(editor, text)) {
    const s = offsetOf(editor, m.node, m.start);
    if (s !== null) carets.push({ s, e: s + text.length });
  }
  const primary = carets.findIndex((c) => c.s === selStart);
  if (primary < 0 || carets.length < 2) return; // 同じ文字が他になければ何もしない
  if (carets.length > MULTI_MAX) {
    flashGlow("error"); // 多すぎる
    return;
  }

  multi = { carets, primary };
  clearSameHighlight(); // 選択中のオレンジのマークは、紫のマークに置き換える
  ensureMultiStyle();
  refreshMultiMarks();
  if (!multiRaf) multiRaf = requestAnimationFrame(multiLoop);
}

function exitMulti() {
  if (!multi) return;
  multi = null;
  multiComp = null;
  document.getElementById("my-multi-caret-layer")?.remove();
  document.getElementById("my-multi-style")?.remove();
  clearMultiHighlight();
  clearSameHighlight();
}

// --- 編集 ---
// kind: "insert"（data を入力）/ "backspace" / "delete"。全カーソルの位置に同じ操作を行う。
// opts.skip: その番号のカーソルは編集しない（IME確定のときは、主カーソルは入力済みなので飛ばす）
// opts.base: 編集前のカーソル位置の一覧（省略すると multi.carets）
// 後ろのカーソルから順に処理し、1か所ごとにDeepL側の再描画を待つ
async function applyMultiEdit(kind, data = "", opts = {}) {
  const editor = getSourceEditor();
  if (!multi || !editor) return;
  const base = opts.base || multi.carets;
  const skip = opts.skip ?? -1;
  const primary = multi.primary;
  const newPos = new Array(base.length).fill(0);
  const deltas = new Array(base.length).fill(0);

  if (!isFocusInSourceEditor()) editor.focus();

  for (let i = base.length - 1; i >= 0; i--) {
    if (!multi) return; // 途中で終了された
    const c = base[i];
    if (i === skip) {
      newPos[i] = c.e;
      continue;
    }
    const range = rangeFromOffsets(editor, c.s, c.e);
    if (!range) {
      newPos[i] = c.e;
      continue;
    }
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const before = multiTextLength(editor);
    multiApplying = true; // この間に出る beforeinput は自分のもの
    try {
      if (kind === "insert") document.execCommand("insertText", false, data);
      else if (kind === "backspace") document.execCommand("delete");
      else document.execCommand("forwardDelete");
    } finally {
      multiApplying = false;
    }
    await nextFrame();

    deltas[i] = multiTextLength(editor) - before;
    const cur = window.getSelection();
    const pos = cur.rangeCount ? offsetOf(editor, cur.focusNode, cur.focusOffset) : null;
    newPos[i] = pos ?? c.s;
  }
  if (!multi) return;

  // 後ろから編集したので、各カーソルは「手前のカーソルの増減ぶん」だけずらして確定する
  let shift = 0;
  const next = base.map((c, i) => {
    const p = newPos[i] + shift;
    shift += deltas[i];
    return { s: p, e: p };
  });
  const norm = normalizeCarets(next, primary);
  multi.carets = norm.carets;
  multi.primary = norm.primary;

  // 本物の選択（キャレット）は主カーソルに戻す
  const pc = multi.carets[multi.primary];
  const pr = rangeFromOffsets(editor, pc.s, pc.e);
  if (pr) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(pr);
  }
  refreshMultiMarks();
}

// 左右の矢印：dir = -1（左）/ 1（右）
// 選択状態のカーソルは、左なら選択の先頭、右なら選択の末尾にカーソルを置く。
// すでにカーソルだけのものは、1文字ぶん動かす（絵文字などのサロゲートペアは2単位まとめて動かす）
async function moveMultiCarets(dir) {
  const editor = getSourceEditor();
  if (!multi || !editor) return;
  const text = multiTextString(editor);
  const isHigh = (i) => { const c = text.charCodeAt(i); return c >= 0xd800 && c <= 0xdbff; };
  const isLow = (i) => { const c = text.charCodeAt(i); return c >= 0xdc00 && c <= 0xdfff; };

  const moved = multi.carets.map((c) => {
    let pos;
    if (c.s !== c.e) {
      pos = dir < 0 ? c.s : c.e;
    } else if (dir < 0) {
      pos = c.s - 1;
      if (pos > 0 && isLow(pos) && isHigh(pos - 1)) pos -= 1;
    } else {
      pos = c.s + 1;
      if (isHigh(c.s) && isLow(c.s + 1)) pos += 1;
    }
    pos = Math.max(0, Math.min(text.length, pos));
    return { s: pos, e: pos };
  });
  const norm = normalizeCarets(moved, multi.primary);
  multi.carets = norm.carets;
  multi.primary = norm.primary;

  // 本物のキャレットは主カーソルに置く
  const pc = multi.carets[multi.primary];
  const pr = rangeFromOffsets(editor, pc.s, pc.e);
  if (pr) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(pr);
  }
  refreshMultiMarks(); // 紫のマークは消え、紫の縦棒のカーソルだけになる
}

// IMEの確定後：主カーソルにはもう入力されているので、他のカーソルに同じ文字を入れる
async function syncCompositionToOthers(data, startLen) {
  await nextFrame(); // DeepL側の反映を待ってから状態を読む
  const editor = getSourceEditor();
  if (!multi || !editor) return;
  const sel = window.getSelection();
  const posAfter = sel.rangeCount ? offsetOf(editor, sel.focusNode, sel.focusOffset) : null;
  if (posAfter === null || !data || /[\r\n]/.test(data)) {
    exitMulti();
    return;
  }
  const primaryDelta = multiTextLength(editor) - startLen;
  const p = multi.primary;
  const base = multi.carets.map((c, i) => {
    if (i === p) return { s: posAfter - data.length, e: posAfter };
    if (i > p) return { s: c.s + primaryDelta, e: c.e + primaryDelta };
    return c;
  });
  await applyMultiEdit("insert", data, { skip: p, base });
}

// --- イベント ---
function onMultiKeydown(e) {
  // Ctrl+D（Macは Cmd+D）：ブラウザ標準のショートカット（ブックマーク登録など）は常に無効にする
  if (e.code === "KeyD" && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.isComposing && !e.repeat) enterMultiEdit();
    return;
  }

  if (!multi || e.isComposing) return;
  if (e.key === "Control" || e.key === "Meta" || e.key === "Shift" || e.key === "Alt") return;

  // 左右の矢印（修飾キーなし）：全カーソルを同時に動かす。選択状態のものはカーソルに変わる
  if (
    (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
    !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey
  ) {
    e.preventDefault();
    e.stopPropagation();
    const dir = e.key === "ArrowLeft" ? -1 : 1;
    enqueueMulti(() => moveMultiCarets(dir));
    return;
  }

  const k = e.key.toLowerCase();
  const isShortcut = e.ctrlKey || e.metaKey;
  // 移動・確定系のキーや、コピー/貼り付け以外のショートカットが押されたらマルチ編集を終わる
  if (MULTI_EXIT_KEYS.includes(e.key) || (isShortcut && k !== "c" && k !== "v")) {
    exitMulti();
  }
}

function onMultiBeforeInput(e) {
  if (!multi || multiApplying || e.isComposing) return;
  if (e.inputType === "insertCompositionText") return; // IMEは compositionend で同期する
  if (!isFocusInSourceEditor()) return;

  let kind = null;
  let data = "";
  if (e.inputType === "insertText" && e.data) {
    kind = "insert";
    data = e.data;
  } else if (e.inputType === "insertFromPaste") {
    data = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
    if (data && !/[\r\n]/.test(data)) kind = "insert";
  } else if (e.inputType === "deleteContentBackward") {
    kind = "backspace";
  } else if (e.inputType === "deleteContentForward") {
    kind = "delete";
  }

  if (!kind) {
    exitMulti(); // 改行・単語削除・元に戻す…などは、通常どおり主カーソルだけに適用して終了
    return;
  }
  // DeepL側に先に処理させない（全カーソルへの適用は自分で行う）
  e.preventDefault();
  e.stopPropagation();
  enqueueMulti(() => applyMultiEdit(kind, data));
}

function setupMultiEdit() {
  document.addEventListener("keydown", onMultiKeydown, true);
  document.addEventListener("beforeinput", onMultiBeforeInput, true);

  document.addEventListener(
    "compositionstart",
    () => {
      if (!multi || !isFocusInSourceEditor()) return;
      const editor = getSourceEditor();
      if (editor) multiComp = { len: multiTextLength(editor) };
    },
    true
  );
  document.addEventListener(
    "compositionend",
    (e) => {
      if (!multi || !multiComp) {
        multiComp = null;
        return;
      }
      const startLen = multiComp.len;
      multiComp = null;
      const data = e.data || "";
      enqueueMulti(() => syncCompositionToOthers(data, startLen));
    },
    true
  );

  // クリックしたら終了（クリック自体は通常どおり処理される）
  document.addEventListener(
    "mousedown",
    () => {
      if (multi) exitMulti();
    },
    true
  );
}

// ===== グループ：選択した文字をクリック → 名前と色を決めて、その行の左側に色付きの縦線を付ける =====
// DeepLのエディタのDOMは書き換えない。縦線は body 直下の専用レイヤーに重ねて描く。
// 縦線は「行（段落）の要素」を持ち主にして、毎フレーム位置を測り直す
// （折り返し・スクロール・ウィンドウ幅の変化に追従する）。行が削除されて要素がDOMから消えたら、縦線も消える。
const groups = []; // { id, name, color, spans: [{ first, last }] }  first / last: 範囲の最初・最後の行の要素
let groupSeq = 0;
let groupLastColor = GROUP_COLORS[5].value; // 前回選んだ色（次回のポップアップの初期値）
let groupPopover = null; // { root, saved, onOutside }
let groupPending = null; // mousedown 時点の { range, anchors, x, y }
let groupRaf = 0;
let groupTimer = 0; // 縦線が1本も出ていないとき用の、ゆっくりした見回り
let groupDirty = false; // true のとき、次のフレームで行との対応を取り直す・保存する
let groupSyncAt = 0;
let groupHasOrphan = false; // 行が見つからず宙に浮いている範囲があるか
let groupsLoaded = false; // 保存済みのグループを読み込み終えたか（終えるまでは保存しない）
let groupSavedJson = ""; // 最後に保存した内容（変化がないときは書き込まない）
let groupDrag = null; // 縦線の端をドラッグしている間の状態
let groupMove = null; // 縦線の何もない部分をドラッグして、行ごと動かしている間の状態
let groupDragGhost = null; // { root } タグと同じ見た目でマウスに追従させている要素（行ごと移動中だけ）
let groupBootUntil = 0; // この時刻までは、グループの付け直しを短い間隔で試す（リロード直後に文字が入るのを待つ）
let groupWarned = false;
const GROUP_DEBUG = true; // 原因調査用ログ。確認が終わったら false にする
let groupDebugAt = 0;
let groupHistoryUntil = 0; // Ctrl+Z / Ctrl+Y を押した直後のこの時刻までは、縮めた範囲を元の大きさに戻せるか確かめる
let groupSuppressClick = false; // タグをつまんで動かしたあとの「クリック」を無視するための印
let groupAltDown = false; // Alt（Mac は Option）を押している間 true。縦線にホバーしたとき「この要素だけ」を示すために使う

// 選択中の文字を表すハイライト（ポップアップの入力欄にフォーカスが移っても、対象の文字が見えるようにする）
function ensureGroupStyle() {
  const id = "my-group-style";
  document.getElementById(id)?.remove();
  // ページ全体の反転フィルターを考慮して、青背景＋白文字に見える色を逆算してある
  const { bg, fg } = CONFIG.forceDark
    ? { bg: "#79abff", fg: "#000000" }
    : { bg: "#2f64d0", fg: "#ffffff" };
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
::highlight(${GROUP_TARGET_HIGHLIGHT}) {
  background-color: ${bg};
  color: ${fg};
}
/* 縦線・ポップアップのレイヤーは popover（最上位レイヤー）で表示する。
   最上位レイヤーはページ全体の反転フィルターを受けないので、指定した色がそのまま出る。
   popover 既定のスタイル（中央寄せ・余白・枠・背景）は打ち消す */
#my-group-layer[popover] {
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  overflow: visible !important;
  max-width: none !important;
  max-height: none !important;
  color: inherit !important;
}
#my-group-layer,
#my-group-layer .my-group-bar,
#my-group-layer .my-group-popover,
#my-group-layer .my-ctx-menu {
  filter: none !important;
}
/* 縦線の端をドラッグしている間は、どこにいても上下矢印のカーソルにして、文字が選択されないようにする */
html.my-group-dragging,
html.my-group-dragging * {
  cursor: ns-resize !important;
  user-select: none !important;
}
/* 縦線をつかんで行ごと動かしている間 */
html.my-group-moving,
html.my-group-moving * {
  cursor: grabbing !important;
  user-select: none !important;
}`;
  (document.head || document.documentElement).appendChild(style);
}

// 縦線とポップアップを置くレイヤー（body直下）。中に縦線用の入れ物を1つ持つ
function ensureGroupLayer() {
  let layer = document.getElementById("my-group-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "my-group-layer";
    layer.setAttribute("popover", "manual"); // 自動では閉じない
    const hl = document.createElement("div"); // ホバー中のグループの文字を薄くマークする（縦線より奥）
    hl.className = "my-group-hl";
    layer.appendChild(hl);
    const bars = document.createElement("div");
    bars.className = "my-group-bars";
    // タグ（グループ名の突起）や縦線の端のつまみを押しても、エディタの選択やフォーカスを動かさない
    bars.addEventListener("mousedown", (e) => {
      if (e.target instanceof Element && e.target.closest(".my-group-bar")) e.preventDefault();
    });
    // 縦線の端のつまみをドラッグ：含める行を増減する
    bars.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !(e.target instanceof Element)) return;
      const grip = e.target.closest(".my-group-grip");
      const tag = e.target.closest(".my-group-tag");
      const bar = e.target.closest(".my-group-bar");
      if (!bar || !bar._g || !bar._sp) return;

      // 縦線の何もない部分：少し動かしたら、行ごとの移動を始める。
      // 同じグループのタグが連続しているときは、連続しているぶんをすべて一斉に動かす（Alt を押しながらなら、この要素だけ）
      if (!grip && !tag) {
        e.preventDefault();
        startGroupMove(bar._g, bar._sp, e, undefined, { single: e.altKey });
        return;
      }

      if (grip) {
        e.preventDefault();
        startGroupDrag(bar._g, bar._sp, grip.dataset.edge === "top" ? "top" : "bottom", e);
        return;
      }
      // タグ：少し動かしたらドラッグ（上の端を動かす）。動かさずに離せば、これまでどおりクリック（編集ポップアップ）
      const sx = e.clientX;
      const sy = e.clientY;
      const pid = e.pointerId;
      const g = bar._g;
      const sp = bar._sp;
      // 連なったタグの「⋮⋮」のつまみ、または Alt を押しながらのドラッグ：この要素だけを動かす
      const single = e.altKey || !!e.target.closest(".my-group-tag-grab");
      const cleanup = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", cleanup, true);
        window.removeEventListener("pointercancel", cleanup, true);
      };
      const move = (ev) => {
        if (ev.pointerId !== pid || Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        cleanup();
        groupSuppressClick = true;
        if (single || bar.classList.contains("is-compact")) {
          startGroupMove(g, sp, ev, { sx, sy }, { single: true }); // 1行だけのタグ・単体移動：この要素だけ行ごと動かす（範囲の調整は上下のつまみで）
          onGroupMoveMove(ev);
        } else {
          startGroupDrag(g, sp, "top", ev, sy);
        }
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", cleanup, true);
      window.addEventListener("pointercancel", cleanup, true);
    });
    // タグ（グループ名の突起）をクリック：編集ポップアップを開く（もう一度押すと閉じる）
    bars.addEventListener("click", (e) => {
      if (groupSuppressClick) {
        groupSuppressClick = false; // タグをつまんで動かしたあとは、ポップアップを開かない
        return;
      }
      if (!(e.target instanceof Element)) return;
      const tag = e.target.closest(".my-group-tag");
      const bar = tag && tag.closest(".my-group-bar");
      if (bar && bar._g) openGroupEditPopover(bar._g, tag, bar._sp);
    });
    bars.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target instanceof Element && e.target.matches(".my-group-tag")) {
        e.preventDefault();
        e.target.click();
      }
    });
    layer.appendChild(bars);
    document.body.appendChild(layer);
  }
  // 最上位レイヤーに出す（すでに表示中なら何もしない）
  try {
    if (!layer.matches(":popover-open")) layer.showPopover();
  } catch (_) {}
  return layer;
}

// テキストノードが属する「行」の要素。段落があればその段落、なければエディタ直下の子
function groupAnchorOf(editor, node) {
  const block = blockOf(editor, node);
  if (block !== editor) return block;
  let top = node;
  while (top.parentNode && top.parentNode !== editor) top = top.parentNode;
  return top;
}

// 選択範囲から、含まれる行の要素（anchors）と、選んだ文字の表示位置（rects）を集める
// （選択が次の行の先頭ぴったりで終わっているときは、次の行は含めない）
function groupSelectionInfo(editor, range) {
  const anchors = [];
  const rects = [];
  for (const node of editorTextNodes(editor)) {
    if (!range.intersectsNode(node)) continue;
    const from = node === range.startContainer ? range.startOffset : 0;
    const to = node === range.endContainer ? range.endOffset : node.nodeValue.length;
    if (to <= from) continue;
    const anchor = groupAnchorOf(editor, node);
    if (!anchors.includes(anchor)) anchors.push(anchor);
    const part = document.createRange();
    part.setStart(node, from);
    part.setEnd(node, to);
    rects.push(...part.getClientRects());
  }
  return { anchors, rects };
}

function groupNodeRect(node) {
  if (node.nodeType === Node.ELEMENT_NODE) return node.getBoundingClientRect();
  const r = document.createRange();
  r.selectNode(node);
  return r.getBoundingClientRect();
}

// 縦線1本ぶんの要素：縦線の本体と、その一番上の左に付くタグ（グループ名。クリックで編集ポップアップ）
function createGroupBar() {
  const d = document.createElement("div");
  d.className = "my-group-bar";
  // タグ（上端）をつまんで動かすと上の端、下端のつまみ（四角い突起）を動かすと下の端を調整できる
  // 1行しかないとき（.is-compact）は、タグとつまみが重なるので、つまみを縦線の上下の外側に出す。
  // その場合、上下のつまみで範囲を、タグをつまんで行ごとの移動をする
  d.innerHTML = `<div class="my-group-grip my-group-grip-top" data-edge="top" title="ドラッグして範囲を調整"></div>
<div class="my-group-grip" data-edge="bottom" title="ドラッグして範囲を調整"></div>
<div class="my-group-tag" role="button" tabindex="0"><span class="my-group-tag-grab" title="ドラッグして、この要素だけ移動">⋮⋮</span><span class="my-group-tag-name"></span></div>`;
  return d;
}

// エディタが実際に見えている縦の範囲（画面座標）。エディタを囲むスクロール領域・overflow で切られる領域と、画面の共通部分。
// スクロールで隠れた行の縦線やタグが、画面の手前（ほかの部品の上）に出てしまわないよう、この範囲で切り取る
let groupClipCache = { editor: null, nodes: [], at: 0 };
function groupVisibleBand(editor) {
  const now = performance.now();
  if (groupClipCache.editor !== editor || now - groupClipCache.at > 700) {
    const nodes = [];
    for (let n = editor; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowY !== "visible") nodes.push(n); // hidden / clip / auto / scroll
    }
    groupClipCache = { editor, nodes, at: now };
  }
  let top = 0;
  let bottom = window.innerHeight;
  for (const n of groupClipCache.nodes) {
    if (!n.isConnected) continue;
    const r = n.getBoundingClientRect();
    if (r.height <= 0) continue;
    top = Math.max(top, r.top);
    bottom = Math.min(bottom, r.bottom);
  }
  return { top, bottom: Math.max(top, bottom) };
}

// box の縦の表示範囲を band に切り取る（横は切らない。タグは縦線より左に出るため）。
// box は大きさ 0 のこともあるので、inset() ではなく座標で指定する
function clipGroupBox(box, band) {
  if (!box) return;
  const r = box.getBoundingClientRect();
  const t = (band.top - r.top).toFixed(1);
  const b = (band.bottom - r.top).toFixed(1);
  const v = `polygon(-100000px ${t}px, 100000px ${t}px, 100000px ${b}px, -100000px ${b}px)`;
  if (box._clip !== v) {
    box._clip = v;
    box.style.clipPath = v;
  }
}

// 縦線を描く。範囲（最初の行の上端〜最後の行の下端）を、途中の空行や行間も含めて1本につなげる。
// 消えた行の範囲・グループはここで取り除く
function renderGroupBars() {
  // 行が消えた範囲はここでは消さない（Ctrl+Z で戻ったときに復活できるよう、syncGroups が覚えておく）
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].spans.length === 0) groups.splice(i, 1);
  }
  // 描くものがあるときは、レイヤーが消えていたり最上位レイヤーから外れていたりしたら作り直す
  // （リロード直後はDeepLの再描画でレイヤーが失われることがあり、そのままだと縦線が出ない）
  const layer = groups.some((g) => g.spans.some(spanLive))
    ? ensureGroupLayer()
    : document.getElementById("my-group-layer");
  if (!layer) return;
  const box = layer.querySelector(".my-group-bars");
  let linesBox = layer.querySelector(".my-group-lines"); // 範囲の上下に引く薄いボーダー（縦線より奥）
  if (!linesBox) {
    linesBox = document.createElement("div");
    linesBox.className = "my-group-lines";
    layer.insertBefore(linesBox, box);
  }

  // body に filter があると position の基準が変わるので、レイヤー自身の位置を原点にして座標を出す
  const origin = layer.getBoundingClientRect();

  // 1) 各範囲の位置を測る
  const items = [];
  for (const g of groups) {
    for (const sp of g.spans) {
      if (!spanLive(sp)) continue; // 行が見つからない範囲は描かない
      const a = groupNodeRect(sp.first);
      const b = groupNodeRect(sp.last);
      const top = Math.min(a.top, b.top);
      const bottom = Math.max(a.bottom, b.bottom);
      if (bottom - top <= 0) continue;
      items.push({ g, sp, left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top, bottom, lane: 0 });
    }
  }

  // 2) 縦に重なる範囲は、別の列に置いて左へずらす
  items.sort((x, y) => x.top - y.top || x.bottom - y.bottom);
  const laneEnd = [];
  for (const it of items) {
    let k = laneEnd.findIndex((end) => end <= it.top + 0.5);
    if (k < 0) k = laneEnd.length;
    laneEnd[k] = it.bottom;
    it.lane = k;
  }

  // 行がすき間なく続いている同じグループの範囲を、1つの「連なり」として扱う（まとめて移動するため）
  const runOf = new Map();
  if (groups.some((g) => g.spans.length > 1)) {
    const ed = getSourceEditor();
    const lines = ed ? editorLines(ed) : [];
    for (const g of groups) {
      if (g.spans.length < 2) continue;
      for (const run of groupRunsOf(g, lines)) for (const s of run) runOf.set(s, run);
    }
  }

  while (box.children.length > items.length) box.lastChild.remove();
  while (box.children.length < items.length) box.appendChild(createGroupBar());

  // 3) 縦線とタグを更新する（名前・色・幅が変わったときだけ、タグの大きさを測り直す）
  const placed = []; // 配置済みのタグの位置（重なり避け用）
  let hoverIt = null; // いまマウスが乗っている縦線
  items.forEach((it, i) => {
    const d = box.children[i];
    const tag = d.querySelector(".my-group-tag");
    const g = it.g;
    d._g = g;
    d._sp = it.sp;
    it.run = runOf.get(it.sp) || [it.sp];

    // 縦線がタグ＋つまみより短い（1行だけ）ときは、コンパクト表示にする。切り替わったら、タグの大きさを測り直す
    const compact = it.bottom - it.top < (d._tagH || 22) + 14;
    if (d._compact !== compact) {
      d._compact = compact;
      d.classList.toggle("is-compact", compact);
      d._name = null;
    }
    // 連なり（2件以上）の一員か。変わったら、タグの大きさ・説明文を作り直す
    const runN = it.run.length;
    if (d._runN !== runN) {
      d._runN = runN;
      d.classList.toggle("is-run", runN > 1);
      d._name = null;
    }
    const dragState = groupDrag || groupMove;
    d.classList.toggle("is-dragging", !!dragState && (dragState.sps ? dragState.sps.includes(it.sp) : dragState.sp === it.sp));
    // 行ごと動かしている間（マウスに追従するタグを出しているあいだ）は、元の要素を半透明にする
    d.classList.toggle("is-move-ghost", !!groupMove && groupMove.active && groupMove.sps.includes(it.sp));
    if (d.matches(":hover")) {
      hoverIt = it;
      it.single = !!d.querySelector(".my-group-tag:hover, .my-group-grip:hover"); // タグ・つまみの上なら「この要素だけ」
    }

    const barX = it.left - GROUP_BAR.gap - GROUP_BAR.width - it.lane * GROUP_BAR.step; // 縦線の左端（画面上）
    const maxW = Math.max(40, Math.min(GROUP_TAG.maxWidth, barX + GROUP_BAR.width - 4)); // 画面の左端からはみ出さない

    const label = groupLabel(g, it.sp);
    if (d._name !== label || d._color !== g.color || d._maxW !== maxW) {
      d._name = label;
      d._color = g.color;
      d._maxW = maxW;
      d.style.backgroundColor = g.color;
      d.style.setProperty("--g-color", g.color); // つまみの色
      d.title = runN > 1
        ? `${label}\nドラッグ：連続する${runN}件をまとめて移動\nAlt+ドラッグ / ⋮⋮：この要素だけ移動`
        : label; // ホバーで「グループ名 アイテム名」の全文が見える
      tag.style.backgroundColor = g.color;
      tag.style.maxWidth = `${maxW}px`;
      tag.querySelector(".my-group-tag-name").textContent = label;
      tag.setAttribute("aria-label", `グループ「${label}」を編集`);
      d._tagW = tag.offsetWidth;
      d._tagH = tag.offsetHeight;
    }

    const key = `${(barX - origin.left).toFixed(1)}|${(it.top - origin.top).toFixed(1)}|${(it.bottom - it.top).toFixed(1)}`;
    if (d._key !== key) {
      d._key = key;
      d.style.left = `${barX - origin.left}px`;
      d.style.top = `${it.top - origin.top}px`;
      d.style.width = `${GROUP_BAR.width}px`;
      d.style.height = `${it.bottom - it.top}px`;
    }

    // タグは縦線の右端にそろえて、左へ突き出す。他のタグと重なるときは下へずらす
    const x1 = barX + GROUP_BAR.width;
    const x0 = x1 - d._tagW;
    let y = it.top;
    for (let moved = true; moved; ) {
      moved = false;
      for (const p of placed) {
        if (x0 < p.x1 && x1 > p.x0 && y < p.y1 + 2 && y + d._tagH > p.y0) {
          y = p.y1 + 2;
          moved = true;
        }
      }
    }
    placed.push({ x0, x1, y0: y, y1: y + d._tagH });
    const off = `${(y - it.top).toFixed(1)}px`;
    if (d._tagTop !== off) {
      d._tagTop = off;
      tag.style.top = off;
    }
  });

  // スクロールで見えなくなった部分は、縦線・タグ・線・ホバーの色を切り取る
  const editorNow = getSourceEditor();
  if (editorNow) {
    const band = groupVisibleBand(editorNow);
    clipGroupBox(box, band);
    clipGroupBox(linesBox, band);
    clipGroupBox(layer.querySelector(".my-group-hl"), band);
  }

  // ホバー中（ドラッグ中はドラッグしているグループ）の範囲の文字を、グループの色で薄くマークする
  const dragState2 = groupDrag || (groupMove && groupMove.active ? groupMove : null);
  let hlSps = null;
  let hlColor = "";
  if (dragState2) {
    hlSps = dragState2.sps || [dragState2.sp];
    hlColor = dragState2.g.color;
  } else if (hoverIt) {
    // 連なっているときは、連なり全体をマークする（タグ・つまみの上、または Alt を押している間は、その要素だけ）
    hlSps = hoverIt.single || groupAltDown ? [hoverIt.sp] : hoverIt.run;
    hlColor = hoverIt.g.color;
  }
  renderGroupHover(layer, origin, hlSps, hlColor);
}

// 同じグループの範囲のうち、行がすき間なく連続しているものを、上から順に「連なり」ごとの配列にして返す。
// （1件だけの範囲も、長さ1の連なりとして含む）
function groupRunsOf(g, lines) {
  const arr = [];
  for (const s of g.spans) {
    if (!spanLive(s)) continue;
    const a = groupLineIndex(lines, s.first);
    const b = groupLineIndex(lines, s.last);
    if (a >= 0 && b >= a) arr.push({ s, a, b });
  }
  arr.sort((x, y) => x.a - y.a);
  const runs = [];
  for (const x of arr) {
    const cur = runs[runs.length - 1];
    if (cur && cur[cur.length - 1].b + 1 === x.a) cur.push(x);
    else runs.push([x]);
  }
  return runs.map((r) => r.map((x) => x.s));
}

// sp を含む連なり（上から順）。見つからなければ sp だけ
function groupRunOf(g, sp, lines) {
  return groupRunsOf(g, lines).find((r) => r.includes(sp)) || [sp];
}

// Alt（Option）を押している間の状態を追う
function setupGroupAltKey() {
  const set = (e) => {
    groupAltDown = !!e.altKey;
  };
  window.addEventListener("keydown", set, true);
  window.addEventListener("keyup", set, true);
  window.addEventListener("blur", () => (groupAltDown = false));
}

// 範囲（複数可）に含まれる文字（折り返した行ごと）の背景に、薄い色の四角を重ねる。sps が null のときは消す
function renderGroupHover(layer, origin, sps, color) {
  const box = layer.querySelector(".my-group-hl");
  if (!box) return;
  const rects = [];
  const editor = sps && sps.length ? getSourceEditor() : null;
  if (editor) {
    const live = sps.filter(spanLive);
    for (const n of editorTextNodes(editor)) {
      if (!n.nodeValue.trim() || !live.some((s) => groupSpanHasNode(s, n))) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const q of r.getClientRects()) if (q.width > 0 && q.height > 0) rects.push(q);
    }
  }
  while (box.children.length > rects.length) box.lastChild.remove();
  while (box.children.length < rects.length) {
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;border-radius:2px;opacity:0.2;pointer-events:none;";
    box.appendChild(d);
  }
  rects.forEach((q, i) => {
    const d = box.children[i];
    d.style.backgroundColor = color;
    d.style.left = `${q.left - origin.left}px`;
    d.style.top = `${q.top - origin.top}px`;
    d.style.width = `${q.width}px`;
    d.style.height = `${q.height}px`;
  });
}

function groupLoop() {
  groupRaf = 0;
  groupTimer = 0;
  // 行との対応の取り直し：編集があったとき、または宙に浮いた範囲を探し続けるとき（たまに）
  const now = performance.now();
  const booting = now < groupBootUntil;
  if (groupDirty || (groupHasOrphan && now - groupSyncAt > (booting ? 80 : 1500))) syncGroups();
  renderGroupBars();
  const anyLive = groups.some((g) => g.spans.some(spanLive));
  if (anyLive || groupDirty) groupRaf = requestAnimationFrame(groupLoop);
  else if (groups.length) groupTimer = setTimeout(groupLoop, booting ? 80 : 500); // 縦線がないあいだは見回る（リロード直後は短い間隔で）
  if (!booting && groupHasOrphan && !anyLive && !groupWarned && groupBootUntil) {
    groupWarned = true;
    console.warn("[group] 保存したグループに合う行が見つかりません。文章が保存時と違う可能性があります");
  }
}

function startGroupLoop() {
  if (groupRaf) return;
  if (groupTimer) {
    clearTimeout(groupTimer);
    groupTimer = 0;
  }
  groupRaf = requestAnimationFrame(groupLoop);
}

// グループの内容が変わった（または、行の変化があったかもしれない）と伝える。次のフレームで対応の取り直しと保存を行う
function touchGroups() {
  groupDirty = true;
  startGroupLoop();
}

// ===== 行との対応づけ・保存・復元 =====
// 範囲（span）は「最初の行の要素 / 最後の行の要素」を持つが、DeepLは Ctrl+Z などで行の要素を作り直すことがある。
// そのたびにグループを消すのではなく、次のようにする：
//   ・生きている範囲 … 含まれる行の文字を「記録」として覚えておく（毎回更新・履歴つき）
//   ・行の要素が消えた範囲 … グループは残し、見えない状態（宙に浮いた状態）にする
//   ・宙に浮いた範囲 … 行が作り直されて、記録と同じ文字の行が現れたら、そこへ付け直す
// 記録は chrome.storage にも保存するので、ページを再読み込みしたあとも、同じ文字の行にグループが戻る。
// タグに出す文字：「グループ名 アイテム名」
function groupLabel(g, sp) {
  return [g.name, sp && sp.item].filter(Boolean).join(" ");
}

function makeSpan(first, last, item = "") {
  return { first, last, item, a: -1, snaps: [], lostAt: 0, full: null, els: [], total: 0, undo: [] }; // item: アイテム名（グループの中の、この範囲の名前） // a: 最後に確認した行番号 / snaps: 行の文字の記録（新しい順）
}

function spanLive(sp) {
  return !!(sp.first && sp.last && sp.first.isConnected && sp.last.isConnected);
}

// 照合用の文字：改行の差・NBSP・行末の空白の違いで一致しなくならないよう、そろえてから比べる
const normSnap = (t) => String(t).replace(/\u00a0/g, " ").replace(/\s+$/, "").slice(0, GROUP_SNAP_TEXT_MAX);
const snapText = (el) => normSnap(groupLineText(el));

// 行の探索先。編集できる状態のエディタがまだないとき（リロード直後など）は、翻訳元の入力欄そのものを使う
function getGroupEditor() {
  const ed = getSourceEditor();
  if (ed) return ed;
  for (const selector of CONFIG.sourceSelectors) {
    const node = document.querySelector(selector);
    if (node) return node;
  }
  return null;
}

function pushSnap(sp, texts) {
  const cur = sp.snaps[0];
  if (cur && cur.length === texts.length && cur.every((t, i) => t === texts[i])) return;
  sp.snaps.unshift(texts);
  if (sp.snaps.length > GROUP_SNAP_HISTORY) sp.snaps.length = GROUP_SNAP_HISTORY;
}

// 宙に浮いた範囲に合う行の並びを探す。記録のどれかと（ほぼ）同じ文字の並びで、元の位置に近いものを選ぶ。
// 空行だけが一致しても合致とは見なさない。すでに別の範囲が使っている行（taken）は選ばない
function findSpanMatch(sp, T, total, taken) {
  let best = null;
  for (const snap of sp.snaps) {
    const n = snap.length;
    if (n === 0 || n > total) continue;
    for (let i = 0; i + n <= total; i++) {
      let clash = false;
      for (let k = 0; k < n; k++) {
        if (taken.has(i + k)) {
          clash = true;
          break;
        }
      }
      if (clash) continue;
      let hit = 0;
      let score = 0;
      for (let k = 0; k < n; k++) {
        if (T(i + k) !== snap[k]) continue;
        if (snap[k]) {
          hit++;
          score += 1;
        } else {
          score += 0.5;
        }
      }
      const ratio = score / n;
      if (hit === 0 || ratio < 0.6) continue;
      const dist = Math.abs(i - sp.a);
      if (!best || ratio > best.ratio || (ratio === best.ratio && dist < best.dist)) best = { i, n, ratio, dist };
    }
  }
  return best;
}

// 範囲の行の「一部だけ」がDOMから消えたとき、残っている行（最初〜最後）に範囲を縮める。1行も残っていなければ false。
// 縮める前の状態（行の文字・位置・全体の行数）は sp.undo に積んでおく（Ctrl+Z で戻ったときに広げ直すため）
function shrinkSpanToSurvivors(sp, editor) {
  if (!editor || !sp.els || sp.els.length === 0) return false;
  const alive = sp.els.filter((el) => el.isConnected && editor.contains(el));
  if (alive.length === 0) return false;
  if (sp.snaps[0] && sp.total) {
    sp.undo.push({ texts: sp.snaps[0].slice(), a: sp.a, total: sp.total });
    if (sp.undo.length > 8) sp.undo.shift();
  }
  sp.first = alive[0];
  sp.last = alive[alive.length - 1];
  if (GROUP_DEBUG) console.log("[group-debug] 一部の行が消えたので範囲を縮めました", sp.els.length, "→", alive.length);
  return true;
}

// Ctrl+Z / Ctrl+Y（Cmd+Z など）を押した直後の短い間だけ、「縮めた範囲を元に戻せるか」を確かめる
function setupGroupHistory() {
  const mark = () => {
    groupHistoryUntil = performance.now() + 2000;
    if (groups.length) touchGroups();
  };
  document.addEventListener(
    "keydown",
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "z" || k === "y") mark();
    },
    true
  );
  document.addEventListener(
    "beforeinput",
    (e) => {
      if (e.inputType === "historyUndo" || e.inputType === "historyRedo") mark();
    },
    true
  );
}

// ===== グループの最後の行の末尾で Enter =====
//   1回目：普通に改行して、できた新しい行までグループを伸ばす
//   2回目（グループの最後の行が空行のとき）：その空行をグループから外す（改行は増やさない）。外れた行は、グループのない空白の行になる
// 日本語入力の変換中の Enter、Shift / Ctrl / Alt / Cmd つきの Enter、複数カーソル編集中は対象外
async function extendGroupAfterEnter(sp, idx, total) {
  const editor = getSourceEditor();
  if (!editor) return;
  let lines = null;
  for (let i = 0; i < 60; i++) {
    await nextFrame(); // DeepL側の再描画待ち（先に次の Enter が来て行が増えていても、1行以上増えていれば進む）
    lines = editorLines(editor);
    if (lines.length > total) break;
  }
  if (!lines || lines.length <= total || !spanLive(sp)) return;
  if (groupLineIndex(lines, sp.last) !== idx) return;
  const next = lines[idx + 1];
  if (!next) return;
  sp.last = next;
  touchGroups();
  renderGroupBars();
}

function onGroupEnterKey(e) {
  if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
  if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
  if (multi || groups.length === 0 || !isFocusInSourceEditor()) return;
  const editor = getSourceEditor();
  const sel = window.getSelection();
  if (!editor || !sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return;

  const lines = editorLines(editor);
  let node = range.startContainer;
  if (node === editor) node = editor.childNodes[range.startOffset] || editor.lastChild;
  const idx = groupLineIndex(lines, node);
  if (idx < 0) return;

  // この行が最後の行になっている範囲を探す
  let hit = null;
  for (const g of groups) {
    for (const sp of g.spans) {
      if (!spanLive(sp)) continue;
      if (groupLineIndex(lines, sp.last) !== idx) continue;
      hit = { g, sp, a: groupLineIndex(lines, sp.first) };
    }
  }
  if (!hit) return;

  // カーソルが行の末尾にあるか
  const end = groupLineEdge(lines[idx], true);
  const tail = document.createRange();
  tail.setStart(range.startContainer, range.startOffset);
  tail.setEnd(end.node, end.off);
  if (tail.toString() !== "") return;

  const isBlank = groupLineText(lines[idx]).trim() === "";
  if (isBlank && hit.a >= 0 && hit.a < idx) {
    // 2回目：空行をグループから外す。Enter は DeepL に渡さない（行は増やさない）
    e.preventDefault();
    e.stopPropagation();
    hit.sp.last = lines[idx - 1];
    touchGroups();
    renderGroupBars();
    return;
  }

  // 1回目：Enter は普通に処理させて、できた新しい行までグループを伸ばす
  extendGroupAfterEnter(hit.sp, idx, lines.length).catch((err) => console.error("[group] Enterでの延長に失敗:", err));
}

function setupGroupEnter() {
  document.addEventListener("keydown", onGroupEnterKey, true);
}

function syncGroups() {
  groupDirty = false;
  groupSyncAt = performance.now();

  const editor = getGroupEditor();

  // 1) 行の要素が消えた範囲
  //    ・含まれていた行の「一部だけ」が消えたとき（空行を Backspace で消した／後ろの行を含めて文字を消した など）は、
  //      残っている行だけに縮める。グループは残す。縮める前の状態は sp.undo に覚えておき、Ctrl+Z で戻ったら広げ直す
  //    ・すべての行が消えたときだけ、グループを残したまま宙に浮かせる（あとで同じ文字の行が現れたら付け直す）
  for (const g of groups) {
    for (const sp of g.spans) {
      if (spanLive(sp)) continue;
      if (sp.first && sp.last && shrinkSpanToSurvivors(sp, editor)) continue;
      sp.first = sp.last = null;
      if (!sp.lostAt) sp.lostAt = Date.now();
    }
  }

  if (editor) {
    const lines = editorLines(editor);
    const texts = new Array(lines.length);
    const T = (i) => (texts[i] ??= snapText(lines[i])); // 必要な行だけ文字を取り出す
    const taken = new Set(); // 生きている範囲が使っている行

    // 2) 生きている範囲：行の位置を調べる
    const live = [];
    for (const g of groups) {
      for (const sp of g.spans) {
        if (!spanLive(sp)) continue;
        const a = groupLineIndex(lines, sp.first);
        const b = groupLineIndex(lines, sp.last);
        // 現在のエディタの行に含まれない、または画面上に表示されていない要素を指している範囲は、
        // 「生きている」扱いにせず宙に浮かせて、あとで正しい行へ付け直す
        // （リロード直後に見えない要素へ付いたまま、再照合されなくなるのを防ぐ）
        const ra = a >= 0 ? groupNodeRect(sp.first) : null;
        if (a < 0 || b < a || (ra.width === 0 && ra.height === 0)) {
          sp.first = sp.last = null;
          if (!sp.lostAt) sp.lostAt = Date.now();
          continue;
        }
        sp.lostAt = 0;
        live.push({ sp, a, b });
        for (let i = a; i <= b; i++) taken.add(i);
      }
    }

    // 2b) Ctrl+Z / Ctrl+Y の直後だけ：縮めた範囲が、縮める前と同じ文章・同じ行数に戻っていたら、元の大きさに広げ直す。
    //     （ふだんは広げない。空行を消したあとに、下にある別の空行を巻き込んで元に戻ってしまうのを防ぐため）
    if (performance.now() < groupHistoryUntil) {
      for (const x of live) {
        const list = x.sp.undo;
        if (!list || list.length === 0) continue;
        for (let j = list.length - 1; j >= 0; j--) {
          const u = list[j];
          const n = u.texts.length;
          const cur = x.b - x.a + 1;
          if (lines.length !== u.total || x.a !== u.a || cur >= n) continue;
          let ok = true;
          for (let k = cur; k < n && ok; k++) if (taken.has(x.a + k)) ok = false; // 別の範囲の行は取らない
          for (let k = 0; k < n && ok; k++) if (T(x.a + k) !== u.texts[k]) ok = false;
          if (!ok) continue;
          x.b = x.a + n - 1;
          x.sp.last = lines[x.b];
          for (let k = cur; k < n; k++) taken.add(x.a + k);
          list.splice(j, 1);
          break;
        }
      }
    }

    // 2c) 行の位置・文字・要素を記録し直す
    for (const x of live) {
      const { sp, a, b } = x;
      sp.a = a;
      pushSnap(sp, Array.from({ length: b - a + 1 }, (_, k) => T(a + k)));
      sp.full = Array.from({ length: b - a + 1 }, (_, k) => groupLineText(lines[a + k])); // 代入用に、切り詰めない全文も覚える
      sp.els = lines.slice(a, b + 1); // 一部の行だけ消えたとき、残った行を見つけるために覚えておく
      sp.total = lines.length;
    }

    // 3) 宙に浮いた範囲：同じ文字の行が現れていたら、付け直す
    const orphans = [];
    for (const g of groups) for (const sp of g.spans) if (!spanLive(sp)) orphans.push(sp);
    orphans.sort((x, y) => x.a - y.a);
    for (const sp of orphans) {
      const hit = findSpanMatch(sp, T, lines.length, taken);
      if (!hit) continue;
      sp.first = lines[hit.i];
      sp.last = lines[hit.i + hit.n - 1];
      sp.a = hit.i;
      sp.lostAt = 0;
      for (let k = 0; k < hit.n; k++) taken.add(hit.i + k);
      pushSnap(sp, Array.from({ length: hit.n }, (_, k) => T(hit.i + k)));
      sp.full = Array.from({ length: hit.n }, (_, k) => groupLineText(lines[hit.i + k]));
      sp.els = lines.slice(hit.i, hit.i + hit.n);
      sp.total = lines.length;
    }
  }

  // 4) 後片付け：記録のない範囲・空行だけの宙に浮いた範囲は捨てる。宙に浮いた範囲が多すぎるときは、古いものから捨てる
  for (const g of groups) {
    g.spans = g.spans.filter((sp) => spanLive(sp) || sp.snaps[0]?.some((t) => t));
  }
  const floating = [];
  for (const g of groups) for (const sp of g.spans) if (!spanLive(sp)) floating.push({ g, sp });
  if (floating.length > GROUP_ORPHAN_MAX) {
    floating.sort((x, y) => y.sp.lostAt - x.sp.lostAt);
    for (const { g, sp } of floating.slice(GROUP_ORPHAN_MAX)) g.spans = g.spans.filter((s) => s !== sp);
  }
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].spans.length === 0) groups.splice(i, 1);
  }
  if (GROUP_DEBUG && performance.now() - groupDebugAt > 1000) {
    groupDebugAt = performance.now();
    const ed = getGroupEditor();
    const ls = ed ? editorLines(ed) : [];
    console.log("[group-debug] sync", {
      editor: ed ? ed.tagName + (ed.isContentEditable ? "(editable)" : "") : null,
      lines: ls.slice(0, 8).map((l) => snapText(l)),
      spans: groups.flatMap((g) => g.spans.map((sp) => ({ live: spanLive(sp), a: sp.a, snap: sp.snaps[0] }))),
    });
  }
  groupHasOrphan = groups.some((g) => g.spans.some((sp) => !spanLive(sp)));

  syncGroupLibrary(); // 名前・色・中身をライブラリに反映する（解除・削除したあとも残す）

  saveGroups();
}

// 保存する形：グループ名・色・各範囲の（行番号, 行の文字）
function serializeGroups() {
  const data = groups
    .map((g) => ({
      libId: g.libId,
      name: g.name,
      color: g.color,
      spans: g.spans.filter((sp) => sp.snaps[0]).map((sp) => ({ a: sp.a, item: sp.item || "", texts: sp.snaps[0] })),
    }))
    .filter((g) => g.spans.length > 0);
  return { data, json: JSON.stringify(data) };
}

function saveGroups() {
  if (!groupsLoaded) return; // 保存済みの内容を読み込む前に、空の状態で上書きしない
  const { data, json } = serializeGroups();
  if (json === groupSavedJson) return;
  groupSavedJson = json;
  storageSet({ [GROUP_STORAGE_KEY]: data });
}

// ページを開いたとき、保存済みのグループを読み込む。行はまだ見つかっていないので、最初は宙に浮いた状態にして、
// エディタに同じ文字の行が現れたら syncGroups が付け直す
async function loadSavedGroups() {
  const stored = await storageGet([GROUP_STORAGE_KEY, GROUP_LIBRARY_KEY]);
  const saved = stored[GROUP_STORAGE_KEY];
  groupLibrary = sanitizeLibrary(stored[GROUP_LIBRARY_KEY]); // 保存してあるグループ（解除・削除したものも含む）
  groupLibSavedJson = JSON.stringify(groupLibrary);
  groupLibLoaded = true;
  if (Array.isArray(saved)) {
    for (const x of saved) {
      if (!x || typeof x.name !== "string" || !/^#[0-9a-f]{3,8}$/i.test(String(x.color)) || !Array.isArray(x.spans)) continue;
      const spans = [];
      for (const s of x.spans) {
        if (!s || !Array.isArray(s.texts) || s.texts.length === 0 || !s.texts.every((t) => typeof t === "string")) continue;
        const sp = makeSpan(null, null);
        sp.a = Number.isInteger(s.a) ? s.a : 0;
        sp.item = typeof s.item === "string" ? s.item.slice(0, GROUP_ITEM_MAX) : "";
        sp.snaps = [s.texts.map(normSnap)];
        sp.lostAt = Date.now();
        spans.push(sp);
      }
      if (spans.length) {
        const name = x.name.slice(0, GROUP_NAME_MAX) || "グループ";
        const libId = (typeof x.libId === "string" && x.libId) || findLibByNameColor(name, x.color)?.id || newLibId();
        groups.push({ id: ++groupSeq, name, color: x.color, libId, spans });
      }
    }
  }
  if (GROUP_DEBUG) console.log("[group-debug] loaded", { saved: Array.isArray(saved) ? saved.length : saved, groups: groups.length });
  groupsLoaded = true;
  groupSavedJson = "";
  groupBootUntil = performance.now() + 30000; // 30秒のあいだは、文字が入った瞬間に付け直せるよう短い間隔で探す
  if (groups.length) {
    ensureGroupLayer();
    touchGroups();
  }
}

// エディタが編集されたら（DOMが変わったら）、行との対応を取り直す。グループの縦線・ポップアップ自身の変化は無視する
function setupGroupObserver() {
  new MutationObserver((mutations) => {
    if (groups.length === 0) return;
    const skip = [
      document.getElementById("my-group-layer"),
      document.getElementById(CONFIG.injectedId),
      document.getElementById("my-multi-caret-layer"),
    ];
    if (mutations.some((m) => !skip.some((s) => s && s.contains(m.target)))) touchGroups();
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  // DOMの変化として見えない更新に備えて、操作があったときも、宙に浮いたグループがあれば探し直す
  ["focusin", "selectionchange", "input", "pointerdown", "keyup"].forEach((type) =>
    document.addEventListener(type, () => { if (groupHasOrphan) touchGroups(); }, true)
  );
}

// ===== 縦線の何もない部分をドラッグして、その範囲の行を上下に動かす =====
// 同じグループのタグ（範囲）が連続しているときは、連続しているぶんをすべて一斉に動かす。
//   ・この要素だけ動かしたいとき：Alt（Option）を押しながらドラッグ / タグの左の「⋮⋮」をドラッグ / タグ（1行だけのとき）をドラッグ
// ドラッグ中は、落とす位置（行と行のあいだ）に、グループの色の横線を出す。離すと、その位置へ行ごと移動する。
// 移動は「元の行を削除 → 落とす位置に空行を作る → 同じ文字を貼り付けてグループを付け直す」で行う
// （DeepLのエディタは直接書き換えられないため）。元の位置と同じ・範囲の中には落とせない。Esc で取り消す。
const GROUP_MOVE_THRESHOLD = 5; // この距離(px)以上動かしたら、移動のドラッグとみなす

// 行の先頭・末尾にあたる位置（range の端に使う）。文字のない行は、行の要素の先頭
function groupLineEdge(el, atEnd) {
  if (el.nodeType === Node.TEXT_NODE) return { node: el, off: atEnd ? el.nodeValue.length : 0 };
  let first = null;
  let last = null;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!first) first = n;
    last = n;
  }
  if (!first) return { node: el, off: 0 };
  return atEnd ? { node: last, off: last.nodeValue.length } : { node: first, off: 0 };
}

function groupCaretAt(point) {
  const r = document.createRange();
  r.setStart(point.node, point.off);
  r.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}

// 行数が expected になるまで待つ（DeepL側の再描画待ち。最大 約1秒）。なったら true
async function waitForLineCount(editor, expected) {
  for (let i = 0; i < 60; i++) {
    await nextFrame();
    if (editorLines(editor).length === expected) return true;
  }
  return editorLines(editor).length === expected;
}

// y の位置に一番近い「行と行のあいだ」の番号（0 = 最初の行の前、lines.length = 最後の行の後ろ）
function groupBoundaryAtY(lines, y) {
  for (let i = 0; i < lines.length; i++) {
    const r = groupNodeRect(lines[i]);
    if (!r.width && !r.height) continue;
    if (y < (r.top + r.bottom) / 2) return i;
  }
  return lines.length;
}

// 番号 k の「あいだ」の画面上の高さ
function groupBoundaryY(lines, k) {
  const top = (i) => groupNodeRect(lines[i]).top;
  const bottom = (i) => groupNodeRect(lines[i]).bottom;
  if (k <= 0) return top(0);
  if (k >= lines.length) return bottom(lines.length - 1);
  return (bottom(k - 1) + top(k)) / 2;
}

function removeGroupMoveIndicator() {
  document.getElementById("my-group-drop")?.remove();
}

// タグと同じ見た目の小さな要素を、マウスの動きに合わせて出す（「持っている」感を出すため）。
// 連なった複数件をまとめて動かしているときは、件ごとに分けて出し、それぞれ半透明にする
function showGroupDragGhost(m) {
  hideGroupDragGhost();
  const layer = ensureGroupLayer();
  const root = document.createElement("div");
  root.className = "my-group-drag-ghost";
  for (const sp of m.sps) {
    const chip = document.createElement("div");
    chip.className = "my-group-drag-chip";
    chip.style.backgroundColor = m.g.color;
    chip.innerHTML = `<span class="my-group-tag-grab" aria-hidden="true">⋮⋮</span><span class="my-group-tag-name"></span>`;
    chip.querySelector(".my-group-tag-name").textContent = groupLabel(m.g, sp);
    root.appendChild(chip);
  }
  layer.appendChild(root);
  groupDragGhost = { root };
  updateGroupDragGhostPos(m.x, m.y);
}

// マウスの少し右下に出す（カーソルそのものに隠れないように）
function updateGroupDragGhostPos(x, y) {
  if (!groupDragGhost) return;
  const layer = document.getElementById("my-group-layer");
  if (!layer) return;
  const origin = layer.getBoundingClientRect();
  groupDragGhost.root.style.left = `${x - origin.left + 14}px`;
  groupDragGhost.root.style.top = `${y - origin.top + 10}px`;
}

function hideGroupDragGhost() {
  if (!groupDragGhost) return;
  groupDragGhost.root.remove();
  groupDragGhost = null;
}

// 落とす位置の横線。t が -1（落とせない位置）のときは消す
function renderGroupMoveIndicator(editor, lines, t, color) {
  if (t < 0) {
    removeGroupMoveIndicator();
    return;
  }
  const layer = ensureGroupLayer();
  let bar = document.getElementById("my-group-drop");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "my-group-drop";
    bar.style.cssText = "position:absolute;height:3px;border-radius:2px;pointer-events:none;box-shadow:0 0 0 1px rgba(0,0,0,0.5);";
    layer.appendChild(bar);
  }
  const origin = layer.getBoundingClientRect();
  const er = editor.getBoundingClientRect();
  bar.style.backgroundColor = color;
  bar.style.left = `${er.left - origin.left}px`;
  bar.style.width = `${er.width}px`;
  bar.style.top = `${groupBoundaryY(lines, t) - origin.top - 1.5}px`;
}

function updateGroupMove() {
  const m = groupMove;
  if (!m || !m.active) return;
  m.raf = 0;
  const editor = getSourceEditor();
  if (!editor || !m.sps.every(spanLive)) {
    m.t = -1;
    removeGroupMoveIndicator();
    return;
  }
  const lines = editorLines(editor);
  const a = groupLineIndex(lines, m.sps[0].first);
  const b = groupLineIndex(lines, m.sps[m.sps.length - 1].last);
  if (a < 0 || b < a || !lines.length) {
    m.t = -1;
    removeGroupMoveIndicator();
    return;
  }
  const t = groupBoundaryAtY(lines, m.y);
  m.t = t < a || t > b + 1 ? t : -1; // 自分の範囲の中・すぐ前後は、動かないのと同じ
  renderGroupMoveIndicator(editor, lines, m.t, m.g.color);
}

function onGroupMoveMove(e) {
  const m = groupMove;
  if (!m || e.pointerId !== m.pointerId) return;
  m.x = e.clientX;
  m.y = e.clientY;
  if (!m.active) {
    if (Math.hypot(e.clientX - m.sx, e.clientY - m.sy) < GROUP_MOVE_THRESHOLD) return;
    m.active = true;
    closeGroupPopover();
    exitMulti();
    document.documentElement.classList.add("my-group-moving");
    showGroupDragGhost(m); // タグと同じ見た目の要素をマウスに追従させる
    renderGroupBars(); // 元の要素を半透明にする
  }
  if (groupDragGhost) updateGroupDragGhostPos(m.x, m.y);
  e.preventDefault();
  if (!m.raf) m.raf = requestAnimationFrame(updateGroupMove);
}

function onGroupMoveUp(e) {
  const m = groupMove;
  if (!m || e.pointerId !== m.pointerId) return;
  if (m.active && e.type === "pointerup") {
    m.y = e.clientY;
    updateGroupMove(); // 最後の位置で決め直す
  }
  endGroupMove(e.type === "pointercancel");
}

function onGroupMoveKey(e) {
  if (e.key !== "Escape" || !groupMove) return;
  e.preventDefault();
  e.stopPropagation();
  endGroupMove(true);
}

// from: 押した位置 { sx, sy }（省略すると、いまのイベントの位置）。タグから始めるときは、つまんだ位置を渡す
// opts.single: true のとき、この要素（sp）だけを動かす。false のときは、sp を含む連続した同じグループの範囲を、まとめて動かす
function startGroupMove(g, sp, e, from, opts = {}) {
  if (groupDrag || groupMove || g._moving || !spanLive(sp)) return;
  const editor = getSourceEditor();
  const sps = opts.single || !editor ? [sp] : groupRunOf(g, sp, editorLines(editor));
  groupMove = {
    g, sp, sps, pointerId: e.pointerId,
    sx: from ? from.sx : e.clientX, sy: from ? from.sy : e.clientY,
    x: e.clientX, y: e.clientY, active: false, t: -1, raf: 0,
  };
  window.addEventListener("pointermove", onGroupMoveMove, true);
  window.addEventListener("pointerup", onGroupMoveUp, true);
  window.addEventListener("pointercancel", onGroupMoveUp, true);
  window.addEventListener("keydown", onGroupMoveKey, true);
}

function endGroupMove(cancel) {
  const m = groupMove;
  if (!m) return;
  groupMove = null;
  if (m.raf) cancelAnimationFrame(m.raf);
  window.removeEventListener("pointermove", onGroupMoveMove, true);
  window.removeEventListener("pointerup", onGroupMoveUp, true);
  window.removeEventListener("pointercancel", onGroupMoveUp, true);
  window.removeEventListener("keydown", onGroupMoveKey, true);
  document.documentElement.classList.remove("my-group-moving");
  removeGroupMoveIndicator();
  hideGroupDragGhost(); // マウスに追従させていたタグを消す
  if (m.active) groupSuppressClick = true; // 離した直後のクリック（タグなど）は無視する
  if (m.active) setTimeout(() => (groupSuppressClick = false), 50);
  if (!cancel && m.active && m.t >= 0) {
    moveGroupSpans(m.g, m.sps, m.t).catch((err) => console.error("[group] 行の移動に失敗:", err));
  }
  renderGroupBars();
}

// 範囲（sps：上から順に、行がすき間なく続いているもの）の行を、まとめて t（行と行のあいだの番号。元の行番号で数える）の位置へ動かす。
// 1件だけ渡せば、その範囲だけが動く。複数渡したときは、それぞれのアイテム名・相対的な位置を保ったまま動く
async function moveGroupSpans(g, sps, t) {
  const editor = getSourceEditor();
  if (!editor || g._moving || sps.length === 0 || !sps.every(spanLive)) return;
  let lines = editorLines(editor);
  const a = groupLineIndex(lines, sps[0].first);
  const b = groupLineIndex(lines, sps[sps.length - 1].last);
  const n = b - a + 1;
  if (a < 0 || b < a || (t >= a && t <= b + 1) || n >= lines.length) return;

  g._moving = true;
  const { name, color } = g;
  // 各範囲が、動かすブロックの何行目から何行目か（0始まり）
  const parts = sps.map((sp) => ({
    item: sp.item || "",
    start: groupLineIndex(lines, sp.first) - a,
    end: groupLineIndex(lines, sp.last) - a,
  }));
  const texts = [];
  for (let k = a; k <= b; k++) texts.push(groupLineText(lines[k]));
  const total = lines.length;
  let removed = false;

  try {
    exitMulti();
    closeGroupPopover();
    syncGroups(); // 動かす前の状態を記録しておく
    g.spans = g.spans.filter((s) => !sps.includes(s)); // 貼り付け直すときに付け直すので、古い範囲は外す

    // 1) 元の行を、前後の改行ごと削除する（空行を残さない）
    const range = document.createRange();
    let from;
    let to;
    if (a > 0) {
      from = groupLineEdge(lines[a - 1], true);
      to = groupLineEdge(lines[b], true);
    } else {
      from = groupLineEdge(lines[0], false);
      to = groupLineEdge(lines[b + 1], false);
    }
    range.setStart(from.node, from.off);
    range.setEnd(to.node, to.off);
    if (!isFocusInSourceEditor()) editor.focus({ preventScroll: true });
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("delete");
    await waitForLineCount(editor, total - n);
    lines = editorLines(editor);
    if (lines.length === total) {
      // 何も消えなかった：元に戻して終わる
      g.spans.push(...sps);
      console.warn("[group] 行を削除できなかったため、移動をやめました");
      return;
    }
    removed = true;

    // 2) 落とす位置に空行を1つ作る
    const newT = Math.min(t > b ? t - n : t, lines.length);
    if (newT === 0) groupCaretAt(groupLineEdge(lines[0], false));
    else groupCaretAt(groupLineEdge(lines[newT - 1], true));
    const before = lines.length;
    document.execCommand("insertParagraph");
    await waitForLineCount(editor, before + 1);
    lines = editorLines(editor);
    if (!lines[newT]) throw new Error("空行を作れませんでした");
    groupCaretAt(groupLineEdge(lines[newT], false));

    // 3) 同じ文字を貼り付けて、グループを付け直す（貼り付けと同じ処理）。連なっていた範囲は、まとめて付け直る
    await pasteGroupedText({
      text: texts.join("\n"),
      groups: parts.map((p) => ({ name, color, item: p.item, start: p.start, end: p.end })),
    });
  } catch (err) {
    // 削除のあとに失敗したときは、文字が消えたままにならないよう、グループなしで入れ直す
    if (removed) console.error("[group] 移動の途中で失敗しました。Ctrl+Z で元に戻せます:", err);
    else throw err;
  } finally {
    g._moving = false;
    touchGroups();
  }
}

// ===== 縦線の端をドラッグして、グループに含める行を増減する =====
// 縦線の上端・下端のつまみを上下に引っ張ると、その端が、ポインターの位置にいちばん近い行まで動く。
// ドラッグ中は見た目だけ変えて、離したときに確定する（ほかのグループの行に重ねたときは、グループ追加と同じく上書きされる）。
// Esc で取り消す。
function groupLineIndexAtY(lines, y) {
  let best = -1;
  let bestDist = Infinity;
  lines.forEach((l, i) => {
    const r = groupNodeRect(l);
    if (!r.width && !r.height) return;
    const dist = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function updateGroupDrag() {
  const d = groupDrag;
  if (!d) return;
  d.raf = 0;
  const editor = getSourceEditor();
  if (!editor || !spanLive(d.sp)) return;
  const lines = editorLines(editor);
  const fi = groupLineIndex(lines, d.sp.first);
  const li = groupLineIndex(lines, d.sp.last);
  // つまんだ位置と端のずれを引いて、「端そのもの」の位置で行を探す（つかんだ瞬間に飛ばないように）
  const at = groupLineIndexAtY(lines, d.y - d.dy + (d.edge === "top" ? 2 : -2));
  if (fi < 0 || li < 0 || at < 0) return;
  // 最低でも1行は残す（上端を最後の行より下へ、下端を最初の行より上へは動かせない）
  if (d.edge === "top") d.sp.first = lines[Math.min(at, li)];
  else d.sp.last = lines[Math.max(at, fi)];
  renderGroupBars();
}

function onGroupDragMove(e) {
  const d = groupDrag;
  if (!d || e.pointerId !== d.pointerId) return;
  e.preventDefault();
  d.y = e.clientY;
  if (!d.raf) d.raf = requestAnimationFrame(updateGroupDrag);
}

function onGroupDragUp(e) {
  const d = groupDrag;
  if (!d || e.pointerId !== d.pointerId) return;
  if (e.type === "pointerup") d.y = e.clientY;
  endGroupDrag(e.type === "pointercancel");
}

function onGroupDragKey(e) {
  if (e.key !== "Escape" || !groupDrag) return;
  e.preventDefault();
  e.stopPropagation();
  endGroupDrag(true);
}

function startGroupDrag(g, sp, edge, e, startY = e.clientY) {
  if (groupDrag || !spanLive(sp)) return;
  closeGroupPopover();
  exitMulti();
  const edgeY = edge === "top" ? groupNodeRect(sp.first).top : groupNodeRect(sp.last).bottom;
  groupDrag = {
    g, sp, edge, first: sp.first, last: sp.last, pointerId: e.pointerId,
    y: e.clientY, dy: startY - edgeY, raf: 0,
  };
  document.documentElement.classList.add("my-group-dragging");
  window.addEventListener("pointermove", onGroupDragMove, true);
  window.addEventListener("pointerup", onGroupDragUp, true);
  window.addEventListener("pointercancel", onGroupDragUp, true);
  window.addEventListener("keydown", onGroupDragKey, true);
  renderGroupBars();
}

function endGroupDrag(cancel) {
  const d = groupDrag;
  if (!d) return;
  if (d.raf) cancelAnimationFrame(d.raf);
  window.removeEventListener("pointermove", onGroupDragMove, true);
  window.removeEventListener("pointerup", onGroupDragUp, true);
  window.removeEventListener("pointercancel", onGroupDragUp, true);
  window.removeEventListener("keydown", onGroupDragKey, true);
  document.documentElement.classList.remove("my-group-dragging");

  if (cancel) {
    d.sp.first = d.first;
    d.sp.last = d.last;
  } else {
    updateGroupDrag(); // 最後の位置を反映する
    groupDrag = null;
    if (spanLive(d.sp)) {
      overwriteGroupSpans(d.sp, d.g); // ほかのグループの行に重なったら上書き（グループ追加と同じ）
      d.g.spans = mergeGroupSpan(d.g.spans.filter((s) => s !== d.sp), d.sp); // 同じグループの隣り合う範囲とは1本につなげる
    }
  }
  groupDrag = null;
  if (groupSuppressClick) setTimeout(() => (groupSuppressClick = false), 50); // 離した直後のクリックだけ無視する
  touchGroups();
  renderGroupBars();
}

// ノードの文書内での前後（a が前なら負）
function docCmp(a, b) {
  if (a === b) return 0;
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function isNextTo(a, b) {
  return a.nextSibling === b || a.nextElementSibling === b;
}

// 2つの範囲が重なっている、または隣り合っているか
function groupSpansTouch(a, b) {
  const aBefore = docCmp(a.last, b.first) < 0 && !isNextTo(a.last, b.first); // a が b より前で、間に行がある
  const bBefore = docCmp(b.last, a.first) < 0 && !isNextTo(b.last, a.first);
  return !aBefore && !bBefore;
}

// 範囲を足す。重なる・隣り合う範囲があれば1つにまとめる（縦線を区切らないため）
function mergeGroupSpan(spans, add) {
  if (!spanLive(add)) return spans.concat([add]); // 宙に浮いた範囲はそのまま持っておく
  const cur = makeSpan(add.first, add.last, add.item);
  const floating = spans.filter((o) => !spanLive(o)); // 宙に浮いた範囲は、つなげる対象にしない
  let rest = spans.filter(spanLive);
  for (let changed = true; changed; ) {
    changed = false;
    rest = rest.filter((o) => {
      if (o.item !== cur.item || !groupSpansTouch(cur, o)) return true; // 同じアイテム名どうしだけ1本につなげる
      if (docCmp(o.first, cur.first) < 0) cur.first = o.first;
      if (docCmp(o.last, cur.last) > 0) cur.last = o.last;
      changed = true;
      return false;
    });
  }
  rest.push(cur);
  return floating.concat(rest);
}

// すでに別のグループになっている行に、新しい範囲（span）を重ねたとき、古いグループの側を直す。
//   ・新しい範囲に完全に覆われた古い範囲 … 消える（新しいグループで上書き）
//   ・片側だけ覆われた古い範囲 … 覆われた行だけ削って短くなる
//   ・新しい範囲が古い範囲の真ん中に入って分断された … 古い範囲は（両側とも）解除する
// except: 新しい範囲を足す先のグループ（同じ名前・同じ色のグループは上書きではなく結合するので除く）
function overwriteGroupSpans(span, except) {
  const lineAfter = (n) => (n.nodeType === Node.ELEMENT_NODE ? n.nextElementSibling : n.nextSibling);
  const lineBefore = (n) => (n.nodeType === Node.ELEMENT_NODE ? n.previousElementSibling : n.previousSibling);

  for (const g of groups) {
    const kept = [];
    for (const o of g.spans) {
      if (g === except && o.item === span.item) {
        kept.push(o); // 同じグループの同じアイテムは、上書きではなく結合する
        continue;
      }
      if (!spanLive(o)) {
        kept.push(o); // 宙に浮いた範囲は、元に戻ったときに付け直せるよう、そのまま残す
        continue;
      }
      const overlaps = docCmp(o.last, span.first) >= 0 && docCmp(span.last, o.first) >= 0;
      if (!overlaps) {
        kept.push(o);
        continue;
      }
      const startsBefore = docCmp(o.first, span.first) < 0; // 古い範囲が、新しい範囲より前から始まっている
      const endsAfter = docCmp(o.last, span.last) > 0; // 古い範囲が、新しい範囲より後ろまで続いている
      if (startsBefore && endsAfter) continue; // 間に挟まれて分断された → 解除
      if (startsBefore) {
        // 後ろ側が覆われた：新しい範囲の1つ前の行までにする
        const p = lineBefore(span.first);
        if (p && docCmp(p, o.first) >= 0) kept.push(makeSpan(o.first, p, o.item));
      } else if (endsAfter) {
        // 前側が覆われた：新しい範囲の1つ後ろの行からにする
        const n = lineAfter(span.last);
        if (n && docCmp(n, o.last) <= 0) kept.push(makeSpan(n, o.last, o.item));
      }
      // 完全に覆われた場合は、何も残さない
    }
    g.spans = kept;
  }
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].spans.length === 0) groups.splice(i, 1);
  }
}

// グループを追加する。
//   ・すでに別のグループになっている行は、新しいグループで上書きする（overwriteGroupSpans 参照）
//   ・同じ名前・同じ色のグループがあれば、そこに範囲を足す（重なる・隣り合う範囲は1本につなげる）
function addGroup(name, color, span, item = "") {
  span = makeSpan(span.first, span.last, item);
  let g = groups.find((x) => x.name === name && x.color === color);
  overwriteGroupSpans(span, g);
  if (!g) {
    g = { id: ++groupSeq, name, color, libId: findLibByNameColor(name, color)?.id || newLibId(), spans: [] };
    groups.push(g);
  }
  g.spans = mergeGroupSpan(g.spans, span);
  ensureGroupLayer();
  renderGroupBars();
  touchGroups();
}

// アイテム（1つの範囲）だけを解除する。グループに他のアイテムが残っていれば、グループは残る。
// 解除したアイテムは、ライブラリには残しておく
function removeSpan(g, sp) {
  libKeepSpans(g, [sp]);
  g.spans = g.spans.filter((s) => s !== sp);
  if (g.spans.length === 0) {
    const i = groups.indexOf(g);
    if (i >= 0) groups.splice(i, 1);
  }
  renderGroupBars();
  touchGroups();
}

function removeGroup(g) {
  const i = groups.indexOf(g);
  if (i >= 0) groups.splice(i, 1);
  renderGroupBars();
  touchGroups();
}

// 範囲（最初の行〜最後の行）の中にあるノードか
function groupSpanHasNode(sp, n) {
  const afterFirst = sp.first.contains(n) || sp.first.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING;
  const beforeLast = sp.last.contains(n) || sp.last.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING;
  return !!(afterFirst && beforeLast);
}

// 行番号 idx（削除した跡の空行）のまわりに連なっている空行を、ちょうど1つにする。
// 取り除いた行があれば { start, count }、なければ null を返す。
//   文1 / 空 / 文2 / 空 / 文3 の文2を消した → 文1 / 空 / 文3
//   文1 / 文2 / 文3 の文2を消した             → 文1 / 空 / 文3
// 文章の先頭・末尾に空行が来る場合は、まとめて取り除く（文章の間だけ、空行を1つ残す）。
async function collapseBlankLinesAt(editor, idx) {
  const lines = editorLines(editor);
  if (idx < 0 || idx >= lines.length) return null;
  const isBlank = (l) => groupLineText(l).trim() === "";
  if (!isBlank(lines[idx])) return null;
  let s = idx;
  let e = idx;
  while (s > 0 && isBlank(lines[s - 1])) s--;
  while (e < lines.length - 1 && isBlank(lines[e + 1])) e++;
  const atTop = s === 0;
  const atBottom = e === lines.length - 1;
  if (atTop && atBottom) return null; // 全部が空行なら何もしない
  const keep = atTop || atBottom ? 0 : 1; // 残す空行の数
  const remove = e - s + 1 - keep; // 取り除く空行の数
  if (remove <= 0) return null;

  let from;
  let to;
  if (atTop) {
    from = groupLineEdge(lines[0], false);
    to = groupLineEdge(lines[e + 1], false);
  } else if (atBottom) {
    from = groupLineEdge(lines[s - 1], true);
    to = groupLineEdge(lines[e], true);
  } else {
    from = groupLineEdge(lines[s], false);
    to = groupLineEdge(lines[e], false);
  }
  const range = document.createRange();
  range.setStart(from.node, from.off);
  range.setEnd(to.node, to.off);
  if (!isFocusInSourceEditor()) editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand("delete");
  await waitForLineCount(editor, lines.length - remove); // DeepL側の再描画を待つ
  // 取り除いた行の番号の範囲（取り除く前の番号で数える）。残りの印の番号をずらすのに使う
  return atTop ? { start: 0, count: e + 1 } : atBottom ? { start: s, count: e - s + 1 } : { start: s + 1, count: remove };
}

// 編集ポップアップの「削除」：グループ内の文字をすべて削除して、グループ（縦線）も外す。
// 各範囲の「最初の文字〜最後の文字」を選択して削除する（途中の空行もまとめて消え、空の1行が残る）。
// 後ろの範囲から順に消す。Ctrl+Z で元に戻せる。
// 編集ポップアップの「削除」「グループをすべて削除」：範囲内の文字をすべて削除して、グループ（縦線）も外す。
// only を渡すと、そのアイテム（1つの範囲）だけ。渡さないと、グループのすべてのアイテム。
// 各範囲の「最初の文字〜最後の文字」を選択して削除する（途中の空行もまとめて消え、空の1行が残る）。
// 後ろの範囲から順に消す。Ctrl+Z で元に戻せる。消した内容はライブラリに残る。
async function deleteGroupText(g, only) {
  if (g._deleting) return;
  const editor = getSourceEditor();
  if (!editor) return;
  g._deleting = true;
  const targets = only ? [only] : g.spans.slice();
  try {
    exitMulti(); // Ctrl+D のマルチ編集中なら終了する
    closeGroupPopover();
    syncGroups(); // 消す前の行の文字を記録しておく（Ctrl+Z で文字が戻ったとき、グループも戻せるように）
    libKeepSpans(g, targets); // 消す前の内容をライブラリに残す
    const spans = targets.filter(spanLive).sort((a, b) => docCmp(b.first, a.first));
    const marks = []; // 削除した場所の行番号（あとで、残った空行を1つにまとめるのに使う）
    for (const sp of spans) {
      const texts = editorTextNodes(editor).filter((n) => groupSpanHasNode(sp, n));
      if (texts.length === 0) continue;
      marks.push(groupLineIndex(editorLines(editor), sp.first));
      const last = texts[texts.length - 1];
      const range = document.createRange();
      range.setStart(texts[0], 0);
      range.setEnd(last, last.nodeValue.length);

      if (!isFocusInSourceEditor()) editor.focus({ preventScroll: true });
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete");
      await nextFrame(); // DeepL側の再描画を待つ
    }
    // 削除した跡の空行が重なっていたら、1つにまとめる（後ろの場所から順に）
    // （まとめると行がなくなって番号がずれるので、残りの印の番号も直す）
    marks.sort((x, y) => y - x);
    for (let i = 0; i < marks.length; i++) {
      if (marks[i] < 0) continue;
      const cut = await collapseBlankLinesAt(editor, marks[i]);
      if (!cut) continue;
      for (let j = i + 1; j < marks.length; j++) {
        if (marks[j] >= cut.start) marks[j] = cut.start - 1; // 取り除かれた行の中にあった印は、残った行（または -1 = 無し）へ
      }
    }
  } finally {
    g._deleting = false;
    // 範囲は捨てずに見えない状態にしておく。Ctrl+Z で文字が戻れば、グループも戻る
    for (const sp of targets) {
      sp.first = sp.last = null;
      if (!sp.lostAt) sp.lostAt = Date.now();
    }
    renderGroupBars();
    touchGroups();
  }
}

function restoreGroupSelection(range) {
  const editor = getSourceEditor();
  if (!editor) return;
  try {
    if (!isFocusInSourceEditor()) editor.focus({ preventScroll: true });
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (err) {
    // 範囲が無効になっていたら、そのままにする
  }
}

function closeGroupPopover(restoreSelection = false) {
  const pop = groupPopover;
  if (!pop) return;
  groupPopover = null;
  document.removeEventListener("pointerdown", pop.onOutside, true);
  pop.root.remove();
  if (window.CSS && CSS.highlights) CSS.highlights.delete(GROUP_TARGET_HIGHLIGHT);
  if (restoreSelection && pop.saved) restoreGroupSelection(pop.saved.range);
}

// ポップアップ：[グループ名] [8色のパレット] [グループを追加]
//   saved: { range, anchors }（クリックした時点の選択範囲と、含まれる行）  point: クリック位置
// ポップアップ：[グループ名] [アイテム名] / [8色のパレット] / [グループを追加]
//   saved: { range, anchors, mark? }（対象の選択範囲と、含まれる行。mark は見せておく範囲）  point: クリック位置
//   グループ名が今あるグループと同じなら、色もそのグループに合わせる（同じ名前・同じ色が同じグループになるため）
function openGroupPopover(saved, point) {
  closeGroupPopover();
  const layer = ensureGroupLayer();

  const root = document.createElement("div");
  root.className = "my-group-popover";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "グループを追加");
  root.innerHTML = `
    <div class="my-group-names">
      <input type="text" class="my-group-name" placeholder="グループ名" maxlength="${GROUP_NAME_MAX}"
          autocomplete="off" spellcheck="false" aria-label="グループ名">
      <input type="text" class="my-group-item" placeholder="アイテム名" maxlength="${GROUP_ITEM_MAX}"
          autocomplete="off" spellcheck="false" aria-label="アイテム名">
    </div>
    <div class="my-group-suggest" role="listbox" aria-label="グループ名の候補" hidden></div>
    <div class="my-group-colors" role="radiogroup" aria-label="グループの色">
      ${GROUP_COLORS.map(
        (c) => `<button type="button" class="my-group-swatch" role="radio" aria-checked="false"
          aria-label="${c.name}" title="${c.name}" data-color="${c.value}" style="background-color:${c.value}"></button>`
      ).join("")}
    </div>
    <button type="button" class="my-group-add">グループを追加</button>
  `;

  const input = root.querySelector(".my-group-name");
  const itemInput = root.querySelector(".my-group-item");
  const swatches = [...root.querySelectorAll(".my-group-swatch")];
  let color = GROUP_COLORS.some((c) => c.value === groupLastColor) ? groupLastColor : GROUP_COLORS[0].value;
  const paintSwatches = () =>
    swatches.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.color === color)));
  paintSwatches();

  // グループ名の候補（いまのグループ＋ライブラリ）
  const knownNames = new Map(); // 名前 → 色
  for (const x of groupLibrary) if (!knownNames.has(x.name)) knownNames.set(x.name, x.color);
  for (const g of groups) knownNames.set(g.name, g.color);
  // 名前が今あるグループと同じなら、色もそのグループに合わせる
  const syncColorFromName = () => {
    const c = knownNames.get(input.value.trim());
    if (c && GROUP_COLORS.some((x) => x.value === c)) {
      color = c;
      paintSwatches();
    }
  };

  // グループ名の候補：入力するたびに作り直す（最大 GROUP_SUGGEST_MAX 件）。
  // 先頭が一致するものを先に、途中が一致するものをそのあとに並べる。空欄のときは新しい順
  const suggestBox = root.querySelector(".my-group-suggest");
  let suggestNames = [];
  let suggestIdx = -1; // キーボード（↑↓）で選んでいる候補。-1 は未選択
  let popPos = null; // ポップアップの現在位置 { x, y }（候補で高さが変わったとき、画面からはみ出さないよう直すため）

  const fitPopover = () => {
    if (!popPos) return;
    const maxTop = window.innerHeight - root.offsetHeight - 8;
    if (popPos.y > maxTop) {
      popPos.y = Math.max(8, maxTop);
      root.style.top = `${popPos.y - layer.getBoundingClientRect().top}px`;
    }
  };

  const paintSuggestActive = () => {
    [...suggestBox.children].forEach((b, i) => b.classList.toggle("is-active", i === suggestIdx));
  };

  const renderSuggest = () => {
    const typed = input.value.trim();
    const q = typed.toLowerCase();
    const starts = [];
    const contains = [];
    for (const n of knownNames.keys()) {
      if (n === typed) continue; // 入力済みと同じものは出さない
      const l = n.toLowerCase();
      if (!q || l.startsWith(q)) starts.push(n);
      else if (l.includes(q)) contains.push(n);
    }
    suggestNames = starts.concat(contains).slice(0, GROUP_SUGGEST_MAX);
    suggestIdx = -1;
    suggestBox.textContent = "";
    for (const n of suggestNames) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "my-group-suggest-item";
      b.setAttribute("role", "option");
      b.title = n;
      const dot = document.createElement("span");
      dot.className = "my-group-suggest-dot";
      dot.style.backgroundColor = knownNames.get(n);
      const label = document.createElement("span");
      label.className = "my-group-suggest-name";
      label.textContent = n;
      b.append(dot, label);
      b.addEventListener("click", () => pickSuggest(n));
      suggestBox.appendChild(b);
    }
    suggestBox.hidden = suggestNames.length === 0;
    fitPopover();
  };

  const pickSuggest = (name) => {
    input.value = name;
    syncColorFromName();
    renderSuggest();
    input.focus({ preventScroll: true });
    input.setSelectionRange(name.length, name.length);
  };

  input.addEventListener("input", () => {
    syncColorFromName();
    renderSuggest();
  });
  input.addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229 || suggestNames.length === 0) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const n = suggestNames.length;
    if (e.key === "ArrowDown") suggestIdx = suggestIdx + 1 >= n ? -1 : suggestIdx + 1;
    else suggestIdx = suggestIdx - 1 < -1 ? n - 1 : suggestIdx - 1;
    paintSuggestActive();
  });

  const commit = () => {
    const name = input.value.trim() || `グループ${groupSeq + 1}`;
    const item = itemInput.value.trim().slice(0, GROUP_ITEM_MAX);
    const anchors = saved.anchors.filter((a) => a.isConnected);
    if (anchors.length) addGroup(name, color, { first: anchors[0], last: anchors[anchors.length - 1] }, item);
    groupLastColor = color;
    closeGroupPopover(true);
  };

  swatches.forEach((b) =>
    b.addEventListener("click", () => {
      color = b.dataset.color;
      paintSwatches();
    })
  );
  root.querySelector(".my-group-add").addEventListener("click", commit);

  // 入力欄以外を押しても、入力欄からフォーカスが外れないようにする
  root.addEventListener("mousedown", (e) => {
    if (!(e.target instanceof Element && e.target.matches("input"))) e.preventDefault();
  });
  // DeepL側のショートカットにキー入力を渡さない
  ["keydown", "keyup", "keypress"].forEach((type) => root.addEventListener(type, (e) => e.stopPropagation()));
  [input, itemInput].forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        if (el === input && suggestIdx >= 0) pickSuggest(suggestNames[suggestIdx]); // 候補を選んでいるときは、その名前を入れるだけ
        else commit();
      }
    })
  );

  // ポップアップの外を押したら閉じる
  const onOutside = (e) => {
    if (!root.isConnected) {
      document.removeEventListener("pointerdown", onOutside, true);
      return;
    }
    if (!root.contains(e.target)) closeGroupPopover();
  };
  document.addEventListener("pointerdown", onOutside, true);

  layer.appendChild(root);
  groupPopover = { root, saved, onOutside };
  renderSuggest(); // 開いた直後から候補（空欄のときは新しい順）を出す

  // 対象の文字を見せたままにする
  if (window.CSS && CSS.highlights && typeof Highlight !== "undefined") {
    CSS.highlights.set(GROUP_TARGET_HIGHLIGHT, new Highlight(saved.mark || saved.range));
  }

  // クリック位置の近くに置く。画面からはみ出すときは寄せる／上に出す
  const origin = layer.getBoundingClientRect();
  const w = root.offsetWidth;
  const h = root.offsetHeight;
  let x = Math.max(8, Math.min(point.x - 20, window.innerWidth - w - 8));
  let y = point.y + 16;
  if (y + h > window.innerHeight - 8) y = Math.max(8, point.y - h - 16);
  root.style.left = `${x - origin.left}px`;
  root.style.top = `${y - origin.top}px`;
  popPos = { x, y };

  input.focus({ preventScroll: true });
}

// グループの編集ポップアップ（タグをクリックすると開く）
//   [8色のパレット]          押すとすぐ、グループの色が変わる
//   [解除]  [削除]           解除：グループだけ外す（文字はそのまま） / 削除：グループ内の文字をすべて削除してグループも外す
// グループの編集ポップアップ（タグをクリックすると開く。sp は、そのタグのアイテム＝1つの範囲）
//   [グループ名] [アイテム名]   グループ名・色はグループ全体、アイテム名はこのアイテムだけ
//   [8色のパレット]             押すとすぐ、グループの色が変わる
//   [解除] [削除] [グループをすべて削除]
//     解除：このアイテムだけグループから外す（文字はそのまま）
//     削除：このアイテムの文字を削除して、グループから外す
//     グループをすべて削除：グループのすべてのアイテムの文字を削除して、グループも外す
//   外したもの・消したものはライブラリに残り、右クリックの「グループを代入」からいつでも入れられる
function openGroupEditPopover(g, tag, sp) {
  if (groupPopover && groupPopover.sp === sp) {
    closeGroupPopover(); // 同じタグをもう一度押したら閉じる
    return;
  }
  closeGroupPopover();
  const layer = ensureGroupLayer();

  const root = document.createElement("div");
  root.className = "my-group-popover";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "グループを編集");
  root.innerHTML = `
    <div class="my-group-names">
      <input type="text" class="my-group-name" placeholder="グループ名" maxlength="${GROUP_NAME_MAX}"
          autocomplete="off" spellcheck="false" aria-label="グループ名">
      <input type="text" class="my-group-item" placeholder="アイテム名" maxlength="${GROUP_ITEM_MAX}"
          autocomplete="off" spellcheck="false" aria-label="アイテム名">
    </div>
    <div class="my-group-suggest" role="listbox" aria-label="グループ名の候補" hidden></div>
    <div class="my-group-colors" role="radiogroup" aria-label="グループの色">
      ${GROUP_COLORS.map(
        (c) => `<button type="button" class="my-group-swatch" role="radio" aria-checked="false"
          aria-label="${c.name}" title="${c.name}" data-color="${c.value}" style="background-color:${c.value}"></button>`
      ).join("")}
    </div>
    <div class="my-group-actions">
      <button type="button" class="my-group-btn my-group-release">解除</button>
      <button type="button" class="my-group-btn my-group-remove">削除</button>
      <button type="button" class="my-group-btn my-group-remove-all">グループをすべて削除</button>
    </div>
  `;

  const input = root.querySelector(".my-group-name");
  const itemInput = root.querySelector(".my-group-item");
  input.value = g.name;
  itemInput.value = sp ? sp.item || "" : "";
  const swatches = [...root.querySelectorAll(".my-group-swatch")];
  const paintSwatches = () =>
    swatches.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.color === g.color)));
  paintSwatches();

  // グループ名の候補（いまの他のグループ＋ライブラリ）。追加ポップアップと同じく、
  // 既存のグループと同じ名前を選ぶと色も合わせ、確定時にそのグループへ統合できるようにする
  const knownNames = new Map(); // 名前 → 色
  for (const x of groupLibrary) if (!knownNames.has(x.name)) knownNames.set(x.name, x.color);
  for (const x of groups) if (x !== g) knownNames.set(x.name, x.color);
  const syncColorFromName = () => {
    const c = knownNames.get(input.value.trim());
    if (c && GROUP_COLORS.some((x) => x.value === c) && c !== g.color) {
      g.color = c;
      paintSwatches();
    }
  };

  const suggestBox = root.querySelector(".my-group-suggest");
  let suggestNames = [];
  let suggestIdx = -1; // キーボード（↑↓）で選んでいる候補。-1 は未選択
  let popPos = null; // ポップアップの現在位置 { x, y }（候補で高さが変わったとき、画面からはみ出さないよう直すため）

  const fitPopover = () => {
    if (!popPos) return;
    const maxTop = window.innerHeight - root.offsetHeight - 8;
    if (popPos.y > maxTop) {
      popPos.y = Math.max(8, maxTop);
      root.style.top = `${popPos.y - layer.getBoundingClientRect().top}px`;
    }
  };

  const paintSuggestActive = () => {
    [...suggestBox.children].forEach((b, i) => b.classList.toggle("is-active", i === suggestIdx));
  };

  const renderSuggest = () => {
    const typed = input.value.trim();
    const q = typed.toLowerCase();
    const starts = [];
    const contains = [];
    for (const n of knownNames.keys()) {
      if (n === typed) continue; // 入力済みと同じものは出さない
      const l = n.toLowerCase();
      if (!q || l.startsWith(q)) starts.push(n);
      else if (l.includes(q)) contains.push(n);
    }
    suggestNames = starts.concat(contains).slice(0, GROUP_SUGGEST_MAX);
    suggestIdx = -1;
    suggestBox.textContent = "";
    for (const n of suggestNames) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "my-group-suggest-item";
      b.setAttribute("role", "option");
      b.title = n;
      const dot = document.createElement("span");
      dot.className = "my-group-suggest-dot";
      dot.style.backgroundColor = knownNames.get(n);
      const label = document.createElement("span");
      label.className = "my-group-suggest-name";
      label.textContent = n;
      b.append(dot, label);
      b.addEventListener("click", () => pickSuggest(n));
      suggestBox.appendChild(b);
    }
    suggestBox.hidden = suggestNames.length === 0;
    fitPopover();
  };

  const pickSuggest = (name) => {
    input.value = name;
    g.name = name;
    syncColorFromName();
    renderGroupBars();
    touchGroups();
    renderSuggest();
    input.focus({ preventScroll: true });
    input.setSelectionRange(name.length, name.length);
  };

  // グループ名：入力しながらタグに反映する（空にしたときは、確定時に元の名前へ戻す）。
  // 既存のグループと同じ名前になったら、色もそのグループに合わせる
  input.addEventListener("input", () => {
    const name = input.value.trim().slice(0, GROUP_NAME_MAX);
    if (name) {
      g.name = name;
      syncColorFromName();
      renderGroupBars();
      touchGroups();
    }
    renderSuggest();
  });
  input.addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229 || suggestNames.length === 0) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const n = suggestNames.length;
    if (e.key === "ArrowDown") suggestIdx = suggestIdx + 1 >= n ? -1 : suggestIdx + 1;
    else suggestIdx = suggestIdx - 1 < -1 ? n - 1 : suggestIdx - 1;
    paintSuggestActive();
  });
  // アイテム名：入力しながらタグに反映する（空にしてもよい）
  itemInput.addEventListener("input", () => {
    if (!sp) return;
    sp.item = itemInput.value.trim().slice(0, GROUP_ITEM_MAX);
    renderGroupBars();
    touchGroups();
  });
  // 確定（Enter / フォーカスが外れたとき）：同じ名前・同じ色のグループがほかにあれば、1つにまとめる（既存のグループへ統合）
  const commitName = () => {
    if (!input.value.trim()) {
      input.value = g.name;
      return false;
    }
    const other = groups.find((x) => x !== g && x.name === g.name && x.color === g.color);
    if (!other) return false;
    let spans = other.spans;
    for (const s of g.spans) spans = mergeGroupSpan(spans, s);
    other.spans = spans;
    removeGroup(g);
    closeGroupPopover(); // まとめたあとは、このグループは存在しないので閉じる
    return true;
  };
  input.addEventListener("change", commitName);
  [input, itemInput].forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      if (el === input && suggestIdx >= 0) {
        pickSuggest(suggestNames[suggestIdx]); // 候補を選んでいるときは、その名前を入れるだけ
        return;
      }
      if (el === input ? !commitName() : true) closeGroupPopover();
    })
  );

  swatches.forEach((b) =>
    b.addEventListener("click", () => {
      g.color = b.dataset.color;
      paintSwatches();
      renderGroupBars(); // 縦線とタグの色をすぐ反映する
      touchGroups();
    })
  );
  root.querySelector(".my-group-release").addEventListener("click", () => {
    closeGroupPopover();
    if (sp) removeSpan(g, sp);
    else removeGroup(g);
  });
  root.querySelector(".my-group-remove").addEventListener("click", () => {
    deleteGroupText(g, sp || undefined); // ポップアップを閉じて、このアイテムの文字を削除し、グループから外す
  });
  root.querySelector(".my-group-remove-all").addEventListener("click", () => {
    deleteGroupText(g); // ポップアップを閉じて、グループのすべての文字を削除し、グループも外す
  });

  // ボタンを押しても、エディタのフォーカスを動かさない（入力欄だけは普通に押せる）。DeepL側のショートカットにキー入力を渡さない
  root.addEventListener("mousedown", (e) => {
    if (!(e.target instanceof Element && e.target.matches("input"))) e.preventDefault();
  });
  ["keydown", "keyup", "keypress"].forEach((type) => root.addEventListener(type, (e) => e.stopPropagation()));

  // ポップアップとタグの外を押したら閉じる（タグは上の「もう一度押したら閉じる」に任せる）
  const onOutside = (e) => {
    if (!root.isConnected) {
      document.removeEventListener("pointerdown", onOutside, true);
      return;
    }
    if (!root.contains(e.target) && !tag.contains(e.target)) closeGroupPopover();
  };
  document.addEventListener("pointerdown", onOutside, true);

  layer.appendChild(root);
  groupPopover = { root, saved: null, group: g, sp, tag, onOutside };
  renderSuggest(); // 開いた直後から候補を出す

  // タグの右隣に置く。画面からはみ出すときは左隣／上に寄せる
  const origin = layer.getBoundingClientRect();
  const t = tag.getBoundingClientRect();
  const w = root.offsetWidth;
  const h = root.offsetHeight;
  let x = t.right + 10;
  if (x + w > window.innerWidth - 8) x = Math.max(8, t.left - w - 10);
  const y = Math.max(8, Math.min(t.top, window.innerHeight - h - 8));
  root.style.left = `${x - origin.left}px`;
  root.style.top = `${y - origin.top}px`;
  popPos = { x, y };
}

// 選択した文字を（選択したまま）クリックしたらポップアップを開く。
// ・mousedown：選択範囲の文字の上を押したかを調べて覚えておく
// ・click：ほとんど動かさずに離していたら、選択を元に戻してポップアップを開く（ドラッグは対象外）
function setupGroupEdit() {
  ensureGroupStyle();

  document.addEventListener(
    "mousedown",
    (e) => {
      groupPending = null;
      if (e.button !== 0 || e.detail !== 1) return; // 左クリック1回だけ（ダブルクリックは単語選択に使う）
      if (!(e.target instanceof Element) || e.target.closest(".my-group-popover")) return;

      const editor = getSourceEditor();
      const sel = window.getSelection();
      if (!editor || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      if (!editor.contains(e.target)) return;
      if (!editor.contains(sel.anchorNode) || !editor.contains(sel.focusNode)) return;
      if (!sel.toString().trim()) return;

      const range = sel.getRangeAt(0).cloneRange();
      const { anchors, rects } = groupSelectionInfo(editor, range);
      const hit = rects.some(
        (r) => e.clientX >= r.left - 1 && e.clientX <= r.right + 1 && e.clientY >= r.top - 1 && e.clientY <= r.bottom + 1
      );
      if (!hit || anchors.length === 0) return;
      groupPending = { range, anchors, x: e.clientX, y: e.clientY };
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const p = groupPending;
      groupPending = null;
      if (!p || e.button !== 0) return;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 5) return;
      restoreGroupSelection(p.range); // クリックで選択が解除されているので戻す
      openGroupPopover(p, { x: e.clientX, y: e.clientY });
    },
    true
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && groupPopover) {
        e.preventDefault();
        closeGroupPopover(true);
      }
    },
    true
  );
}

// ===== グループ情報つきの日本語テキスト（送信・保存・貼り付け） =====
// 生成時に送る日本語プロンプト(prompt_jp)は、グループの範囲を次のマーカー行で挟んだ形にする。
// この形のまま保存され、コピーしてエディタに貼り付けると、マーカーを外してグループとして復元する。
// 英文(prompt_en)にはマーカーを含めない。
//   <group name="グループ名" color="#60a5fa" item="アイテム名">   （item は、アイテム名があるときだけ付く）
//   …グループに含まれる行…
//   </group>
// name は JSON の文字列表記（" や \ はエスケープされる）。範囲が複数あるグループは、同じ name / color のブロックが複数並ぶ。
const GROUP_MARK_OPEN = /^\s*<group\s+name=("(?:[^"\\]|\\.)*")\s+color="(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))"(?:\s+item=("(?:[^"\\]|\\.)*"))?\s*>\s*$/;
const GROUP_MARK_CLOSE = /^\s*<\/group>\s*$/;

// エディタ内の「行」の要素を上から順に集める（入れ子の段落は一番内側の段落を1行とする）。
// グループの範囲（first / last）は、この行の要素のどれかを指している
function editorLines(editor) {
  const lines = [];
  const NESTED = "p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre";
  const visit = (parent) => {
    for (const n of parent.childNodes) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        if (n.tagName === "BR") continue;
        if (BLOCK_TAGS.test(n.tagName) && n.querySelector(NESTED)) visit(n);
        else lines.push(n);
      } else if (n.nodeType === Node.TEXT_NODE && n.nodeValue.trim()) {
        lines.push(n);
      }
    }
  };
  visit(editor);
  return lines;
}

// node（行の要素、またはその中のノード）が何行目か。見つからなければ -1
function groupLineIndex(lines, node) {
  if (!node) return -1;
  return lines.findIndex((l) => l === node || l.contains(node));
}

// 行の文字列（空行は空文字）
function groupLineText(el) {
  const t = el.nodeType === Node.TEXT_NODE ? el.nodeValue : el.innerText ?? el.textContent ?? "";
  return t.replace(/\r\n?/g, "\n").replace(/\n$/, "");
}

// グループがあるとき、グループの範囲をマーカー行で挟んだ日本語テキストを返す。グループがなければ null
function getSourceTextWithGroups() {
  const editor = getSourceEditor();
  if (!editor || groups.length === 0) return null;
  const lines = editorLines(editor);

  const found = [];
  for (const g of groups) {
    for (const sp of g.spans) {
      const a = groupLineIndex(lines, sp.first);
      const b = groupLineIndex(lines, sp.last);
      if (a >= 0 && b >= a) found.push({ name: g.name, color: g.color, item: sp.item || "", a, b });
    }
  }
  if (found.length === 0) return null;
  found.sort((x, y) => x.a - y.a);

  // 範囲が重なることはないはずだが、万一重なったら後ろ側は無視する（マーカーが入れ子にならないように）
  const startAt = new Map();
  const endAt = new Set();
  let prevEnd = -1;
  for (const f of found) {
    if (f.a <= prevEnd) continue;
    startAt.set(f.a, f);
    endAt.add(f.b);
    prevEnd = f.b;
  }

  const out = [];
  lines.forEach((el, i) => {
    const s = startAt.get(i);
    if (s) out.push(`<group name=${JSON.stringify(s.name)} color="${s.color}"${s.item ? ` item=${JSON.stringify(s.item)}` : ""}>`);
    out.push(groupLineText(el));
    if (endAt.has(i)) out.push("</group>");
  });
  return out.join("\n");
}

// マーカーつきのテキストを、マーカーを除いた本文と、グループの一覧に分ける。
// groups の start / end は、本文の何行目か（0始まり、end を含む）。マーカーがなければ null
function parseGroupedText(text) {
  const src = String(text).replace(/\r\n?/g, "\n").split("\n");
  const lines = [];
  const found = [];
  let cur = null;
  const close = () => {
    if (cur && cur.start <= lines.length - 1) found.push({ ...cur, end: lines.length - 1 });
    cur = null;
  };
  for (const raw of src) {
    const m = GROUP_MARK_OPEN.exec(raw);
    if (m) {
      let name = null;
      try {
        name = JSON.parse(m[1]);
      } catch (_) {}
      if (typeof name === "string") {
        close();
        let item = "";
        try {
          if (m[3]) item = JSON.parse(m[3]);
        } catch (_) {}
        cur = {
          name: name.slice(0, GROUP_NAME_MAX) || "グループ",
          color: m[2].toLowerCase(),
          item: typeof item === "string" ? item.slice(0, GROUP_ITEM_MAX) : "",
          start: lines.length,
        };
        continue;
      }
    }
    if (GROUP_MARK_CLOSE.test(raw)) {
      close();
      continue;
    }
    lines.push(raw);
  }
  close();
  if (found.length === 0) return null;
  return { text: lines.join("\n"), groups: found };
}

// 貼り付け中は、自分で送った貼り付けイベントを setupGroupPaste が拾い直さないようにする
let groupPasting = false;

// 貼り付けの直後、DeepL側の再描画が済んでグループの端の行が出そろうまで待つ（最大 約1秒）。
// 固定の回数だけ待つのではなく、端の行に貼り付けた文字が入ったのを確かめて、すぐ次へ進む
async function waitForPastedLines(editor, startIdx, parts, list) {
  const ok = () => {
    const lines = editorLines(editor);
    return list.every((g) => {
      const a = lines[startIdx + g.start];
      const b = lines[startIdx + g.end];
      if (!a || !b) return false;
      const head = parts[g.start].trim();
      const tail = parts[g.end].trim();
      return (!head || groupLineText(a).includes(head)) && (!tail || groupLineText(b).includes(tail));
    });
  };
  for (let i = 0; i < 60; i++) {
    if (ok()) return true;
    await nextFrame();
  }
  return false;
}

// マーカーを除いた本文を貼り付けて、マーカーのあった範囲にグループを付ける。
// 本文は「貼り付けイベント」で一度に入れる（普通に貼り付けたときと同じ処理になるので速い）。
// DeepLが受け付けなかったときだけ、1行ずつ入力する方法に切り替える。
// 貼り付け先の行にもともと文字があるときは、その行ごとグループに含まれる
async function pasteGroupedText(parsed) {
  const editor = getSourceEditor();
  if (!editor || !parsed.text.trim()) return;
  exitMulti(); // Ctrl+D のマルチ編集中なら終了する
  if (!isFocusInSourceEditor()) editor.focus({ preventScroll: true });

  // 貼り付け位置（選択の開始位置）の行番号。貼り付ける前に調べておく
  let startIdx = -1;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    let node = r.startContainer;
    if (node === editor) node = editor.childNodes[r.startOffset] || editor.lastChild;
    startIdx = groupLineIndex(editorLines(editor), node);
  }

  const parts = parsed.text.split("\n");
  groupPasting = true;
  try {
    let handled = false;
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", parsed.text);
      const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
      const target = editor.contains(document.activeElement) ? document.activeElement : editor;
      handled = !target.dispatchEvent(ev); // DeepL側が処理すると preventDefault されて false が返る
    } catch (_) {}

    if (!handled) {
      // 切り替え先：Enter（段落の区切り）と文字入力を続けて実行する。再描画は待たずに一気に入れる
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) document.execCommand("insertParagraph");
        if (parts[i]) document.execCommand("insertText", false, parts[i]);
      }
    }
  } finally {
    groupPasting = false;
  }

  if (startIdx < 0) {
    console.warn("[group] 貼り付け位置の行が分からなかったため、グループは付けませんでした");
    return;
  }
  const settled = await waitForPastedLines(editor, startIdx, parts, parsed.groups);
  if (!settled) console.warn("[group] 貼り付けた行の確認がとれませんでした。行の位置がずれている可能性があります");

  // すべて追加のとき：貼り付けた全体の上下に、空行をちょうど1つにそろえる（行の数が変わるので、その分だけ位置をずらす）
  let base = startIdx;
  if (parsed.pad) {
    try {
      base += await padBlankAround(editor, startIdx, parsed.groups);
    } catch (err) {
      console.warn("[group] 上下の空行をそろえられませんでした:", err);
    }
  }

  const lines = editorLines(editor);
  for (const g of parsed.groups) {
    const first = lines[base + g.start];
    const last = lines[base + g.end];
    if (first && last) addGroup(g.name, g.color, { first, last }, g.item || "");
  }
}

// 貼り付けたブロック全体（先頭〜末尾の行）の上下に、空行をちょうど1つ置く。
//   ・空行がなければ1つ足す / 2つ以上あれば1つに縮める / すでに1つならそのまま
//   ・文章の先頭・末尾に接しているときは、その側に空行は置かない
// 戻り値：先頭の行の番号がずれた数（上の空行を足したら +1、縮めたら −縮めた数）
async function padBlankAround(editor, startIdx, list) {
  const s = startIdx + Math.min(...list.map((g) => g.start));
  const e = startIdx + Math.max(...list.map((g) => g.end));
  const isBlank = (l) => groupLineText(l).trim() === "";
  let shift = 0;

  // 下側（先に直す。上側の番号に影響しない）
  let lines = editorLines(editor);
  if (e + 1 < lines.length) {
    if (isBlank(lines[e + 1])) {
      await collapseBlankLinesAt(editor, e + 1);
    } else {
      groupCaretAt(groupLineEdge(lines[e + 1], false));
      document.execCommand("insertParagraph"); // 次の行の頭で改行 → 空行ができる
      await waitForLineCount(editor, lines.length + 1);
    }
  }

  // 上側
  lines = editorLines(editor);
  if (s > 0 && s < lines.length) {
    if (isBlank(lines[s - 1])) {
      const cut = await collapseBlankLinesAt(editor, s - 1);
      if (cut) shift -= cut.count;
    } else {
      groupCaretAt(groupLineEdge(lines[s], false));
      document.execCommand("insertParagraph");
      await waitForLineCount(editor, lines.length + 1);
      shift += 1;
    }
  }
  return shift;
}

// 翻訳元エディタへの貼り付けにマーカーが含まれていたら、マーカーを外して貼り付け、グループを復元する
function setupGroupPaste() {
  document.addEventListener(
    "paste",
    (e) => {
      if (groupPasting || !isFocusInSourceEditor()) return;
      const text = e.clipboardData ? e.clipboardData.getData("text/plain") : "";
      if (!text || !text.includes("<group")) return;
      const parsed = parseGroupedText(text);
      if (!parsed) return;
      e.preventDefault();
      e.stopPropagation();
      pasteGroupedText(parsed).catch((err) => console.error("[group] 貼り付けに失敗:", err));
    },
    true
  );
}

// ===== 右クリックメニュー（翻訳元エディタの上で右クリックしたとき、自前のメニューを出す） =====
//   [グループを代入 ›]  クリックすると、保存してあるグループの一覧が出る。
//                      名前にカーソルを乗せると右側に中身が出る。選ぶと、右クリックした位置（カーソル）に
//                      <group> マーカーつきで入り、グループとして復元される
// ・Shift を押しながら右クリックすると、ブラウザ標準のメニューを出す
// ・グループの名前・色・中身は「ライブラリ」に保存しておく。グループを解除・削除したあと、
//   ページを再読み込みしたあとも残り、いつでも代入できる。保存数は GROUP_LIBRARY_MAX 件まで（古いものから消える）
const GROUP_LIBRARY_KEY = "groupLibrary"; // chrome.storage に保存するキー
const GROUP_LIBRARY_MAX = 30; // 保存しておくグループの最大数
const GROUP_TAB_SIZE = 10; // 一覧のタブ1つに入れる件数
const GROUP_PREVIEW_LINES = 14; // ホバー時の中身の表示行数の上限（超えた分は「…他N行」）
let groupLibrary = []; // [{ id, name, color, spans: [[行の文字, ...], ...] }]  新しく作った・中身が変わった順
let groupLibLoaded = false; // 保存済みのライブラリを読み込み終えたか（終えるまでは保存しない）
let groupLibSavedJson = ""; // 最後に保存した内容（変化がないときは書き込まない）

const newLibId = () => "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const findLibByNameColor = (name, color) => groupLibrary.find((x) => x.name === name && x.color === color);

// 保存データの形を確かめて、使えるものだけ取り出す
function sanitizeLibrary(raw) {
  if (!Array.isArray(raw)) return [];
  // アイテム1つ：{ item, lines }。古い形式（行の文字の配列そのもの）も受け付ける
  const norm = (s) => {
    if (Array.isArray(s)) s = { item: "", lines: s };
    if (!s || typeof s !== "object" || !Array.isArray(s.lines) || s.lines.length === 0) return null;
    if (!s.lines.every((t) => typeof t === "string")) return null;
    return { item: typeof s.item === "string" ? s.item.slice(0, GROUP_ITEM_MAX) : "", lines: s.lines.slice() };
  };
  const out = [];
  for (const x of raw) {
    if (!x || typeof x.id !== "string" || typeof x.name !== "string") continue;
    if (!/^#[0-9a-f]{3,8}$/i.test(String(x.color)) || !Array.isArray(x.spans)) continue;
    const spans = x.spans.map(norm).filter(Boolean);
    const keep = (Array.isArray(x.keep) ? x.keep : []).map(norm).filter(Boolean).slice(-GROUP_KEEP_MAX);
    if (spans.length === 0 && keep.length === 0) continue;
    out.push({ id: x.id, name: x.name.slice(0, GROUP_NAME_MAX), color: x.color, spans, keep });
  }
  return out.slice(0, GROUP_LIBRARY_MAX);
}

function saveGroupLibrary() {
  const json = JSON.stringify(groupLibrary);
  if (json === groupLibSavedJson) return;
  groupLibSavedJson = json;
  storageSet({ [GROUP_LIBRARY_KEY]: groupLibrary });
}

// ライブラリの1件に入っているアイテム一覧（いまの内容＋解除・削除したアイテム。同じものは1つにまとめる）
function libEntryItems(entry) {
  const seen = new Set();
  const out = [];
  for (const it of entry.spans.concat(entry.keep || [])) {
    const k = JSON.stringify(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

// アイテム（範囲）を解除・削除する直前に呼ぶ。そのアイテムの内容を、ライブラリの「残しておくアイテム」に入れる
function libKeepSpans(g, spans) {
  if (!groupLibLoaded) return;
  syncGroupLibrary(); // いまの内容をライブラリに反映しておく
  const entry = groupLibrary.find((x) => x.id === g.libId);
  if (!entry) return;
  for (const sp of spans) {
    const lines = sp.full || sp.snaps[0];
    if (!lines || !lines.some((t) => t.trim())) continue;
    const it = { item: sp.item || "", lines: lines.slice() };
    if (it.item) {
      // 同じアイテム名で残しているものがあれば、新しい内容で上書きする（重複させない）
      const i = entry.keep.findIndex((k) => k.item === it.item);
      if (i >= 0) {
        entry.keep[i] = it;
        continue;
      }
    }
    if (!entry.keep.some((k) => JSON.stringify(k) === JSON.stringify(it))) entry.keep.push(it);
  }
  if (entry.keep.length > GROUP_KEEP_MAX) entry.keep.splice(0, entry.keep.length - GROUP_KEEP_MAX);
  saveGroupLibrary();
}

// いまあるグループをライブラリに反映する（syncGroups から呼ばれる）。
// ・グループ（g.libId）ごとに1件。名前・色が変われば同じ件を更新する
// ・中身は、各範囲が最後に確認できたときの行の文字（sp.full）。グループが解除・削除されても、ライブラリには残る
// ・同じ名前・同じ色の別の件は、新しいほうで置き換える
function syncGroupLibrary() {
  if (!groupLibLoaded) return;
  for (const g of groups) {
    if (!g.libId) g.libId = findLibByNameColor(g.name, g.color)?.id || newLibId();
    let entry = groupLibrary.find((x) => x.id === g.libId);

    // 行が見つからない範囲しかないときは、保存済みの中身を（文字数を切り詰めた記録で）上書きしない
    let spans = null;
    if (g.spans.some((sp) => sp.full) || !entry) {
      spans = g.spans
        .map((sp) => ({ a: sp.a, item: sp.item || "", lines: sp.full || sp.snaps[0] }))
        .filter((x) => x.lines && x.lines.some((s) => s.trim()))
        .sort((x, y) => x.a - y.a)
        .map((x) => ({ item: x.item, lines: x.lines.slice() }));
      // 同じアイテム名が複数あるときは、あとに出てくるほう（最新の内容）で上書きする
      if (spans.some((x) => x.item)) {
        const lastByItem = new Map();
        spans.forEach((x, i) => { if (x.item) lastByItem.set(x.item, i); });
        spans = spans.filter((x, i) => !x.item || lastByItem.get(x.item) === i);
      }
      if (spans.length === 0) spans = null;
    }
    if (!entry && !spans) continue;

    if (!entry) {
      entry = { id: g.libId, name: g.name, color: g.color, spans, keep: [] };
      groupLibrary.unshift(entry);
    } else {
      entry.name = g.name;
      entry.color = g.color;
      if (spans && JSON.stringify(spans) !== JSON.stringify(entry.spans)) {
        entry.spans = spans;
        groupLibrary.splice(groupLibrary.indexOf(entry), 1);
        groupLibrary.unshift(entry); // 中身が変わったものを先頭に
      }
    }
    // 残しておいたアイテムのうち、いまのアイテムと同じもの・同じアイテム名のものは、いまの内容に置き換わったので捨てる
    if (entry.keep.length) {
      const live = new Set(entry.spans.map((s) => JSON.stringify(s)));
      const names = new Set(entry.spans.map((s) => s.item).filter(Boolean));
      entry.keep = entry.keep.filter((k) => !live.has(JSON.stringify(k)) && !(k.item && names.has(k.item)));
    }
    groupLibrary = groupLibrary.filter((x) => x === entry || !(x.name === entry.name && x.color === entry.color));
  }
  if (groupLibrary.length > GROUP_LIBRARY_MAX) groupLibrary.length = GROUP_LIBRARY_MAX;
  saveGroupLibrary();
}

// ライブラリのグループの名前・色を変える（右クリックメニューの、アイテム一覧の見出しから）。
// いまエディタに付いている同じグループ（libId が同じもの）にも反映する。
// 変更後が、ほかの保存済みグループと同じ名前・同じ色になるときは、同じグループとして1つにまとめる（相手の中身は「残しておくアイテム」へ移す）
function updateLibraryGroup(entry, name, color) {
  name = String(name).trim().slice(0, GROUP_NAME_MAX) || "グループ";
  entry.name = name;
  entry.color = color;
  for (const g of groups) {
    if (g.libId !== entry.id) continue;
    g.name = name;
    g.color = color;
  }
  const dups = groupLibrary.filter((x) => x !== entry && x.name === name && x.color === color);
  for (const d of dups) {
    for (const it of libEntryItems(d)) {
      const k = JSON.stringify(it);
      if (!entry.spans.some((x) => JSON.stringify(x) === k) && !entry.keep.some((x) => JSON.stringify(x) === k)) entry.keep.push(it);
    }
  }
  if (entry.keep.length > GROUP_KEEP_MAX) entry.keep.splice(0, entry.keep.length - GROUP_KEEP_MAX);
  if (dups.length) groupLibrary = groupLibrary.filter((x) => !dups.includes(x));
  saveGroupLibrary();
  renderGroupBars();
  touchGroups();
  return entry;
}

// ライブラリのグループを1件削除する（右クリックメニューの「グループを削除」）。
// いまエディタに付いている同じグループがあると、次の同期でライブラリに戻ってしまうので、そちらも解除する（文字はそのまま残る）
function deleteLibraryGroup(entry) {
  for (const g of groups.slice()) if (g.libId === entry.id) removeGroup(g);
  const i = groupLibrary.indexOf(entry);
  if (i >= 0) groupLibrary.splice(i, 1);
  saveGroupLibrary();
}

let ctxMenu = null; // { root, saved, cleanup }

// ライブラリの1件を、<group> マーカーつきで、保存しておいたカーソル位置に入れる。
// only（アイテム1つ）を渡すと、そのアイテムだけ入れる。渡さないと、グループのすべてのアイテムを入れる。
// すべて入れるとき：アイテム（ブロック）は空行を挟まずに連ねて入れ、全体の上下には空行をちょうど1つだけ置く
// （すでに空行があれば足さず、2つ以上あれば1つに縮める。文章の先頭・末尾には置かない）
async function insertGroupAtCursor(entry, saved, only) {
  const editor = getSourceEditor();
  if (!editor) return;
  const lines = [];
  const list = [];
  for (const it of only ? [only] : libEntryItems(entry)) {
    if (!it.lines.length) continue;
    list.push({ name: entry.name, color: entry.color, item: it.item, start: lines.length, end: lines.length + it.lines.length - 1 });
    lines.push(...it.lines);
  }
  if (!lines.some((t) => t.trim())) return;
  exitMulti();
  if (saved) restoreGroupSelection(saved);
  else if (!isFocusInSourceEditor()) editor.focus({ preventScroll: true });
  await pasteGroupedText({ text: lines.join("\n"), groups: list, pad: !only });
}

// range の先頭がある行の要素（空行も含む）。見つからなければ null
function groupLineAtRange(editor, range) {
  let node = range.startContainer;
  if (node === editor) node = editor.childNodes[range.startOffset] || editor.lastChild;
  if (!node || node === editor) return null;
  const lines = editorLines(editor);
  const i = groupLineIndex(lines, node);
  return i >= 0 ? lines[i] : groupAnchorOf(editor, node);
}

function closeContextMenu() {
  const m = ctxMenu;
  if (!m) return;
  ctxMenu = null;
  m.cleanup();
  m.root.remove();
}

// メニューの横に開くパネル（アイテムの一覧・中身）を from（隣のパネルの位置）の横に置く。
// preferLeft: 左側に開きたいとき true。収まらなければ反対側に回す。実際に左側へ置いたかどうかを返す
function placeCtxPanel(root, panel, from, top, preferLeft) {
  const rr = root.getBoundingClientRect();
  const w = panel.offsetWidth;
  const h = panel.offsetHeight;
  let left = preferLeft ? from.left - 6 - w : from.right + 6;
  let flipped = preferLeft;
  if (!preferLeft && left + w > window.innerWidth - 8) {
    left = from.left - 6 - w;
    flipped = true;
  } else if (preferLeft && left < 8) {
    left = from.right + 6;
    flipped = false;
  }
  left = Math.max(8, left);
  const y = Math.max(8, Math.min(top - 7, window.innerHeight - h - 8));
  panel.style.left = `${left - rr.left}px`;
  panel.style.top = `${y - rr.top}px`;
  return flipped;
}

// アイテムの表示名。アイテム名がないときは、最初の文字のある行を薄く出す
function ctxItemLabel(it) {
  if (it.item) return it.item;
  const first = (it.lines.find((s) => s.trim()) || "").trim();
  return first ? first.slice(0, 24) + (first.length > 24 ? "…" : "") : "名前なし";
}

// 右クリックメニュー：
//   [グループを追加]
//   [グループを代入 ›] → グループ名の一覧 › アイテム名の一覧 › （アイテム名にホバーで）中身
//   アイテム名をクリックすると、そのアイテムが右クリックした位置に入る
function openContextMenu(saved, point) {
  closeContextMenu();
  closeGroupPopover();
  syncGroupLibrary(); // 作ったばかりのグループも一覧に出す
  const layer = ensureGroupLayer();

  const root = document.createElement("div");
  root.className = "my-ctx-menu";
  root.setAttribute("role", "menu");
  root.innerHTML = `
    <button type="button" class="my-ctx-item my-ctx-add" role="menuitem">
      <svg class="my-ctx-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      <span class="my-ctx-label">グループを追加</span>
    </button>
    <div class="my-ctx-sep" role="separator"></div>
    <div class="my-ctx-row">
      <button type="button" class="my-ctx-item my-ctx-parent" role="menuitem" aria-haspopup="menu" aria-expanded="false">
        <svg class="my-ctx-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"/></svg>
        <span class="my-ctx-label">グループを代入</span>
        <span class="my-ctx-arrow" aria-hidden="true">›</span>
      </button>
      <div class="my-ctx-panel my-ctx-sub" role="menu" aria-label="グループ" hidden></div>
    </div>
    <div class="my-ctx-panel my-ctx-items" role="menu" aria-label="アイテム" hidden></div>
    <div class="my-ctx-panel my-ctx-preview" hidden></div>`;
  const addBtn = root.querySelector(".my-ctx-add");
  const parent = root.querySelector(".my-ctx-parent");
  const row = root.querySelector(".my-ctx-row");
  const sub = root.querySelector(".my-ctx-sub");
  const itemsPanel = root.querySelector(".my-ctx-items");
  const preview = root.querySelector(".my-ctx-preview");

  // 「グループを追加」：右クリックした時点の選択範囲の行に、これまでどおりのポップアップ（名前・色）を出す。
  // 選択がなく、カーソルが置いてあるだけのときは、カーソルがある行を対象にする
  if (!saved) addBtn.disabled = true;
  addBtn.addEventListener("click", (e) => {
    const p = { x: e.clientX, y: e.clientY };
    closeContextMenu();
    const editor = getSourceEditor();
    if (!editor || !saved) return;
    let anchors = saved.collapsed ? [] : groupSelectionInfo(editor, saved).anchors;
    let mark = null;
    if (anchors.length === 0) {
      const line = groupLineAtRange(editor, saved);
      if (!line) return;
      anchors = [line];
      mark = document.createRange();
      mark.selectNodeContents(line); // 対象の行を見せる
    }
    restoreGroupSelection(saved);
    openGroupPopover({ range: saved, anchors, mark }, p);
  });

  // ---- 1段目：グループ名の一覧（この一覧づくりは、2段目の関数が出そろったあとの renderPage でやる） ----
  let openBtn = null; // 2段目（アイテム一覧）を開いているグループの項目

  // ---- 3段目：アイテムの中身（アイテム名にホバー・フォーカスしたとき） ----
  const hidePreview = () => {
    preview.hidden = true;
    preview._for = null;
  };
  const showPreview = (items, color, btn) => {
    if (preview._for === btn && !preview.hidden) return; // 同じ項目の上を動いているだけなら作り直さない
    preview._for = btn;
    preview.textContent = "";
    let used = 0;
    let more = 0;
    for (const it of items) {
      const take = it.lines.slice(0, Math.max(0, GROUP_PREVIEW_LINES - used));
      used += take.length;
      more += it.lines.length - take.length;
      if (!take.length) continue;
      const box = document.createElement("div");
      box.className = "my-ctx-preview-span";
      box.style.borderLeftColor = color;
      if (it.item) {
        const head = document.createElement("div");
        head.className = "my-ctx-preview-item";
        head.textContent = it.item;
        box.appendChild(head);
      }
      const body = document.createElement("div");
      body.textContent = take.map((s) => s || " ").join("\n");
      box.appendChild(body);
      preview.appendChild(box);
    }
    if (more > 0) {
      const m = document.createElement("div");
      m.className = "my-ctx-preview-more";
      m.textContent = `…他${more}行`;
      preview.appendChild(m);
    }
    preview.hidden = false;
    // アイテム一覧の、さらに外側に出す
    placeCtxPanel(root, preview, itemsPanel.getBoundingClientRect(), btn.getBoundingClientRect().top, itemsPanel.classList.contains("is-left"));
  };

  // ---- 2段目：選んだグループの中のアイテム名の一覧 ----
  const hideItems = () => {
    hidePreview();
    itemsPanel.hidden = true;
    if (openBtn) {
      openBtn.classList.remove("is-open");
      openBtn.setAttribute("aria-expanded", "false");
      openBtn = null;
    }
  };
  const showItems = (btn, focus = false) => {
    if (openBtn === btn && !itemsPanel.hidden) {
      if (focus) itemsPanel.querySelector(".my-ctx-entry, .my-ctx-all")?.focus({ preventScroll: true });
      return;
    }
    hideItems();
    openBtn = btn;
    btn.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");

    const entry = btn._entry;
    const items = libEntryItems(entry);
    itemsPanel.textContent = "";
    itemsPanel.style.setProperty("--c", entry.color);

    // 見出し（色＋グループ名）：クリックすると、その場で名前と色を変えられる
    //   名前：Enter か、見出しをもう一度押すと確定（Esc で取り消し） / 色：選ぶとすぐ反映
    const head = document.createElement("div");
    head.className = "my-ctx-panel-head";
    head.setAttribute("role", "button");
    head.tabIndex = 0;
    head.title = "クリックして名前・色を変更";
    const hdot = document.createElement("span");
    hdot.className = "my-ctx-dot";
    const hname = document.createElement("span");
    hname.className = "my-ctx-name";
    head.append(hdot, hname);
    itemsPanel.appendChild(head);
    let swatchRow = null;
    let nameInput = null;

    const paintEntryColor = () => {
      const c = entry.color;
      hdot.style.backgroundColor = c;
      itemsPanel.style.setProperty("--c", c);
      for (const b of itemsPanel.querySelectorAll(".my-ctx-item")) {
        b.style.setProperty("--c", c);
        b._color = c;
      }
      btn.style.setProperty("--c", c); // 一覧の側（グループ名の行）も合わせる
      const dot = btn.querySelector(".my-ctx-dot");
      if (dot) dot.style.backgroundColor = c;
      if (swatchRow) {
        for (const sw of swatchRow.children) sw.setAttribute("aria-checked", String(sw.dataset.color === c));
      }
    };
    const paintEntryName = () => {
      hname.textContent = entry.name;
      const n = btn.querySelector(".my-ctx-name");
      if (n) n.textContent = entry.name;
    };
    paintEntryColor();
    paintEntryName();

    const commitName = () => {
      if (!nameInput) return;
      const v = nameInput.value.trim();
      if (v && v !== entry.name) {
        updateLibraryGroup(entry, v, entry.color);
        paintEntryName();
      }
    };
    const stopEdit = (commit) => {
      if (!nameInput) return;
      if (commit) commitName();
      nameInput.remove();
      nameInput = null;
      swatchRow?.remove();
      swatchRow = null;
      head.classList.remove("is-editing");
      hname.hidden = false;
      paintEntryName();
    };
    const startEdit = () => {
      if (nameInput) return;
      pinned = true; // 編集中は、マウスが外れてもパネルを閉じない
      head.classList.add("is-editing");
      hname.hidden = true;
      nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "my-ctx-head-input";
      nameInput.maxLength = GROUP_NAME_MAX;
      nameInput.autocomplete = "off";
      nameInput.spellcheck = false;
      nameInput.value = entry.name;
      nameInput.setAttribute("aria-label", "グループ名");
      head.appendChild(nameInput);
      nameInput.addEventListener("keydown", (ev) => {
        if (ev.isComposing) return; // 日本語入力の変換中の Enter は確定に使わない
        if (ev.key === "Enter") {
          ev.preventDefault();
          stopEdit(true);
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          ev.stopPropagation(); // メニュー全体は閉じず、編集だけやめる
          stopEdit(false);
        }
      });
      swatchRow = document.createElement("div");
      swatchRow.className = "my-ctx-swatches";
      swatchRow.setAttribute("role", "radiogroup");
      swatchRow.setAttribute("aria-label", "グループの色");
      for (const c of GROUP_COLORS) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "my-ctx-swatch";
        sw.setAttribute("role", "radio");
        sw.setAttribute("aria-label", c.name);
        sw.title = c.name;
        sw.dataset.color = c.value;
        sw.style.backgroundColor = c.value;
        sw.addEventListener("click", () => {
          const v = nameInput ? nameInput.value.trim() : entry.name;
          // 入力途中の名前も一緒に確定する（色だけ変えるつもりなら、名前は変わらない）
          updateLibraryGroup(entry, v || entry.name, c.value);
          paintEntryColor();
          paintEntryName();
        });
        swatchRow.appendChild(sw);
      }
      head.after(swatchRow);
      paintEntryColor();
      nameInput.focus({ preventScroll: true });
      nameInput.select();
    };
    head.addEventListener("click", (ev) => {
      if (ev.target instanceof Element && ev.target.closest(".my-ctx-head-input")) return;
      if (nameInput) stopEdit(true);
      else startEdit();
    });
    head.addEventListener("keydown", (ev) => {
      if (ev.target !== head || (ev.key !== "Enter" && ev.key !== " ")) return;
      ev.preventDefault();
      startEdit();
    });

    const makeBtn = (cls, label, unnamed, countText, list, only) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `my-ctx-item ${cls}${unnamed ? " is-unnamed" : ""}`;
      b.setAttribute("role", "menuitem");
      b.style.setProperty("--c", entry.color);
      const n = document.createElement("span");
      n.className = "my-ctx-name";
      n.textContent = label;
      const c = document.createElement("span");
      c.className = "my-ctx-count";
      c.textContent = countText;
      b.append(n, c);
      b._items = list; // ホバーで出す中身
      b._color = entry.color;
      b.addEventListener("click", () => {
        closeContextMenu();
        insertGroupAtCursor(entry, saved, only).catch((err) => console.error("[ctx] 代入に失敗:", err));
      });
      itemsPanel.appendChild(b);
    };
    // アイテムが2つ以上あるときだけ、「すべて追加」を先頭に出す
    if (items.length > 1) makeBtn("my-ctx-all", "すべて追加", false, `${items.length}件`, items, null);

    // 「グループを削除」：保存してあるグループをライブラリから消す。押し間違いを防ぐため、2回押して実行する
    const del = document.createElement("button");
    del.type = "button";
    del.className = "my-ctx-item my-ctx-delete";
    del.setAttribute("role", "menuitem");
    del.innerHTML = `<span class="my-ctx-label">グループを削除</span>`;
    const delLabel = del.querySelector(".my-ctx-label");
    const disarm = () => {
      del.classList.remove("is-armed");
      delLabel.textContent = "グループを削除";
    };
    del.addEventListener("click", (e) => {
      if (!del.classList.contains("is-armed")) {
        del.classList.add("is-armed");
        delLabel.textContent = "もう一度押して削除";
        return;
      }
      deleteLibraryGroup(entry);
      renderPage(page); // 一覧を作り直す（メニューは閉じない）
      if (e.detail === 0) sub.querySelector(".my-ctx-group")?.focus({ preventScroll: true });
    });
    del.addEventListener("mouseleave", disarm);
    del.addEventListener("blur", disarm);
    itemsPanel.appendChild(del);

    const sep = document.createElement("div");
    sep.className = "my-ctx-sep";
    sep.setAttribute("role", "separator");
    itemsPanel.appendChild(sep);
    for (const it of items) {
      makeBtn("my-ctx-entry", ctxItemLabel(it), !it.item, `${it.lines.length}行`, [it], it);
    }

    itemsPanel.hidden = false;
    const flipped = placeCtxPanel(root, itemsPanel, sub.getBoundingClientRect(), btn.getBoundingClientRect().top, sub.classList.contains("is-left"));
    itemsPanel.classList.toggle("is-left", flipped);
    if (focus) itemsPanel.querySelector(".my-ctx-entry, .my-ctx-all")?.focus({ preventScroll: true });
  };

  // グループ名にホバー（キーボードなら選択移動）：アイテム名の一覧を出す。クリック：固定して先頭のアイテムへ
  sub.addEventListener("mouseover", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".my-ctx-group") : null;
    if (btn && btn._entry && btn !== openBtn) showItems(btn);
  });
  sub.addEventListener("focusin", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".my-ctx-group") : null;
    if (btn && btn._entry) showItems(btn);
  });
  sub.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".my-ctx-group") : null;
    if (!btn || !btn._entry) return;
    pinned = true;
    showItems(btn, e.detail === 0);
  });

  // アイテム名にホバー（キーボードなら選択移動）：中身を右側に出す
  const onEntry = (e) => {
    const b = e.target instanceof Element ? e.target.closest(".my-ctx-entry, .my-ctx-all") : null;
    if (b && b._items) showPreview(b._items, b._color, b);
    else if (e.target instanceof Element && e.target.closest(".my-ctx-delete, .my-ctx-panel-head")) hidePreview();
  };
  itemsPanel.addEventListener("mouseover", onEntry);
  itemsPanel.addEventListener("focusin", onEntry);
  itemsPanel.addEventListener("mouseleave", hidePreview);

  // ---- 1段目：グループ名の一覧。GROUP_TAB_SIZE 件ごとにタブで分ける（1ページぶんしかないときはタブを出さない） ----
  const tabs = document.createElement("div");
  tabs.className = "my-ctx-tabs";
  tabs.setAttribute("role", "tablist");
  const list = document.createElement("div");
  list.className = "my-ctx-list";
  sub.append(tabs, list);
  let page = 0;
  const pageCountOf = () => Math.max(1, Math.ceil(groupLibrary.length / GROUP_TAB_SIZE));

  const renderPage = (p) => {
    const count = pageCountOf();
    page = Math.max(0, Math.min(count - 1, p));
    hideItems();

    tabs.textContent = "";
    tabs.hidden = count <= 1;
    for (let i = 0; i < count; i++) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "my-ctx-tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(i === page));
      tab.tabIndex = -1;
      const from = i * GROUP_TAB_SIZE + 1;
      tab.textContent = `${from}–${Math.min(groupLibrary.length, from + GROUP_TAB_SIZE - 1)}`;
      tab.addEventListener("click", () => renderPage(i));
      tabs.appendChild(tab);
    }

    list.textContent = "";
    if (groupLibrary.length === 0) {
      list.innerHTML = `<div class="my-ctx-empty">グループがありません</div>`;
      return;
    }
    for (const entry of groupLibrary.slice(page * GROUP_TAB_SIZE, (page + 1) * GROUP_TAB_SIZE)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "my-ctx-item my-ctx-group";
      btn.setAttribute("role", "menuitem");
      btn.setAttribute("aria-haspopup", "menu");
      btn.setAttribute("aria-expanded", "false");
      btn.style.setProperty("--c", entry.color);
      const dot = document.createElement("span");
      dot.className = "my-ctx-dot";
      dot.style.backgroundColor = entry.color;
      const name = document.createElement("span");
      name.className = "my-ctx-name";
      name.textContent = entry.name;
      const cnt = document.createElement("span");
      cnt.className = "my-ctx-count";
      cnt.textContent = String(libEntryItems(entry).length);
      const arrow = document.createElement("span");
      arrow.className = "my-ctx-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "›";
      btn.append(dot, name, cnt, arrow);
      btn._entry = entry;
      list.appendChild(btn);
    }
  };
  renderPage(0);

  // focus: true のとき（クリック・キーボード）だけ、一覧の先頭の項目にフォーカスを移す。ホバーで開いたときは動かさない
  const toggleSub = (open, focus = false) => {
    sub.hidden = !open;
    parent.setAttribute("aria-expanded", String(open));
    root.classList.toggle("is-sub-open", open);
    hideItems();
    if (!open) return;
    // 右に収まらないときは左側に、下に収まらないときは上へずらす
    sub.classList.remove("is-left");
    sub.style.top = "";
    sub.style.maxHeight = `${window.innerHeight - 16}px`;
    const r = sub.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) sub.classList.add("is-left");
    const r2 = sub.getBoundingClientRect();
    if (r2.bottom > window.innerHeight - 8) {
      sub.style.top = `${-7 - (r2.bottom - (window.innerHeight - 8))}px`;
    }
    if (focus) sub.querySelector(".my-ctx-group")?.focus({ preventScroll: true });
  };

  // 「グループを代入」にホバーしただけで一覧を開く。メニューの各パネル（項目と一覧・アイテム一覧）から出て少し経つと閉じる。
  // クリック・キーボードで開いたときは「固定」し、ホバーが外れても閉じない（もう一度クリックで閉じる）
  let pinned = false;
  let closeTimer = 0;
  const cancelClose = () => clearTimeout(closeTimer);
  const scheduleClose = () => {
    clearTimeout(closeTimer);
    if (pinned) return;
    closeTimer = setTimeout(() => toggleSub(false), 250);
  };
  row.addEventListener("mouseenter", () => {
    cancelClose();
    if (sub.hidden) toggleSub(true);
  });
  row.addEventListener("mouseleave", scheduleClose);
  itemsPanel.addEventListener("mouseenter", cancelClose); // 一覧からアイテム一覧へ移るあいだに閉じないようにする
  itemsPanel.addEventListener("mouseleave", scheduleClose);
  parent.addEventListener("click", (e) => {
    if (!sub.hidden && pinned) {
      pinned = false;
      toggleSub(false);
    } else {
      pinned = true;
      if (sub.hidden) toggleSub(true, e.detail === 0);
    }
  });

  // メニューを押しても、エディタのフォーカス・選択を動かさない
  root.addEventListener("mousedown", (e) => {
    if (!(e.target instanceof Element && e.target.matches("input"))) e.preventDefault();
  });
  root.addEventListener("contextmenu", (e) => e.preventDefault());
  ["keyup", "keypress"].forEach((type) => root.addEventListener(type, (e) => e.stopPropagation())); // 名前の入力をDeepL側に渡さない
  // DeepL側のショートカットにキー入力を渡さず、矢印キーで項目を動かす
  //   ↑↓：いまのパネルの中で移動 / →：次の段（グループ→アイテム）へ / ←：前の段へ戻る / Esc：閉じる
  root.addEventListener("keydown", (e) => {
    e.stopPropagation();
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && root.contains(active)) return; // 名前の入力中：矢印や Esc は入力欄の側で扱う
    const scopeItems = () => {
      const box = active instanceof Element ? active.closest(".my-ctx-items, .my-ctx-sub") : null;
      if (box && root.contains(box)) return [...box.querySelectorAll(".my-ctx-item:not(:disabled)")];
      return [addBtn, parent].filter((b) => !b.disabled);
    };
    const move = (step) => {
      const items = scopeItems();
      if (!items.length) return;
      const i = items.indexOf(active);
      const next = i < 0 ? (step > 0 ? 0 : items.length - 1) : (i + step + items.length) % items.length;
      items[next].focus({ preventScroll: true });
    };

    if (e.key === "Escape") {
      e.preventDefault();
      closeContextMenu();
      restoreGroupSelection(saved);
    } else if ((e.key === "PageDown" || e.key === "PageUp") && !sub.hidden) {
      e.preventDefault();
      renderPage(page + (e.key === "PageDown" ? 1 : -1)); // タブを切り替える
      sub.querySelector(".my-ctx-group")?.focus({ preventScroll: true });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "ArrowRight") {
      if (active === parent) {
        e.preventDefault();
        pinned = true;
        toggleSub(true, true);
      } else if (active instanceof Element && active.classList.contains("my-ctx-group")) {
        e.preventDefault();
        pinned = true;
        showItems(active, true);
      }
    } else if (e.key === "ArrowLeft") {
      if (itemsPanel.contains(active) && openBtn) {
        e.preventDefault();
        openBtn.focus({ preventScroll: true }); // アイテム一覧から、グループ名へ戻る
      } else if (!sub.hidden && sub.contains(active)) {
        e.preventDefault();
        pinned = false;
        toggleSub(false);
        parent.focus({ preventScroll: true });
      }
    }
  });

  const onOutside = (e) => {
    if (!root.isConnected) return cleanup();
    if (!root.contains(e.target)) closeContextMenu();
  };
  const onScroll = (e) => {
    if (e.target instanceof Node && root.contains(e.target)) return; // メニュー自身のスクロールは無視
    closeContextMenu();
  };
  const onClose = () => closeContextMenu();
  const cleanup = () => {
    clearTimeout(closeTimer);
    document.removeEventListener("pointerdown", onOutside, true);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onClose);
    window.removeEventListener("blur", onClose);
  };
  document.addEventListener("pointerdown", onOutside, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onClose);
  window.addEventListener("blur", onClose);

  layer.appendChild(root);
  ctxMenu = { root, saved, cleanup };

  // 右クリックした位置に置く。画面からはみ出すときは寄せる
  const origin = layer.getBoundingClientRect();
  const w = root.offsetWidth;
  const h = root.offsetHeight;
  const x = Math.max(8, Math.min(point.x, window.innerWidth - w - 8));
  const y = Math.max(8, Math.min(point.y, window.innerHeight - h - 8));
  root.style.left = `${x - origin.left}px`;
  root.style.top = `${y - origin.top}px`;
}

function setupContextMenu() {
  document.addEventListener(
    "contextmenu",
    (e) => {
      if (e.shiftKey) {
        closeContextMenu(); // Shift+右クリック：ブラウザ標準のメニュー
        return;
      }
      if (!(e.target instanceof Element)) return;
      if (e.target.closest(".my-ctx-menu")) {
        e.preventDefault();
        return;
      }
      const editor = getSourceEditor();
      if (!editor || !editor.contains(e.target)) {
        closeContextMenu();
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      // 右クリックした位置のカーソル（選択範囲）を覚えておく。選択がエディタの外なら、クリック位置から作る
      let saved = null;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (editor.contains(r.startContainer) && editor.contains(r.endContainer)) saved = r.cloneRange();
      }
      if (!saved && document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (r && editor.contains(r.startContainer)) saved = r;
      }
      openContextMenu(saved, { x: e.clientX, y: e.clientY });
    },
    true
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && ctxMenu) closeContextMenu();
    },
    true
  );
}

// HTMLからDOM要素を作る
function createElementToInject() {
  const template = document.createElement("template");
  template.innerHTML = HTML.trim();
  const el = template.content.firstElementChild;
  el.id = CONFIG.injectedId;

  el.querySelectorAll("[data-slider]").forEach(setupSlider);
  setupAspect(el);
  setupGpuSelect(el);
  setupImagePick(el);
  setupAspectDropdown(el);
  setupAdvanced(el);

  const swapButton = el.querySelector(".swap-button");
  if (swapButton) {
    swapButton.addEventListener("click", () => {
      // 比率が選ばれているときは、比率も反転する（4:3 → 3:4）。先に反転しておけば、入れ替え後の値と矛盾しない
      const aspectSelect = el.querySelector(".aspect-select");
      if (aspectSelect && aspectSelect.value) {
        const [a, b] = aspectSelect.value.split(":");
        aspectSelect.value = `${b}:${a}`;
        el.querySelector(".aspect-dd")?.sync?.();
      }
      const [widthRange, heightRange] = el.querySelectorAll(".slider-range");
      const tmp = widthRange.value;
      widthRange.value = heightRange.value;
      heightRange.value = tmp;
      widthRange.dispatchEvent(new Event("input"));
      heightRange.dispatchEvent(new Event("input"));
    });
  }

  const generateBtn = el.querySelector("#generate_btn");
  generateBtn.addEventListener("click", () => runGenerate(el, generateBtn));

  // 生成枚数スライダーの値に関係なく、1枚だけ生成する
  const generateOneBtn = el.querySelector("#generate_one_btn");
  generateOneBtn.addEventListener("click", () => runGenerate(el, generateOneBtn, 1));

  const stopBtn = el.querySelector("#stop_btn");
  stopBtn.addEventListener("click", () => runStop(el, stopBtn));
  return el;
}

// 停止ボタンを押したときの処理。gen.py に実行中の生成の中断とコンテナの停止を依頼する。
async function runStop(el, stopBtn) {
  if (stopBtn.disabled) return;
  stopBtn.disabled = true; // 連打防止（応答が返るまで）

  try {
    const res = await callApi("/api/stop", {});

    if (res?.networkError) {
      console.error("[stop] サーバーに接続できません:", res);
      setStatus(el, "noServer", res.error || "");
      flashGlow("error");
    } else if (res?.extensionError) {
      console.error("[stop] 拡張機能との通信に失敗:", res);
      setStatus(el, "error", "拡張機能との通信に失敗しました。ページをリロードしてください");
      flashGlow("error");
    } else if (res?.ok) {
      setStatus(el, "stopped");
    } else {
      console.error("[stop] サーバーがエラーを返しました:", res);
      setStatus(el, "error", describeHttpError(res));
      flashGlow("error");
    }
  } finally {
    stopBtn.disabled = false;
  }
}

// 生成ボタンを押したときの処理本体。ボタンクリックからもCtrl+Enterのショートカットからも呼ばれる。
// overrideNums を渡すと、生成枚数スライダーの代わりにその枚数で生成する（スライダーの値や保存値は変えない）
async function runGenerate(el, generateBtn, overrideNums) {
  if (generateBtn.disabled) return;
  const [widthRange, heightRange, numsRange] = el.querySelectorAll(".slider-range");

  // 押した時点の翻訳前(jp)・翻訳後(en)のテキストを送る
  const prompt_en = getTranslatedText();
  // グループがあるときは、どの行からどの行までがどのグループかを <group> マーカー行で示した日本語テキストにする。
  // 英文(prompt_en)にはグループ情報を含めない
  const groupedJp = getSourceTextWithGroups();
  const prompt_jp = groupedJp ?? getSourceText();
  if (!prompt_en) {
    updateGenerateState();
    return;
  }

  flashGlow("press");

  const res = await callApi("/api/generate", {
    prompt_jp: prompt_jp,
    // マーカーつきのときは、行の区切りがすでに正確なので、サーバー側の改行補正をしない
    jp_exact: groupedJp !== null,
    prompt_en: prompt_en,
    height: heightRange.value,
    width: widthRange.value,
    nums: overrideNums ?? numsRange.value,
    GPU: getSelectedGpu(el),
    REF_BOOST: Number(el.querySelector(".adv-ref-boost").value),
    GROUNDING_PX: Number(el.querySelector(".adv-grounding-px").value),
    // 詳細設定の LoRA。[{ version_id: "3409322", strength: 0.8 }, ...]（指定がなければ空の配列）
    loras: getLoras(el),
    // 参照画像を選んでいるときだけ、そのローカルパスを送る（gen.py が読み込んで画像編集で生成する）
    ...(selectedImagePath ? { image_path: selectedImagePath } : {}),
    // 「1枚だけ生成」は1回生成したら止める（サーバー側の連続生成をしない）
    once: overrideNums !== undefined,
  });

  if (res?.networkError) {
    console.error("[generate] サーバーに接続できません:", res);
    setStatus(el, "noServer", res.error || "");
    flashGlow("error");
  } else if (res?.extensionError) {
    // 拡張機能を再読み込みした後にタブをリロードしていない場合など
    console.error("[generate] 拡張機能との通信に失敗:", res);
    setStatus(el, "error", "拡張機能との通信に失敗しました。ページをリロードしてください");
    flashGlow("error");
  } else if (res?.ok) {
    setStatus(el, res.data?.queued ? "queued" : "started");
    // 今回の生成で使った width / height / 生成枚数 を保存する（prompt は保存しない）
    storageSet({
      [STORAGE_KEYS.width]: widthRange.value,
      [STORAGE_KEYS.height]: heightRange.value,
      [STORAGE_KEYS.nums]: numsRange.value,
      [STORAGE_KEYS.aspect]: el.querySelector(".aspect-select")?.value ?? "",
      [STORAGE_KEYS.gpu]: getSelectedGpu(el),
      [STORAGE_KEYS.refBoost]: el.querySelector(".adv-ref-boost").value,
      [STORAGE_KEYS.groundingPx]: el.querySelector(".adv-grounding-px").value,
      [STORAGE_KEYS.loras]: getLoras(el),
    });
  } else {
    console.error("[generate] サーバーがエラーを返しました:", res);
    setStatus(el, "error", describeHttpError(res));
    flashGlow("error");
  }
}

// ===== 画像をページにドラッグしてきたとき =====
// 画像ファイルをドラッグしたままページに入ると、パネルの中身をすべて隠して、
// 点線の枠と「参照する画像をここにドラッグ」の文字だけにする（見た目は content.scss の .image-drop）。
// html に付ける class で切り替えるので、DeepLの再描画でパネルが作り直されても表示は崩れない。
const IMAGE_DRAG_CLASS = "my-image-dragging";
const IMAGE_DRAG_IDLE_MS = 400; // dragover が途切れてからこの時間(ms)で、ドラッグが終わったとみなして元に戻す

// ドラッグ中のものが「画像ファイル」か。ドラッグ中は中身を読めないので、種類(type)だけで判定する
function isImageDrag(e) {
  const dt = e.dataTransfer;
  if (!dt || !Array.from(dt.types || []).includes("Files")) return false;
  const items = Array.from(dt.items || []);
  if (items.length === 0) return true; // 種類が分からないときは、ファイルなら表示する
  return items.some((it) => it.kind === "file" && it.type.startsWith("image/"));
}

// 点線の枠にドロップされた画像。
// ※拡張機能はドロップされたファイルの「本当のパス」を取得できないので、いまは選択状態にはしていない
//   （参照画像は gen.py にパスを渡す作りのため）。ここに、サーバーへのアップロードなどの処理をつなげる
function onReferenceImageDropped(file) {
  console.info("[image-drop] 画像がドロップされました:", file.name, file.type, file.size);
}

function setupImageDrop() {
  const root = document.documentElement;
  let idleTimer = 0;
  const zone = () => document.querySelector(".image-drop");
  const zoneOf = (e) => (e.target instanceof Element ? e.target.closest(".image-drop") : null);

  const hide = () => {
    clearTimeout(idleTimer);
    idleTimer = 0;
    root.classList.remove(IMAGE_DRAG_CLASS);
    zone()?.classList.remove("is-over");
  };
  const show = () => {
    root.classList.add(IMAGE_DRAG_CLASS);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(hide, IMAGE_DRAG_IDLE_MS); // dragover が来る間は延長され続ける
  };

  document.addEventListener("dragenter", (e) => { if (isImageDrag(e)) show(); }, true);
  document.addEventListener(
    "dragover",
    (e) => {
      if (!isImageDrag(e)) return;
      show();
      const over = zoneOf(e);
      zone()?.classList.toggle("is-over", !!over);
      if (over) {
        e.preventDefault(); // ここへ落とせるようにする
        e.dataTransfer.dropEffect = "copy";
      }
    },
    true
  );
  // ウィンドウの外へ出たら、すぐ元に戻す
  document.addEventListener(
    "dragleave",
    (e) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) hide();
    },
    true
  );
  document.addEventListener(
    "drop",
    (e) => {
      const inZone = !!zoneOf(e) && root.classList.contains(IMAGE_DRAG_CLASS);
      hide();
      if (!inZone) return; // 点線の枠の外は、これまでどおりDeepL側に任せる
      e.preventDefault(); // ブラウザが画像を開いてしまうのを防ぐ
      e.stopPropagation(); // DeepLのファイル翻訳に渡さない
      const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith("image/"));
      if (file) onReferenceImageDropped(file);
    },
    true
  );
  document.addEventListener("dragend", hide, true);
}

// 現在フォーカスしている要素が、翻訳元（入力側）エディタの中かどうかを判定する
function isFocusInSourceEditor() {
  const active = document.activeElement;
  if (!active) return false;
  return CONFIG.sourceSelectors.some((selector) => {
    const container = document.querySelector(selector);
    return container && container.contains(active);
  });
}

// ソース側エディタでCtrl+Enter（Macの場合はCmd+Enterも）が押されたら、生成ボタンを押したのと同じ処理を走らせる
function setupGenerateShortcut() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (!(e.ctrlKey || e.metaKey)) return;
    if (!isFocusInSourceEditor()) return;

    const el = document.getElementById(CONFIG.injectedId);
    if (!el) return;
    const generateBtn = el.querySelector("#generate_btn");
    if (!generateBtn) return;

    e.preventDefault();
    runGenerate(el, generateBtn);
  });
}

function inject() {
  if (document.getElementById(CONFIG.injectedId)) return true;

  const target = document.querySelector(CONFIG.targetSelector);
  if (!target) return false;

  target.insertAdjacentElement(CONFIG.position, createElementToInject());
  applyTheme();
  updateGenerateState();

  ensureScrollable();
  const injected = document.getElementById(CONFIG.injectedId);
  if (injected) restoreSavedParams(injected); // 前回生成時のメタデータ（prompt除く）を復元

  return true;
}

// Ctrl+Enter(Cmd+Enter)での生成ショートカットを有効化
setupGenerateShortcut();

// 画像をページにドラッグしてきたら、パネルを「参照する画像をここにドラッグ」の表示に切り替える
setupImageDrop();

// 選択した文字と同じ文字をマークする機能を有効化
setupSameHighlight();

// Ctrl+D で、選択した文字と同じ文字をすべて同時に編集できるようにする（標準のCtrl+Dは無効化）
setupMultiEdit();

// 選択した文字をクリックすると、その行にグループ（左ボーダー）を付けるポップアップを出す
setupGroupEdit();

// グループ情報つきのテキスト（<group ...> マーカー）を貼り付けたら、マーカーを外してグループを復元する
setupGroupPaste();

// 翻訳元エディタで右クリックしたら、自前のメニュー（グループを代入）を出す
setupContextMenu();

// エディタが編集されたら、グループと行の対応を取り直す（Ctrl+Z などで行が作り直されても、グループを保つ）
setupGroupObserver();

// Ctrl+Z / Ctrl+Y の直後は、縮めたグループを元の大きさに戻せるか確かめる
setupGroupHistory();

// グループの最後の行の末尾で Enter：新しい行までグループを伸ばす。空行でもう一度 Enter：グループから外す
setupGroupEnter();

// Alt を押している間、縦線のホバー表示を「この要素だけ」に切り替える
setupGroupAltKey();

// ページを再読み込みしても、保存しておいたグループを同じ文字の行に付け直す
loadSavedGroups();

// 最初に一度試す
inject();
applyTheme();
hideOutsideMainSection();

// SPAなどで後から描画されるだとか再描画で消される場合に備えて監視する
let refreshTimer = null;
const observer = new MutationObserver((mutations) => {
  const mine = document.getElementById(CONFIG.injectedId);

  // 自分が差し込んだ要素の中の変化だけなら何もしない（自分の更新で再発火するのを防ぐ）
  // グループの縦線・ポップアップの更新でも再発火しないようにする
  const groupLayer = document.getElementById("my-group-layer");
  const onlyGroupLayerMoved = (m) =>
    m.type === "childList" &&
    m.addedNodes.length + m.removedNodes.length > 0 &&
    [...m.addedNodes, ...m.removedNodes].every((n) => n.id === "my-group-layer");
  if (mine && mutations.every((m) => mine.contains(m.target) || groupLayer?.contains(m.target) || onlyGroupLayerMoved(m))) return;

  // DeepL側は頻繁にDOMが変わるので、まとめて少し待ってから1回だけ処理する
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (!document.getElementById(CONFIG.injectedId)) inject();
    applyTheme();
    hideOutsideMainSection();
    updateGenerateState();
    ensureScrollable();
  }, 150);
});
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

// DeepLのテーマ切り替え（html/bodyのclassやstyleの変化）とOSのダーク設定の変化に追従する
let themeTimer = null;
const scheduleTheme = () => {
  clearTimeout(themeTimer);
  themeTimer = setTimeout(applyTheme, 100);
};
const themeObserver = new MutationObserver(scheduleTheme);
[document.documentElement, document.body].forEach((node) => {
  if (node) {
    themeObserver.observe(node, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-mode", "data-color-scheme"],
    });
  }
});