# Phase 4A Success Criteria

Phase 4A passes only when the GitHub Pages HUD can call the Apps Script bridge and display a live ingestion result from the cloud-folder dataset.

## Required output

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

## Required endpoints

The Apps Script bridge must support:

```text
?action=health
?action=portfolio
?action=project&id=SYN-DES-001
?action=audit&id=SYN-DES-001
?action=definitions
```

## Endpoint-level pass checks

### health

Passes when:

- `ok` is `true`
- root folder is detected
- root folder name is `Lin_Demo_Data_v0_2`

### portfolio

Passes when:

- `ok` is `true`
- `cloud_folder_index.json` is found
- total project count is `12`
- project type counts are `4 / 4 / 4`
- project status counts are `4 / 4 / 4`
- explainability files are found for all 12 projects
- audit-trail files are found for all 12 projects

### project

Passes when:

- `ok` is `true`
- the selected project is returned
- the project folder is detected
- project explainability and audit folder checks are included

### audit

Passes when:

- `ok` is `true`
- the project audit folder is detected
- expected audit files are listed

### definitions

Passes when:

- `ok` is `true`
- lookup/calculation definitions are returned

## Ready for Phase 4B rule

The frontend should show:

```text
Ready for Phase 4B: Yes
```

only when all five endpoints pass and the portfolio endpoint confirms the full expected dataset structure.

## Troubleshooting checklist

If Phase 4A does not pass, check:

- `config.js` contains the deployed Apps Script web app URL.
- The script was deployed as a web app, not just saved.
- The deployed script can access the Drive root folder.
- The Drive folder ID is correct.
- `00_Portfolio_Index/cloud_folder_index.json` exists.
- All 12 project folders exist under the three locked category folders.
- Each project contains `06_Model_Outputs/06_Explainability/` with the four expected explainability files.
- Each project contains `08_Audit_Trails/` with the four expected audit files.
