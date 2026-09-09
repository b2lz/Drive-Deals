# Image Selection Web App — TODO

## Project Goal

Build a simple static web application where users can:

- Browse a large collection of JPG images.
- Search for images by file name.
- Select and unselect images.
- See the number of selected images.
- See the total value of all selected images.
- Enter their personal information.
- Review their selected images before submitting.
- Send a TXT order file to a Telegram Bot.

The project must use:

- HTML
- CSS
- Vanilla JavaScript
- JSON for image/value data
- Telegram Bot API
- No backend
- Arabic RTL user interface
- Static hosting compatible with Netlify or GitHub Pages

---

# Important Rules for the AI Model

Follow these rules during development:

- Work on ONE PHASE at a time.
- Do not rewrite working code unless necessary.
- Do not add features from future phases early.
- After completing a phase, verify it before moving to the next phase.
- Keep the code simple and readable.
- Avoid frameworks.
- Use vanilla JavaScript only.
- Keep HTML, CSS, JavaScript, and data in separate files.
- All image files are JPG.
- The application may contain more than 500 images.
- Performance on mobile devices is important.
- Use lazy loading for images.
- The website interface must be Arabic and RTL.
- Code comments may be written in English.

---

# Final Project Structure

```text
project/
├── index.html
├── style.css
├── script.js
├── data.json
└── images/
    ├── 001.jpg
    ├── 002.jpg
    ├── 003.jpg
    └── ...
```

Optional development files:

```text
project/
├── source.xlsx
├── tools/
│   └── excel-to-json.py
└── ...
```

---
pi
# PHASE 1 — Create the Basic Project

## Goal

Create the basic project files and make sure they are connected correctly.

## Tasks

- [ ] Create `index.html`.
- [ ] Create `style.css`.
- [ ] Create `script.js`.
- [ ] Create `data.json`.
- [ ] Create an `images` folder.
- [ ] Link `style.css` inside `index.html`.
- [ ] Link `script.js` inside `index.html`.
- [ ] Set the HTML language to Arabic.
- [ ] Set the page direction to RTL.
- [ ] Add a simple page title.
- [ ] Add a basic container for the application.

## Expected Result

Opening `index.html` should show a simple Arabic page without errors.

## Do Not Add Yet

Do not add:

- Image selection logic.
- Search.
- Total calculation.
- User form.
- Telegram integration.

---

# PHASE 2 — Define the Image Data Format

## Goal

Create a simple JSON structure that connects every image file to a numeric value.

## Example `data.json`

```json
[
  {
    "image": "001.jpg",
    "value": 10
  },
  {
    "image": "002.jpg",
    "value": 25
  },
  {
    "image": "003.jpg",
    "value": 40
  }
]
```

## Tasks

- [ ] Add at least 10 test items to `data.json`.
- [ ] Make sure every image name ends with `.jpg`.
- [ ] Make sure every `value` is a number.
- [ ] Do not duplicate image names.
- [ ] Keep image names exactly the same as the files inside `/images`.

## Expected Result

`data.json` contains clean test data that can later be expanded to 500+ images.

---

# PHASE 3 — Load JSON Data

## Goal

Load `data.json` from JavaScript.

## Tasks

- [ ] Use `fetch()` to load `data.json`.
- [ ] Store the loaded items in a JavaScript array.
- [ ] Add basic error handling.
- [ ] Show an Arabic error message if the JSON file cannot be loaded.
- [ ] Log the loaded data temporarily for testing.

## Expected Result

The browser console should show all items from `data.json`.

## Verification

Confirm:

- [ ] No JavaScript errors.
- [ ] JSON loads correctly.
- [ ] All item names and values are available.

---

# PHASE 4 — Display Image Cards

## Goal

Render the image collection as cards.

## Each Card Must Show

- The JPG image.
- The image file name.
- The numeric value.

## Tasks

