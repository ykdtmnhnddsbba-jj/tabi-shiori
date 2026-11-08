# 家族旅行のしおり

静的サイト（GitHub Pages）。trips/<id>.json を追加し trips/index.json に1行足すと一覧に出ます。
自宅住所は載せないこと（公開リポ）。

## ローカルで確認してから公開する
1. このリポジトリを Googleドライブの外（例 `C:\yutaro\App\tabi-shiori`）に clone する（Drive 内に `.git` を置かない）
2. `preview.bat` をダブルクリック → ブラウザで http://localhost:8000/ が開く（`file://` では JSON を読めないので必ずこのサーバー経由で見る）
3. `style.css` や `trips/*.json` を編集して保存 → ブラウザを再読み込み（VS Code の Live Server 拡張なら自動更新）
4. 納得したら commit → push（main に push すると 1〜2 分で公開サイトに反映）

## 公開前チェック
`python3 scripts/validate_trips.py` で trips/*.json を検査します（編集室の「チェック」と同じ規則）。エラーがあると終了コード1。
