"use strict";
// Tests for the PCGamingWiki provider's requirements parser.
//
// The template is line-oriented and its values contain nested templates,
// so these are the shapes that break a naive brace match.
//
// Usage: node tools/test-pcgamingwiki.js

const { parseRequirements } = require("./lib/pcgamingwiki");

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}\n        expected ${e}\n        actual   ${a}`);
  }
}

// The real shape of a page, including the editorial notes the wiki puts
// in the values and a nested template inside one of them.
check(
  "a full requirements block",
  parseRequirements(`==System requirements==
{{System requirements
|OSfamily = Windows

|minOS   = XP
|minCPU  = 2.8 GHz (XP)<br/>3.2 GHz (Vista)
|minRAM  = 1 GB (XP)<br/>1.5 GB (Vista)
|minHD   = 12 GB
|minVRAM = 256 MB
|minGPU  =
|minDX   = 9.0c

|recOS   = Vista
|recCPU  = Intel Core 2 Duo 2.2 GHz
|recCPU2 = AMD Athlon 64 X2 4400+
|recRAM  = 2 GB
|recGPU  = Nvidia GeForce 8800 GTS
|recGPU2 = Nvidia GeForce GT 640
|recDX   = 10
|notes   = {{ii}} Supported Processors: Intel Pentium 4 2.8&nbsp;GHz or faster.
}}

==References==
* Something else entirely.`),
  {
    minimum: {
      os: "XP",
      cpu: "2.8 GHz (XP) / 3.2 GHz (Vista)",
      ram: "1 GB (XP) / 1.5 GB (Vista)",
      storage: "12 GB",
      vram: "256 MB",
      directx: "9.0c",
    },
    recommended: {
      os: "Vista",
      cpu: "Intel Core 2 Duo 2.2 GHz / AMD Athlon 64 X2 4400+",
      ram: "2 GB",
      gpu: "Nvidia GeForce 8800 GTS / Nvidia GeForce GT 640",
      directx: "10",
    },
  },
);

// An empty GPU field must not appear as an empty row.
check(
  "an empty field is dropped",
  parseRequirements(`{{System requirements
|OSfamily = Windows
|minGPU  =
|minRAM  = 512 MB
|minCPU  = 2.0 GHz
|}}`),
  { minimum: { ram: "512 MB", cpu: "2.0 GHz" }, recommended: {} },
);

// A page whose only field is the operating system tells a reader
// nothing they did not already know, and showing it as "requirements"
// is worse than showing nothing.
check(
  "a block with one field is refused",
  parseRequirements(`{{System requirements
|OSfamily = Windows
|minOS   = 10
|}}`),
  null,
);

// A page with no requirements template at all.
check("no template", parseRequirements("Just some prose about a game."), null);
check("no wikitext", parseRequirements(""), null);

// The block must stop at the template's end, not run into the next
// section, where unrelated "|key = value" lines live.
check(
  "the next section is not read as requirements",
  parseRequirements(`{{System requirements
|OSfamily = Windows
|minRAM  = 1 GB
|minCPU  = 1.8 GHz
|}}
==Availability==
|notAField = should be ignored
|another   = also ignored`),
  { minimum: { ram: "1 GB", cpu: "1.8 GHz" }, recommended: {} },
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;