/**
 * PROJECT CONTROL CENTER — Google Sheets API（V3）
 *
 * 読み取り:
 *   - 「総合管理」A〜J（本番台帳）＋ K「プロジェクトID」、「プロジェクト管理」「タスク」を JSON で返す。
 * 書き込み（許可した操作のみ・ACCESS_KEY 必須・LockService で排他）:
 *   - setCategory / setFocus / setGoal                              … 「プロジェクト管理」
 *   - addTask / updateTask / toggleTask / deleteTask / reorderTask  … 「タスク」
 *   - setChatUrl                                                     … 「総合管理」G列（メインチャットURL）のみ
 *   - assignProjectIds                                               … 「総合管理」K列の空欄にだけ ID を発行
 *   シート名・行・列・値をクライアントが自由に指定する汎用書き込みは提供しない。
 *
 * 案件の識別（projectId）:
 *   - 「総合管理」K列「プロジェクトID」に保持する永続 ID（prj_ + ランダム 16 桁）。案件名に依存しない。
 *   - 対象行はクライアントの行番号ではなく、毎回 K列を読み直して projectId で特定する。
 *   - A〜J の構造・値・書式・入力規則は変更しない。
 *
 * セットアップ（エディタから手動実行）:
 *   - previewV3Setup() … 何も書き込まずに、実行予定の変更内容と問題点をログに出す
 *   - setupV3()        … K列の見出しと ID、「プロジェクト管理」「タスク」シートを作成する
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
var MASTER_CHAT_URL_COLUMN = 7; // G列
var MASTER_ID_COLUMN = 11; // K列
var MASTER_ID_HEADER = 'プロジェクトID';
var PROJECT_ID_PATTERN = /^prj_[0-9a-f]{16}$/;

var PROJECT_HEADERS = ['projectId', 'category', 'focus', 'goal', 'createdAt', 'updatedAt', 'projectName'];
var TASK_HEADERS = ['taskId', 'projectId', 'task', 'completed', 'sortOrder', 'createdAt', 'updatedAt'];

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
  var ready = master.idColumnReady && meta !== null && tasks !== null;

  var liveIds = {};
  var missingIdCount = 0;
  var nameChangedCount = 0;
  var projects = master.rows.map(function (row) {
    if (row.projectId) liveIds[row.projectId] = true;
    if (!row.projectId) missingIdCount++;
    var m = ready && row.projectId && !row.idConflict ? meta.byId[row.projectId] : null;
    var previousName = m && m.projectName && m.projectName !== row.values.name ? m.projectName : '';
    if (previousName) nameChangedCount++;
    return {
      rowNumber: row.rowNumber,
      projectId: row.projectId,
      idConflict: row.idConflict,
      idMissing: !row.projectId,
      previousName: previousName,
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
    Object.keys(meta.byId).forEach(function (id) {
      if (!liveIds[id]) orphanCount++;
    });
  }

  return {
    ok: true,
    apiVersion: API_VERSION,
    fetchedAt: new Date().toISOString(),
    projects: projects,
    tasks: ready
      ? tasks.list
          .filter(function (t) { return liveIds[t.projectId]; })
          .map(function (t) {
            return { taskId: t.taskId, projectId: t.projectId, task: t.task, completed: t.completed, sortOrder: t.sortOrder };
          })
      : [],
    categories: CATEGORIES,
    v3: {
      ready: ready,
      orphanCount: orphanCount,
      missingIdCount: ready ? missingIdCount : 0,
      nameChangedCount: nameChangedCount,
      maxFocus: MAX_FOCUS,
    },
  };
}

/**
 * 「総合管理」を読む（書き込みはしない）。
 * K列の見出しが「プロジェクトID」なら各行の projectId を読み、形式が正しくない値・重複を検出する。
 */
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

  var hasIdColumn = sheet.getMaxColumns() >= MASTER_ID_COLUMN;
  var idHeader = hasIdColumn ? String(sheet.getRange(1, MASTER_ID_COLUMN).getDisplayValue()).trim() : '';
  var idColumnReady = idHeader === MASTER_ID_HEADER;
  var width = idColumnReady ? MASTER_ID_COLUMN : MASTER_COLUMNS.length;

  var lastRow = sheet.getLastRow();
  var timeZone = ss.getSpreadsheetTimeZone();
  var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, width).getValues() : [];
  var rows = [];
  var idCount = {};
  values.forEach(function (row, index) {
    var isBlank = row.slice(0, MASTER_COLUMNS.length).every(function (cell) { return String(cell).trim() === ''; });
    if (isBlank) return;
    var record = {};
    MASTER_COLUMNS.forEach(function (column, i) {
      record[column.key] = toText_(row[i], timeZone);
    });
    var rawId = idColumnReady ? String(row[MASTER_ID_COLUMN - 1]).trim() : '';
    var projectId = PROJECT_ID_PATTERN.test(rawId) ? rawId : '';
    if (projectId) idCount[projectId] = (idCount[projectId] || 0) + 1;
    rows.push({ rowNumber: index + 2, projectId: projectId, rawId: rawId, values: record });
  });
  rows.forEach(function (row) {
    row.idConflict = row.projectId !== '' && idCount[row.projectId] > 1;
  });
  return { sheet: sheet, rows: rows, idHeader: idHeader, idColumnReady: idColumnReady, hasIdColumn: hasIdColumn };
}

