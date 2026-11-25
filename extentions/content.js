const CONFIG = {

  forceDark: true,

  hideSiblings: true,
  mainSectionSelector: '[data-layout-id="mainSectionWrapper"]',

  targetSelector: '[data-layout-id="editor-layout-footer"]',

  dictionaryHeading: "辞書",

  targetSelector: '[data-layout-id="editor-layout-footer"]',
  position: "beforebegin",
  injectedId: "my-injected-element",

  translationSelectors: [
    '[data-testid="translator-target-input"]',
    "#target-dummydiv",
  ],

  sourceSelectors: [
    '[data-testid="translator-source-input"]',
    "#source-dummydiv",
  ],
};

const SLIDER = { min: 512, max: 2048, step: 16 };

const ADV = {
  refBoost: { min: 0.1, max: 5, step: 0.1, def: 1 },
  groundingPx: { min: 128, max: 2048, step: 64, def: 1024 },
};

const LORA = {
  strength: { min: 0, max: 2, step: 0.05, def: 1 },
  popMinHeight: 560,
  libraryMax: 30,
  pageSize: 10,
  baseModel: /krea\s*[-_. ]?\s*2/i,
};

const STORAGE_KEYS = {
  width: "lastGenWidth",
  height: "lastGenHeight",
  nums: "lastGenNums",
  aspect: "lastGenAspect",
  gpu: "lastGenGpu",
  refBoost: "lastGenRefBoost",
  groundingPx: "lastGenGroundingPx",
};

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
const GPU_DEFAULT = "L4";

const ASPECT_PREVIEW = {
  size: 132,
  duration: 320,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

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
  width: 4,
  gap: 10,
  step: 6,
};
const GROUP_TAG = {
  maxWidth: 120,
};
const GROUP_NAME_MAX = 40;
const GROUP_ITEM_MAX = 40;
const GROUP_SUGGEST_MAX = 10;
const GROUP_KEEP_MAX = 30;
const GROUP_TARGET_HIGHLIGHT = "my-group-target";
const GROUP_STORAGE_KEY = "savedGroups";
const GROUP_SNAP_HISTORY = 10;
const GROUP_SNAP_TEXT_MAX = 200;
const GROUP_ORPHAN_MAX = 30;

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
        <div class="lora-wrap">
            <button type="button" class="lora-button" aria-haspopup="dialog" aria-expanded="false">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/>
                    <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>
                </svg>
                <span>LoRA</span>
                <span class="lora-badge" hidden></span>
            </button>
            <div class="lora-pop" role="dialog" aria-label="LoRA" hidden>
                <div class="lora-search">
                    <input type="text" class="lora-url" placeholder="CivitAI の URL を貼り付け"
                        autocomplete="off" spellcheck="false" aria-label="CivitAI の URL">
                    <button type="button" class="lora-go">確定</button>
                </div>
                <p class="lora-msg" hidden></p>
                <div class="lora-results" hidden></div>
                <div class="lora-lib-head">
                    <span class="lora-lib-title">LoRA 一覧</span>
                    <span class="lora-lib-count"></span>
                </div>
                <div class="lora-tabs" role="tablist" hidden></div>
                <div class="lora-groups"></div>
                <p class="lora-lib-empty">追加した LoRA はここに表示されます</p>
            </div>
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

function storageSet(obj) {
  try {
    chrome.storage.local.set(obj);
  } catch (err) {
    console.warn("[storage] 保存に失敗しました:", err);
  }
}

async function restoreSavedParams(el) {
  const saved = await storageGet(Object.values(STORAGE_KEYS));
  const [widthRange, heightRange, numsRange] = el.querySelectorAll(".slider-range");
  const apply = (range, val) => {
    if (val === undefined || val === null || range == null) return;
    range.value = val;
    range.dispatchEvent(new Event("input"));
  };
  apply(widthRange, saved[STORAGE_KEYS.width]);
  apply(heightRange, saved[STORAGE_KEYS.height]);
  apply(numsRange, saved[STORAGE_KEYS.nums]);
  apply(el.querySelector(".adv-ref-boost"), saved[STORAGE_KEYS.refBoost]);
  apply(el.querySelector(".adv-grounding-px"), saved[STORAGE_KEYS.groundingPx]);

  const aspectSelect = el.querySelector(".aspect-select");
  const savedAspect = saved[STORAGE_KEYS.aspect];
  if (aspectSelect && savedAspect !== undefined && [...aspectSelect.options].some((o) => o.value === savedAspect)) {
    aspectSelect.value = savedAspect;
    el.querySelector(".aspect-dd")?.sync?.();
  }

  el.querySelector(".gpu-select")?.setGpu?.(saved[STORAGE_KEYS.gpu]);
}

const STATUS = {
  idle: { text: "翻訳画面に入力してください" },
  ready: { text: "" },
  queued: { text: "予約完了、次回の生成で出力されます" },
  started: { text: "生成が開始されました" },
  stopped: { text: "停止を要求しました（コンテナを停止します）" },
  noServer: { text: "gen.pyを起動しているか確認してください" },
  error: { text: "予期せぬエラーが発生しました" },
};

const DETAIL_MAX = 120;
function setStatus(el, key, detail = "") {

  const labels = el.querySelectorAll(".generate-status");
  const box = labels[0];
  const short = detail.length > DETAIL_MAX ? detail.slice(0, DETAIL_MAX) + "…" : detail;
  const text = STATUS[key].text + (short ? `（${short}）` : "");
  if (box.dataset.state === key && box.querySelector(".status-text").textContent === text) return;
  labels.forEach((label) => {
    label.dataset.state = key;
    label.querySelector(".status-text").textContent = text;
    label.title = detail;
  });
}

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

function describeHttpError(res) {
  const head = `HTTP ${res?.status ?? "?"}${res?.statusText ? " " + res.statusText : ""}`;
  const msg = extractServerMessage(res);
  return msg ? `${head}: ${msg}` : head;
}

function updateGenerateState() {
  const el = document.getElementById(CONFIG.injectedId);
  if (!el) return;
  const btn = el.querySelector("#generate_btn");
  const hasText = !!getTranslatedText();
  if (btn.disabled === hasText) btn.disabled = !hasText;
  const oneBtn = el.querySelector("#generate_one_btn");
  if (oneBtn && oneBtn.disabled === hasText) oneBtn.disabled = !hasText;

  const state = el.querySelector(".generate-status").dataset.state;
  if (state === "idle" || state === "ready") {
    setStatus(el, hasText ? "ready" : "idle");
  }
}

function updateFill(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.setProperty("--fill", `${pct}%`);
}

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

function getTranslatedText() {
  for (const selector of CONFIG.translationSelectors) {
    const node = document.querySelector(selector);
    const text = (node?.innerText || node?.textContent || "").trim();
    if (text) return text;
  }
  return "";
}

function getSourceText() {
  for (const selector of CONFIG.sourceSelectors) {
    const node = document.querySelector(selector);
    const text = (node?.innerText || node?.textContent || "").trim();
    if (text) return text;
  }
  return "";
}

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
  void glow.offsetWidth;
  glow.classList.add("is-active");
}

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

  style.textContent = `
${s} ~ *,
:has(~ ${s}) {
  display: none !important;
}`;
  (document.head || document.documentElement).appendChild(style);
}

function ensureScrollable() {
  const mine = document.getElementById(CONFIG.injectedId);
  if (!mine) return;
  const clips = (v) => v === "hidden" || v === "clip";
  const scrolls = (v) => v === "auto" || v === "scroll";

  for (const n of document.querySelectorAll("[data-my-scroll]")) {
    if (n.scrollHeight <= n.clientHeight + 1) {
      n.style.removeProperty("overflow-y");
      delete n.dataset.myScroll;
      if (GROUP_DEBUG) console.log("[scroll] 縦スクロールの指定を戻しました:", n);
    }
  }

  for (let n = mine.parentElement; n; n = n.parentElement) {
    if (n.dataset.myScroll) return;
    const oy = getComputedStyle(n).overflowY;
    if (scrolls(oy)) return;
    if (!clips(oy)) continue;
    if (n.scrollHeight <= n.clientHeight + 1) continue;
    n.dataset.myScroll = "1";
    n.style.setProperty("overflow-y", "auto", "important");
    if (GROUP_DEBUG) console.log("[scroll] 縦スクロールを有効にしました:", n);
    return;
  }
}

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

function findDictionaryCard(main) {
  const heading = [...main.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span,p")].find(
    (n) => n.children.length === 0 && n.textContent.trim() === CONFIG.dictionaryHeading
  );
  if (!heading) return null;

  let card = heading;
  while (card.parentElement && card.parentElement !== main) {
    const parent = card.parentElement;
    if (parent.querySelector(CONFIG.sourceSelectors.join(","))) break;
    if (parent.getBoundingClientRect().height > 300) break;
    card = parent;
  }
  return card;
}

