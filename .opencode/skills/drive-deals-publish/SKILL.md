---
name: Drive Deals Publish
description: Publish Drive Deals updates to GitHub incrementally. Regenerates data.json and banner/data.json from the Excel files, diffs the local content against origin/main to report exactly which items, banners and images were added, changed or removed, then commits and pushes only the delta. Use when the user wants to publish, push, sync, commit or upload changes, or after editing source.xlsx, banner/source.xlsx, or adding images. Triggers on "ارفع", "انشر", "أپديت", "commit", "push", "sync", "publish", "update github".
---

# Drive Deals — نشر التحديثات على GitHub

This skill publishes content updates **incrementally**. Git already transfers only
the delta (changed objects), so a push never re-uploads the whole 350 MB library
unless files were actually rewritten. The job here is to make that delta
*visible and verified* before it leaves the machine.

## Project facts

| Item | Value |
| --- | --- |
| Repo root | project directory (this skill lives in `.opencode/skills/drive-deals-publish/`) |
| Remote | `https://github.com/b2lz/Drive-Deals.git` (`origin`) |
| Branch | `main` |
| Item source | `source.xlsx` → `data.json` (via `npm run excel-to-json`) |
| Banner source | `banner/source.xlsx` → `banner/data.json` (via `npm run banner-excel-to-json`) |
| Item images | `assets/<category-id>/` |
| Banner images | `banner/assets/` |
| Category ids | `arabic-films`, `arabic-series`, `foreign-films`, `foreign-series`, `foreign-film-series`, `turkish-series`, `korean-series`, `indian-films`, `cartoon-films`, `cartoon-series`, `anime`, `games` |

`data.json` and `banner/data.json` are **generated files**. Never hand-edit them;
never stage them without regenerating first.

**Never touch `ready to deploy/`.** It is gitignored, has its own `.git`, and is
not part of this repo's remote.

---

## Step 0 — Resolve git

The terminal this runs in may predate the Git installation, so `git` may not be
on `PATH`. Resolve it once per session:

```powershell
if (Get-Command git -ErrorAction SilentlyContinue) { $git = "git" }
elseif (Test-Path "C:\Program Files\Git\cmd\git.exe") { $git = "C:\Program Files\Git\cmd\git.exe" }
else { throw "Git is not available. Install Git for Windows." }
```

Prefix every git call with `& $git`. Report clearly if git is missing — never
fall back to re-uploading through another channel.

---

## Step 1 — Sync with GitHub first

```powershell
& $git fetch origin --prune
& $git rev-list --left-right --count origin/main...HEAD
```

The output is `<behind> <ahead>`.

- If **behind > 0**: someone else pushed. Stop and tell the user before
  continuing. Offer `git pull --rebase origin main`. If the rebase conflicts,
  abort the rebase and report — never resolve content conflicts by guessing.
- If **ahead > 0**: there are unpushed commits from an earlier run. Continue;
  Step 6 will push them along with the new commit.

---

## Step 2 — Regenerate the JSON from the Excel files

```powershell
npm.cmd run excel-to-json
npm.cmd run banner-excel-to-json
```

Use `npm.cmd`, not `npm` — PowerShell blocks `npm.ps1` under the default
execution policy on this machine. The underlying commands are
`node tools/excel-to-json.js` and `node tools/banner-excel-to-json.js` if you
prefer to skip npm.

Run both unconditionally so the generated JSON always matches the spreadsheets.
Both scripts only rewrite their target JSON when the source actually differs, so
a no-op run produces no diff.

---

## Step 3 — Produce the change report

```powershell
node .opencode/skills/drive-deals-publish/scripts/diff-data.mjs
```

This compares the working tree against `origin/main` and prints a structural
diff: items added / removed / resized per category, banner changes, new and
deleted image files with sizes, and warnings for images referenced by the data
but missing from disk.

