const SERVER = "http://127.0.0.1:8765";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "api") return;

  fetch(SERVER + msg.path, {
    method: msg.method || "POST",
    headers: { "Content-Type": "application/json" },
    body: msg.body !== undefined ? JSON.stringify(msg.body) : undefined,
  })
    .then(async (res) => {
      // JSON以外（HTMLやプレーンテキスト）のエラー応答も拾えるよう、まず本文をテキストで読む
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
        text: res.ok ? undefined : text.slice(0, 500), // エラー時のみ本文を返す
      });
    })
    .catch((err) => {
      // サーバーに接続できなかった場合
      sendResponse({ ok: false, networkError: true, error: String(err) });
    });

  return true; // 非同期でsendResponseを呼ぶために
});