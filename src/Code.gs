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

  if (receivedText === '所長登録') {
    handleDirectorRegistration_(event, channelAccessToken);
    return;
  }

  if (receivedText === 'メニュー') {
    const menuQuickReplyItems = [
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
          label: 'どうが',
          text: 'しゃりねこ動画',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'かぶりもの',
          text: '今日のかぶりもの',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '和菓子',
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

  if (receivedText === '今日のかぶりもの') {
    const kaburimonoImageBaseUrl =
      'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/kaburimono/';
    const kaburimonoCandidates = [
      {
        text: '今日は、強そうです。',
        imageUrl: kaburimonoImageBaseUrl + 'shark-neko.png',
      },
      {
        text: 'のんびりいきましょう。',
        imageUrl: kaburimonoImageBaseUrl + 'straw-hat-neko.png',
      },
      {
        text: '甘めの一日です。',
        imageUrl: kaburimonoImageBaseUrl + 'dorayaki-neko.png',
      },
      {
        text: '聞き耳を立てています。',
        imageUrl: kaburimonoImageBaseUrl + 'rabbit-neko.png',
      },
      {
        text: '今日は、グルーヴ重視です。',
        imageUrl: kaburimonoImageBaseUrl + 'buffalo-hat-neko.png',
      },
      {
        text: 'あんこは入っていません。たぶん。',
        imageUrl: kaburimonoImageBaseUrl + 'taiyaki-neko.png',
      },
      {
        text: 'きれいにむけました。',
        imageUrl: kaburimonoImageBaseUrl + 'mikan-peel-neko.png',
      },
      {
        text: '本日は、えらい猫です。',
        imageUrl: kaburimonoImageBaseUrl + 'crown-neko.png',
      },
    ];
    const selectedKaburimono =
      kaburimonoCandidates[
        Math.floor(Math.random() * kaburimonoCandidates.length)
      ];

    replyTextAndImageMessage_(
      event.replyToken,
      channelAccessToken,
      selectedKaburimono.text,
      selectedKaburimono.imageUrl
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

  const videoWorks = createVideoWorks_();

  if (receivedText === 'しゃりねこ動画') {
    const videoCategoryQuickReplyItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'おでかけ',
          text: 'しゃりねこ動画：おみせとおでかけ',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '日常',
          text: 'しゃりねこ動画：しゃりねこの一日',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '季節',
          text: 'しゃりねこ動画：季節のしゃりねこ',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '秋',
          text: 'しゃりねこ動画：秋のしゃりねこ',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'おしごと',
          text: 'しゃりねこ動画：おしごとと通勤',
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
          label: 'ピザ職人',
          text: 'しゃりねこ動画：おみせ｜ピザ職人',
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
      {
        type: 'action',
        action: {
          type: 'message',
          label: '食パン',
          text: 'しゃりねこ動画：一日｜食パン',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'ふみふみ',
          text: 'しゃりねこ動画：一日｜ふみふみ',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '角ロック',
          text: 'しゃりねこ動画：一日｜角ロック',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'ホッピー',
          text: 'しゃりねこ動画：一日｜ホッピー',
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
          label: 'てるてる坊主',
          text: 'しゃりねこ動画：季節｜てるてる坊主',
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

  if (receivedText === 'しゃりねこ動画：秋のしゃりねこ') {
    const autumnVideoQuickReplyItems = [
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
          label: 'どんぐり',
          text: 'しゃりねこ動画：一日｜どんぐり',
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
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'お月見',
          text: 'しゃりねこ動画：季節｜お月見',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '縁側',
          text: 'しゃりねこ動画：季節｜縁側',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'さんま',
          text: 'しゃりねこ動画：季節｜さんま',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '紅葉狩り',
          text: 'しゃりねこ動画：季節｜紅葉狩り',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '焼き芋',
          text: 'しゃりねこ動画：季節｜焼き芋',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '栗拾い',
          text: 'しゃりねこ動画：秋｜栗拾い',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '秋の日の出',
          text: 'しゃりねこ動画：秋｜秋の日の出',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      'どの秋をのぞいてみますか？🐱',
      channelAccessToken,
      true,
      autumnVideoQuickReplyItems
    );
    return;
  }

  if (receivedText === 'しゃりねこ動画：おしごとと通勤') {
    const workVideoQuickReplyItems = [
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'サラリーマン',
          text: 'しゃりねこ動画：仕事｜サラリーマン',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '一本見送り',
          text: 'しゃりねこ動画：仕事｜一本見送り',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'うとうと',
          text: 'しゃりねこ動画：仕事｜うとうと',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '帰宅',
          text: 'しゃりねこ動画：仕事｜帰宅',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '陶芸家',
          text: 'しゃりねこ動画：仕事｜陶芸家',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '寿司屋',
          text: 'しゃりねこ動画：仕事｜寿司屋',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '寿司職人',
          text: 'しゃりねこ動画：仕事｜寿司職人',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '蕎麦職人',
          text: 'しゃりねこ動画：仕事｜蕎麦職人',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '終電',
          text: 'しゃりねこ動画：仕事｜終電',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '書道家',
          text: 'しゃりねこ動画：仕事｜書道家',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '紅葉警備員',
          text: 'しゃりねこ動画：仕事｜紅葉警備員',
        },
      },
    ];

    replyTextMessage_(
      event.replyToken,
      'どのおしごとをのぞいてみますか？🐱',
      channelAccessToken,
      true,
      workVideoQuickReplyItems
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

  const sushiNekoImageUrls = [
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi/maguro-neko.png',
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi/salmon-neko.png',
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi/tamago-neko.png',
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi/ika-neko.png',
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi/tako-neko.png',
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi/ebi-neko.png',
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi/ikura-neko.png',
    'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi/natto-neko.png',
  ];
  const sushiNekoImageUrl =
    sushiNekoImageUrls[Math.floor(Math.random() * sushiNekoImageUrls.length)];

  replyTextAndImageMessage_(
    event.replyToken,
    channelAccessToken,
    'へい、おまち。🍣',
    sushiNekoImageUrl
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
 * @param {Object[]} [quickReplyItems] 画像に表示するクイックリプライ項目
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

  const imageMessage = {
    type: 'image',
    originalContentUrl: imageUrl,
    previewImageUrl: imageUrl,
  };

  if (quickReplyItems) {
    imageMessage.quickReply = {
      items: quickReplyItems,
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
      messages: [
        {
          type: 'text',
          text: text,
        },
        imageMessage,
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

  const message = createVideoTemplateMessage_(videoWork);

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
 * 登録済みの動画作品データを返します。
 *
 * @return {Object<string, Object>} 正式キーワードをキーとする動画作品データ
 */
function createVideoWorks_() {
  return {
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
      categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
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
      categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
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
      categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
    },
    'しゃりねこ動画：一日｜食パン': {
      guideText:
        '食パンが焼けるのを待つしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/shokupan-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/shokupan-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：仕事｜サラリーマン': {
      guideText: 'カフェで作業するしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/office-worker-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/office-worker-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜一本見送り': {
      guideText:
        '駅で電車を一本見送るしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/train-platform-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/train-platform-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜うとうと': {
      guideText:
        '通勤電車でうとうとするしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/sleepy-commuter-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sleepy-commuter-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜帰宅': {
      guideText: '夕方の電車で帰るしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/going-home-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/going-home-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜陶芸家': {
      title: '器、できました。',
      guideText:
        'ろくろを回して器を仕上げるしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/pottery-artist-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/pottery-artist-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜寿司屋': {
      title: '本業です。',
      guideText: '寿司屋が本業のしゃりねこが、今日もお店に立ちます。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/sushi-shop-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi-shop-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜寿司職人': {
      title: 'へい、おまち。',
      guideText: 'わさびをちょんと添えて、寿司を握るしゃりねこです。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/sushi-chef-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/sushi-chef-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜蕎麦職人': {
      title: 'そば、打ちました。',
      guideText: 'こねて、のばして、切って。蕎麦を一丁仕上げます。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/soba-chef-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/soba-chef-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜終電': {
      title: '寝てません。',
      guideText:
        '終電の車内で眠気と戦うしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/last-train-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/last-train-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜書道家': {
      title: '猫、書きました。',
      guideText: '筆を走らせて「猫」を仕上げるしゃりねこです。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/calligrapher-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/calligrapher-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：仕事｜紅葉警備員': {
      title: '帽子、死守。',
      guideText: 'ライトアップされた紅葉を警備するしゃりねこです。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/autumn-leaves-guard-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/autumn-leaves-guard-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おしごとと通勤',
    },
    'しゃりねこ動画：季節｜てるてる坊主': {
      title: 'そろそろ、晴れてください。',
      guideText: '雨の窓辺で、てるてる坊主を作るしゃりねこです。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/teru-teru-bozu-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/teru-teru-bozu-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：季節のしゃりねこ',
    },
    'しゃりねこ動画：秋｜栗拾い': {
      title: '聞いてない。',
      guideText: '栗を拾おうとして、イガのトゲに気づくしゃりねこです。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/chestnut-picking-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/chestnut-picking-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
    },
    'しゃりねこ動画：一日｜角ロック': {
      title: 'ロックです。',
      guideText: '居酒屋で角ロックをじっくり味わうしゃりねこです。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/kaku-rock-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/kaku-rock-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：一日｜ホッピー': {
      title: 'ホッピー、濃いめで。',
      guideText: '居酒屋で好みの濃さに仕上げるしゃりねこです。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/hoppy-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/hoppy-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：秋｜秋の日の出': {
      title: '朝は、来ました。',
      guideText: '秋の海辺で日の出を見つめるしゃりねこです。',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/autumn-sunrise-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/autumn-sunrise-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
    },
    'しゃりねこ動画：おみせ｜ピザ職人': {
      guideText:
        'ピザを焼くしゃりねこ職人を、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/pizza-maker-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/pizza-maker-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：おみせとおでかけ',
    },
    'しゃりねこ動画：一日｜ふみふみ': {
      guideText:
        '座布団をふみふみするしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/fumifumi-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/fumifumi-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：しゃりねこの一日',
    },
    'しゃりねこ動画：季節｜お月見': {
      guideText:
        'お月見団子を待つしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/moon-viewing-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/moon-viewing-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
    },
    'しゃりねこ動画：季節｜縁側': {
      guideText: '縁側で音に気づくしゃりねこを、そっとのぞいてみますか？🐱',
      pageUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/engawa-neko/',
      thumbnailUrl:
        'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/engawa-neko-thumbnail.jpg',
      categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
    },
    'しゃりねこ動画：季節｜さんま': createGrilledSanmaVideoWork_(),
    'しゃりねこ動画：季節｜紅葉狩り':
      createAutumnLeavesViewingVideoWork_(),
    'しゃりねこ動画：季節｜焼き芋': createRoastedSweetPotatoVideoWork_(),
  };
}

/**
 * 動画作品のButtonsテンプレートメッセージを生成します。
 *
 * @param {Object} videoWork 動画作品の案内文、閲覧ページURL、サムネイルURL
 * @return {Object} LINE Messaging APIへ渡すButtonsテンプレートメッセージ
 */
function createVideoTemplateMessage_(videoWork) {
  const template = {
    type: 'buttons',
    thumbnailImageUrl: videoWork.thumbnailUrl,
  };

  if (videoWork.title) {
    template.title = videoWork.title;
  }

  template.text = videoWork.guideText;
  template.defaultAction = {
    type: 'uri',
    label: '動画を見る',
    uri: videoWork.pageUrl,
  };
  template.actions = [
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
  ];

  return {
    type: 'template',
    altText: 'しゃりねこ動画のご案内',
    template: template,
  };
}

/**
 * 紅葉狩り動画の案内データを返します。
 *
 * @return {Object} 紅葉狩り動画の案内データ
 */
function createAutumnLeavesViewingVideoWork_() {
  return {
    guideText:
      '紅葉を拾って頭に載せるしゃりねこを、そっとのぞいてみますか？🐱',
    pageUrl:
      'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/autumn-leaves-viewing-neko/',
    thumbnailUrl:
      'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/autumn-leaves-viewing-neko-thumbnail.jpg',
    categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
  };
}

/**
 * 焼き芋動画の案内データを返します。
 *
 * @return {Object} 焼き芋動画の案内データ
 */
function createRoastedSweetPotatoVideoWork_() {
  return {
    guideText:
      '焼き芋を念力で割るしゃりねこを、そっとのぞいてみますか？🐱',
    pageUrl:
      'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/roasted-sweet-potato-neko/',
    thumbnailUrl:
      'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/roasted-sweet-potato-neko-thumbnail.jpg',
    categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
  };
}

/**
 * さんま動画の案内データを返します。
 *
 * @return {Object} さんま動画の案内データ
 */
function createGrilledSanmaVideoWork_() {
  return {
    guideText:
      '秋の縁側でさんまが焼けるのを待つしゃりねこを、そっとのぞいてみますか？🐱',
    pageUrl:
      'https://naoto-suzuki-335.github.io/shari-neko-line-bot/videos/grilled-sanma-neko/',
    thumbnailUrl:
      'https://naoto-suzuki-335.github.io/shari-neko-line-bot/assets/images/grilled-sanma-neko-thumbnail.jpg',
    categoryKeyword: 'しゃりねこ動画：秋のしゃりねこ',
  };
}

/**
 * 週3回の動画broadcast用トリガーを作成します。
 */
function installWeeklyVideoBroadcastTriggers() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('週次動画配信のトリガーを作成できませんでした。');
  }

  const createdTriggers = [];

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const channelAccessToken = scriptProperties.getProperty(
      'LINE_CHANNEL_ACCESS_TOKEN'
    );

    if (
      !channelAccessToken ||
      scriptProperties.getProperty('WEEKLY_VIDEO_BROADCAST_ACTIVE') === 'true' ||
      scriptProperties.getProperty('WEEKLY_VIDEO_BROADCAST_IN_FLIGHT_SLOT') ||
      getWeeklyVideoBroadcastTriggers_().length > 0
    ) {
      throw new Error('週次動画配信のトリガーを作成できませんでした。');
    }

    const triggerDefinitions = [
      {
        handler: 'runSundayNewVideoBroadcast',
        weekDay: ScriptApp.WeekDay.SUNDAY,
      },
      {
        handler: 'runWednesdayRandomVideoBroadcast',
        weekDay: ScriptApp.WeekDay.WEDNESDAY,
      },
      {
        handler: 'runFridaySeasonalVideoBroadcast',
        weekDay: ScriptApp.WeekDay.FRIDAY,
      },
    ];

    triggerDefinitions.forEach(function (definition) {
      createdTriggers.push(
        ScriptApp.newTrigger(definition.handler)
          .timeBased()
          .onWeekDay(definition.weekDay)
          .atHour(10)
          .inTimezone('Asia/Tokyo')
          .create()
      );
    });

    scriptProperties.setProperty(
      'WEEKLY_VIDEO_BROADCAST_TRIGGER_IDS',
      JSON.stringify(
        createdTriggers.map(function (trigger) {
          return trigger.getUniqueId();
        })
      )
    );
    scriptProperties.setProperty('WEEKLY_VIDEO_BROADCAST_ACTIVE', 'true');
    console.log('週次動画配信のトリガーを作成しました。');
  } catch (error) {
    createdTriggers.forEach(function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    });
    throw new Error('週次動画配信のトリガーを作成できませんでした。');
  } finally {
    lock.releaseLock();
  }
}

/**
 * 週3回の動画broadcastを停止します。
 */
function stopWeeklyVideoBroadcast() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('週次動画配信を停止できませんでした。');
  }

  try {
    stopWeeklyVideoBroadcast_(
      PropertiesService.getScriptProperties(),
      false
    );
    console.log('週次動画配信を停止しました。');
  } finally {
    lock.releaseLock();
  }
}

/**
 * 日曜日に新しめの作品から1件配信します。
 */
function runSundayNewVideoBroadcast() {
  runWeeklyVideoBroadcast_('SUNDAY_NEW');
}

/**
 * 水曜日に全作品から1件配信します。
 */
function runWednesdayRandomVideoBroadcast() {
  runWeeklyVideoBroadcast_('WEDNESDAY_RANDOM');
}

/**
 * 金曜日に現在の季節に合う作品から1件配信します。
 */
function runFridaySeasonalVideoBroadcast() {
  runWeeklyVideoBroadcast_('FRIDAY_SEASONAL');
}

/**
 * 週次動画配信を1件実行します。
 *
 * @param {string} scheduleType 曜日別の配信種別
 */
function runWeeklyVideoBroadcast_(scheduleType) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    console.error('週次動画配信を実行できませんでした。');
    return;
  }

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const channelAccessToken = scriptProperties.getProperty(
      'LINE_CHANNEL_ACCESS_TOKEN'
    );
    const schedule = getWeeklyVideoBroadcastSchedule_(scheduleType, new Date());

    if (
      !schedule ||
      !channelAccessToken ||
      scriptProperties.getProperty('WEEKLY_VIDEO_BROADCAST_ACTIVE') !== 'true' ||
      !getWeeklyVideoBroadcastTriggers_().some(function (trigger) {
        return trigger.getHandlerFunction() === schedule.handler;
      })
    ) {
      console.error('週次動画配信を実行できませんでした。');
      return;
    }

    if (!schedule.isScheduledTime) {
      console.log('週次動画配信の対象時間外です。');
      return;
    }

    const slot = scheduleType + ':' + schedule.dateText;
    const completedSlot = scriptProperties.getProperty(
      'WEEKLY_VIDEO_BROADCAST_LAST_COMPLETED_SLOT'
    );

    if (completedSlot === slot) {
      console.log('この配信枠はすでに完了しています。');
      return;
    }

    if (scriptProperties.getProperty('WEEKLY_VIDEO_BROADCAST_IN_FLIGHT_SLOT')) {
      stopWeeklyVideoBroadcast_(scriptProperties, true);
      console.error('送信状態を確定できないため週次動画配信を停止しました。');
      return;
    }

    const videoWorks = createVideoWorks_();
    const candidateKeywords = getWeeklyVideoBroadcastCandidateKeywords_(
      scheduleType,
      schedule.month,
      videoWorks
    );
    const selectedKeyword = selectWeeklyVideoBroadcastKeyword_(
      candidateKeywords,
      scriptProperties.getProperty('WEEKLY_VIDEO_BROADCAST_LAST_KEYWORD')
    );
    const selectedVideo = videoWorks[selectedKeyword];

    if (!selectedVideo) {
      stopWeeklyVideoBroadcast_(scriptProperties, false);
      console.error('配信作品を決定できないため週次動画配信を停止しました。');
      return;
    }

    scriptProperties.setProperty('WEEKLY_VIDEO_BROADCAST_IN_FLIGHT_SLOT', slot);
    scriptProperties.setProperty(
      'WEEKLY_VIDEO_BROADCAST_IN_FLIGHT_KEYWORD',
      selectedKeyword
    );

    let statusCode;

    try {
      statusCode = broadcastVideoMessage_(channelAccessToken, selectedVideo);
    } catch (error) {
      scriptProperties.setProperty(
        'WEEKLY_VIDEO_BROADCAST_LAST_FAILURE_AT',
        new Date().toISOString()
      );
      stopWeeklyVideoBroadcast_(scriptProperties, true);
      console.error('送信結果を確定できないため週次動画配信を停止しました。');
      return;
    }

    if (statusCode < 200 || statusCode >= 300) {
      scriptProperties.setProperty(
        'WEEKLY_VIDEO_BROADCAST_LAST_FAILURE_AT',
        new Date().toISOString()
      );
      stopWeeklyVideoBroadcast_(scriptProperties, true);
      console.error('週次動画配信に失敗しました。ステータス: %s', statusCode);
      return;
    }

    scriptProperties.setProperty(
      'WEEKLY_VIDEO_BROADCAST_LAST_KEYWORD',
      selectedKeyword
    );
    scriptProperties.setProperty(
      'WEEKLY_VIDEO_BROADCAST_LAST_SENT_AT',
      new Date().toISOString()
    );
    scriptProperties.setProperty(
      'WEEKLY_VIDEO_BROADCAST_LAST_COMPLETED_SLOT',
      slot
    );
    scriptProperties.deleteProperty('WEEKLY_VIDEO_BROADCAST_IN_FLIGHT_SLOT');
    scriptProperties.deleteProperty('WEEKLY_VIDEO_BROADCAST_IN_FLIGHT_KEYWORD');
    scriptProperties.deleteProperty('WEEKLY_VIDEO_BROADCAST_LAST_FAILURE_AT');
    console.log('週次動画配信が完了しました。');
  } finally {
    lock.releaseLock();
  }
}

/**
 * 動画カード1件を友だち全員へbroadcastします。
 *
 * @param {string} channelAccessToken チャネルアクセストークン
 * @param {Object} videoWork 動画作品データ
 * @return {number} HTTPステータスコード
 */
function broadcastVideoMessage_(channelAccessToken, videoWork) {
  const response = UrlFetchApp.fetch(
    'https://api.line.me/v2/bot/message/broadcast',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + channelAccessToken,
      },
      payload: JSON.stringify({
        messages: [createVideoTemplateMessage_(videoWork)],
      }),
      muteHttpExceptions: true,
    }
  );

  return response.getResponseCode();
}

/**
 * 配信種別に対応する候補キーワードを返します。
 *
 * @param {string} scheduleType 曜日別の配信種別
 * @param {number} month JSTの月（1～12）
 * @param {Object<string, Object>} videoWorks 全動画作品
 * @return {Array<string>} 正式キーワード
 */
function getWeeklyVideoBroadcastCandidateKeywords_(
  scheduleType,
  month,
  videoWorks
) {
  let candidateKeywords;

  if (scheduleType === 'SUNDAY_NEW') {
    candidateKeywords = [
      'しゃりねこ動画：仕事｜陶芸家',
      'しゃりねこ動画：仕事｜寿司屋',
      'しゃりねこ動画：仕事｜寿司職人',
      'しゃりねこ動画：仕事｜蕎麦職人',
      'しゃりねこ動画：仕事｜終電',
      'しゃりねこ動画：仕事｜書道家',
      'しゃりねこ動画：仕事｜紅葉警備員',
      'しゃりねこ動画：季節｜てるてる坊主',
      'しゃりねこ動画：秋｜栗拾い',
      'しゃりねこ動画：一日｜角ロック',
      'しゃりねこ動画：一日｜ホッピー',
      'しゃりねこ動画：秋｜秋の日の出',
    ];
  } else if (scheduleType === 'WEDNESDAY_RANDOM') {
    candidateKeywords = Object.keys(videoWorks);
  } else if (scheduleType === 'FRIDAY_SEASONAL') {
    candidateKeywords = getSeasonalVideoBroadcastCandidateKeywords_(month);
  } else {
    return [];
  }

  const uniqueKeywords = Array.from(new Set(candidateKeywords));
  const allCandidatesExist = uniqueKeywords.every(function (keyword) {
    return Object.prototype.hasOwnProperty.call(videoWorks, keyword);
  });

  return allCandidatesExist && uniqueKeywords.length === candidateKeywords.length
    ? uniqueKeywords
    : [];
}

/**
 * JSTの月に対応する季節作品の正式キーワードを返します。
 *
 * @param {number} month JSTの月（1～12）
 * @return {Array<string>} 正式キーワード
 */
function getSeasonalVideoBroadcastCandidateKeywords_(month) {
  if (month >= 3 && month <= 5) {
    return [
      'しゃりねこ動画：一日｜花畑',
      'しゃりねこ動画：一日｜森の小川',
      'しゃりねこ動画：一日｜風の丘',
      'しゃりねこ動画：一日｜海辺',
      'しゃりねこ動画：バリスタ',
    ];
  }

  if (month >= 6 && month <= 8) {
    return [
      'しゃりねこ動画：季節｜てるてる坊主',
      'しゃりねこ動画：海辺',
      'しゃりねこ動画：一日｜残暑',
      'しゃりねこ動画：一日｜残暑見舞い',
      'しゃりねこ動画：一日｜暑い',
    ];
  }

  if (month >= 9 && month <= 11) {
    return [
      'しゃりねこ動画：一日｜落ち葉',
      'しゃりねこ動画：一日｜どんぐり',
      'しゃりねこ動画：おみせ｜落ち葉掃除',
      'しゃりねこ動画：季節｜お月見',
      'しゃりねこ動画：季節｜縁側',
      'しゃりねこ動画：季節｜さんま',
      'しゃりねこ動画：季節｜紅葉狩り',
      'しゃりねこ動画：季節｜焼き芋',
      'しゃりねこ動画：秋｜栗拾い',
      'しゃりねこ動画：秋｜秋の日の出',
    ];
  }

  if (month === 12 || month === 1 || month === 2) {
    return [
      'しゃりねこ動画：一日｜カフェ',
      'しゃりねこ動画：一日｜食パン',
      'しゃりねこ動画：一日｜ふみふみ',
      'しゃりねこ動画：おみせ｜お茶',
      'しゃりねこ動画：季節｜焼き芋',
    ];
  }

  return [];
}

/**
 * 直前作品を除外し、候補から均等ランダムに1件選びます。
 *
 * @param {Array<string>} candidateKeywords 候補キーワード
 * @param {string} lastKeyword 直前に配信したキーワード
 * @return {string|null} 選択したキーワード
 */
function selectWeeklyVideoBroadcastKeyword_(candidateKeywords, lastKeyword) {
  if (!Array.isArray(candidateKeywords) || candidateKeywords.length === 0) {
    return null;
  }

  const selectableKeywords = candidateKeywords.filter(function (keyword) {
    return keyword !== lastKeyword;
  });

  if (selectableKeywords.length === 0) {
    return null;
  }

  return selectableKeywords[
    Math.floor(Math.random() * selectableKeywords.length)
  ];
}

/**
 * 配信種別と現在時刻から実行条件を返します。
 *
 * @param {string} scheduleType 曜日別の配信種別
 * @param {Date} now 現在日時
 * @return {Object|null} スケジュール情報
 */
function getWeeklyVideoBroadcastSchedule_(scheduleType, now) {
  const scheduleDefinitions = {
    SUNDAY_NEW: { day: 0, handler: 'runSundayNewVideoBroadcast' },
    WEDNESDAY_RANDOM: {
      day: 3,
      handler: 'runWednesdayRandomVideoBroadcast',
    },
    FRIDAY_SEASONAL: {
      day: 5,
      handler: 'runFridaySeasonalVideoBroadcast',
    },
  };
  const definition = scheduleDefinitions[scheduleType];

  if (!definition) {
    return null;
  }

  const dateText = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
  const hour = Number(Utilities.formatDate(now, 'Asia/Tokyo', 'H'));
  const month = Number(Utilities.formatDate(now, 'Asia/Tokyo', 'M'));
  const day = new Date(dateText + 'T00:00:00Z').getUTCDay();

  return {
    handler: definition.handler,
    dateText: dateText,
    month: month,
    isScheduledTime: day === definition.day && hour === 10,
  };
}

/**
 * 週次動画配信用トリガーだけを取得します。
 *
 * @return {Array<Object>} 週次動画配信用トリガー
 */
function getWeeklyVideoBroadcastTriggers_() {
  const handlers = getWeeklyVideoBroadcastTriggerHandlers_();

  return ScriptApp.getProjectTriggers().filter(function (trigger) {
    return handlers.includes(trigger.getHandlerFunction());
  });
}

/**
 * 週次動画配信用のハンドラー名を返します。
 *
 * @return {Array<string>} ハンドラー名
 */
function getWeeklyVideoBroadcastTriggerHandlers_() {
  return [
    'runSundayNewVideoBroadcast',
    'runWednesdayRandomVideoBroadcast',
    'runFridaySeasonalVideoBroadcast',
  ];
}

/**
 * 週次動画配信を停止し、専用トリガーだけを削除します。
 *
 * @param {Object} scriptProperties Script Properties
 * @param {boolean} preserveInFlight 未確定の送信状態を保持するか
 */
function stopWeeklyVideoBroadcast_(scriptProperties, preserveInFlight) {
  getWeeklyVideoBroadcastTriggers_().forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  scriptProperties.deleteProperty('WEEKLY_VIDEO_BROADCAST_ACTIVE');
  scriptProperties.deleteProperty('WEEKLY_VIDEO_BROADCAST_TRIGGER_IDS');

  if (!preserveInFlight) {
    scriptProperties.deleteProperty('WEEKLY_VIDEO_BROADCAST_IN_FLIGHT_SLOT');
    scriptProperties.deleteProperty(
      'WEEKLY_VIDEO_BROADCAST_IN_FLIGHT_KEYWORD'
    );
  }
}

/**
 * 所長登録を2分間だけ受け付けます。
 */
function armDirectorRegistration() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('所長登録の受付を開始できませんでした。');
  }

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.deleteProperty('DIRECTOR_REGISTRATION_TOKEN_HASH');
    scriptProperties.deleteProperty('DIRECTOR_REGISTRATION_EXPIRES_AT');

    if (scriptProperties.getProperty('DIRECTOR_LINE_USER_ID')) {
      throw new Error('所長登録はすでに完了しています。');
    }

    scriptProperties.setProperty(
      'DIRECTOR_REGISTRATION_ARMED_UNTIL',
      String(Date.now() + 2 * 60 * 1000)
    );
    console.log('所長登録の受付を開始しました。');
  } finally {
    lock.releaseLock();
  }
}

/**
 * 受付中の所長登録要求を検証し、LINE userIdを登録します。
 *
 * @param {Object} event LINEのWebhookイベント
 * @param {string} channelAccessToken チャネルアクセストークン
 */
function handleDirectorRegistration_(event, channelAccessToken) {
  const failureMessage = '所長登録を完了できませんでした。';
  const successMessage = '所長登録が完了しました。';
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    replyDirectorRegistrationResult_(
      event.replyToken,
      channelAccessToken,
      failureMessage
    );
    return;
  }

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const source = event && event.source;
    const userId = source && source.userId;
    const armedUntil = Number(
      scriptProperties.getProperty('DIRECTOR_REGISTRATION_ARMED_UNTIL')
    );
    scriptProperties.deleteProperty('DIRECTOR_REGISTRATION_ARMED_UNTIL');
    const isValid =
      !scriptProperties.getProperty('DIRECTOR_LINE_USER_ID') &&
      source &&
      source.type === 'user' &&
      /^U[0-9a-fA-F]{32}$/.test(userId || '') &&
      Number.isFinite(armedUntil) &&
      armedUntil > 0 &&
      Date.now() <= armedUntil;

    if (!isValid) {
      replyDirectorRegistrationResult_(
        event.replyToken,
        channelAccessToken,
        failureMessage
      );
      return;
    }

    scriptProperties.setProperty('DIRECTOR_LINE_USER_ID', userId);
    replyDirectorRegistrationResult_(
      event.replyToken,
      channelAccessToken,
      successMessage
    );
  } finally {
    lock.releaseLock();
  }
}

/**
 * 所長登録の一般的な結果だけをReply APIで返します。
 *
 * @param {string} replyToken LINEから届いた返信用トークン
 * @param {string} channelAccessToken チャネルアクセストークン
 * @param {string} text 一般的な結果メッセージ
 */
function replyDirectorRegistrationResult_(replyToken, channelAccessToken, text) {
  if (!replyToken) {
    console.error('所長登録結果の返信に必要な情報がありません。');
    return;
  }

  let response;

  try {
    response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + channelAccessToken,
      },
      payload: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: 'text', text: text }],
      }),
      muteHttpExceptions: true,
    });
  } catch (error) {
    console.error('所長登録結果の返信で通信エラーが発生しました。');
    return;
  }

  const statusCode = response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    console.error('所長登録結果の返信に失敗しました。ステータス: %s', statusCode);
  }
}

