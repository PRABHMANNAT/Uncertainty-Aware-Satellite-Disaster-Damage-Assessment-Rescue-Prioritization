// Keep the backend's report-only registry aligned with the typed UI catalog.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const ts = require(path.join(root, "frontend/node_modules/typescript"));
const source = fs.readFileSync(path.join(root, "frontend/src/lib/demonstrations.ts"), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
new Function("exports", output)(exportsObject);
fs.writeFileSync(path.join(root, "backend/app/assets/demonstrations.json"), JSON.stringify(exportsObject.DEMONSTRATIONS, null, 2) + "\n");
const historical = path.join(root, "frontend/public/historical");
fs.cpSync(historical, path.join(root, "backend/app/assets/historical"), { recursive: true });
console.log("Synchronized demo report metadata and dated imagery.");
