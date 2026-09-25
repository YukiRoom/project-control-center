/**
 * PROJECT CONTROL CENTER — Google Sheets API（V3）
 *
 * 読み取り:
 *   - 「総合管理」A〜J（本番台帳）・「プロジェクト管理」・「タスク」を JSON で返す。
 * 書き込み（許可した操作のみ・すべて ACCESS_KEY と LockService で保護）:
 *   - setCategory / setFocus / setGoal                              … 「プロジェクト管理」シート
 *   - addTask / updateTask / toggleTask / deleteTask / reorderTask  … 「タスク」シート
 *   - setChatUrl                                                     … 「総合管理」G列（メインチャットURL）のみ
 *   シート名・行・列・値をクライアントが自由に指定する汎用書き込みは提供しない。
 *
 * 安全策:
 *   - 「総合管理」は G 列以外に書き込まない。行・列の追加／削除／並び替えもしない。
 *   - 対象行はクライアントの行番号ではなく projectKey（案件名から算出）で毎回照合する。
 *   - V3 用シートは自動作成しない。エディタから setupV3Sheets() を手動実行して作る。
 *
 * 注意: appsscript.json の権限は spreadsheets（読み書き可）。
 *   ACCESS_KEY（スクリプト プロパティ）は個人利用向けの簡易認証。
 */

var SPREADSHEET_ID = '1fKBxorXoArfhbvyq3K51-gi6A_nYJke2-rtz0GXrrJI';
var API_VERSION = 3;

var MASTER_SHEET = '総合管理';
var PROJECTS_SHEET = 'プロジェクト管理';
var TASKS_SHEET = 'タスク';

