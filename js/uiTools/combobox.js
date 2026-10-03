/* ============================================================
   /js/utility/combobox.js
   Lightweight searchable dropdown (no dependencies).

   Usage:
     const cb = new Combobox({
       inputEl:    document.getElementById('stateInput'),
       menuEl:     document.getElementById('stateMenu'),
       hiddenEl:   document.getElementById('selectedState'),
       statusEl:   document.getElementById('stateStatus'),
       source:     [{ id: 'NG001', name: 'Abia' }, ...],   // or async fn
       // async:   async (query) => [{id, name}, ...]
       placeholder:'Start typing your state…',
       minChars:   0,           // 0 = show all on focus
       maxResults: 50,
       allowEmpty: true,        // show all when input is empty
       onChange:   (picked) => { ... }   // picked = { value, label } | null
     });
   ============================================================ */

export class Combobox {
  constructor(options) {
    const {
      inputEl,
      menuEl,
      hiddenEl,
      statusEl = null,
      source,
      minChars = 0,
      maxResults = 50,
      allowEmpty = true,
      placeholder = '',
      debounceMs = 250,
      onChange = null,
      emptyText = 'No matches found',
      caseSensitive = false,
    } = options;

    if (!inputEl || !menuEl) {
      throw new Error('Combobox: inputEl and menuEl are required');
    }

    this.inputEl = inputEl;
    this.menuEl = menuEl;
    this.hiddenEl = hiddenEl || null;
    this.statusEl = statusEl || null;
    this.source = source;
    this.minChars = minChars;
    this.maxResults = maxResults;
    this.allowEmpty = allowEmpty;
    this.debounceMs = debounceMs;
    this.onChange = onChange;
    this.emptyText = emptyText;
    this.caseSensitive = caseSensitive;

    // Internal state
    this.items = [];            // normalized [{ id, name }]
    this.filtered = [];         // currently shown
    this.highlightedIndex = -1;
    this.isOpen = false;
    this.isLoading = false;
    this.selected = null;       // { value, label }
    this.lastQuery = '';
    this.debounceTimer = null;
    this.asyncMode = typeof source === 'function';

    if (placeholder) this.inputEl.placeholder = placeholder;

    this._bind();
  }

  /* -------------------------------------------------------- */
  /* Public API                                                */
  /* -------------------------------------------------------- */

  /** Set a value programmatically (e.g. from API prefill). */
  setValue(value, label) {
    this.selected = value ? { value, label } : null;
    this.inputEl.value = label || '';
    if (this.hiddenEl) this.hiddenEl.value = value || '';
    this._setStatus(value ? 'valid' : 'idle');
    this.close();
  }

  /** Clear everything. */
  clear() {
    this.selected = null;
    this.inputEl.value = '';
    if (this.hiddenEl) this.hiddenEl.value = '';
    this._setStatus('idle');
    this.close();
  }

  /** Enable / disable the input. */
  setDisabled(disabled) {
    this.inputEl.disabled = !!disabled;
    if (disabled) this.close();
  }

  /** Replace the source (useful for cascading dropdowns). */
  setSource(source) {
    this.asyncMode = typeof source === 'function';
    this.source = source;
    this.items = [];
    this.filtered = [];
  }

  /** Get current selection. */
  getValue() {
    return this.selected ? this.selected.value : null;
  }

  getLabel() {
    return this.selected ? this.selected.label : '';
  }

  /* -------------------------------------------------------- */
  /* Private                                                   */
  /* -------------------------------------------------------- */

  _bind() {
    this.inputEl.addEventListener('focus', this._onFocus);
    this.inputEl.addEventListener('input', this._onInput);
    this.inputEl.addEventListener('keydown', this._onKeyDown);
    this.inputEl.addEventListener('blur', this._onBlur);

    // Click outside → close
    document.addEventListener('mousedown', this._onDocumentMouseDown);
  }

