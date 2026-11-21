import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const BASE_URL = process.env.APP_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(process.env.ARTIFACT_DIR || "artifacts");
const executablePath =
  process.env.CHROME_BIN ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find((candidate) => fs.existsSync(candidate));
assert(executablePath, "Set CHROME_BIN to your Chromium browser executable.");
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const failures = [];
let passed = 0;
const check = (name, condition) => {
  assert(condition, name);
  passed++;
  console.log(`PASS: ${name}`);
};
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400 && response.url().startsWith(BASE_URL))
    failures.push(`${response.status()} ${response.url()}`);
});
const noOverflow = () =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
const canvasHasOverlay = () =>
  page.locator("canvas").evaluate((canvas) => {
    const pixels = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  });
try {
  const response = await page.goto(BASE_URL, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  check("Homepage returns HTTP 200", response.status() === 200);
  await page.getByText("System operational", { exact: true }).waitFor();
  check(
    "Ten demo scenes available",
    (await page.locator("#demo-pair option").count()) === 10,
  );
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".image-comparison img")].length === 2 &&
      [...document.querySelectorAll(".image-comparison img")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
  );
  check("Before and after imagery load immediately", true);
  check("No horizontal overflow on desktop", await noOverflow());
  check(
    "Prominent AI branding removed",
    !/\bAI\b|⌘/.test(await page.locator("body").innerText()),
  );
  await page.screenshot({
    path: path.join(OUT, "assessment-desktop.png"),
    fullPage: true,
  });

  await page
    .getByRole("button", { name: "Analyze damage", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Export field report", exact: true })
    .waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector('[aria-label="Export field report"]').disabled,
    { timeout: 90000 },
  );
  check(
    "Demo analysis and situation brief complete",
    await page.getByText("Analysis complete", { exact: true }).isVisible(),
  );
  check(
    "Damage summary contains estimated buildings",
    (await page.locator(".total-metric strong").innerText()) !== "—",
  );
  check("Priority zones render", (await page.locator(".zone-row").count()) > 0);
  check("Damage overlay paints on imagery", await canvasHasOverlay());
  await page.getByLabel("Damage overlay", { exact: true }).uncheck();
  await page.waitForTimeout(150);
  check("Overlay toggle hides damage markings", !(await canvasHasOverlay()));
  await page.getByLabel("Damage overlay", { exact: true }).check();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  check(
    "Zoom control updates image scale",
    await page.getByText("125% zoom", { exact: true }).isVisible(),
  );
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page
    .getByRole("button", { name: "Fullscreen", exact: true })
    .first()
    .click();
  check(
    "Image fullscreen opens",
    await page.evaluate(() => Boolean(document.fullscreenElement)),
  );
  await page
    .getByRole("button", { name: "Exit fullscreen", exact: true })
    .click();

  const showAll = page.getByRole("button", { name: /View all \d+ zones/ });
  if (await showAll.count()) {
    await showAll.click();
    check(
      "All ranked zones remain accessible",
      (await page.locator(".zone-row").count()) > 6,
    );
    await page
      .getByRole("button", { name: "Show top zones", exact: true })
      .click();
    check(
      "Priority list collapses to top six",
      (await page.locator(".zone-row").count()) === 6,
    );
  }
  await page.screenshot({
    path: path.join(OUT, "assessment-results.png"),
    fullPage: true,
  });
  await page
    .locator(".detail-tabs")
    .getByRole("button", { name: "Situation brief", exact: true })
    .click();
  check(
    "Situation brief remains accessible",
    await page
      .getByRole("heading", { name: "Executive summary", exact: true })
      .isVisible(),
  );
  check(
    "Brief retains generation source",
    await page.locator(".brief-provenance").isVisible(),
  );
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page
      .getByRole("button", { name: "Download field report (PDF)", exact: true })
      .click(),
  ]);
  const report = path.join(OUT, "verified-field-report.pdf");
  await download.saveAs(report);
  check(
    "Export generates a valid PDF file",
    fs.readFileSync(report).subarray(0, 5).toString() === "%PDF-",
  );
  await page.screenshot({
    path: path.join(OUT, "assessment-brief.png"),
    fullPage: true,
  });

  await page
    .locator(".imagery-panel")
    .getByRole("button", { name: "Zone map", exact: true })
    .click();
  await page.locator(".leaflet-container").waitFor();
  check(
    "Interactive zone map renders",
    await page.locator(".leaflet-container").isVisible(),
  );
  await page.locator(".leaflet-interactive").first().click({ force: true });
  await page.locator(".leaflet-popup").waitFor();
  check(
    "Zone map popup exposes severity and location",
    /Priority score/.test(await page.locator(".leaflet-popup").innerText()),
  );
  await page.screenshot({
    path: path.join(OUT, "assessment-map.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Compare", exact: true }).click();

  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 844 });
    check(`No horizontal overflow at ${width}px`, await noOverflow());
    await page.screenshot({
      path: path.join(OUT, `assessment-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.getByRole("button", { name: "Upload pair", exact: true }).click();
  check(
    "Upload mode clears hidden demo selection",
    await page
      .getByRole("button", { name: "Analyze damage", exact: true })
      .isDisabled(),
  );
  const imagesDir = path.resolve("../data/demo/images");
  const pre = path.join(
    imagesDir,
    "mexico-earthquake_00000076_pre_disaster.png",
  );
  const post = path.join(
    imagesDir,
    "mexico-earthquake_00000076_post_disaster.png",
  );
  await page.locator('input[type="file"]').nth(0).setInputFiles(pre);
  check(
    "Partial image pair cannot be analyzed",
    await page
      .getByRole("button", { name: "Analyze damage", exact: true })
      .isDisabled(),
  );
  await page.locator('input[type="file"]').nth(1).setInputFiles(post);
  check(
    "Complete uploaded pair can be analyzed",
    await page
      .getByRole("button", { name: "Analyze damage", exact: true })
      .isEnabled(),
  );
  await page
    .getByRole("button", { name: "Analyze damage", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      !document.querySelector('[aria-label="Export field report"]').disabled,
    { timeout: 90000 },
  );
  check(
    "Uploaded image analysis completes",
    await page.getByText("Analysis complete", { exact: true }).isVisible(),
  );
  await page
    .locator(".imagery-panel")
    .getByRole("button", { name: "Zone map", exact: true })
    .click();
  await page.locator(".leaflet-container").waitFor();
  check(
    "Uploads preserve image-coordinate map fallback",
    /Image coordinates/.test(
      await page.locator(".zone-map-caption").innerText(),
    ),
  );
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page
    .getByRole("button", { name: "Sample scenes", exact: true })
    .click();
  check(
    "Returning to sample scenes restores demo selection",
    (await page.locator("#demo-pair").inputValue()) !== "",
  );
  await page.locator("#demo-pair").selectOption({ index: 2 });
  check(
    "Scene selection clears previous results",
    (await page.locator(".total-metric strong").innerText()) === "—",
  );
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".image-comparison img")].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  check(
    "Switching scene updates paired satellite images",
    (await page.locator(".image-comparison img").first().getAttribute("src")).includes(
      "midwest-flooding",
    ),
  );
  check("No uncaught browser errors", errors.length === 0);
  check("No failed frontend requests", failures.length === 0);
  console.log(`\n${passed} checks passed. Artifacts: ${OUT}`);
} catch (error) {
  await page
    .screenshot({
      path: path.join(OUT, "verification-error.png"),
      fullPage: true,
    })
    .catch(() => {});
  console.error(error);
  console.error({ errors, failures });
  process.exitCode = 1;
} finally {
  await browser.close();
}
