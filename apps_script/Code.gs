/**
 * Lin Phase 4A Apps Script bridge
 * ------------------------------------------------------------
 * Purpose:
 *   Read the synthetic Lin_Demo_Data_v0_2 cloud folder from Google Drive,
 *   locate 00_Portfolio_Index/cloud_folder_index.json, inspect the 12
 *   synthetic project folders, and return smoke-test JSON/JSONP to the
 *   GitHub Pages HUD frontend.
 *
 * Security note:
 *   This script is a read-only ingestion smoke-test bridge for synthetic
 *   demo data. Do not place Gemini, Groq, OpenAI, Claude, or other API keys
 *   in browser JavaScript. Later model keys should live server-side in
 *   PropertiesService or another backend.
 */

var LIN_DEFAULT_ROOT_FOLDER_ID = '14u6LT8E1xKBLbHwq90SySmfou0oVlSqR';
var LIN_API_VERSION = 'lin-phase4a-apps-script-v0.1';

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

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || 'health').toLowerCase();
  var rootId = params.rootId || LIN_DEFAULT_ROOT_FOLDER_ID;

  try {
    var payload;
    if (action === 'health') {
      payload = getHealth_(rootId);
    } else if (action === 'portfolio') {
      payload = getPortfolio_(rootId);
    } else if (action === 'project') {
      payload = getProject_(rootId, params.id || params.projectId || '');
    } else if (action === 'audit') {
      payload = getAudit_(rootId, params.id || params.projectId || '');
    } else if (action === 'definitions') {
      payload = getDefinitions_();
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
  Logger.log(JSON.stringify(getPortfolio_(LIN_DEFAULT_ROOT_FOLDER_ID), null, 2));
}

function getHealth_(rootId) {
  var root = DriveApp.getFolderById(rootId);
  return success_('health', {
    apiVersion: LIN_API_VERSION,
    rootFolderDetected: true,
    rootFolderId: rootId,
    rootFolderName: root.getName(),
    expectedRootFolderName: LIN_EXPECTED.rootName,
    timestamp: new Date().toISOString(),
    endpoints: [
      '?action=health',
      '?action=portfolio',
      '?action=project&id=SYN-DES-001',
      '?action=audit&id=SYN-DES-001',
      '?action=definitions'
    ]
  });
}

function getPortfolio_(rootId) {
  var root = DriveApp.getFolderById(rootId);
  var indexFile = findFileByNameRecursive_(root, 'cloud_folder_index.json', 5);
  var indexJson = null;
  var indexParseError = null;

  if (indexFile.found) {
    try {
      indexJson = JSON.parse(indexFile.file.getBlob().getDataAsString());
    } catch (err) {
      indexParseError = err && err.message ? err.message : String(err);
    }
  }

  var projectsByCode = {};
  mergeProjectList_(projectsByCode, scanProjectFolders_(root), 'folder_scan');

  if (indexJson) {
    var extracted = [];
    extractProjectObjects_(indexJson, extracted, 0);
    mergeProjectList_(projectsByCode, extracted, 'cloud_folder_index_json');
  }

  mergeProjectList_(projectsByCode, readCsvRecordsIfFound_(root, 'portfolio_register.csv'), 'portfolio_register_csv');
  mergeProjectList_(projectsByCode, readCsvRecordsIfFound_(root, 'project_status_summary.csv'), 'project_status_summary_csv');
  mergeProjectList_(projectsByCode, readCsvRecordsIfFound_(root, 'portfolio_explainability_summary.csv'), 'portfolio_explainability_summary_csv');

  var projects = mapToProjectList_(projectsByCode);
  projects.sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); });

  var explainAll = projects.length > 0;
  var auditAll = projects.length > 0;
  var projectChecks = [];

  for (var i = 0; i < projects.length; i++) {
    var check = inspectProjectFolder_(root, projects[i]);
    projects[i].folderId = projects[i].folderId || check.folderId || '';
    projects[i].path = projects[i].path || check.path || '';
    projects[i].explainabilityFound = check.explainabilityFound;
    projects[i].auditTrailsFound = check.auditTrailsFound;
    projectChecks.push(check);
    if (!check.explainabilityFound) explainAll = false;
    if (!check.auditTrailsFound) auditAll = false;
  }

  var counts = summarizeProjects_(projects);
  var ready = Boolean(
    root.getName() === LIN_EXPECTED.rootName &&
    indexFile.found &&
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

  return success_('portfolio', {
    apiVersion: LIN_API_VERSION,
    rootFolderDetected: true,
    rootFolderId: rootId,
    rootFolderName: root.getName(),
    cloudFolderIndexFound: indexFile.found,
    cloudFolderIndexPath: indexFile.path || '',
    cloudFolderIndexParseError: indexParseError,
    projects: projects,
    counts: counts,
    explainabilityFilesFound: explainAll,
    auditTrailsFound: auditAll,
    readyForPhase4B: ready,
    projectChecks: projectChecks,
    expected: LIN_EXPECTED,
    timestamp: new Date().toISOString()
  });
}