- [ ] Create the cards dynamically using JavaScript.
- [ ] Use the path `images/FILENAME.jpg`.
- [ ] Add `loading="lazy"` to every image.
- [ ] Add a responsive CSS Grid.
- [ ] Make cards work well on phones.
- [ ] Keep image dimensions visually consistent.
- [ ] Prevent very large images from breaking the layout.

## Expected Result

The page should display all test images in a clean responsive grid.

## Verification

Test on:

- [ ] Desktop width.
- [ ] Tablet width.
- [ ] Mobile width.

---

# PHASE 5 — Add Image Selection

## Goal

Allow the user to select and unselect image cards.

## Tasks

- [ ] Clicking a card selects it.
- [ ] Clicking it again unselects it.
- [ ] Add a visible selected state.
- [ ] Add a check mark or similar indicator.
- [ ] Store selected items in JavaScript.
- [ ] Prevent duplicate selections.

## Selected Card Style

The selected card should clearly look different using something such as:

- Border.
- Background change.
- Check icon.
- Small selected badge.

## Expected Result

Users can select multiple images and clearly see which images are selected.

---

# PHASE 6 — Selected Count and Total Value

## Goal

Calculate selection statistics.

## Tasks

- [x] Add a visible summary bar.
- [x] Show the number of selected images.
- [x] Show the total value.
- [x] Update both values instantly after every selection.
- [x] Correctly subtract values when items are unselected.
- [x] Add a "Clear All" button.

## Example

```text
Selected images: 4
Total: 125
```

The visible labels should be in Arabic.

## Verification

Test:

- [ ] Select one image.
- [ ] Select several images.
- [ ] Unselect one image.
- [ ] Clear all selections.
- [ ] Confirm total always matches the selected values.

---

# PHASE 7 — Add Search

## Goal

Allow users to find images by file name.

## Tasks

- [x] Add a search input above the gallery.
- [x] Filter items while the user types.
- [x] Search by image file name.
- [x] Make search case-insensitive.
- [x] Keep selected items selected even when hidden by search.
- [x] Add a message when there are no matching images.
- [x] Add a button to clear the search if useful.

## Expected Result

Typing:

```text
125
```

should display matching files such as:

```text
125.jpg
```

---

# PHASE 8 — Improve Performance for 500+ Images

## Goal

Make the page usable with a large image library.

## Tasks

- [x] Keep native image lazy loading enabled.
- [x] Avoid rendering unnecessary duplicate elements.
- [x] Avoid expensive JavaScript operations on every scroll event.
- [x] Add progressive rendering, pagination, or a "Load More" system.
- [x] Recommended starting batch: 40–60 images.
- [x] Add more images when the user clicks "Load More" or reaches the end.
- [x] Search should still work across the complete dataset.
- [x] Selection must remain saved when moving between batches/search results.

## Recommended Simple Approach

Use a "Load More" button.

Example:

- First render: 50 images.
- Click "Load More": render 50 additional images.
- Continue until all images are rendered.

This is simpler and safer than complex infinite scrolling.

## Expected Result

The application remains responsive with 500+ items.

---

# PHASE 9 — Add the Continue Button

## Goal

Allow the user to move from image selection to personal information.

## Tasks

- [x] Add a "Continue" button.
- [x] Disable or block it when no image is selected.
- [x] Show an Arabic warning if the user tries to continue with zero selections.
- [x] When clicked, open the user information section or modal.

## Expected Result

A user cannot continue unless at least one image is selected.

---

# PHASE 10 — User Information Form

## Goal

Collect customer information.

## Required Fields

- Name.
- Phone number.
- Address.

## Optional Field

- Notes.

## Tasks

- [x] Add name input.
- [x] Add phone input.
- [x] Add address input.
- [x] Add notes textarea.
- [x] Add basic validation.
- [x] Clearly mark required fields.
- [x] Keep the form mobile-friendly.
- [x] Add a Back button so the user can return to image selection.

## Expected Result

The user can enter their information and go back without losing selected images.

---

# PHASE 11 — Order Review

## Goal

Show a final summary before sending.

## Display

- Customer name.
- Phone number.
- Address.
- Notes if provided.
- Selected image names.
- Value beside every selected image.
- Number of selected images.
- Final total.

