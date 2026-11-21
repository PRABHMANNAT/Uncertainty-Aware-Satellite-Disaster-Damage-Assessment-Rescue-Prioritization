import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const OUT = path.resolve("artifacts");
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  acceptDownloads: true,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.stack || e.message));
let count = 0;
const check = (name, pass) => {
  assert(pass, name);
  console.log(`PASS: ${name}`);
  count++;
};
try {
  await page.goto("http://127.0.0.1:3000/demonstrations", {
    waitUntil: "domcontentloaded",
  });
  check(
    "Five curated cases, four natural disasters",
    (await page.locator(".demo-card").count()) === 5,
  );
  await page.locator(".leaflet-sbs-range").waitFor();
  check(
    "Microsoft swipe control loads",
    (await page.locator(".leaflet-sbs-range").count()) === 1,
  );
  await page.locator(".leaflet-sbs-range").focus();
  await page.locator(".leaflet-sbs-range").press("ArrowRight");
  check(
    "Comparison divider is keyboard accessible",
    (await page
      .getByRole("slider", { name: "Before and after comparison divider" })
      .count()) === 1,
  );
  await page
    .getByRole("button", { name: "Play demonstration", exact: true })
    .click();
  check(
    "Guided tour starts",
    await page
      .getByRole("button", { name: "Pause demonstration", exact: true })
      .isVisible(),
  );
  await page.waitForTimeout(6800);
  check(
    "Guided tour advances automatically",
    (await page
      .locator('.map-view-tabs button[aria-pressed="true"]')
      .innerText()) === "After",
  );
  await page
    .getByRole("button", { name: "Pause demonstration", exact: true })
    .click();
  await page.screenshot({
    path: path.join(OUT, "demonstrations-gallery.png"),
    fullPage: true,
  });
  for (const [id, title] of [
    ["maui-wildfire", "Maui"],
    ["derna-flood", "Derna"],
    ["beryl-hurricane", "Beryl"],
  ]) {
    await page.locator(`.case-${id}`).click();
    await page.waitForFunction(
      () => document.querySelectorAll(".leaflet-tile-loaded").length > 0,
      undefined,
      { timeout: 25000 },
    );
    check(
      `${title}: live source imagery loads`,
      (await page.locator(".leaflet-tile-loaded").count()) > 0,
    );
    await page
      .locator(".map-view-tabs")
      .getByRole("button", { name: "Published damage", exact: true })
      .click();
    await page
      .getByRole("slider", { name: "Published damage layer opacity" })
      .focus();
    await page
      .getByRole("slider", { name: "Published damage layer opacity" })
      .press("Home");
    for (let i = 0; i < 8; i++)
      await page
        .getByRole("slider", { name: "Published damage layer opacity" })
        .press("ArrowRight");
    check(
      `${title}: published overlay opacity is adjustable`,
      await page.getByText("40%", { exact: true }).isVisible(),
    );
    await page
      .locator(".map-view-tabs")
      .getByRole("button", { name: "Street map", exact: true })
      .click();
    check(
      `${title}: street layer is selectable`,
      (await page
        .locator('.map-view-tabs button[aria-pressed="true"]')
        .innerText()) === "Street map",
    );
    await page
      .locator(".map-view-tabs")
      .getByRole("button", { name: "Swipe comparison", exact: true })
      .click();
    await page.screenshot({
      path: path.join(OUT, `demo-${id}.png`),
      fullPage: true,
    });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Case-study PDF", exact: true }).click(),
    ]);
    const report = path.join(OUT, `case-${id}.pdf`);
    await download.saveAs(report);
    check(
      `${title}: source-aware PDF exports`,
      fs.readFileSync(report).subarray(0, 5).toString() === "%PDF-",
    );
  }
  await page.locator(".case-israel-gaza-2023").click();
  await page.locator(".leaflet-sbs-range").waitFor();
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".leaflet-image-layer")].length === 2 &&
      [...document.querySelectorAll(".leaflet-image-layer")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
  );
  check(
    "Historical: dated local imagery loads",
    (await page.locator(".leaflet-image-layer").count()) === 2,
  );
  check(
    "Historical: before/after capture dates explicit",
    (await page.locator(".map-date-strip").innerText()).includes(
      "27 September 2023",
    ) &&
      (await page.locator(".map-date-strip").innerText()).includes(
        "1 November 2023",
      ),
  );
  check(
    "Historical: building-level inference unavailable",
    await page
      .locator(".evidence-panel")
      .getByText("Regional comparison only · 10 m pixels", { exact: true })
      .isVisible(),
  );
  await page
    .getByRole("button", { name: "Southern Israel · Sderot area", exact: true })
    .click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".leaflet-image-layer")].every(
      (image) =>
        image.src.includes("southern-israel") &&
        image.complete &&
        image.naturalWidth > 0,
    ),
  );
  check("Historical: southern Israel is a separate dated comparison", true);
  await page.getByRole("button", { name: "Gaza City", exact: true }).click();
  await page.screenshot({
    path: path.join(OUT, "demo-israel-gaza.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save case", exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  check(
    "Saved cases persist across reloads",
    await page
      .getByRole("button", { name: "Saved case", exact: true })
      .isVisible(),
  );
  const [historicalDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Case-study PDF", exact: true }).click(),
  ]);
  await historicalDownload.saveAs(path.join(OUT, "case-israel-gaza.pdf"));
  check("Historical: source and acquisition report downloads", true);
  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 844 });
    check(
      `Demonstrations: no horizontal overflow at ${width}px`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: path.join(OUT, `demonstrations-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  const analyzedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/analyze") &&
      response.request().method() === "POST",
  );
  await page.goto(
    "http://127.0.0.1:3000/?scene=mexico-earthquake_00000076&autostart=1",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(
    () =>
      !document.querySelector('[aria-label="Export field report"]').disabled,
    undefined,
    { timeout: 90000 },
  );
  check(
    "Automated local demo runs analysis and brief",
    await page.getByText("Analysis complete", { exact: true }).isVisible(),
  );
  const analyzed = await (await analyzedResponse).json();
  check(
    "Global counts shown consistently",
    (await page.locator(".total-metric strong").innerText()) ===
      analyzed.summary.total_buildings.toLocaleString("en-US"),
  );
  await page
    .getByRole("textbox", { name: "Analyst notes" })
    .fill("Verify zone 1 against the field team survey before dispatch.");
  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Zones CSV", exact: true }).click(),
  ]);
  await csvDownload.saveAs(path.join(OUT, "zones.csv"));
  check(
    "CSV contains coordinates and confidence fields",
    fs
      .readFileSync(path.join(OUT, "zones.csv"), "utf8")
      .includes("coordinate_system"),
  );
  const [geoDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "GeoJSON", exact: true }).click(),
  ]);
  await geoDownload.saveAs(path.join(OUT, "zones.geojson"));
  check(
    "Georeferenced zone export has GeoJSON point features",
    JSON.parse(fs.readFileSync(path.join(OUT, "zones.geojson"), "utf8"))
      .features[0].geometry.type === "Point",
  );
  const [fieldDownload] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Export field report", exact: true })
      .click(),
  ]);
  await fieldDownload.saveAs(path.join(OUT, "enhanced-field-report.pdf"));
  check("Enhanced field report exports", true);
  await page.screenshot({
    path: path.join(OUT, "analysis-insights.png"),
    fullPage: true,
  });
  check("No uncaught browser errors", errors.length === 0);
  console.log(`${count} demonstration and analysis checks passed.`);
} catch (error) {
  console.error(error);
  console.error(errors);
  await page
    .screenshot({
      path: path.join(OUT, "demonstration-error.png"),
      fullPage: true,
    })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