function getProject_(rootId, projectId) {
  if (!projectId) return errorPayload_('Missing project id.', 'project');

  var portfolio = getPortfolio_(rootId);
  var data = portfolio.data;
  var projects = data.projects || [];
  var selected = null;
  for (var i = 0; i < projects.length; i++) {
    if (String(projects[i].code).toUpperCase() === String(projectId).toUpperCase()) {
      selected = projects[i];
      break;
    }
  }

  if (!selected) return errorPayload_('Project not found: ' + projectId, 'project');

  var root = DriveApp.getFolderById(rootId);
  var check = inspectProjectFolder_(root, selected);
  selected.folderInspection = check;

  return success_('project', {
    apiVersion: LIN_API_VERSION,
    project: selected,
    timestamp: new Date().toISOString()
  });
}

function getAudit_(rootId, projectId) {
  if (!projectId) return errorPayload_('Missing project id.', 'audit');

  var root = DriveApp.getFolderById(rootId);
  var folder = findProjectFolderByCode_(root, projectId);
  if (!folder) return errorPayload_('Project folder not found for audit endpoint: ' + projectId, 'audit');

  var auditFolder = findNestedFolder_(folder, ['08_Audit_Trails']);
  var auditFiles = auditFolder ? listFiles_(auditFolder) : [];
  var expectedResults = expectedFileResults_(auditFolder, LIN_EXPECTED.auditFiles);
  var allFound = allExpectedFound_(expectedResults);

  return success_('audit', {
    apiVersion: LIN_API_VERSION,
    projectId: projectId,
    auditFolderFound: Boolean(auditFolder),
    auditFiles: auditFiles,
    expectedAuditFiles: expectedResults,
    auditTrailsFound: allFound,
    timestamp: new Date().toISOString()
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

function scanProjectFolders_(root) {
  var categories = [
    { folderName: '01_Design_Only_Projects', type: 'Design' },
    { folderName: '02_Construction_Only_Projects', type: 'Construction' },
    { folderName: '03_Combined_Design_Construction_Projects', type: 'Combined' }
  ];

  var projects = [];
  for (var i = 0; i < categories.length; i++) {
    var category = categories[i];
    var categoryFolder = findDirectFolder_(root, category.folderName);
    if (!categoryFolder) continue;

    var folders = categoryFolder.getFolders();
    while (folders.hasNext()) {
      var folder = folders.next();
      var name = folder.getName();
      var match = name.match(/^(SYN-(DES|CON|CMB)-\d{3})[_\s-]*(.*)$/i);
      if (!match) continue;
      projects.push({
        code: match[1].toUpperCase(),
        projectName: titleFromFolderName_(match[3] || match[1]),
        type: category.type,
        folderId: folder.getId(),
        folderName: name,
        path: category.folderName + '/' + name,
        source: 'folder_scan'
      });
    }
  }
  return projects;
}

function inspectProjectFolder_(root, project) {
  var folder = null;
  if (project.folderId) {
    try {
      folder = DriveApp.getFolderById(project.folderId);
    } catch (err) {
      folder = null;
    }
  }
  if (!folder && project.code) folder = findProjectFolderByCode_(root, project.code);

  var result = {
    code: project.code || '',
    folderFound: Boolean(folder),
    folderId: folder ? folder.getId() : '',
    folderName: folder ? folder.getName() : '',
    path: project.path || '',
    explainabilityFolderFound: false,
    explainabilityFiles: [],
    explainabilityFound: false,
    auditFolderFound: false,
    auditFiles: [],
    auditTrailsFound: false
  };

  if (!folder) return result;

  var explainFolder = findNestedFolder_(folder, ['06_Model_Outputs', '06_Explainability']);
  result.explainabilityFolderFound = Boolean(explainFolder);
  result.explainabilityFiles = expectedFileResults_(explainFolder, LIN_EXPECTED.explainabilityFiles);
  result.explainabilityFound = allExpectedFound_(result.explainabilityFiles);

  var auditFolder = findNestedFolder_(folder, ['08_Audit_Trails']);
  result.auditFolderFound = Boolean(auditFolder);
  result.auditFiles = expectedFileResults_(auditFolder, LIN_EXPECTED.auditFiles);
  result.auditTrailsFound = allExpectedFound_(result.auditFiles);

  return result;
}

function findProjectFolderByCode_(root, code) {
  var upper = String(code || '').toUpperCase();
  var categories = ['01_Design_Only_Projects', '02_Construction_Only_Projects', '03_Combined_Design_Construction_Projects'];
  for (var i = 0; i < categories.length; i++) {
    var categoryFolder = findDirectFolder_(root, categories[i]);
    if (!categoryFolder) continue;
    var folders = categoryFolder.getFolders();
    while (folders.hasNext()) {
      var folder = folders.next();
      if (String(folder.getName()).toUpperCase().indexOf(upper) === 0) return folder;
    }
  }
  return null;
}

function findDirectFolder_(folder, name) {
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

function findFileByNameRecursive_(folder, fileName, maxDepth) {
  var directFiles = folder.getFilesByName(fileName);
  if (directFiles.hasNext()) {
    return { found: true, file: directFiles.next(), path: folder.getName() + '/' + fileName };
  }
  if (maxDepth <= 0) return { found: false };

  var folders = folder.getFolders();
  while (folders.hasNext()) {
    var child = folders.next();
    var found = findFileByNameRecursive_(child, fileName, maxDepth - 1);
    if (found.found) {
      found.path = folder.getName() + '/' + found.path;
      return found;
    }
  }
  return { found: false };
}

function expectedFileResults_(folder, expectedNames) {
  var results = [];
  for (var i = 0; i < expectedNames.length; i++) {
    var name = expectedNames[i];
    var found = false;
    var id = '';
    if (folder) {
      var files = folder.getFilesByName(name);
      if (files.hasNext()) {
        var file = files.next();
        found = true;
        id = file.getId();
      }
    }
    results.push({ name: name, found: found, fileId: id });
  }
  return results;
}

function allExpectedFound_(results) {
  if (!results || results.length === 0) return false;
  for (var i = 0; i < results.length; i++) {
    if (!results[i].found) return false;
  }
  return true;
}

function listFiles_(folder) {
  var filesOut = [];
  if (!folder) return filesOut;
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    filesOut.push({
      name: file.getName(),
      id: file.getId(),
      mimeType: file.getMimeType(),
      updated: file.getLastUpdated().toISOString()
    });
  }
  return filesOut;
}

function readCsvRecordsIfFound_(root, fileName) {
  var found = findFileByNameRecursive_(root, fileName, 5);
  if (!found.found) return [];
  var text = found.file.getBlob().getDataAsString();
  var rows = Utilities.parseCsv(text);
  if (!rows || rows.length < 2) return [];
  var headers = rows[0];
  var records = [];
  for (var i = 1; i < rows.length; i++) {
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      record[headers[j]] = rows[i][j];
    }
    record.source = fileName;
    records.push(record);
  }
  return records;
}

function extractProjectObjects_(value, out, depth) {
  if (depth > 14 || value === null || value === undefined) return;
  if (Object.prototype.toString.call(value) === '[object Array]') {
    for (var i = 0; i < value.length; i++) extractProjectObjects_(value[i], out, depth + 1);
    return;
  }
  if (typeof value !== 'object') return;

  var code = getCodeFromObject_(value);
  if (code) {
    var clone = shallowClone_(value);
    clone.code = clone.code || code;
    clone.source = clone.source || 'cloud_folder_index_json';
    out.push(clone);
  }

  for (var key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      extractProjectObjects_(value[key], out, depth + 1);
    }
  }
}

function getCodeFromObject_(obj) {
  var candidates = ['code', 'project_code', 'projectCode', 'project_id', 'projectId', 'id', 'folder_name', 'folderName', 'path'];
  for (var i = 0; i < candidates.length; i++) {
    var value = getField_(obj, [candidates[i]]);
    var match = String(value || '').match(/SYN-(DES|CON|CMB)-\d{3}/i);
    if (match) return match[0].toUpperCase();
  }
  return '';
}

function mergeProjectList_(map, list, sourceName) {
  if (!list) return;
  for (var i = 0; i < list.length; i++) {
    var normalized = normalizeProject_(list[i]);
    if (!normalized.code) continue;
    normalized.sources = normalized.sources || [];
    normalized.sources.push(sourceName || normalized.source || 'unknown');

    if (!map[normalized.code]) {
      map[normalized.code] = normalized;
    } else {
      map[normalized.code] = mergeProject_(map[normalized.code], normalized);
    }
  }
}

function mergeProject_(existing, incoming) {
  var merged = shallowClone_(existing);
  for (var key in incoming) {
    if (!Object.prototype.hasOwnProperty.call(incoming, key)) continue;
    var value = incoming[key];
    if (key === 'sources') {
      merged.sources = unique_((merged.sources || []).concat(value || []));
    } else if (value !== '' && value !== null && value !== undefined && !(typeof value === 'number' && isNaN(value))) {
      if (merged[key] === '' || merged[key] === null || merged[key] === undefined || key === 'status' || key === 'health' || key === 'cpi' || key === 'spi' || key === 'bacM' || key === 'p50EacM' || key === 'p80EacM' || key === 'posteriorRisk' || key === 'cusum' || key === 'flaggedRfis' || key === 'conflicts') {
        merged[key] = value;
      }
    }
  }
  return merged;
}

function normalizeProject_(raw) {
  var code = getCodeFromObject_(raw);
  var statusRaw = getField_(raw, ['status', 'expected_status', 'expectedStatus', 'health_status', 'healthStatus', 'gar_status', 'garStatus']);
  var typeRaw = getField_(raw, ['type', 'project_type', 'projectType', 'category']);
  var nameRaw = getField_(raw, ['project_name', 'projectName', 'name', 'title', 'folder_name', 'folderName']);

  return {
    code: code,
    projectName: cleanProjectName_(nameRaw, code),
    type: normalizeType_(typeRaw || inferTypeFromCode_(code)),
    status: normalizeStatus_(statusRaw || inferStatusFromHealth_(getNumberField_(raw, ['health', 'health_score', 'healthScore']))),
    health: getNumberField_(raw, ['health', 'health_score', 'healthScore']),
    cpi: getNumberField_(raw, ['cpi', 'CPI']),
    spi: getNumberField_(raw, ['spi', 'SPI']),
    bacM: getNumberField_(raw, ['bac_m', 'bacM', 'BAC_M', 'bac', 'BAC']),
    p50EacM: getNumberField_(raw, ['p50_eac_m', 'p50EacM', 'p50_eac', 'P50_EAC', 'p50']),
    p80EacM: getNumberField_(raw, ['p80_eac_m', 'p80EacM', 'p80_eac', 'P80_EAC', 'p80']),
    posteriorRisk: getNumberField_(raw, ['posterior_risk', 'posteriorRisk', 'risk', 'risk_score']),
    cusum: getNumberField_(raw, ['cusum', 'CUSUM', 'cusum_score']),
    flaggedRfis: getNumberField_(raw, ['flagged_rfis', 'flaggedRfis', 'flaggedRFIs', 'rfis', 'rfi_count']),
    conflicts: getNumberField_(raw, ['conflicts', 'conflict_count', 'conflictCount']),
    folderId: getField_(raw, ['folderId', 'folder_id', 'id']) || '',
    folderName: getField_(raw, ['folderName', 'folder_name']) || '',
    path: getField_(raw, ['path', 'folder_path', 'folderPath']) || '',
    source: getField_(raw, ['source']) || ''
  };
}

function mapToProjectList_(map) {
  var projects = [];
  for (var code in map) {
    if (!Object.prototype.hasOwnProperty.call(map, code)) continue;
    var project = map[code];
    project.status = normalizeStatus_(project.status || inferStatusFromHealth_(project.health));
    project.type = normalizeType_(project.type || inferTypeFromCode_(code));
    if (!project.projectName || project.projectName === code) project.projectName = titleFromFolderName_(project.folderName || code);
    projects.push(project);
  }
  return projects;
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

function getField_(obj, candidates) {
  if (!obj) return '';
  for (var i = 0; i < candidates.length; i++) {
    if (obj[candidates[i]] !== undefined && obj[candidates[i]] !== null && obj[candidates[i]] !== '') return obj[candidates[i]];
  }

  var normalized = {};
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) normalized[normalizeKey_(key)] = obj[key];
  }
  for (var j = 0; j < candidates.length; j++) {
    var candidateKey = normalizeKey_(candidates[j]);
    if (normalized[candidateKey] !== undefined && normalized[candidateKey] !== null && normalized[candidateKey] !== '') return normalized[candidateKey];
  }
  return '';
}

