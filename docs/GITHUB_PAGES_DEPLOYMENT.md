# GitHub Pages Deployment Guide

Use this guide after the Apps Script web app is deployed and the web app URL has been pasted into `config.js`.

## 1. Create or open the repository

Suggested repository name:

```text
lin-demo
```

The repository can contain the files directly at the repository root:

```text
index.html
styles.css
app.js
config.js
apps_script/Code.gs
docs/
README.md
.nojekyll
```

## 2. Upload the static frontend files

Upload these root files to the repository:

```text
index.html
styles.css
app.js
config.js
README.md
.nojekyll
```

Also upload the folders:

```text
apps_script/
docs/
```

The `apps_script/Code.gs` file is included for setup traceability, but GitHub Pages does not execute Apps Script code. The deployed Apps Script web app URL in `config.js` is what the frontend calls.

## 3. Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to `Settings`.
3. Go to `Pages`.
4. Under `Build and deployment`, select `Deploy from a branch`.
5. Select branch `main` or your active branch.
6. Select folder `/ (root)`.
7. Save.

## 4. Open the GitHub Pages site

After GitHub finishes deployment, open the Pages URL shown in repository settings.

Expected first page:

```text
Lin | Multi-Model Simulation Demo | Phase 4A Cloud Folder Ingestion
```

## 5. Run the smoke test

1. Open page `03 Cloud Sync`.
2. Confirm the API URL shown in the configuration panel is not the placeholder.
3. Click `Run smoke test`.
4. Confirm the output matches `docs/PHASE4A_SUCCESS_CRITERIA.md`.

## 6. Common issues

### The HUD shows sample data only

`config.js` still has the placeholder value:

```javascript
appsScriptApiUrl: "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

Replace it with the deployed Apps Script web app URL.

### GitHub Pages opens but the smoke test fails

Check these items:

- Apps Script was deployed as a web app, not just saved.
- The web app access setting allows the frontend to call it.
- The script owner has access to the Google Drive folder.
- The Drive root folder ID in `config.js` matches the locked folder ID.
- The Drive folder contains `00_Portfolio_Index/cloud_folder_index.json`.

### Browser blocks a direct fetch request

Leave `transport: "jsonp"` in `config.js` for Phase 4A. JSONP is GET-only and is appropriate here because this smoke test reads public synthetic demo data and does not write or expose secrets.