function hideEl(el) {
  if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
  if (el.classList.contains("my-hidden-below")) return;
  const mine = document.getElementById(CONFIG.injectedId);
  if (mine && el.contains(mine)) return;
  el.classList.add("my-hidden-below");
}

function hideOutsideMainSection() {
  if (!CONFIG.hideOutsideMainSection) return;
  const main = document.querySelector(CONFIG.mainSectionSelector);
  if (!main || !main.parentElement) return;

  for (const sib of main.parentElement.children) {
    if (sib !== main) hideEl(sib);
  }

  const anchor = findDictionaryCard(main) || main.querySelector(CONFIG.targetSelector);
  if (!anchor) return;
  for (let node = anchor; node && node !== main; node = node.parentElement) {
    for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
      hideEl(sib);
    }
  }
}

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
      e.stopPropagation();
      handled();
    } else if (e.key === "Tab") {
      close();
    }
  });

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

function setupAdvanced(el) {
  const root = el.querySelector(".adv-wrap");
  if (!root) return;
  const btn = root.querySelector(".adv-button");
  const pop = root.querySelector(".adv-pop");
  const ref = root.querySelector(".adv-ref-boost");
  const ground = root.querySelector(".adv-grounding-px");

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

    const r = pop.getBoundingClientRect();
    root.classList.toggle("is-right", r.right > window.innerWidth - 8);
  };

  btn.addEventListener("click", () => (isOpen() ? close() : open()));
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    }
  });

  root.querySelector(".adv-reset").addEventListener("click", () => {
    ref.value = ADV.refBoost.def;
    ground.value = ADV.groundingPx.def;
    ref.dispatchEvent(new Event("input"));
    ground.dispatchEvent(new Event("input"));
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

const LORA_STORAGE_KEY = "loraLibrary";

let loraLib = [];
let loraLibLoaded = false;
let loraLibSavedJson = "";
let loraSaveTimer = 0;

const clampLoraStrength = (v) => {
  const n = Number(v);
  if (v === "" || v === null || v === undefined || !Number.isFinite(n)) return LORA.strength.def;
  return Number(Math.min(LORA.strength.max, Math.max(LORA.strength.min, n)).toFixed(2));
};

function getLoras() {
  return loraLib
    .filter((g) => g.enabled)
    .map((g) => {
      const v = g.versions.find((x) => x.id === g.active) || g.versions[0];
      return v ? { version_id: v.id, strength: clampLoraStrength(v.strength) } : null;
    })
    .filter(Boolean);
}

function sortLoraLibByUsed() {
  loraLib = loraLib
    .map((g, i) => ({ g, i }))
    .sort((a, b) => (b.g.usedAt || 0) - (a.g.usedAt || 0) || a.i - b.i)
    .map((x) => x.g);
}

function markLorasUsed() {
  const now = Date.now();
  let changed = false;
  for (const g of loraLib) {
    if (!g.enabled) continue;
    g.usedAt = now;
    changed = true;
  }
  if (changed) saveLoraLib();
}

function sanitizeLoraLib(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const g of raw) {
    if (!g || typeof g !== "object" || typeof g.title !== "string" || !Array.isArray(g.versions)) continue;
    const modelId = String(g.modelId ?? "").replace(/\D/g, "");
    if (!modelId) continue;
    const versions = g.versions
      .filter((v) => v && /^\d+$/.test(String(v.id ?? "")))

      .filter((v) => !v.baseModel || LORA.baseModel.test(String(v.baseModel)))
      .map((v) => ({
        id: String(v.id),
        name: String(v.name ?? "").slice(0, 80),
        baseModel: String(v.baseModel ?? "").slice(0, 60),
        thumb: typeof v.thumb === "string" && v.thumb.startsWith("data:image/") ? v.thumb : "",
        strength: clampLoraStrength(v.strength),
        addedAt: Number(v.addedAt) || 0,
      }));
    if (!versions.length) continue;
    const active = versions.some((v) => v.id === String(g.active)) ? String(g.active) : versions[0].id;
    out.push({ modelId, title: g.title.slice(0, 120), enabled: !!g.enabled, active, usedAt: Number(g.usedAt) || 0, versions });
  }
  return out;
}

function trimLoraLib() {
  const all = [];
  for (const g of loraLib) for (const v of g.versions) all.push(v);
  if (all.length <= LORA.libraryMax) return;
  all.sort((a, b) => b.addedAt - a.addedAt);
  const drop = new Set(all.slice(LORA.libraryMax));
  for (const g of loraLib) {
    g.versions = g.versions.filter((v) => !drop.has(v));
    if (g.versions.length && !g.versions.some((v) => v.id === g.active)) g.active = g.versions[0].id;
  }
  loraLib = loraLib.filter((g) => g.versions.length);
}

function saveLoraLib() {
  if (!loraLibLoaded) return;
  const json = JSON.stringify(loraLib);
  if (json === loraLibSavedJson) return;
  loraLibSavedJson = json;
  storageSet({ [LORA_STORAGE_KEY]: loraLib });
}

function saveLoraLibSoon() {
  clearTimeout(loraSaveTimer);
  loraSaveTimer = setTimeout(saveLoraLib, 250);
}

async function loadLoraLibrary() {
  const stored = await storageGet([LORA_STORAGE_KEY]);
  loraLib = sanitizeLoraLib(stored[LORA_STORAGE_KEY]);
  trimLoraLib();
  loraLibSavedJson = JSON.stringify(loraLib);
  loraLibLoaded = true;
  document.getElementById(CONFIG.injectedId)?.querySelector(".lora-wrap")?.paintLoras?.();
}

function addLoraToLib(model, ver) {
  let g = loraLib.find((x) => x.modelId === model.modelId);
  if (!g) {
    g = { modelId: model.modelId, title: model.title, enabled: true, active: ver.id, usedAt: 0, versions: [] };
  } else {
    g.title = model.title;
    loraLib.splice(loraLib.indexOf(g), 1);
  }
  loraLib.unshift(g);
  const now = Date.now();
  const ex = g.versions.find((x) => x.id === ver.id);
  if (ex) {
    ex.addedAt = now;
    if (ver.thumb) ex.thumb = ver.thumb;
  } else {
    g.versions.push({ id: ver.id, name: ver.name, baseModel: ver.baseModel || "", thumb: ver.thumb || "", strength: LORA.strength.def, addedAt: now });
  }
  g.enabled = true;
  g.active = ver.id;
  g.usedAt = now;
  trimLoraLib();
  saveLoraLib();
}

function callCivitai(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "civitai", ...msg }, (res) => {
        if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
        else resolve(res || { ok: false, error: "応答がありません" });
      });
    } catch (err) {
      resolve({ ok: false, error: String(err) });
    }
  });
}