/**
 * 所長限定Pushを1回分だけ許可します。
 */
function armDirectorAutumnLeavesTrial() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('所長限定Pushを許可できませんでした。');
  }

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const directorUserId = scriptProperties.getProperty('DIRECTOR_LINE_USER_ID');

    if (
      !/^U[0-9a-fA-F]{32}$/.test(directorUserId || '') ||
      scriptProperties.getProperty('DIRECTOR_TRIAL_AUTUMN_LEAVES_SENT_AT')
    ) {
      throw new Error('所長限定Pushを許可できませんでした。');
    }

    scriptProperties.setProperty('DIRECTOR_TRIAL_PUSH_ARMED', 'true');
    console.log('所長限定Pushを1回分許可しました。');
  } finally {
    lock.releaseLock();
  }
}

/**
 * 所長だけへ紅葉狩り動画の試運転カードを1通送ります。
 */
function sendDirectorAutumnLeavesTrial() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('所長限定試運転を実行できませんでした。');
  }

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const channelAccessToken = scriptProperties.getProperty(
      'LINE_CHANNEL_ACCESS_TOKEN'
    );
    const directorUserId = scriptProperties.getProperty('DIRECTOR_LINE_USER_ID');
    const isArmed =
      scriptProperties.getProperty('DIRECTOR_TRIAL_PUSH_ARMED') === 'true';
    const wasSent = scriptProperties.getProperty(
      'DIRECTOR_TRIAL_AUTUMN_LEAVES_SENT_AT'
    );

    if (
      !channelAccessToken ||
      !/^U[0-9a-fA-F]{32}$/.test(directorUserId || '') ||
      !isArmed ||
      wasSent
    ) {
      throw new Error('所長限定試運転を実行できませんでした。');
    }

    scriptProperties.deleteProperty('DIRECTOR_TRIAL_PUSH_ARMED');
    let response;

    try {
      response = UrlFetchApp.fetch(
        'https://api.line.me/v2/bot/message/push',
        {
          method: 'post',
          contentType: 'application/json',
          headers: {
            Authorization: 'Bearer ' + channelAccessToken,
          },
          payload: JSON.stringify({
            to: directorUserId,
            messages: [
              createVideoTemplateMessage_(
                createAutumnLeavesViewingVideoWork_()
              ),
            ],
          }),
          muteHttpExceptions: true,
        }
      );
    } catch (error) {
      console.error('所長限定試運転の送信で通信エラーが発生しました。');
      throw new Error('所長限定試運転を実行できませんでした。');
    }

    const statusCode = response.getResponseCode();

    if (statusCode < 200 || statusCode >= 300) {
      console.error('所長限定試運転の送信に失敗しました。ステータス: %s', statusCode);
      throw new Error('所長限定試運転を実行できませんでした。');
    }

    scriptProperties.setProperty(
      'DIRECTOR_TRIAL_AUTUMN_LEAVES_SENT_AT',
      new Date().toISOString()
    );
    console.log('所長限定試運転の送信が完了しました。');
  } finally {
    lock.releaseLock();
  }
}

