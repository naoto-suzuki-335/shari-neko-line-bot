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

  // 次の9語に完全一致した場合は、それぞれ専用の短文を返信します。
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
    'おつかれさま': [
      'おつかれさまです。ひと休みしていきましょう',
      '今日も一区切りですね',
      'しゃりねこは、特に疲れていないようです',
    ],
    'ねむい': [
      '眠いときは、ひと休みです',
      '今日は早めに休んでもよさそうです',
      'しゃりねこは、まだ眠そうではありません',
    ],
    'ひま': [
      '何もしない時間もありです',
      '少しだけ、ぼんやりしてみましょう',
      'しゃりねこも、特に予定はなさそうです',
    ],
    'またね': [
      'また、気が向いたときにどうぞ',
      'では、今日はこのあたりで',
      'しゃりねこは、もう別の方を見ています',
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

  if (receivedText === 'メニュー') {
    const menuQuickReplyItems = [
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
        action: {
          type: 'message',
          label: 'どうが',
          text: 'しゃりねこ動画',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'かんさつ',
          text: 'しゃりねこ観察',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'あそぶ',
          text: 'しゃりねこと遊ぶ',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      'メニューを選んでください🐱',
      channelAccessToken,
      true,
      menuQuickReplyItems
    );
    return;
  }

  if (receivedText === 'しゃりねこ動画') {
    replyVideoTemplate_(event.replyToken, channelAccessToken);
    return;
  }

  if (receivedText === 'しゃりねこ観察') {
    const observationMessages = [
      'しゃりねこは、のんびりしています🍵',
      'しゃりねこは、少し眠そうです💤',
      'しゃりねこは、遠くを見ています',
      'しゃりねこは、今日も平常運転です🍣',
      'しゃりねこは、特に何もしていません',
      'しゃりねこは、しっぽを揺らしています',
    ];
    const randomIndex = Math.floor(Math.random() * observationMessages.length);
    const observationMessage = observationMessages[randomIndex];

    replyTextMessage_(
      event.replyToken,
      observationMessage,
      channelAccessToken,
      false
    );
    return;
  }

  if (receivedText === 'しゃりねこと遊ぶ') {
    const playQuickReplyItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'なでる',
          text: 'なでる',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'おやつを置く',
          text: 'おやつを置く',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '呼んでみる',
          text: '呼んでみる',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'そっと見る',
          text: 'そっと見る',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'チェック',
          text: 'しゃりねこチェック',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      '何をしてみますか？🐱',
      channelAccessToken,
      true,
      playQuickReplyItems
    );
    return;
  }

  if (receivedText === 'しゃりねこチェック') {
    const moodCandidates = [
      'ふつう',
      'のんびり',
      'すこし上向き',
    ];
    const sleepinessCandidates = [
      'なし',
      '少し',
      'かなり',
    ];
    const motivationCandidates = [
      '気分しだい',
      'ぼちぼち',
      '今日はお休み',
    ];
    const selectedMood =
      moodCandidates[Math.floor(Math.random() * moodCandidates.length)];
    const selectedSleepiness =
      sleepinessCandidates[
        Math.floor(Math.random() * sleepinessCandidates.length)
      ];
    const selectedMotivation =
      motivationCandidates[
        Math.floor(Math.random() * motivationCandidates.length)
      ];
    const checkMessage =
      'しゃりねこチェック🐱\n\n' +
      'きげん：' + selectedMood + '\n' +
      'ねむけ：' + selectedSleepiness + '\n' +
      'やる気：' + selectedMotivation;

    replyTextMessage_(
      event.replyToken,
      checkMessage,
      channelAccessToken,
      false
    );
    return;
  }

  const playMessages = {
    'なでる': [
      'しゃりねこは、少し目を細めました',
      'しゃりねこは、そのままじっとしています',
      'しゃりねこは、なでられたところを整えています',
    ],
    'おやつを置く': [
      'しゃりねこは、おやつにゆっくり近づきました',
      'しゃりねこは、においを確かめています',
      'しゃりねこは、おやつを見ていますが動きません',
    ],
    '呼んでみる': [
      'しゃりねこは、声のした方を見ました',
      'しゃりねこは、耳だけ動かしました',
      'しゃりねこは、特に反応していません',
    ],
    'そっと見る': [
      'しゃりねこは、しばらく同じ場所にいます',
      'しゃりねこと目が合いました',
      'しゃりねこは、少しだけ向きを変えました',
    ],
  };
  const hasPlayMessage = Object.prototype.hasOwnProperty.call(
    playMessages,
    receivedText
  );

  if (hasPlayMessage) {
    const replyCandidates = playMessages[receivedText];
    const randomIndex = Math.floor(Math.random() * replyCandidates.length);
    const playMessage = replyCandidates[randomIndex];

    replyTextMessage_(
      event.replyToken,
      playMessage,
      channelAccessToken,
      false
    );
    return;
  }

  if (receivedText === '今の気分') {
    const moodQuickReplyItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '元気',
          text: '元気',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'ふつう',
          text: 'ふつう',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'つかれた',
          text: 'つかれた',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '応援して',
          text: '応援して',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      '今日はどんな気分ですか？🐱',
      channelAccessToken,
      true,
      moodQuickReplyItems
    );
    return;
  }

  const moodMessages = {
    '元気': [
      '元気でなによりです🐱\n今日もいいことがありそうです。',
      'その元気、しゃりねこにも分けてもらいました🐱\n今日も楽しくいきましょう✨',
      '今日は調子がよさそうですね🐱\nしゃりねこもうれしいです🍣',
    ],
    'ふつう': [
      'ふつうの日も、いい日です🐱\nのんびりいきましょう。',
      '穏やかに過ごせていますね。\n今日も自分のペースで🍵',
      '何でもない一日も大切です。\nゆるりといきましょう🐱',
    ],
    'つかれた': [
      '今日もよくがんばりました。\n少しだけ、ひとやすみしませんか？🍵',
      'おつかれさまです🐱\n今はゆっくりして大丈夫ですよ。',
      '無理せずにね。\nしゃりねこと一緒に、ひと休みしましょう🍣',
    ],
    '応援して': [
      'だいじょうぶです🐱\nしゃりねこが応援しています。',
      '一歩ずつで大丈夫。\nあなたのペースでいきましょう✨',
      'うまくいきますように🍣\nしゃりねこが、そっと背中を押します。',
    ],
  };
  const hasMood = Object.prototype.hasOwnProperty.call(
    moodMessages,
    receivedText
  );

  if (hasMood) {
    const replyCandidates = moodMessages[receivedText];
    const randomIndex = Math.floor(Math.random() * replyCandidates.length);
    const moodMessage = replyCandidates[randomIndex];

    replyTextMessage_(
      event.replyToken,
      moodMessage,
      channelAccessToken,
      false
    );
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
    '下のメニューから気になる項目を選んでください。';

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
 * @param {Object[]} [quickReplyItems] 表示するクイックリプライ項目
 */
function replyTextMessage_(
  replyToken,
  text,
  channelAccessToken,
  showQuickReply,
  quickReplyItems
) {
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
      items: quickReplyItems || [
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
          action: {
            type: 'message',
            label: '今の気分',
            text: '今の気分',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: 'メニュー',
            text: 'メニュー',
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

/**
 * LINEのReply APIを使い、動画閲覧ページへ案内するButtonsテンプレートを返信します。
 *
 * @param {string} replyToken LINEから届いた返信用トークン
 * @param {string} channelAccessToken チャネルアクセストークン
 */
function replyVideoTemplate_(replyToken, channelAccessToken) {
  if (!replyToken) {
    console.error('返信に必要なreplyTokenがありません。');
    return;
  }

  const videoPageUrl =
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/umibe-no-sanrinsha-neko/';
  const message = {
    type: 'template',
    altText: 'しゃりねこ動画のご案内',
    template: {
      type: 'buttons',
      thumbnailImageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/umibe-no-sanrinsha-neko-thumbnail.jpg',
      text: '海辺のしゃりねこを、そっとのぞいてみますか？🐱',
      defaultAction: {
        type: 'uri',
        label: '動画を見る',
        uri: videoPageUrl,
      },
      actions: [
        {
          type: 'uri',
          label: '動画を見る',
          uri: videoPageUrl,
        },
      ],
    },
  };

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
