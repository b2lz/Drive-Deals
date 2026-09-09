# How to Add Your Real Data — Plain-English Guide (Excel workflow)

## The Big Picture

You enter your data in **Excel**. You do **not** type code.

The website knows about your content from exactly two things, and both are produced by you in simple ways:

| Thing | What it is | How you work with it |
|---|---|---|
| **`source.xlsx`** | Your list: every item with its name, photo file name, and size — one **sheet** per category | You fill it in like a normal spreadsheet |
| **`assets/`** (folder) | The photos themselves — one sub-folder per category | You copy `.jpg` files into the matching folder |

Then you run **one command** (`npm run excel-to-json`) and it builds `data.json` automatically.

**Do not edit `data.json` by hand.** It is a generated file — the next conversion will overwrite everything you typed into it. The Excel file is your source of truth.

---

## The 11 Categories (sheet name = folder name)

Each category has: a row in the **`categories`** sheet, its own **sheet**, and its own **folder** in `assets/`. The sheet name and the folder name are the same code (the category `id`).

| Sheet name / folder (`assets/…`) | Category shown on the site |
|---|---|
| `arabic-films` | أفلام عربي |
| `foreign-films` | أفلام أجنبي |
| `foreign-film-series` | سلاسل أفلام أجنبي |
| `indian-films` | أفلام هندي |
| `arabic-series` | مسلسلات عربي |
| `foreign-series` | مسلسلات أجنبي |
| `korean-series` | مسلسلات كوري |
| `cartoon-films` | أفلام كرتون |
| `cartoon-series` | مسلسلات كرتون |
| `anime` | أنمي |
| `turkish-series` | مسلسلات تركي |

---

## One Item = One Row + One Photo File

Inside any category sheet, every row is one item with **3 columns**:

| Column | What it is |
|---|---|
| `title` | What the **customer sees** on the card — and what they **search** for. Write it exactly as you want it shown (Arabic is fine). |
| `image` | The **exact file name** of the photo, including `.jpg`. This must match the file in `assets/<category>/` character by character. |
| `sizeGB` | The size in GB. Just a number — `8` or `12.5`. |

Example row in the `arabic-films` sheet:

| title | image | sizeGB |
|---|---|---|
| فيلم رمضان 2024 | movie001.jpg | 8 |

---

## Step-by-Step: Add Items (the normal workflow)

**Step 1 — The photos.**
For every item, save its picture as a `.jpg` file and put it in the folder of its category:

- `assets\arabic-films\movie001.jpg`
- `assets\anime\episode010.jpg`
- …

**Step 2 — The rows.**
Open `source.xlsx` in Excel. In the sheet of each category, add one row per item (title / image file name / size). Replace the 3 example rows with your real items, or just add below them.

**Step 3 — Run the conversion.**
In the project folder, run:

```
npm run excel-to-json
```

It reads the whole workbook and writes the new `data.json`. Watch its output:

- **Warnings** like `warning: photo file is missing: assets/arabic-films/movie002.jpg` mean you haven't copied that photo yet (or the name doesn't match).
- If it finishes without errors, you're done converting.

**Step 4 — Check the website.**
Refresh `http://localhost:3001`, click your category, and search for one of your titles. The card should show your title, your photo, and your size.

That's it. Add more items? Same 4 steps.

---

## The Golden Rules (read this twice)

1. **The image name in Excel and the file in the folder must be IDENTICAL** — same letters, same capital letters, same `.jpg`. `Movie001.jpg` and `movie001.jpg` are two different names.
2. **One item = one row.** Never split one item across two rows or merge two items into one row.
3. **Don't touch the first row of any sheet** (the `title | image | sizeGB` headers). The converter reads from the second row down.
4. **Size is a plain number in GB** — no text like `8 GB`, no commas inside the number.
5. **The sheet name must stay exactly the category code** (`arabic-films`, not `Arabic Films`). Renaming a sheet orphans its items.
6. **Back up before big changes:** make a copy of `source.xlsx` (e.g. `source-backup.xlsx`) before you paste hundreds of rows.
7. **Never run `npm run make-data`** after you start adding real content — that command replaces `data.json` with the 5,500 test items.

---

## Adding a New Category (no code, ever)

1. Add a row to the **`categories`** sheet: the new category's code and Arabic name, e.g. `iranian-series` / `مسلسلات إيراني`.
2. Create a new sheet in the workbook named **exactly** that code (`iranian-series`) with the same 3 header columns.
3. Create the folder `assets\iranian-series\` and put the photos in it.
4. Add your rows, run `npm run excel-to-json`, refresh the page. The new category button appears automatically.

---

## If Something Is Wrong

| Symptom | Most likely cause |
|---|---|
| Item doesn't appear at all | Row is in the wrong sheet, or you didn't run `npm run excel-to-json` after editing Excel, or the page wasn't refreshed. |
| Card shows but the photo is the “غير متاحة” placeholder | The photo file is missing from `assets/<category>/` or its name doesn't match the `image` column exactly. |
| Item shows under the wrong category | The row is in the wrong sheet. |
| Size shows `0 GB` | The `sizeGB` cell is empty or contains text instead of a number. |
| Conversion prints many warnings | You haven't copied all the photo files yet (or some names differ). Fix the files, then re-run. |
| The site shows test data again | Someone ran `npm run make-data`. Re-run `npm run excel-to-json` to get your Excel data back. |

---

## The 2-Minute Final Check

1. Open `http://localhost:3001`.
2. Click each category button — items from the right Excel sheet appear.
3. Search a title you typed — the card appears with your photo and size.
4. Select a few items — the count and the GB total update correctly.
5. Place a test order and confirm the TXT arrives in your Telegram chat with the right items.