function getNumberField_(obj, candidates) {
  var raw = getField_(obj, candidates);
  if (raw === '' || raw === null || raw === undefined) return 0;
  var cleaned = String(raw).replace(/[$,%]/g, '').trim();
  var number = Number(cleaned);
  return isFinite(number) ? number : 0;
}

function normalizeKey_(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
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

function inferTypeFromCode_(code) {
  var clean = String(code || '').toUpperCase();
  if (clean.indexOf('CMB') >= 0) return 'Combined';
  if (clean.indexOf('CON') >= 0) return 'Construction';
  return 'Design';
}

function inferStatusFromHealth_(health) {
  var value = numberOr_(health, 90);
  if (value <= 49) return 'RED';
  if (value <= 74) return 'AMBER';
  return 'GREEN';
}

function cleanProjectName_(value, code) {
  var raw = String(value || '').trim();
  if (!raw && code) return code;
  if (code && raw.toUpperCase().indexOf(String(code).toUpperCase()) === 0) {
    raw = raw.substring(String(code).length).replace(/^[_\s-]+/, '');
  }
  return titleFromFolderName_(raw || code || 'Project');
}

function titleFromFolderName_(value) {
  return String(value || '')
    .replace(/^SYN-(DES|CON|CMB)-\d{3}[_\s-]*/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function unique_(items) {
  var out = [];
  var seen = {};
  for (var i = 0; i < items.length; i++) {
    var item = String(items[i]);
    if (seen[item]) continue;
    seen[item] = true;
    out.push(item);
  }
  return out;
}