function parseCivitaiUrl(input) {
  let s = String(input || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u;
  try {
    u = new URL(s);
  } catch (_) {
    return null;
  }
  if (!/(^|\.)civitai\.(com|green|red)$/i.test(u.hostname)) return null;
  const m = /\/models\/(\d+)/.exec(u.pathname);
  const v = u.searchParams.get("modelVersionId") || (/\/api\/download\/models\/(\d+)/.exec(u.pathname) || [])[1] || "";
  const modelId = m ? m[1] : "";
  const versionId = /^\d+$/.test(v) ? v : "";
  if (!modelId && !versionId) return null;
  return { modelId, versionId };
}

const loraSiteUrl = (modelId, versionId) => `https://civitai.com/models/${modelId}?modelVersionId=${versionId}`;

function setupLoraPopup(el) {
  const root = el.querySelector(".lora-wrap");
  if (!root) return;
  const btn = root.querySelector(".lora-button");
  const badge = root.querySelector(".lora-badge");
  const pop = root.querySelector(".lora-pop");
  const urlInput = root.querySelector(".lora-url");
  const goBtn = root.querySelector(".lora-go");
  const msg = root.querySelector(".lora-msg");
  const resultsBox = root.querySelector(".lora-results");
  const tabs = root.querySelector(".lora-tabs");
  const groupsBox = root.querySelector(".lora-groups");
  const empty = root.querySelector(".lora-lib-empty");
  const countLabel = root.querySelector(".lora-lib-count");
  const openIds = new Set();
  let page = 0;
  let found = null;

  const setMsg = (text, kind = "") => {
    msg.hidden = !text;
    msg.textContent = text;
    msg.dataset.kind = kind;
  };

  const paintBadge = () => {
    const n = loraLib.filter((g) => g.enabled).length;
    badge.hidden = n === 0;
    badge.textContent = String(n);
  };

  const renderResults = () => {
    resultsBox.textContent = "";
    resultsBox.hidden = !found;
    if (!found) return;
    const f = found;
    for (const v of f.versions) {
      const inLib = loraLib.some((g) => g.modelId === f.modelId && g.versions.some((x) => x.id === v.id));
      const card = document.createElement("div");
      card.className = "lora-card";

      const img = document.createElement("img");
      img.className = "lora-thumb";
      img.alt = "";
      if (v.thumbData) img.src = v.thumbData;
      else v.thumbP.then((d) => { if (d) img.src = d; });

      const info = document.createElement("div");
      info.className = "lora-card-info";
      const title = document.createElement("div");
      title.className = "lora-card-title";
      title.textContent = f.title;
      title.title = f.title;
      const ver = document.createElement("div");
      ver.className = "lora-card-ver";
      ver.textContent = v.name;
      const link = document.createElement("a");
      link.className = "lora-card-link";
      link.href = v.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = v.url.replace(/^https?:\/\//, "");
      link.title = v.url;
      info.append(title, ver, link);

      const add = document.createElement("button");
      add.type = "button";
      add.className = "lora-add";
      add.textContent = inLib ? "追加済み" : "追加";
      add.disabled = inLib;
      add.addEventListener("click", async () => {
        add.disabled = true;
        add.textContent = "追加中…";
        const thumb = v.thumbData || (await v.thumbP);
        addLoraToLib({ modelId: f.modelId, title: f.title }, { id: v.id, name: v.name, thumb, baseModel: v.baseModel });
        page = 0;

        if (found === f) {
          found = null;
          urlInput.value = "";
          setMsg("");
          renderResults();
        }
        renderLib();
        place();
      });

      card.append(img, info, add);
      resultsBox.appendChild(card);
    }
  };

  const search = async () => {
    const parsed = parseCivitaiUrl(urlInput.value);
    if (!parsed) {
      setMsg("CivitAI のモデルページの URL を入力してください", "error");
      return;
    }
    goBtn.disabled = true;
    setMsg("検索中…");
    found = null;
    renderResults();
    const res = await callCivitai({ op: "model", modelId: parsed.modelId, versionId: parsed.versionId });
    goBtn.disabled = false;
    if (!res.ok) {
      setMsg(`取得できませんでした（${res.error || "不明なエラー"}）`, "error");
      place();
      return;
    }
    const model = res.data;
    if (model.type && !/^(lora|locon|dora)$/i.test(model.type)) {
      setMsg(`「${model.name}」は LoRA ではありません（${model.type}）`, "error");
      place();
      return;
    }
    const matched = (model.versions || []).filter((v) => LORA.baseModel.test(v.baseModel || ""));
    if (!matched.length) {
      setMsg(`「${model.name}」に Krea2 対応のバージョンはありません`, "error");
      place();
      return;
    }
    setMsg(`${model.name}：Krea2 対応 ${matched.length} 件`);
    found = {
      modelId: String(model.id),
      title: model.name,
      versions: matched.map((v) => {
        const item = { id: String(v.id), name: v.name, baseModel: v.baseModel || "", url: loraSiteUrl(model.id, v.id), thumbData: "" };
        item.thumbP = v.image
          ? callCivitai({ op: "thumb", url: v.image }).then((r) => {
              item.thumbData = r.ok && typeof r.data === "string" ? r.data : "";
              return item.thumbData;
            })
          : Promise.resolve("");
        return item;
      }),
    };
    renderResults();
    place();
  };

  goBtn.addEventListener("click", search);
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      search();
    }
  });

  const buildGroup = (g) => {
    const v = g.versions.find((x) => x.id === g.active) || g.versions[0];
    const box = document.createElement("div");
    box.className = "lora-group" + (g.enabled ? " is-on" : "") + (openIds.has(g.modelId) ? " is-open" : "");

    const head = document.createElement("div");
    head.className = "lora-group-head";
    head.setAttribute("role", "button");
    head.tabIndex = 0;
    head.title = "クリックして重みを変更";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "lora-enable";
    cb.checked = g.enabled;
    cb.setAttribute("aria-label", "有効にする");
    cb.addEventListener("click", (e) => e.stopPropagation());

    const img = document.createElement("img");
    img.className = "lora-thumb";
    img.alt = "";
    if (v.thumb) img.src = v.thumb;

    const info = document.createElement("div");
    info.className = "lora-group-info";
    const title = document.createElement("span");
    title.className = "lora-group-title";
    title.textContent = g.title;
    title.title = g.title;
    const verName = document.createElement("span");
    verName.className = "lora-group-ver";
    verName.textContent = v.name;
    info.append(title, verName);

    const weight = document.createElement("span");
    weight.className = "lora-group-weight";
    const paintWeight = () => {
      weight.textContent = `×${Number(v.strength).toFixed(2)}`;
    };
    paintWeight();

    head.append(cb, img, info, weight);

    let chips = null;
    if (g.versions.length > 1) {
      chips = document.createElement("div");
      chips.className = "lora-versions";
      for (const x of g.versions) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "lora-chip";
        chip.textContent = x.name;
        chip.title = x.name;
        chip.setAttribute("aria-pressed", String(x.id === g.active));
        chip.addEventListener("click", () => {
          g.active = x.id;
          saveLoraLibSoon();
          renderLib();
        });
        chips.appendChild(chip);
      }
    }

    const panel = document.createElement("div");
    panel.className = "lora-weight";
    panel.hidden = !openIds.has(g.modelId);
    const { min, max, step } = LORA.strength;
    const range = document.createElement("input");
    range.type = "range";
    range.className = "lora-range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(clampLoraStrength(v.strength));
    range.setAttribute("aria-label", "重み");
    const num = document.createElement("input");
    num.type = "number";
    num.className = "lora-num";
    num.min = String(min);
    num.max = String(max);
    num.step = String(step);
    num.value = String(clampLoraStrength(v.strength));
    num.setAttribute("aria-label", "重み");
    const del = document.createElement("button");
    del.type = "button";
    del.className = "lora-del";
    del.textContent = "削除";
    del.title = "このバージョンを一覧から削除";

    const siteUrl = loraSiteUrl(g.modelId, v.id);
    const urlLink = document.createElement("a");
    urlLink.className = "lora-weight-url";
    urlLink.href = siteUrl;
    urlLink.target = "_blank";
    urlLink.rel = "noopener noreferrer";
    urlLink.textContent = siteUrl.replace(/^https?:\/\//, "");
    urlLink.title = siteUrl;
    urlLink.addEventListener("click", (e) => e.stopPropagation());
    panel.append(urlLink, range, num, del);

    const setStrength = (n) => {
      v.strength = clampLoraStrength(n);
      paintWeight();
      saveLoraLibSoon();
    };
    range.addEventListener("input", () => {
      num.value = range.value;
      setStrength(range.value);
    });
    num.addEventListener("change", () => {
      const c = clampLoraStrength(num.value);
      num.value = String(c);
      range.value = String(c);
      setStrength(c);
    });
    del.addEventListener("click", () => {
      g.versions = g.versions.filter((x) => x !== v);
      if (g.versions.length) {
        g.active = g.versions[0].id;
      } else {
        loraLib = loraLib.filter((x) => x !== g);
        openIds.delete(g.modelId);
      }
      saveLoraLib();
      renderLib();
      renderResults();
    });

    cb.addEventListener("change", () => {
      g.enabled = cb.checked;
      box.classList.toggle("is-on", g.enabled);
      paintBadge();
      saveLoraLibSoon();
    });

    const toggle = () => {
      const open = !openIds.has(g.modelId);
      if (open) openIds.add(g.modelId);
      else openIds.delete(g.modelId);
      box.classList.toggle("is-open", open);
      panel.hidden = !open;
    };
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (e) => {
      if (e.target !== head || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      toggle();
    });

    box.append(head);
    if (chips) box.append(chips);
    box.append(panel);
    return box;
  };

  const renderLib = () => {
    const pages = Math.max(1, Math.ceil(loraLib.length / LORA.pageSize));
    page = Math.max(0, Math.min(pages - 1, page));

    tabs.textContent = "";
    tabs.hidden = pages <= 1;
    for (let i = 0; i < pages; i++) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "lora-tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(i === page));
      const from = i * LORA.pageSize + 1;
      tab.textContent = `${from}–${Math.min(loraLib.length, from + LORA.pageSize - 1)}`;
      tab.addEventListener("click", () => {
        page = i;
        renderLib();
      });
      tabs.appendChild(tab);
    }

    groupsBox.textContent = "";
    for (const g of loraLib.slice(page * LORA.pageSize, (page + 1) * LORA.pageSize)) {
      groupsBox.appendChild(buildGroup(g));
    }
    empty.hidden = loraLib.length > 0;
    const total = loraLib.reduce((n, g) => n + g.versions.length, 0);
    countLabel.textContent = total ? `${total} / ${LORA.libraryMax}` : "";
    paintBadge();
  };
  root.paintLoras = renderLib;
  renderLib();

  const isOpen = () => root.classList.contains("is-open");
  function place() {
    if (!isOpen()) return;
    pop.style.maxHeight = "";
    pop.style.minHeight = "";
    root.classList.remove("is-up", "is-right");
    const r = btn.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 16;
    const above = r.top - 16;
    const natural = pop.offsetHeight;
    const up = natural > below && above > below;
    root.classList.toggle("is-up", up);

    const want = Math.max(natural, LORA.popMinHeight);
    pop.style.minHeight = `${Math.floor(Math.min(LORA.popMinHeight, up ? above : below))}px`;
    pop.style.maxHeight = `${Math.floor(Math.max(200, Math.min(want, up ? above : below)))}px`;
    root.classList.toggle("is-right", pop.getBoundingClientRect().right > window.innerWidth - 8);
  }
  const close = (returnFocus = false) => {
    if (!isOpen()) return;
    markLorasUsed();
    root.classList.remove("is-open", "is-up", "is-right");
    btn.setAttribute("aria-expanded", "false");
    pop.hidden = true;
    pop.style.maxHeight = "";
    if (returnFocus) btn.focus();
  };
  const open = () => {
    if (isOpen()) return;
    root.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    pop.hidden = false;
    sortLoraLibByUsed();
    saveLoraLib();
    page = 0;
    renderLib();
    renderResults();
    place();
    urlInput.focus({ preventScroll: true });
  };
  btn.addEventListener("click", () => (isOpen() ? close() : open()));

  pop.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
  });
  ["keyup", "keypress"].forEach((type) => pop.addEventListener(type, (e) => e.stopPropagation()));

  const onOutside = (e) => {
    if (!root.isConnected) {
      document.removeEventListener("pointerdown", onOutside, true);
      return;
    }
    if (isOpen() && !root.contains(e.target)) close();
  };
  document.addEventListener("pointerdown", onOutside, true);
}

