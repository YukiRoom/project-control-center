/**
 * PROJECT CONTROL CENTER — Google Sheets 読み取り API（Phase 1）
 *
 * - 「総合管理」シートの A〜J 列を JSON で返すだけで、書き込み処理は実装していない。
 * - 注意: appsscript.json の権限は spreadsheets（読み書き可）。
 *   （spreadsheets.readonly では SpreadsheetApp.openById() が権限エラーになったため）
 *   書き込みが起きないのは、このコードに書き込み処理がないことによる。
 * - スクリプト プロパティ ACCESS_KEY を設定すると、閲覧キーを知っている人だけが読み取れる。
 */

var SPREADSHEET_ID = '1fKBxorXoArfhbvyq3K51-gi6A_nYJke2-rtz0GXrrJI';
var SHEET_NAME = '総合管理';

/** 列構成（A〜J）。シートの見出しと一致しない場合はエラーを返し、誤ったデータを表示しない */
var COLUMNS = [
  { key: 'category', header: '大分類' },
  { key: 'name', header: 'プロジェクト／案件' },
  { key: 'status', header: '状態' },
  { key: 'currentState', header: '現在地' },
  { key: 'nextAction', header: '次にやること' },
  { key: 'projectUrl', header: 'プロジェクトURL' },
  { key: 'chatUrl', header: 'メインチャットURL' },
  { key: 'keywords', header: '検索キーワード' },
  { key: 'updatedAt', header: '最終更新日' },
  { key: 'memo', header: 'メモ' },
];

/** ブラウザで URL を開いたときの動作確認用（データは返さない） */
function doGet() {
  return json_({ ok: true, service: 'project-control-center', mode: 'read-only' });
}

/** Web アプリからのリクエスト。本文は JSON 文字列 { action, key } */
function doPost(e) {
  try {
    var request = parseBody_(e);
    if (!isAuthorized_(request.key)) {
      return json_({ ok: false, error: 'UNAUTHORIZED' });
    }
    switch (request.action) {
      case 'list':
        return json_(listProjects_());
      // Phase 2: case 'update': return json_(updateProject_(request));
      default:
        return json_({ ok: false, error: 'UNKNOWN_ACTION', message: '不明な操作です: ' + request.action });
    }
  } catch (error) {
    return json_({ ok: false, error: 'SERVER_ERROR', message: String(error && error.message ? error.message : error) });
  }
}

function listProjects_() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return { ok: false, error: 'SHEET_NOT_FOUND', message: 'シート「' + SHEET_NAME + '」が見つかりません。' };
  }

  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, COLUMNS.length).getDisplayValues()[0];
  var mismatch = COLUMNS.filter(function (column, i) {
    return String(headers[i]).trim() !== column.header;
  });
  if (mismatch.length > 0) {
    return {
      ok: false,
      error: 'HEADER_MISMATCH',
      message: '見出し行が想定と異なります（' + mismatch.map(function (c) { return c.header; }).join('、') + '）。',
    };
  }

  var timeZone = spreadsheet.getSpreadsheetTimeZone();
  var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues() : [];
  var projects = [];
  values.forEach(function (row, index) {
    var isBlank = row.every(function (cell) { return String(cell).trim() === ''; });
    if (isBlank) return;
    var project = { rowNumber: index + 2 };
    COLUMNS.forEach(function (column, i) {
      project[column.key] = toText_(row[i], timeZone);
    });
    projects.push(project);
  });

  return { ok: true, sheet: SHEET_NAME, fetchedAt: new Date().toISOString(), projects: projects };
}

function toText_(value, timeZone) {
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  return value === null || value === undefined ? '' : String(value).trim();
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
}

function isAuthorized_(key) {
  var accessKey = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY');
  if (!accessKey) return true;
  return typeof key === 'string' && key === accessKey;
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/** エディタから実行して読み取り結果をログで確認するためのテスト関数 */
function testListProjects() {
  var result = listProjects_();
  Logger.log(result.ok ? '取得件数: ' + result.projects.length : JSON.stringify(result));
  if (result.ok && result.projects.length > 0) Logger.log(JSON.stringify(result.projects[0]));
}
