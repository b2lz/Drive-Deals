# TASK — Refactor Data Architecture from Games to Multi-Category Media Library

## Context

The current project is a media-selection website originally designed around games.

The existing architecture assumes:

- A single "Games" library.
- Users select games.
- Each game has a storage size.
- The application calculates total selected storage.
- The selected items are included in an order/review.
- The order is finally sent to the backend/Telegram flow.

The existing HTML confirms that the current UI and terminology are strongly game-oriented, including:

- "اختر ألعابك"
- "مكتبة الألعاب"
- "ابحث عن لعبة"
- "الألعاب المختارة"
- "حجم القرص"
- "الألعاب المختارة: X"

Do NOT simply rename the visible Arabic text.

The underlying data model and selection logic must be generalized.

---

# PRIMARY OBJECTIVE

Refactor the project so that the website is a **multi-category media library**, not a games-only website.

The website must support these categories:

1. أفلام عربي
2. أفلام أجنبي
3. سلاسل أفلام أجنبي
4. أفلام هندي
5. مسلسلات عربي
6. مسلسلات أجنبي
7. مسلسلات كوري
8. أفلام كرتون
9. مسلسلات كرتون
10. أنمي
11. مسلسلات تركي

The system must be designed so that more categories can be added later without rewriting the core selection logic.

---

# IMPORTANT ARCHITECTURE RULE

Do NOT create separate hardcoded selection systems for every category.

Use one generic data structure and one generic rendering/selection system.

The category should be data, not application logic.

Example conceptual structure:

```js
categories = [
    {
        id: "arabic_movies",
        name: "أفلام عربي",
        items: [...]
    },
    {
        id: "foreign_movies",
        name: "أفلام أجنبي",
        items: [...]
    }
]
```

The exact structure may be improved if the existing project already has a better compatible architecture.

---

# DATA MODEL

Each media item should have enough information to identify:

- category
- unique ID
- title / display name
- image / thumbnail
- storage size
- optional metadata

Example:

```js
{
    id: "movie-001",
    categoryId: "arabic_movies",
    title: "Example Movie",
    image: "images/arabic_movies/001.jpg",
    sizeGB: 7.5
}
```

Do NOT assume every item is an image-only object.

The system should treat the item as a generic "media item".

---

# CATEGORY NAVIGATION

Add a category-selection layer before displaying the media library.

The user should be able to select a category such as:

- أفلام عربي
- أفلام أجنبي
- سلاسل أفلام أجنبي
- أفلام هندي
- مسلسلات عربي
- مسلسلات أجنبي
- مسلسلات كوري
- أفلام كرتون
- مسلسلات كرتون
- أنمي
- مسلسلات تركي

After selecting a category:

- Show only items belonging to that category.
- The user can browse/search the category.
- The existing selection mechanism must continue to work.
- Selected items must remain selected when navigating between categories.

IMPORTANT:

Changing the category must NOT clear previously selected items.

Example:

User selects:

- 2 Arabic movies
- 1 Anime
- 3 Korean series

Then switches between categories.

All 6 items must remain selected.

---

# GLOBAL SELECTION MODEL

Selection must no longer be based on:

```js
selectedGames
```

Use a generic structure such as:

```js
selectedItems
```

Each selected item must retain:

```js
{
    id,
    categoryId,
    title,
    sizeGB,
    image
}
```

Avoid duplicating the same item in the selection.

Use the item's unique ID as the primary identity.

---

# STORAGE CALCULATION

The existing storage calculation must continue to work.

The total required storage must be calculated from ALL selected media items across ALL categories.

Example:

Arabic Movies:
- 8 GB
- 6 GB

Anime:
- 12 GB

Korean Series:
- 20 GB

Total:

46 GB

The storage meter must show:

```text
46 GB
```

not the size of the currently visible category.

The drive capacity limitation must also consider all selected categories globally.

---

# CATEGORY-AWARE REVIEW

The review page must no longer display one flat list called "Selected Games".

Instead, organize selected items by category.

Example:

```text
الأفلام العربي
- Movie A — 8 GB
- Movie B — 6 GB

الأنمي
- Anime A — 12 GB

المسلسلات الكوري
- Series A — 20 GB

الإجمالي: 46 GB
```

This is important because the customer may select content from multiple categories.

---

# ORDER DATA

The final order data must contain category information for every selected item.

Do NOT send only:

