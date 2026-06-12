/**
 * Lin Phase 4A Apps Script bridge - fast bridge v0.3
 * ------------------------------------------------------------
 * Purpose:
 *   Read the synthetic Lin_Demo_Data_v0_2 cloud folder from Google Drive,
 *   locate 00_Portfolio_Index/cloud_folder_index.json, inspect the 12
 *   synthetic project folders, and return smoke-test JSON/JSONP to the
 *   GitHub Pages HUD frontend.
 *
 * v0.3 speed changes:
 *   - Directly checks the known 00_Portfolio_Index folder instead of a
 *     recursive root search.
 *   - Uses the locked synthetic roster as the metric baseline and scans
 *     Drive only for folder/file verification.
 *   - Project endpoint no longer calls the full portfolio endpoint.
 *   - Adds short CacheService caching for the portfolio response.
 *
 * Security note:
 *   This script is a read-only ingestion smoke-test bridge for synthetic
 *   demo data. Do not place Gemini, Groq, OpenAI, Claude, or other API keys
 *   in browser JavaScript. Later model keys should live server-side in
 *   PropertiesService or another backend.
 */

var LIN_DEFAULT_ROOT_FOLDER_ID = '14u6LT8E1xKBLbHwq90SySmfou0oVlSqR';
var LIN_API_VERSION = 'lin-phase4a-apps-script-v0.3-fast-bridge';

var LIN_EXPECTED = {
  rootName: 'Lin_Demo_Data_v0_2',
  projectCount: 12,
  typeCounts: {
    Design: 4,
    Construction: 4,
    Combined: 4
  },
  statusCounts: {
    GREEN: 4,
    AMBER: 4,
    RED: 4
  },
  explainabilityFiles: [
    'module_explanation_summary.json',
    'p80_eac_driver_trace.json',
    'risk_consequence_action_matrix.csv',
    'threshold_rule_map.json'
  ],
  auditFiles: [
    'explainability_trace.json',
    'downloadable_audit_package.json',
    'calculation_trace.json',
    'run_log.json'
  ]
};

var LIN_CATEGORY_FOLDERS = [
  { folderName: '01_Design_Only_Projects', type: 'Design', codeToken: 'DES' },
  { folderName: '02_Construction_Only_Projects', type: 'Construction', codeToken: 'CON' },
  { folderName: '03_Combined_Design_Construction_Projects', type: 'Combined', codeToken: 'CMB' }
];

