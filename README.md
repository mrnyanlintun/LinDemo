# Lin Phase 4A - GitHub Pages + Apps Script Ingestion Smoke Test

This package continues the locked Lin Path A architecture:

```text
GitHub Pages frontend
    -> HTML / CSS / JavaScript HUD interface
    -> Google Apps Script API bridge
    -> Google Drive folder: Lin_Demo_Data_v0_2
    -> Synthetic project files and generated JSON/CSV outputs
```

Phase 4A answers one narrow question:

```text
Can the GitHub Pages HUD frontend call the Apps Script bridge, read the cloud-folder root, find cloud_folder_index.json, detect all 12 projects, and display ingestion status in the HUD?
```

## Package contents

```text
lin-demo/
├── index.html
├── styles.css
├── app.js
├── config.js
├── apps_script/
│   └── Code.gs
├── docs/
│   ├── GITHUB_PAGES_DEPLOYMENT.md
│   ├── GOOGLE_APPS_SCRIPT_SETUP.md
│   └── PHASE4A_SUCCESS_CRITERIA.md
└── README.md
```

A `.nojekyll` file is also included so GitHub Pages serves the static files without Jekyll processing.

## Setup order

1. Confirm the synthetic data folder exists in Google Drive and is shared as `Anyone with the link -> Viewer`.
2. Create the Google Apps Script bridge using `apps_script/Code.gs`.
3. Deploy the Apps Script project as a web app.
4. Paste the deployed web app URL into `config.js`.
5. Upload the package contents to a GitHub repository.
6. Turn on GitHub Pages for the repository.
7. Open the GitHub Pages URL and run `03 Cloud Sync -> Run smoke test`.

## Important configuration

`config.js` starts with the locked Drive root folder ID:

```javascript
const LIN_CONFIG = {
  driveRootFolderId: "14u6LT8E1xKBLbHwq90SySmfou0oVlSqR",
  appsScriptApiUrl: "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE",
  transport: "jsonp"
};
```

Leave `transport: "jsonp"` for the first smoke test. The Apps Script bridge supports plain JSON responses, but JSONP avoids browser cross-origin issues for this read-only synthetic-data test.

## Phase 4A pass condition

The HUD should display:

```text
Root folder detected: Lin_Demo_Data_v0_2
cloud_folder_index.json found: Yes
Projects detected: 12
Design-only: 4
Construction-only: 4
Combined: 4
Green: 4
Amber: 4
Red: 4
Explainability files found: Yes
Audit trails found: Yes
Ready for Phase 4B: Yes
```

## What this package does not do yet

- It does not call Gemini, Groq, OpenAI, Claude, or any other model provider.
- It does not perform full document-risk extraction.
- It does not write back to Google Drive.
- It does not replace human review.

Phase 4A is intentionally limited to ingestion, folder detection, endpoint response, project counting, explainability-file detection, and audit-trail detection.

## Brand and public-demo constraints preserved

- Visible wordmark uses `Lin` only.
- No `Lin // PCEIF` public wordmark.
- No `Ask Lin` or `Check with Lin` UI language.
- No official GWU logo or third-party entertainment marks.
- Cloud page uses generic `cloud folder` language in the UI.
- Footer includes the locked praxis line and disclaimer.