Add `--base <ref>` to compare against a different ref, `--json` for machine-readable
output. The script resolves git itself and tolerates a BOM in the JSON files.
When using `--json`, read it directly rather than piping through PowerShell —
PowerShell prepends a BOM to piped streams and corrupts the JSON. The default
text output is the normal path.

Show the user this report before committing anything. Translate the summary into
plain Arabic: how many items were added and removed, which categories, how many
new images, and any warnings.

---

## Step 4 — Safety gate

Check the staged list against these rules **before** committing.

**Block and ask the user** if any of these appear:

- A staged file larger than 90 MB (GitHub hard-limits files to 100 MB).
- Staged paths under `node_modules/`, `ready to deploy/`, `image-edit-tmp/`,
  or matching `*.log` / `.DS_Store`.
- `node_modules` or `ready to deploy` content in the diff at all.
- Deleted images that are still referenced by `data.json` or `banner/data.json`.
- More than 50 items deleted in one run — usually a broken spreadsheet export
  rather than a real cleanup.

**Warn but continue** for: new items missing their image, or a diff that touches
`script.js` / `style.css` / `index.html` when the user only mentioned content.

Never auto-fix a data problem by editing `data.json`. The fix belongs in the
spreadsheet, then re-run Step 2.

---

## Step 5 — Stage and commit

Stage content plus any modified tracked file, but nothing untracked by accident:

```powershell
& $git add -- data.json banner/data.json source.xlsx banner/source.xlsx assets banner .opencode
& $git add -u
& $git status --short
& $git diff --cached --stat
```

Read the staged list back and run the Step 4 checks against it.

### Commit message

The repo uses Conventional Commits (`feat(banner):`, `feat(library):`, `fix(ui):`).
Follow the same style, one commit per publish run, in English:

```
<type>(<scope>): <short summary>

<body: what changed, section by section>
```

Scope: `banner` if only banners changed, `library` if only items changed,
`data` if both, `fix` if the change is a correction or a removal.

Examples:

```
feat(banner): add ELDEN RING NIGHTREIGN, drop Silent Hill Townfall

- +1 banner item, -1 banner item
- +2 new images in banner/assets/
- regenerated banner/data.json
```

```
feat(library): add 12 anime titles

- +12 items across anime (9), games (2), arabic-films (1)
- -0 items, 12 new images
- regenerated data.json from source.xlsx
```

```powershell
& $git commit -m "<subject>" -m "<body>"
```

---

## Step 6 — Push and verify

```powershell
& $git push origin main
& $git status -sb
& $git log --oneline -3
```

Confirm `## main...origin/main` has **no ahead/behind counts** afterwards.

If the push is rejected as non-fast-forward, someone pushed in between. Re-fetch,
then `git pull --rebase origin main` and push again. If the rebase conflicts,
abort it, leave the working tree as it was, and report to the user.

For the first ever push (no `origin/main`), do **not** add `--force`. Let git
report what it needs and surface the message to the user.

---

## Rules

- Never run `git push --force` or `--force-with-lease`.
- Never delete, move, or re-create `.git`.
- Never stage `ready to deploy/`, `node_modules/`, logs, or OS junk.
- Never commit `data.json` before regenerating it in Step 2.
- Never silently skip the Step 4 checks because the diff "looks fine".
- One publish run = one commit. Do not split by category unless asked.
- If there is nothing to commit, say so and stop — do not create an empty commit.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `git` not recognized | Terminal started before Git was installed | Use the `C:\Program Files\Git\cmd\git.exe` fallback from Step 0 |
| Push asks for username/password | No credentials stored | Tell the user to authenticate (Git Credential Manager / a PAT). Never ask them to paste a token into chat |
| `remote origin already exists` / auth failure | Credentials expired | Same as above; do not rewrite the remote URL to embed a token |
| Report shows items with no matching image | Spreadsheet lists an image that was never placed | Report it, keep publishing the rest, and let the user fix the spreadsheet |
| `data.json` diff is enormous | Spreadsheet reserialized with different field order | Regenerate, confirm the count of added/removed items is what the user expects before committing |