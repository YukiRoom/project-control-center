# PROJECT CONTROL CENTER

**次にやることが、すぐ分かる。**

複数の ChatGPT チャット・事業・note・AI システム・キャラクター制作などを並行して進めるための、
「作業を再開するための司令塔」Web アプリです。

「今やる3つを決める → 目標を見る → タスクを進める → 進捗が見える → ChatGPT ですぐ続きを始める」
ための画面です。データは既存の Google スプレッドシート「ChatGPT_総合プロジェクト管理」を使います。

- 「総合管理」シート（A〜J）… 既存の本番台帳。アプリから書き込むのは **G列（メインチャットURL）だけ**
- 「プロジェクト管理」シート … V3 用。カテゴリー・FOCUS・目標
- 「タスク」シート … V3 用。案件ごとのタスク

## 主な機能

| 機能 | 内容 |
| --- | --- |
| 🔥 FOCUS | 今集中する最大 3 案件。カテゴリー・目標・進捗バー（完了 / 全タスク）・次のタスク（なければ E列「次にやること」）・続きから始める。PC とスマホで同じ内容（シートに保存） |
| 目標・タスク | 詳細パネルで目標を登録・編集。タスクは追加・完了切替・名前編集・削除・↑↓ で並び替え。進捗率は自動計算 |
| カテゴリー | 💼 BUSINESS / ✍️ CONTENT / 🎨 CREATIVE / 🤖 SYSTEM / APP / 📦 OTHER / 未分類。一覧上部のタブで絞り込み（大分類フィルターと併用可） |
| メインチャット登録 | 詳細パネルから ChatGPT のURLを登録・変更・削除（「総合管理」G列に保存）。chatgpt.com 以外のURLは確認してから保存 |
| 集計バー | 主表示: 進行中（運用中＋制作・開発中＋企画・準備中）・要確認・全案件。補助表示: 運用中／制作中／企画中／保留／完了。すべてクリックで絞り込み |
| 今、動いている案件 | 初期表示。運用中→制作・開発中→企画・準備中の順、同じ状態内は最終更新日の新しい順。保留・完了は状態フィルターや「全案件」で表示 |
| 一覧（判断する場所） | 案件名・NEXT（次にやること）・状態・大分類・更新日・操作だけに絞る。PC は 1 列のコンパクトなリスト、スマホはコンパクトなカード |
| 続きから始める | G列（メインチャットURL）を新しいタブで開く Primary Action。F列（プロジェクトURL）は「↗ プロジェクト」として Secondary。URL がなければ小さなテキストのみ |
| 検索 | 大分類・案件名・現在地・次にやること・検索キーワード・メモを横断検索。全角/半角・カタカナ/ひらがなの違いを吸収、スペース区切りで AND 検索 |
| フィルター | 大分類（シートの値から自動生成）・状態。要確認は集計バーから |
| 要確認 | 最終更新日から 30 日以上経過し、保留・完了以外の案件。一覧では日付横の小さなチップ（例:「32日更新なし」） |
| 詳細（情報を見る・編集する場所） | PC は右サイドパネル、スマホはボトムシート。基本情報 → 現在地 → NEXT → 目標 → タスク → メインチャット → その他。「編集可」と「シートで編集」を見出しで区別 |
| 状態表示 | ローディング（スケルトン）・取得エラー（再読み込み）・0件・検索結果なし |

## 技術構成

- Vite 8 / React 19 / TypeScript 6
- Tailwind CSS 4（`@tailwindcss/vite`）
- lucide-react（アイコン）
- oxlint（lint）
- Google Apps Script（スプレッドシート API。許可した操作のみ書き込み可）
- GitHub Pages（公開、GitHub Actions で自動デプロイ）

```
┌──────────────┐ POST {action, key, …}  ┌──────────────────────┐    ┌──────────────────────────┐
│ Web アプリ     │ ─────────────────────▶ │ Apps Script Web アプリ  │ ─▶ │ 総合管理（読み取り＋G列のみ） │
│ (GitHub Pages)│ ◀───────────────────── │ 許可した操作だけを実行   │ ─▶ │ プロジェクト管理 / タスク     │
└──────────────┘  最新データ一式（JSON）   └──────────────────────┘    └──────────────────────────┘
```

- Google の認証情報はフロントエンドに一切含めません。Apps Script は「自分として実行」されます。
- Apps Script の OAuth 権限は `https://www.googleapis.com/auth/spreadsheets`（読み書き可）です。
  書き込み範囲は権限ではなく **`Code.gs` の実装で制限**しています（下記「書き込み API」）。