/**
 * 所長限定の短時間自動配信試験を開始します。
 */
function startDirectorRapidPushTrial() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('所長限定の短時間配信試験を開始できませんでした。');
  }

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const channelAccessToken = scriptProperties.getProperty(
      'LINE_CHANNEL_ACCESS_TOKEN'
    );
    const directorUserId = scriptProperties.getProperty('DIRECTOR_LINE_USER_ID');
    const rapidTrialTriggers = getDirectorRapidPushTrialTriggers_();

    if (
      !channelAccessToken ||
      !/^U[0-9a-fA-F]{32}$/.test(directorUserId || '') ||
      scriptProperties.getProperty('DIRECTOR_RAPID_TRIAL_ACTIVE') === 'true' ||
      rapidTrialTriggers.length > 0
    ) {
      throw new Error('所長限定の短時間配信試験を開始できませんでした。');
    }

    scriptProperties.setProperty('DIRECTOR_RAPID_TRIAL_INDEX', '0');
    scriptProperties.setProperty('DIRECTOR_RAPID_TRIAL_ACTIVE', 'true');
    scriptProperties.deleteProperty('DIRECTOR_RAPID_TRIAL_IN_FLIGHT');

    try {
      ScriptApp.newTrigger('runDirectorRapidPushTrial')
        .timeBased()
        .everyMinutes(1)
        .create();
    } catch (error) {
      clearDirectorRapidPushTrialState_(scriptProperties);
      throw new Error('所長限定の短時間配信試験を開始できませんでした。');
    }

    console.log('所長限定の短時間配信試験を開始しました。');
  } finally {
    lock.releaseLock();
  }
}