var LIN_ROSTER = [
  { code: 'SYN-DES-001', projectName: 'Terminal Airside Utilities Design', type: 'Design', status: 'GREEN', health: 90, cpi: 1.04, spi: 1.01, bacM: 88.6, p50EacM: 85.192, p80EacM: 86.828, posteriorRisk: 0.16, cusum: 0.8, flaggedRfis: 1, conflicts: 0 },
  { code: 'SYN-DES-002', projectName: 'Laboratory Renovation Design', type: 'Design', status: 'AMBER', health: 64, cpi: 0.95, spi: 0.92, bacM: 40.1, p50EacM: 42.211, p80EacM: 44.338, posteriorRisk: 0.42, cusum: 2.1, flaggedRfis: 5, conflicts: 1 },
  { code: 'SYN-DES-003', projectName: 'Central Plant Controls Design', type: 'Design', status: 'GREEN', health: 94, cpi: 1.03, spi: 1.04, bacM: 52.4, p50EacM: 50.874, p80EacM: 52.034, posteriorRisk: 0.19, cusum: 1.0, flaggedRfis: 1, conflicts: 0 },
  { code: 'SYN-DES-004', projectName: 'Secure Communications Backbone Design', type: 'Design', status: 'RED', health: 40, cpi: 0.82, spi: 0.78, bacM: 67.8, p50EacM: 82.683, p80EacM: 89.728, posteriorRisk: 0.71, cusum: 5.8, flaggedRfis: 13, conflicts: 3 },
  { code: 'SYN-CON-005', projectName: 'Concourse MEP Fit-Out Construction Administration', type: 'Construction', status: 'RED', health: 32, cpi: 0.83, spi: 0.79, bacM: 161.9, p50EacM: 195.060, p80EacM: 212.849, posteriorRisk: 0.76, cusum: 6.3, flaggedRfis: 13, conflicts: 3 },
  { code: 'SYN-CON-006', projectName: 'Facility Security Integration Construction Administration', type: 'Construction', status: 'AMBER', health: 62, cpi: 0.92, spi: 0.92, bacM: 31.8, p50EacM: 34.565, p80EacM: 36.432, posteriorRisk: 0.45, cusum: 2.7, flaggedRfis: 5, conflicts: 1 },
  { code: 'SYN-CON-007', projectName: 'Emergency Power Resilience Construction Administration', type: 'Construction', status: 'GREEN', health: 92, cpi: 1.04, spi: 1.04, bacM: 74.2, p50EacM: 71.346, p80EacM: 72.887, posteriorRisk: 0.18, cusum: 0.9, flaggedRfis: 1, conflicts: 0 },
  { code: 'SYN-CON-008', projectName: 'Operations Center Build-Out Construction Administration', type: 'Construction', status: 'AMBER', health: 66, cpi: 0.95, spi: 0.89, bacM: 96.5, p50EacM: 101.579, p80EacM: 107.552, posteriorRisk: 0.49, cusum: 3.0, flaggedRfis: 5, conflicts: 1 },
  { code: 'SYN-CMB-009', projectName: 'Curbside Roadway Reconfiguration', type: 'Combined', status: 'AMBER', health: 68, cpi: 0.92, spi: 0.90, bacM: 68.9, p50EacM: 74.891, p80EacM: 79.115, posteriorRisk: 0.47, cusum: 2.6, flaggedRfis: 5, conflicts: 2 },
  { code: 'SYN-CMB-010', projectName: 'Access Control Modernization', type: 'Combined', status: 'RED', health: 32, cpi: 0.82, spi: 0.81, bacM: 235.4, p50EacM: 287.073, p80EacM: 312.565, posteriorRisk: 0.74, cusum: 6.0, flaggedRfis: 13, conflicts: 4 },
  { code: 'SYN-CMB-011', projectName: 'Baggage Interface Works', type: 'Combined', status: 'RED', health: 34, cpi: 0.83, spi: 0.82, bacM: 148.2, p50EacM: 178.554, p80EacM: 193.553, posteriorRisk: 0.70, cusum: 5.5, flaggedRfis: 13, conflicts: 4 },
  { code: 'SYN-CMB-012', projectName: 'Passenger Processing Hall Renewal', type: 'Combined', status: 'GREEN', health: 92, cpi: 1.03, spi: 1.00, bacM: 122.7, p50EacM: 119.126, p80EacM: 122.128, posteriorRisk: 0.21, cusum: 1.2, flaggedRfis: 1, conflicts: 0 }
];

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || '').toLowerCase();
  var rootId = params.rootId || LIN_DEFAULT_ROOT_FOLDER_ID;

  try {
    var payload;
    if (action === 'update') {
      var body = {};
      if (e && e.postData && e.postData.contents) {
        try { body = JSON.parse(e.postData.contents); } catch (parseErr) {
          return output_(errorPayload_('Invalid JSON body: ' + String(parseErr), 'update'), null);
        }
      }
      payload = updateProject_(rootId, body);
    } else if (action === 'createproject') {
      var body = JSON.parse(e.postData.contents);
      return output_(createProject_(rootId, body), null);
    } else if (action === 'archiveproject') {
      var body = JSON.parse(e.postData.contents);
      return output_(archiveProject_(rootId, body), null);
    } else if (action === 'chat') {
      var body = JSON.parse(e.postData.contents);
      return output_(chatProject_(rootId, body), null);
    } else {
      payload = errorPayload_('Unknown POST action: ' + action, action);
    }
    return output_(payload, null);
  } catch (err) {
    return output_(errorPayload_(err && err.message ? err.message : String(err), action), null);
  }
}

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || 'health').toLowerCase();
  var rootId = params.rootId || LIN_DEFAULT_ROOT_FOLDER_ID;
  var forceRefresh = String(params.refresh || params.nocache || '') === '1';

  try {
    var payload;
    if (action === 'health') {
      payload = getHealth_(rootId);
    } else if (action === 'portfolio') {
      payload = getPortfolio_(rootId, forceRefresh);
    } else if (action === 'project') {
      payload = getProject_(rootId, params.id || params.projectId || '');
    } else if (action === 'audit') {
      payload = getAudit_(rootId, params.id || params.projectId || '');
    } else if (action === 'definitions') {
      payload = getDefinitions_();
    } else if (action === 'clearcache') {
      payload = clearCache_();
    } else {
      payload = errorPayload_('Unknown action: ' + action, action);
    }
    return output_(payload, params.callback || params.prefix);
  } catch (err) {
    return output_(errorPayload_(err && err.message ? err.message : String(err), action), params.callback || params.prefix);
  }
}

function testHealth() {
  Logger.log(JSON.stringify(getHealth_(LIN_DEFAULT_ROOT_FOLDER_ID), null, 2));
}

function testPortfolio() {
  Logger.log(JSON.stringify(getPortfolio_(LIN_DEFAULT_ROOT_FOLDER_ID, true), null, 2));
}

function testProject() {
  Logger.log(JSON.stringify(getProject_(LIN_DEFAULT_ROOT_FOLDER_ID, 'SYN-DES-001'), null, 2));
}

function testAudit() {
  Logger.log(JSON.stringify(getAudit_(LIN_DEFAULT_ROOT_FOLDER_ID, 'SYN-DES-001'), null, 2));
}

function getHealth_(rootId) {
  var started = new Date();
  var root = DriveApp.getFolderById(rootId);
  return success_('health', {
    apiVersion: LIN_API_VERSION,
    rootFolderDetected: true,
    rootFolderId: rootId,
    rootFolderName: root.getName(),
    expectedRootFolderName: LIN_EXPECTED.rootName,
    timestamp: new Date().toISOString(),
    elapsedMs: elapsedMs_(started),
    endpoints: [
      '?action=health',
      '?action=portfolio',
      '?action=project&id=SYN-DES-001',
      '?action=audit&id=SYN-DES-001',
      '?action=definitions',
      'POST ?action=update (body: projectCode, cpi, spi, bacM, p50EacM, p80EacM, posteriorRisk, cusum, flaggedRfis, conflicts, health, status)',
      'POST ?action=createProject',
      'POST ?action=archiveProject',
      'POST ?action=chat'
    ]
  });
}