/** 「総合管理」の列構成（A〜J）。見出しが一致しない場合は読み書きしない */
var MASTER_COLUMNS = [
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
var MASTER_CHAT_URL_COLUMN = 7; // G列。V3 で「総合管理」に書き込むのはこの列だけ

var PROJECT_HEADERS = ['projectKey', 'category', 'focus', 'goal', 'createdAt', 'updatedAt', 'projectName'];
var TASK_HEADERS = ['taskId', 'projectKey', 'task', 'completed', 'sortOrder', 'createdAt', 'updatedAt'];

/** V3 カテゴリー。追加する場合はここに 1 行足す（key はシートに保存される値） */
var CATEGORIES = [
  { key: 'BUSINESS', label: 'BUSINESS', emoji: '💼' },
  { key: 'CONTENT', label: 'CONTENT', emoji: '✍️' },
  { key: 'CREATIVE', label: 'CREATIVE', emoji: '🎨' },
  { key: 'SYSTEM', label: 'SYSTEM / APP', emoji: '🤖' },
  { key: 'OTHER', label: 'OTHER', emoji: '📦' },
];

var MAX_FOCUS = 3;
var MAX_GOAL_LENGTH = 300;
var MAX_TASK_LENGTH = 200;
var MAX_TASKS_PER_PROJECT = 100;
var MAX_URL_LENGTH = 2000;

// ───────────────────────── エントリーポイント ─────────────────────────

/** ブラウザで URL を開いたときの動作確認用（データは返さない） */
function doGet() {
  return json_({ ok: true, service: 'project-control-center', apiVersion: API_VERSION });
}

/** 本文は JSON 文字列 { action, key, ... } */
function doPost(e) {
  try {
    var request = parseBody_(e);
    if (!isAuthorized_(request.key)) throw apiError_('UNAUTHORIZED', '閲覧キーが正しくありません。');
    if (request.action === 'list') return json_(buildState_());

    var mutation = Object.prototype.hasOwnProperty.call(MUTATIONS, request.action) ? MUTATIONS[request.action] : null;
    if (!mutation) throw apiError_('UNKNOWN_ACTION', '不明な操作です: ' + request.action);
    // 書き込みは ACCESS_KEY が設定されている場合だけ許可する
    if (!accessKey_()) throw apiError_('WRITE_DISABLED', '書き込みには ACCESS_KEY（スクリプト プロパティ）の設定が必要です。');
    withLock_(function () {
      mutation(request);
    });
    return json_(buildState_());
  } catch (error) {
    if (error && error.apiCode) return json_({ ok: false, error: error.apiCode, message: error.message });
    return json_({ ok: false, error: 'SERVER_ERROR', message: String(error && error.message ? error.message : error) });
  }
}

// ───────────────────────── 読み取り ─────────────────────────

function buildState_() {
  var master = readMaster_();
  var meta = readProjectMeta_();
  var tasks = readTasks_();
  var ready = meta !== null && tasks !== null;

  var masterKeys = {};
  var projects = master.map(function (row) {
    masterKeys[row.projectKey] = true;
    var m = ready ? meta.byKey[row.projectKey] : null;
    return {
      rowNumber: row.rowNumber,
      projectKey: row.projectKey,
      keyConflict: row.keyConflict,
      category: row.values.category,
      name: row.values.name,
      status: row.values.status,
      currentState: row.values.currentState,
      nextAction: row.values.nextAction,
      projectUrl: row.values.projectUrl,
      chatUrl: row.values.chatUrl,
      keywords: row.values.keywords,
      updatedAt: row.values.updatedAt,
      memo: row.values.memo,
      topCategory: m ? m.category : '',
      focus: m ? m.focus : false,
      goal: m ? m.goal : '',
    };
  });

  var orphanCount = 0;
  if (ready) {
    Object.keys(meta.byKey).forEach(function (key) {
      if (!masterKeys[key]) orphanCount++;
    });
  }

  return {
    ok: true,
    apiVersion: API_VERSION,
    fetchedAt: new Date().toISOString(),
    projects: projects,
    tasks: ready
      ? tasks.list
          .filter(function (t) { return masterKeys[t.projectKey]; })
          .map(function (t) {
            return { taskId: t.taskId, projectKey: t.projectKey, task: t.task, completed: t.completed, sortOrder: t.sortOrder };
          })
      : [],
    categories: CATEGORIES,
    v3: { ready: ready, orphanCount: orphanCount, maxFocus: MAX_FOCUS },
  };
}

/** 「総合管理」を読み、各行に projectKey を付ける（書き込みはしない） */
function readMaster_() {
  var ss = spreadsheet_();
  var sheet = ss.getSheetByName(MASTER_SHEET);
  if (!sheet) throw apiError_('SHEET_NOT_FOUND', 'シート「' + MASTER_SHEET + '」が見つかりません。');

  var headers = sheet.getRange(1, 1, 1, MASTER_COLUMNS.length).getDisplayValues()[0];
  var mismatch = MASTER_COLUMNS.filter(function (column, i) {
    return String(headers[i]).trim() !== column.header;
  });
  if (mismatch.length > 0) {
    throw apiError_(
      'HEADER_MISMATCH',
      '「' + MASTER_SHEET + '」の見出し行が想定と異なります（' + mismatch.map(function (c) { return c.header; }).join('、') + '）。',
    );
  }

  var lastRow = sheet.getLastRow();
  var timeZone = ss.getSpreadsheetTimeZone();
  var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, MASTER_COLUMNS.length).getValues() : [];
  var rows = [];
  var keyCount = {};
  values.forEach(function (row, index) {
    var isBlank = row.every(function (cell) { return String(cell).trim() === ''; });
    if (isBlank) return;
    var record = {};
    MASTER_COLUMNS.forEach(function (column, i) {
      record[column.key] = toText_(row[i], timeZone);
    });
    var projectKey = projectKeyFor_(record.name);
    keyCount[projectKey] = (keyCount[projectKey] || 0) + 1;
    rows.push({ rowNumber: index + 2, projectKey: projectKey, values: record });
  });
  rows.forEach(function (row) {
    row.keyConflict = keyCount[row.projectKey] > 1;
  });
  return rows;
}

/** 「プロジェクト管理」。シートがなければ null（未セットアップ） */
function readProjectMeta_() {
  var sheet = spreadsheet_().getSheetByName(PROJECTS_SHEET);
  if (!sheet) return null;
  assertHeaders_(sheet, PROJECT_HEADERS);
  var byKey = {};
  dataRows_(sheet, PROJECT_HEADERS.length).forEach(function (item) {
    var r = item.values;
    var key = String(r[0]).trim();
    if (!key) return;
    byKey[key] = {
      rowNumber: item.rowNumber,
      category: String(r[1]).trim(),
      focus: r[2] === true || String(r[2]).toUpperCase() === 'TRUE',
      goal: String(r[3]),
    };
  });
  return { sheet: sheet, byKey: byKey };
}

