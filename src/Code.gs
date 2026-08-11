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

  // 次の5語に完全一致した場合は、それぞれ専用の短文を返信します。
  const reactionMessages = {
    'つかれた': [
      'おつかれさまです🍵 むりせず、ひと休みしてくださいね。',
      '今日もよくがんばりました🐱',
      'しゃりねこと、少し休みましょう🍣',
    ],
    'ただいま': [
      'おかえりなさい🐱 待っていました。',
      'おかえりなさい。今日もおつかれさまです🍵',
      'おかえりなさい🐾 ゆっくりしてくださいね。',
    ],
    'おやすみ': [
      'おやすみなさい🌙 よい夢を。',
      '今日も一日、おつかれさまでした🐱',
      'しゃりねこも、そろそろ眠ります💤',
    ],
    'ありがとう': [
      'こちらこそ、ありがとう🐾',
      'どういたしまして🐱',
      'そう言ってもらえて、うれしいです🍣',
    ],
    'おなかすいた': [
      'しゃりねこも、おなかがすきました🍣',
      'そろそろ、ごはんの時間でしょうか🐱',
      'おすしの気配がします……🍣',
    ],
  };
  const hasReaction = Object.prototype.hasOwnProperty.call(
    reactionMessages,
    receivedText
  );

  // スクリプトプロパティからアクセストークンを安全に取得します。
  const channelAccessToken = PropertiesService.getScriptProperties()
    .getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!channelAccessToken) {
    console.error('スクリプトプロパティ LINE_CHANNEL_ACCESS_TOKEN が未設定です。');
    return;
  }

  if (hasReaction) {
    const replyCandidates = reactionMessages[receivedText];
    const randomIndex = Math.floor(Math.random() * replyCandidates.length);
    const reactionMessage = replyCandidates[randomIndex];

    replyTextMessage_(
      event.replyToken,
      reactionMessage,
      channelAccessToken,
      false
    );
    return;
  }

  if (receivedText === '今日の運勢') {
    const fortuneMessages = [
      '今日のしゃりねこ運勢🍣\n\n' +
        '【まぐろ運】\n' +
        '今日は迷わず進めそう。\n' +
        '小さな一歩がいい流れを連れてきます🐟',
      '今日のしゃりねこ運勢🍣\n\n' +
        '【サーモン運】\n' +
        'やさしい気持ちが広がる日。\n' +
        '自分にも少し甘くしてあげましょう🌸',
      '今日のしゃりねこ運勢🍣\n\n' +
        '【えび運】\n' +
        'うれしい知らせが届くかも。\n' +
        'いつもより少しだけ周りを見てみて🦐',
      '今日のしゃりねこ運勢🍣\n\n' +
        '【たまご運】\n' +
        'ほっとできる時間が見つかる日。\n' +
        'ゆっくり味わってください🍵',
      '今日のしゃりねこ運勢🍣\n\n' +
        '【いくら運】\n' +
        '小さな楽しみが重なりそう。\n' +
        '今日の「うれしい」を見逃さずに✨',
    ];
    const randomIndex = Math.floor(Math.random() * fortuneMessages.length);
    const fortuneMessage = fortuneMessages[randomIndex];
    const luckySushiCandidates = [
      'まぐろ',
      'サーモン',
      'たまご',
      'いか',
      'たこ',
      'えび',
      'いくら',
      'なっとう',
    ];
    const luckySushiIndex = Math.floor(
      Math.random() * luckySushiCandidates.length
    );
    const luckySushi = luckySushiCandidates[luckySushiIndex];
    const fortuneMessageWithLuckySushi =
      fortuneMessage + '\n\n今日のラッキー寿司：' + luckySushi + '✨';

    replyTextMessage_(
      event.replyToken,
      fortuneMessageWithLuckySushi,
      channelAccessToken,
      false
    );
    return;
  }

  const guideMessage =
    'メッセージありがとうございます🐱\n' +
    '下のメニューから「使い方」や「お知らせ」を選んでください。';

  replyTextMessage_(
    event.replyToken,
    guideMessage,
    channelAccessToken,
    true
  );
}

/**
 * LINEのReply APIを使い、指定されたテキストを返信します。
 *
 * @param {string} replyToken LINEから届いた返信用トークン
 * @param {string} text 返信するテキスト
 * @param {string} channelAccessToken チャネルアクセストークン
 * @param {boolean} showQuickReply クイックリプライを表示するか
 */
function replyTextMessage_(replyToken, text, channelAccessToken, showQuickReply) {
  if (!replyToken) {
    console.error('返信に必要なreplyTokenがありません。');
    return;
  }

  const message = {
    type: 'text',
    text: text,
  };

  if (showQuickReply) {
    message.quickReply = {
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
          action: {
            type: 'message',
            label: '今日の運勢',
            text: '今日の運勢',
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
    };
  }

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + channelAccessToken,
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [message],
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