let selectedImagePath = "";

const imageBaseName = (p) => String(p).split(/[\\/]/).pop();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const paint = () => {
    const has = !!selectedImagePath;
    const name = has ? imageBaseName(selectedImagePath) : "";
    root.classList.toggle("has-image", has);
    clearBtn.hidden = !has;
    label.textContent = has ? name : "画像";
    pickBtn.setAttribute("aria-label", has ? `別の画像を選択（現在: ${name}）` : "参照画像を選択");

    pickBtn.title = has ? selectedImagePath : "参照画像を選ぶ（選ぶと、その画像を元にした画像編集で生成します）";
  };
  paint();

  pickBtn.addEventListener("click", async () => {
    if (pickBtn.disabled) return;
    pickBtn.disabled = true;
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

function setupAspectDropdown(el) {
  const root = el.querySelector(".aspect-dd");
  const select = el.querySelector(".aspect-select");
  if (!root || !select) return;
  const valueLabel = root.querySelector(".dd-trigger-value");
  const list = root.querySelector(".dd-list");
  const rect = root.querySelector(".aspect-rect");
  const rectLabel = root.querySelector(".aspect-rect-label");
  const [widthRange, heightRange] = el.querySelectorAll(".slider-range");

  root.style.setProperty("--aspect-box", `${ASPECT_PREVIEW.size}px`);

  list.innerHTML = [...select.options]
    .map((o) => `<button type="button" class="dd-option" role="option" tabindex="-1" aria-selected="false" data-value="${o.value}">${o.textContent}</button>`)
    .join("");
  const options = [...list.querySelectorAll(".dd-option")];

  const sync = () => {
    const found = options.findIndex((b) => b.dataset.value === select.value);
    const index = Math.max(0, found);
    valueLabel.textContent = options[index].textContent;
    options.forEach((btn, i) => btn.setAttribute("aria-selected", String(i === index)));
  };
  root.sync = sync;
  sync();

  let anim = null;
  const showShape = (value, animate = true) => {
    const [w, h] = value ? value.split(":").map(Number) : [Number(widthRange?.value) || 1, Number(heightRange?.value) || 1];
    const k = ASPECT_PREVIEW.size / Math.max(w, h);
    const toW = `${(w * k).toFixed(1)}px`;
    const toH = `${(h * k).toFixed(1)}px`;

    const from = rect.getBoundingClientRect();
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
        select.dispatchEvent(new Event("change"));
      }
      sync();
    },
    onOpen: () => showShape(select.value, false),
  });

  const preview = (e) => {
    const btn = e.target.closest(".dd-option");
    if (btn) showShape(btn.dataset.value);
  };
  list.addEventListener("mouseover", preview);
  list.addEventListener("focusin", preview);
  list.addEventListener("mouseleave", () => showShape(select.value));
}

function setupAspect(el) {
  const select = el.querySelector(".aspect-select");
  const [widthRange, heightRange] = el.querySelectorAll(".slider-range");
  if (!select || !widthRange || !heightRange) return;

  const clamp = (v) => Math.min(SLIDER.max, Math.max(SLIDER.min, v));
  const snap = (v) => clamp(Math.round(v / SLIDER.step) * SLIDER.step);

  const getRatio = () => {
    if (!select.value) return null;
    const [w, h] = select.value.split(":").map(Number);
    return w / h;
  };
  const setValue = (range, v) => {
    range.value = v;
    range.dispatchEvent(new Event("input"));
  };

  let applying = false;
  const apply = (source) => {
    const ratio = getRatio();
    if (!ratio) return;

    const fromWidth = source === widthRange;
    const target = fromWidth ? heightRange : widthRange;
    let sourceVal = snap(Number(source.value));
    const exact = fromWidth ? sourceVal / ratio : sourceVal * ratio;
    let targetVal = snap(exact);

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

  select.addEventListener("change", () => apply(widthRange));
}

const SAME_HIGHLIGHT_NAME = "my-same-text";
const SAME_HIGHLIGHT_MAX = 500;

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
  if (multi) return;

  const editor = getSourceEditor();
  const sel = window.getSelection();
  if (!editor || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
    clearSameHighlight();
    return;
  }

  if (!editor.contains(sel.anchorNode) || !editor.contains(sel.focusNode)) {
    clearSameHighlight();
    return;
  }

  const text = sel.toString();

  if (!text.trim() || /[\r\n]/.test(text)) {
    clearSameHighlight();
    return;
  }

  const selRange = sel.getRangeAt(0);
  const ranges = [];
  for (const m of findMatches(editor, text)) {

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

  document.addEventListener("selectionchange", schedule);

  document.addEventListener("input", clearSameHighlight, true);
}

const MULTI_HIGHLIGHT_NAME = "my-multi-text";
const MULTI_MAX = 50;
const MULTI_EXIT_KEYS = [
  "Escape", "Enter", "Tab",
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
  "Home", "End", "PageUp", "PageDown",
];

let multi = null;
let multiBusy = Promise.resolve();
let multiApplying = false;
let multiComp = null;
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

const BLOCK_TAGS = /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE)$/;
function blockOf(editor, node) {
  for (let el = node.parentElement; el && el !== editor; el = el.parentElement) {
    if (BLOCK_TAGS.test(el.tagName)) return el;
  }
  return editor;
}

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
      if (newBlock || hasBr) pos += 1;
    }
    const len = n.nodeValue.length;
    segs.push({ node: n, start: pos, len });
    pos += len;
    prev = n;
  }
  return { segs, total: pos };
}

function multiTextLength(editor) {
  return editorLayout(editor).total;
}

function multiTextString(editor) {
  const { segs } = editorLayout(editor);
  let out = "";
  for (const sg of segs) {
    while (out.length < sg.start) out += "\n";
    out += sg.node.nodeValue;
  }
  return out;
}

function offsetOf(editor, node, off) {
  if (!node || !editor.contains(node)) return null;
  const { segs, total } = editorLayout(editor);
  if (node.nodeType === Node.TEXT_NODE) {
    const sg = segs.find((x) => x.node === node);
    return sg ? sg.start + off : null;
  }

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

function rangeFromOffsets(editor, s, e) {
  const { segs } = editorLayout(editor);
  if (segs.length === 0) return null;

  const locate = (p, preferNext) => {
    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i];
      if (p < sg.start) {

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

function multiMarkColors() {
  return CONFIG.forceDark
    ? { bg: "#ab81ff", fg: "#000000" }
    : { bg: "#7c3aed", fg: "#ffffff" };
}

function ensureMultiStyle() {
  const id = "my-multi-style";
  document.getElementById(id)?.remove();
  const { bg, fg } = multiMarkColors();

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
    if (i === multi.primary || c.s === c.e) return;
    const r = rangeFromOffsets(editor, c.s, c.e);
    if (r) ranges.push(r);
  });
  if (ranges.length) CSS.highlights.set(MULTI_HIGHLIGHT_NAME, new Highlight(...ranges));
  else clearMultiHighlight();
}

function clearMultiHighlight() {
  if (window.CSS && CSS.highlights) CSS.highlights.delete(MULTI_HIGHLIGHT_NAME);
}

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
  if (primary < 0 || carets.length < 2) return;
  if (carets.length > MULTI_MAX) {
    flashGlow("error");
    return;
  }

  multi = { carets, primary };
  clearSameHighlight();
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
    if (!multi) return;
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
    multiApplying = true;
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

  let shift = 0;
  const next = base.map((c, i) => {
    const p = newPos[i] + shift;
    shift += deltas[i];
    return { s: p, e: p };
  });
  const norm = normalizeCarets(next, primary);
  multi.carets = norm.carets;
  multi.primary = norm.primary;

  const pc = multi.carets[multi.primary];
  const pr = rangeFromOffsets(editor, pc.s, pc.e);
  if (pr) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(pr);
  }
  refreshMultiMarks();
}

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

  const pc = multi.carets[multi.primary];
  const pr = rangeFromOffsets(editor, pc.s, pc.e);
  if (pr) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(pr);
  }
  refreshMultiMarks();
}