## Tasks

- [x] Build the review dynamically from current app state.
- [x] Make sure all selected images are included.
- [x] Make sure the total is correct.
- [x] Add an Edit/Back button.
- [x] Add the final Send button.

## Expected Result

The user can verify everything before sending the order.

---

# PHASE 12 — Generate the TXT File

## Goal

Generate an order text file in JavaScript.

## Required TXT Format

```text
===== New Order =====

Name: Ahmed
Phone: 01000000000
Address: Cairo
Notes: Example note

===== Selected Images =====

001.jpg - 10
015.jpg - 30
125.jpg - 50

Selected Images Count: 3
Final Total: 90
```

The real file can use Arabic field labels if preferred.

## Tasks

- [x] Generate the text from current user data.
- [x] Add every selected image.
- [x] Add the value beside every image.
- [x] Add selected image count.
- [x] Add final total.
- [x] Convert the text into a JavaScript `Blob`.
- [x] Prepare the Blob as a `.txt` file.

## Suggested File Name

```text
order-YYYY-MM-DD-HH-MM.txt
```

## Expected Result

JavaScript can create a valid TXT file containing the full order.

---

# PHASE 13 — Telegram Bot Configuration

## Goal

Prepare Telegram Bot API settings.

## Add Configuration Variables

Inside `script.js`, create a clearly marked configuration section:

```javascript
const TELEGRAM_BOT_TOKEN = "PUT_BOT_TOKEN_HERE";
const TELEGRAM_CHAT_ID = "PUT_CHAT_ID_HERE";
```

## Tasks

- [x] Keep the configuration at the top of `script.js`.
- [x] Do not scatter the token in multiple places.
- [x] Add a comment explaining where to paste the values.
- [x] Validate that the values are not empty before sending.

## Important

This project intentionally has no backend.

Because of this, the Telegram Bot Token will be visible to anyone who inspects the website source code.

This is accepted for this project.

---

# PHASE 14 — Send TXT File to Telegram

## Goal

Send the generated TXT file as a Telegram document.

## Telegram API

Use:

```text
https://api.telegram.org/bot<BOT_TOKEN>/sendDocument
```

Use `FormData`.

Required fields:

- `chat_id`
- `document`

Optional:

- `caption`

## Tasks

- [x] Generate the TXT Blob.
- [x] Create a File from the Blob if necessary.
- [x] Create a `FormData` object.
- [x] Add `chat_id`.
- [x] Add the TXT document.
- [x] Send it using `fetch()`.
- [x] Handle Telegram success response.
- [x] Handle Telegram error response.

## Expected Result

Pressing Send should deliver a TXT document to the configured Telegram chat.

---

# PHASE 15 — Sending State and Error Handling

## Goal

Prevent duplicate submissions and clearly show sending status.

## Tasks

- [x] Disable the Send button while sending.
- [x] Show an Arabic "Sending..." message.
- [x] Prevent repeated clicks.
- [x] On success, show a success message.
- [x] On failure, show a clear error message.
- [x] Re-enable the button if the request fails.
- [x] Log useful technical errors to the console.

## Important

Do not clear the user's order if sending fails.

---

# PHASE 16 — Successful Submission Screen

## Goal

Show a clean confirmation after Telegram successfully receives the file.

## Tasks

- [x] Show a success screen.
- [x] Tell the user that the order was sent successfully.
- [x] Optionally show the final total.
- [x] Add a "Create New Order" button.

## When Starting a New Order

Reset:

- Selected images.
- Total.
- Search.
- Form fields.
- Review data.
- Current view.

---

# PHASE 17 — Arabic RTL UI Polish

## Goal

Make the application pleasant and clear for Arabic users.

## Tasks

- [x] Verify all visible UI text is Arabic.
- [x] Keep `dir="rtl"`.
- [x] Use readable font sizes.
- [x] Make buttons large enough for touch screens.
- [x] Make search easy to reach.
- [x] Keep selected count and total clearly visible.
- [x] Use consistent spacing.
- [x] Avoid unnecessary animations.
- [x] Make selection feedback obvious.

