/*
  Lin Phase 4A configuration
  ------------------------------------------------------------
  1. Apps Script bridge deployed as a web app.
  2. The deployed /exec URL is connected below.
  3. Keep model/API keys out of this file and out of browser JavaScript.
*/

const LIN_CONFIG = {
  driveRootFolderId: "14u6LT8E1xKBLbHwq90SySmfou0oVlSqR",
  appsScriptApiUrl: "https://script.google.com/macros/s/AKfycbzGhRB3htkXMjo1dyUdDNncYnIpOm333dvI51eyLrMBLE1NjtdGlB7Vpmtp7ucxf_Yq/exec",
  transport: "jsonp",
  useSampleDataWhenUnconfigured: true,
  phaseLabel: "Phase 4A",
  dataRootNameExpected: "Lin_Demo_Data_v0_2",
  expectedProjectCount: 12,
  expectedTypeCounts: {
    Design: 4,
    Construction: 4,
    Combined: 4
  },
  expectedStatusCounts: {
    GREEN: 4,
    AMBER: 4,
    RED: 4
  }
};

window.LIN_CONFIG = LIN_CONFIG;