async function syncCompositionToOthers(data, startLen) {
  await nextFrame();
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

function onMultiKeydown(e) {

  if (e.code === "KeyD" && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.isComposing && !e.repeat) enterMultiEdit();
    return;
  }

  if (!multi || e.isComposing) return;
  if (e.key === "Control" || e.key === "Meta" || e.key === "Shift" || e.key === "Alt") return;

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

  if (MULTI_EXIT_KEYS.includes(e.key) || (isShortcut && k !== "c" && k !== "v")) {
    exitMulti();
  }
}

function onMultiBeforeInput(e) {
  if (!multi || multiApplying || e.isComposing) return;
  if (e.inputType === "insertCompositionText") return;
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
    exitMulti();
    return;
  }

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

  document.addEventListener(
    "mousedown",
    () => {
      if (multi) exitMulti();
    },
    true
  );
}

const groups = [];
let groupSeq = 0;
let groupLastColor = GROUP_COLORS[5].value;
let groupPopover = null;
let groupPending = null;
let groupRaf = 0;
let groupTimer = 0;
let groupDirty = false;
let groupSyncAt = 0;
let groupHasOrphan = false;
let groupsLoaded = false;
let groupSavedJson = "";
let groupDrag = null;
let groupMove = null;
let groupDragGhost = null;
let groupBootUntil = 0;
let groupWarned = false;
const GROUP_DEBUG = true;
let groupDebugAt = 0;
let groupHistoryUntil = 0;
let groupSuppressClick = false;
let groupAltDown = false;