/** 「タスク」。シートがなければ null（未セットアップ） */
function readTasks_() {
  var sheet = spreadsheet_().getSheetByName(TASKS_SHEET);
  if (!sheet) return null;
  assertHeaders_(sheet, TASK_HEADERS);
  var list = [];
  dataRows_(sheet, TASK_HEADERS.length).forEach(function (item) {
    var r = item.values;
    var taskId = String(r[0]).trim();
    if (!taskId) return;
    list.push({
      rowNumber: item.rowNumber,
      taskId: taskId,
      projectKey: String(r[1]).trim(),
      task: String(r[2]),
      completed: r[3] === true || String(r[3]).toUpperCase() === 'TRUE',
      sortOrder: Number(r[4]) || 0,
    });
  });
  return { sheet: sheet, list: list };
}

// ───────────────────────── 書き込み（許可した操作のみ） ─────────────────────────

var MUTATIONS = {
  setCategory: function (req) {
    var category = optionalString_(req.category, 'category', 20);
    if (category && !CATEGORIES.some(function (c) { return c.key === category; })) {
      throw apiError_('INVALID_INPUT', '不明なカテゴリーです: ' + category);
    }
    updateMeta_(requireProject_(req.projectKey), { category: category });
  },

  setFocus: function (req) {
    var project = requireProject_(req.projectKey);
    var focus = requireBoolean_(req.focus, 'focus');
    if (focus) {
      var meta = requireV3_().meta;
      var liveKeys = {};
      readMaster_().forEach(function (row) { liveKeys[row.projectKey] = true; });
      var focused = Object.keys(meta.byKey).filter(function (key) {
        return key !== project.projectKey && liveKeys[key] && meta.byKey[key].focus;
      });
      if (focused.length >= MAX_FOCUS) {
        throw apiError_('FOCUS_LIMIT', 'FOCUSは最大' + MAX_FOCUS + '件です。どれかを外してください。');
      }
    }
    updateMeta_(project, { focus: focus });
  },

  setGoal: function (req) {
    var goal = optionalString_(req.goal, 'goal', MAX_GOAL_LENGTH);
    updateMeta_(requireProject_(req.projectKey), { goal: goal });
  },

  addTask: function (req) {
    var project = requireProject_(req.projectKey);
    var text = requiredString_(req.task, 'task', MAX_TASK_LENGTH);
    var tasks = requireV3_().tasks;
    var own = tasks.list.filter(function (t) { return t.projectKey === project.projectKey; });
    if (own.length >= MAX_TASKS_PER_PROJECT) {
      throw apiError_('INVALID_INPUT', 'タスクは1案件につき' + MAX_TASKS_PER_PROJECT + '件までです。');
    }
    var maxOrder = own.reduce(function (max, t) { return Math.max(max, t.sortOrder); }, 0);
    var now = now_();
    tasks.sheet.appendRow([
      't_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16),
      project.projectKey,
      safeText_(text),
      false,
      maxOrder + 1,
      now,
      now,
    ]);
    ensureMeta_(project);
  },

  updateTask: function (req) {
    var found = requireTask_(req.taskId);
    var text = requiredString_(req.task, 'task', MAX_TASK_LENGTH);
    found.sheet.getRange(found.task.rowNumber, 3).setValue(safeText_(text));
    found.sheet.getRange(found.task.rowNumber, 7).setValue(now_());
  },

  toggleTask: function (req) {
    var found = requireTask_(req.taskId);
    var completed = requireBoolean_(req.completed, 'completed');
    found.sheet.getRange(found.task.rowNumber, 4).setValue(completed);
    found.sheet.getRange(found.task.rowNumber, 7).setValue(now_());
  },

  deleteTask: function (req) {
    var found = requireTask_(req.taskId);
    // 削除するのは「タスク」シートの該当 1 行だけ
    found.sheet.deleteRow(found.task.rowNumber);
  },

  reorderTask: function (req) {
    var found = requireTask_(req.taskId);
    var direction = req.direction;
    if (direction !== 'up' && direction !== 'down') throw apiError_('INVALID_INPUT', 'direction は up / down です。');
    var siblings = found.all
      .filter(function (t) { return t.projectKey === found.task.projectKey; })
      .sort(function (a, b) { return a.sortOrder - b.sortOrder || a.rowNumber - b.rowNumber; });
    var index = siblings.findIndex(function (t) { return t.taskId === found.task.taskId; });
    var target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return;
    var moved = siblings.splice(index, 1)[0];
    siblings.splice(target, 0, moved);
    // 並び順を 1..n に振り直す（sortOrder・updatedAt 列だけを更新）
    var now = now_();
    siblings.forEach(function (t, i) {
      if (t.sortOrder !== i + 1) {
        found.sheet.getRange(t.rowNumber, 5).setValue(i + 1);
        found.sheet.getRange(t.rowNumber, 7).setValue(now);
      }
    });
  },

  /** 「総合管理」G列（メインチャットURL）だけを書き換える */
  setChatUrl: function (req) {
    var project = requireProject_(req.projectKey);
    var url = typeof req.url === 'string' ? req.url.trim() : '';
    if (url === '') {
      if (req.clear !== true) throw apiError_('INVALID_INPUT', 'URLが空です。削除する場合は「リンクを削除」を使ってください。');
    } else if (url.length > MAX_URL_LENGTH || /\s/.test(url) || !/^https:\/\/[^/\s]+/i.test(url)) {
      throw apiError_('INVALID_INPUT', 'https:// で始まる正しいURLを入力してください。');
    }
    // 別の端末で先に変更されていないか確認（楽観ロック）
    var expected = typeof req.expectedUrl === 'string' ? req.expectedUrl.trim() : '';
    if (project.values.chatUrl !== expected) {
      throw apiError_('CONFLICT', 'この案件のチャットURLは別の場所で変更されています。再読み込みしてから操作してください。');
    }
    var sheet = spreadsheet_().getSheetByName(MASTER_SHEET);
    sheet.getRange(project.rowNumber, MASTER_CHAT_URL_COLUMN).setValue(url);
  },
};

