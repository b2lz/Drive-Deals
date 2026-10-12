"use strict";
// Locate the two records by scanning every id and every cast entry.
const fs = require("fs");
const d = JSON.parse(fs.readFileSync("data.json", "utf8"));
const g = JSON.parse(fs.readFileSync("details/foreign-series.json", "utf8"));

for (const it of d.categories.find((c) => c.id === "foreign-series").items) {
  const id = it.id;
  const r = g.items[id];
  if (!r) continue;
  const cast = JSON.stringify(r.cast || []);
  const bad = /[A-Za-z]{3,}/.test(cast.replace(/"[^"]*"/g, (m) => m)) === false;
  // report any id whose text contains Latin letters outside the known-good set
  if (/ITH|ogan|Pumbaa|جامبول/.test(id + cast)) {
    console.log("ID  :", JSON.stringify(id));
    console.log("CAST:", cast);
  }
}
