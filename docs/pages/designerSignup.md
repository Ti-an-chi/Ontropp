# designerSignup.js

> Multi-step form that creates a designer brand, sets a single operating
> location, and lets the designer edit both later.

---

## 1. Purpose

Handles **three user journeys** on one page:

| Mode | Who | What happens |
|---|---|---|
| `create` | Brand new designer, no profile | Empty form, create brand on step 1, location on step 2 |
| `complete` | Designer exists but no location set | Prefills brand, auto-jumps to step 2 |
| `edit` | Designer with brand + location | Prefills everything, allows updates, enforces monthly location edit limit |

The page is the **only entry point** for creating a designer account. It is
reachable from:

- `dashboard.html` → "Become a designer" CTA
- `designerDashboard.html` → "Edit profile" (when mode=edit)
- Any email reminder link that lands on `designerSignup.html?mode=edit`

---

## 2. Files involved

| File | Role |
|---|---|
| `designerSignup.html` | Markup — 2 steps, combobox wrappers, page loader, toast container |
| `designerSignup.js` | All page logic |
| `designerSignup.css` | Page-specific layout only |
| `components.css` + `component2.css` | Reusable primitives (buttons, forms, combobox, step indicator, toasts, skeleton, loader) |
| `uiTools/combobox.js` | Reusable searchable dropdown |
| `utility/uiUtils.js` | `setupPasswordToggle` |
| `utility/notifications.js` | `showNotification` toast helper |
| `api.js` | Real API client |
| `fakeAPI.js` | Fake client used in development — swap imports to test |

---

## 3. User flow

