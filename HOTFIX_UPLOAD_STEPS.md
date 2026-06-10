# Lin Phase 4A Hotfix v0.2

This hotfix keeps the same GitHub Pages + Apps Script architecture and fixes the current browser-side loading issue by:

1. Preserving the live Apps Script /exec URL in config.js.
2. Adding cache-busting query strings to index.html so the browser reloads styles.css, config.js, and app.js fresh.
3. Adding diagnostic.html so the Apps Script bridge can be tested without opening the browser console.

## Upload steps with GitHub Desktop

1. Unzip this folder.
2. Open GitHub Desktop.
3. Choose Repository -> Show in Explorer.
4. Copy every file from this hotfix folder into the LinDemo repo root, replacing existing files when asked.
5. Return to GitHub Desktop.
6. Commit message: Apply Phase 4A hotfix
7. Click Commit to main.
8. Click Push origin.
9. Wait for GitHub Pages deployment to finish in the Actions tab.
10. Open https://mrnyanlintun.github.io/LinDemo/?v=phase4a-hotfix-002

## Diagnostic page

After deployment, open:

https://mrnyanlintun.github.io/LinDemo/diagnostic.html?v=phase4a-hotfix-002

Click Test health and Test portfolio. The portfolio output should show ok true, counts total 12, and readyForPhase4B true.
