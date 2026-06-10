# Lin Phase 4A Hotfix v0.3 - Fast Apps Script Bridge

This hotfix addresses portfolio/project endpoint timeouts.

## What changed

1. `apps_script/Code.gs` is replaced with a faster v0.3 bridge.
   - It directly checks `00_Portfolio_Index/cloud_folder_index.json`.
   - It uses the locked 12-project synthetic roster for metric values.
   - It scans Google Drive only for folder/file verification.
   - The project endpoint no longer calls the full portfolio endpoint.
   - It caches the portfolio response for a short period.

2. `app.js` JSONP timeout is increased to 60 seconds.
3. `diagnostic.html` timeout is increased to 60 seconds.
4. Cache-busting asset query strings are updated to `phase4a-hotfix-003`.

## Upload steps

### A. Update Apps Script first

1. Open Apps Script: `Lin Phase 4A Bridge`.
2. Open `Code.gs`.
3. Replace the whole file with `apps_script/Code.gs` from this hotfix.
4. Save.
5. Run `testPortfolio`.
6. Run `testProject`.
7. Deploy: `Deploy -> Manage deployments -> Edit pencil -> New version -> Deploy`.
8. Keep the same `/exec` URL.

### B. Update GitHub Pages files

1. Copy `index.html`, `app.js`, `diagnostic.html`, and `config.js` into the repo root.
2. Commit message: `Apply Phase 4A fast bridge hotfix`.
3. Push to `main`.
4. Wait for the Pages deployment to finish.

### C. Test

Open:

```text
https://mrnyanlintun.github.io/LinDemo/diagnostic.html?v=phase4a-hotfix-003
```

Run:

```text
Test health
Test portfolio
Test project SYN-DES-001
Test audit SYN-DES-001
Test definitions
```

Then open:

```text
https://mrnyanlintun.github.io/LinDemo/?v=phase4a-hotfix-003
```

Go to `03 Cloud Sync` and click `Run smoke test`.