/** 「プロジェクト管理」。シートがなければ null（未セットアップ） */
function readProjectMeta_() {
  var sheet = spreadsheet_().getSheetByName(PROJECTS_SHEET);
  if (!sheet) return null;
  assertHeaders_(sheet, PROJECT_HEADERS);
  var byId = {};
  dataRows_(sheet, PROJECT_HEADERS.length).forEach(function (item) {
    var r = item.values;
    var id = String(r[0]).trim();
    if (!id) return;
    byId[id] = {
      rowNumber: item.rowNumber,
      category: String(r[1]).trim(),
      focus: r[2] === true || String(r[2]).toUpperCase() === 'TRUE',
      goal: String(r[3]),
      projectName: String(r[6]).trim(),
    };
  });
  return { sheet: sheet, byId: byId };
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
      projectId: String(r[1]).trim(),
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
    updateMeta_(requireProject_(req.projectId), { category: category });
  },

  setFocus: function (req) {
    var project = requireProject_(req.projectId);
    var focus = requireBoolean_(req.focus, 'focus');
    if (focus) {
      var meta = requireV3_().meta;
      var liveIds = {};
      readMaster_().rows.forEach(function (row) {
        if (row.projectId) liveIds[row.projectId] = true;
      });
      var focused = Object.keys(meta.byId).filter(function (id) {
        return id !== project.projectId && liveIds[id] && meta.byId[id].focus;
      });
      if (focused.length >= MAX_FOCUS) {
        throw apiError_('FOCUS_LIMIT', 'FOCUSは最大' + MAX_FOCUS + '件です。どれかを外してください。');
      }
    }
    updateMeta_(project, { focus: focus });
  },

  setGoal: function (req) {
    var goal = optionalString_(req.goal, 'goal', MAX_GOAL_LENGTH);
    updateMeta_(requireProject_(req.projectId), { goal: goal });
  },

  addTask: function (req) {
    var project = requireProject_(req.projectId);
    var text = requiredString_(req.task, 'task', MAX_TASK_LENGTH);
    var tasks = requireV3_().tasks;
    var own = tasks.list.filter(function (t) { return t.projectId === project.projectId; });
    if (own.length >= MAX_TASKS_PER_PROJECT) {
      throw apiError_('INVALID_INPUT', 'タスクは1案件につき' + MAX_TASKS_PER_PROJECT + '件までです。');
    }
    var maxOrder = own.reduce(function (max, t) { return Math.max(max, t.sortOrder); }, 0);
    var now = now_();
    tasks.sheet.appendRow([
      't_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16),
      project.projectId,
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
      .filter(function (t) { return t.projectId === found.task.projectId; })
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
    var project = requireProject_(req.projectId);
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
    project.sheet.getRange(project.rowNumber, MASTER_CHAT_URL_COLUMN).setValue(url);
  },

  /** 「総合管理」に追加された行など、K列が空の案件にだけ ID を発行する */
  assignProjectIds: function () {
    var master = readMaster_();
    if (!master.idColumnReady) throw apiError_('SETUP_REQUIRED', 'K列「' + MASTER_ID_HEADER + '」がありません。setupV3 を実行してください。');
    requireV3_();
    var invalid = master.rows.filter(function (row) { return row.rawId && !row.projectId; });
    if (invalid.length > 0) {
      throw apiError_('INVALID_ID', 'K列に形式が正しくない値があります（' + invalid.map(function (r) { return r.rowNumber + '行目'; }).join('、') + '）。');
    }
    issueMissingIds_(master);
  },
};

/** projectId に一致する「総合管理」の行を毎回読み直して特定する（行番号は信用しない） */
function requireProject_(projectId) {
  if (typeof projectId !== 'string' || !PROJECT_ID_PATTERN.test(projectId)) {
    throw apiError_('INVALID_INPUT', 'projectId が正しくありません。');
  }
  var master = readMaster_();
  if (!master.idColumnReady) throw apiError_('SETUP_REQUIRED', 'K列「' + MASTER_ID_HEADER + '」がありません。setupV3 を実行してください。');
  var matches = master.rows.filter(function (row) { return row.projectId === projectId; });
  if (matches.length === 0) throw apiError_('NOT_FOUND', '案件が見つかりません。再読み込みしてください。');
  if (matches.length > 1) {
    throw apiError_(
      'ID_CONFLICT',
      '同じプロジェクトIDが複数行にあります（' + matches.map(function (r) { return r.rowNumber + '行目'; }).join('、') + '）。行をコピーした場合は、コピー先のK列を空にしてください。',
    );
  }
  matches[0].sheet = master.sheet;
  return matches[0];
}

function requireV3_() {
  var meta = readProjectMeta_();
  var tasks = readTasks_();
  if (meta === null || tasks === null) {
    throw apiError_('SETUP_REQUIRED', 'V3 用シートがありません。Apps Script エディタで setupV3 を実行してください。');
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
  var existing = meta.byId[project.projectId];
  if (existing) return existing.rowNumber;
  var now = now_();
  meta.sheet.appendRow([project.projectId, '', false, '', now, now, safeText_(project.values.name)]);
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

/** K列が空の案件に ID を書き込み、「プロジェクト管理」に行を用意する。書き込んだ件数を返す */
function issueMissingIds_(master) {
  var used = {};
  master.rows.forEach(function (row) {
    if (row.projectId) used[row.projectId] = true;
  });
  var issued = 0;
  master.rows.forEach(function (row) {
    if (row.rawId) return; // 既に値がある行（正しい ID・不正な値とも）は触らない
    var id = newProjectId_(used);
    used[id] = true;
    master.sheet.getRange(row.rowNumber, MASTER_ID_COLUMN).setValue(id);
    row.projectId = id;
    ensureMeta_(row);
    issued++;
  });
  return issued;
}

function newProjectId_(used) {
  for (;;) {
    var id = 'prj_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    if (!used[id]) return id;
  }
}

// ───────────────────────── セットアップ（手動実行） ─────────────────────────

/** セットアップ前の点検。問題があれば理由の一覧を返す（書き込みなし） */
function inspectSetup_() {
  var ss = spreadsheet_();
  var master = readMaster_();
  var problems = [];
  if (master.idHeader && master.idHeader !== MASTER_ID_HEADER) {
    problems.push('「' + MASTER_SHEET + '」K1 に別の値「' + master.idHeader + '」があります。');
  }
  if (!master.idColumnReady && master.hasIdColumn) {
    var lastRow = master.sheet.getLastRow();
    if (lastRow > 1) {
      var used = master.sheet
        .getRange(2, MASTER_ID_COLUMN, lastRow - 1, 1)
        .getValues()
        .filter(function (r) { return String(r[0]).trim() !== ''; }).length;
      if (used > 0) problems.push('「' + MASTER_SHEET + '」K列（2行目以降）に既に ' + used + ' 件の値があります。');
    }
  }
  var invalid = master.rows.filter(function (row) { return row.rawId && !row.projectId; });
  if (invalid.length > 0) problems.push('K列に形式が正しくない値があります（' + invalid.length + '件）。');
  var conflicts = master.rows.filter(function (row) { return row.idConflict; });
  if (conflicts.length > 0) problems.push('K列に重複した ID があります（' + conflicts.length + '件）。');
  [PROJECTS_SHEET, TASKS_SHEET].forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      try {
        assertHeaders_(sheet, name === PROJECTS_SHEET ? PROJECT_HEADERS : TASK_HEADERS);
      } catch (error) {
        problems.push('既存のシート「' + name + '」の見出しが想定と異なります。');
      }
    }
  });
  return {
    master: master,
    problems: problems,
    missing: master.rows.filter(function (row) { return !row.rawId; }).length,
    createProjects: !ss.getSheetByName(PROJECTS_SHEET),
    createTasks: !ss.getSheetByName(TASKS_SHEET),
  };
}