  /** Remove all listeners (call if you destroy the instance). */
  destroy() {
    this.inputEl.removeEventListener('focus', this._onFocus);
    this.inputEl.removeEventListener('input', this._onInput);
    this.inputEl.removeEventListener('keydown', this._onKeyDown);
    this.inputEl.removeEventListener('blur', this._onBlur);
    document.removeEventListener('mousedown', this._onDocumentMouseDown);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  _onDocumentMouseDown = (e) => {
    if (
      !this.inputEl.contains(e.target) &&
      !this.menuEl.contains(e.target)
    ) {
      this.close();
    }
  };

  _onFocus = async () => {
    if (this.inputEl.disabled) return;
    // If something is already selected, don't reopen automatically
    if (this.selected && this.inputEl.value === this.selected.label) {
      this.inputEl.select();
      return;
    }
    // Otherwise open with all (or filtered) options
    await this._refresh(this.inputEl.value);
    this.open();
  };

  _onInput = () => {
    const query = this.inputEl.value.trim();

    // Any keystroke invalidates the previous explicit pick until re-picked
    if (this.selected && query !== this.selected.label) {
      this.selected = null;
      if (this.hiddenEl) this.hiddenEl.value = '';
      this._setStatus('idle');
      if (this.onChange) this.onChange(null);
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this._refresh(query).then(() => this.open());
    }, this.debounceMs);
  };

