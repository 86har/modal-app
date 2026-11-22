(function () {
  var viewer = document.getElementById('viewer');
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
  var sidebarPreviewWrap = document.getElementById('sidebarPreviewWrap');
  var sidebarPreviewImg = document.getElementById('sidebarPreviewImg');
  var sidebarFilename = document.getElementById('sidebarFilename');
  var infoRes = document.getElementById('infoRes');
  var infoSize = document.getElementById('infoSize');
  var infoDate = document.getElementById('infoDate');
  var copyPromptBtn = document.getElementById('copyPromptBtn');
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
  if (autoSwitchToggle) {
    autoSwitchToggle.addEventListener('change', function () {
      autoSwitchEnabled = autoSwitchToggle.checked;
      try {
        localStorage.setItem(AUTO_SWITCH_STORAGE_KEY, autoSwitchEnabled ? '1' : '0');
      } catch (e) {}
    });
  }

  // お気に入りフォルダの中身を表示するモードかどうか（設定は端末に保存）
  var FAVORITE_VIEW_STORAGE_KEY = 'showFavoriteFolder';
  var favoriteViewEnabled = false;
  (function initFavoriteView() {
    try {
      var saved = localStorage.getItem(FAVORITE_VIEW_STORAGE_KEY);
      if (saved !== null) favoriteViewEnabled = saved === '1';
    } catch (e) {}
    if (favoriteViewToggle) favoriteViewToggle.checked = favoriteViewEnabled;
  })();
  if (favoriteViewToggle) {
    favoriteViewToggle.addEventListener('change', function () {
      favoriteViewEnabled = favoriteViewToggle.checked;
      try {
        localStorage.setItem(FAVORITE_VIEW_STORAGE_KEY, favoriteViewEnabled ? '1' : '0');
      } catch (e) {}
      // 表示対象のフォルダが切り替わるので、旧モードの画像・一覧を捨てて
      // 切替先フォルダの一覧を読み直し、先頭（= 一番新しい画像）を表示する
      currentName = null;
      imagesList = [];
      updatePreviewFavorite();
      loadImagesList(true);
    });
  }

  // ---- お気に入り画像の保存先フォルダ ----
  var favoriteFolderBtn = document.getElementById('favoriteFolderBtn');
  var favoriteFolderPath = document.getElementById('favoriteFolderPath');
  var favoritingInProgress = false;

  function renderFavoriteFolder(folder) {
    if (!favoriteFolderPath) return;
    favoriteFolderPath.textContent = folder || '未設定';
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
          // 保存先を変更したら一覧を読み直す（お気に入り表示中は先頭へ、通常時は表示中の画像を維持）
          loadImagesList(favoriteViewEnabled);
        })
        .catch(function () {})
        .then(function () { favoriteFolderBtn.disabled = false; });
    });
  }

  function getCurrentItem() {
    var idx = getCurrentIndex();
    return idx < 0 ? null : imagesList[idx];
  }

  // 表示中の画像がお気に入りなら、プレビュー枠を薄ピンクにする
  function updatePreviewFavorite() {
    if (!sidebarPreviewWrap) return;
    var item = getCurrentItem();
    sidebarPreviewWrap.classList.toggle('is-favorite', !!(item && (favoriteViewEnabled || item.favorite)));
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

  // お気に入り済み（またはお気に入り表示中）なら解除＋削除、そうでなければ保存
  function toggleCurrentFavorite() {
    if (!currentName || favoritingInProgress) return;
    var item = getCurrentItem();
    if (!item) return;
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
  viewer.addEventListener('wheel', handleWheelNavigate, { passive: false });
  if (thumbStrip) {
    thumbStrip.addEventListener('wheel', handleWheelNavigate, { passive: false });
  }
  if (sidebarPreviewWrap) {
    sidebarPreviewWrap.addEventListener('wheel', handleWheelNavigate, { passive: false });
  }

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
  }

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
  window.addEventListener('resize', function () {
    resetView();
  });

  window.addEventListener('keydown', function (e) {
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.key === 'Control') {
      ctrlHeld = true;
      updateCursorClass();
    }
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.key === 'Control') {
      ctrlHeld = false;
      updateCursorClass();
    }
  });
  window.addEventListener('blur', function () {
    ctrlHeld = false;
    updateCursorClass();
  });

  viewer.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    if (e.target && e.target.closest && e.target.closest('.nav-arrow')) return;

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

  function stepImage(delta) {
    var idx = getCurrentIndex();
    if (idx < 0) return;
    var targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= imagesList.length) return;
    selectImage(imagesList[targetIdx]);
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

  function imageUrl(name) {
    return mediaUrl(name, Date.now());
  }

  function renderThumbnails() {
    thumbStrip.innerHTML = '';
    imagesList.forEach(function (item) {
      var thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.draggable = false;
      thumb.src = mediaUrl(item.name, item.mtime);
      thumb.alt = item.name;
      thumb.title = item.name;
      if (item.name === currentName) {
        thumb.classList.add('active');
      }
      thumb.addEventListener('click', function () {
        if (suppressThumbClick) return;
        selectImage(item);
      });
      thumb.addEventListener('error', function () {
        thumb.classList.add('img-broken');
      });
      thumbStrip.appendChild(thumb);
    });
  }

  function selectImage(item) {
    currentName = item.name;
    img.src = imageUrl(item.name);

    sidebarFilename.textContent = item.name;
    infoSize.textContent = formatBytes(item.size);
    infoDate.textContent = formatDate(item.mtime);

    var thumbs = thumbStrip.querySelectorAll('.thumb');
    for (var i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.toggle('active', thumbs[i].alt === item.name);
    }
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

  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', function () {
      if (!currentName) {
        setCopyBtnState('画像がありません', 'error');
        return;
      }
      fetch('/prompt/' + encodeURIComponent(currentName), { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('notfound');
          return r.json();
        })
        .then(function (data) {
          // 保存済みJSONに \r\n が混ざっていても \n に統一してコピーする
          return copyText(data.prompt.replace(/\r\n?/g, '\n'));
        })
        .then(function () { setCopyBtnState('コピーしました', 'ok'); })
        .catch(function (e) {
          setCopyBtnState(e && e.message === 'notfound' ? 'プロンプトがありません' : 'コピーに失敗しました', 'error');
        });
    });
  }

  // 現在のモード（通常 / お気に入り表示）に応じた一覧取得エンドポイント
  function currentListEndpoint() {
    return favoriteViewEnabled ? '/favorite/images' : '/images';
  }

  var listRequestId = 0;

  function loadImagesList(selectLatest) {
    var requestId = ++listRequestId;
    var favoriteMode = favoriteViewEnabled;
    return fetch(currentListEndpoint())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        // 取得中にモードが切り替わった/別の読み込みが走った場合は古い結果を捨てる
        if (requestId !== listRequestId || favoriteMode !== favoriteViewEnabled) return;
        imagesList = data.images || [];
        renderThumbnails();
        if (selectLatest) {
          if (imagesList.length > 0) {
            selectImage(imagesList[0]);
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