/** 実行予定の変更をログに出すだけ（何も書き込まない） */
function previewV3Setup() {
  var plan = inspectSetup_();
  Logger.log('案件数: ' + plan.master.rows.length);
  Logger.log('K1 見出し: ' + (plan.master.idColumnReady ? '設定済み' : '「' + MASTER_ID_HEADER + '」を書き込む予定'));
  Logger.log('K列に ID を発行する行: ' + plan.missing + ' 件');
  Logger.log('「' + PROJECTS_SHEET + '」: ' + (plan.createProjects ? '新規作成する予定' : '既存（変更しない）'));
  Logger.log('「' + TASKS_SHEET + '」: ' + (plan.createTasks ? '新規作成する予定' : '既存（変更しない）'));
  Logger.log(plan.problems.length ? '⚠ 問題: ' + plan.problems.join(' / ') + ' → setupV3 は実行されません。' : '問題なし。setupV3 を実行できます。');
}

/**
 * V3 の初期設定。問題があれば何も変更せずに中止する。
 * 1. 「総合管理」K1 に「プロジェクトID」、K列の空欄に ID を発行（A〜J は変更しない）
 * 2. 「プロジェクト管理」「タスク」シートを末尾に作成（既存なら変更しない）
 * 3. 「プロジェクト管理」に全案件の行を作成（projectId・案件名）
 * 4. K列に「編集時に警告」の保護を設定（誤編集防止。編集自体は可能）
 */