function getPortfolio_(rootId, forceRefresh) {
  var started = new Date();
  var cacheKey = cacheKey_('portfolio', rootId);

  if (!forceRefresh) {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      var cachedPayload = JSON.parse(cached);
      cachedPayload.data.cached = true;
      cachedPayload.data.cacheHitTimestamp = new Date().toISOString();
      return cachedPayload;
    }
  }

  var root = DriveApp.getFolderById(rootId);
  var indexInfo = getCloudFolderIndexInfo_(root);
  var scan = scanProjectFolders_(root);
  var scanMap = mapByCode_(scan.projects);
  var projects = [];
  var projectChecks = [];
  var explainAll = true;
  var auditAll = true;

  for (var i = 0; i < LIN_ROSTER.length; i++) {
    var rosterItem = shallowClone_(LIN_ROSTER[i]);
    var scanned = scanMap[rosterItem.code] || null;
    var folder = scanned ? scanned.folder : null;
    var check = inspectProjectFolderObject_(folder, rosterItem.code, scanned ? scanned.path : '');

    rosterItem.folderFound = check.folderFound;
    rosterItem.folderId = check.folderId;
    rosterItem.folderName = check.folderName;
    rosterItem.path = check.path;
    rosterItem.explainabilityFound = check.explainabilityFound;
    rosterItem.auditTrailsFound = check.auditTrailsFound;
    rosterItem.source = scanned ? 'folder_scan_and_locked_roster' : 'locked_roster_missing_folder';

    projects.push(rosterItem);
    projectChecks.push(check);

    if (!check.explainabilityFound) explainAll = false;
    if (!check.auditTrailsFound) auditAll = false;
  }

  var detectedProjects = [];
  for (var j = 0; j < projects.length; j++) {
    if (projects[j].folderFound) detectedProjects.push(projects[j]);
  }

  var counts = summarizeProjects_(detectedProjects);
  var ready = Boolean(
    root.getName() === LIN_EXPECTED.rootName &&
    indexInfo.found &&
    indexInfo.parseOk &&
    counts.total === LIN_EXPECTED.projectCount &&
    counts.types.Design === LIN_EXPECTED.typeCounts.Design &&
    counts.types.Construction === LIN_EXPECTED.typeCounts.Construction &&
    counts.types.Combined === LIN_EXPECTED.typeCounts.Combined &&
    counts.statuses.GREEN === LIN_EXPECTED.statusCounts.GREEN &&
    counts.statuses.AMBER === LIN_EXPECTED.statusCounts.AMBER &&
    counts.statuses.RED === LIN_EXPECTED.statusCounts.RED &&
    explainAll &&
    auditAll
  );

  var payload = success_('portfolio', {
    apiVersion: LIN_API_VERSION,
    rootFolderDetected: true,
    rootFolderId: rootId,
    rootFolderName: root.getName(),
    cloudFolderIndexFound: indexInfo.found,
    cloudFolderIndexPath: indexInfo.path || '',
    cloudFolderIndexParseOk: indexInfo.parseOk,
    cloudFolderIndexParseError: indexInfo.parseError || '',
    projectsDetectedByFolderScan: scan.projects.length,
    categoryFolders: scan.categories,
    projects: projects,
    counts: counts,
    explainabilityFilesFound: explainAll,
    auditTrailsFound: auditAll,
    readyForPhase4B: ready,
    projectChecks: projectChecks,
    expected: LIN_EXPECTED,
    timestamp: new Date().toISOString(),
    elapsedMs: elapsedMs_(started),
    cached: false
  });

  putCacheSafely_(cacheKey, payload, 900);
  return payload;
}

function getProject_(rootId, projectId) {
  var started = new Date();
  if (!projectId) return errorPayload_('Missing project id.', 'project');

  var rosterItem = findRosterProject_(projectId);
  if (!rosterItem) return errorPayload_('Project not found in locked roster: ' + projectId, 'project');

  var root = DriveApp.getFolderById(rootId);
  var folderInfo = findProjectFolderByCode_(root, projectId);
  var check = inspectProjectFolderObject_(folderInfo ? folderInfo.folder : null, rosterItem.code, folderInfo ? folderInfo.path : '');
  var project = shallowClone_(rosterItem);
  project.folderFound = check.folderFound;
  project.folderId = check.folderId;
  project.folderName = check.folderName;
  project.path = check.path;
  project.explainabilityFound = check.explainabilityFound;
  project.auditTrailsFound = check.auditTrailsFound;
  project.folderInspection = check;

  return success_('project', {
    apiVersion: LIN_API_VERSION,
    project: project,
    timestamp: new Date().toISOString(),
    elapsedMs: elapsedMs_(started)
  });
}

