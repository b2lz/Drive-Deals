"use strict";
// One safe cache-key rule for every fill script.
//
// The obvious spelling of this —
//     id.replace(/[^\w.-]+/g, "_")
// — is wrong for an Arabic or Japanese library. In JavaScript `\w` means
// `[A-Za-z0-9_]`, so every non-Latin character becomes an underscore and
// a shelf of Arabic titles collapses onto one file per shape of title.
// One cached record is then served to every one of them, which is how
// "أحمد و أحمد" came to carry the director of an unrelated film.
//
// Keys here keep letters of every script and append a short hash of the
// original id, so two titles that normalise to the same text still get
// separate files.

const crypto = require("crypto");

/**
 * A filesystem-safe, collision-free cache key for one item.
 *
 * @param {string} prefix  usually the category id
 * @param {string} id      the item's library id
 * @returns {string} a file name ending in ".json"
 */
function cacheFileName(prefix, id) {
  const readable = String(id)
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .slice(0, 80);
  const hash = crypto.createHash("sha1").update(String(id)).digest("hex").slice(0, 10);
  return `${prefix}__${readable}__${hash}.json`;
}

module.exports = { cacheFileName };