function ensureGroupStyle() {
  const id = "my-group-style";
  document.getElementById(id)?.remove();

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
html.my-group-dragging,
html.my-group-dragging * {
  cursor: ns-resize !important;
  user-select: none !important;
}
html.my-group-moving,
html.my-group-moving * {
  cursor: grabbing !important;
  user-select: none !important;
}`;
  (document.head || document.documentElement).appendChild(style);
}

function ensureGroupLayer() {
  let layer = document.getElementById("my-group-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "my-group-layer";
    layer.setAttribute("popover", "manual");
    const hl = document.createElement("div");
    hl.className = "my-group-hl";
    layer.appendChild(hl);
    const bars = document.createElement("div");
    bars.className = "my-group-bars";

    bars.addEventListener("mousedown", (e) => {
      if (e.target instanceof Element && e.target.closest(".my-group-bar")) e.preventDefault();
    });

    bars.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !(e.target instanceof Element)) return;
      const grip = e.target.closest(".my-group-grip");
      const tag = e.target.closest(".my-group-tag");
      const bar = e.target.closest(".my-group-bar");
      if (!bar || !bar._g || !bar._sp) return;

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

      const sx = e.clientX;
      const sy = e.clientY;
      const pid = e.pointerId;
      const g = bar._g;
      const sp = bar._sp;

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
          startGroupMove(g, sp, ev, { sx, sy }, { single: true });
          onGroupMoveMove(ev);
        } else {
          startGroupDrag(g, sp, "top", ev, sy);
        }
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", cleanup, true);
      window.addEventListener("pointercancel", cleanup, true);
    });

    bars.addEventListener("click", (e) => {
      if (groupSuppressClick) {
        groupSuppressClick = false;
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

  try {
    if (!layer.matches(":popover-open")) layer.showPopover();
  } catch (_) {}
  return layer;
}

function groupAnchorOf(editor, node) {
  const block = blockOf(editor, node);
  if (block !== editor) return block;
  let top = node;
  while (top.parentNode && top.parentNode !== editor) top = top.parentNode;
  return top;
}

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

function createGroupBar() {
  const d = document.createElement("div");
  d.className = "my-group-bar";

  d.innerHTML = `<div class="my-group-grip my-group-grip-top" data-edge="top" title="ドラッグして範囲を調整"></div>
<div class="my-group-grip" data-edge="bottom" title="ドラッグして範囲を調整"></div>
<div class="my-group-tag" role="button" tabindex="0"><span class="my-group-tag-grab" title="ドラッグして、この要素だけ移動">⋮⋮</span><span class="my-group-tag-name"></span></div>`;
  return d;
}

let groupClipCache = { editor: null, nodes: [], at: 0 };
function groupVisibleBand(editor) {
  const now = performance.now();
  if (groupClipCache.editor !== editor || now - groupClipCache.at > 700) {
    const nodes = [];
    for (let n = editor; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowY !== "visible") nodes.push(n);
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

function renderGroupBars() {

  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].spans.length === 0) groups.splice(i, 1);
  }

  const layer = groups.some((g) => g.spans.some(spanLive))
    ? ensureGroupLayer()
    : document.getElementById("my-group-layer");
  if (!layer) return;
  const box = layer.querySelector(".my-group-bars");
  let linesBox = layer.querySelector(".my-group-lines");
  if (!linesBox) {
    linesBox = document.createElement("div");
    linesBox.className = "my-group-lines";
    layer.insertBefore(linesBox, box);
  }

  const origin = layer.getBoundingClientRect();

  const items = [];
  for (const g of groups) {
    for (const sp of g.spans) {
      if (!spanLive(sp)) continue;
      const a = groupNodeRect(sp.first);
      const b = groupNodeRect(sp.last);
      const top = Math.min(a.top, b.top);
      const bottom = Math.max(a.bottom, b.bottom);
      if (bottom - top <= 0) continue;
      items.push({ g, sp, left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top, bottom, lane: 0 });
    }
  }

  items.sort((x, y) => x.top - y.top || x.bottom - y.bottom);
  const laneEnd = [];
  for (const it of items) {
    let k = laneEnd.findIndex((end) => end <= it.top + 0.5);
    if (k < 0) k = laneEnd.length;
    laneEnd[k] = it.bottom;
    it.lane = k;
  }

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

  const placed = [];
  let hoverIt = null;
  items.forEach((it, i) => {
    const d = box.children[i];
    const tag = d.querySelector(".my-group-tag");
    const g = it.g;
    d._g = g;
    d._sp = it.sp;
    it.run = runOf.get(it.sp) || [it.sp];

    const compact = it.bottom - it.top < (d._tagH || 22) + 14;
    if (d._compact !== compact) {
      d._compact = compact;
      d.classList.toggle("is-compact", compact);
      d._name = null;
    }

    const runN = it.run.length;
    if (d._runN !== runN) {
      d._runN = runN;
      d.classList.toggle("is-run", runN > 1);
      d._name = null;
    }
    const dragState = groupDrag || groupMove;
    d.classList.toggle("is-dragging", !!dragState && (dragState.sps ? dragState.sps.includes(it.sp) : dragState.sp === it.sp));

    d.classList.toggle("is-move-ghost", !!groupMove && groupMove.active && groupMove.sps.includes(it.sp));
    if (d.matches(":hover")) {
      hoverIt = it;
      it.single = !!d.querySelector(".my-group-tag:hover, .my-group-grip:hover");
    }

    const barX = it.left - GROUP_BAR.gap - GROUP_BAR.width - it.lane * GROUP_BAR.step;
    const maxW = Math.max(40, Math.min(GROUP_TAG.maxWidth, barX + GROUP_BAR.width - 4));

    const label = groupLabel(g, it.sp);
    if (d._name !== label || d._color !== g.color || d._maxW !== maxW) {
      d._name = label;
      d._color = g.color;
      d._maxW = maxW;
      d.style.backgroundColor = g.color;
      d.style.setProperty("--g-color", g.color);
      d.title = runN > 1
        ? `${label}\nドラッグ：連続する${runN}件をまとめて移動\nAlt+ドラッグ / ⋮⋮：この要素だけ移動`
        : label;
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

  const editorNow = getSourceEditor();
  if (editorNow) {
    const band = groupVisibleBand(editorNow);
    clipGroupBox(box, band);
    clipGroupBox(linesBox, band);
    clipGroupBox(layer.querySelector(".my-group-hl"), band);
  }

  const dragState2 = groupDrag || (groupMove && groupMove.active ? groupMove : null);
  let hlSps = null;
  let hlColor = "";
  if (dragState2) {
    hlSps = dragState2.sps || [dragState2.sp];
    hlColor = dragState2.g.color;
  } else if (hoverIt) {

    hlSps = hoverIt.single || groupAltDown ? [hoverIt.sp] : hoverIt.run;
    hlColor = hoverIt.g.color;
  }
  renderGroupHover(layer, origin, hlSps, hlColor);
}

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

function groupRunOf(g, sp, lines) {
  return groupRunsOf(g, lines).find((r) => r.includes(sp)) || [sp];
}

function setupGroupAltKey() {
  const set = (e) => {
    groupAltDown = !!e.altKey;
  };
  window.addEventListener("keydown", set, true);
  window.addEventListener("keyup", set, true);
  window.addEventListener("blur", () => (groupAltDown = false));
}

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

  const now = performance.now();
  const booting = now < groupBootUntil;
  if (groupDirty || (groupHasOrphan && now - groupSyncAt > (booting ? 80 : 1500))) syncGroups();
  renderGroupBars();
  const anyLive = groups.some((g) => g.spans.some(spanLive));
  if (anyLive || groupDirty) groupRaf = requestAnimationFrame(groupLoop);
  else if (groups.length) groupTimer = setTimeout(groupLoop, booting ? 80 : 500);
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

function touchGroups() {
  groupDirty = true;
  startGroupLoop();
}

function groupLabel(g, sp) {
  return [g.name, sp && sp.item].filter(Boolean).join(" ");
}

function makeSpan(first, last, item = "") {
  return { first, last, item, a: -1, snaps: [], lostAt: 0, full: null, els: [], total: 0, undo: [] };
}

function spanLive(sp) {
  return !!(sp.first && sp.last && sp.first.isConnected && sp.last.isConnected);
}

const normSnap = (t) => String(t).replace(/\u00a0/g, " ").replace(/\s+$/, "").slice(0, GROUP_SNAP_TEXT_MAX);
const snapText = (el) => normSnap(groupLineText(el));

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

async function extendGroupAfterEnter(sp, idx, total) {
  const editor = getSourceEditor();
  if (!editor) return;
  let lines = null;
  for (let i = 0; i < 60; i++) {
    await nextFrame();
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

  let hit = null;
  for (const g of groups) {
    for (const sp of g.spans) {
      if (!spanLive(sp)) continue;
      if (groupLineIndex(lines, sp.last) !== idx) continue;
      hit = { g, sp, a: groupLineIndex(lines, sp.first) };
    }
  }
  if (!hit) return;

  const end = groupLineEdge(lines[idx], true);
  const tail = document.createRange();
  tail.setStart(range.startContainer, range.startOffset);
  tail.setEnd(end.node, end.off);
  if (tail.toString() !== "") return;

  const isBlank = groupLineText(lines[idx]).trim() === "";
  if (isBlank && hit.a >= 0 && hit.a < idx) {

    e.preventDefault();
    e.stopPropagation();
    hit.sp.last = lines[idx - 1];
    touchGroups();
    renderGroupBars();
    return;
  }

  extendGroupAfterEnter(hit.sp, idx, lines.length).catch((err) => console.error("[group] Enterでの延長に失敗:", err));
}

function setupGroupEnter() {
  document.addEventListener("keydown", onGroupEnterKey, true);
}

function syncGroups() {
  groupDirty = false;
  groupSyncAt = performance.now();

  const editor = getGroupEditor();

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
    const T = (i) => (texts[i] ??= snapText(lines[i]));
    const taken = new Set();

    const live = [];
    for (const g of groups) {
      for (const sp of g.spans) {
        if (!spanLive(sp)) continue;
        const a = groupLineIndex(lines, sp.first);
        const b = groupLineIndex(lines, sp.last);

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
          for (let k = cur; k < n && ok; k++) if (taken.has(x.a + k)) ok = false;
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

    for (const x of live) {
      const { sp, a, b } = x;
      sp.a = a;
      pushSnap(sp, Array.from({ length: b - a + 1 }, (_, k) => T(a + k)));
      sp.full = Array.from({ length: b - a + 1 }, (_, k) => groupLineText(lines[a + k]));
      sp.els = lines.slice(a, b + 1);
      sp.total = lines.length;
    }

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

  syncGroupLibrary();

  saveGroups();
}

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
  if (!groupsLoaded) return;
  const { data, json } = serializeGroups();
  if (json === groupSavedJson) return;
  groupSavedJson = json;
  storageSet({ [GROUP_STORAGE_KEY]: data });
}

async function loadSavedGroups() {
  const stored = await storageGet([GROUP_STORAGE_KEY, GROUP_LIBRARY_KEY]);
  const saved = stored[GROUP_STORAGE_KEY];
  groupLibrary = sanitizeLibrary(stored[GROUP_LIBRARY_KEY]);
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
  groupBootUntil = performance.now() + 30000;
  if (groups.length) {
    ensureGroupLayer();
    touchGroups();
  }
}

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

  ["focusin", "selectionchange", "input", "pointerdown", "keyup"].forEach((type) =>
    document.addEventListener(type, () => { if (groupHasOrphan) touchGroups(); }, true)
  );
}

const GROUP_MOVE_THRESHOLD = 5;

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

async function waitForLineCount(editor, expected) {
  for (let i = 0; i < 60; i++) {
    await nextFrame();
    if (editorLines(editor).length === expected) return true;
  }
  return editorLines(editor).length === expected;
}

function groupBoundaryAtY(lines, y) {
  for (let i = 0; i < lines.length; i++) {
    const r = groupNodeRect(lines[i]);
    if (!r.width && !r.height) continue;
    if (y < (r.top + r.bottom) / 2) return i;
  }
  return lines.length;
}

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
  m.t = t < a || t > b + 1 ? t : -1;
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
    showGroupDragGhost(m);
    renderGroupBars();
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
    updateGroupMove();
  }
  endGroupMove(e.type === "pointercancel");
}

function onGroupMoveKey(e) {
  if (e.key !== "Escape" || !groupMove) return;
  e.preventDefault();
  e.stopPropagation();
  endGroupMove(true);
}

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
  hideGroupDragGhost();
  if (m.active) groupSuppressClick = true;
  if (m.active) setTimeout(() => (groupSuppressClick = false), 50);
  if (!cancel && m.active && m.t >= 0) {
    moveGroupSpans(m.g, m.sps, m.t).catch((err) => console.error("[group] 行の移動に失敗:", err));
  }
  renderGroupBars();
}

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
    syncGroups();
    g.spans = g.spans.filter((s) => !sps.includes(s));

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

      g.spans.push(...sps);
      console.warn("[group] 行を削除できなかったため、移動をやめました");
      return;
    }
    removed = true;

    const newT = Math.min(t > b ? t - n : t, lines.length);
    if (newT === 0) groupCaretAt(groupLineEdge(lines[0], false));
    else groupCaretAt(groupLineEdge(lines[newT - 1], true));
    const before = lines.length;
    document.execCommand("insertParagraph");
    await waitForLineCount(editor, before + 1);
    lines = editorLines(editor);
    if (!lines[newT]) throw new Error("空行を作れませんでした");
    groupCaretAt(groupLineEdge(lines[newT], false));

    await pasteGroupedText({
      text: texts.join("\n"),
      groups: parts.map((p) => ({ name, color, item: p.item, start: p.start, end: p.end })),
    });
  } catch (err) {

    if (removed) console.error("[group] 移動の途中で失敗しました。Ctrl+Z で元に戻せます:", err);
    else throw err;
  } finally {
    g._moving = false;
    touchGroups();
  }
}

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

  const at = groupLineIndexAtY(lines, d.y - d.dy + (d.edge === "top" ? 2 : -2));
  if (fi < 0 || li < 0 || at < 0) return;

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
    updateGroupDrag();
    groupDrag = null;
    if (spanLive(d.sp)) {
      overwriteGroupSpans(d.sp, d.g);
      d.g.spans = mergeGroupSpan(d.g.spans.filter((s) => s !== d.sp), d.sp);
    }
  }
  groupDrag = null;
  if (groupSuppressClick) setTimeout(() => (groupSuppressClick = false), 50);
  touchGroups();
  renderGroupBars();
}

function docCmp(a, b) {
  if (a === b) return 0;
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function isNextTo(a, b) {
  return a.nextSibling === b || a.nextElementSibling === b;
}

function groupSpansTouch(a, b) {
  const aBefore = docCmp(a.last, b.first) < 0 && !isNextTo(a.last, b.first);
  const bBefore = docCmp(b.last, a.first) < 0 && !isNextTo(b.last, a.first);
  return !aBefore && !bBefore;
}

function mergeGroupSpan(spans, add) {
  if (!spanLive(add)) return spans.concat([add]);
  const cur = makeSpan(add.first, add.last, add.item);
  const floating = spans.filter((o) => !spanLive(o));
  let rest = spans.filter(spanLive);
  for (let changed = true; changed; ) {
    changed = false;
    rest = rest.filter((o) => {
      if (o.item !== cur.item || !groupSpansTouch(cur, o)) return true;
      if (docCmp(o.first, cur.first) < 0) cur.first = o.first;
      if (docCmp(o.last, cur.last) > 0) cur.last = o.last;
      changed = true;
      return false;
    });
  }
  rest.push(cur);
  return floating.concat(rest);
}

function overwriteGroupSpans(span, except) {
  const lineAfter = (n) => (n.nodeType === Node.ELEMENT_NODE ? n.nextElementSibling : n.nextSibling);
  const lineBefore = (n) => (n.nodeType === Node.ELEMENT_NODE ? n.previousElementSibling : n.previousSibling);

  for (const g of groups) {
    const kept = [];
    for (const o of g.spans) {
      if (g === except && o.item === span.item) {
        kept.push(o);
        continue;
      }
      if (!spanLive(o)) {
        kept.push(o);
        continue;
      }
      const overlaps = docCmp(o.last, span.first) >= 0 && docCmp(span.last, o.first) >= 0;
      if (!overlaps) {
        kept.push(o);
        continue;
      }
      const startsBefore = docCmp(o.first, span.first) < 0;
      const endsAfter = docCmp(o.last, span.last) > 0;
      if (startsBefore && endsAfter) continue;
      if (startsBefore) {

        const p = lineBefore(span.first);
        if (p && docCmp(p, o.first) >= 0) kept.push(makeSpan(o.first, p, o.item));
      } else if (endsAfter) {

        const n = lineAfter(span.last);
        if (n && docCmp(n, o.last) <= 0) kept.push(makeSpan(n, o.last, o.item));
      }

    }
    g.spans = kept;
  }
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].spans.length === 0) groups.splice(i, 1);
  }
}

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

function groupSpanHasNode(sp, n) {
  const afterFirst = sp.first.contains(n) || sp.first.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING;
  const beforeLast = sp.last.contains(n) || sp.last.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING;
  return !!(afterFirst && beforeLast);
}

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
  if (atTop && atBottom) return null;
  const keep = atTop || atBottom ? 0 : 1;
  const remove = e - s + 1 - keep;
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
  await waitForLineCount(editor, lines.length - remove);

  return atTop ? { start: 0, count: e + 1 } : atBottom ? { start: s, count: e - s + 1 } : { start: s + 1, count: remove };
}

async function deleteGroupText(g, only) {
  if (g._deleting) return;
  const editor = getSourceEditor();
  if (!editor) return;
  g._deleting = true;
  const targets = only ? [only] : g.spans.slice();
  try {
    exitMulti();
    closeGroupPopover();
    syncGroups();
    libKeepSpans(g, targets);
    const spans = targets.filter(spanLive).sort((a, b) => docCmp(b.first, a.first));
    const marks = [];
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
      await nextFrame();
    }

    marks.sort((x, y) => y - x);
    for (let i = 0; i < marks.length; i++) {
      if (marks[i] < 0) continue;
      const cut = await collapseBlankLinesAt(editor, marks[i]);
      if (!cut) continue;
      for (let j = i + 1; j < marks.length; j++) {
        if (marks[j] >= cut.start) marks[j] = cut.start - 1;
      }
    }
  } finally {
    g._deleting = false;

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

  const knownNames = new Map();
  for (const x of groupLibrary) if (!knownNames.has(x.name)) knownNames.set(x.name, x.color);
  for (const g of groups) knownNames.set(g.name, g.color);

  const syncColorFromName = () => {
    const c = knownNames.get(input.value.trim());
    if (c && GROUP_COLORS.some((x) => x.value === c)) {
      color = c;
      paintSwatches();
    }
  };

  const suggestBox = root.querySelector(".my-group-suggest");
  let suggestNames = [];
  let suggestIdx = -1;
  let popPos = null;

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
      if (n === typed) continue;
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

  root.addEventListener("mousedown", (e) => {
    if (!(e.target instanceof Element && e.target.matches("input"))) e.preventDefault();
  });

  ["keydown", "keyup", "keypress"].forEach((type) => root.addEventListener(type, (e) => e.stopPropagation()));
  [input, itemInput].forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        if (el === input && suggestIdx >= 0) pickSuggest(suggestNames[suggestIdx]);
        else commit();
      }
    })
  );

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
  renderSuggest();

  if (window.CSS && CSS.highlights && typeof Highlight !== "undefined") {
    CSS.highlights.set(GROUP_TARGET_HIGHLIGHT, new Highlight(saved.mark || saved.range));
  }

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

function openGroupEditPopover(g, tag, sp) {
  if (groupPopover && groupPopover.sp === sp) {
    closeGroupPopover();
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

  const knownNames = new Map();
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
  let suggestIdx = -1;
  let popPos = null;

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
      if (n === typed) continue;
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

  itemInput.addEventListener("input", () => {
    if (!sp) return;
    sp.item = itemInput.value.trim().slice(0, GROUP_ITEM_MAX);
    renderGroupBars();
    touchGroups();
  });

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
    closeGroupPopover();
    return true;
  };
  input.addEventListener("change", commitName);
  [input, itemInput].forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      if (el === input && suggestIdx >= 0) {
        pickSuggest(suggestNames[suggestIdx]);
        return;
      }
      if (el === input ? !commitName() : true) closeGroupPopover();
    })
  );

  swatches.forEach((b) =>
    b.addEventListener("click", () => {
      g.color = b.dataset.color;
      paintSwatches();
      renderGroupBars();
      touchGroups();
    })
  );
  root.querySelector(".my-group-release").addEventListener("click", () => {
    closeGroupPopover();
    if (sp) removeSpan(g, sp);
    else removeGroup(g);
  });
  root.querySelector(".my-group-remove").addEventListener("click", () => {
    deleteGroupText(g, sp || undefined);
  });
  root.querySelector(".my-group-remove-all").addEventListener("click", () => {
    deleteGroupText(g);
  });

  root.addEventListener("mousedown", (e) => {
    if (!(e.target instanceof Element && e.target.matches("input"))) e.preventDefault();
  });
  ["keydown", "keyup", "keypress"].forEach((type) => root.addEventListener(type, (e) => e.stopPropagation()));

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
  renderSuggest();

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

function setupGroupEdit() {
  ensureGroupStyle();

  document.addEventListener(
    "mousedown",
    (e) => {
      groupPending = null;
      if (e.button !== 0 || e.detail !== 1) return;
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
      restoreGroupSelection(p.range);
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

const GROUP_MARK_OPEN = /^\s*<group\s+name=("(?:[^"\\]|\\.)*")\s+color="(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))"(?:\s+item=("(?:[^"\\]|\\.)*"))?\s*>\s*$/;
const GROUP_MARK_CLOSE = /^\s*<\/group>\s*$/;

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

function groupLineIndex(lines, node) {
  if (!node) return -1;
  return lines.findIndex((l) => l === node || l.contains(node));
}

function groupLineText(el) {
  const t = el.nodeType === Node.TEXT_NODE ? el.nodeValue : el.innerText ?? el.textContent ?? "";
  return t.replace(/\r\n?/g, "\n").replace(/\n$/, "");
}

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

let groupPasting = false;

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

async function pasteGroupedText(parsed) {
  const editor = getSourceEditor();
  if (!editor || !parsed.text.trim()) return;
  exitMulti();
  if (!isFocusInSourceEditor()) editor.focus({ preventScroll: true });

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
      handled = !target.dispatchEvent(ev);
    } catch (_) {}

    if (!handled) {

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

async function padBlankAround(editor, startIdx, list) {
  const s = startIdx + Math.min(...list.map((g) => g.start));
  const e = startIdx + Math.max(...list.map((g) => g.end));
  const isBlank = (l) => groupLineText(l).trim() === "";
  let shift = 0;

  let lines = editorLines(editor);
  if (e + 1 < lines.length) {
    if (isBlank(lines[e + 1])) {
      await collapseBlankLinesAt(editor, e + 1);
    } else {
      groupCaretAt(groupLineEdge(lines[e + 1], false));
      document.execCommand("insertParagraph");
      await waitForLineCount(editor, lines.length + 1);
    }
  }

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

const GROUP_LIBRARY_KEY = "groupLibrary";
const GROUP_LIBRARY_MAX = 30;
const GROUP_TAB_SIZE = 10;
const GROUP_PREVIEW_LINES = 14;
let groupLibrary = [];
let groupLibLoaded = false;
let groupLibSavedJson = "";

const newLibId = () => "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const findLibByNameColor = (name, color) => groupLibrary.find((x) => x.name === name && x.color === color);

function sanitizeLibrary(raw) {
  if (!Array.isArray(raw)) return [];

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

function libKeepSpans(g, spans) {
  if (!groupLibLoaded) return;
  syncGroupLibrary();
  const entry = groupLibrary.find((x) => x.id === g.libId);
  if (!entry) return;
  for (const sp of spans) {
    const lines = sp.full || sp.snaps[0];
    if (!lines || !lines.some((t) => t.trim())) continue;
    const it = { item: sp.item || "", lines: lines.slice() };
    if (it.item) {

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

function syncGroupLibrary() {
  if (!groupLibLoaded) return;
  for (const g of groups) {
    if (!g.libId) g.libId = findLibByNameColor(g.name, g.color)?.id || newLibId();
    let entry = groupLibrary.find((x) => x.id === g.libId);

    let spans = null;
    if (g.spans.some((sp) => sp.full) || !entry) {
      spans = g.spans
        .map((sp) => ({ a: sp.a, item: sp.item || "", lines: sp.full || sp.snaps[0] }))
        .filter((x) => x.lines && x.lines.some((s) => s.trim()))
        .sort((x, y) => x.a - y.a)
        .map((x) => ({ item: x.item, lines: x.lines.slice() }));

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
        groupLibrary.unshift(entry);
      }
    }

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

function deleteLibraryGroup(entry) {
  for (const g of groups.slice()) if (g.libId === entry.id) removeGroup(g);
  const i = groupLibrary.indexOf(entry);
  if (i >= 0) groupLibrary.splice(i, 1);
  saveGroupLibrary();
}

let ctxMenu = null;

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

function ctxItemLabel(it) {
  if (it.item) return it.item;
  const first = (it.lines.find((s) => s.trim()) || "").trim();
  return first ? first.slice(0, 24) + (first.length > 24 ? "…" : "") : "名前なし";
}

function openContextMenu(saved, point) {
  closeContextMenu();
  closeGroupPopover();
  syncGroupLibrary();
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
      mark.selectNodeContents(line);
    }
    restoreGroupSelection(saved);
    openGroupPopover({ range: saved, anchors, mark }, p);
  });

  let openBtn = null;

  const hidePreview = () => {
    preview.hidden = true;
    preview._for = null;
  };
  const showPreview = (items, color, btn) => {
    if (preview._for === btn && !preview.hidden) return;
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

    placeCtxPanel(root, preview, itemsPanel.getBoundingClientRect(), btn.getBoundingClientRect().top, itemsPanel.classList.contains("is-left"));
  };

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
      btn.style.setProperty("--c", c);
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
      pinned = true;
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
        if (ev.isComposing) return;
        if (ev.key === "Enter") {
          ev.preventDefault();
          stopEdit(true);
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          ev.stopPropagation();
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
      b._items = list;
      b._color = entry.color;
      b.addEventListener("click", () => {
        closeContextMenu();
        insertGroupAtCursor(entry, saved, only).catch((err) => console.error("[ctx] 代入に失敗:", err));
      });
      itemsPanel.appendChild(b);
    };

    if (items.length > 1) makeBtn("my-ctx-all", "すべて追加", false, `${items.length}件`, items, null);

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
      renderPage(page);
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

  const onEntry = (e) => {
    const b = e.target instanceof Element ? e.target.closest(".my-ctx-entry, .my-ctx-all") : null;
    if (b && b._items) showPreview(b._items, b._color, b);
    else if (e.target instanceof Element && e.target.closest(".my-ctx-delete, .my-ctx-panel-head")) hidePreview();
  };
  itemsPanel.addEventListener("mouseover", onEntry);
  itemsPanel.addEventListener("focusin", onEntry);
  itemsPanel.addEventListener("mouseleave", hidePreview);

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

  const toggleSub = (open, focus = false) => {
    sub.hidden = !open;
    parent.setAttribute("aria-expanded", String(open));
    root.classList.toggle("is-sub-open", open);
    hideItems();
    if (!open) return;

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
  itemsPanel.addEventListener("mouseenter", cancelClose);
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

  root.addEventListener("mousedown", (e) => {
    if (!(e.target instanceof Element && e.target.matches("input"))) e.preventDefault();
  });
  root.addEventListener("contextmenu", (e) => e.preventDefault());
  ["keyup", "keypress"].forEach((type) => root.addEventListener(type, (e) => e.stopPropagation()));

  root.addEventListener("keydown", (e) => {
    e.stopPropagation();
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && root.contains(active)) return;
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
      renderPage(page + (e.key === "PageDown" ? 1 : -1));
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
        openBtn.focus({ preventScroll: true });
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
    if (e.target instanceof Node && root.contains(e.target)) return;
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
        closeContextMenu();
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
  setupLoraPopup(el);

  const swapButton = el.querySelector(".swap-button");
  if (swapButton) {
    swapButton.addEventListener("click", () => {

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

  const generateOneBtn = el.querySelector("#generate_one_btn");
  generateOneBtn.addEventListener("click", () => runGenerate(el, generateOneBtn, 1));

  const stopBtn = el.querySelector("#stop_btn");
  stopBtn.addEventListener("click", () => runStop(el, stopBtn));
  return el;
}

async function runStop(el, stopBtn) {
  if (stopBtn.disabled) return;
  stopBtn.disabled = true;

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

async function runGenerate(el, generateBtn, overrideNums) {
  if (generateBtn.disabled) return;
  const [widthRange, heightRange, numsRange] = el.querySelectorAll(".slider-range");

  const prompt_en = getTranslatedText();

  const groupedJp = getSourceTextWithGroups();
  const prompt_jp = groupedJp ?? getSourceText();
  if (!prompt_en) {
    updateGenerateState();
    return;
  }

  flashGlow("press");

  const res = await callApi("/api/generate", {
    prompt_jp: prompt_jp,

    jp_exact: groupedJp !== null,
    prompt_en: prompt_en,
    height: heightRange.value,
    width: widthRange.value,
    nums: overrideNums ?? numsRange.value,
    GPU: getSelectedGpu(el),
    REF_BOOST: Number(el.querySelector(".adv-ref-boost").value),
    GROUNDING_PX: Number(el.querySelector(".adv-grounding-px").value),

    loras: getLoras(el),

    ...(selectedImagePath ? { image_path: selectedImagePath } : {}),

    once: overrideNums !== undefined,
  });

  if (res?.networkError) {
    console.error("[generate] サーバーに接続できません:", res);
    setStatus(el, "noServer", res.error || "");
    flashGlow("error");
  } else if (res?.extensionError) {

    console.error("[generate] 拡張機能との通信に失敗:", res);
    setStatus(el, "error", "拡張機能との通信に失敗しました。ページをリロードしてください");
    flashGlow("error");
  } else if (res?.ok) {
    setStatus(el, res.data?.queued ? "queued" : "started");

    storageSet({
      [STORAGE_KEYS.width]: widthRange.value,
      [STORAGE_KEYS.height]: heightRange.value,
      [STORAGE_KEYS.nums]: numsRange.value,
      [STORAGE_KEYS.aspect]: el.querySelector(".aspect-select")?.value ?? "",
      [STORAGE_KEYS.gpu]: getSelectedGpu(el),
      [STORAGE_KEYS.refBoost]: el.querySelector(".adv-ref-boost").value,
      [STORAGE_KEYS.groundingPx]: el.querySelector(".adv-grounding-px").value,
    });
  } else {
    console.error("[generate] サーバーがエラーを返しました:", res);
    setStatus(el, "error", describeHttpError(res));
    flashGlow("error");
  }
}

const IMAGE_DRAG_CLASS = "my-image-dragging";
const IMAGE_DRAG_IDLE_MS = 400;

function isImageDrag(e) {
  const dt = e.dataTransfer;
  if (!dt || !Array.from(dt.types || []).includes("Files")) return false;
  const items = Array.from(dt.items || []);
  if (items.length === 0) return true;
  return items.some((it) => it.kind === "file" && it.type.startsWith("image/"));
}

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
    idleTimer = setTimeout(hide, IMAGE_DRAG_IDLE_MS);
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
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    },
    true
  );

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
      if (!inZone) return;
      e.preventDefault();
      e.stopPropagation();
      const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith("image/"));
      if (file) onReferenceImageDropped(file);
    },
    true
  );
  document.addEventListener("dragend", hide, true);
}

function isFocusInSourceEditor() {
  const active = document.activeElement;
  if (!active) return false;
  return CONFIG.sourceSelectors.some((selector) => {
    const container = document.querySelector(selector);
    return container && container.contains(active);
  });
}

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
  if (injected) restoreSavedParams(injected);

  return true;
}

setupGenerateShortcut();

setupImageDrop();

setupSameHighlight();

setupMultiEdit();

setupGroupEdit();

setupGroupPaste();

setupContextMenu();

setupGroupObserver();

setupGroupHistory();

setupGroupEnter();

setupGroupAltKey();

loadSavedGroups();

loadLoraLibrary();

inject();
applyTheme();
hideOutsideMainSection();

let refreshTimer = null;
const observer = new MutationObserver((mutations) => {
  const mine = document.getElementById(CONFIG.injectedId);

  const groupLayer = document.getElementById("my-group-layer");
  const onlyGroupLayerMoved = (m) =>
    m.type === "childList" &&
    m.addedNodes.length + m.removedNodes.length > 0 &&
    [...m.addedNodes, ...m.removedNodes].every((n) => n.id === "my-group-layer");
  if (mine && mutations.every((m) => mine.contains(m.target) || groupLayer?.contains(m.target) || onlyGroupLayerMoved(m))) return;

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