function getAudit_(rootId, projectId) {
  var started = new Date();
  if (!projectId) return errorPayload_('Missing project id.', 'audit');

  var root = DriveApp.getFolderById(rootId);
  var folderInfo = findProjectFolderByCode_(root, projectId);
  if (!folderInfo || !folderInfo.folder) return errorPayload_('Project folder not found for audit endpoint: ' + projectId, 'audit');

  var auditFolder = findNestedFolder_(folderInfo.folder, ['08_Audit_Trails']);
  var auditFileSet = fileSet_(auditFolder);
  var expectedResults = expectedFileResultsFromSet_(auditFileSet, LIN_EXPECTED.auditFiles);
  var allFound = allExpectedFound_(expectedResults);

  return success_('audit', {
    apiVersion: LIN_API_VERSION,
    projectId: projectId,
    auditFolderFound: Boolean(auditFolder),
    auditFiles: fileSetToList_(auditFileSet),
    expectedAuditFiles: expectedResults,
    auditTrailsFound: allFound,
    timestamp: new Date().toISOString(),
    elapsedMs: elapsedMs_(started)
  });
}

function getDefinitions_() {
  var definitions = [
    { term: 'EVM', definition: 'Earned Value Management compares planned value, earned value, and actual cost to show cost and schedule performance against the baseline.', formula: 'PV, EV, AC' },
    { term: 'PV / Planned Value', definition: 'Budgeted value of work planned to be complete by a given date.', formula: 'PV = planned budgeted work to date' },
    { term: 'EV / Earned Value', definition: 'Budgeted value of work actually completed by a given date.', formula: 'EV = budgeted value of completed work' },
    { term: 'AC / Actual Cost', definition: 'Actual cost incurred for completed work by a given date.', formula: 'AC = actual cost of performed work' },
    { term: 'CPI', definition: 'Cost Performance Index. A value below 1.00 indicates cost inefficiency.', formula: 'CPI = EV / AC' },
    { term: 'SPI', definition: 'Schedule Performance Index. A value below 1.00 indicates schedule underperformance.', formula: 'SPI = EV / PV' },
    { term: 'BAC', definition: 'Budget at Completion. The approved total baseline budget.', formula: 'BAC = approved baseline budget' },
    { term: 'EAC', definition: 'Estimate at Completion. The forecasted total final project cost.', formula: 'EAC approximately equals BAC / CPI, or the documented EAC logic used by the module' },
    { term: 'P50', definition: 'The median or likely simulation forecast.', formula: 'P50 = 50th percentile of simulated outcomes' },
    { term: 'P80', definition: 'The conservative risk-informed forecast. There is an estimated 80% chance the final cost will be at or below this value, and a 20% chance it may exceed it.', formula: 'P80 = 80th percentile of simulated forecast outcomes' },
    { term: 'Monte Carlo', definition: 'Transparent uncertainty propagation through repeated simulation draws.', formula: 'Sample uncertain inputs -> outcome distribution' },
    { term: 'Bayesian Updating', definition: 'A method for revising risk estimates when new evidence arrives.', formula: 'Prior + evidence -> posterior' },
    { term: 'SPC', definition: 'Statistical Process Control for monitoring process signals against control thresholds.', formula: 'Observed signal vs. control threshold' },
    { term: 'CUSUM', definition: 'Cumulative Sum logic that detects accumulating drift over time.', formula: 'CUSUM = cumulative deviation signal' },
    { term: 'RFI', definition: 'Request for Information. A formal project question or clarification record.', formula: 'Flagged RFIs contribute to document-risk evidence' },
    { term: 'Submittal', definition: 'A contractor or supplier submission for review.', formula: 'Submittal status can affect schedule and procurement risk' },
    { term: 'Pay Application', definition: 'A request for payment documenting completed work and commercial progress.', formula: 'Pay applications validate cost and progress evidence' },
    { term: 'Document Risk', definition: 'Risk extracted from project records such as RFIs, submittals, procurement notes, QC comments, claims, or meeting minutes.', formula: 'Document evidence -> risk classification -> human review' },
    { term: 'Signal Synthesis', definition: 'The combination of cost, schedule, anomaly, and document evidence into an explainable status.', formula: 'EVM + Bayesian risk + CUSUM + document evidence -> status' },
    { term: 'Governance Recommendation', definition: 'A recommended action path that converts predictive signals into accountable project-control review, escalation, or monitoring steps.', formula: 'Signal -> Evidence -> Threshold -> Explanation -> Consequence -> Action' }
  ];

  return success_('definitions', {
    apiVersion: LIN_API_VERSION,
    definitions: definitions,
    count: definitions.length,
    timestamp: new Date().toISOString()
  });
}

function clearCache_() {
  try {
    CacheService.getScriptCache().remove(cacheKey_('portfolio', LIN_DEFAULT_ROOT_FOLDER_ID));
  } catch (err) {
    // Ignore cache removal errors.
  }
  return success_('clearcache', {
    apiVersion: LIN_API_VERSION,
    message: 'Portfolio cache cleared for default root folder.',
    timestamp: new Date().toISOString()
  });
}

function getCloudFolderIndexInfo_(root) {
  var indexFolder = findDirectFolder_(root, '00_Portfolio_Index');
  var info = {
    found: false,
    parseOk: false,
    parseError: '',
    path: indexFolder ? root.getName() + '/00_Portfolio_Index/cloud_folder_index.json' : ''
  };

  if (!indexFolder) return info;
  var files = indexFolder.getFilesByName('cloud_folder_index.json');
  if (!files.hasNext()) return info;

  info.found = true;
  try {
    JSON.parse(files.next().getBlob().getDataAsString());
    info.parseOk = true;
  } catch (err) {
    info.parseError = err && err.message ? err.message : String(err);
  }
  return info;
}