## Suggested Main Arabic Labels

```text
بحث عن صورة
الصور المختارة
المجموع
إلغاء تحديد الكل
تحميل المزيد
متابعة
الاسم
رقم الهاتف
العنوان
ملاحظات
مراجعة الطلب
رجوع
إرسال الطلب
جارٍ الإرسال...
تم إرسال الطلب بنجاح
حدث خطأ أثناء الإرسال
طلب جديد
```

---

# PHASE 18 — Mobile Testing

## Goal

Make sure the project works well on phones.

## Test

- [x] Small Android screen. (360x740 — `npm run test:mobile`)
- [x] Large Android screen. (412x915 — `npm run test:mobile`)
- [x] iPhone-size viewport. (390x844 — `npm run test:mobile`)
- [x] Portrait mode. (768x1024 tablet portrait — `npm run test:mobile`)
- [x] Landscape mode. (1024x768 — `npm run test:mobile`)

## Verify

- [x] Cards are not too small. (min 154px wide at 360px viewport)
- [x] Text is readable. (16px base, search input 16px — no iOS focus zoom)
- [x] Buttons are easy to tap. (measured min height 53px)
- [x] The summary does not cover important content. (checked at max scroll in all viewports)
- [x] Forms do not overflow. (tested with long values on a 390px viewport)
- [x] Long image names do not break cards. (long-name wrap test passes)

---

# PHASE 19 — Large Dataset Testing

## Goal

Test the real expected project size.

## Tasks

- [x] Generate or add at least 500 data entries. (`npm run make-data` — exactly 500)
- [x] Test loading performance. (boot + first batch measured in `npm run test:large`; images lazy-load per batch)
- [x] Test search performance. (full-dataset searches measured in `npm run test:large`)
- [x] Test selecting many images. (250 selections tested)
- [x] Test total calculation with many selections. (total verified against the sum of selected values)
- [x] Test clearing all selections.
- [x] Test order generation with many selected images. (250-image TXT generated and verified)
- [x] Test Telegram upload with a large TXT list. (upload path tested with fetch stubbed — no real spam; 3.4KB << 50MB bot limit)

## Verify

The browser should remain responsive.

---

# PHASE 20 — Excel to JSON Workflow

## Goal

Make data management easy.

The main website should use `data.json`.

The project owner can manage the image/value list in Excel.

## Excel Format

| image_name | value |
|---|---:|
| 001.jpg | 10 |
| 002.jpg | 25 |
| 003.jpg | 40 |

## Conversion Goal

Convert Excel rows into:

```json
[
  {
    "image": "001.jpg",
    "value": 10
  },
  {
    "image": "002.jpg",
    "value": 25
  }
]
```

## Tasks

- [x] Create a small Excel-to-JSON conversion script or documented process. (`npm run excel-to-json`, sample via `npm run make-sample-xlsx`)
- [x] Validate required columns. (missing image_name/value throws a clear error)
- [x] Ignore empty rows.
- [x] Make sure values are numeric. (non-numeric and missing values warn + skip; text numbers accepted)
- [x] Warn about duplicate image names.
- [x] Output a clean `data.json`. (round-trip verified byte-identical in `npm run test:excel`)
- [x] Do not require Excel libraries inside the website itself. (`xlsx` is a devDependency used only by tools/)

## Important

The live website should NOT parse Excel on every page load.

Excel is only the convenient source file for the project owner.

---

# PHASE 21 — Missing Image Handling

## Goal

Prevent broken images from damaging the interface.

## Tasks

- [x] Detect image load failures. (`img` error listener in `createCard`, tested in `npm test` scenario C)
- [x] Show a simple placeholder when a JPG file is missing. (`.image-placeholder` keeps the same 4/3 box — no layout shift)
- [x] Keep the image file name visible.
- [x] Optionally mark the item as unavailable. (`غير متاحة` corner badge + `.unavailable` card class)
- [x] Log missing image names to the console.

---