```js
{
    title,
    size
}
```

Instead preserve:

```js
{
    categoryId,
    categoryName,
    itemId,
    title,
    sizeGB
}
```

The generated order/TXT data should clearly separate categories.

Example:

```text
DRIVE DEALS

الأفلام العربي:
- Movie A — 8 GB
- Movie B — 6 GB

الأنمي:
- Anime A — 12 GB

المسلسلات الكوري:
- Series A — 20 GB

الإجمالي: 46 GB
```

Keep the existing customer information and sending flow intact unless a change is required for compatibility.

---

# SECONDARY FEATURE — MANUAL STORAGE RANGE FILTER

Add a storage-size filter to the media-selection page.

The user must be able to manually define a minimum and maximum storage size.

Example UI:

```text
فلترة حسب المساحة

من: [ 5 GB ]
إلى: [ 20 GB ]

[ تطبيق الفلتر ]
[ مسح الفلتر ]
```

The filter should work on the currently selected category.

Example:

If the current category contains:

```text
Movie A — 3 GB
Movie B — 7 GB
Movie C — 15 GB
Movie D — 25 GB
```

And the user enters:

```text
من: 5 GB
إلى: 20 GB
```

Show:

```text
Movie B — 7 GB
Movie C — 15 GB
```

Hide:

```text
Movie A — 3 GB
Movie D — 25 GB
```

---

# FILTER REQUIREMENTS

The filter must support:

### Minimum only

Example:

```text
من: 10 GB
إلى: empty
```

Show items >= 10 GB.

### Maximum only

Example:

```text
من: empty
إلى: 20 GB
```

Show items <= 20 GB.

### Minimum + Maximum

Example:

```text
من: 5 GB
إلى: 20 GB
```

Show:

```text
5 <= sizeGB <= 20
```

### No values

Show all items.

---

# IMPORTANT FILTER BEHAVIOR

The filter must NOT remove an item from the user's selection.

Example:

1. User selects Movie A — 8 GB.
2. User applies a filter from 20–30 GB.
3. Movie A disappears from the visible list.
4. Movie A must STILL remain selected.
5. Total storage must STILL include Movie A.

The filter controls visibility only.

It must NEVER mutate `selectedItems`.

---

# SEARCH + FILTER

The existing search functionality must continue to work.

Search and storage filtering should work together.

Conceptually:

```js
visibleItems =
    items
        .filter(matchesSearch)
        .filter(matchesStorageRange)
```

Do not implement search and storage filtering as competing systems.

Both filters should be active simultaneously.

---

# FILTER UX

Add a clear visual indication when a filter is active.

Example:

```text
الفلتر الحالي:
5 GB — 20 GB

[مسح الفلتر]
```

If no items match:

```text
لا توجد نتائج ضمن نطاق المساحة المحدد.
```

This message must be different from the normal "no search results" message when practical.

---

# LOAD MORE COMPATIBILITY

The current gallery has a "Load More" mechanism.

The new category system and storage filter must remain compatible with it.

IMPORTANT:

Apply:

```text
Category filter
+
Search filter
+
Storage filter
```

BEFORE pagination / Load More.

Do not paginate first and then filter only the currently loaded items.

Otherwise valid results may remain hidden.

---

# DRIVE CAPACITY

The drive-size selection must remain global.

The selected drive capacity must be compared against the total storage of ALL selected media across ALL categories.

Do not reset storage when changing categories.

Example:

Drive capacity:

```text
500 GB
```

Selections:

```text
Arabic movies = 100 GB
Anime = 200 GB
Korean series = 150 GB
```

Total:

```text
450 GB
```

Remaining:

```text
50 GB
```

---

# DO NOT BREAK EXISTING FEATURES

Preserve the existing functionality wherever possible:

- Drive capacity selection
- Gallery
- Search
- Load More
- Item selection
- Storage calculation
- Customer information form
- Review page
- Order generation
- Telegram sending
- Success screen
- New order/reset flow

The goal is to generalize the architecture, not rebuild unrelated systems.

---

# TERMINOLOGY REFACTOR

Replace game-specific internal terminology.

Avoid names such as:

```js
games
selectedGames
gameLibrary
gameCard
gameSize
```

Prefer generic terminology:

```js
mediaItems
selectedItems
mediaLibrary
mediaCard
sizeGB
```

For visible Arabic text, use terminology appropriate for media/content.