/** projectKey に一致する「総合管理」の行を毎回読み直して特定する（行番号は信用しない） */
function requireProject_(projectKey) {
  if (typeof projectKey !== 'string' || !/^pk_[0-9a-f]{12}$/.test(projectKey)) {
    throw apiError_('INVALID_INPUT', 'projectKey が正しくありません。');
  }
  var matches = readMaster_().filter(function (row) { return row.projectKey === projectKey; });
  if (matches.length === 0) throw apiError_('NOT_FOUND', '案件が見つかりません。再読み込みしてください。');
  if (matches.length > 1) {
    throw apiError_('KEY_CONFLICT', '同じ案件名が複数行あるため更新できません。「' + MASTER_SHEET + '」の案件名を区別してください。');
  }
  return matches[0];
}

function requireV3_() {
  var meta = readProjectMeta_();
  var tasks = readTasks_();
  if (meta === null || tasks === null) {
    throw apiError_('SETUP_REQUIRED', 'V3 用シートがありません。Apps Script エディタで setupV3Sheets を実行してください。');
  }
  return { meta: meta, tasks: tasks };
}

function requireTask_(taskId) {
  if (typeof taskId !== 'string' || !/^t_[0-9a-f]{16}$/.test(taskId)) {
    throw apiError_('INVALID_INPUT', 'taskId が正しくありません。');
  }
  var tasks = requireV3_().tasks;
  var task = tasks.list.find(function (t) { return t.taskId === taskId; });
  if (!task) throw apiError_('NOT_FOUND', 'タスクが見つかりません。再読み込みしてください。');
  return { sheet: tasks.sheet, task: task, all: tasks.list };
}

/** 「プロジェクト管理」に案件の行がなければ追加して行番号を返す */
function ensureMeta_(project) {
  var meta = requireV3_().meta;
  var existing = meta.byKey[project.projectKey];
  if (existing) return existing.rowNumber;
  var now = now_();
  meta.sheet.appendRow([project.projectKey, '', false, '', now, now, safeText_(project.values.name)]);
  return meta.sheet.getLastRow();
}

function updateMeta_(project, patch) {
  var sheet = requireV3_().meta.sheet;
  var row = ensureMeta_(project);
  if ('category' in patch) sheet.getRange(row, 2).setValue(patch.category);
  if ('focus' in patch) sheet.getRange(row, 3).setValue(patch.focus);
  if ('goal' in patch) sheet.getRange(row, 4).setValue(safeText_(patch.goal));
  sheet.getRange(row, 6).setValue(now_());
  sheet.getRange(row, 7).setValue(safeText_(project.values.name)); // 参考用に最新の案件名を記録
}

