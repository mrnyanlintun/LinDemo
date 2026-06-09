# Google Apps Script Setup Guide

This guide creates the read-only API bridge between the GitHub Pages HUD and the synthetic Google Drive data folder.

## 1. Create the Apps Script project

1. Go to Google Apps Script.
2. Create a new project.
3. Rename the project, for example:

```text
Lin Phase 4A Bridge
```

4. Open the default `Code.gs` file.
5. Replace all default code with the contents of:

```text
apps_script/Code.gs
```

6. Save the project.

## 2. Confirm the Drive root folder ID

The script includes the locked default root folder ID:

```javascript
var LIN_DEFAULT_ROOT_FOLDER_ID = '14u6LT8E1xKBLbHwq90SySmfou0oVlSqR';
```

This should point to:

```text
Lin_Demo_Data_v0_2
```

The script owner must have access to the folder.

## 3. Optional script test inside Apps Script

Run this function from the Apps Script editor:

```javascript
testHealth
```

Then authorize the script if Google prompts for permissions.

You can also run:

```javascript
testPortfolio
```

This is useful before publishing because it checks whether the script can see the Drive folder and parse the portfolio data.

## 4. Deploy as a web app

1. Click `Deploy`.
2. Click `New deployment`.
3. Select deployment type `Web app`.
4. Description:

```text
Lin Phase 4A ingestion bridge
```

5. Execute as:

```text
Me
```

6. Who has access:

```text
Anyone
```

For a restricted demo, you may choose a narrower setting, but the GitHub Pages frontend must be able to call the web app.

7. Click `Deploy`.
8. Copy the web app URL.

## 5. Paste the web app URL into config.js

Open `config.js` and replace:

```javascript
appsScriptApiUrl: "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

with the deployed web app URL:

```javascript
appsScriptApiUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

Keep:

```javascript
transport: "jsonp"
```

## 6. Test endpoints manually

Open these URLs in a browser after replacing `YOUR_WEB_APP_URL` with the deployment URL:

```text
YOUR_WEB_APP_URL?action=health
YOUR_WEB_APP_URL?action=portfolio
YOUR_WEB_APP_URL?action=project&id=SYN-DES-001
YOUR_WEB_APP_URL?action=audit&id=SYN-DES-001
YOUR_WEB_APP_URL?action=definitions
```

Expected result: each endpoint returns JSON with `ok: true`.

## 7. Endpoint summary

```text
?action=health
```

Checks whether the script can see the root cloud folder.

```text
?action=portfolio
```

Finds `cloud_folder_index.json`, counts projects, counts statuses, and checks explainability/audit files.

```text
?action=project&id=SYN-DES-001
```

Returns a single project record and folder inspection result.

```text
?action=audit&id=SYN-DES-001
```

Lists expected audit-trail files for a project.

```text
?action=definitions
```

Returns lookup/calculation definitions used by the frontend.

## 8. Security notes

- This bridge is read-only.
- It is intended for synthetic demo data only.
- Do not add model API keys to `config.js`, `app.js`, or any browser JavaScript file.
- Later model provider keys should live server-side, for example in Apps Script `PropertiesService` or a later backend.
- If you change the dataset from synthetic to sensitive data, do not publish it through a public GitHub Pages + public web app configuration.
