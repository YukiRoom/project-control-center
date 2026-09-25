# PROJECT CONTROL CENTER

**次にやることが、すぐ分かる。**

複数の ChatGPT チャット・事業・note・AI システム・キャラクター制作などを並行して進めるための、
「作業を再開するための司令塔」Web アプリです。

- 今どこまで進んでいるか（現在地）
- 次に何をやるか（次にやること）
- どの ChatGPT チャットに戻ればいいか（ChatGPTを開く）

を一目で確認できます。データは既存の Google スプレッドシート「ChatGPT_総合プロジェクト管理」の
**「総合管理」シートを読み取り専用で**参照します（Phase 1）。

## 主な機能

| 機能 | 内容 |
| --- | --- |
| 集計カード | 全案件／進行中（運用中＋制作・開発中＋企画・準備中）／運用中／制作・開発中／企画・準備中／保留／完了。タップで状態を絞り込み |
| 今、動いている案件 | 運用中・制作・開発中・企画・準備中の案件をカード表示。「次にやること」を強調 |
| ChatGPT への導線 | G列（メインチャットURL）があれば「ChatGPTを開く」、F列（プロジェクトURL）があれば「プロジェクトを開く」（新しいタブ） |
| 検索 | 大分類・案件名・現在地・次にやること・検索キーワード・メモを横断検索。全角/半角・カタカナ/ひらがなの違いを吸収、スペース区切りで AND 検索 |
| フィルター | 大分類（シートの値から自動生成）・状態・要確認のみ |
| 要確認 | 最終更新日から 30 日以上経過し、保留・完了以外の案件にバッジ表示＋件数バナー |
| 詳細 | PC は右サイドパネル、スマホはボトムシート。検索キーワードのコピー、メモ内 URL のリンク化 |
| 状態表示 | ローディング（スケルトン）・取得エラー（再読み込み）・0件・検索結果なし |

## 技術構成

- Vite 8 / React 19 / TypeScript 6
- Tailwind CSS 4（`@tailwindcss/vite`）
- lucide-react（アイコン）
- oxlint（lint）
- Google Apps Script（スプレッドシート読み取り API）
- GitHub Pages（公開、GitHub Actions で自動デプロイ）

```
┌──────────────┐  POST {action:"list", key}   ┌─────────────────────┐  getValues()  ┌──────────────┐
│ Web アプリ     │ ───────────────────────────▶ │ Apps Script Web アプリ │ ────────────▶ │ 総合管理 シート │
│ (GitHub Pages)│ ◀─────────────────────────── │ (読み取り専用権限)      │               │ (A〜J 列)     │
└──────────────┘          JSON                 └─────────────────────┘               └──────────────┘
```

- Google の認証情報はフロントエンドに一切含めません。Apps Script は「自分として実行」され、権限は
  `spreadsheets.readonly`（読み取りのみ）に限定しています。
- 任意で「閲覧キー（ACCESS_KEY）」を設定できます。キーは Apps Script のスクリプト プロパティにだけ保存され、
  ビルド成果物には含まれません。利用者は初回に端末ごとに入力します（localStorage に保存）。

## ファイル構成

```
project-control-center/
├─ gas/
│  ├─ Code.gs              # Apps Script（読み取り API）
│  └─ appsscript.json      # マニフェスト（readonly 権限・Web アプリ設定）
├─ src/
│  ├─ types/project.ts     # Project 型など
│  ├─ lib/
│  │  ├─ status.ts         # ステータス定義・判定
│  │  ├─ projects.ts       # 集計・フィルター・並び替え・要確認判定
│  │  ├─ search.ts         # 日本語検索の正規化
│  │  └─ date.ts           # 日付ユーティリティ
│  ├─ data/
│  │  ├─ repository.ts     # ProjectRepository インターフェース・DataError
│  │  ├─ gasRepository.ts  # Apps Script から取得
│  │  ├─ mockRepository.ts # 開発用モック
│  │  ├─ mockProjects.ts   # モックデータ（架空）
│  │  ├─ accessKey.ts      # 閲覧キーの保存
│  │  └─ index.ts          # 接続先の選択
│  ├─ hooks/useProjects.ts # 取得状態の管理（loading / error / ready）
│  ├─ components/          # UI コンポーネント
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

## 環境変数

`.env.example` をコピーして `.env.local` を作成します（`.env*` は Git 管理外）。

| 変数 | 必須 | 内容 |
| --- | --- | --- |
| `VITE_SHEETS_API_URL` | 本番で必須 | Apps Script Web アプリの URL（`https://script.google.com/macros/s/…/exec`） |
| `BASE_PATH` | 任意（ビルド時） | 公開パス。GitHub Pages ではワークフローが `/project-control-center/` を自動設定 |

> `VITE_` で始まる値はビルド成果物に含まれます。Web アプリ URL は認証情報ではありませんが、
> URL を知っている人が読み取れないようにするには、下記の「閲覧キー」を設定してください。

## Google Sheets 接続方法（Apps Script）

対象: スプレッドシート「ChatGPT_総合プロジェクト管理」（ID `1fKBxorXoArfhbvyq3K51-gi6A_nYJke2-rtz0GXrrJI`）の「総合管理」シート。
**シートの列・データは一切変更しません。** Apps Script は読み取り専用権限で動作します。

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
   - 権限が「スプレッドシートの**表示**」のみであることを確認して **許可**
   - 下の実行ログに「取得件数: 22」のように表示されれば OK
8. 右上の **デプロイ → 新しいデプロイ** → 種類の歯車で **ウェブアプリ** を選択
   - 説明: `v1 read-only`
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
   - **デプロイ** を押し、表示された **ウェブアプリの URL**（末尾 `/exec`）をコピー
9. コピーした URL をブラウザで開き、`{"ok":true,"service":"project-control-center","mode":"read-only"}` と表示されることを確認
10. ローカル開発なら `.env.local` に `VITE_SHEETS_API_URL=<URL>` を設定。公開版は下記「公開方法」を参照

> Apps Script のコードを更新したときは **デプロイ → デプロイを管理 → 編集（鉛筆）→ バージョン: 新バージョン → デプロイ** で
> 同じ URL のまま反映できます。

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

## Phase 2: 更新機能を追加する際の構成

対象: 状態・現在地・次にやること・メモ（C・D・E・J 列）の変更。

1. **型**: `EditableProjectFields`（`src/types/project.ts`）を更新内容の型として使う
2. **データ層**: `ProjectRepository` に `updateProject(rowNumber, fields, expectedUpdatedAt)` を追加し、
   `gasRepository.ts` で `{ action: 'update', key, rowNumber, fields, expectedUpdatedAt }` を POST する
3. **Apps Script**:
   - `appsscript.json` の権限を `https://www.googleapis.com/auth/spreadsheets` に変更（再承認が必要）
   - `doPost` の `case 'update'` に `updateProject_` を実装
   - 書き込み前に「行番号の案件名が一致するか」「最終更新日が取得時から変わっていないか」を確認（楽観ロック、別端末での同時編集を検知）
   - `LockService` で排他制御、書き込むのは C・D・E・J 列と I 列（最終更新日を当日に更新）のみ
   - 更新は **ACCESS_KEY 必須**（未設定時は更新を拒否）にする
4. **UI**: `ProjectDetail` に編集モード（状態はセレクト、他はテキストエリア）を追加し、保存後に `reload()`
5. **検証**: まずスプレッドシートのコピーで Apps Script を動かして確認してから本番に切り替える
