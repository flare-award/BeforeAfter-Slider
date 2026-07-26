(() => {
  'use strict';

  const state = {
    before: null,
    after: null,
    position: 50,
    wasComparisonVisible: false,
  };

  const sides = ['before', 'after'];
  const loadRequests = { before: 0, after: 0 };
  const cards = Object.fromEntries(
    sides.map((side) => [side, document.querySelector(`[data-side="${side}"]`)])
  );
  const inputs = {
    before: document.querySelector('#before-input'),
    after: document.querySelector('#after-input'),
  };

  const comparisonSection = document.querySelector('#comparison-section');
  const compareShell = document.querySelector('#compare-shell');
  const compareStage = document.querySelector('#compare-stage');
  const divider = document.querySelector('#divider');
  const positionOutput = document.querySelector('#position-output');
  const clearAllButton = document.querySelector('#clear-all');
  const fullscreenButton = document.querySelector('#fullscreen-button');

  const beforeImage = document.querySelector('#before-image');
  const afterImage = document.querySelector('#after-image');
  const beforeLegend = document.querySelector('#before-legend-name');
  const afterLegend = document.querySelector('#after-legend-name');

  const sideLabels = {
    before: 'Фото слева',
    after: 'Фото справа',
  };

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;
  }

  function truncateFileName(name, maxLength = 46) {
    if (name.length <= maxLength) return name;
    const dotIndex = name.lastIndexOf('.');
    const extension = dotIndex > -1 ? name.slice(dotIndex) : '';
    return `${name.slice(0, maxLength - extension.length - 1)}…${extension}`;
  }

  function showError(side, message) {
    const error = cards[side].querySelector('.file-error');
    error.textContent = message;
    error.hidden = false;
  }

  function clearError(side) {
    const error = cards[side].querySelector('.file-error');
    error.textContent = '';
    error.hidden = true;
  }

  function isImageFile(file) {
    return file && (file.type.startsWith('image/') || /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i.test(file.name));
  }

  function testImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = reject;
      image.src = url;
    });
  }

  async function loadFile(side, file) {
    const requestId = ++loadRequests[side];
    const card = cards[side];
    const status = card.querySelector('.card-status');
    clearError(side);
    card.classList.remove('is-loading');
    status.textContent = state[side] ? 'Готово' : 'Не выбрано';

    if (!isImageFile(file)) {
      showError(side, 'Этот файл не похож на изображение. Выберите JPG, PNG, WEBP или другой формат фото.');
      inputs[side].value = '';
      return;
    }

    card.classList.add('is-loading');
    status.textContent = 'Открываем…';
    const url = URL.createObjectURL(file);

    try {
      const dimensions = await testImage(url);

      // A newer selection may finish loading first. Ignore this outdated one.
      if (requestId !== loadRequests[side]) {
        URL.revokeObjectURL(url);
        return;
      }

      const previous = state[side];
      state[side] = { file, url, ...dimensions };
      if (previous) URL.revokeObjectURL(previous.url);
      render();
    } catch {
      URL.revokeObjectURL(url);
      if (requestId === loadRequests[side]) {
        showError(side, 'Браузер не смог открыть это изображение. Попробуйте сохранить его в JPG, PNG или WEBP.');
      }
    } finally {
      if (requestId === loadRequests[side]) {
        card.classList.remove('is-loading');
        status.textContent = state[side] ? 'Готово' : 'Не выбрано';
        inputs[side].value = '';
      }
    }
  }

  function removeFile(side) {
    loadRequests[side] += 1;
    cards[side].classList.remove('is-loading');
    if (state[side]) URL.revokeObjectURL(state[side].url);
    state[side] = null;
    inputs[side].value = '';
    clearError(side);
    render();
  }

  function updateCard(side) {
    const card = cards[side];
    const data = state[side];
    const emptyState = card.querySelector('.empty-state');
    const loadedState = card.querySelector('.loaded-state');
    const removeButton = card.querySelector('.remove-photo');
    const status = card.querySelector('.card-status');

    card.classList.toggle('is-loaded', Boolean(data));
    emptyState.hidden = Boolean(data);
    loadedState.hidden = !data;
    removeButton.hidden = !data;
    status.textContent = data ? 'Готово' : 'Не выбрано';

    if (data) {
      const thumbnail = card.querySelector('.card-thumbnail');
      thumbnail.src = data.url;
      card.querySelector('.file-name').textContent = truncateFileName(data.file.name);
      card.querySelector('.file-name').title = data.file.name;
      card.querySelector('.file-meta').textContent = `${data.width} × ${data.height} · ${formatFileSize(data.file.size)}`;
      card.querySelector('.dropzone').setAttribute('aria-label', `Заменить ${sideLabels[side].toLowerCase()}: ${data.file.name}`);
    } else {
      card.querySelector('.card-thumbnail').removeAttribute('src');
      card.querySelector('.dropzone').setAttribute('aria-label', `Загрузить ${sideLabels[side].toLowerCase()}`);
    }
  }

  function renderComparison() {
    const isReady = Boolean(state.before && state.after);
    comparisonSection.hidden = !isReady;
    clearAllButton.hidden = !state.before && !state.after;

    if (!isReady) {
      state.wasComparisonVisible = false;
      return;
    }

    beforeImage.src = state.before.url;
    afterImage.src = state.after.url;
    beforeLegend.textContent = state.before.file.name;
    afterLegend.textContent = state.after.file.name;

    updatePosition(state.position);

    if (!state.wasComparisonVisible) {
      state.wasComparisonVisible = true;
      window.setTimeout(() => {
        comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 180);
    }
  }

  function render() {
    sides.forEach(updateCard);
    renderComparison();
  }

  function updatePosition(nextPosition) {
    state.position = Math.max(0, Math.min(100, Number(nextPosition)));
    const rounded = Math.round(state.position);
    compareStage.style.setProperty('--position', `${state.position}%`);
    divider.setAttribute('aria-valuenow', String(rounded));
    divider.setAttribute('aria-valuetext', `Показано ${rounded} процентов фото До`);
    positionOutput.textContent = `${rounded} / ${100 - rounded}`;
  }

  function positionFromPointer(event) {
    const bounds = compareStage.getBoundingClientRect();
    return ((event.clientX - bounds.left) / bounds.width) * 100;
  }

  let activePointerId = null;

  compareStage.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    activePointerId = event.pointerId;
    compareStage.setPointerCapture?.(event.pointerId);
    compareStage.classList.add('is-dragging');
    updatePosition(positionFromPointer(event));
    event.preventDefault();
  });

  compareStage.addEventListener('pointermove', (event) => {
    if (activePointerId !== event.pointerId) return;
    updatePosition(positionFromPointer(event));
  });

  function endPointer(event) {
    if (activePointerId !== event.pointerId) return;
    if (compareStage.hasPointerCapture?.(event.pointerId)) {
      compareStage.releasePointerCapture(event.pointerId);
    }
    activePointerId = null;
    compareStage.classList.remove('is-dragging');
  }

  compareStage.addEventListener('pointerup', endPointer);
  compareStage.addEventListener('pointercancel', endPointer);

  divider.addEventListener('keydown', (event) => {
    const keyActions = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -10,
      PageUp: 10,
    };

    if (event.key in keyActions) {
      const multiplier = event.shiftKey ? 5 : 1;
      updatePosition(state.position + keyActions[event.key] * multiplier);
      event.preventDefault();
    } else if (event.key === 'Home') {
      updatePosition(0);
      event.preventDefault();
    } else if (event.key === 'End') {
      updatePosition(100);
      event.preventDefault();
    }
  });

  sides.forEach((side) => {
    const card = cards[side];
    const dropzone = card.querySelector('.dropzone');
    const removeButton = card.querySelector('.remove-photo');

    dropzone.addEventListener('click', () => inputs[side].click());
    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        inputs[side].click();
      }
    });

    inputs[side].addEventListener('change', () => {
      const [file] = inputs[side].files;
      if (file) loadFile(side, file);
    });

    removeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      removeFile(side);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      card.addEventListener(eventName, (event) => {
        event.preventDefault();
        card.classList.add('is-dragging');
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      });
    });

    ['dragleave', 'dragend'].forEach((eventName) => {
      card.addEventListener(eventName, (event) => {
        if (eventName === 'dragleave' && card.contains(event.relatedTarget)) return;
        card.classList.remove('is-dragging');
      });
    });

    card.addEventListener('drop', (event) => {
      event.preventDefault();
      card.classList.remove('is-dragging');
      const [file] = event.dataTransfer?.files || [];
      if (file) loadFile(side, file);
    });
  });

  clearAllButton.addEventListener('click', () => {
    sides.forEach((side) => {
      loadRequests[side] += 1;
      cards[side].classList.remove('is-loading');
      if (state[side]) URL.revokeObjectURL(state[side].url);
      state[side] = null;
      inputs[side].value = '';
      clearError(side);
    });
    state.position = 50;
    render();
  });

  document.querySelector('#reset-slider').addEventListener('click', () => updatePosition(50));

  document.querySelector('#swap-images').addEventListener('click', () => {
    [state.before, state.after] = [state.after, state.before];
    state.position = 100 - state.position;
    render();
  });

  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (compareShell.requestFullscreen) {
        await compareShell.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by browser settings; the comparison remains usable.
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = document.fullscreenElement === compareShell;
    fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран');
    fullscreenButton.title = isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран';
  });

  window.addEventListener('beforeunload', () => {
    sides.forEach((side) => {
      if (state[side]) URL.revokeObjectURL(state[side].url);
    });
  });

  render();
})();
