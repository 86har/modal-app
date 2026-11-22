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
};
const HTML = `
<div class="my-injected-element">
    <h3>画像を生成する</h3>
    <div class="meta-container">
        <div class="meta-data-container">
            <select class="aspect-select" aria-label="アスペクト比">
                <option value="">自由</option>
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
                <option value="3:2">3:2</option>
                <option value="2:3">2:3</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="21:9">21:9</option>
                <option value="9:21">9:21</option>
            </select>
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
        <div class="generates" data-state="idle">
          <p>翻訳画面に入力してください</p>
          <button type="button" id="stop_btn">停止</button>
          <button type="button" id="generate_one_btn" disabled>1枚だけ生成</button>
          <button type="button" id="generate_btn" disabled>生成</button>
        </div>
    </div>
    <div class="replace-container">
        <input type="text" class="replace-from" placeholder="置換前の文字" aria-label="置換前の文字" autocomplete="off">
        <svg class="replace-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 12h15M14 7l5 5-5 5"/>
        </svg>
        <input type="text" class="replace-to" placeholder="置換後の文字" aria-label="置換後の文字" autocomplete="off">
        <button type="button" id="replace_btn">Replace</button>
        <span class="replace-result" aria-live="polite"></span>
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
  }
}

// 生成ボタン横の状態表示。data-state は CSS 側のボーダー色に対応（noServer / error はどちらも赤）
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
  const box = el.querySelector(".generates");
  const label = box.querySelector("p");
  const short = detail.length > DETAIL_MAX ? detail.slice(0, DETAIL_MAX) + "…" : detail;
  const text = STATUS[key].text + (short ? `（${short}）` : "");
  if (box.dataset.state === key && label.textContent === text) return; // 変化がなければDOMに触らない
  box.dataset.state = key;
  label.textContent = text;
  label.title = detail;
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
  const state = el.querySelector(".generates").dataset.state;
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

// 翻訳元の文章内の from をすべて to に置換する。戻り値は置換した件数（エディタが無ければ -1）
// DeepLのエディタ側に「ユーザーが入力した」と認識させるため、範囲選択して execCommand で書き換える。
// 後ろの一致から順に処理し、1件ごとにDOMを取り直す（再描画でノードが入れ替わっても壊れないように）
async function replaceInSource(from, to) {
  const editor = getSourceEditor();
  if (!editor) return -1;

  editor.focus();
  const total = findMatches(editor, from).length;

  for (let done = 0; done < total; done++) {
    const matches = findMatches(editor, from);
    const target = matches[total - 1 - done];
    if (!target) break;

    const range = document.createRange();
    range.setStart(target.node, target.start);
    range.setEnd(target.node, target.start + from.length);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    if (to) document.execCommand("insertText", false, to);
    else document.execCommand("delete");

    await nextFrame();
  }
  return total;
}

async function runReplace(el, replaceBtn) {
  if (replaceBtn.disabled) return;
  const from = el.querySelector(".replace-from").value;
  const to = el.querySelector(".replace-to").value;
  const result = el.querySelector(".replace-result");

  if (!from) {
    result.textContent = "置換前の文字を入力してください";
    return;
  }

  replaceBtn.disabled = true; // 連打防止
  try {
    const count = await replaceInSource(from, to);
    if (count < 0) {
      result.textContent = "翻訳元の入力欄が見つかりません";
      flashGlow("error");
    } else if (count === 0) {
      result.textContent = "見つかりませんでした";
      flashGlow("error");
    } else {
      result.textContent = `${count}件を置換しました`;
      flashGlow("press");
    }
  } finally {
    replaceBtn.disabled = false;
  }
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

// HTMLからDOM要素を作る
function createElementToInject() {
  const template = document.createElement("template");
  template.innerHTML = HTML.trim();
  const el = template.content.firstElementChild;
  el.id = CONFIG.injectedId;

  el.querySelectorAll("[data-slider]").forEach(setupSlider);
  setupAspect(el);

  const swapButton = el.querySelector(".swap-button");
  if (swapButton) {
    swapButton.addEventListener("click", () => {
      // 比率が選ばれているときは、比率も反転する（4:3 → 3:4）。先に反転しておけば、入れ替え後の値と矛盾しない
      const aspectSelect = el.querySelector(".aspect-select");
      if (aspectSelect && aspectSelect.value) {
        const [a, b] = aspectSelect.value.split(":");
        aspectSelect.value = `${b}:${a}`;
      }
      const [widthRange, heightRange] = el.querySelectorAll(".slider-range");
      const tmp = widthRange.value;
      widthRange.value = heightRange.value;
      heightRange.value = tmp;
      widthRange.dispatchEvent(new Event("input"));
      heightRange.dispatchEvent(new Event("input"));
    });
  }

  const replaceBtn = el.querySelector("#replace_btn");
  replaceBtn.addEventListener("click", () => runReplace(el, replaceBtn));
  el.querySelectorAll(".replace-from, .replace-to").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) { // IME変換確定のEnterでは実行しない
        e.preventDefault();
        runReplace(el, replaceBtn);
      }
    });
  });

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

// 最初に一度試す
inject();
applyTheme();
hideOutsideMainSection();

// SPAなどで後から描画されるだとか再描画で消される場合に備えて監視する
let refreshTimer = null;
const observer = new MutationObserver((mutations) => {
  const mine = document.getElementById(CONFIG.injectedId);

  // 自分が差し込んだ要素の中の変化だけなら何もしない（自分の更新で再発火するのを防ぐ）
  if (mine && mutations.every((m) => mine.contains(m.target))) return;

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