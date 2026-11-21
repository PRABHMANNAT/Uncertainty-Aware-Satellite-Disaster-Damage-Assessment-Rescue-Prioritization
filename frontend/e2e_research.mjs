import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const BASE = process.env.APP_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(process.env.ARTIFACT_DIR || "artifacts");
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.stack || error.message));
let checks = 0;
const check = (name, passed) => {
  assert(passed, name);
  checks++;
  console.log(`PASS: ${name}`);
};
const navigate = async (section) => {
  await page
    .getByRole("navigation", { name: "Paper Explorer sections" })
    .getByRole("button", { name: new RegExp(section) })
    .click();
};
const noOverflow = () =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
try {
  const response = await page.goto(`${BASE}/research`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .getByRole("heading", { name: "Explore the research.", exact: true })
    .waitFor();
  await page.locator('[data-research-ready="true"]').waitFor();
  check("Paper Explorer serves successfully", response.status() === 200);
  check(
    "Five paper explanation sections available",
    (await page
      .getByRole("navigation", { name: "Paper Explorer sections" })
      .getByRole("button")
      .count()) === 5,
  );
  check(
    "University identity retained",
    (await page
      .getByRole("img", { name: "Chandigarh University", exact: true })
      .count()) === 1,
  );
  await page.getByRole("button", { name: "Detect", exact: true }).click();
  await page
    .getByRole("heading", { name: "Which pixels suggest damage?", exact: true })
    .waitFor();
  check(
    "Method walkthrough explains the actual heuristic",
    (await page.locator(".method-explanation-main").innerText()).includes(
      "matches global brightness",
    ),
  );
  await page.getByRole("button", { name: "Qualify", exact: true }).click();
  await page
    .getByRole("heading", {
      name: "How much evidence supports the result?",
      exact: true,
    })
    .waitFor();
  check(
    "Confidence availability is explained",
    (await page.locator(".method-caveat").innerText()).includes(
      "does not establish calibration",
    ),
  );
  await page.screenshot({
    path: path.join(OUT, "paper-method.png"),
    fullPage: true,
  });

  await navigate("Priority-score lab");
  check(
    "Worked priority example produces 29",
    (await page.getByTestId("priority-score").innerText()) === "29.00",
  );
  check(
    "Comparison zone produces 75",
    (await page.getByTestId("comparison-score").innerText()) === "75.00",
  );
  for (const label of ["No damage", "Minor", "Major"])
    await page
      .getByRole("spinbutton", {
        name: `${label} component count`,
        exact: true,
      })
      .fill("0");
  await page
    .getByRole("spinbutton", { name: "Destroyed component count", exact: true })
    .fill("10");
  check(
    "Destroyed-only components produce the maximum score",
    (await page.getByTestId("priority-score").innerText()) === "100.00",
  );
  await page
    .getByRole("spinbutton", { name: "Destroyed component count", exact: true })
    .fill("0");
  check(
    "Empty zone is explicitly marked as no data",
    await page.getByText("No data", { exact: true }).isVisible(),
  );
  check(
    "Empty zone does not claim zero divided by zero equals zero",
    await page
      .getByText("Not calculated: no components supplied.", { exact: true })
      .isVisible(),
  );
  await page
    .getByRole("button", { name: "Reset educational examples", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Minor severity weight", exact: true })
    .fill("1");
  check(
    "What-if weights are clearly labelled and affect the example",
    (await page.getByText("What-if weights", { exact: true }).isVisible()) &&
      (await page.getByTestId("priority-score").innerText()) === "24.00",
  );
  await page
    .getByRole("button", {
      name: "Restore implementation weights",
      exact: true,
    })
    .click();
  check(
    "Implementation defaults can be restored",
    (await page.getByTestId("priority-score").innerText()) === "29.00",
  );
  await page
    .getByRole("spinbutton", { name: "Destroyed component count", exact: true })
    .fill("4");
  await page.screenshot({
    path: path.join(OUT, "paper-priority.png"),
    fullPage: true,
  });

  await navigate("Uncertainty lab");
  await page
    .getByRole("button", { name: "Equal probabilities", exact: true })
    .click();
  check(
    "Uniform probabilities have maximum normalized entropy",
    (await page.getByTestId("normalized-entropy").innerText()) === "1.000",
  );
  check(
    "Uniform probabilities do not invent a unique top class",
    await page.getByText("Top class is tied", { exact: true }).isVisible(),
  );
  await page
    .getByRole("button", { name: "Clear signal example", exact: true })
    .click();
  check(
    "Clear example exposes its top probability",
    (await page.getByTestId("top-probability").innerText()) === "90.0%",
  );
  check(
    "Clear example passes the initial review rule",
    await page
      .getByText("Passes this example threshold", { exact: true })
      .isVisible(),
  );
  await page
    .getByRole("slider", { name: "Review probability threshold", exact: true })
    .focus();
  await page
    .getByRole("slider", { name: "Review probability threshold", exact: true })
    .press("End");
  check(
    "Stricter review threshold flags all eight synthetic examples",
    (await page.getByTestId("review-count").innerText()) === "8 / 8",
  );
  await page.screenshot({
    path: path.join(OUT, "paper-uncertainty.png"),
    fullPage: true,
  });
  await navigate("Priority-score lab");
  check(
    "Edited counts survive section navigation",
    (await page
      .getByRole("spinbutton", {
        name: "Destroyed component count",
        exact: true,
      })
      .inputValue()) === "4",
  );

  await navigate("Validation lab");
  await page
    .getByRole("button", { name: "Perfect example", exact: true })
    .click();
  check(
    "Perfect confusion matrix computes 100 percent accuracy",
    (await page.getByTestId("validation-accuracy").innerText()) === "100.0%",
  );
  check(
    "Perfect confusion matrix computes 100 percent F1",
    (await page.getByTestId("validation-f1").innerText()) === "100.0%",
  );
  await page.getByRole("button", { name: "Clear matrix", exact: true }).click();
  check(
    "Empty matrix exposes undefined rather than perfect metrics",
    (await page.getByTestId("validation-accuracy").innerText()) === "—" &&
      (await page.getByTestId("validation-f1").innerText()) === "—",
  );
  await page
    .getByRole("spinbutton", {
      name: "Reference No damage, predicted No damage",
      exact: true,
    })
    .fill("1");
  await page
    .getByRole("spinbutton", {
      name: "Reference No damage, predicted Minor",
      exact: true,
    })
    .fill("1");
  check(
    "Entered false positive changes the computed accuracy",
    (await page.getByTestId("validation-accuracy").innerText()) === "50.0%",
  );
  check(
    "Undefined classes are excluded from macro F1",
    (await page.getByTestId("validation-f1").innerText()) === "33.3%",
  );
  await page.screenshot({
    path: path.join(OUT, "paper-validation.png"),
    fullPage: true,
  });
  const [exampleExport] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Export explanation", exact: true })
      .click(),
  ]);
  const examplePath = path.join(OUT, "paper-educational-explanation.json");
  await exampleExport.saveAs(examplePath);
  const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
  check(
    "Explanation export separates educational examples from real results",
    example.workspace_snapshot === null &&
      example.educational_examples.label.includes("not measured"),
  );
  check(
    "Explanation export retains user-entered validation data",
    example.educational_examples.validation.total === 2,
  );

  for (const width of [800, 390]) {
    await navigate("Validation lab");
    await page.setViewportSize({ width, height: 844 });
    check(
      `Validation lab has no page overflow at ${width}px`,
      await noOverflow(),
    );
    await page.screenshot({
      path: path.join(OUT, `paper-validation-${width}.png`),
      fullPage: true,
    });
    await navigate("Uncertainty lab");
    check(
      `Uncertainty lab has no page overflow at ${width}px`,
      await noOverflow(),
    );
    await navigate("Priority-score lab");
    check(
      `Priority lab has no page overflow at ${width}px`,
      await noOverflow(),
    );
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await navigate("Explain an assessment");
  check(
    "Missing saved assessment has a usable entry point",
    await page
      .getByRole("link", { name: "Run the earthquake assessment", exact: true })
      .isVisible(),
  );
  const analysisResponse = page.waitForResponse(
    (result) =>
      result.url().endsWith("/analyze") && result.request().method() === "POST",
  );
  await page.goto(`${BASE}/?scene=mexico-earthquake_00000076&autostart=1`, {
    waitUntil: "domcontentloaded",
  });
  const analysis = await (await analysisResponse).json();
  await page.waitForFunction(
    () =>
      !document.querySelector('[aria-label="Export field report"]').disabled,
    undefined,
    { timeout: 90000 },
  );
  await page
    .getByRole("link", { name: "Explain this assessment", exact: true })
    .click();
  await page.getByTestId("saved-priority-score").waitFor();
  check(
    "Live assessment is available in the paper explorer",
    (await page.locator(".assessment-facts").innerText()).includes(
      analysis.pair_id,
    ),
  );
  check(
    "Zone explanation preserves the backend score",
    (await page.getByTestId("saved-priority-score").innerText()) ===
      `${analysis.zones[0].priority_score.toFixed(2)} / 100`,
  );
  await page
    .getByLabel("Inspect response zone", { exact: true })
    .selectOption(String(analysis.zones[1].rank));
  check(
    "A different saved zone can be inspected",
    (await page.getByTestId("saved-priority-score").innerText()) ===
      `${analysis.zones[1].priority_score.toFixed(2)} / 100`,
  );
  check(
    "Unavailable real confidence is not replaced with simulation values",
    (await page.locator(".research-callout").innerText()).includes(
      "no prediction-confidence value",
    ),
  );
  await page.screenshot({
    path: path.join(OUT, "paper-live-assessment.png"),
    fullPage: true,
  });
  const [liveExport] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Export explanation", exact: true })
      .click(),
  ]);
  const livePath = path.join(OUT, "paper-real-assessment-explanation.json");
  await liveExport.saveAs(livePath);
  const liveText = fs.readFileSync(livePath, "utf8");
  check(
    "Saved-result export retains the real pair identifier",
    JSON.parse(liveText).workspace_snapshot.pair_id === analysis.pair_id,
  );
  check(
    "Saved-result export excludes satellite masks and image payloads",
    !liveText.includes("mask_base64") && !liveText.includes("data:image"),
  );
  await page
    .getByRole("button", { name: "Clear saved snapshot", exact: true })
    .click();
  check(
    "Saved numerical snapshot can be cleared",
    await page
      .getByRole("link", { name: "Run the earthquake assessment", exact: true })
      .isVisible(),
  );
  await page.evaluate(() =>
    sessionStorage.setItem(
      "disasteriq.assessment-explainer.v1",
      '{"pair_id":{}}',
    ),
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("status")
    .filter({ hasText: "saved snapshot is invalid" })
    .waitFor();
  check("Invalid snapshot is handled without a crash", true);
  await page.goto(`${BASE}/research?section=assessment&snapshot=unavailable`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("status")
    .filter({ hasText: "No previous snapshot is shown" })
    .waitFor();
  check("Unavailable browser storage does not show a stale assessment", true);
  check(
    "Paper Explorer produces no uncaught browser errors",
    errors.length === 0,
  );
  console.log(`\n${checks} Paper Explorer browser checks passed.`);
} catch (error) {
  console.error(error);
  console.error(errors);
  await page
    .screenshot({ path: path.join(OUT, "paper-error.png"), fullPage: true })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
