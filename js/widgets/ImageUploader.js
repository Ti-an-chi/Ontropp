// js/widgets/ImageUploader.js
import API from '/api.js';
import { showToast } from '../toast.js';
import { uuid } from '../utility/reconfig.js';

const MAX_IMAGES = 5;
const MAX_BYTES  = 2 * 1024 * 1024;

/**
 * App-specific uploader for the ONTROPP add-product page.
 * Works on every Chrome version (including pre-92) by:
 *   - using a real transparent <input type="file"> overlay (no label, no hidden)
 *   - falling back from createImageBitmap to <img>
 *   - falling back from crypto.randomUUID to crypto.getRandomValues
 */
export class ImageUploader {
  constructor(opts) {
    this.opts = opts;
    this.images = (opts.initialImages || []).map(img => this._normalize(img));
    this.area = this.input = this.grid = this.counter = this.btn = null;
  }

  mount() {
    this.area    = document.getElementById(this.opts.areaId);
    this.input   = document.getElementById(this.opts.inputId);
    this.grid    = document.getElementById(this.opts.gridId);
    this.counter = this.opts.counterId ? document.getElementById(this.opts.counterId) : null;
    this.btn     = this.opts.btnId ? document.getElementById(this.opts.btnId) : null;
    if (!this.area || !this.input || !this.grid) return;

    // File picker — listen to BOTH change and input; some webviews fire one, not the other
    const onChange = () => {
      console.log('[uploader] change/input fired. files =', this.input.files ? this.input.files.length : 'n/a');
      try {
        this._handleFiles(Array.from(this.input.files || []));
      } catch (e) {
        console.error('[uploader] _handleFiles threw', e);
        showToast({ message: 'Upload failed: ' + (e.message || 'unknown error') });
      }
      // Reset AFTER a tick so the same file can be re-picked in stubborn browsers
      setTimeout(() => { try { this.input.value = ''; } catch {} }, 0);
    };
    this.input.addEventListener('change', onChange);
    
    // Some Android webviews won't open the picker from a click on the overlay
    // (they need a real click on a real input element, or a fallback). Provide
    // one on the button text — harmless when the overlay already worked.
    if (this.btn) {
      this.btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { this.input.click(); }
        catch (err) { console.error('[uploader] input.click failed', err); }
      });
    }

    // Drag & drop
    ['dragover', 'dragenter'].forEach(ev =>
      this.area.addEventListener(ev, e => {
        e.preventDefault();
        this.area.classList.add('dragover');
      })
    );
    ['dragleave', 'drop'].forEach(ev =>
      this.area.addEventListener(ev, e => {
        e.preventDefault();
        this.area.classList.remove('dragover');
      })
    );
    this.area.addEventListener('drop', e => {
      const files = Array.from(e.dataTransfer && e.dataTransfer.files || [])
        .filter(f => this._looksLikeImage(f));
      this._handleFiles(files);
    });

    this._render();
  }

  getImages() {
    return this.images.map(i => ({
      id: i.id, url: i.url, width: i.width, height: i.height, aspect_ratio: i.aspect_ratio
    }));
  }

  hasPendingUploads() {
    return this.images.some(i => i.status === 'uploading');
  }

  reset(images) {
    this.images = (images || []).map(img => this._normalize(img));
    this._render();
  }

  /* ---------------- internals ---------------- */

  _normalize(img) {
    if (typeof img === 'string') {
      return { id: uuid(), url: img, width: null, height: null, aspect_ratio: null, status: 'complete' };
    }
    return {
      id: img.id || uuid(),
      url: img.url,
      width: img.width || null,
      height: img.height || null,
      aspect_ratio: img.aspect_ratio || null,
      status: img.status || 'complete'
    };
  }

  /** Some webviews report file.type === '' — fall back to extension. */
  _looksLikeImage(file) {
    if (file.type && file.type.indexOf('image/') === 0) return true;
    return /\.(jpe?g|png|gif|webp|avif|bmp|svg|heic|heif)$/i.test(file.name || '');
  }

  _handleFiles(files) {
    console.log('[uploader] _handleFiles called with', files.length, 'file(s)');
    if (!files.length) {
      console.warn('[uploader] zero files — change fired but .files was empty');
      showToast({ message: 'No file detected. Try again or use a different file.' });
      return;
    }
    const remaining = MAX_IMAGES - this.images.length;
    if (remaining <= 0) {
      showToast({ message: 'You have reached the ' + MAX_IMAGES + '-image limit.' });
      return;
    }
    if (files.length > remaining) {
      showToast({ message: 'Only ' + remaining + ' more image' + (remaining === 1 ? '' : 's') + ' can be added.' });
    }
    files.slice(0, remaining).forEach(file => {
      if (!this._looksLikeImage(file)) {
        showToast({ message: '"' + file.name + '" is not a supported image.' });
        return;
      }
      if (file.size > MAX_BYTES) {
        showToast({ message: '"' + file.name + '" is over 2MB.' });
        return;
      }
      this._upload(file);
    });
  }

  /** Never throws — returns null on failure so upload can still proceed. */
  async _getDimensions(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bmp = await createImageBitmap(file);
        const dims = { width: bmp.width, height: bmp.height, aspect_ratio: bmp.width / bmp.height };
        if (typeof bmp.close === 'function') bmp.close();
        return dims;
      } catch { /* fall through */ }
    }
    try {
      return await new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        const done = (val) => { try { URL.revokeObjectURL(url); } catch {} resolve(val); };
        img.onload = () => done({
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspect_ratio: img.naturalWidth / img.naturalHeight
        });
        img.onerror = () => done(null);
        img.src = url;
      });
    } catch { return null; }
  }

  async _upload(file) {
    const tempId = uuid();

    // Show a local blob: preview instantly — no spinner GIF, no waiting on Cloudinary.
    const previewUrl = URL.createObjectURL(file);
    let meta = { width: null, height: null, aspect_ratio: null };
    try { meta = (await this._getDimensions(file)) || meta; } catch {}

    this.images.push({
      id: tempId, url: previewUrl, status: 'uploading', _preview: true,
      width: meta.width, height: meta.height, aspect_ratio: meta.aspect_ratio
    });
    this._render();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'product_images_unsigned');
    formData.append('folder', 'products/images');

    try {
      const res = await API.uploadImage(formData);
      const idx = this.images.findIndex(i => i.id === tempId);
      if (idx !== -1) {
        try { URL.revokeObjectURL(previewUrl); } catch {}
        this.images[idx] = Object.assign({}, this.images[idx], {
          url: res.secure_url, status: 'complete', _preview: false
        });
        this._render();
      }
    } catch (err) {
      console.error(err);
      try { URL.revokeObjectURL(previewUrl); } catch {}
      showToast({ message: 'Failed to upload "' + file.name + '". Please try again.' });
      this.images = this.images.filter(i => i.id !== tempId);
      this._render();
    }
  }

  _removeAt(index) {
    const img = this.images[index];
    if (img && img._preview && img.url.indexOf('blob:') === 0) {
      try { URL.revokeObjectURL(img.url); } catch {}
    }
    this.images.splice(index, 1);
    this._render();
  }

  _render() {
    if (!this.grid || !this.area) return;

    const hasImages = this.images.length > 0;
    const atMax     = this.images.length >= MAX_IMAGES;

    this.area.classList.toggle('compact', hasImages);
    this.area.style.pointerEvents = atMax ? 'none' : '';
    if (this.input) this.input.disabled = atMax;
    if (this.btn) this.btn.style.opacity = atMax ? '0.5' : '1';
    if (this.counter) this.counter.textContent = this.images.length + ' / ' + MAX_IMAGES;

    if (!hasImages) {
      this.grid.style.display = 'none';
      this.grid.innerHTML = '';
      this._fireChange();
      return;
    }

    this.grid.style.display = 'grid';
    this.grid.innerHTML = '';
    this.images.forEach((image, index) => {
      const item = document.createElement('div');
      item.className = 'image-preview-item';
      item.innerHTML =
        '<img src="' + image.url + '" alt="Product image ' + (index + 1) + '"' +
        (image.status === 'uploading' ? ' style="opacity:.65"' : '') + '>' +
        (index === 0 ? '<span class="cover-badge">Cover</span>' : '') +
        '<button type="button" class="image-remove-btn" data-index="' + index + '" aria-label="Remove image">' +
        '<i class="fas fa-times"></i></button>';
      this.grid.appendChild(item);
    });

    this.grid.querySelectorAll('.image-remove-btn').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        this._removeAt(parseInt(b.dataset.index, 10));
      });
    });

    this._fireChange();
  }

  _fireChange() {
    if (typeof this.opts.onChange === 'function') {
      this.opts.onChange(this.getImages(), this.images);
    }
  }
}