```
┌─────────────────────────────────────────────────────────────┐
│  Page load                                                  │
│    ↓                                                        │
│  Page loader visible                                        │
│    ↓                                                        │
│  GET /api/designer/me                                       │
│    ↓                                                        │
│  ┌── 404 / null ─────► MODE = create                        │
│  ├── shopName + no state_id ──► MODE = complete             │
│  └── shopName + state_id ─────► MODE = edit                 │
│    ↓                                                        │
│  Hide loader, render UI for mode                            │
│                                                             │
│  STEP 1: Brand basics                                       │
│    ├── Next → validates → POST create (if create mode)      │
│    │                     → PATCH update (if complete/edit)  │
│    │                     → go to step 2                     │
│    └── Skip for now → validates → POST create with          │
│                       default passKey 123456                │
│                       → redirect to designerDashboard.html  │
│                                                             │
│  STEP 2: Location                                           │
│    ├── Back → go to step 1                                  │
│    ├── I'll do this later → redirect to dashboard           │
│    └── Save → validates → PATCH /api/designer/location      │
│                → redirect to designerDashboard.html         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Modes — detailed

### 4.1 `create`
- Detected when `GET /api/designer/me` returns `null` or 404.
- Title: *"Launch Your Brand On ONTROPP"*
- Step 1 empty. Step 2 disabled until step 1 submitted.
- Submit button on step 1 creates the account (`POST /api/designer`).

### 4.2 `complete`
- Detected when profile exists, has `shopName`, but `state_id` is null/empty.
- Title: *"One Last Step"*
- Step 1 prefilled (read-only in spirit, still editable).
- Auto-navigates to step 2 on load.
- Submit on step 2 saves only location.

### 4.3 `edit`
- Detected when profile has `shopName` **and** `state_id`.
- Title: *"Update Your Brand"*
- Step 1 and Step 2 fully prefilled.
- Location edit counter enforced (see §7).
- Submit on either step PATCHes the corresponding endpoint.

---

## 5. Field reference

### Step 1 — Brand Profile

| Field | ID | Type | Required | Validation | Notes |
|---|---|---|---|---|---|
| Shop name | `shopName` | text | ✅ | 1–50 chars | Displayed as brand name |
| Logo | `logoFileInput` | file | ❌ | image, ≤2MB | Cloudinary unsigned upload |
| Bio | `shopBio` | textarea | ✅ | 1–500 chars | |
| WhatsApp | `whatsappNumber` | tel | ✅ | 11 digits, `^[0-9]{11}$` | |
| Category | `selectedCategory` | hidden | ✅ | must be picked | Driven by `.category-option` clicks |
| PassKey | `passKey` | password | ❌ | min 6 if filled | Blank → defaults to `123456` |
| Confirm | `confirmPassKey` | password | ❌ | must equal passKey | |

### Step 2 — Location (single)

| Field | ID | Type | Required | Validation | Notes |
|---|---|---|---|---|---|
| State | `stateInput` / `selectedState` | combobox | ✅ | must pick from list | Source: API states |
| City / LGA | `cityInput` / `selectedCity` | combobox | ✅ | must pick from list | Source: cities of chosen state |
| Area / Landmark | `areaInput` | text | ❌ | ≤100 chars | Free text |
| Operating description | `operatingDescription` | textarea | ❌ | ≤300 chars | Free text |

Hidden inputs (`selectedState`, `selectedCity`, `selectedCategory`) are the
**only** source of truth for form submission. Visible text inputs are UX only.

---

## 6. API contract

The page hits these endpoints. All are assumed to return `{ success, data }`
on success, and throw with `err.status` on failure.

### `GET /api/designer/me`
Returns the current designer profile, or `null`/404 if none.
```json
{
  "shopName": "Adire by Tope",
  "shopBio": "...",
  "whatsapp_number": "08031234567",
  "category": "CAT001",
  "logoUrl": "https://...",
  "state_id": "NG029",
  "city_id": "NG029001",
  "area": "Oke-Aro, near GTBank",
  "operatingDescription": "...",
  "locationEditsRemaining": 3
}
```

### `POST /api/designer`
Creates a new designer. Called from step 1 in `create` mode.
```json
{
  "shopName": "...",
  "shopBio": "...",
  "whatsapp_number": "08031234567",
  "category": "CAT001",
  "logoUrl": "https://...",
  "passKey": "123456"
}
```

### `PATCH /api/designer`
Updates brand fields. Called from step 1 in `complete`/`edit` mode.
Same payload as POST minus `passKey`.

### `PATCH /api/designer/location`
Updates location. Called from step 2 in all modes.
```json
{
  "state_id": "NG029",
  "city_id": "NG029001",
  "area": "Oke-Aro, near GTBank",
  "operatingDescription": "..."
}
```
Returns **429** if monthly location edit limit reached.

### `GET /api/categories`
Returns `[{ id, name, icon }]`. Icons are FontAwesome names.

### `GET /api/states`
Returns `[{ id, name }]`. Should be cached with a long TTL (see §8).

### `GET /api/cities/:stateId`
Returns `[{ id, name }]` for one state. Cached per state.

### `POST /api/upload` (or Cloudinary direct)
Multipart FormData, unsigned preset. Returns `{ secure_url }`.

---

## 7. Business rules

All marked in code with `// [BUSINESS]`.

### 7.1 PassKey default
If the user leaves both passKey and confirm blank, the page sends `"123456"`.
Backend should store this and flag `usesDefaultPassKey: true` so the
dashboard can nudge the user to change it.

### 7.2 Mode detection
```
profile == null          → create
profile.state_id == null → complete
otherwise                → edit
```

### 7.3 Location edit limit
- Backend returns `locationEditsRemaining` (0–3) on every `GET /api/designer/me`.
- Frontend shows counter under the location section header in `edit` mode.
- When `remaining === 0`, the location fields are `.locked` (non-interactive)
  and the submit button is disabled.
- Backend re-enforces on `PATCH /api/designer/location` — returns **429** if hit.
- Frontend handles 429 by locking the section and showing an error toast.

### 7.4 Skip behaviour
- **Step 1 "Skip for now"** → creates the account with default passKey,
  redirects to dashboard. Does **not** proceed to step 2.
- **Step 2 "I'll do this later"** → redirects to dashboard without saving location.
  Only available if step 1 was already submitted.

