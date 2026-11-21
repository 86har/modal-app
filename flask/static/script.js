(function () {
  var viewer = document.getElementById('viewer');
  var img = document.getElementById('img');
  var selectionBox = document.getElementById('selection');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var glow = document.createElement('div');
  glow.id = 'glow';
  document.body.appendChild(glow);

  function flashGlow() {
    if (glow.classList.contains('active')) return;
    glow.classList.add('active');
  }
  glow.addEventListener('animationend', function () {
    glow.classList.remove('active');
  });

  var thumbStrip = document.getElementById('thumbStrip');
  var sidebarPreviewImg = document.getElementById('sidebarPreviewImg');
  var sidebarFilename = document.getElementById('sidebarFilename');
  var infoRes = document.getElementById('infoRes');
  var infoSize = document.getElementById('infoSize');
  var infoDate = document.getElementById('infoDate');

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
    resetView();
    infoRes.textContent = img.naturalWidth + ' × ' + img.naturalHeight;
    sidebarPreviewImg.src = img.src;
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

  viewer.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    var newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    var local = screenToLocal(e.clientX, e.clientY);
    tx = e.clientX - baseLeft - newScale * local.x;
    ty = e.clientY - baseTop - newScale * local.y;
    scale = newScale;
    applyTransform();
  }, { passive: false });

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

  function imageUrl(name) {
    return '/image/' + encodeURIComponent(name) + '?t=' + Date.now();
  }

  function renderThumbnails() {
    thumbStrip.innerHTML = '';
    imagesList.forEach(function (item) {
      var thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.draggable = false;
      thumb.src = '/image/' + encodeURIComponent(item.name) + '?t=' + item.mtime;
      thumb.alt = item.name;
      thumb.title = item.name;
      if (item.name === currentName) {
        thumb.classList.add('active');
      }
      thumb.addEventListener('click', function () {
        if (suppressThumbClick) return;
        selectImage(item);
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
  }

  function loadImagesList(selectLatest) {
    return fetch('/images')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        imagesList = data.images || [];
        renderThumbnails();
        if (selectLatest && imagesList.length > 0) {
          selectImage(imagesList[0]);
        } else {
          updateNavButtons();
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
          loadImagesList(true).then(flashGlow);
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