- 「閲覧キー（ACCESS_KEY）」は Apps Script のスクリプト プロパティにだけ保存され、GitHub のソース・Variables・Secrets・
  ビルド成果物には含めません。利用者が端末ごとに入力します（localStorage に保存し、POST 本文で送信）。
  **書き込みは ACCESS_KEY が設定されている場合のみ**許可されます。

### 認証についての注意

ACCESS_KEY は **個人利用向けの簡易認証**です（キーを知っている人は誰でも読み書きできます）。
将来、第三者の利用や複数ユーザー化をする場合は、Google Sign-In（ID トークンを Apps Script で検証し、
許可したアカウントだけ通す）などの本人認証を追加してください。

## データ構造（V3）

### 総合管理（既存・本番台帳）

A 大分類 / B プロジェクト／案件 / C 状態 / D 現在地 / E 次にやること / F プロジェクトURL / G メインチャットURL /
H 検索キーワード / I 最終更新日 / J メモ — **構造・書式・入力規則は変更しません。アプリが書き込むのは G 列だけ**です。

### プロジェクト管理（V3・新規）

| 列 | 内容 |
| --- | --- |
| A projectKey | 案件の識別キー（下記） |
| B category | `BUSINESS` / `CONTENT` / `CREATIVE` / `SYSTEM` / `OTHER`（空 = 未分類） |
| C focus | `TRUE` / `FALSE`（TRUE は最大 3 件） |
| D goal | 現在の目標 |
| E createdAt / F updatedAt | 作成・更新日時 |
| G projectName | 参考用の案件名（人が見て分かるように記録。照合には使わない） |

行はその案件を初めて編集したときに追加されます（未編集の案件は行がなく「未分類・FOCUS外・目標なし」扱い）。

### タスク（V3・新規）

| 列 | 内容 |
| --- | --- |
| A taskId | `t_` + ランダムな 16 桁 |
| B projectKey | どの案件のタスクか |
| C task | タスク名 |
| D completed | `TRUE` / `FALSE` |
| E sortOrder | 並び順（1, 2, 3…） |
| F createdAt / G updatedAt | 作成・更新日時 |

### projectKey（既存案件との紐付け）

「総合管理」には固定 ID 列がなく、列の追加もしない方針のため、**案件名（B列）から算出**します:
`pk_` + SHA-256（NFKC 正規化・前後空白除去した案件名）の先頭 12 桁。

- 行の追加・並び替え・移動をしても紐付けは壊れません（行番号は使いません）
- 大分類や状態を変えても紐付けは変わりません
- **案件名を変更すると別の案件として扱われます**。その場合、古い管理データは「紐付かない管理データ」として件数が表示されます。
  引き継ぐには「プロジェクト管理」「タスク」シートの projectKey を新しいキーに書き換えます
  （新しいキーは Apps Script の `testListProjects` のログ、またはアプリの API 応答で確認できます）
- 同じ案件名が複数行ある場合は区別できないため、その案件への書き込みは拒否されます

## 書き込み API（Apps Script）

すべて `POST { action, key, … }`。ACCESS_KEY の確認 → 入力検証 → `LockService` で排他 → 書き込み → 最新データ一式を返す。
シート名・行・列・値をクライアントが指定する汎用操作はありません。

| action | 書き込み先 | 検証 |
| --- | --- | --- |
| `setCategory` | プロジェクト管理 B | 定義済みカテゴリーのみ |
| `setFocus` | プロジェクト管理 C | boolean、FOCUS は最大 3 件（超えると `FOCUS_LIMIT`） |
| `setGoal` | プロジェクト管理 D | 300 文字以内 |
| `addTask` / `updateTask` | タスク | 1〜200 文字、1 案件 100 件まで |
| `toggleTask` | タスク D | boolean |
| `deleteTask` | タスク（該当 1 行を削除） | taskId が存在すること |
| `reorderTask` | タスク E | `up` / `down` |
| `setChatUrl` | **総合管理 G のみ** | `https://` の URL（2000 文字以内）。空にするには `clear: true` が必要。取得時の値と現在値が違えば `CONFLICT` |

- 対象の案件は、クライアントが送った行番号ではなく **projectKey で毎回「総合管理」を読み直して特定**します
- `= + - @` で始まる入力は数式として解釈されないようにして保存します
- V3 用シートは自動作成しません（`setupV3Sheets` を手動実行）