function scanProjectFolders_(root) {
  var out = {
    categories: [],
    projects: []
  };

  for (var i = 0; i < LIN_CATEGORY_FOLDERS.length; i++) {
    var category = LIN_CATEGORY_FOLDERS[i];
    var categoryFolder = findDirectFolder_(root, category.folderName);
    var categoryInfo = {
      folderName: category.folderName,
      type: category.type,
      found: Boolean(categoryFolder),
      projectCount: 0
    };

    if (categoryFolder) {
      var folders = categoryFolder.getFolders();
      while (folders.hasNext()) {
        var folder = folders.next();
        var folderName = folder.getName();
        var code = extractProjectCode_(folderName);
        if (!code) continue;
        var project = {
          code: code,
          type: category.type,
          folderId: folder.getId(),
          folderName: folderName,
          path: category.folderName + '/' + folderName,
          folder: folder
        };
        out.projects.push(project);
        categoryInfo.projectCount++;
      }
    }
    out.categories.push(categoryInfo);
  }
  return out;
}

function inspectProjectFolderObject_(folder, code, path) {
  var result = {
    code: String(code || '').toUpperCase(),
    folderFound: Boolean(folder),
    folderId: folder ? folder.getId() : '',
    folderName: folder ? folder.getName() : '',
    path: path || '',
    explainabilityFolderFound: false,
    explainabilityFiles: expectedFileResultsFromSet_({}, LIN_EXPECTED.explainabilityFiles),
    explainabilityFound: false,
    auditFolderFound: false,
    auditFiles: expectedFileResultsFromSet_({}, LIN_EXPECTED.auditFiles),
    auditTrailsFound: false
  };

  if (!folder) return result;

  var explainFolder = findNestedFolder_(folder, ['06_Model_Outputs', '06_Explainability']);
  var explainSet = fileSet_(explainFolder);
  result.explainabilityFolderFound = Boolean(explainFolder);
  result.explainabilityFiles = expectedFileResultsFromSet_(explainSet, LIN_EXPECTED.explainabilityFiles);
  result.explainabilityFound = allExpectedFound_(result.explainabilityFiles);

  var auditFolder = findNestedFolder_(folder, ['08_Audit_Trails']);
  var auditSet = fileSet_(auditFolder);
  result.auditFolderFound = Boolean(auditFolder);
  result.auditFiles = expectedFileResultsFromSet_(auditSet, LIN_EXPECTED.auditFiles);
  result.auditTrailsFound = allExpectedFound_(result.auditFiles);

  return result;
}

function findProjectFolderByCode_(root, code) {
  var upper = String(code || '').toUpperCase();
  var categoryIndex = categoryIndexForCode_(upper);
  var firstPass = categoryIndex >= 0 ? [LIN_CATEGORY_FOLDERS[categoryIndex]] : [];
  var secondPass = [];
  for (var i = 0; i < LIN_CATEGORY_FOLDERS.length; i++) {
    if (i !== categoryIndex) secondPass.push(LIN_CATEGORY_FOLDERS[i]);
  }
  var categories = firstPass.concat(secondPass);

  for (var j = 0; j < categories.length; j++) {
    var category = categories[j];
    var categoryFolder = findDirectFolder_(root, category.folderName);
    if (!categoryFolder) continue;
    var folders = categoryFolder.getFolders();
    while (folders.hasNext()) {
      var folder = folders.next();
      if (String(folder.getName()).toUpperCase().indexOf(upper) === 0) {
        return {
          folder: folder,
          path: category.folderName + '/' + folder.getName(),
          type: category.type
        };
      }
    }
  }
  return null;
}

function findDirectFolder_(folder, name) {
  if (!folder) return null;
  var folders = folder.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function findNestedFolder_(folder, pathParts) {
  var current = folder;
  for (var i = 0; i < pathParts.length; i++) {
    if (!current) return null;
    current = findDirectFolder_(current, pathParts[i]);
  }
  return current;
}

function fileSet_(folder) {
  var out = {};
  if (!folder) return out;
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    out[file.getName()] = {
      name: file.getName(),
      id: file.getId(),
      mimeType: file.getMimeType()
    };
  }
  return out;
}

function expectedFileResultsFromSet_(fileSet, expectedNames) {
  var results = [];
  for (var i = 0; i < expectedNames.length; i++) {
    var name = expectedNames[i];
    var hit = fileSet && fileSet[name] ? fileSet[name] : null;
    results.push({
      name: name,
      found: Boolean(hit),
      fileId: hit ? hit.id : ''
    });
  }
  return results;
}

function fileSetToList_(fileSet) {
  var out = [];
  for (var name in fileSet) {
    if (Object.prototype.hasOwnProperty.call(fileSet, name)) out.push(fileSet[name]);
  }
  out.sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
  return out;
}

function allExpectedFound_(results) {
  if (!results || results.length === 0) return false;
  for (var i = 0; i < results.length; i++) {
    if (!results[i].found) return false;
  }
  return true;
}