# PHASE 22 — Data Validation

## Goal

Prevent bad data from causing errors.

## Validate Each JSON Item

- [x] `image` exists. (`validateItems()` in script.js, tested in `npm test` scenarios D–E)
- [x] `image` is a string.
- [x] Image name ends with `.jpg`.
- [x] `value` exists.
- [x] `value` is numeric. (also rejects Infinity via `Number.isFinite`)
- [x] Value is not `NaN`.
- [x] Image name is unique.

## Invalid Records

Do not crash the whole application.

Skip invalid records and log a warning.

---

# PHASE 23 — Final Code Cleanup

## Goal

Clean the project before deployment.

## Tasks

- [x] Remove temporary console logs. (removed the "Loaded items from data.json" test log)
- [x] Keep only useful error logs. (8 diagnostic logs remain: load failure, 4× invalid-record warnings, missing-image warning, Telegram config/send errors)
- [x] Remove unused functions. (verified all 24 functions are used — none to remove; names referenced by tools/test-flow.js preserved)
- [x] Remove unused CSS. (audited every selector against HTML+JS: all in use; removed the one dead `review-list` class from index.html)
- [x] Use clear function names. (all names verified descriptive — no renames needed)
- [x] Group related JavaScript functions. (feature sections kept; moved `isSending` into the State section so all state lives together)
- [x] Keep Telegram configuration easy to find. (already at the top of script.js in a marked block — unchanged)
- [x] Add short comments only where useful. (shortened the 17-line phase-list header; kept section headers + JSDoc)
- [x] Avoid unnecessary code complexity. (no logic changes; `npm test`, `test:large`, `test:mobile`, `test:excel` all pass)

---

# PHASE 24 — Final Full Test

## Test Complete User Flow

All items verified in one continuous scenario against the real `data.json` (`npm run test:full`, 48 assertions; Telegram API stubbed — no real network).

- [x] Open website. (no error status, gallery view is the only visible screen)
- [x] Images load. (every card has its JPG with correct src, `loading="lazy"` and alt text; no placeholders)
- [x] Search works. ('123' → exactly 123.jpg; '999' → Arabic no-results message; clear restores list)
- [x] Select images. (count = 3, selected state + aria-pressed on all three cards)
- [x] Unselect images. (count back to 2, card deselected)
- [x] Total updates. (adds on select, subtracts on unselect — exact values checked)
- [x] Clear All works. (count/total = 0, no selected styles remain)
- [x] Load More works. (50 → 100 → 150 cards, button stays visible until the end)
- [x] Continue works. (zero selections → Arabic warning; with selections → form view, gallery-only buttons hidden)
- [x] Form validation works. (all three required errors, phone format rejected, error clears while typing)
- [x] Review screen is correct. (name/phone/address/notes rows + every image with value + count + total)
- [x] TXT content is correct. (full text matches the expected order exactly; file name + Blob verified)
- [x] Telegram send works. (sendDocument URL, chat_id, document and caption all verified against script.js config)
- [x] Send button cannot be spammed. (5 rapid clicks → exactly 1 request, button disabled with 'جارٍ الإرسال...')
- [x] Success screen appears. (shown after success response, final total displayed, no stale status)
- [x] New Order resets everything. (view, selections, summary, search, form fields, review, Send button — then a fresh selection works)

---

# PHASE 25 — Static Hosting Deployment

## Goal

Publish the project as a normal website link.

Compatible hosting:

- Netlify
- GitHub Pages
- Other static hosting services

## Tasks

- [x] Confirm all file paths are relative. (`npm run test:deploy` audits HTML/CSS/JS for absolute refs and serves the site from a sub-folder — proving it works under any sub-path like GitHub Pages project hosting)
- [x] Confirm `data.json` loads from static hosting. (served over plain HTTP like a static host: status 200, content type application/json, cards render with no error message)
- [x] Confirm images load correctly. (all 50 rendered `<img>` elements decode with naturalWidth > 0 and every image request returns 200 when served statically)
- [x] Confirm the website works over HTTPS. (zero `http://` references in HTML/CSS/JS — no mixed content possible; all external URLs are https, local assets relative; host provides TLS automatically)
- [x] Confirm Telegram API requests work from the deployed site. (real cross-origin getMe call from a headless browser page: ok + valid token @water_manBot — proves HTTPS + CORS + token exactly as sendDocument needs it; no document sent)
- [ ] Test from a real mobile phone.
- [ ] Test from a different internet connection.

