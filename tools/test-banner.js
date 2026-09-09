// ============================================================
// Banner tests (run in Node, no browser).
// Covers the rotating latest-items banner:
//   - slides + dots render from banner/data.json
//   - manual navigation (arrows + dots) switches the active slide
//   - an unusable banner payload hides the banner instead of crashing
// Usage: npm run test:banner   (or: node tools/test-banner.js)
// Requires the dev dependency "jsdom".
// ============================================================

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scriptSrc = fs.readFileSync(path.join(root, "script.js"), "utf8");

const bannerPayload = {
  items: [
    { title: "New Release 1", image: "game-001.jpg", sizeGB: 10.6 },
    { title: "New Release 2", image: "film-001.jpg", sizeGB: 54.9 },
    { title: "New Release 3", image: "anime-001.jpg", sizeGB: 22.4 },
  ],
};

async function boot(mainDataset, bannerDataset, bannerStatus = 200) {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole });
  const { window } = dom;

  window.scrollTo = () => {};
  window.URL.createObjectURL = () => "blob:test-url";
  window.URL.revokeObjectURL = () => {};

  // Route fetches: banner/data.json vs everything else (data.json).
  window.fetch = async (url) =>
    String(url).includes("banner")
      ? { ok: bannerStatus === 200, status: bannerStatus, json: async () => bannerDataset }
      : { ok: true, status: 200, json: async () => mainDataset };

  window.eval(scriptSrc);
  await new Promise((r) => setTimeout(r, 50)); // let loadData()/loadBanner() finish
  return window;
}

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("ok -", msg);
}

(async () => {
  const mainDataset = [{ image: "001.jpg", value: 10 }];

  // --- Happy path: 3 banner items render and rotate wiring works ---
  let w = await boot(mainDataset, bannerPayload);
  let d = w.document;

  assert(!d.getElementById("banner").hidden, "banner is visible with valid data");
  assert(
    d.querySelectorAll("#banner-track .banner-slide").length === 3,
    "3 slides rendered from banner/data.json"
  );
  assert(
    d.querySelectorAll("#banner-dots .banner-dot").length === 3,
    "3 dots rendered"
  );
  assert(
    d.querySelectorAll("#banner-track .banner-slide.active").length === 1,
    "exactly one slide is active"
  );
  assert(
    d.querySelector("#banner-track .banner-slide.active .banner-title").textContent ===
      "New Release 1",
    "first slide is active initially"
  );
  assert(
    d.querySelector("#banner-track .banner-slide.active .banner-size").textContent === "10.6 GB",
    "slide size badge shows the formatted size"
  );

  d.getElementById("banner-next").click();
  assert(
    d.querySelector("#banner-track .banner-slide.active .banner-title").textContent ===
      "New Release 2",
    "next arrow advances to the second slide"
  );

  d.getElementById("banner-prev").click();
  assert(
    d.querySelector("#banner-track .banner-slide.active .banner-title").textContent ===
      "New Release 1",
    "prev arrow goes back to the first slide"
  );

  [...d.querySelectorAll("#banner-dots .banner-dot")][2].click();
  assert(
    d.querySelector("#banner-track .banner-slide.active .banner-title").textContent ===
      "New Release 3",
    "clicking the third dot jumps to the third slide"
  );

  // --- Touch swipe: left = next, right = previous, vertical = ignored ---
  const bannerEl = d.getElementById("banner");
  const swipe = (x0, y0, x1, y1) => {
    const start = new w.Event("touchstart", { bubbles: true });
    start.changedTouches = [{ clientX: x0, clientY: y0 }];
    bannerEl.dispatchEvent(start);
    const end = new w.Event("touchend", { bubbles: true });
    end.changedTouches = [{ clientX: x1, clientY: y1 }];
    bannerEl.dispatchEvent(end);
  };
  const activeTitle = () =>
    d.querySelector("#banner-track .banner-slide.active .banner-title").textContent;

  swipe(200, 100, 100, 100); // swipe left -> next (wraps 3 -> 1)
  assert(activeTitle() === "New Release 1", "swipe left advances to the next slide");

  swipe(100, 100, 200, 100); // swipe right -> previous (wraps 1 -> 3)
  assert(activeTitle() === "New Release 3", "swipe right goes to the previous slide");

  swipe(150, 200, 150, 100); // mostly vertical -> ignored
  assert(activeTitle() === "New Release 3", "vertical move does not switch slides");

  swipe(150, 100, 160, 100); // tiny move (< 40px) -> ignored
  assert(activeTitle() === "New Release 3", "tiny move does not switch slides");

  // --- Bad payload: banner hides, page keeps working ---
  w = await boot(mainDataset, { nope: true });
  d = w.document;
  assert(d.getElementById("banner").hidden, "banner hides on unusable payload");
  assert(
    d.querySelectorAll("#gallery .card").length === 1,
    "gallery still renders when the banner payload is bad"
  );

  // --- Missing banner file (HTTP 404): same graceful hiding ---
  w = await boot(mainDataset, null, 404);
  d = w.document;
  assert(d.getElementById("banner").hidden, "banner hides on 404");

  console.log("\nALL BANNER TESTS PASSED");
  process.exit(0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
