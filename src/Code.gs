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
      {
        type: 'action',
        action: {
          type: 'message',
          label: '和菓子ねこ',
          text: '和菓子ねこ',
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

  const wagashiWorks = {
    '和菓子ねこ：たい焼き': {
      replyText: 'たい焼き、どうぞ。🐱',
      imageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/wagashi/taiyaki-neko.png',
    },
    '和菓子ねこ：みたらし': {
      replyText: 'みたらし団子、どうぞ。🐱',
      imageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/wagashi/mitarashi-neko.png',
    },
    '和菓子ねこ：いちご大福': {
      replyText: 'いちご大福、どうぞ。🐱',
      imageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/wagashi/ichigo-daifuku-neko.png',
    },
    '和菓子ねこ：抹茶': {
      replyText: '抹茶、どうぞ。🐱',
      imageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/wagashi/matcha-neko.png',
    },
    '和菓子ねこ：どら焼き': {
      replyText: 'どら焼き、どうぞ。🐱',
      imageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/wagashi/dorayaki-neko.png',
    },
    '和菓子ねこ：桜餅': {
      replyText: '桜餅、どうぞ。🐱',
      imageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/wagashi/sakura-mochi-neko.png',
    },
    '和菓子ねこ：ねりきり': {
      replyText: 'ねりきり、どうぞ。🐱',
      imageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/wagashi/nerikiri-neko.png',
    },
    '和菓子ねこ：くず餅': {
      replyText: 'くず餅、どうぞ。🐱',
      imageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/wagashi/kuzu-mochi-neko.png',
    },
  };

  if (receivedText === '和菓子ねこ') {
    const wagashiQuickReplyItems = createWagashiQuickReplyItems_(wagashiWorks);

    replyTextMessage_(
      event.replyToken,
      'どの和菓子にしますか？🐱',
      channelAccessToken,
      true,
      wagashiQuickReplyItems
    );
    return;
  }

  if (Object.prototype.hasOwnProperty.call(wagashiWorks, receivedText)) {
    const wagashiWork = wagashiWorks[receivedText];
    replyTextAndImageMessage_(
      event.replyToken,
      channelAccessToken,
      wagashiWork.replyText,
      wagashiWork.imageUrl,
      createWagashiQuickReplyItems_(wagashiWorks)
    );
    return;
  }

  const videoWorks = {
    'しゃりねこ動画：海辺': {
      guideText: '海辺のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/umibe-no-sanrinsha-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/umibe-no-sanrinsha-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：季節のしゃりねこ',
    },
    'しゃりねこ動画：バリスタ': {
      guideText: 'カフェのしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/barista-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/barista-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：ソムリエ': {
      guideText: 'ソムリエのしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/sommelier-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sommelier-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：たい焼き': {
      guideText: 'たい焼きのしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/taiyaki-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/taiyaki-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：たい焼き屋': {
      guideText: 'たい焼き屋のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/taiyakiya-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/taiyakiya-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：パン職人': {
      guideText: 'パン屋のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/pan-shokunin-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/pan-shokunin-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：八百屋': {
      guideText: '八百屋のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/pan-shokunin-yaoya-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/pan-shokunin-yaoya-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：花屋': {
      guideText: '花屋のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/hanaya-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/hanaya-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：レコード屋': {
      guideText: 'レコード屋のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/record-shop-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/record-shop-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：本屋': {
      guideText: '本屋のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/honya-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/honya-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：おみせ｜お茶': {
      guideText: 'お茶を注ぐしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/tea-serving-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/tea-serving-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：おみせ｜おにぎり': {
      guideText: 'おにぎりを作るしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/onigiri-maker-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/onigiri-maker-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：おみせ｜閉店後': {
      guideText: '閉店後に一杯やるしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/after-hours-drink-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/after-hours-drink-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：おみせ｜落ち葉掃除': {
      guideText: '店先で落ち葉を掃くしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/last-leaf-sweeping-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/last-leaf-sweeping-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：一日｜朝': {
      guideText: '朝のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/morning-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/morning-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜海辺': {
      guideText: '海辺のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/seaside-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/seaside-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜月夜': {
      guideText: '月夜のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/moonlit-night-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/moonlit-night-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜花畑': {
      guideText: '花畑のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/flower-field-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/flower-field-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜森の小川': {
      guideText: '森の小川のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/forest-stream-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/forest-stream-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜風の丘': {
      guideText: '風の丘のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/windy-hill-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/windy-hill-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜踏切': {
      guideText: '踏切のしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/train-crossing-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/train-crossing-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜カフェ': {
      guideText:
        'カフェでひとやすみするしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/coffee-break-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/coffee-break-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜秋の夜長': {
      guideText: '秋の夜に本を読むしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/autumn-night-reading-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/autumn-night-reading-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜落ち葉': {
      guideText:
        '落ち葉を見つめるしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/falling-leaf-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/falling-leaf-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：季節のしゃりねこ',
    },
    'しゃりねこ動画：一日｜残暑': {
      guideText:
        '縁側で残暑を過ごすしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/late-summer-relaxing-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/late-summer-relaxing-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：季節のしゃりねこ',
    },
    'しゃりねこ動画：一日｜残暑見舞い': {
      guideText: '残暑を見舞うしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/late-summer-greeting-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/late-summer-greeting-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：季節のしゃりねこ',
    },
    'しゃりねこ動画：一日｜暑い': {
      guideText:
        '暑さに不満げなしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/late-summer-complaint-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/late-summer-complaint-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：季節のしゃりねこ',
    },
    'しゃりねこ動画：一日｜どんぐり': {
      guideText:
        'どんぐりを見つめるしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/acorn-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/acorn-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：季節のしゃりねこ',
    },
  };

  if (receivedText === 'しゃりねこ動画') {
    const videoCategoryQuickReplyItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'おみせとおでかけ',
          text: 'しゃりねこ動画：おみせとおでかけ',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'しゃりねこの一日',
          text: 'しゃりねこ動画：しゃりねこの一日',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '季節のしゃりねこ',
          text: 'しゃりねこ動画：季節のしゃりねこ',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      'どのしゃりねこをのぞいてみますか？🐱',
      channelAccessToken,
      true,
      videoCategoryQuickReplyItems
    );
    return;
  }

  if (receivedText === 'しゃりねこ動画：おみせとおでかけ') {
    const videoQuickReplyItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'バリスタ',
          text: 'しゃりねこ動画：バリスタ',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'ソムリエ',
          text: 'しゃりねこ動画：ソムリエ',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'たい焼き',
          text: 'しゃりねこ動画：たい焼き',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'たい焼き屋',
          text: 'しゃりねこ動画：たい焼き屋',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'パン',
          text: 'しゃりねこ動画：パン職人',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '八百屋',
          text: 'しゃりねこ動画：八百屋',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '花屋',
          text: 'しゃりねこ動画：花屋',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'レコード',
          text: 'しゃりねこ動画：レコード屋',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '本屋',
          text: 'しゃりねこ動画：本屋',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'お茶',
          text: 'しゃりねこ動画：おみせ｜お茶',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'おにぎり',
          text: 'しゃりねこ動画：おみせ｜おにぎり',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '閉店後',
          text: 'しゃりねこ動画：おみせ｜閉店後',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '落ち葉掃除',
          text: 'しゃりねこ動画：おみせ｜落ち葉掃除',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      'どのしゃりねこをのぞいてみますか？🐱',
      channelAccessToken,
      true,
      videoQuickReplyItems
    );
    return;
  }

  if (receivedText === 'しゃりねこ動画：しゃりねこの一日') {
    const dailyLifeVideoQuickReplyItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '朝',
          text: 'しゃりねこ動画：一日｜朝',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '海辺',
          text: 'しゃりねこ動画：一日｜海辺',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '月夜',
          text: 'しゃりねこ動画：一日｜月夜',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '花畑',
          text: 'しゃりねこ動画：一日｜花畑',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '森の小川',
          text: 'しゃりねこ動画：一日｜森の小川',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '風の丘',
          text: 'しゃりねこ動画：一日｜風の丘',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '踏切',
          text: 'しゃりねこ動画：一日｜踏切',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'カフェ',
          text: 'しゃりねこ動画：一日｜カフェ',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '秋の夜長',
          text: 'しゃりねこ動画：一日｜秋の夜長',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      'どの一日をのぞいてみますか？🐱',
      channelAccessToken,
      true,
      dailyLifeVideoQuickReplyItems
    );
    return;
  }

  if (receivedText === 'しゃりねこ動画：季節のしゃりねこ') {
    const seasonalVideoQuickReplyItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '海辺',
          text: 'しゃりねこ動画：海辺',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '落ち葉',
          text: 'しゃりねこ動画：一日｜落ち葉',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '残暑',
          text: 'しゃりねこ動画：一日｜残暑',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '残暑見舞い',
          text: 'しゃりねこ動画：一日｜残暑見舞い',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '暑い',
          text: 'しゃりねこ動画：一日｜暑い',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'どんぐり',
          text: 'しゃりねこ動画：一日｜どんぐり',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      'どのしゃりねこをのぞいてみますか？🐱',
      channelAccessToken,
      true,
      seasonalVideoQuickReplyItems
    );
    return;
  }

  if (Object.prototype.hasOwnProperty.call(videoWorks, receivedText)) {
    const selectedVideo = videoWorks[receivedText];
    replyVideoTemplate_(event.replyToken, channelAccessToken, selectedVideo);
    return;
  }

  const meowMessages = [
    'にゃ。',
    'にゃー。',
    '……にゃ。',
  ];

  if (receivedText === 'しゃりねこ観察') {
    if (Math.random() < 0.45) {
      const randomIndex = Math.floor(Math.random() * meowMessages.length);
      const meowMessage = meowMessages[randomIndex];

      replyTextMessage_(
        event.replyToken,
        meowMessage,
        channelAccessToken,
        false
      );
      return;
    }

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
    const playQuickReplyItems = createPlayQuickReplyItems_();

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
      true,
      createPlayQuickReplyItems_()
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
    const canMeow = [
      'なでる',
      '呼んでみる',
      'そっと見る',
    ].includes(receivedText);

    if (canMeow && Math.random() < 0.45) {
      const randomIndex = Math.floor(Math.random() * meowMessages.length);
      const meowMessage = meowMessages[randomIndex];

      replyTextMessage_(
        event.replyToken,
        meowMessage,
        channelAccessToken,
        true,
        createPlayQuickReplyItems_()
      );
      return;
    }

    const replyCandidates = playMessages[receivedText];
    const randomIndex = Math.floor(Math.random() * replyCandidates.length);
    const playMessage = replyCandidates[randomIndex];

    replyTextMessage_(
      event.replyToken,
      playMessage,
      channelAccessToken,
      true,
      createPlayQuickReplyItems_()
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

  const conversationMessages = {
    'かんぱい': [
      'しゃりねこは、グラスの向こうを見ています',
      'しゃりねこは、乾杯の様子を眺めています',
      'しゃりねこは、特に飲む予定はなさそうです',
    ],
    '酔いました': [
      'しゃりねこは、水を置いていきました',
      'しゃりねこは、少し距離をとりました',
      'しゃりねこは、静かに様子を見ています',
    ],
    'いる？': [
      'しゃりねこは、一応いるようです',
      'しゃりねこは、すぐ近くにいます',
      'しゃりねこは、返事をするか考えています',
    ],
    'なにしてる': [
      'しゃりねこは、特に何もしていません',
      'しゃりねこは、少しだけ忙しそうです',
      'しゃりねこは、さっきから同じ場所にいます',
    ],
  };
  const hasConversation = Object.prototype.hasOwnProperty.call(
    conversationMessages,
    receivedText
  );

  if (hasConversation) {
    const conversationRoll = Math.random();

    if (conversationRoll < 0.4) {
      const replyCandidates = conversationMessages[receivedText];
      const randomIndex = Math.floor(Math.random() * replyCandidates.length);

      replyTextMessage_(
        event.replyToken,
        replyCandidates[randomIndex],
        channelAccessToken,
        false
      );
      return;
    }

    if (conversationRoll < 0.85) {
      const randomIndex = Math.floor(Math.random() * meowMessages.length);

      replyTextMessage_(
        event.replyToken,
        meowMessages[randomIndex],
        channelAccessToken,
        false
      );
      return;
    }

    const conversationVideoKeywords = {
      'かんぱい': 'しゃりねこ動画：ソムリエ',
      '酔いました': 'しゃりねこ動画：ソムリエ',
      'いる？': 'しゃりねこ動画：海辺',
      'なにしてる': 'しゃりねこ動画：バリスタ',
    };
    const videoKeyword = conversationVideoKeywords[receivedText];
    const selectedVideo = videoWorks[videoKeyword];

    replyVideoTemplate_(
      event.replyToken,
      channelAccessToken,
      selectedVideo
    );
    return;
  }

  if (Math.random() < 0.6) {
    const remainingConversationItems = [
      { label: 'かんぱい', text: 'かんぱい', weight: 2 },
      { label: 'よった', text: '酔いました', weight: 2 },
      { label: 'いる？', text: 'いる？', weight: 1 },
      { label: 'なにしてる', text: 'なにしてる', weight: 1 },
      { label: 'ひま', text: 'ひま', weight: 1 },
      { label: 'ねむい', text: 'ねむい', weight: 1 },
      { label: 'ありがとう', text: 'ありがとう', weight: 1 },
      { label: 'またね', text: 'またね', weight: 1 },
      { label: 'おはよう', text: 'おはよう', weight: 1 },
      { label: 'こんにちは', text: 'こんにちは', weight: 1 },
      { label: 'つかれた', text: 'つかれた', weight: 1 },
      { label: 'ただいま', text: 'ただいま', weight: 1 },
      { label: 'おやすみ', text: 'おやすみ', weight: 1 },
      { label: 'おつかれさま', text: 'おつかれさま', weight: 1 },
      { label: 'おなかすいた', text: 'おなかすいた', weight: 1 },
    ];
    const conversationQuickReplyItems = [];

    while (conversationQuickReplyItems.length < 3) {
      const totalWeight = remainingConversationItems.reduce(
        function (sum, item) {
          return sum + item.weight;
        },
        0
      );
      let selectionRoll = Math.random() * totalWeight;
      let selectedIndex = 0;

      for (let index = 0; index < remainingConversationItems.length; index++) {
        selectionRoll -= remainingConversationItems[index].weight;

        if (selectionRoll < 0) {
          selectedIndex = index;
          break;
        }
      }

      const selectedItem = remainingConversationItems.splice(
        selectedIndex,
        1
      )[0];
      conversationQuickReplyItems.push({
        type: 'action',
        action: {
          type: 'message',
          label: selectedItem.label,
          text: selectedItem.text,
        },
      });
    }

    replyTextMessage_(
      event.replyToken,
      'しゃりねこが、こちらを見ています',
      channelAccessToken,
      true,
      conversationQuickReplyItems
    );
    return;
  }

  replyTextMessage_(
    event.replyToken,
    'へい、おまち。🍣',
    channelAccessToken,
    false
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
 * 遊びメニューで使用するクイックリプライ項目を生成します。
 *
 * @return {Object[]} 遊びのクイックリプライ項目
 */
function createPlayQuickReplyItems_() {
  return [
    ['なでる', 'なでる'],
    ['おやつ', 'おやつを置く'],
    ['よぶ', '呼んでみる'],
    ['みる', 'そっと見る'],
    ['チェック', 'しゃりねこチェック'],
  ].map(function (playItem) {
    return {
      type: 'action',
      action: {
        type: 'message',
        label: playItem[0],
        text: playItem[1],
      },
    };
  });
}

/**
 * 和菓子メニューで使用するクイックリプライ項目を生成します。
 *
 * @param {Object} wagashiWorks 和菓子ごとの返信設定
 * @return {Object[]} 和菓子のクイックリプライ項目
 */
function createWagashiQuickReplyItems_(wagashiWorks) {
  return [
    ['たい焼き', '和菓子ねこ：たい焼き'],
    ['みたらし', '和菓子ねこ：みたらし'],
    ['いちご大福', '和菓子ねこ：いちご大福'],
    ['抹茶', '和菓子ねこ：抹茶'],
    ['どら焼き', '和菓子ねこ：どら焼き'],
    ['桜餅', '和菓子ねこ：桜餅'],
    ['ねりきり', '和菓子ねこ：ねりきり'],
    ['くず餅', '和菓子ねこ：くず餅'],
  ].map(function (wagashiItem) {
    const label = wagashiItem[0];
    const text = wagashiItem[1];

    return {
      type: 'action',
      imageUrl: wagashiWorks[text].imageUrl,
      action: {
        type: 'message',
        label: label,
        text: text,
      },
    };
  });
}

/**
 * LINEのReply APIを使い、テキストと画像を1回のAPI呼び出しで返信します。
 *
 * @param {string} replyToken LINEから届いた返信用トークン
 * @param {string} channelAccessToken チャネルアクセストークン
 * @param {string} text 返信するテキスト
 * @param {string} imageUrl 返信する画像のURL
 * @param {Object[]} quickReplyItems 画像に表示するクイックリプライ項目
 */
function replyTextAndImageMessage_(
  replyToken,
  channelAccessToken,
  text,
  imageUrl,
  quickReplyItems
) {
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
        },
        {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
          quickReply: {
            items: quickReplyItems,
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

/**
 * LINEのReply APIを使い、動画閲覧ページへ案内するButtonsテンプレートを返信します。
 *
 * @param {string} replyToken LINEから届いた返信用トークン
 * @param {string} channelAccessToken チャネルアクセストークン
 * @param {Object} videoWork 動画作品の案内文、閲覧ページURL、サムネイルURL
 */
function replyVideoTemplate_(replyToken, channelAccessToken, videoWork) {
  if (!replyToken) {
    console.error('返信に必要なreplyTokenがありません。');
    return;
  }

  const message = {
    type: 'template',
    altText: 'しゃりねこ動画のご案内',
    template: {
      type: 'buttons',
      thumbnailImageUrl: videoWork.thumbnailUrl,
      text: videoWork.guideText,
      defaultAction: {
        type: 'uri',
        label: '動画を見る',
        uri: videoWork.pageUrl,
      },
      actions: [
        {
          type: 'uri',
          label: '動画を見る',
          uri: videoWork.pageUrl,
        },
        {
          type: 'message',
          label: 'ほかの動画',
          text: videoWork.categoryKeyword,
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