---

# PHASE 26 — Multi-Category Media Library Refactor

## Goal

Turn the games-only site into a generic multi-category media library (11 categories). Categories are **data, not logic** — one shared data structure, selection system and storage calculation. Adding a category is a data change, not a code change.

## New `data.json` structure

```json
{
  "categories": [
    { "id": "arabic-films", "name": "أفلام عربي",
      "items": [{ "id": "arabic-films/001.jpg", "title": "001.jpg", "image": "001.jpg", "sizeGB": 18 }]
    }
  ]
}
```

- `id`, `title`, `image`, `sizeGB` per item; unique id = `<categoryId>/<image>`.
- The 11 categories (in order): أفلام عربي، أفلام أجنبي، سلاسل أفلام أجنبي، أفلام هندي، مسلسلات عربي، مسلسلات أجنبي، مسلسلات كوري، أفلام كرتون، مسلسلات كرتون، أنمي، مسلسلات تركي.
- `data.json` regenerated: 11 × 500 = 5,500 items via `npm run make-data` (shared thumbnails from `images/`).
- **Backward compatible**: the legacy flat array (old `data.json` / `excel-to-json.js` output) still loads — it is normalized into one "ألعاب" category. `data-legacy.json` keeps the original flat file as a backup.

## Tasks

- [x] Generic item model: `mediaItems` flat list + per-category `items`; every item carries `id`, `categoryId`/`category`, `title`, `image`, `sizeGB`.
- [x] `normalizeLibrary()` accepts both formats; `validateLibrary()` validates (unique ids, numeric sizes, valid categories).
- [x] Category navigation bar (one `role=group`, one button per category — pure data loop, no hardcoded category logic) rendered before the gallery; active state + `aria-pressed`.
- [x] Global `selectedItems` Map (id-keyed, insertion order = selection order) replaces per-category/`selectedGames` logic; switching category never clears the selection.
- [x] Storage calculated globally: `calculateTotal()` sums ALL selected items across ALL categories; the drive meter shows global total/remaining; the drive cap is enforced globally.
- [x] Search filters the active category (title = file name); category switch clears search only (keeps size filter); selection always survives search.
- [x] Manual storage-range filter (`من` / `إلى` in GB): min-only, max-only, min+max, empty = all; distinct "no results in this size range" message; active-filter chip + clear button; filter changes visibility only — never mutates `selectedItems`.
- [x] Search + size filter combine (AND) and are applied BEFORE Load More pagination; Load More continues correctly under active filters (shared batch counter).
- [x] Category-aware review: items grouped under per-category headers (count per category), customer rows (drive size, name, phone, address, notes).
- [x] Order/TXT keeps category info: grouped under `Selected Content:` with per-category headers + counts + sizes, `Total Items`, `Estimated Total Size`, `Notes` last; file name `order-YYYY-MM-DD-HH-MM.txt`.
- [x] New Order resets: selection, active category, search, size filter, customer data, review state, storage calculations.
- [x] Arabic terminology: "اختر حجم القرص", "مكتبة المحتوى", "ابحث عن فيلم أو مسلسل أو أنمي", "المحتوى المختار", etc. (no game wording in UI, code or comments).
- [x] All 15 acceptance tests from the refactor task verified (categories switch, multi-category selection, persistence, global storage, search, min/max/range filter, filter persistence, search+filter, pagination under filters, grouped review, categorized order, global drive cap, new-order reset).
- [x] Full regression: `npm test` (scenarios A–F), `npm run test:full`, `npm run test:large`, `npm run test:mobile`, `npm run test:deploy` — all pass.