function summarizeProjects_(projects) {
  var counts = {
    total: projects.length,
    types: { Design: 0, Construction: 0, Combined: 0 },
    statuses: { GREEN: 0, AMBER: 0, RED: 0 },
    averageHealth: 0
  };

  var healthTotal = 0;
  for (var i = 0; i < projects.length; i++) {
    var type = normalizeType_(projects[i].type);
    var status = normalizeStatus_(projects[i].status);
    counts.types[type] = (counts.types[type] || 0) + 1;
    counts.statuses[status] = (counts.statuses[status] || 0) + 1;
    healthTotal += numberOr_(projects[i].health, 0);
  }
  counts.averageHealth = projects.length ? Math.round(healthTotal / projects.length) : 0;
  return counts;
}

function findRosterProject_(projectId) {
  var upper = String(projectId || '').toUpperCase();
  for (var i = 0; i < LIN_ROSTER.length; i++) {
    if (LIN_ROSTER[i].code === upper) return shallowClone_(LIN_ROSTER[i]);
  }
  return null;
}

function mapByCode_(projects) {
  var map = {};
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].code) map[projects[i].code] = projects[i];
  }
  return map;
}

function extractProjectCode_(value) {
  var match = String(value || '').match(/SYN-(DES|CON|CMB)-\d{3}/i);
  return match ? match[0].toUpperCase() : '';
}

function categoryIndexForCode_(code) {
  var upper = String(code || '').toUpperCase();
  if (upper.indexOf('SYN-DES-') === 0) return 0;
  if (upper.indexOf('SYN-CON-') === 0) return 1;
  if (upper.indexOf('SYN-CMB-') === 0) return 2;
  return -1;
}

function normalizeStatus_(status) {
  var clean = String(status || '').toUpperCase();
  if (clean.indexOf('RED') >= 0) return 'RED';
  if (clean.indexOf('AMBER') >= 0 || clean.indexOf('YELLOW') >= 0) return 'AMBER';
  if (clean.indexOf('GREEN') >= 0) return 'GREEN';
  return 'GREEN';
}

function normalizeType_(type) {
  var clean = String(type || '').toLowerCase();
  if (clean.indexOf('combined') >= 0 || clean.indexOf('cmb') >= 0) return 'Combined';
  if (clean.indexOf('construction') >= 0 || clean.indexOf('con') >= 0) return 'Construction';
  return 'Design';
}

function numberOr_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : fallback;
}

function shallowClone_(obj) {
  var clone = {};
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) clone[key] = obj[key];
  }
  return clone;
}

function elapsedMs_(started) {
  return new Date().getTime() - started.getTime();
}

function cacheKey_(name, rootId) {
  return 'lin4a_' + String(name || 'x') + '_' + String(rootId || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 80);
}

function putCacheSafely_(key, payload, seconds) {
  try {
    var text = JSON.stringify(payload);
    if (text.length < 95000) CacheService.getScriptCache().put(key, text, seconds || 600);
  } catch (err) {
    // Cache is optional. Ignore cache errors.
  }
}

function updateProject_(rootId, body) {
  var projectCode = String(body.projectCode || '').toUpperCase();
  if (!projectCode) return errorPayload_('Missing projectCode in request body.', 'update');

  var root = DriveApp.getFolderById(rootId);
  var folderInfo = findProjectFolderByCode_(root, projectCode);
  if (!folderInfo || !folderInfo.folder) {
    return errorPayload_('Project folder not found for code: ' + projectCode, 'update');
  }

  var auditFolder = findNestedFolder_(folderInfo.folder, ['08_Audit_Trails']);
  if (!auditFolder) {
    return errorPayload_('08_Audit_Trails subfolder not found for: ' + projectCode, 'update');
  }

  var files = auditFolder.getFilesByName('calculation_trace.json');
  if (!files.hasNext()) {
    return errorPayload_('calculation_trace.json not found in 08_Audit_Trails for: ' + projectCode, 'update');
  }
  var file = files.next();

  var existing = {};
  try {
    existing = JSON.parse(file.getBlob().getDataAsString());
  } catch (parseErr) {
    existing = {};
  }

  var ALLOWED_FIELDS = [
    'projectCode', 'cpi', 'spi', 'bacM', 'p50EacM', 'p80EacM',
    'posteriorRisk', 'cusum', 'flaggedRfis', 'conflicts', 'health', 'status'
  ];

  var updated = shallowClone_(existing);
  for (var i = 0; i < ALLOWED_FIELDS.length; i++) {
    var field = ALLOWED_FIELDS[i];
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updated[field] = body[field];
    }
  }
  updated._lastUpdated = new Date().toISOString();
  updated._updatedBy = 'Lin-update-endpoint';

  file.setContent(JSON.stringify(updated, null, 2));

  return {
    ok: true,
    action: 'update',
    updated: projectCode,
    fileId: file.getId(),
    timestamp: new Date().toISOString()
  };
}