/**
 * 所長限定の短時間自動配信試験を1件進めます。
 */
function runDirectorRapidPushTrial() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    console.error('所長限定の短時間配信試験を実行できませんでした。');
    return;
  }

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const channelAccessToken = scriptProperties.getProperty(
      'LINE_CHANNEL_ACCESS_TOKEN'
    );
    const directorUserId = scriptProperties.getProperty('DIRECTOR_LINE_USER_ID');
    const currentIndexValue = scriptProperties.getProperty(
      'DIRECTOR_RAPID_TRIAL_INDEX'
    );
    const currentIndex = Number(currentIndexValue);
    const videoWorks = createDirectorRapidPushTrialVideoWorks_();
    const isValid =
      scriptProperties.getProperty('DIRECTOR_RAPID_TRIAL_ACTIVE') === 'true' &&
      !scriptProperties.getProperty('DIRECTOR_RAPID_TRIAL_IN_FLIGHT') &&
      channelAccessToken &&
      /^U[0-9a-fA-F]{32}$/.test(directorUserId || '') &&
      /^\d+$/.test(currentIndexValue || '') &&
      Number.isInteger(currentIndex) &&
      currentIndex >= 0 &&
      currentIndex < videoWorks.length;

    if (!isValid) {
      stopDirectorRapidPushTrial_(scriptProperties);
      console.error('所長限定の短時間配信試験を停止しました。');
      return;
    }

    scriptProperties.setProperty('DIRECTOR_RAPID_TRIAL_IN_FLIGHT', 'true');
    let response;

    try {
      response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
        method: 'post',
        contentType: 'application/json',
        headers: {
          Authorization: 'Bearer ' + channelAccessToken,
        },
        payload: JSON.stringify({
          to: directorUserId,
          messages: [createVideoTemplateMessage_(videoWorks[currentIndex])],
        }),
        muteHttpExceptions: true,
      });
    } catch (error) {
      stopDirectorRapidPushTrial_(scriptProperties);
      console.error('所長限定の短時間配信試験を停止しました。');
      return;
    }

    const statusCode = response.getResponseCode();

    if (statusCode < 200 || statusCode >= 300) {
      stopDirectorRapidPushTrial_(scriptProperties);
      console.error(
        '所長限定の短時間配信試験を停止しました。ステータス: %s',
        statusCode
      );
      return;
    }

    const nextIndex = currentIndex + 1;
    scriptProperties.deleteProperty('DIRECTOR_RAPID_TRIAL_IN_FLIGHT');

    if (nextIndex >= videoWorks.length) {
      stopDirectorRapidPushTrial_(scriptProperties);
      console.log('所長限定の短時間配信試験が完了しました。');
      return;
    }

    scriptProperties.setProperty('DIRECTOR_RAPID_TRIAL_INDEX', String(nextIndex));
  } finally {
    lock.releaseLock();
  }
}

