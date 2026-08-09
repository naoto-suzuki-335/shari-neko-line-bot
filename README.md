# しゃりねこ案内Bot

LINE Messaging API、Google Apps Script（GAS）、claspを使って開発する学習用Botです。

## 現在の構成

```text
.
├─ src/
│  ├─ appsscript.json  # GASプロジェクトの設定
│  └─ Code.gs          # Webアプリの動作確認用コード
├─ .clasp.json         # ローカルとGASの接続設定（Git管理外）
├─ .gitignore          # Gitへ登録しないファイルの設定
├─ package.json        # Node.jsとclaspの設定
├─ package-lock.json   # npmパッケージの固定情報
└─ requirements.md     # LINE Botの要件定義
```

`.clasp.json` の `rootDir` は `src` に設定しています。そのため、今後 `clasp push` を実行すると、`src` 内のファイルがGASへ反映されます。

現段階では動作確認用の `doGet` だけを用意しています。LINE Botの返信処理とアクセストークンの設定はまだ実装していません。
