const SERVER = "http://127.0.0.1:8765";

const CIVITAI_API = "https://civitai.com/api/v1";

async function civitaiJson(path) {
  const res = await fetch(CIVITAI_API + path);
  if (!res.ok) throw new Error(`HTTP ${res.status}${res.statusText ? " " + res.statusText : ""}`);
  return res.json();
}

const civitaiImageOf = (images) => {
  const img = (images || []).find((x) => x && x.url && (!x.type || x.type === "image"));
  return img ? img.url : "";
};

async function civitaiModel({ modelId, versionId }) {
  if (!modelId && versionId) {
    const v = await civitaiJson(`/model-versions/${encodeURIComponent(versionId)}`);
    modelId = v.modelId;
  }
  if (!modelId) throw new Error("モデルが見つかりません");
  const m = await civitaiJson(`/models/${encodeURIComponent(modelId)}`);
  return {
    id: String(m.id),
    name: m.name || "",
    type: m.type || "",
    versions: (m.modelVersions || []).map((v) => ({
      id: String(v.id),
      name: v.name || "",
      baseModel: v.baseModel || "",
      image: civitaiImageOf(v.images),
    })),
  };
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function civitaiThumb(url) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !/(^|\.)civitai\.com$/i.test(u.hostname)) throw new Error("対応していない画像URLです");
  const small = u.href.replace(/\/width=\d+(?=[\/,])/, "/width=128");
  const res = await fetch(small);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error("画像ではありません");
  return `data:${type};base64,${toBase64(await res.arrayBuffer())}`;
}

function handleCivitai(msg) {
  if (msg.op === "model") return civitaiModel(msg);
  if (msg.op === "thumb") return civitaiThumb(String(msg.url || ""));
  return Promise.reject(new Error("unknown op"));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "civitai") {
    handleCivitai(msg)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
    return true;
  }
  if (msg?.type !== "api") return;

  fetch(SERVER + msg.path, {
    method: msg.method || "POST",
    headers: { "Content-Type": "application/json" },
    body: msg.body !== undefined ? JSON.stringify(msg.body) : undefined,
  })
    .then(async (res) => {

      const text = await res.text().catch(() => "");
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (_) {}
      sendResponse({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        data,
        text: res.ok ? undefined : text.slice(0, 500),
      });
    })
    .catch((err) => {

      sendResponse({ ok: false, networkError: true, error: String(err) });
    });

  return true;
});