/**
 * 所長限定の短時間自動配信試験を停止します。
 */
function stopDirectorRapidPushTrial() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('所長限定の短時間配信試験を停止できませんでした。');
  }

  try {
    stopDirectorRapidPushTrial_(PropertiesService.getScriptProperties());
    console.log('所長限定の短時間配信試験を停止しました。');
  } finally {
    lock.releaseLock();
  }
}

/**
 * 短時間配信試験で送る3作品を返します。
 *
 * @return {Array<Object>} 配信順の動画作品
 */
function createDirectorRapidPushTrialVideoWorks_() {
  return [
    createAutumnLeavesViewingVideoWork_(),
    createRoastedSweetPotatoVideoWork_(),
    createGrilledSanmaVideoWork_(),
  ];
}

/**
 * 短時間配信試験用のトリガーだけを取得します。
 *
 * @return {Array<Object>} 対象トリガー
 */
function getDirectorRapidPushTrialTriggers_() {
  return ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'runDirectorRapidPushTrial';
  });
}

/**
 * 短時間配信試験の状態と対象トリガーだけを削除します。
 *
 * @param {Object} scriptProperties Script Properties
 */
function stopDirectorRapidPushTrial_(scriptProperties) {
  getDirectorRapidPushTrialTriggers_().forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  clearDirectorRapidPushTrialState_(scriptProperties);
}

/**
 * 短時間配信試験の状態だけを削除します。
 *
 * @param {Object} scriptProperties Script Properties
 */
function clearDirectorRapidPushTrialState_(scriptProperties) {
  scriptProperties.deleteProperty('DIRECTOR_RAPID_TRIAL_ACTIVE');
  scriptProperties.deleteProperty('DIRECTOR_RAPID_TRIAL_INDEX');
  scriptProperties.deleteProperty('DIRECTOR_RAPID_TRIAL_IN_FLIGHT');
}