// ───────────────────────── セットアップ（手動実行） ─────────────────────────

/**
 * V3 用の「プロジェクト管理」「タスク」シートを作成する。
 * 既に存在するシートには一切触れない。「総合管理」などの既存シートも変更しない。
 * Apps Script エディタで関数 setupV3Sheets を選んで「実行」する。
 */
function setupV3Sheets() {
  var ss = spreadsheet_();
  [
    { name: PROJECTS_SHEET, headers: PROJECT_HEADERS, textColumns: [1, 2, 4, 5, 6, 7] },
    { name: TASKS_SHEET, headers: TASK_HEADERS, textColumns: [1, 2, 3, 6, 7] },
  ].forEach(function (def) {
    if (ss.getSheetByName(def.name)) {
      Logger.log('「' + def.name + '」は既に存在するため変更しません。');
      return;
    }
    var sheet = ss.insertSheet(def.name, ss.getSheets().length); // 末尾に追加
    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // 自由入力の列は書式なしテキストにして、日付・数値への自動変換を防ぐ
    def.textColumns.forEach(function (col) {
      sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    });
    Logger.log('「' + def.name + '」を作成しました。');
  });
}

// ───────────────────────── ユーティリティ ─────────────────────────

function spreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/** 案件名（B列）から安定したキーを作る: pk_ + SHA-256 の先頭 12 桁 */
function projectKeyFor_(name) {
  var normalized = String(name).normalize('NFKC').trim().replace(/\s+/g, ' ');
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalized, Utilities.Charset.UTF_8);
  var hex = digest
    .map(function (b) {
      var v = (b + 256) % 256;
      return (v < 16 ? '0' : '') + v.toString(16);
    })
    .join('');
  return 'pk_' + hex.slice(0, 12);
}

function dataRows_(sheet, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, width).getValues().map(function (values, i) {
    return { rowNumber: i + 2, values: values };
  });
}

function assertHeaders_(sheet, headers) {
  var actual = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  var ok = headers.every(function (h, i) { return String(actual[i]).trim() === h; });
  if (!ok) throw apiError_('HEADER_MISMATCH', '「' + sheet.getName() + '」の見出し行が想定と異なります。');
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw apiError_('BUSY', '他の更新処理中です。少し待ってからもう一度お試しください。');
  try {
    fn();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function requiredString_(value, name, maxLength) {
  var text = optionalString_(value, name, maxLength);
  if (!text) throw apiError_('INVALID_INPUT', name + ' を入力してください。');
  return text;
}

function optionalString_(value, name, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw apiError_('INVALID_INPUT', name + ' は文字列で指定してください。');
  var text = value.trim();
  if (text.length > maxLength) throw apiError_('INVALID_INPUT', name + ' は' + maxLength + '文字以内にしてください。');
  return text;
}

function requireBoolean_(value, name) {
  if (typeof value !== 'boolean') throw apiError_('INVALID_INPUT', name + ' は true / false で指定してください。');
  return value;
}

/** = + - @ で始まる入力が数式として解釈されないようにする */
function safeText_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
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

function accessKey_() {
  return PropertiesService.getScriptProperties().getProperty('ACCESS_KEY') || '';
}

function isAuthorized_(key) {
  var accessKey = accessKey_();
  if (!accessKey) return true; // 読み取りのみ。書き込みは doPost で別途拒否する
  return typeof key === 'string' && key === accessKey;
}

function apiError_(code, message) {
  var error = new Error(message);
  error.apiCode = code;
  return error;
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/** エディタから実行して読み取り結果をログで確認するためのテスト関数（書き込みなし） */
function testListProjects() {
  var state = buildState_();
  var conflicts = state.projects.filter(function (p) { return p.keyConflict; });
  Logger.log('取得件数: ' + state.projects.length);
  Logger.log('V3 シート: ' + (state.v3.ready ? '準備済み' : '未作成（setupV3Sheets を実行してください）'));
  Logger.log('案件名の重複: ' + (conflicts.length ? conflicts.map(function (p) { return p.name; }).join('、') : 'なし'));
  if (state.projects.length > 0) Logger.log(JSON.stringify(state.projects[0]));
}