## ファイル構成

```
project-control-center/
├─ gas/
│  ├─ Code.gs              # Apps Script（読み取り＋許可した書き込み API、setupV3Sheets）
│  └─ appsscript.json      # マニフェスト（OAuth 権限・Web アプリ設定）
├─ src/
│  ├─ types/project.ts     # Project 型など
│  ├─ lib/
│  │  ├─ status.ts         # ステータス定義・判定
│  │  ├─ projects.ts       # 集計・フィルター・並び替え・要確認判定
│  │  ├─ dataset.ts        # API 応答の変換・楽観的更新
│  │  ├─ progress.ts       # 進捗率・次のタスク
│  │  ├─ search.ts         # 日本語検索の正規化
│  │  └─ date.ts           # 日付ユーティリティ
│  ├─ data/
│  │  ├─ repository.ts     # ProjectRepository インターフェース・DataError
│  │  ├─ gasRepository.ts  # Apps Script から取得
│  │  ├─ mockRepository.ts # 開発用モック
│  │  ├─ mockProjects.ts   # モックデータ（架空）
│  │  ├─ accessKey.ts      # 閲覧キーの保存
│  │  └─ index.ts          # 接続先の選択
│  ├─ context/commands.ts  # 画面から呼ぶ更新操作の型
│  ├─ hooks/
│  │  ├─ useProjects.ts    # 取得・更新（順番に送信、楽観的更新、失敗時は元に戻す）
│  │  └─ useCommandsValue.ts # FOCUS 上限・確認ダイアログなどを含む更新操作
│  ├─ components/          # UI コンポーネント
│  │  ├─ Dashboard.tsx     # 画面構成（FOCUS → 集計 → カテゴリー → 検索 → 一覧）
│  │  ├─ FocusSection.tsx  # 🔥 FOCUS 今やる3つ
│  │  ├─ CategoryTabs.tsx  # カテゴリータブ
│  │  ├─ ProjectEditors.tsx # カテゴリー・目標・タスク・メインチャットの編集
│  │  ├─ ProgressBar.tsx   # 進捗バー
│  │  ├─ OverviewBar.tsx   # 集計バー
│  │  ├─ FilterBar.tsx     # 検索・大分類・状態
│  │  ├─ ProjectList.tsx   # 一覧（別の切り口の一覧でも再利用可）
│  │  ├─ ProjectItem.tsx   # 一覧の 1 件（PC: 行 / スマホ: カード）
│  │  ├─ ProjectActions.tsx # 続きから始める・プロジェクト
│  │  └─ ProjectDetail.tsx # 詳細パネル／ボトムシート
│  ├─ App.tsx
│  └─ main.tsx
├─ .github/workflows/deploy.yml  # GitHub Pages 自動デプロイ
└─ .env.example
```

## セットアップ

```bash
npm install
```

Node.js 20 以上を推奨します（開発は Node.js 24 で確認）。

## 開発サーバー起動

```bash
npm run dev
```

http://localhost:5173 を開きます。`VITE_SHEETS_API_URL` が未設定の場合は **モックデータ（架空）** で表示されます。
モック時は URL に以下を付けると各状態を確認できます。

| URL | 表示 |
| --- | --- |
| `?mock=slow` | ローディング |
| `?mock=error` | 取得エラー |
| `?mock=empty` | 0 件 |
| `?mock=v2` | V3 未対応の Apps Script（初期設定前）の表示 |

モックの編集内容はメモリ上だけで、再読み込みすると元に戻ります。

## 環境変数

`.env.example` をコピーして `.env.local` を作成します（`.env*` は Git 管理外）。

| 変数 | 必須 | 内容 |
| --- | --- | --- |
| `VITE_SHEETS_API_URL` | 本番で必須 | Apps Script Web アプリの URL（`https://script.google.com/macros/s/…/exec`） |
| `BASE_PATH` | 任意（ビルド時） | 公開パス。GitHub Pages ではワークフローが `/project-control-center/` を自動設定 |

> `VITE_` で始まる値はビルド成果物に含まれます。Web アプリ URL は認証情報ではありませんが、
> URL を知っている人が読み取れないようにするには、下記の「閲覧キー」を設定してください。

## Google Sheets 接続方法（Apps Script）

対象: スプレッドシート「ChatGPT_総合プロジェクト管理」（ID `1fKBxorXoArfhbvyq3K51-gi6A_nYJke2-rtz0GXrrJI`）。
「総合管理」の列・データは変更しません（アプリからの書き込みは G 列のみ）。