Examples:

```text
اختر المحتوى
مكتبة المحتوى
ابحث عن فيلم أو مسلسل أو أنمي
المحتوى المختار
```

Category names should remain exactly as specified above.

---

# DATA FILE COMPATIBILITY

Before changing the data-loading system, inspect the existing `data.json` / data source structure.

Do NOT blindly replace it.

If the existing data source is currently something like:

```js
[
    {
        image: "...",
        size: 10
    }
]
```

adapt it to the new category-aware structure in the least destructive way possible.

If necessary, support a structure such as:

```js
{
    categories: [
        {
            id: "...",
            name: "...",
            items: [...]
        }
    ]
}
```

The architecture must make adding a new category a data change rather than a JavaScript logic rewrite.

---

# RESET / NEW ORDER

When the user clicks:

```text
طلب جديد
```

reset:

- selected items
- active category
- search
- storage filter
- customer data
- review state
- storage calculations

Then start from the beginning.

---

# IMPLEMENTATION STRATEGY

Do NOT modify the entire project blindly.

Follow this order:

## STEP 1

Inspect:

- `index.html`
- `script.js`
- `style.css`
- `data.json`
- any additional files responsible for data loading or Telegram sending

Understand the current architecture first.

## STEP 2

Identify all game-specific assumptions.

Create a short internal checklist of:

- variable names
- DOM IDs
- functions
- data structures
- UI text
- order-generation logic

that assume the content is games.

## STEP 3

Refactor the data model to support categories.

## STEP 4

Implement category navigation.

## STEP 5

Convert selection logic to global `selectedItems`.

## STEP 6

Update storage calculation to work globally.

## STEP 7

Update review/order generation to preserve categories.

## STEP 8

Implement manual storage-range filtering.

## STEP 9

Make search + storage filter + pagination work together.

## STEP 10

Update Arabic UI terminology.

## STEP 11

Test every existing feature.

---

# ACCEPTANCE TESTS

The implementation is NOT complete until all of these work:

### Test 1 — Categories

User can switch between all 11 categories.

### Test 2 — Multi-category selection

User can select items from multiple categories.

### Test 3 — Persistence

Switching categories does not clear selections.

### Test 4 — Global storage

Total storage includes selections from every category.

### Test 5 — Search

Search works inside the active category.

### Test 6 — Minimum filter

Minimum storage filter works.

### Test 7 — Maximum filter

Maximum storage filter works.

### Test 8 — Range filter

Minimum + maximum works.

### Test 9 — Filter persistence

Filtering does not remove selected items.

### Test 10 — Search + filter

Both can be active simultaneously.

### Test 11 — Pagination

Load More works with active filters.

### Test 12 — Review

Review groups selected items by category.

### Test 13 — Order

Generated order data contains category + item + storage information.

### Test 14 — Drive capacity

Drive capacity works globally across categories.

### Test 15 — New order

New Order completely resets the application.

---

# CRITICAL RULES

1. Do NOT create 11 separate implementations.
2. Do NOT store selection per category independently.
3. Do NOT clear selections when changing category.
4. Do NOT let filtering mutate selectedItems.
5. Do NOT calculate storage from the visible/filtered items.
6. Do NOT paginate before filtering.
7. Do NOT break Telegram/order sending.
8. Do NOT rewrite unrelated parts of the project.
9. Reuse the existing architecture wherever possible.
10. Prefer data-driven architecture over hardcoded category logic.
11. Keep the application functional after each major change.
12. If an assumption about the existing data structure is unclear, inspect the actual file before implementing it.
13. Do not invent missing backend APIs or data fields without first checking the existing project.
14. Maintain RTL Arabic UI.

---

# FINAL DELIVERABLE

After implementation, provide a concise report containing:

1. Files modified.
2. New data structure.
3. How categories are handled.
4. How global selection works.
5. How the manual storage filter works.
6. How search + filter + pagination interact.
7. Any compatibility changes made.
8. Any assumptions or remaining limitations.

Most importantly:

**Do not treat this as a "rename Games to Movies" task.**

This is an architectural refactor from:

```text
Games Library
      ↓
Selected Games
      ↓
Storage
      ↓
Order
```

to:

```text
Categories
      ↓
Media Items
      ↓
Global Selected Items
      ↓
Global Storage
      ↓
Categorized Order
```

while preserving the existing project functionality.