function setupV3() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('他の処理が実行中です。');
  try {
    var plan = inspectSetup_();
    if (plan.problems.length > 0) throw new Error('セットアップを中止しました（変更なし）: ' + plan.problems.join(' / '));
    var ss = spreadsheet_();
    var sheet = plan.master.sheet;

    if (!plan.master.idColumnReady) {
      if (!plan.master.hasIdColumn) sheet.insertColumnAfter(MASTER_COLUMNS.length); // 列数が J までしかない場合のみ K列を用意
      sheet.getRange(1, MASTER_COLUMNS.length).copyFormatToRange(sheet, MASTER_ID_COLUMN, MASTER_ID_COLUMN, 1, 1);
      sheet.getRange(1, MASTER_ID_COLUMN).setValue(MASTER_ID_HEADER);
      var protection = sheet.getRange(1, MASTER_ID_COLUMN, sheet.getMaxRows(), 1).protect();
      protection.setDescription('PROJECT CONTROL CENTER のプロジェクトID（編集・削除しないでください）');
      protection.setWarningOnly(true);
    }

    [
      { name: PROJECTS_SHEET, headers: PROJECT_HEADERS, textColumns: [1, 2, 4, 5, 6, 7] },
      { name: TASKS_SHEET, headers: TASK_HEADERS, textColumns: [1, 2, 3, 6, 7] },
    ].forEach(function (def) {
      if (ss.getSheetByName(def.name)) return;
      var created = ss.insertSheet(def.name, ss.getSheets().length); // 末尾に追加
      created.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
      created.setFrozenRows(1);
      // 自由入力の列は書式なしテキストにして、日付・数値への自動変換を防ぐ
      def.textColumns.forEach(function (col) {
        created.getRange(2, col, created.getMaxRows() - 1, 1).setNumberFormat('@');
      });
    });

    var master = readMaster_();
    var issued = issueMissingIds_(master);
    master.rows.forEach(function (row) {
      if (row.projectId) ensureMeta_(row);
    });
    SpreadsheetApp.flush();
    Logger.log('完了: ID を ' + issued + ' 件発行しました（案件数 ' + master.rows.length + '）。');
  } finally {
    lock.releaseLock();
  }
}

// ───────────────────────── ユーティリティ ─────────────────────────

function spreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
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
  Logger.log('取得件数: ' + state.projects.length);
  Logger.log('V3: ' + (state.v3.ready ? '準備済み' : '未設定（previewV3Setup → setupV3 を実行してください）'));
  if (state.projects.length > 0) Logger.log(JSON.stringify(state.projects[0]));
}