1. スプレッドシートを開き、メニュー **拡張機能 → Apps Script** を開く
2. 左上のプロジェクト名「無題のプロジェクト」をクリックし、`PROJECT CONTROL CENTER API` に変更
3. エディタの `コード.gs` の中身をすべて削除し、このリポジトリの [`gas/Code.gs`](gas/Code.gs) を貼り付けて保存（Ctrl+S）
4. 左の歯車 **プロジェクトの設定** →「**「appsscript.json」マニフェスト ファイルをエディタで表示する**」にチェック
5. 左の **エディタ（< >）** に戻り、`appsscript.json` の中身を [`gas/appsscript.json`](gas/appsscript.json) で置き換えて保存
6. （任意・推奨）**プロジェクトの設定 → スクリプト プロパティ → スクリプト プロパティを追加**
   - プロパティ: `ACCESS_KEY` / 値: 自分で決めた合言葉（例: 英数字 16 文字以上）
7. 上部の関数選択で `testListProjects` を選び **実行**
   - 「承認が必要です」→ **権限を確認** → 自分の Google アカウントを選択
   - 「このアプリは Google で確認されていません」→ **詳細** → **PROJECT CONTROL CENTER API（安全ではないページ）に移動**
   - 表示された権限を確認して **許可**
   - 下の実行ログに「取得件数: 22」「案件名の重複: なし」のように表示されれば OK
8. 右上の **デプロイ → 新しいデプロイ** → 種類の歯車で **ウェブアプリ** を選択
   - 説明: `v1 read-only`
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
   - **デプロイ** を押し、表示された **ウェブアプリの URL**（末尾 `/exec`）をコピー
9. コピーした URL をブラウザで開き、`{"ok":true,"service":"project-control-center","apiVersion":3}` と表示されることを確認
10. ローカル開発なら `.env.local` に `VITE_SHEETS_API_URL=<URL>` を設定。公開版は下記「公開方法」を参照

> Apps Script のコードを更新したときは **デプロイ → デプロイを管理 → 編集（鉛筆）→ バージョン: 新バージョン → デプロイ** で
> 同じ URL のまま反映できます。

### V3 の初期設定（FOCUS・目標・タスクを使うとき）

1. **事前にバックアップ**: スプレッドシートの **ファイル → コピーを作成**
2. Apps Script の `コード.gs` を最新の [`gas/Code.gs`](gas/Code.gs) に置き換えて保存
3. `testListProjects` を実行し、「取得件数: 22」「案件名の重複: なし」を確認（書き込みなし）
4. `setupV3Sheets` を実行 → シートの末尾に「プロジェクト管理」「タスク」が見出し行付きで作られる（既存シートは変更しない）
5. **デプロイ → デプロイを管理 → 編集 → 新バージョン → デプロイ**（URL は変わりません）

## ビルド

```bash
npm run typecheck   # 型チェック
npm run lint        # lint
npm run build       # 型チェック + 本番ビルド（dist/）
npm run preview     # ビルド結果の確認
```

## 公開方法（GitHub Pages）

`main` ブランチへ push すると GitHub Actions（`.github/workflows/deploy.yml`）がビルドして GitHub Pages に公開します。

1. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Name: `VITE_SHEETS_API_URL` / Value: Apps Script の Web アプリ URL
   - CLI の場合: `gh variable set VITE_SHEETS_API_URL --body "<URL>"`
3. **Actions → Deploy to GitHub Pages → Run workflow**（または `main` に push）
4. 公開 URL: `https://<GitHubユーザー名>.github.io/project-control-center/`

iPhone では Safari で開き、共有ボタン →「ホーム画面に追加」でアプリのように使えます。
`VITE_SHEETS_API_URL` 未設定でビルドした場合、公開版は「Google Sheets に未接続です」と表示します（モックは表示しません）。

## 今後の拡張

- 「総合管理」の状態・現在地・次にやること・メモ（C・D・E・J 列）の編集: `Mutation` 型と `Code.gs` の `MUTATIONS` に
  専用の操作を追加し、G 列と同様に projectKey 照合・楽観ロック（取得時の値との比較）を行う
- カテゴリーの追加: `Code.gs` の `CATEGORIES` に 1 行追加（アプリ側は API から受け取るので変更不要）
- 複数ユーザー化: 上記「認証についての注意」を参照