### 7.5 Freestyle blocking (combobox)
- Users must **pick from the dropdown** for state and city.
- Typing junk and blurring clears the field.
- Form won't submit if `selectedState`/`selectedCity` are empty.

---

## 8. Client-side caching

| Data | Where | TTL | Notes |
|---|---|---|---|
| States | `localStorage` | 7 days | Key: `ontropp:locations:v1` |
| Cities per state | `localStorage` | 7 days | Same key, keyed by `state_id` |
| User data | `localStorage` | session | `userData` (existing) |

Cache is written by `api.js`. The page itself does not touch `localStorage`
for locations.

---

## 9. State object

Internal state at the top of `designerSignup.js`:
```js
const state = {
  mode: 'create',              // 'create' | 'complete' | 'edit'
  designer: null,              // profile from GET /me (or null)
  logoUrl: null,               // cloudinary URL after upload
  locationEditsRemaining: null,
  isSubmitting: false,
};
```
Plus two module-level combobox instances (`stateCb`, `cityCb`) and two
pending values (`pendingStateId`, `pendingCityId`) used only during prefill.

---

## 10. Failure modes

| Failure | Frontend behaviour |
|---|---|
| `GET /api/designer/me` fails (network) | Toast error, loader still hides, empty create mode shown |
| `GET /api/designer/me` returns 401 | Should be caught upstream (login redirect). Page assumes token valid. |
| Categories fail to load | Toast warning, grid stays empty, form cannot proceed |
| States fail to load | Toast warning, combobox empty; user can retry by refocusing |
| Cities fail to load | Toast warning, city combobox stays empty |
| Create fails | Toast error, submit button re-enabled, user stays on step 1 |
| Location save fails (500) | Toast error, user stays on step 2 |
| Location save fails (429) | Lock section, set remaining=0, show danger info, disable submit |
| Logo upload fails | Toast error, preview reverts to upload prompt, `logoUrl` reset to null |

---

## 11. Testing

Use `fakeAPI.js` — swap the import line:
```js
// import API from '../../api.js';
import API from '../../fakeAPI.js';
```

Scenarios in `fakeAPI.js` header. Key ones:
- `mode = 'create'` — empty form
- `mode = 'complete'` — prefill + auto-jump
- `mode = 'edit'` — prefill + counter
- `locationEditsRemaining = 0` — locked state
- `failX = true` — error toasts
- `latency = 3000` — slow network feel

---

## 12. How to extend

### Add a field to step 1
1. Add input to `designerSignup.html` inside step 1's form-section.
2. Add `getVal('newFieldId')` to `validateStep1()` if required.
3. Add to `payload` inside `createDesignerAccount()`.
4. Add to `prefillStep1()` if it should prefill.
5. Document the field in §5.

### Add a field to step 2
Same pattern but in `setupFormSubmission()`'s step-2 branch and
`prefillStep2()`.

### Swap real ↔ fake API
Change one import line in `designerSignup.js`:
```js
import API from '../../api.js';       // real
import API from '../../fakeAPI.js';   // fake
```

### Add a 3rd step
1. Add `.step-item` in `#stepIndicator` with `data-step="3"`.
2. Add a new `<div class="form-step" id="step3">`.
3. Extend `goToStep()` to handle `n === 3`.
4. Add a submit path for step 3.

---

## 13. Known limitations

- **No live shop-name uniqueness check.** Deferred to backend; duplicate
  names surface as a POST error toast.
- **PassKey eye toggle is inline** in `designerSignup.js` via
  `setupPasswordToggle`. Will be extracted to a reusable component later.
- **No debounce.js utility.** The combobox has its own debounce; a shared
  one is planned.
- **Location JSON not shipped.** States + cities are fetched from the API,
  cached in `localStorage` for 7 days.

---

## 14. Related docs

- `/docs/pages/designerDashboard.md`
- `/docs/utility/combobox.md`
- `/docs/api/designer.md`