function createProject_(rootId, body) {
  var type = body.projectType; // Design, Construction, Combined
  var projectName = body.projectName;
  var cpi = body.cpi !== undefined ? Number(body.cpi) : 1.00;
  var spi = body.spi !== undefined ? Number(body.spi) : 1.00;
  var bacM = body.bacM !== undefined ? Number(body.bacM) : 0;
  var health = body.health !== undefined ? Number(body.health) : 0;
  var posteriorRisk = body.posteriorRisk !== undefined ? Number(body.posteriorRisk) : 0;
  var cusum = body.cusum !== undefined ? Number(body.cusum) : 0;
  var flaggedRfis = body.flaggedRfis !== undefined ? Number(body.flaggedRfis) : 0;
  var conflicts = body.conflicts !== undefined ? Number(body.conflicts) : 0;
  var status = 'PENDING';
  var p50EacM = Math.round((bacM / cpi) * 1000) / 1000;
  var p80EacM = Math.round((bacM / cpi) * 1.05 * 1000) / 1000;

  if (!type || !projectName) return { ok: false, error: 'projectType and projectName are required' };

  // Auto-generate project code
  var tokenMap = { Design: 'DES', Construction: 'CON', Combined: 'CMB' };
  var token = tokenMap[type];
  if (!token) return { ok: false, error: 'Invalid projectType. Must be Design, Construction, or Combined.' };

  // Find highest existing code number for this type
  var maxNum = 0;
  for (var i = 0; i < LIN_ROSTER.length; i++) {
    var existing = LIN_ROSTER[i].code;
    if (existing.indexOf('SYN-' + token + '-') === 0) {
      var num = parseInt(existing.split('-')[2], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  // Also scan Drive for archived projects with higher numbers
  var rootFolder = DriveApp.getFolderById(rootId);
  var archiveFolder = findDirectFolder_(rootFolder, '00_Archive');
  if (archiveFolder) {
    var archiveFolders = archiveFolder.getFolders();
    while (archiveFolders.hasNext()) {
      var af = archiveFolders.next();
      var aCode = extractProjectCode_(af.getName());
      if (aCode && aCode.indexOf('SYN-' + token + '-') === 0) {
        var aNum = parseInt(aCode.split('-')[2], 10);
        if (aNum > maxNum) maxNum = aNum;
      }
    }
  }
  var nextNum = maxNum + 1;
  var code = 'SYN-' + token + '-' + (nextNum < 10 ? '00' + nextNum : nextNum < 100 ? '0' + nextNum : nextNum);

  // Find category folder
  var categoryFolderName = type === 'Design' ? '01_Design_Only_Projects' :
    type === 'Construction' ? '02_Construction_Only_Projects' :
    '03_Combined_Design_Construction_Projects';
  var categoryFolder = findDirectFolder_(rootFolder, categoryFolderName);
  if (!categoryFolder) return { ok: false, error: 'Category folder not found: ' + categoryFolderName };

  // Create project folder
  var projectFolderName = code + '_' + projectName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '_');
  var projectFolder = categoryFolder.createFolder(projectFolderName);

  // Create 9 subfolders
  var subfolders = [
    '00_Project_Profile',
    '01_Project_Management',
    '02_Design_Record',
    '03_Construction_Administration',
    '04_Cost_EVM_Schedule',
    '05_Document_Risk_Source',
    '06_Model_Outputs',
    '07_Governance_Decision_Card',
    '08_Audit_Trails'
  ];
  var folderIds = {};
  for (var s = 0; s < subfolders.length; s++) {
    var sf = projectFolder.createFolder(subfolders[s]);
    folderIds[subfolders[s]] = sf.getId();
  }

  // Create template files
  var profileFolder = projectFolder.getFoldersByName('00_Project_Profile').next();
  profileFolder.createFile('project_profile.json', JSON.stringify({
    code: code,
    projectName: projectName,
    type: type,
    status: status,
    health: health,
    createdAt: new Date().toISOString(),
    createdBy: 'Lin HUD'
  }, null, 2), 'application/json');

  var auditFolder = projectFolder.getFoldersByName('08_Audit_Trails').next();
  var calcTrace = {
    code: code,
    cpi: cpi,
    spi: spi,
    bacM: bacM,
    p50EacM: p50EacM,
    p80EacM: p80EacM,
    health: health,
    status: status,
    posteriorRisk: posteriorRisk,
    cusum: cusum,
    flaggedRfis: flaggedRfis,
    conflicts: conflicts,
    _createdAt: new Date().toISOString(),
    _createdBy: 'Lin HUD createProject endpoint'
  };
  auditFolder.createFile('calculation_trace.json', JSON.stringify(calcTrace, null, 2), 'application/json');
  auditFolder.createFile('run_log.json', JSON.stringify([{
    event: 'project_created',
    projectCode: code,
    projectName: projectName,
    createdBy: 'Lin HUD',
    timestamp: new Date().toISOString()
  }], null, 2), 'application/json');

  // Add to LIN_ROSTER in memory for this request
  LIN_ROSTER.push({
    code: code,
    projectName: projectName,
    type: type,
    status: status,
    health: health,
    cpi: cpi,
    spi: spi,
    bacM: bacM,
    p50EacM: p50EacM,
    p80EacM: p80EacM,
    posteriorRisk: posteriorRisk,
    cusum: cusum,
    flaggedRfis: flaggedRfis,
    conflicts: conflicts
  });

  // Clear portfolio cache
  try { CacheService.getScriptCache().remove(cacheKey_('portfolio', rootId)); } catch(e) {}

  return {
    ok: true,
    created: true,
    code: code,
    projectName: projectName,
    type: type,
    status: status,
    folderId: projectFolder.getId(),
    folderName: projectFolderName,
    timestamp: new Date().toISOString()
  };
}

function archiveProject_(rootId, body) {
  var code = body.projectCode;
  var reason = body.reason || 'Archived via Lin HUD';
  if (!code) return { ok: false, error: 'projectCode is required' };

  var rootFolder = DriveApp.getFolderById(rootId);
  var folderInfo = findProjectFolderByCode_(rootFolder, code);
  if (!folderInfo) return { ok: false, error: 'Project folder not found: ' + code };

  // Create 00_Archive folder if it does not exist
  var archiveFolder = findDirectFolder_(rootFolder, '00_Archive');
  if (!archiveFolder) archiveFolder = rootFolder.createFolder('00_Archive');

  // Move project folder to archive
  var projectFolder = folderInfo.folder;
  archiveFolder.addFile(DriveApp.getFileById(projectFolder.getId()));
  // Remove from original category folder
  var categoryFolder = findDirectFolder_(rootFolder, folderInfo.path.split('/')[0]);
  if (categoryFolder) {
    try { categoryFolder.removeFile(DriveApp.getFileById(projectFolder.getId())); } catch(e) {}
  }

  // Write archive record to audit trail
  var auditFolder = findNestedFolder_(projectFolder, ['08_Audit_Trails']);
  if (auditFolder) {
    var logFiles = auditFolder.getFilesByName('run_log.json');
    var runLog = [];
    if (logFiles.hasNext()) {
      try { runLog = JSON.parse(logFiles.next().getBlob().getDataAsString()); } catch(e) {}
    }
    runLog.push({
      event: 'project_archived',
      projectCode: code,
      reason: reason,
      archivedBy: 'Lin HUD',
      timestamp: new Date().toISOString()
    });
    var token = ScriptApp.getOAuthToken();
    var existingLog = auditFolder.getFilesByName('run_log.json');
    if (existingLog.hasNext()) {
      var logFile = existingLog.next();
      UrlFetchApp.fetch(
        'https://www.googleapis.com/upload/drive/v3/files/' + logFile.getId() + '?uploadType=media',
        {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          payload: JSON.stringify(runLog, null, 2),
          muteHttpExceptions: true
        }
      );
    }
  }

  // Clear portfolio cache
  try { CacheService.getScriptCache().remove(cacheKey_('portfolio', rootId)); } catch(e) {}

  return {
    ok: true,
    archived: true,
    code: code,
    reason: reason,
    timestamp: new Date().toISOString()
  };
}

function chatProject_(rootId, body) {
  var question = body.question;
  var projectCode = body.projectCode || null;
  if (!question) return { ok: false, error: 'question is required' };

  var apiKey = PropertiesService.getScriptProperties()
    .getProperty('GROQ_API_KEY');
  if (!apiKey) return { ok: false, error: 'GROQ_API_KEY not set' };

  var context = '';
  if (projectCode) {
    var p = findRosterProject_(projectCode);
    if (p) context = 'Project context:\n' + JSON.stringify(p, null, 2);
  } else {
    var summary = {
      totalProjects: LIN_ROSTER.length,
      projects: LIN_ROSTER.map(function(p) {
        return {
          code: p.code, name: p.projectName, type: p.type,
          status: p.status, health: p.health, cpi: p.cpi,
          spi: p.spi, bacM: p.bacM, p50EacM: p.p50EacM,
          p80EacM: p.p80EacM, posteriorRisk: p.posteriorRisk,
          flaggedRfis: p.flaggedRfis, conflicts: p.conflicts
        };
      })
    };
    context = 'Portfolio context:\n' + JSON.stringify(summary, null, 2);
  }

  var response = UrlFetchApp.fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      payload: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are Lin, an AI project controls assistant for a public capital program portfolio. Answer concisely and accurately based only on the provided context. If the answer is not in the context, say so.' },
          { role: 'user', content: context + '\n\nQuestion: ' + question }
        ],
        temperature: 0.2,
        max_tokens: 512
      }),
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200) {
    return { ok: false, error: 'Groq error ' + response.getResponseCode() +
      ': ' + response.getContentText().substring(0,200) };
  }

  try {
    var result = JSON.parse(response.getContentText());
    var answer = result.choices[0].message.content;
    return {
      ok: true, question: question, answer: answer,
      projectCode: projectCode || 'portfolio',
      timestamp: new Date().toISOString()
    };
  } catch(e) {
    return { ok: false, error: 'Parse error: ' + e.message };
  }
}

function output_(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback) {
    var safeCallback = sanitizeCallback_(callback);
    return ContentService
      .createTextOutput(safeCallback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeCallback_(callback) {
  var name = String(callback || 'callback');
  if (/^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(name)) return name;
  return 'callback';
}

function success_(action, data) {
  return {
    ok: true,
    action: action,
    data: data
  };
}

function errorPayload_(message, action) {
  return {
    ok: false,
    action: action,
    error: {
      message: message
    },
    timestamp: new Date().toISOString(),
    apiVersion: LIN_API_VERSION
  };
}
