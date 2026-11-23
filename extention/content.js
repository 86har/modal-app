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

// 前回「生成」を実行したときの width / height / 生成枚数 を保存しておくキー
// （prompt は保存しない。リロード後の初期値として復元するためだけに使う）
const STORAGE_KEYS = {
  width: "lastGenWidth",
  height: "lastGenHeight",
  nums: "lastGenNums",
  aspect: "lastGenAspect",
  gpu: "lastGenGpu",
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
  step: 6, // 同じ行に複数のグループが付いたとき、縦線を左へずらす幅(px)
};
const GROUP_NAME_MAX = 40; // グループ名の最大文字数
const GROUP_TARGET_HIGHLIGHT = "my-group-target"; // ポップアップを開いている間、対象の文字を見せるためのハイライト名

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
        <p class="generate-status status-bottom" data-state="idle"><span class="status-text">翻訳画面に入力してください</span></p>
        <div class="generates">
            <button type="button" id="stop_btn">停止</button>
            <button type="button" id="generate_one_btn" disabled>1枚だけ生成</button>
            <button type="button" id="generate_btn" disabled>生成</button>
        </div>
    </div>
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

  const sync = () => {
    value.textContent = `${range.value}${unit}`;
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
html.my-force-dark .my-glow-overlay,
html.my-force-dark .my-group-bar,
html.my-force-dark .my-group-popover {
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

function applyTheme() {
  ensureHideSiblingsStyle();

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
const groups = []; // { id, name, color, anchors: [Node] }
let groupSeq = 0;
let groupLastColor = GROUP_COLORS[5].value; // 前回選んだ色（次回のポップアップの初期値）
let groupPopover = null; // { root, saved, onOutside }
let groupPending = null; // mousedown 時点の { range, anchors, x, y }
let groupRaf = 0;

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
}`;
  (document.head || document.documentElement).appendChild(style);
}

// 縦線とポップアップを置くレイヤー（body直下）。中に縦線用の入れ物を1つ持つ
function ensureGroupLayer() {
  let layer = document.getElementById("my-group-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "my-group-layer";
    const bars = document.createElement("div");
    bars.className = "my-group-bars";
    layer.appendChild(bars);
    document.body.appendChild(layer);
  }
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

// 縦線を描く。消えた行のグループはここで取り除く
function renderGroupBars() {
  for (let i = groups.length - 1; i >= 0; i--) {
    groups[i].anchors = groups[i].anchors.filter((a) => a.isConnected);
    if (groups[i].anchors.length === 0) groups.splice(i, 1);
  }
  const layer = document.getElementById("my-group-layer");
  if (!layer) return;
  const box = layer.querySelector(".my-group-bars");

  // body に filter があると position の基準が変わるので、レイヤー自身の位置を原点にして座標を出す
  const origin = layer.getBoundingClientRect();
  const stack = new Map(); // 同じ行に何本目の縦線か
  const items = [];
  for (const g of groups) {
    for (const a of g.anchors) {
      const r = groupNodeRect(a);
      if (r.height <= 0) continue;
      const n = stack.get(a) || 0;
      stack.set(a, n + 1);
      items.push({ g, r, n });
    }
  }

  while (box.children.length > items.length) box.lastChild.remove();
  while (box.children.length < items.length) {
    const d = document.createElement("div");
    d.className = "my-group-bar";
    box.appendChild(d);
  }
  items.forEach(({ g, r, n }, i) => {
    const d = box.children[i];
    const left = r.left - origin.left - GROUP_BAR.gap - GROUP_BAR.width - n * GROUP_BAR.step;
    const key = `${left.toFixed(1)}|${(r.top - origin.top).toFixed(1)}|${r.height.toFixed(1)}|${g.color}`;
    if (d._key !== key) {
      d._key = key;
      d.style.left = `${left}px`;
      d.style.top = `${r.top - origin.top}px`;
      d.style.width = `${GROUP_BAR.width}px`;
      d.style.height = `${r.height}px`;
      d.style.backgroundColor = g.color;
    }
    if (d.title !== g.name) d.title = g.name; // ホバーでグループ名が見える
  });
}

function groupLoop() {
  groupRaf = 0;
  renderGroupBars();
  if (groups.length) groupRaf = requestAnimationFrame(groupLoop);
}

function startGroupLoop() {
  if (!groupRaf) groupRaf = requestAnimationFrame(groupLoop);
}

// グループを追加する。同じ名前・同じ色のグループがあれば、そこに行を足す
function addGroup(name, color, anchors) {
  let g = groups.find((x) => x.name === name && x.color === color);
  if (!g) {
    g = { id: ++groupSeq, name, color, anchors: [] };
    groups.push(g);
  }
  for (const a of anchors) if (!g.anchors.includes(a)) g.anchors.push(a);
  ensureGroupLayer();
  renderGroupBars();
  startGroupLoop();
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
  if (restoreSelection) restoreGroupSelection(pop.saved.range);
}

// ポップアップ：[グループ名] [8色のパレット] [グループを追加]
//   saved: { range, anchors }（クリックした時点の選択範囲と、含まれる行）  point: クリック位置
function openGroupPopover(saved, point) {
  closeGroupPopover();
  const layer = ensureGroupLayer();

  const root = document.createElement("div");
  root.className = "my-group-popover";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "グループを追加");
  root.innerHTML = `
    <input type="text" class="my-group-name" placeholder="グループ名" maxlength="${GROUP_NAME_MAX}"
        autocomplete="off" spellcheck="false" aria-label="グループ名">
    <div class="my-group-colors" role="radiogroup" aria-label="グループの色">
      ${GROUP_COLORS.map(
        (c) => `<button type="button" class="my-group-swatch" role="radio" aria-checked="false"
          aria-label="${c.name}" title="${c.name}" data-color="${c.value}" style="background-color:${c.value}"></button>`
      ).join("")}
    </div>
    <button type="button" class="my-group-add">グループを追加</button>
  `;

  const input = root.querySelector(".my-group-name");
  const swatches = [...root.querySelectorAll(".my-group-swatch")];
  let color = GROUP_COLORS.some((c) => c.value === groupLastColor) ? groupLastColor : GROUP_COLORS[0].value;
  const paintSwatches = () =>
    swatches.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.color === color)));
  paintSwatches();

  const commit = () => {
    const name = input.value.trim() || `グループ${groupSeq + 1}`;
    const anchors = saved.anchors.filter((a) => a.isConnected);
    if (anchors.length) addGroup(name, color, anchors);
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
    if (e.target !== input) e.preventDefault();
  });
  // DeepL側のショートカットにキー入力を渡さない
  ["keydown", "keyup", "keypress"].forEach((type) => root.addEventListener(type, (e) => e.stopPropagation()));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      commit();
    }
  });

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

  // 対象の文字を見せたままにする
  if (window.CSS && CSS.highlights && typeof Highlight !== "undefined") {
    CSS.highlights.set(GROUP_TARGET_HIGHLIGHT, new Highlight(saved.range));
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

  input.focus({ preventScroll: true });
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

// HTMLからDOM要素を作る
function createElementToInject() {
  const template = document.createElement("template");
  template.innerHTML = HTML.trim();
  const el = template.content.firstElementChild;
  el.id = CONFIG.injectedId;

  el.querySelectorAll("[data-slider]").forEach(setupSlider);
  setupAspect(el);
  setupGpuSelect(el);
  setupAspectDropdown(el);

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
  const prompt_jp = getSourceText();
  if (!prompt_en) {
    updateGenerateState();
    return;
  }

  flashGlow("press");

  const res = await callApi("/api/generate", {
    prompt_jp: prompt_jp,
    prompt_en: prompt_en,
    height: heightRange.value,
    width: widthRange.value,
    nums: overrideNums ?? numsRange.value,
    GPU: getSelectedGpu(el),
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
    });
  } else {
    console.error("[generate] サーバーがエラーを返しました:", res);
    setStatus(el, "error", describeHttpError(res));
    flashGlow("error");
  }
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

  const injected = document.getElementById(CONFIG.injectedId);
  if (injected) restoreSavedParams(injected); // 前回生成時のメタデータ（prompt除く）を復元

  return true;
}

// Ctrl+Enter(Cmd+Enter)での生成ショートカットを有効化
setupGenerateShortcut();

// 選択した文字と同じ文字をマークする機能を有効化
setupSameHighlight();

// Ctrl+D で、選択した文字と同じ文字をすべて同時に編集できるようにする（標準のCtrl+Dは無効化）
setupMultiEdit();

// 選択した文字をクリックすると、その行にグループ（左ボーダー）を付けるポップアップを出す
setupGroupEdit();

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
  if (mine && mutations.every((m) => mine.contains(m.target) || groupLayer?.contains(m.target))) return;

  // DeepL側は頻繁にDOMが変わるので、まとめて少し待ってから1回だけ処理する
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (!document.getElementById(CONFIG.injectedId)) inject();
    applyTheme();
    hideOutsideMainSection();
    updateGenerateState();
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