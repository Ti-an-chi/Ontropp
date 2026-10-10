/**
 * avatar.js
 * Avatar StateView + upload pipeline, isolated.
 *
 * Owns:
 *   - the loading / data / empty / error StateView
 *   - image decode detection (don't show 'data' until img decodes)
 *   - the file pick → validate → upload → persist → commit flow
 *   - retry semantics (resume from Stage 2 if Stage 1 succeeded)
 *
 * Does NOT own:
 *   - where the url is stored (caller commits via onSaved)
 *   - the actual API calls (injected as onUploadToCloud / onSaveUrl)
 *
 * Usage:
 *   const avatar = createAvatarController({
 *     containerEl, imgEl, inputEl, retryEl, triggerEls,
 *     uploadPreset, uploadFolder,
 *     onUploadToCloud: (fd) => API.uploadImage(fd),
 *     onSaveUrl:       (url) => API.updateProfile({ avatar_url: url }),
 *   });
 *   avatar.show(user.avatar_url);
 */

import StateView from '../uiTools/stateView.js';

export function createAvatarController({
  containerEl,
  imgEl,
  inputEl,
  retryEl,
  triggerEls = [],
  maxBytes = 2 * 1024 * 1024,
  uploadPreset,
  uploadFolder,
  onUploadToCloud,
  onSaveUrl,
} = {}) {
  if (!containerEl || !imgEl) {
    console.warn('createAvatarController: missing containerEl or imgEl');
    return null;
  }

  const stateView = new StateView(containerEl, {
    selectors: {
      loading: '[data-state="loading"]',
      data:    '[data-state="data"]',
      empty:   '[data-state="empty"]',
      error:   '[data-state="error"]',
    },
    displays: { loading: 'flex', data: 'flex', empty: 'flex', error: 'flex' },
  });

  // In-flight upload. { file, uploadedUrl }.
  // file present, url null → Stage 1 not done.
  // file present, url set  → Stage 1 done, Stage 2 (save) pending.
  let pending = null;
  let currentUrl = '';

  function show(url) {
    currentUrl = url || '';
    if (!currentUrl) { stateView.show('empty'); return; }

    const onLoad = () => {
      imgEl.removeEventListener('load', onLoad);
      stateView.show('data');
    };
    imgEl.addEventListener('load', onLoad, { once: true });
    imgEl.src = currentUrl;

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      imgEl.removeEventListener('load', onLoad);
      stateView.show('data');
    }
  }

  // Broken image → error, unless we're mid-upload (then the pipeline owns the state).
  imgEl.addEventListener('error', () => {
    if (!pending) stateView.show('error');
  });

  // Open the picker from any trigger.
  triggerEls.forEach(el => el?.addEventListener('click', () => inputEl?.click()));

  inputEl?.addEventListener('change', function () {
    const file = this.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, etc.)');
      this.value = ''; return;
    }
    if (file.size > maxBytes) {
      alert(`Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB`);
      this.value = ''; return;
    }

    pending = { file, uploadedUrl: null };
    runUpload();
    this.value = '';
  });

  retryEl?.addEventListener('click', () => { if (pending) runUpload(); });

  async function runUpload() {
    if (!pending) return;
    if (!pending.file && !pending.uploadedUrl) {
      pending = null;
      show(currentUrl);
      return;
    }

    const previousSrc = imgEl.src || currentUrl;
    const previousState = containerEl.dataset.state || 'empty';

    stateView.show('loading');

    try {
      // Stage 1 — upload to the CDN. Skipped on retry if already done.
      if (!pending.uploadedUrl) {
        const fd = new FormData();
        fd.append('file', pending.file);
        if (uploadPreset) fd.append('upload_preset', uploadPreset);
        if (uploadFolder) fd.append('folder', uploadFolder);

        const resp = await onUploadToCloud(fd);
        pending.uploadedUrl = resp.secure_url;
        imgEl.src = pending.uploadedUrl; // optimistic preview
      }

      // Stage 2 — persist the URL on the profile.
      await onSaveUrl(pending.uploadedUrl);

      currentUrl = pending.uploadedUrl;
      pending = null;
      stateView.show('data');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      imgEl.src = previousSrc;

      if (!pending?.uploadedUrl) {
        // Stage 1 failed. Nothing to retry against. Restore, no error banner.
        pending = null;
        stateView.show(previousState === 'loading' ? 'empty' : previousState);
        return;
      }
      // Stage 1 succeeded, Stage 2 failed. Error + retry resumes at Stage 2.
      stateView.show('error');
    }
  }

  return {
    show,
    openPicker: () => inputEl?.click(),
  };
}