## Compatibility notes

- `tools/excel-to-json.js` still outputs the legacy flat array — it remains a valid `data.json` (loaded as the single "ألعاب" category). Use `tools/make-test-data.js` for multi-category data.
- Telegram config, sending flow, TXT format (customer block), and all existing features are unchanged.

# PHASE 27 — Photos in Per-Category Folders + Excel-First Data Entry

## Goal

One photo folder per category (`assets/<category-id>/file.jpg`) and an Excel-first workflow: real data is entered in `source.xlsx` (one sheet per category), then converted into `data.json`.

## Changes

- [x] `images/` → `assets/` with one sub-folder per category + `assets/legacy/` for old flat exports. Card image source is now `assets/<categoryId>/<image>` (item `id` = `<categoryId>/<image>`), so one category id pins both the data and its photo folder.
- [x] `tools/excel-to-json.js` supports the new multi-category workbook: a `categories` sheet (`id` | `name`) + one sheet per category named exactly by its id (`title` | `image` | `sizeGB`). Legacy workbooks (one `image_name` | `value` sheet) are auto-detected and still convert to the old flat format — nothing breaks.
- [x] `tools/make-sample-xlsx.js` generates the fill-in `source.xlsx` template (categories sheet + 11 category sheets, 3 example rows each). Old file backed up as `source-legacy.xlsx`.
- [x] `tools/test-excel-to-json.js`: legacy unit tests preserved + new-format units (categories/items parsing, dedupe, warnings) + two CLI round-trips: new format reproduces all 11 categories / 5,500 items exactly, legacy format reproduces all 500 entries exactly.
- [x] Browser tests are hermetic: `test-mobile`/`test-deploy` abort the Google Fonts requests so a page load never depends on external network; `test-deploy` copies `assets/` into the sub-folder deployment.

## Workflow (user-facing, see ADD_REAL_DATA.md)

1. Fill `source.xlsx` — one sheet per category (title / image file name / size).
2. Put the photos in `assets/<category-id>/` with exactly those file names.
3. `npm run excel-to-json` → new `data.json` (+ missing-photo warnings).
4. Refresh the page.

## Compatibility notes

- `data.json` format unchanged by this phase — only where photos live and how the Excel conversion works.
- `data-legacy.json` (flat array) still loads as the single “ألعاب” category, so old exports remain valid.
- Full regression after this phase: `npm test`, `npm run test:full`, `npm run test:large`, `npm run test:mobile`, `npm run test:deploy`, `npm run test:excel` — all pass.

---

# Recommended Development Order

Do not skip ahead.

Use this exact order:

1. Basic files.
2. JSON data.
3. Load JSON.
4. Display cards.
5. Selection.
6. Count and total.
7. Search.
8. Performance / Load More.
9. Continue button.
10. User form.
11. Review.
12. TXT generation.
13. Telegram configuration.
14. Telegram sending.
15. Sending state and errors.
16. Success screen.
17. Arabic RTL polish.
18. Mobile testing.
19. 500+ item testing.
20. Excel-to-JSON workflow.
21. Missing image handling.
22. Data validation.
23. Code cleanup.
24. Full test.
25. Deployment.

---

# Instructions to Give the AI at the Start of Every Phase

Copy this message before asking the AI to implement a phase:

```text
Work only on the requested phase from TODO.md.

Do not implement future phases.
Do not rewrite unrelated working code.
Keep the implementation simple.
Use HTML, CSS, and vanilla JavaScript only.
Preserve the existing project structure.
After making changes, explain exactly which files were changed.
Then provide a short manual test checklist for this phase.
Stop after completing this phase.
```

---

# Definition of Done

The project is complete when:

- Users can browse 500+ JPG images.
- Users can search images by file name.
- Users can select multiple images.
- Selected count is correct.
- Total value is correct.
- Users can enter personal information.
- Users can review their order.
- The website generates a TXT file.
- The TXT file is sent to Telegram.
- The application works on mobile.
- The interface is Arabic RTL.
- The project works from static hosting without a backend.