  _onKeyDown = (e) => {
    if (!this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      this.open();
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._moveHighlight(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._moveHighlight(-1);
        break;
      case 'Enter':
        e.preventDefault();
        if (
          this.isOpen &&
          this.highlightedIndex >= 0 &&
          this.filtered[this.highlightedIndex]
        ) {
          this._pick(this.filtered[this.highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        this.inputEl.blur();
        break;
      case 'Tab':
        // Allow tab to move on, but if a valid highlighted item exists, pick it
        if (this.isOpen && this.highlightedIndex >= 0) {
          this._pick(this.filtered[this.highlightedIndex]);
        }
        this.close();
        break;
    }
  };

  _onBlur = () => {
    // Small delay so click on menu item fires first
    setTimeout(() => {
      if (document.activeElement && this.menuEl.contains(document.activeElement)) return;
      this.close();

      // Reconcile input value with selection
      if (this.selected) {
        // If user typed something else and didn't pick, revert
        if (this.inputEl.value !== this.selected.label) {
          this.inputEl.value = this.selected.label;
        }
      } else {
        // No selection → clear freetext (freestyle blocked)
        if (this.inputEl.value.trim()) {
          this.inputEl.value = '';
        }
      }
    }, 120);
  };

  async _refresh(query) {
    const q = this.caseSensitive ? query : query.toLowerCase();

    // Pull items (async or cached)
    if (this.asyncMode) {
      if (q.length < this.minChars) {
        this.items = this.allowEmpty ? await this.source('') : [];
      } else {
        this.isLoading = true;
        this._setStatus('checking');
        try {
          this.items = await this.source(query);
        } catch (err) {
          console.error('Combobox source error:', err);
          this.items = [];
        }
        this.isLoading = false;
      }
    } else if (!this.items.length && Array.isArray(this.source)) {
      this.items = this.source.slice();
    }

    // Filter
    let filtered = this.items;
    if (q.length >= this.minChars && q.length > 0) {
      filtered = this.items.filter((item) => {
        const name = this.caseSensitive ? item.name : item.name.toLowerCase();
        return name.includes(q);
      });
    } else if (!this.allowEmpty && q.length === 0) {
      filtered = [];
    }

    this.filtered = filtered.slice(0, this.maxResults);
    this.highlightedIndex = this.filtered.length ? 0 : -1;
    this.lastQuery = query;

    this._render();

    // If the query exactly matches one item, tick it as valid
    if (query.trim()) {
      const exact = this.filtered.find(
        (it) =>
          (this.caseSensitive ? it.name : it.name.toLowerCase()) ===
          (this.caseSensitive ? query : query.toLowerCase())
      );
      if (exact) {
        this._setStatus('valid');
      } else if (this.filtered.length === 0 && !this.isLoading) {
        this._setStatus('invalid');
      } else {
        this._setStatus('idle');
      }
    } else {
      this._setStatus('idle');
    }
  }

  _render() {
    if (!this.isOpen) return;

    this.menuEl.innerHTML = '';

    if (this.isLoading) {
      const el = document.createElement('div');
      el.className = 'combobox-empty';
      el.textContent = 'Loading…';
      this.menuEl.appendChild(el);
      return;
    }

    if (!this.filtered.length) {
      const el = document.createElement('div');
      el.className = 'combobox-empty';
      el.textContent = this.emptyText;
      this.menuEl.appendChild(el);
      return;
    }

    const frag = document.createDocumentFragment();
    this.filtered.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'combobox-item';
      if (index === this.highlightedIndex) el.classList.add('highlighted');
      if (this.selected && this.selected.value === item.id) el.classList.add('selected');
      el.dataset.index = index;

      // Highlight the matched substring
      const name = item.name;
      const q = this.lastQuery;
      if (q) {
        const idx = (this.caseSensitive ? name : name.toLowerCase()).indexOf(
          this.caseSensitive ? q : q.toLowerCase()
        );
        if (idx >= 0) {
          const before = name.slice(0, idx);
          const match = name.slice(idx, idx + q.length);
          const after = name.slice(idx + q.length);
          el.innerHTML = `${this._escape(before)}<mark>${this._escape(match)}</mark>${this._escape(after)}`;
        } else {
          el.textContent = name;
        }
      } else {
        el.textContent = name;
      }

      el.addEventListener('mousedown', (e) => {
        // Prevent blur from firing before click
        e.preventDefault();
      });
      el.addEventListener('click', () => this._pick(item));
      el.addEventListener('mouseenter', () => {
        this.highlightedIndex = index;
        this._updateHighlight();
      });

      frag.appendChild(el);
    });

    this.menuEl.appendChild(frag);
  }

  _moveHighlight(direction) {
    if (!this.filtered.length) return;
    const max = this.filtered.length - 1;
    let next = this.highlightedIndex + direction;
    if (next < 0) next = max;
    if (next > max) next = 0;
    this.highlightedIndex = next;
    this._updateHighlight();
    this._scrollIntoView();
  }

  _updateHighlight() {
    const items = this.menuEl.querySelectorAll('.combobox-item');
    items.forEach((el, i) => {
      el.classList.toggle('highlighted', i === this.highlightedIndex);
    });
  }

  _scrollIntoView() {
    const el = this.menuEl.querySelector('.combobox-item.highlighted');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  _pick(item) {
    this.selected = { value: item.id, label: item.name };
    this.inputEl.value = item.name;
    if (this.hiddenEl) this.hiddenEl.value = item.id;
    this._setStatus('valid');
    this.close();
    if (this.onChange) this.onChange({ value: item.id, label: item.name, raw: item });
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.menuEl.classList.add('open');
    this._render();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.menuEl.classList.remove('open');
  }

  _setStatus(state) {
    if (!this.statusEl) return;
    const el = this.statusEl;

    // Reset
    el.classList.remove('visible', 'valid', 'invalid', 'checking');
    el.classList.remove('fa-check', 'fa-xmark', 'fa-circle-notch', 'fa-spin');

    if (state === 'valid') {
      el.classList.add('visible', 'valid', 'fa-solid', 'fa-check');
    } else if (state === 'invalid') {
      el.classList.add('visible', 'invalid', 'fa-solid', 'fa-xmark');
    } else if (state === 'checking') {
      el.classList.add('visible', 'checking', 'fa-solid', 'fa-circle-notch', 'fa-spin');
    }
    // 'idle' → nothing
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}