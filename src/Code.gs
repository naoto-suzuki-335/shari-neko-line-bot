/**
 * GAS Webアプリの動作確認用ページを返します。
 *
 * @return {GoogleAppsScript.Content.TextOutput} 確認用のテキスト
 */
function doGet() {
  return ContentService.createTextOutput('しゃりねこ案内Bot: GAS is working!');
}

/**
 * LINEから届くWebhookのPOSTリクエストを受け取ります。
 *
 * @param {GoogleAppsScript.Events.DoPost} e POSTリクエストのイベント
 * @return {GoogleAppsScript.Content.TextOutput} HTTP 200相当のレスポンス
 */
function doPost(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      const requestBody = JSON.parse(e.postData.contents);
      const eventCount = Array.isArray(requestBody.events)
        ? requestBody.events.length
        : 0;

      console.log('受信したイベント数: %s', eventCount);

      // LINEから複数のイベントが届く場合に備えて、1件ずつ処理します。
      if (Array.isArray(requestBody.events)) {
        requestBody.events.forEach(function (event) {
          try {
            handleLineEvent_(event);
          } catch (error) {
            // 1件の処理に失敗しても、Webhook全体には「OK」を返します。
            console.error('LINEイベントの処理に失敗しました: %s', error.message);
          }
        });
      }
    } catch (error) {
      console.error('POSTデータのJSON解析に失敗しました: %s', error.message);
    }
  } else {
    console.log('POSTデータはありませんでした。');
  }

  return ContentService.createTextOutput('OK');
}

/**
 * LINEから届いたイベントが返信対象かどうかを確認します。
 *
 * @param {Object} event LINEのWebhookイベント
 */
function handleLineEvent_(event) {
  // テキストメッセージ以外には返信しません。
  if (
    !event ||
    event.type !== 'message' ||
    !event.message ||
    event.message.type !== 'text'
  ) {
    return;
  }

  const receivedText = event.message.text;

  // この4語はLINE公式アカウントの応答メッセージ機能に任せます。
  const officialAccountKeywords = [
    'こんにちは',
    '使い方',
    'お知らせ',
    'おはよう',
  ];

  if (officialAccountKeywords.includes(receivedText)) {
    console.log('公式アカウント側で返信するキーワードを受信しました: %s', receivedText);
    return;
  }

  // スクリプトプロパティからアクセストークンを安全に取得します。
  const channelAccessToken = PropertiesService.getScriptProperties()
    .getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!channelAccessToken) {
    console.error('スクリプトプロパティ LINE_CHANNEL_ACCESS_TOKEN が未設定です。');
    return;
  }

  const guideMessage =
    'メッセージありがとうございます🐱\n' +
    '下のメニューから「使い方」や「お知らせ」を選んでください。';

  replyTextMessage_(event.replyToken, guideMessage, channelAccessToken);
}

/**
 * LINEのReply APIを使い、指定されたテキストを返信します。
 *
 * @param {string} replyToken LINEから届いた返信用トークン
 * @param {string} text 返信するテキスト
 * @param {string} channelAccessToken チャネルアクセストークン
 */
function replyTextMessage_(replyToken, text, channelAccessToken) {
  if (!replyToken) {
    console.error('返信に必要なreplyTokenがありません。');
    return;
  }

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + channelAccessToken,
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: 'text',
          text: text,
          quickReply: {
            items: [
              {
                type: 'action',
                imageUrl: 'https://raw.githubusercontent.com/naoto-suzuki-335/shari-neko-line-bot/main/images/morning.png',
                action: {
                  type: 'message',
                  label: 'おはよう',
                  text: 'おはよう',
                },
              },
              {
                type: 'action',
                imageUrl: 'https://raw.githubusercontent.com/naoto-suzuki-335/shari-neko-line-bot/main/images/guide.png',
                action: {
                  type: 'message',
                  label: '使い方',
                  text: '使い方',
                },
              },
              {
                type: 'action',
                imageUrl: 'https://raw.githubusercontent.com/naoto-suzuki-335/shari-neko-line-bot/main/images/notice.png',
                action: {
                  type: 'message',
                  label: 'お知らせ',
                  text: 'お知らせ',
                },
              },
            ],
          },
        },
      ],
    }),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    console.error(
      'LINEへの返信に失敗しました。ステータス: %s、内容: %s',
      statusCode,
      response.getContentText()
    );
  }
}
