(function () {
  var viewer = document.getElementById('viewer');
  var genProgress = document.getElementById('genProgress'); // ターミナルパネルのヘッダー
  var termPanel = document.getElementById('termPanel');
  var termBody = document.getElementById('termBody');
  var termResizeHandle = document.getElementById('termResizeHandle');
  var termExpandBtn = document.getElementById('termExpandBtn'); // ターミナル非表示時の再表示用つまみ
  var img = document.getElementById('img');
  var selectionBox = document.getElementById('selection');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var glow = document.createElement('div');
  glow.id = 'glow';
  document.body.appendChild(glow);

  function flashGlow(variant) {
    if (glow.classList.contains('active')) return;
    glow.classList.toggle('glow-pink', variant === 'pink');
    glow.classList.add('active');
  }
  glow.addEventListener('animationend', function () {
    glow.classList.remove('active');
    glow.classList.remove('glow-pink');
  });

  var thumbStrip = document.getElementById('thumbStrip');
  var thumbStripResizeHandle = document.getElementById('thumbStripResizeHandle');
  var thumbStripExpandBtn = document.getElementById('thumbStripExpandBtn');
  // サムネイルの遅延読み込み用（関数より先に宣言しておく）
  var THUMB_LOAD_DELAY = 150; // 表示範囲に入ってからこの時間とどまったものだけ読み込む(ms)
  var thumbObserver = null;
  var thumbMap = {};
  // 読み込み前のサムネイルに入れておく透明な1x1画像（src が空だと壊れた画像アイコンが出るため）
  var THUMB_BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var sidebar = document.getElementById('sidebar');
  var sidebarResizeHandle = document.getElementById('sidebarResizeHandle');
  var sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
  var sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
  var sidebarPreviewWrap = document.getElementById('sidebarPreviewWrap');
  var sidebarPreviewImg = document.getElementById('sidebarPreviewImg');
  var sidebarFilename = document.getElementById('sidebarFilename');
  var infoRes = document.getElementById('infoRes');
  var infoSize = document.getElementById('infoSize');
  var infoDate = document.getElementById('infoDate');
  var copyPromptBtn = document.getElementById('copyPromptBtn');
  var infoRefBoostRow = document.getElementById('infoRefBoostRow');
  var infoRefBoost = document.getElementById('infoRefBoost');
  var infoGroundingRow = document.getElementById('infoGroundingRow');
  var infoGrounding = document.getElementById('infoGrounding');
  var infoRefBlock = document.getElementById('infoRefBlock');
  var infoRefImg = document.getElementById('infoRefImg');
  var infoRefPath = document.getElementById('infoRefPath');
  var infoLoraBlock = document.getElementById('infoLoraBlock');
  var infoLoraList = document.getElementById('infoLoraList');
  var autoSwitchToggle = document.getElementById('autoSwitchToggle');
  var favoriteViewToggle = document.getElementById('favoriteViewToggle');

  // 新しい画像が追加されたとき、自動で表示を切り替えるかどうか（設定は端末に保存）
  var AUTO_SWITCH_STORAGE_KEY = 'autoSwitchImages';
  var autoSwitchEnabled = true;
  (function initAutoSwitch() {
    try {
      var saved = localStorage.getItem(AUTO_SWITCH_STORAGE_KEY);
      if (saved !== null) autoSwitchEnabled = saved === '1';
    } catch (e) {}
    if (autoSwitchToggle) autoSwitchToggle.checked = autoSwitchEnabled;
  })();
  function setAutoSwitch(value) {
    autoSwitchEnabled = !!value;
    if (autoSwitchToggle) autoSwitchToggle.checked = autoSwitchEnabled;
    try {
      localStorage.setItem(AUTO_SWITCH_STORAGE_KEY, autoSwitchEnabled ? '1' : '0');
    } catch (e) {}
  }
  if (autoSwitchToggle) {
    autoSwitchToggle.addEventListener('change', function () {
      setAutoSwitch(autoSwitchToggle.checked);
    });
  }

  // お気に入りフォルダの中身を表示するモードかどうか（設定は端末に保存）
  var FAVORITE_VIEW_STORAGE_KEY = 'showFavoriteFolder';
  var favoriteViewEnabled = false;
  // フォルダ（通常 / お気に入り）ごとに、最後に表示していた画像名を覚えておく。
  // 切替先のフォルダに戻ったとき、先頭ではなくその画像から見られるようにする
  var lastViewed = { normal: null, favorite: null };
  // お気に入り表示中にダブルクリックした画像は、すぐには削除せず「削除予定」にする。
  // 別の画像へ移るなどの操作をした時点で、実際にお気に入りフォルダから削除する（名前をキーに管理）
  var pendingRemoveNames = {};
  function viewModeKey() {
    return favoriteViewEnabled ? 'favorite' : 'normal';
  }
  function findItemByName(list, name) {
    if (!name) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) return list[i];
    }
    return null;
  }
  (function initFavoriteView() {
    try {
      var saved = localStorage.getItem(FAVORITE_VIEW_STORAGE_KEY);
      if (saved !== null) favoriteViewEnabled = saved === '1';
    } catch (e) {}
    if (favoriteViewToggle) favoriteViewToggle.checked = favoriteViewEnabled;
    updateViewerLabel();
  })();
  // トグルの状態（favoriteViewEnabled）が決まった後に、表示の切替処理をまとめて行う
  function applyFavoriteViewMode() {
    flushPendingRemovals(); // 表示するフォルダを切り替える前に、削除予定の画像を確定する
    try {
      localStorage.setItem(FAVORITE_VIEW_STORAGE_KEY, favoriteViewEnabled ? '1' : '0');
    } catch (e) {}
    // 表示対象のフォルダが切り替わるので、旧モードの画像・一覧を捨てて
    // 切替先フォルダの一覧を読み直し、先頭（= 一番新しい画像）を表示する
    updateViewerLabel();
    var cached = listCache[viewModeKey()];
    var restoreName = lastViewed[viewModeKey()];
    if (cached) {
      // 前回取得済みの一覧があれば即座に表示し、最新化はバックグラウンドで行う
      // 以前このフォルダで見ていた画像が残っていれば、そこから表示する
      imagesList = cached;
      var restoreItem = findItemByName(imagesList, restoreName);
      currentName = restoreItem ? restoreItem.name : null;
      renderThumbnails();
      if (restoreItem) {
        selectImage(restoreItem);
      } else if (imagesList.length > 0) {
        selectImage(imagesList[0]);
      } else {
        clearDisplay();
      }
      loadImagesList(false, true);
    } else {
      currentName = null;
      imagesList = [];
      updatePreviewFavorite();
      loadImagesList(true, false, restoreName);
    }
  }

  if (favoriteViewToggle) {
    favoriteViewToggle.addEventListener('change', function () {
      favoriteViewEnabled = favoriteViewToggle.checked;
      applyFavoriteViewMode();
    });
  }

  // サイドバーのトグル以外（画像画面の右クリックなど）からもお気に入り表示を切り替えられるようにする
  function toggleFavoriteView() {
    favoriteViewEnabled = !favoriteViewEnabled;
    if (favoriteViewToggle) favoriteViewToggle.checked = favoriteViewEnabled;
    applyFavoriteViewMode();
  }

  // ---- 監視フォルダ ----
  var watchFolderBtn = document.getElementById('watchFolderBtn');
  var watchFolderPath = document.getElementById('watchFolderPath');

  function renderWatchFolder(folder) {
    if (!watchFolderPath) return;
    watchFolderPath.textContent = folder ? folderBaseName(folder) : '未設定';
    watchFolderPath.title = folder || '';
    watchFolderPath.classList.toggle('is-unset', !folder);
  }

  function loadWatchFolder() {
    fetch('/watch/folder')
      .then(function (r) { return r.json(); })
      .then(function (data) { renderWatchFolder(data.folder); })
      .catch(function () {});
  }

  if (watchFolderBtn) {
    watchFolderBtn.addEventListener('click', function () {
      watchFolderBtn.disabled = true;
      fetch('/watch/folder', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          renderWatchFolder(data.folder);
          lastViewed.normal = null; // 別のフォルダになるので位置の記憶は破棄
          // 監視フォルダを変更したら一覧を読み直す（通常表示中は先頭へ、お気に入り表示中は一覧のみ更新）
          loadImagesList(!favoriteViewEnabled);
        })
        .catch(function () {})
        .then(function () { watchFolderBtn.disabled = false; });
    });
  }

  // ---- お気に入り画像の保存先フォルダ ----
  var favoriteFolderBtn = document.getElementById('favoriteFolderBtn');
  var favoriteFolderPath = document.getElementById('favoriteFolderPath');
  var favoritingInProgress = false;

  // フルパスの末尾（フォルダ名部分）だけを取り出す（"/" "\" どちらの区切りにも対応）
  function folderBaseName(path) {
    if (!path) return '';
    var parts = path.split(/[\\/]+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : path;
  }

  var favoriteFolderName = null;

  // お気に入りフォルダ表示中は、サムネイル一覧の背景をピンクにする
  function updateViewerLabel() {
    if (!thumbStrip) return;
    thumbStrip.classList.toggle('is-favorite', !!favoriteViewEnabled);
  }

  // ---- ターミナルパネル（gen.py の出力をそのまま表示） ----
  // viewer.py の /log（= gen.py の /api/log）を定期的に読み、行を描画する。
  // 出力があるときは短い間隔、無いときはゆるめに確認する
  var TERM_POLL_ACTIVE_MS = 500;
  var TERM_POLL_IDLE_MS = 1500;
  var termLastVersion = null;

  function termSegmentSpan(seg) {
    var span = document.createElement('span');
    span.textContent = seg.t;
    if (seg.fg) span.style.color = seg.fg;
    if (seg.bg) {
      span.style.background = seg.bg;
      span.style.borderRadius = '2px';
      span.style.padding = '0 2px';
    }
    return span;
  }

  function termRenderLine(segments, isCur) {
    var div = document.createElement('div');
    div.className = 'term-line' + (isCur ? ' term-cur' : '');
    if (segments && segments.length) {
      segments.forEach(function (seg) {
        if (seg.t) div.appendChild(termSegmentSpan(seg));
      });
    }
    return div;
  }

  function pollTermLog() {
    var nextDelay = TERM_POLL_IDLE_MS;
    if (!termBody) {
      setTimeout(pollTermLog, TERM_POLL_IDLE_MS);
      return;
    }
    fetch('/log', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.version === termLastVersion) return;
        termLastVersion = data.version;
        // 一番下を見ていた場合だけ、更新後も追従してスクロールする
        var wasAtBottom = termBody.scrollHeight - termBody.scrollTop - termBody.clientHeight < 24;
        var frag = document.createDocumentFragment();
        (data.lines || []).forEach(function (segs) {
          frag.appendChild(termRenderLine(segs, false));
        });
        if (data.cur && data.cur.length) {
          frag.appendChild(termRenderLine(data.cur, true));
        }
        termBody.innerHTML = '';
        termBody.appendChild(frag);
        if (wasAtBottom) termBody.scrollTop = termBody.scrollHeight;
        nextDelay = TERM_POLL_ACTIVE_MS;
      })
      .catch(function () {})
      .then(function () {
        setTimeout(pollTermLog, nextDelay);
      });
  }
  pollTermLog();

  // ---- ターミナルパネルの縦幅調整 ----
  var TERM_HEIGHT_KEY = 'termHeight';
  var TERM_COLLAPSED_KEY = 'termCollapsed';
  var TERM_MIN_HEIGHT = 60;
  var TERM_MAX_HEIGHT = 480;
  var TERM_DEFAULT_HEIGHT = 160;
  var TERM_COLLAPSE_EDGE = 20; // この範囲まで画面端(サムネイル帯側)に近づけたら非表示にする

  var termLastHeight = TERM_DEFAULT_HEIGHT; // 再表示するときに戻す高さ

  function applyTermHeightVar(px) {
    document.documentElement.style.setProperty('--term-height', px + 'px');
  }

  // 縦幅を変えている間、常に最新行(一番下)が見える位置にスクロールを固定する。
  // こうしないと、縮めたときに一番下に見えていた最新の文字が表示範囲の外へ下がってしまう。
  function pinTermScrollToBottom() {
    if (termBody) termBody.scrollTop = termBody.scrollHeight;
  }

  function setTermHeight(px) {
    px = Math.max(TERM_MIN_HEIGHT, Math.min(TERM_MAX_HEIGHT, Math.round(px)));
    termLastHeight = px;
    applyTermHeightVar(px);
    if (termPanel) termPanel.classList.remove('collapsed');
    document.body.classList.remove('term-collapsed');
    if (termExpandBtn) termExpandBtn.hidden = true;
    try {
      localStorage.setItem(TERM_HEIGHT_KEY, String(px));
      localStorage.setItem(TERM_COLLAPSED_KEY, '0');
    } catch (e) {}
    pinTermScrollToBottom();
    return px;
  }

  function setTermCollapsed(collapsed) {
    document.body.classList.toggle('term-collapsed', collapsed);
    if (termExpandBtn) termExpandBtn.hidden = !collapsed;
    if (collapsed) {
      applyTermHeightVar(0);
      if (termPanel) termPanel.classList.add('collapsed');
    } else {
      applyTermHeightVar(termLastHeight);
      if (termPanel) termPanel.classList.remove('collapsed');
      pinTermScrollToBottom();
    }
    try { localStorage.setItem(TERM_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (e) {}
  }

  (function initTermHeight() {
    var savedHeight = TERM_DEFAULT_HEIGHT;
    try {
      var raw = parseInt(localStorage.getItem(TERM_HEIGHT_KEY), 10);
      if (!isNaN(raw)) savedHeight = Math.max(TERM_MIN_HEIGHT, Math.min(TERM_MAX_HEIGHT, raw));
    } catch (e) {}
    termLastHeight = savedHeight;

    var savedCollapsed = false;
    try { savedCollapsed = localStorage.getItem(TERM_COLLAPSED_KEY) === '1'; } catch (e) {}
    if (savedCollapsed) {
      applyTermHeightVar(0);
      if (termPanel) termPanel.classList.add('collapsed');
      document.body.classList.add('term-collapsed');
      if (termExpandBtn) termExpandBtn.hidden = false;
    } else {
      applyTermHeightVar(savedHeight);
      if (termExpandBtn) termExpandBtn.hidden = true;
    }
  })();

  // つまみをクリックすると、前回の高さでターミナルを再表示する
  if (termExpandBtn) {
    termExpandBtn.addEventListener('click', function () {
      setTermCollapsed(false);
      resetView(); // ビューアーの表示サイズが変わるのでフィットを再計算
    });
  }

  // ターミナルの縦幅調整はサムネイル帯とは独立。非表示になった後は、ドラッグを戻すと再表示されるだけ
  var termResizing = false;

  if (termResizeHandle) {
    termResizeHandle.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      termResizing = true;
      termResizeHandle.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });
  }
  window.addEventListener('mousemove', function (e) {
    if (!termResizing) return;

    // ターミナルパネルは画面最下部に固定されているので、サムネイル帯の高さは関係ない
    var distanceFromBottom = window.innerHeight - e.clientY;
    if (distanceFromBottom <= TERM_COLLAPSE_EDGE) {
      // 最小サイズを超えてさらに下までドラッグされたら、ターミナルだけを非表示にする
      if (!document.body.classList.contains('term-collapsed')) {
        setTermCollapsed(true);
        resetView();
      }
      return;
    }
    setTermHeight(distanceFromBottom);
    resetView();
  });
  window.addEventListener('mouseup', function () {
    if (!termResizing) return;
    termResizing = false;
    if (termResizeHandle) termResizeHandle.classList.remove('dragging');
    document.body.style.cursor = '';
  });
  window.addEventListener('blur', function () {
    if (termResizing) {
      termResizing = false;
      if (termResizeHandle) termResizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
    }
  });

  function renderFavoriteFolder(folder) {
    favoriteFolderName = folder ? folderBaseName(folder) : null;
    updateViewerLabel();
    if (!favoriteFolderPath) return;
    favoriteFolderPath.textContent = folder ? folderBaseName(folder) : '未設定';
    favoriteFolderPath.title = folder || '';
    favoriteFolderPath.classList.toggle('is-unset', !folder);
  }

  function loadFavoriteFolder() {
    fetch('/favorite/folder')
      .then(function (r) { return r.json(); })
      .then(function (data) { renderFavoriteFolder(data.folder); })
      .catch(function () {});
  }

  if (favoriteFolderBtn) {
    favoriteFolderBtn.addEventListener('click', function () {
      favoriteFolderBtn.disabled = true;
      fetch('/favorite/folder', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          renderFavoriteFolder(data.folder);
          lastViewed.favorite = null; // 別のフォルダになるので位置の記憶は破棄
          pendingRemoveNames = {}; // 削除予定も破棄
          // 保存先を変更したら一覧を読み直す（お気に入り表示中は先頭へ、通常時は表示中の画像を維持）
          loadImagesList(favoriteViewEnabled);
        })
        .catch(function () {})
        .then(function () { favoriteFolderBtn.disabled = false; });
    });
  }

  // ---- 生成時の詳細（参照画像・REF_BOOST・GROUNDING_PX・LoRA）を詳細画面に表示 ----
  var promptInfoRequestId = 0;

  function formatNumber(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '-';
    return String(Math.round(v * 1000) / 1000);
  }

  function renderPromptInfo(data) {
    var hasRef = !!(data && data.image_path);
    if (infoRefBlock) infoRefBlock.hidden = !hasRef;
    if (hasRef) {
      infoRefImg.classList.remove('img-broken');
      infoRefImg.onerror = function () { infoRefImg.classList.add('img-broken'); };
      if (data.ref_image_exists) {
        infoRefImg.src = '/ref_image/' + encodeURIComponent(currentName);
      } else {
        infoRefImg.removeAttribute('src');
        infoRefImg.classList.add('img-broken');
      }
      infoRefPath.textContent = data.image_path + (data.ref_image_exists ? '' : '（見つかりません）');
      infoRefPath.title = data.image_path;
      infoRefPath.classList.toggle('is-missing', !data.ref_image_exists);
    } else if (infoRefImg) {
      infoRefImg.removeAttribute('src');
    }

    var showBoost = !!(data && data.ref_boost !== null && data.ref_boost !== undefined);
    if (infoRefBoostRow) infoRefBoostRow.hidden = !showBoost;
    if (showBoost) infoRefBoost.textContent = formatNumber(data.ref_boost);

    var showGround = !!(data && data.grounding_px !== null && data.grounding_px !== undefined);
    if (infoGroundingRow) infoGroundingRow.hidden = !showGround;
    if (showGround) infoGrounding.textContent = formatNumber(data.grounding_px);

    var loras = (data && data.loras) || [];
    if (infoLoraBlock) infoLoraBlock.hidden = loras.length === 0;
    if (infoLoraList) {
      infoLoraList.innerHTML = '';
      loras.forEach(function (l) {
        var li = document.createElement('li');
        var id = document.createElement('span');
        id.textContent = 'ID ' + l.version_id;
        var w = document.createElement('span');
        w.className = 'lora-weight';
        w.textContent = '× ' + formatNumber(l.strength);
        li.appendChild(id);
        li.appendChild(w);
        infoLoraList.appendChild(li);
      });
    }
  }

  // 選択した画像のJSON（output_prompts）を読み、詳細を表示する。古い形式のJSONや無い場合は項目を隠す
  function loadPromptInfo(name) {
    var requestId = ++promptInfoRequestId;
    renderPromptInfo(null);
    if (!name) return;
    fetch('/prompt/' + encodeURIComponent(name), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        // 取得中に別の画像へ移っていたら捨てる
        if (requestId !== promptInfoRequestId || name !== currentName) return;
        renderPromptInfo(data);
      })
      .catch(function () {});
  }

  function getCurrentItem() {
    var idx = getCurrentIndex();
    return idx < 0 ? null : imagesList[idx];
  }

  // 表示中の画像がお気に入りなら、プレビュー枠を薄ピンクにする
  function updatePreviewFavorite() {
    if (!sidebarPreviewWrap) return;
    var item = getCurrentItem();
    // 削除予定の画像は、ピンクの枠を外して通常（何もない状態）と同じ見た目にする
    var pending = isPendingRemove(item);
    sidebarPreviewWrap.classList.toggle('is-favorite', !!(item && (favoriteViewEnabled || item.favorite)) && !pending);
  }

  // 表示する画像が無くなったとき（お気に入りフォルダが空になった等）の表示クリア
  function clearDisplay() {
    currentName = null;
    img.classList.add('img-broken');
    img.removeAttribute('src');
    sidebarPreviewImg.classList.add('img-broken');
    sidebarPreviewImg.removeAttribute('src');
    sidebarFilename.textContent = '-';
    infoRes.textContent = '-';
    infoSize.textContent = '-';
    infoDate.textContent = '-';
    promptInfoRequestId++;
    renderPromptInfo(null);
    updateNavButtons();
    updatePreviewFavorite();
  }

  function addCurrentToFavorites(item) {
    return fetch('/favorite/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name })
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok) {
          item.favorite = true;
          updatePreviewFavorite();
          flashGlow('pink');
        }
        // 保存先未設定などのエラーは静かに無視し、光の演出だけ出さない
      });
  }

  function removeCurrentFromFavorites(item) {
    return fetch('/favorite/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name })
    })
      .then(function (r) {
        // 404 = すでにお気に入りフォルダに無い。表示上は解除済みとして扱う
        if (!r.ok && r.status !== 404) return;
        item.favorite = false;

        if (!favoriteViewEnabled) {
          updatePreviewFavorite();
          return;
        }

        // お気に入り表示中はファイル自体が消えるので、一覧から外して隣の画像を表示する
        var idx = imagesList.indexOf(item);
        if (idx < 0) return;
        imagesList.splice(idx, 1);
        renderThumbnails();
        if (imagesList.length === 0) {
          clearDisplay();
        } else {
          selectImage(imagesList[Math.min(idx, imagesList.length - 1)]);
        }
      });
  }

  function isPendingRemove(item) {
    return !!(item && favoriteViewEnabled && pendingRemoveNames[item.name]);
  }

  function findThumb(name) {
    var t = thumbMap[name];
    if (t && t.isConnected) return t;
    return null;
  }

  function removeFromListByName(list, name) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) {
        list.splice(i, 1);
        return;
      }
    }
  }

  // お気に入り表示中のダブルクリック: 削除予定の付け外しだけを行い、ファイルはまだ消さない
  function togglePendingRemove(item) {
    if (pendingRemoveNames[item.name]) {
      delete pendingRemoveNames[item.name];
    } else {
      pendingRemoveNames[item.name] = true;
    }
    var thumb = findThumb(item.name);
    if (thumb) thumb.classList.toggle('pending-remove', !!pendingRemoveNames[item.name]);
    updatePreviewFavorite();
  }

  // 削除予定の画像を実際にお気に入りフォルダから削除する（exceptName の画像は対象外）
  // 一覧・サムネイルからは先に外し、サーバー削除に失敗したときだけ一覧を読み直して戻す
  function flushPendingRemovals(exceptName) {
    var names = Object.keys(pendingRemoveNames).filter(function (n) { return n !== exceptName; });
    if (names.length === 0) return;
    names.forEach(function (name) {
      delete pendingRemoveNames[name];
      removeFromListByName(listCache.favorite, name);
      if (favoriteViewEnabled && imagesList !== listCache.favorite) {
        removeFromListByName(imagesList, name);
      }
      if (favoriteViewEnabled) {
        var thumb = findThumb(name);
        if (thumb && thumb.parentNode) thumb.parentNode.removeChild(thumb);
      }
      if (lastViewed.favorite === name) lastViewed.favorite = null;
      // 通常一覧側の「お気に入り済み」表示も外す
      if (listCache.normal) {
        listCache.normal.forEach(function (i) { if (i.name === name) i.favorite = false; });
      }
      fetch('/favorite/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
      })
        .then(function (r) { return r.ok || r.status === 404; })
        .catch(function () { return false; })
        .then(function (ok) {
          if (ok) return;
          listCache.favorite = null;
          if (favoriteViewEnabled) loadImagesList(false, true);
        });
    });
  }

  // お気に入り済み（またはお気に入り表示中）なら解除＋削除、そうでなければ保存
  function toggleCurrentFavorite() {
    if (!currentName || favoritingInProgress) return;
    var item = getCurrentItem();
    if (!item) return;
    if (favoriteViewEnabled) {
      togglePendingRemove(item);
      return;
    }
    favoritingInProgress = true;
    var job = (favoriteViewEnabled || item.favorite)
      ? removeCurrentFromFavorites(item)
      : addCurrentToFavorites(item);
    job
      .catch(function () {})
      .then(function () { favoritingInProgress = false; });
  }

  // 左側の大きな画像をダブルクリックでお気に入りに保存（ナビゲーション矢印は対象外）
  viewer.addEventListener('dblclick', function (e) {
    if (e.target && e.target.closest && e.target.closest('.nav-arrow')) return;
    e.preventDefault();
    toggleCurrentFavorite();
  });

  if (sidebarPreviewImg) {
    sidebarPreviewImg.addEventListener('dblclick', function (e) {
      e.preventDefault();
      toggleCurrentFavorite();
    });
  }

  // ---- マウスホイールで前後の画像に切り替え ----
  function handleWheelNavigate(e) {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // 横スクロール操作は無視
    e.preventDefault();
    stepImage(e.deltaY > 0 ? 1 : -1);
  }

  // 左クリックを押しながらホイールを回すと、マウス位置を中心にズームする
  function handleViewerWheel(e) {
    if ((e.buttons & 1) && !rectMode) {
      e.preventDefault();
      var factor = Math.pow(1.0015, -e.deltaY);
      zoomAtPoint(e.clientX, e.clientY, factor);
      if (dragging) moved = true; // マウスアップ時にフィット表示へ戻されないようにする
      return;
    }
    handleWheelNavigate(e);
  }
  viewer.addEventListener('wheel', handleViewerWheel, { passive: false });
  if (thumbStrip) {
    thumbStrip.addEventListener('wheel', handleWheelNavigate, { passive: false });
  }
  if (sidebarPreviewWrap) {
    sidebarPreviewWrap.addEventListener('wheel', handleWheelNavigate, { passive: false });
  }

  loadWatchFolder();
  loadFavoriteFolder();

  var MIN_SCALE = 0.02;
  var MAX_SCALE = Infinity;
  var CLICK_THRESHOLD = 6;

  var baseLeft = 0, baseTop = 0, baseW = 0, baseH = 0;
  var scale = 1, tx = 0, ty = 0;

  var dragging = false;
  var rectMode = false;
  var dragStartX = 0, dragStartY = 0;
  var lastX = 0, lastY = 0;
  var moved = false;

  var ctrlHeld = false;
  var shiftHeld = false;

  var imagesList = [];
  var currentName = null;

  var stripDragging = false;
  var stripDragStartX = 0;
  var stripStartScrollLeft = 0;
  var stripMoved = false;
  var suppressThumbClick = false;

  function modifierActive() {
    return ctrlHeld;
  }

  function updateCursorClass() {
    viewer.classList.toggle('dragging', dragging && !rectMode);
    viewer.classList.toggle('rect-mode', rectMode || (!dragging && modifierActive()));
    viewer.classList.toggle('drag-out-mode', !dragging && !rectMode && shiftHeld);
  }

  // Shiftキーを押している間だけ、画像をOS側へドラッグ＆ドロップで持ち出せるようにする
  function updateDragOutAvailability() {
    img.draggable = shiftHeld;
    img.classList.toggle('drag-enabled', shiftHeld);
    if (sidebarPreviewImg) {
      sidebarPreviewImg.draggable = shiftHeld;
      sidebarPreviewImg.classList.toggle('drag-enabled', shiftHeld);
    }
  }
  updateDragOutAvailability(); // 初期状態（Shift未使用時）ではドラッグによる持ち出しを無効にしておく

  function applyTransform() {
    img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
  }

  function computeFit() {
    var vw = viewer.clientWidth, vh = viewer.clientHeight;
    var natW = img.naturalWidth || vw;
    var natH = img.naturalHeight || vh;

    if (vw <= 0 || vh <= 0 || natW <= 0 || natH <= 0) return;

    var fitScale = Math.min(vw / natW, vh / natH);
    var w = natW * fitScale;
    var h = natH * fitScale;

    baseW = w; baseH = h;
    baseLeft = (vw - w) / 2;
    baseTop = (vh - h) / 2;

    img.style.width = w + 'px';
    img.style.height = h + 'px';
    img.style.left = baseLeft + 'px';
    img.style.top = baseTop + 'px';
  }

  function resetView() {
    computeFit();
    scale = 1; tx = 0; ty = 0;
    applyTransform();
  }

  function screenToLocal(sx, sy) {
    return {
      x: (sx - baseLeft - tx) / scale,
      y: (sy - baseTop - ty) / scale
    };
  }

  // 指定した画面座標（マウス位置）を中心に保ったままズームする
  function zoomAtPoint(sx, sy, factor) {
    var local = screenToLocal(sx, sy);
    var newScale = scale * factor;
    if (newScale < MIN_SCALE) newScale = MIN_SCALE;
    if (newScale > MAX_SCALE) newScale = MAX_SCALE;
    tx = sx - baseLeft - newScale * local.x;
    ty = sy - baseTop - newScale * local.y;
    scale = newScale;
    applyTransform();
  }

  function zoomToRect(rx, ry, rw, rh) {
    var vw = viewer.clientWidth, vh = viewer.clientHeight;
    if (rw < 4 || rh < 4) return;
    var newScale = Math.min(MAX_SCALE, Math.max(vw / rw, vh / rh));
    var cx = rx + rw / 2;
    var cy = ry + rh / 2;
    tx = vw / 2 - baseLeft - newScale * cx;
    ty = vh / 2 - baseTop - newScale * cy;
    scale = newScale;
    applyTransform();
  }

  img.addEventListener('load', function () {
    img.classList.remove('img-broken');
    resetView();
    infoRes.textContent = img.naturalWidth + ' × ' + img.naturalHeight;
    sidebarPreviewImg.src = img.src;
  });
  img.addEventListener('error', function () {
    // 画像が存在しない/取得に失敗した場合は、壊れたアイコンを出さず真っ暗な背景のままにする
    img.classList.add('img-broken');
    infoRes.textContent = '-';
  });

  sidebarPreviewImg.addEventListener('load', function () {
    sidebarPreviewImg.classList.remove('img-broken');
  });
  sidebarPreviewImg.addEventListener('error', function () {
    sidebarPreviewImg.classList.add('img-broken');
  });

  // ---- Shift + ドラッグで、表示中の画像をOS側（デスクトップや他アプリ）へドラッグ＆ドロップで持ち出す ----
  var MIME_BY_EXT = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp'
  };

  function guessMimeType(name) {
    var ext = (name.split('.').pop() || '').toLowerCase();
    return MIME_BY_EXT[ext] || 'application/octet-stream';
  }

  function handleImageDragStart(e) {
    var item = getCurrentItem();
    if (!item || !e.dataTransfer) {
      e.preventDefault();
      return;
    }
    var url = mediaUrl(item.name, item.mtime || Date.now());
    var absoluteUrl = new URL(url, window.location.href).href;
    var mime = guessMimeType(item.name);
    // Chrome/Edge等が対応する「DownloadURL」形式で、ファイルとしてドロップ先に保存できるようにする
    try { e.dataTransfer.setData('DownloadURL', mime + ':' + item.name + ':' + absoluteUrl); } catch (err) {}
    try { e.dataTransfer.setData('text/uri-list', absoluteUrl); } catch (err) {}
    try { e.dataTransfer.setData('text/plain', absoluteUrl); } catch (err) {}
    e.dataTransfer.effectAllowed = 'copy';
  }

  img.addEventListener('dragstart', handleImageDragStart);
  sidebarPreviewImg.addEventListener('dragstart', handleImageDragStart);

  window.addEventListener('resize', function () {
    resetView();
  });

  // ---- サイドバー（詳細タブ）の幅調整・折りたたみ ----
  var SIDEBAR_WIDTH_KEY = 'sidebarWidth';
  var SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
  var SIDEBAR_MIN_WIDTH = 180;
  var SIDEBAR_MAX_WIDTH = 640;
  var SIDEBAR_DEFAULT_WIDTH = 280;
  var SIDEBAR_COLLAPSE_EDGE = 20; // この範囲まで画面端に近づけたら折りたたむ

  function setSidebarWidth(px) {
    px = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(px)));
    document.documentElement.style.setProperty('--sidebar-width', px + 'px');
    try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(px)); } catch (e) {}
    return px;
  }

  function setSidebarCollapsed(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    if (sidebar) sidebar.classList.toggle('collapsed', collapsed);
    if (sidebarExpandBtn) sidebarExpandBtn.hidden = !collapsed;
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (e) {}
    // サイドバーの表示状態が変わるとビューアーの表示サイズも変わるため、フィット表示を再計算する
    resetView();
  }

  (function initSidebar() {
    var savedWidth = SIDEBAR_DEFAULT_WIDTH;
    try {
      var raw = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10);
      if (!isNaN(raw)) savedWidth = raw;
    } catch (e) {}
    setSidebarWidth(savedWidth);

    var savedCollapsed = false;
    try { savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch (e) {}
    setSidebarCollapsed(savedCollapsed);
  })();

  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener('click', function () {
      setSidebarCollapsed(true);
    });
  }
  if (sidebarExpandBtn) {
    sidebarExpandBtn.addEventListener('click', function () {
      setSidebarCollapsed(false);
    });
  }

  var sidebarResizing = false;
  if (sidebarResizeHandle) {
    sidebarResizeHandle.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      sidebarResizing = true;
      sidebarResizeHandle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });
  }
  window.addEventListener('mousemove', function (e) {
    if (!sidebarResizing) return;
    var distanceFromRight = window.innerWidth - e.clientX;
    if (distanceFromRight <= SIDEBAR_COLLAPSE_EDGE) {
      // 最小サイズを超えてさらに画面端までドラッグされたら、折りたたんで隠す
      if (!document.body.classList.contains('sidebar-collapsed')) {
        setSidebarCollapsed(true);
      }
      return;
    }
    if (document.body.classList.contains('sidebar-collapsed')) {
      setSidebarCollapsed(false);
    }
    setSidebarWidth(distanceFromRight);
    resetView();
  });
  window.addEventListener('mouseup', function () {
    if (!sidebarResizing) return;
    sidebarResizing = false;
    if (sidebarResizeHandle) sidebarResizeHandle.classList.remove('dragging');
    document.body.style.cursor = '';
  });
  window.addEventListener('blur', function () {
    if (sidebarResizing) {
      sidebarResizing = false;
      if (sidebarResizeHandle) sidebarResizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
    }
  });

  // ---- サムネイル帯（下部）の高さ調整・折りたたみ ----
  var THUMB_STRIP_HEIGHT_KEY = 'thumbStripHeight';
  var THUMB_STRIP_COLLAPSED_KEY = 'thumbStripCollapsed';
  var THUMB_STRIP_MIN_HEIGHT = 64;
  var THUMB_STRIP_MAX_HEIGHT = 320;
  var THUMB_STRIP_DEFAULT_HEIGHT = 120;
  var THUMB_STRIP_COLLAPSE_EDGE = 20; // この範囲まで画面端に近づけたら折りたたむ

  function setThumbStripHeight(px) {
    px = Math.max(THUMB_STRIP_MIN_HEIGHT, Math.min(THUMB_STRIP_MAX_HEIGHT, Math.round(px)));
    document.documentElement.style.setProperty('--thumb-strip-height', px + 'px');
    try { localStorage.setItem(THUMB_STRIP_HEIGHT_KEY, String(px)); } catch (e) {}
    return px;
  }

  function setThumbStripCollapsed(collapsed) {
    document.body.classList.toggle('thumbstrip-collapsed', collapsed);
    if (thumbStrip) thumbStrip.classList.toggle('collapsed', collapsed);
    if (thumbStripExpandBtn) thumbStripExpandBtn.hidden = !collapsed;
    try { localStorage.setItem(THUMB_STRIP_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (e) {}
    // サムネイル帯の表示状態が変わるとビューアーの表示サイズも変わるため、フィット表示を再計算する
    resetView();
  }

  (function initThumbStrip() {
    var savedHeight = THUMB_STRIP_DEFAULT_HEIGHT;
    try {
      var raw = parseInt(localStorage.getItem(THUMB_STRIP_HEIGHT_KEY), 10);
      if (!isNaN(raw)) savedHeight = raw;
    } catch (e) {}
    setThumbStripHeight(savedHeight);

    var savedCollapsed = false;
    try { savedCollapsed = localStorage.getItem(THUMB_STRIP_COLLAPSED_KEY) === '1'; } catch (e) {}
    setThumbStripCollapsed(savedCollapsed);
  })();

  if (thumbStripExpandBtn) {
    thumbStripExpandBtn.addEventListener('click', function () {
      setThumbStripCollapsed(false);
    });
  }

  var thumbStripResizing = false;
  if (thumbStripResizeHandle) {
    thumbStripResizeHandle.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      thumbStripResizing = true;
      thumbStripResizeHandle.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });
  }
  window.addEventListener('mousemove', function (e) {
    if (!thumbStripResizing) return;
    // サムネイル帯の下端はターミナルの上端にあるので、画面下端からではなく
    // ターミナルの高さ(非表示なら0)を引いた位置を基準に高さを求める
    var termOccupied = (termPanel && !termPanel.classList.contains('collapsed')) ? termLastHeight : 0;
    var distanceFromBottom = window.innerHeight - e.clientY - termOccupied;
    if (distanceFromBottom <= THUMB_STRIP_COLLAPSE_EDGE) {
      // 最小サイズを超えてさらに画面端までドラッグされたら、折りたたんで隠す
      if (!document.body.classList.contains('thumbstrip-collapsed')) {
        setThumbStripCollapsed(true);
      }
      return;
    }
    if (document.body.classList.contains('thumbstrip-collapsed')) {
      setThumbStripCollapsed(false);
    }
    setThumbStripHeight(distanceFromBottom);
  });
  window.addEventListener('mouseup', function () {
    if (!thumbStripResizing) return;
    thumbStripResizing = false;
    if (thumbStripResizeHandle) thumbStripResizeHandle.classList.remove('dragging');
    document.body.style.cursor = '';
  });
  window.addEventListener('blur', function () {
    if (thumbStripResizing) {
      thumbStripResizing = false;
      if (thumbStripResizeHandle) thumbStripResizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
    }
  });

  window.addEventListener('keydown', function (e) {
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.key === 'Control') {
      ctrlHeld = true;
      updateCursorClass();
    }
    if (e.key === 'Shift') {
      shiftHeld = true;
      updateDragOutAvailability();
      updateCursorClass();
    }
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.key === 'Control') {
      ctrlHeld = false;
      updateCursorClass();
    }
    if (e.key === 'Shift') {
      shiftHeld = false;
      updateDragOutAvailability();
      updateCursorClass();
    }
  });
  window.addEventListener('blur', function () {
    ctrlHeld = false;
    shiftHeld = false;
    updateDragOutAvailability();
    updateCursorClass();
  });

  viewer.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    if (e.target && e.target.closest && e.target.closest('.nav-arrow')) return;
    if (e.shiftKey) return; // Shiftを押しながらの場合は画像を外部へドラッグ＆ドロップする操作に譲る

    dragging = true;
    moved = false;
    rectMode = modifierActive();
    dragStartX = lastX = e.clientX;
    dragStartY = lastY = e.clientY;

    if (rectMode) {
      selectionBox.style.left = dragStartX + 'px';
      selectionBox.style.top = dragStartY + 'px';
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
    }
    updateCursorClass();
    e.preventDefault();
  });

  viewer.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragStartX;
    var dy = e.clientY - dragStartY;
    if (Math.abs(dx) > CLICK_THRESHOLD || Math.abs(dy) > CLICK_THRESHOLD) {
      moved = true;
    }

    if (rectMode) {
      var left = Math.min(dragStartX, e.clientX);
      var top = Math.min(dragStartY, e.clientY);
      selectionBox.style.display = 'block';
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = Math.abs(dx) + 'px';
      selectionBox.style.height = Math.abs(dy) + 'px';
    } else {

      tx += e.clientX - lastX;
      ty += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyTransform();
    }
  });

  viewer.addEventListener('mouseup', function (e) {
    if (!dragging) return;
    dragging = false;

    if (rectMode && moved) {
      var p1 = screenToLocal(dragStartX, dragStartY);
      var p2 = screenToLocal(e.clientX, e.clientY);
      selectionBox.style.display = 'none';
      zoomToRect(
        Math.min(p1.x, p2.x),
        Math.min(p1.y, p2.y),
        Math.abs(p2.x - p1.x),
        Math.abs(p2.y - p1.y)
      );
    } else if (rectMode) {
      selectionBox.style.display = 'none';
    } else if (!moved) {

      if (scale !== 1 || tx !== 0 || ty !== 0) {
        resetView();
      }
    }

    rectMode = false;
    moved = false;
    updateCursorClass();
  });

  viewer.addEventListener('mouseleave', function () {
    if (dragging) {
      dragging = false;
      rectMode = false;
      moved = false;
      selectionBox.style.display = 'none';
      updateCursorClass();
    }
  });

  function getCurrentIndex() {
    if (!currentName || imagesList.length === 0) return -1;
    for (var i = 0; i < imagesList.length; i++) {
      if (imagesList[i].name === currentName) return i;
    }
    return -1;
  }

  function updateNavButtons() {
    var idx = getCurrentIndex();
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx < 0 || idx >= imagesList.length - 1;
  }

  // 画像を前後に移動したとき、移動した側の画面端から内側へ薄い波紋を1本走らせる
  //   右の画像へ（delta > 0）: 詳細タブ側の端（ビューア右端）から左へ
  //   左の画像へ（delta < 0）: 画面の左端から右へ
  // 連続して移動した場合は、移動した回数だけ波紋が重なって出る
  function spawnRipple(delta) {
    var rect = viewer.getBoundingClientRect();
    var fromRight = delta > 0;
    var dist = Math.max(120, Math.min(rect.width * 0.45, 480));
    var el = document.createElement('div');
    el.className = 'nav-ripple ' + (fromRight ? 'from-right' : 'from-left');
    el.style.height = rect.height + 'px';
    el.style.left = (fromRight ? rect.right - 90 : rect.left) + 'px';
    el.style.setProperty('--ripple-dist', (fromRight ? -dist : dist) + 'px');
    el.addEventListener('animationend', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    document.body.appendChild(el);
  }

  function stepImage(delta) {
    var idx = getCurrentIndex();
    if (idx < 0) return;
    var targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= imagesList.length) return;
    selectImage(imagesList[targetIdx]);
    spawnRipple(delta);
  }

  if (prevBtn) {
    prevBtn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    prevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      stepImage(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      stepImage(1);
    });
  }

  thumbStrip.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    stripDragging = true;
    stripMoved = false;
    suppressThumbClick = false;
    stripDragStartX = e.clientX;
    stripStartScrollLeft = thumbStrip.scrollLeft;
    thumbStrip.classList.add('dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', function (e) {
    if (!stripDragging) return;
    var dx = e.clientX - stripDragStartX;
    if (Math.abs(dx) > CLICK_THRESHOLD) {
      stripMoved = true;
    }
    if (stripMoved) {
      thumbStrip.scrollLeft = stripStartScrollLeft - dx;
    }
  });

  window.addEventListener('mouseup', function () {
    if (!stripDragging) return;
    stripDragging = false;
    thumbStrip.classList.remove('dragging');
    if (stripMoved) {

      suppressThumbClick = true;
      setTimeout(function () {
        suppressThumbClick = false;
      }, 0);
    }
    stripMoved = false;
  });

  window.addEventListener('blur', function () {
    if (stripDragging) {
      stripDragging = false;
      stripMoved = false;
      thumbStrip.classList.remove('dragging');
    }
  });

  function formatBytes(bytes) {
    if (bytes === null || bytes === undefined) return '-';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    var v = bytes;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return (i === 0 ? v : v.toFixed(1)) + ' ' + units[i];
  }

  function formatDate(epochSeconds) {
    if (!epochSeconds) return '-';
    var d = new Date(epochSeconds * 1000);
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // 現在のモード（通常 / お気に入り表示）に応じた画像URLを組み立てる
  function mediaUrl(name, cacheKey) {
    var base = favoriteViewEnabled ? '/favorite/image/' : '/image/';
    return base + encodeURIComponent(name) + '?t=' + cacheKey;
  }

  function imageUrl(item) {
    return mediaUrl(item.name, item.mtime || Date.now());
  }

  // サムネイル用の軽量画像URL（サーバー側で縮小・キャッシュ）
  function thumbUrl(name, cacheKey) {
    var base = favoriteViewEnabled ? '/favorite/thumb/' : '/thumb/';
    return base + encodeURIComponent(name) + '?t=' + cacheKey;
  }

  // 表示範囲に入り、THUMB_LOAD_DELAY ミリ秒とどまったサムネイルだけ src を設定する。
  // スクロールバーを素早く動かしたとき、通過しただけの大量のサムネイルを
  // 読み込まないようにして、サーバーとブラウザの負荷を抑える。
  function createThumbObserver() {
    if (!('IntersectionObserver' in window)) return null;
    return new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          if (el._loadTimer || el._loadStarted) return;
          el._loadTimer = setTimeout(function () {
            el._loadTimer = null;
            if (!el.isConnected) return;
            if (thumbObserver) thumbObserver.unobserve(el);
            el._loadStarted = true;
            el.alt = el._thumbName;
            el.src = el._thumbSrc;
          }, THUMB_LOAD_DELAY);
        } else if (el._loadTimer) {
          clearTimeout(el._loadTimer);
          el._loadTimer = null;
        }
      });
    }, { root: thumbStrip, rootMargin: '0px 200px 0px 200px' });
  }

  function renderThumbnails() {
    if (thumbObserver) thumbObserver.disconnect();
    thumbObserver = createThumbObserver();
    thumbMap = {};
    thumbStrip.innerHTML = '';
    var frag = document.createDocumentFragment();
    var newThumbs = [];
    imagesList.forEach(function (item) {
      var thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.draggable = false;
      thumb.decoding = 'async';
      thumb._thumbSrc = thumbUrl(item.name, item.mtime);
      thumb._thumbName = item.name;
      // 読み込み前は alt を空・src を透明画像にして、壊れた画像アイコンが出ないようにする
      if (!thumbObserver) {
        thumb.alt = item.name;
        thumb.src = thumb._thumbSrc; // IntersectionObserver 非対応時は即読み込み
      } else {
        thumb.alt = '';
        thumb.src = THUMB_BLANK;
      }
      thumbMap[item.name] = thumb;
      newThumbs.push(thumb);
      thumb.title = item.name;
      if (item.name === currentName) {
        thumb.classList.add('active');
      }
      if (favoriteViewEnabled && pendingRemoveNames[item.name]) {
        thumb.classList.add('pending-remove');
      }
      thumb.addEventListener('click', function () {
        if (suppressThumbClick) return;
        selectImage(item);
      });
      thumb.addEventListener('error', function () {
        thumb.classList.add('img-broken');
      });
      frag.appendChild(thumb);
    });
    thumbStrip.appendChild(frag);
    if (thumbObserver) {
      newThumbs.forEach(function (t) { thumbObserver.observe(t); });
    }
  }

  // 選択中のサムネイルが帯の表示範囲外なら、見える位置までスクロールする
  function scrollThumbIntoView(thumb) {
    if (!thumb) return;
    var margin = 10;
    var sr = thumbStrip.getBoundingClientRect();
    var tr = thumb.getBoundingClientRect();
    var delta = 0;
    if (tr.left < sr.left + margin) {
      delta = tr.left - (sr.left + margin);
    } else if (tr.right > sr.right - margin) {
      delta = tr.right - (sr.right - margin);
    }
    if (delta !== 0) thumbStrip.scrollLeft += delta;
  }

  function selectImage(item) {
    // 別の画像へ移ったので、削除予定の画像（移動先を除く）を実際に削除する
    flushPendingRemovals(item.name);
    currentName = item.name;
    lastViewed[viewModeKey()] = item.name;
    img.src = imageUrl(item);

    sidebarFilename.textContent = item.name;
    infoSize.textContent = formatBytes(item.size);
    infoDate.textContent = formatDate(item.mtime);
    loadPromptInfo(item.name);

    // 全サムネイルを走査せず、前の選択を外して新しい選択だけ付ける
    var prevActive = thumbStrip.querySelectorAll('.thumb.active');
    for (var i = 0; i < prevActive.length; i++) prevActive[i].classList.remove('active');
    var activeThumb = findThumb(item.name);
    if (activeThumb) activeThumb.classList.add('active');
    scrollThumbIntoView(activeThumb);
    updateNavButtons();
    updatePreviewFavorite();
  }

  // ---- プロンプトのコピー（画像名と同名の output_prompt/*.json を参照） ----
  var COPY_LABEL = 'プロンプトをコピー';
  var copyBtnTimer = null;

  function setCopyBtnState(label, state) {
    if (!copyPromptBtn) return;
    copyPromptBtn.textContent = label;
    copyPromptBtn.classList.toggle('is-ok', state === 'ok');
    copyPromptBtn.classList.toggle('is-error', state === 'error');
    clearTimeout(copyBtnTimer);
    copyBtnTimer = setTimeout(function () {
      copyPromptBtn.textContent = COPY_LABEL;
      copyPromptBtn.classList.remove('is-ok', 'is-error');
    }, 1500);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy'));
    });
  }

  // 表示中の画像のプロンプトをコピーする（サイドバーのボタンと右クリックメニューで共通）
  // 失敗時は Error(message) で reject する。message: 'noimage' / 'notfound' / その他
  function copyCurrentPrompt() {
    if (!currentName) return Promise.reject(new Error('noimage'));
    return fetch('/prompt/' + encodeURIComponent(currentName), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('notfound');
        return r.json();
      })
      .then(function (data) {
        // 保存済みJSONに \r\n が混ざっていても \n に統一してコピーする
        return copyText(data.prompt.replace(/\r\n?/g, '\n'));
      });
  }

  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', function () {
      copyCurrentPrompt()
        .then(function () { setCopyBtnState('コピーしました', 'ok'); })
        .catch(function (e) {
          var msg = e && e.message;
          if (msg === 'noimage') setCopyBtnState('画像がありません', 'error');
          else setCopyBtnState(msg === 'notfound' ? 'プロンプトがありません' : 'コピーに失敗しました', 'error');
        });
    });
  }

  // ---- 右クリックメニュー ----
  // 右クリックでメニューを表示。メニューが開いている間にもう一度右クリック（素早く2回）すると、
  // 「お気に入り画像を表示」をすぐ切り替える
  var CTX_DOUBLE_MS = 450;
  var ctxMenu = null;
  var ctxOpenedAt = 0;
  var ctxDeleteArmed = false;
  var ctxItems = {};

  function showToast(text, isError) {
    var t = document.createElement('div');
    t.className = 'toast' + (isError ? ' is-error' : '');
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); }, 1400);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1800);
  }

  function deleteCurrentImage() {
    var item = getCurrentItem();
    if (!item) return;
    var favMode = favoriteViewEnabled;
    var endpoint = favMode ? '/favorite/delete' : '/delete_image';
    delete pendingRemoveNames[item.name];
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name })
    })
      .then(function (r) {
        // 404 = すでにファイルが無い。一覧からは外す
        if (!r.ok && r.status !== 404) throw new Error('fail');
        // モードが切り替わっていたら、表示側の一覧は触らない
        if (favMode !== favoriteViewEnabled) return;
        var key = favMode ? 'favorite' : 'normal';
        // 先に表示中の一覧での位置を調べる（imagesList と listCache が同じ配列のことがあり、
        // 先にキャッシュから外すと位置が分からなくなって先頭が選ばれてしまうため）
        var idx = -1;
        for (var i = 0; i < imagesList.length; i++) {
          if (imagesList[i].name === item.name) { idx = i; break; }
        }
        if (idx >= 0) imagesList.splice(idx, 1);
        removeFromListByName(listCache[key], item.name); // 同じ配列なら既に外れているので何もしない
        if (lastViewed[key] === item.name) lastViewed[key] = null;
        // サムネイル一覧は作り直さず、削除した画像のサムネイルだけを取り除く
        var thumb = findThumb(item.name);
        if (thumb) {
          if (thumbObserver) thumbObserver.unobserve(thumb);
          if (thumb._loadTimer) { clearTimeout(thumb._loadTimer); thumb._loadTimer = null; }
          if (thumb.parentNode) thumb.parentNode.removeChild(thumb);
        }
        delete thumbMap[item.name];
        if (imagesList.length === 0) {
          clearDisplay();
        } else {
          // 削除した画像のすぐ右にあった画像（削除後は同じ位置に来る）を選択。右が無ければ左
          selectImage(imagesList[Math.min(idx < 0 ? 0 : idx, imagesList.length - 1)]);
        }
        showToast('画像を削除しました');
      })
      .catch(function () { showToast('削除に失敗しました', true); });
  }

  function setCtxCheck(el, checked) {
    el.classList.toggle('is-checked', !!checked);
    el.setAttribute('aria-checked', checked ? 'true' : 'false');
  }

  function resetDeleteArm() {
    ctxDeleteArmed = false;
    if (ctxItems.del) {
      ctxItems.del.classList.remove('is-armed');
      ctxItems.del.querySelector('.ctx-label').textContent = '画像の削除';
    }
  }

  // 「プロンプトのコピー」項目のラベルを一時的に差し替える（コピー結果の表示用）
  var CTX_COPY_LABEL = 'プロンプトのコピー';
  var ctxCopyTimer = null;

  function resetCopyLabel() {
    clearTimeout(ctxCopyTimer);
    ctxCopyTimer = null;
    if (!ctxItems.copy) return;
    ctxItems.copy.classList.remove('is-ok', 'is-error');
    ctxItems.copy.querySelector('.ctx-label').textContent = CTX_COPY_LABEL;
  }

  function setCopyLabel(text, state) {
    if (!ctxItems.copy) return;
    ctxItems.copy.querySelector('.ctx-label').textContent = text;
    ctxItems.copy.classList.toggle('is-ok', state === 'ok');
    ctxItems.copy.classList.toggle('is-error', state === 'error');
    clearTimeout(ctxCopyTimer);
    ctxCopyTimer = setTimeout(resetCopyLabel, 1500);
  }

  function hideContextMenu() {
    if (!ctxMenu) return;
    ctxMenu.classList.remove('open');
    resetDeleteArm();
    resetCopyLabel();
  }

  function isContextMenuOpen() {
    return !!(ctxMenu && ctxMenu.classList.contains('open'));
  }

  function createCtxItem(key, label, opts) {
    var el = document.createElement('div');
    el.className = 'ctx-item' + (opts && opts.danger ? ' ctx-danger' : '');
    el.setAttribute('role', opts && opts.check ? 'menuitemcheckbox' : 'menuitem');
    var mark = document.createElement('span');
    mark.className = 'ctx-check';
    mark.textContent = opts && opts.check ? '\u2713' : '';
    var text = document.createElement('span');
    text.className = 'ctx-label';
    text.textContent = label;
    el.appendChild(mark);
    el.appendChild(text);
    ctxItems[key] = el;
    return el;
  }

  function buildContextMenu() {
    ctxMenu = document.createElement('div');
    ctxMenu.id = 'ctxMenu';
    ctxMenu.setAttribute('role', 'menu');

    var del = createCtxItem('del', '画像の削除', { danger: true });
    var copy = createCtxItem('copy', 'プロンプトのコピー');
    var fav = createCtxItem('fav', 'お気に入り画像を表示', { check: true });
    var auto = createCtxItem('auto', '新しい画像を自動表示', { check: true });
    var sep = document.createElement('div');
    sep.className = 'ctx-sep';

    ctxMenu.appendChild(del);
    ctxMenu.appendChild(copy);
    ctxMenu.appendChild(sep);
    ctxMenu.appendChild(fav);
    ctxMenu.appendChild(auto);
    document.body.appendChild(ctxMenu);

    // 削除は誤操作防止のため、1回目でラベルが変わり、2回目のクリックで実行する
    del.addEventListener('click', function () {
      if (!ctxDeleteArmed) {
        ctxDeleteArmed = true;
        del.classList.add('is-armed');
        del.querySelector('.ctx-label').textContent = 'もう一度クリックで削除';
        return;
      }
      hideContextMenu();
      deleteCurrentImage();
    });
    // コピー後もメニューは開いたまま。項目のラベルを「コピーしました」に変えて結果を知らせる
    copy.addEventListener('click', function () {
      resetDeleteArm();
      copyCurrentPrompt()
        .then(function () { setCopyLabel('コピーしました', 'ok'); })
        .catch(function (e) {
          var msg = e && e.message;
          setCopyLabel(msg === 'noimage' ? '画像がありません' : msg === 'notfound' ? 'プロンプトがありません' : 'コピーに失敗しました', 'error');
        });
    });
    // チェック項目はメニューを開いたまま、チェック状態だけ更新する
    fav.addEventListener('click', function () {
      resetDeleteArm();
      toggleFavoriteView();
      refreshContextMenuState();
      // 切替先の一覧読み込み後に表示中の画像が決まるため、少し待ってもう一度更新する
      setTimeout(function () { if (isContextMenuOpen()) refreshContextMenuState(); }, 300);
    });
    auto.addEventListener('click', function () {
      resetDeleteArm();
      setAutoSwitch(!autoSwitchEnabled);
      refreshContextMenuState();
    });
  }

  // チェックマークと、画像が無いときの無効表示を現在の状態に合わせる
  function refreshContextMenuState() {
    setCtxCheck(ctxItems.fav, favoriteViewEnabled);
    setCtxCheck(ctxItems.auto, autoSwitchEnabled);
    ctxItems.del.classList.toggle('is-disabled', !currentName);
    ctxItems.copy.classList.toggle('is-disabled', !currentName);
  }

  function showContextMenu(x, y) {
    if (!ctxMenu) buildContextMenu();
    resetDeleteArm();
    resetCopyLabel();
    refreshContextMenuState();

    ctxMenu.classList.add('open');
    // 画面外にはみ出さないよう位置を調整（カーソルから少しずらして表示）
    var mw = ctxMenu.offsetWidth, mh = ctxMenu.offsetHeight;
    var left = x + 2, top = y + 2;
    if (left + mw > window.innerWidth - 4) left = Math.max(4, x - mw - 2);
    if (top + mh > window.innerHeight - 4) top = Math.max(4, y - mh - 2);
    ctxMenu.style.left = left + 'px';
    ctxMenu.style.top = top + 'px';
    ctxOpenedAt = Date.now();
  }

  // メニューは画像画面の右クリックで開く（ナビゲーション矢印は対象外）。
  // メニューが開いている間は画面のどこを右クリックしても対象にして、素早い2回目の右クリックを逃さない
  document.addEventListener('contextmenu', function (e) {
    var inMenu = ctxMenu && ctxMenu.contains(e.target);
    var inViewer = viewer.contains(e.target) && !(e.target.closest && e.target.closest('.nav-arrow'));
    if (isContextMenuOpen()) {
      e.preventDefault();
      if (Date.now() - ctxOpenedAt <= CTX_DOUBLE_MS) {
        // 右クリック2回: すぐお気に入り表示を切り替える
        hideContextMenu();
        toggleFavoriteView();
        ctxOpenedAt = 0;
      } else if (inViewer && !inMenu) {
        showContextMenu(e.clientX, e.clientY); // 開き直す
      } else if (!inMenu) {
        hideContextMenu();
      }
      return;
    }
    if (!inViewer) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
  });

  // メニューの外を左クリック／ホイール／Esc／ウィンドウ操作で閉じる
  document.addEventListener('mousedown', function (e) {
    if (!isContextMenuOpen() || e.button === 2) return;
    if (ctxMenu.contains(e.target)) return;
    hideContextMenu();
  }, true);
  window.addEventListener('wheel', function () { hideContextMenu(); }, { passive: true, capture: true });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideContextMenu();
  });
  window.addEventListener('blur', hideContextMenu);
  window.addEventListener('resize', hideContextMenu);

  // 現在のモード（通常 / お気に入り表示）に応じた一覧取得エンドポイント
  function currentListEndpoint() {
    return favoriteViewEnabled ? '/favorite/images' : '/images';
  }

  var listRequestId = 0;
  var listCache = { normal: null, favorite: null };

  function listSignature(list) {
    return list.map(function (i) {
      return i.name + ':' + i.mtime + ':' + (i.favorite ? 1 : 0);
    }).join('|');
  }

  // 表示中の画像が一覧から消えたとき、元の一覧での位置に最も近い「残っている隣の画像」を返す
  // （まず右隣＝次の画像側、無ければ左隣＝前の画像側）
  function pickNeighborAfterRemoval(oldList, oldIdx, newList) {
    if (oldIdx < 0) return newList[0];
    var alive = {};
    newList.forEach(function (i) { alive[i.name] = i; });
    for (var a = oldIdx + 1; a < oldList.length; a++) {
      if (alive[oldList[a].name]) return alive[oldList[a].name];
    }
    for (var b = oldIdx - 1; b >= 0; b--) {
      if (alive[oldList[b].name]) return alive[oldList[b].name];
    }
    return newList[0];
  }

  // keepCurrent: 表示中の画像を保ったまま一覧だけ更新する（変化が無ければ何もしない）
  // restoreName: selectLatest のとき、先頭の代わりにこの画像があればそれを表示する
  function loadImagesList(selectLatest, keepCurrent, restoreName) {
    var requestId = ++listRequestId;
    var favoriteMode = favoriteViewEnabled;
    return fetch(currentListEndpoint())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        // 取得中にモードが切り替わった/別の読み込みが走った場合は古い結果を捨てる
        if (requestId !== listRequestId || favoriteMode !== favoriteViewEnabled) return;
        var newList = data.images || [];
        listCache[favoriteMode ? 'favorite' : 'normal'] = newList;
        if (keepCurrent && listSignature(newList) === listSignature(imagesList)) return;
        var oldList = imagesList;
        var oldIdx = getCurrentIndex(); // 一覧を差し替える前の、表示中画像の位置
        imagesList = newList;
        renderThumbnails();
        if (keepCurrent) {
          var stillThere = currentName && imagesList.some(function (i) { return i.name === currentName; });
          if (stillThere) {
            updateNavButtons();
            updatePreviewFavorite();
          } else if (imagesList.length > 0) {
            // 表示中の画像が消えていたら、先頭ではなく隣の画像を選択する
            selectImage(pickNeighborAfterRemoval(oldList, oldIdx, imagesList));
          } else {
            clearDisplay();
          }
          return;
        }
        if (selectLatest) {
          if (imagesList.length > 0) {
            selectImage(findItemByName(imagesList, restoreName) || imagesList[0]);
          } else {
            clearDisplay();
          }
        } else {
          updateNavButtons();
          updatePreviewFavorite();
        }
      })
      .catch(function () {

      });
  }

  function waitForUpdate() {
    fetch('/wait')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.updated) {
          if (favoriteViewEnabled) {
            // お気に入り表示中は一覧を差し替えず、新着の通知として光らせるだけにする
            flashGlow();
          } else {
            // トグルがOFFのときは一覧・サムネイルだけ更新し、表示中の画像は切り替えない
            loadImagesList(autoSwitchEnabled).then(flashGlow);
          }
        }
        waitForUpdate();
      })
      .catch(function () {
        setTimeout(waitForUpdate, 2000);
      });
  }

  loadImagesList(true);
  waitForUpdate();
})();