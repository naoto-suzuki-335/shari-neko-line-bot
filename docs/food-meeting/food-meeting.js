(() => {
  "use strict";

  if (window.__sharinekoFoodMeetingInitialized) {
    return;
  }
  window.__sharinekoFoodMeetingInitialized = true;

  const API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
  const REQUEST_TIMEOUT_MS = 10000;
  const INITIAL_FAILURE_MESSAGE = "本日の議題はただいま準備中です。";
  const INITIALIZATION_MESSAGE = "食前経営会議を開始できませんでした。";
  const INITIALIZATION_ERROR_ID = "food-meeting-initialization-error";
  const LOADING_MESSAGE = "会議資料を確認しています…";
  const SUCCESS_MESSAGE = "本日の議題です。";

  const themes = Object.freeze([
    Object.freeze({ key: "rice", label: "ごはん" }),
    Object.freeze({ key: "bread", label: "パン" }),
    Object.freeze({ key: "noodles", label: "麺" }),
    Object.freeze({ key: "soup", label: "スープ" }),
    Object.freeze({ key: "vegetable", label: "野菜料理" }),
    Object.freeze({ key: "dessert", label: "甘味" })
  ]);

  const candidates = Object.freeze([
    {
        "pageId":  20569162,
        "commonsTitle":  "File:HK food Lunch Chicken Dish Rice with sauce Aug-2012.JPG",
        "themeKey":  "rice",
        "labelJa":  "茶色い一皿と白いごはん",
        "meetingComment":  "まかない部門から提案が届きました。",
        "artistText":  "HSMerceres",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 3.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:HK_food_Lunch_Chicken_Dish_Rice_with_sauce_Aug-2012.JPG",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/d/dd/HK_food_Lunch_Chicken_Dish_Rice_with_sauce_Aug-2012.JPG/960px-HK_food_Lunch_Chicken_Dish_Rice_with_sauce_Aug-2012.JPG",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/d/dd/HK_food_Lunch_Chicken_Dish_Rice_with_sauce_Aug-2012.JPG",
        "expectedWidth":  2592,
        "expectedHeight":  1944
    },
    {
        "pageId":  118184941,
        "commonsTitle":  "File:Indian Bengali rice dish, with drumsticks curry and onion vada.jpg",
        "themeKey":  "rice",
        "labelJa":  "白いごはんと彩りの一皿",
        "meetingComment":  "本件、落ち着いて審議します。",
        "artistText":  "Billjones94",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Indian_Bengali_rice_dish,_with_drumsticks_curry_and_onion_vada.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/3/39/Indian_Bengali_rice_dish%2C_with_drumsticks_curry_and_onion_vada.jpg/960px-Indian_Bengali_rice_dish%2C_with_drumsticks_curry_and_onion_vada.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/3/39/Indian_Bengali_rice_dish%2C_with_drumsticks_curry_and_onion_vada.jpg",
        "expectedWidth":  3072,
        "expectedHeight":  2360
    },
    {
        "pageId":  133979131,
        "commonsTitle":  "File:White rice and stew (Banga stew) (Nigerian dish).jpg",
        "themeKey":  "rice",
        "labelJa":  "白いごはんと茶色い一皿",
        "meetingComment":  "候補として席についていただきました。",
        "artistText":  "Beendy234",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:White_rice_and_stew_(Banga_stew)_(Nigerian_dish).jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/5/5a/White_rice_and_stew_%28Banga_stew%29_%28Nigerian_dish%29.jpg/960px-White_rice_and_stew_%28Banga_stew%29_%28Nigerian_dish%29.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/5/5a/White_rice_and_stew_%28Banga_stew%29_%28Nigerian_dish%29.jpg",
        "expectedWidth":  2896,
        "expectedHeight":  2128
    },
    {
        "pageId":  201932851,
        "commonsTitle":  "File:Rice, Prawns and Broccoli dish, Brisbane, 2026.jpg",
        "themeKey":  "rice",
        "labelJa":  "白いごはんと緑の一皿",
        "meetingComment":  "決裁前ですが、視線が集まっています。",
        "artistText":  "Chris Olszewski",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Rice,_Prawns_and_Broccoli_dish,_Brisbane,_2026.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/c/cc/Rice%2C_Prawns_and_Broccoli_dish%2C_Brisbane%2C_2026.jpg/960px-Rice%2C_Prawns_and_Broccoli_dish%2C_Brisbane%2C_2026.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/c/cc/Rice%2C_Prawns_and_Broccoli_dish%2C_Brisbane%2C_2026.jpg",
        "expectedWidth":  3839,
        "expectedHeight":  3024
    },
    {
        "pageId":  20031189,
        "commonsTitle":  "File:Vegan no-knead whole wheat bread loaf, sliced, September 2010.jpg",
        "themeKey":  "bread",
        "labelJa":  "切り分けた茶色いパン",
        "meetingComment":  "本日の議題として十分な存在感です。",
        "artistText":  "Veganbaking.net",
        "creditText":  "Flickr : Vegan No Knead Whole Wheat Bread Sliced",
        "licenseShortName":  "CC BY-SA 2.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/2.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/2.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Vegan_no-knead_whole_wheat_bread_loaf,_sliced,_September_2010.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/7/79/Vegan_no-knead_whole_wheat_bread_loaf%2C_sliced%2C_September_2010.jpg/960px-Vegan_no-knead_whole_wheat_bread_loaf%2C_sliced%2C_September_2010.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/7/79/Vegan_no-knead_whole_wheat_bread_loaf%2C_sliced%2C_September_2010.jpg",
        "expectedWidth":  4272,
        "expectedHeight":  2848
    },
    {
        "pageId":  56391611,
        "commonsTitle":  "File:Milk loaf with wheatgerm.jpg",
        "themeKey":  "bread",
        "labelJa":  "焼き色のついたローフ",
        "meetingComment":  "制作所内で静かに注目されています。",
        "artistText":  "Acabashi",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Milk_loaf_with_wheatgerm.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/e/eb/Milk_loaf_with_wheatgerm.jpg/960px-Milk_loaf_with_wheatgerm.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/e/eb/Milk_loaf_with_wheatgerm.jpg",
        "expectedWidth":  2345,
        "expectedHeight":  3127
    },
    {
        "pageId":  45513075,
        "commonsTitle":  "File:Bread (997629937).jpg",
        "themeKey":  "bread",
        "labelJa":  "小さな丸いパン",
        "meetingComment":  "まずは議事録に載せておきます。",
        "artistText":  "Charles Haynes from Hobart, Australia",
        "creditText":  "Bread",
        "licenseShortName":  "CC BY-SA 2.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/2.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/2.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Bread_(997629937).jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/7/70/Bread_%28997629937%29.jpg/960px-Bread_%28997629937%29.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/7/70/Bread_%28997629937%29.jpg",
        "expectedWidth":  2976,
        "expectedHeight":  2034
    },
    {
        "pageId":  85438342,
        "commonsTitle":  "File:Breads of Russia.jpg",
        "themeKey":  "bread",
        "labelJa":  "パンの盛り合わせ",
        "meetingComment":  "複数案のように見えて会議が進みます。",
        "artistText":  "Dmitry Makeev",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Breads_of_Russia.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/a/a7/Breads_of_Russia.jpg/960px-Breads_of_Russia.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/a/a7/Breads_of_Russia.jpg",
        "expectedWidth":  6739,
        "expectedHeight":  4493
    },
    {
        "pageId":  8535168,
        "commonsTitle":  "File:Korean black bean noodle dish-Jaengban Jajangmyeon-01.jpg",
        "themeKey":  "noodles",
        "labelJa":  "黒いソースの麺",
        "meetingComment":  "見た目の時点で会議が少しざわついています。",
        "artistText":  "by 아침꿀물 at Flickr",
        "creditText":  "https://www.flickr.com/photos/morish/4079464860/",
        "licenseShortName":  "CC BY-SA 3.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Korean_black_bean_noodle_dish-Jaengban_Jajangmyeon-01.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/a/a0/Korean_black_bean_noodle_dish-Jaengban_Jajangmyeon-01.jpg/960px-Korean_black_bean_noodle_dish-Jaengban_Jajangmyeon-01.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/a/a0/Korean_black_bean_noodle_dish-Jaengban_Jajangmyeon-01.jpg",
        "expectedWidth":  3008,
        "expectedHeight":  2000
    },
    {
        "pageId":  54636256,
        "commonsTitle":  "File:2016-12-15 Noodle dish at a restaurant in Tianshui, Gansu.jpg",
        "themeKey":  "noodles",
        "labelJa":  "白い器の麺",
        "meetingComment":  "本件、慎重に視線を集めています。",
        "artistText":  "Anagoria",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY 3.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:2016-12-15_Noodle_dish_at_a_restaurant_in_Tianshui,_Gansu.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/1/19/2016-12-15_Noodle_dish_at_a_restaurant_in_Tianshui%2C_Gansu.jpg/960px-2016-12-15_Noodle_dish_at_a_restaurant_in_Tianshui%2C_Gansu.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/1/19/2016-12-15_Noodle_dish_at_a_restaurant_in_Tianshui%2C_Gansu.jpg",
        "expectedWidth":  4032,
        "expectedHeight":  3175
    },
    {
        "pageId":  61665599,
        "commonsTitle":  "File:Noodle Dish (Unsplash).jpg",
        "themeKey":  "noodles",
        "labelJa":  "彩り麺の一皿",
        "meetingComment":  "議題として堂々と参加しています。",
        "artistText":  "Elli O. oelli",
        "creditText":  "https://unsplash.com/photos/kOtEYRJspm8 Image at the Wayback Machine Gallery at the Wayback Machine",
        "licenseShortName":  "CC0",
        "apiLicenseUrl":  "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "displayLicenseUrl":  "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Noodle_Dish_(Unsplash).jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/4/45/Noodle_Dish_%28Unsplash%29.jpg/960px-Noodle_Dish_%28Unsplash%29.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/4/45/Noodle_Dish_%28Unsplash%29.jpg",
        "expectedWidth":  5184,
        "expectedHeight":  3456
    },
    {
        "pageId":  195494717,
        "commonsTitle":  "File:Thukpa (Tibetan-Nepali Noodle Soup).jpg",
        "themeKey":  "noodles",
        "labelJa":  "赤い器の麺",
        "meetingComment":  "再審議の可能性も残しておきます。",
        "artistText":  "SristiAwasthi21",
        "creditText":  "Own work",
        "licenseShortName":  "CC0",
        "apiLicenseUrl":  "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "displayLicenseUrl":  "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Thukpa_(Tibetan-Nepali_Noodle_Soup).jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://upload.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/f/f6/Thukpa_%28Tibetan-Nepali_Noodle_Soup%29.jpg",
        "expectedThumbnailUtmContent":  "thumbnail_unscaled",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/f/f6/Thukpa_%28Tibetan-Nepali_Noodle_Soup%29.jpg",
        "expectedWidth":  960,
        "expectedHeight":  1280
    },
    {
        "pageId":  68528774,
        "commonsTitle":  "File:Yayla soup in a white bowl in Ankara.jpg",
        "themeKey":  "soup",
        "labelJa":  "白いスープ",
        "meetingComment":  "会議室に落ち着いた空気が流れています。",
        "artistText":  "E4024",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Yayla_soup_in_a_white_bowl_in_Ankara.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/3/32/Yayla_soup_in_a_white_bowl_in_Ankara.jpg/960px-Yayla_soup_in_a_white_bowl_in_Ankara.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/3/32/Yayla_soup_in_a_white_bowl_in_Ankara.jpg",
        "expectedWidth":  2560,
        "expectedHeight":  1920
    },
    {
        "pageId":  77323172,
        "commonsTitle":  "File:Spinach Tofu Soup - 菠菜豆腐湯 (Emerald \u0026 White Jade Soup - 翡翠白玉湯).jpg",
        "themeKey":  "soup",
        "labelJa":  "緑と白のスープ",
        "meetingComment":  "本件の扱いを制作所内で協議します。",
        "artistText":  "NeoBatfreak",
        "creditText":  "Own work Recipe can be found on (2008) The Food of China , London : Bay Books, p. 64 ISBN : 9780681025844 .",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Spinach_Tofu_Soup_-_%E8%8F%A0%E8%8F%9C%E8%B1%86%E8%85%90%E6%B9%AF_(Emerald_%26_White_Jade_Soup_-_%E7%BF%A1%E7%BF%A0%E7%99%BD%E7%8E%89%E6%B9%AF).jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/c/cf/Spinach_Tofu_Soup_-_%E8%8F%A0%E8%8F%9C%E8%B1%86%E8%85%90%E6%B9%AF_%28Emerald_%26_White_Jade_Soup_-_%E7%BF%A1%E7%BF%A0%E7%99%BD%E7%8E%89%E6%B9%AF%29.jpg/960px-Spinach_Tofu_Soup_-_%E8%8F%A0%E8%8F%9C%E8%B1%86%E8%85%90%E6%B9%AF_%28Emerald_%26_White_Jade_Soup_-_%E7%BF%A1%E7%BF%A0%E7%99%BD%E7%8E%89%E6%B9%AF%29.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/c/cf/Spinach_Tofu_Soup_-_%E8%8F%A0%E8%8F%9C%E8%B1%86%E8%85%90%E6%B9%AF_%28Emerald_%26_White_Jade_Soup_-_%E7%BF%A1%E7%BF%A0%E7%99%BD%E7%8E%89%E6%B9%AF%29.jpg",
        "expectedWidth":  1997,
        "expectedHeight":  1440
    },
    {
        "pageId":  109906498,
        "commonsTitle":  "File:Bowl of lentil soup with green and red lentils.jpg",
        "themeKey":  "soup",
        "labelJa":  "赤茶色のスープ",
        "meetingComment":  "候補一覧の中央で待機しています。",
        "artistText":  "Whoisjohngalt",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Bowl_of_lentil_soup_with_green_and_red_lentils.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/e/ee/Bowl_of_lentil_soup_with_green_and_red_lentils.jpg/960px-Bowl_of_lentil_soup_with_green_and_red_lentils.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/e/ee/Bowl_of_lentil_soup_with_green_and_red_lentils.jpg",
        "expectedWidth":  4608,
        "expectedHeight":  3456
    },
    {
        "pageId":  182373355,
        "commonsTitle":  "File:A bowl of bean soup soup made using a tiktok recipe.jpg",
        "themeKey":  "soup",
        "labelJa":  "白い器の茶色いスープ",
        "meetingComment":  "まずは見るだけの参加も歓迎します。",
        "artistText":  "Sleepytimecat",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:A_bowl_of_bean_soup_soup_made_using_a_tiktok_recipe.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/e/e5/A_bowl_of_bean_soup_soup_made_using_a_tiktok_recipe.jpg/960px-A_bowl_of_bean_soup_soup_made_using_a_tiktok_recipe.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/e/e5/A_bowl_of_bean_soup_soup_made_using_a_tiktok_recipe.jpg",
        "expectedWidth":  1905,
        "expectedHeight":  1794
    },
    {
        "pageId":  31390413,
        "commonsTitle":  "File:Salad - Kolkata 2014-02-13 2655.JPG",
        "themeKey":  "vegetable",
        "labelJa":  "彩りサラダ盛り",
        "meetingComment":  "彩りを前に議事進行が少し弾みます。",
        "artistText":  "Biswarup Ganguly",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY 3.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Salad_-_Kolkata_2014-02-13_2655.JPG",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/e/ec/Salad_-_Kolkata_2014-02-13_2655.JPG/960px-Salad_-_Kolkata_2014-02-13_2655.JPG",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/e/ec/Salad_-_Kolkata_2014-02-13_2655.JPG",
        "expectedWidth":  4288,
        "expectedHeight":  2848
    },
    {
        "pageId":  89958484,
        "commonsTitle":  "File:Salad (4447935276).jpg",
        "themeKey":  "vegetable",
        "labelJa":  "緑と赤のサラダ",
        "meetingComment":  "本日の候補として静かに検討します。",
        "artistText":  "Katrin Gilger",
        "creditText":  "Salad",
        "licenseShortName":  "CC BY-SA 2.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/2.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/2.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Salad_(4447935276).jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/f/f4/Salad_%284447935276%29.jpg/960px-Salad_%284447935276%29.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/f/f4/Salad_%284447935276%29.jpg",
        "expectedWidth":  2816,
        "expectedHeight":  1880
    },
    {
        "pageId":  202181956,
        "commonsTitle":  "File:Argentine cucumber salad with balsamic vinegar.jpg",
        "themeKey":  "vegetable",
        "labelJa":  "赤い器の緑の一皿",
        "meetingComment":  "決裁席から前向きな視線が届いています。",
        "artistText":  "Horacio Cambeiro",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 3.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Argentine_cucumber_salad_with_balsamic_vinegar.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/d/d3/Argentine_cucumber_salad_with_balsamic_vinegar.jpg/960px-Argentine_cucumber_salad_with_balsamic_vinegar.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/d/d3/Argentine_cucumber_salad_with_balsamic_vinegar.jpg",
        "expectedWidth":  3356,
        "expectedHeight":  3000
    },
    {
        "pageId":  179384170,
        "commonsTitle":  "File:Liat Portal for Foodie Disorder - Israeli Salad.jpg",
        "themeKey":  "vegetable",
        "labelJa":  "彩りの小さな一皿",
        "meetingComment":  "制作所の会議資料に加えておきます。",
        "artistText":  "HaJunkiyada",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY-SA 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Liat_Portal_for_Foodie_Disorder_-_Israeli_Salad.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/0/0c/Liat_Portal_for_Foodie_Disorder_-_Israeli_Salad.jpg/960px-Liat_Portal_for_Foodie_Disorder_-_Israeli_Salad.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/0/0c/Liat_Portal_for_Foodie_Disorder_-_Israeli_Salad.jpg",
        "expectedWidth":  3024,
        "expectedHeight":  4032
    },
    {
        "pageId":  6387804,
        "commonsTitle":  "File:Chokolade-kage.JPG",
        "themeKey":  "dessert",
        "labelJa":  "茶色いケーキ",
        "meetingComment":  "甘味部門は参考出席です。",
        "artistText":  "Gajda-13 at Danish Wikipedia",
        "creditText":  "Transferred from da.wikipedia to Commons by Christian Giersing using CommonsHelper .",
        "licenseShortName":  "CC BY-SA 3.0",
        "apiLicenseUrl":  "http://creativecommons.org/licenses/by-sa/3.0/",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0/",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Chokolade-kage.JPG",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/9/9c/Chokolade-kage.JPG/960px-Chokolade-kage.JPG",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/9/9c/Chokolade-kage.JPG",
        "expectedWidth":  1632,
        "expectedHeight":  1224
    },
    {
        "pageId":  79294651,
        "commonsTitle":  "File:Peng Zu restaurant at the Suncoast, Las Vegas (Summerlin). I had the mango cake for dessert.jpg",
        "themeKey":  "dessert",
        "labelJa":  "白い小さなケーキ",
        "meetingComment":  "小さな議題にも丁寧に向き合います。",
        "artistText":  "mliu92",
        "creditText":  "https://www.flickr.com/photos/mliu92/25255312677/",
        "licenseShortName":  "CC BY-SA 2.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by-sa/2.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by-sa/2.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Peng_Zu_restaurant_at_the_Suncoast,_Las_Vegas_(Summerlin)._I_had_the_mango_cake_for_dessert.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/5/54/Peng_Zu_restaurant_at_the_Suncoast%2C_Las_Vegas_%28Summerlin%29._I_had_the_mango_cake_for_dessert.jpg/960px-Peng_Zu_restaurant_at_the_Suncoast%2C_Las_Vegas_%28Summerlin%29._I_had_the_mango_cake_for_dessert.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/5/54/Peng_Zu_restaurant_at_the_Suncoast%2C_Las_Vegas_%28Summerlin%29._I_had_the_mango_cake_for_dessert.jpg",
        "expectedWidth":  4048,
        "expectedHeight":  3036
    },
    {
        "pageId":  69948524,
        "commonsTitle":  "File:St. Honoré cake with chocolate (DSCF4539).jpg",
        "themeKey":  "dessert",
        "labelJa":  "飾りのある丸いケーキ",
        "meetingComment":  "見た目の時点で拍手はまだ保留です。",
        "artistText":  "Trougnouf",
        "creditText":  "Own work",
        "licenseShortName":  "CC BY 4.0",
        "apiLicenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "displayLicenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:St._Honor%C3%A9_cake_with_chocolate_(DSCF4539).jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/f/f6/St._Honor%C3%A9_cake_with_chocolate_%28DSCF4539%29.jpg/960px-St._Honor%C3%A9_cake_with_chocolate_%28DSCF4539%29.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/f/f6/St._Honor%C3%A9_cake_with_chocolate_%28DSCF4539%29.jpg",
        "expectedWidth":  4643,
        "expectedHeight":  2484
    },
    {
        "pageId":  104101424,
        "commonsTitle":  "File:Piece of chocolate cake on a white plate decorated with chocolate sauce.jpg",
        "themeKey":  "dessert",
        "labelJa":  "模様を添えたケーキの一切れ",
        "meetingComment":  "本件、締めの議題として審議します。",
        "artistText":  "Daria Yakovleva Minor edits made by Subsidiary account",
        "creditText":  "https://pixabay.com/photos/cake-piece-plate-dessert-pastry-1971552/ https://web.archive.org/web/20170308034704if_/https://pixabay.com/en/photos/cake/ https://medicalxpress.com/news/2018-11-obesity-food-restrictions-proven-enjoyment.html ( archived version )",
        "licenseShortName":  "CC0",
        "apiLicenseUrl":  "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "displayLicenseUrl":  "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "descriptionUrl":  "https://commons.wikimedia.org/wiki/File:Piece_of_chocolate_cake_on_a_white_plate_decorated_with_chocolate_sauce.jpg",
        "expectedMime":  "image/jpeg",
        "expectedThumbnailOrigin":  "https://thumb.wikimedia.org",
        "expectedThumbnailPathname":  "/wikipedia/commons/thumb/e/ef/Piece_of_chocolate_cake_on_a_white_plate_decorated_with_chocolate_sauce.jpg/960px-Piece_of_chocolate_cake_on_a_white_plate_decorated_with_chocolate_sauce.jpg",
        "expectedThumbnailUtmContent":  "thumbnail",
        "expectedOriginalOrigin":  "https://upload.wikimedia.org",
        "expectedOriginalPathname":  "/wikipedia/commons/e/ef/Piece_of_chocolate_cake_on_a_white_plate_decorated_with_chocolate_sauce.jpg",
        "expectedWidth":  5536,
        "expectedHeight":  3766
    }
].map((candidate) => Object.freeze(candidate)));

  const dom = {
    panel: document.getElementById("food-meeting-panel"),
    theme: document.getElementById("food-meeting-theme"),
    status: document.getElementById("food-meeting-status"),
    display: document.getElementById("food-meeting-display"),
    imageSlot: document.getElementById("food-meeting-image-slot"),
    label: document.getElementById("food-meeting-label"),
    comment: document.getElementById("food-meeting-comment"),
    artist: document.getElementById("food-meeting-artist"),
    credit: document.getElementById("food-meeting-credit"),
    license: document.getElementById("food-meeting-license"),
    fileLink: document.getElementById("food-meeting-file-link"),
    decisionResult: document.getElementById("food-meeting-decision-result"),
    approveSmall: document.getElementById("food-meeting-approve-small"),
    adopt: document.getElementById("food-meeting-adopt"),
    viewOnly: document.getElementById("food-meeting-view-only"),
    reconsider: document.getElementById("food-meeting-reconsider"),
    retry: document.getElementById("food-meeting-retry"),
    attribution: document.getElementById("food-meeting-attribution")
  };

  const requiredDom = Object.values(dom);
  const decisionButtons = [dom.approveSmall, dom.adopt, dom.viewOnly];
  const lastCandidateByTheme = new Map();
  let generation = 0;
  let activeController = null;
  let activeImageLoader = null;
  let activeApiTimeout = null;
  let activeImageTimeout = null;
  let isLoading = false;
  let displayedCandidate = null;
  let displayedTheme = null;
  let pendingCandidate = null;
  let pendingTheme = null;
  let decisionMade = false;

  function getInitializationMessageTarget() {
    if (dom.status) {
      return dom.status;
    }
    const existing = document.getElementById(INITIALIZATION_ERROR_ID);
    if (existing) {
      return existing;
    }
    const parent = dom.panel || document.querySelector("main") || document.body;
    if (!parent) {
      return null;
    }
    const message = document.createElement("p");
    message.id = INITIALIZATION_ERROR_ID;
    message.setAttribute("role", "alert");
    message.textContent = INITIALIZATION_MESSAGE;
    parent.appendChild(message);
    return message;
  }

  function disableElement(element, hide) {
    if (!element) {
      return;
    }
    element.disabled = true;
    if (hide) {
      element.hidden = true;
    }
  }

  function disableDynamicLink(link) {
    if (!link) {
      return;
    }
    link.hidden = true;
    link.removeAttribute("href");
  }

  function failInitialization() {
    const target = getInitializationMessageTarget();
    if (target) {
      target.textContent = INITIALIZATION_MESSAGE;
      target.hidden = false;
    }
    if (dom.display) {
      dom.display.hidden = true;
    }
    if (dom.imageSlot) {
      dom.imageSlot.replaceChildren();
    }
    disableElement(dom.theme, false);
    disableElement(dom.approveSmall, true);
    disableElement(dom.adopt, true);
    disableElement(dom.viewOnly, true);
    disableElement(dom.reconsider, true);
    disableElement(dom.retry, true);
    disableDynamicLink(dom.license);
    disableDynamicLink(dom.fileLink);
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.length > 0;
  }

  function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
  }

  function parseUrl(value) {
    if (!isNonEmptyString(value)) {
      return null;
    }
    try {
      return new URL(value);
    } catch (_error) {
      return null;
    }
  }

  function hasSafeAuthority(url) {
    return url.protocol === "https:" && url.username === "" && url.password === "" && url.port === "" && url.hash === "";
  }

  function validateExactQuery(url, expectedContent) {
    const entries = Array.from(url.searchParams.entries());
    if (entries.length !== 3 || new Set(entries.map(([key]) => key)).size !== 3) {
      return false;
    }
    const allowedKeys = new Set(["utm_source", "utm_campaign", "utm_content"]);
    if (entries.some(([key]) => !allowedKeys.has(key))) {
      return false;
    }
    return url.searchParams.get("utm_source") === "commons.wikimedia.org"
      && url.searchParams.get("utm_campaign") === "imageinfo"
      && url.searchParams.get("utm_content") === expectedContent;
  }

  function isValidThumbnailUrl(value, candidate) {
    const url = parseUrl(value);
    if (!url || !hasSafeAuthority(url)) {
      return false;
    }
    if (!new Set(["https://thumb.wikimedia.org", "https://upload.wikimedia.org"]).has(url.origin)) {
      return false;
    }
    return url.origin === candidate.expectedThumbnailOrigin
      && url.pathname === candidate.expectedThumbnailPathname
      && validateExactQuery(url, candidate.expectedThumbnailUtmContent);
  }

  function isValidOriginalUrl(value, candidate) {
    const url = parseUrl(value);
    return Boolean(url)
      && hasSafeAuthority(url)
      && url.origin === "https://upload.wikimedia.org"
      && url.origin === candidate.expectedOriginalOrigin
      && url.pathname === candidate.expectedOriginalPathname
      && validateExactQuery(url, "original");
  }

  function isValidDescriptionUrl(value, expectedValue) {
    const url = parseUrl(value);
    return Boolean(url)
      && hasSafeAuthority(url)
      && url.origin === "https://commons.wikimedia.org"
      && url.search === ""
      && url.pathname.startsWith("/wiki/File:")
      && url.href === expectedValue;
  }

  function isValidLicensePair(apiValue, displayValue) {
    const apiUrl = parseUrl(apiValue);
    const displayUrl = parseUrl(displayValue);
    if (!apiUrl || !displayUrl) {
      return false;
    }
    const apiProtocolAllowed = apiUrl.protocol === "http:" || apiUrl.protocol === "https:";
    return apiProtocolAllowed
      && apiUrl.hostname === "creativecommons.org"
      && apiUrl.username === ""
      && apiUrl.password === ""
      && apiUrl.port === ""
      && apiUrl.search === ""
      && apiUrl.hash === ""
      && hasSafeAuthority(displayUrl)
      && displayUrl.origin === "https://creativecommons.org"
      && displayUrl.search === ""
      && displayUrl.pathname === apiUrl.pathname;
  }

  function validateCandidate(candidate) {
    const requiredStrings = [
      candidate.commonsTitle, candidate.themeKey, candidate.labelJa, candidate.meetingComment,
      candidate.artistText, candidate.creditText, candidate.licenseShortName,
      candidate.apiLicenseUrl, candidate.displayLicenseUrl, candidate.descriptionUrl,
      candidate.expectedMime, candidate.expectedThumbnailOrigin, candidate.expectedThumbnailPathname,
      candidate.expectedThumbnailUtmContent, candidate.expectedOriginalOrigin, candidate.expectedOriginalPathname
    ];
    if (!isPositiveInteger(candidate.pageId) || requiredStrings.some((value) => !isNonEmptyString(value))) {
      return false;
    }
    if (!new Set(["image/jpeg", "image/png"]).has(candidate.expectedMime)) {
      return false;
    }
    if (!isPositiveInteger(candidate.expectedWidth) || !isPositiveInteger(candidate.expectedHeight)) {
      return false;
    }
    const thumbnailProbe = `${candidate.expectedThumbnailOrigin}${candidate.expectedThumbnailPathname}?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=${candidate.expectedThumbnailUtmContent}`;
    const originalProbe = `${candidate.expectedOriginalOrigin}${candidate.expectedOriginalPathname}?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original`;
    return isValidThumbnailUrl(thumbnailProbe, candidate)
      && isValidOriginalUrl(originalProbe, candidate)
      && isValidDescriptionUrl(candidate.descriptionUrl, candidate.descriptionUrl)
      && isValidLicensePair(candidate.apiLicenseUrl, candidate.displayLicenseUrl);
  }

  function validateConfiguration() {
    const themeKeys = new Set(themes.map(({ key }) => key));
    const pageIds = new Set();
    const titles = new Set();
    const descriptions = new Set();
    const thumbnailPaths = new Set();
    if (candidates.length !== 24) {
      return false;
    }
    for (const theme of themes) {
      if (candidates.filter(({ themeKey }) => themeKey === theme.key).length !== 4) {
        return false;
      }
    }
    for (const candidate of candidates) {
      if (!themeKeys.has(candidate.themeKey) || !validateCandidate(candidate)) {
        return false;
      }
      if (pageIds.has(candidate.pageId) || titles.has(candidate.commonsTitle)
          || descriptions.has(candidate.descriptionUrl) || thumbnailPaths.has(candidate.expectedThumbnailPathname)) {
        return false;
      }
      pageIds.add(candidate.pageId);
      titles.add(candidate.commonsTitle);
      descriptions.add(candidate.descriptionUrl);
      thumbnailPaths.add(candidate.expectedThumbnailPathname);
    }
    return true;
  }

  function buildApiUrl(candidate) {
    const url = new URL(API_ENDPOINT);
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("titles", candidate.commonsTitle);
    url.searchParams.set("iiprop", "url|size|mime|extmetadata");
    url.searchParams.set("iiurlwidth", "960");
    url.searchParams.set("iiextmetadatafilter", "Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Copyrighted");
    url.searchParams.set("origin", "*");
    return url.href;
  }

  function metadataValue(metadata, key) {
    const item = metadata && metadata[key];
    return item && isNonEmptyString(item.value) ? item.value : null;
  }

  function validateApiPayload(payload, candidate) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.error) {
      return null;
    }
    const pages = payload.query && payload.query.pages;
    if (!Array.isArray(pages) || pages.length !== 1) {
      return null;
    }
    const page = pages[0];
    if (!page || page.missing !== undefined || page.invalid !== undefined
        || page.pageid !== candidate.pageId || page.title !== candidate.commonsTitle
        || !Array.isArray(page.imageinfo) || page.imageinfo.length !== 1) {
      return null;
    }
    const info = page.imageinfo[0];
    if (!info || info.mime !== candidate.expectedMime || !new Set(["image/jpeg", "image/png"]).has(info.mime)
        || !isPositiveInteger(info.width) || !isPositiveInteger(info.height)
        || info.width !== candidate.expectedWidth || info.height !== candidate.expectedHeight
        || info.descriptionurl !== candidate.descriptionUrl
        || !isValidDescriptionUrl(info.descriptionurl, candidate.descriptionUrl)
        || !isValidThumbnailUrl(info.thumburl, candidate)
        || !isValidOriginalUrl(info.url, candidate)) {
      return null;
    }
    const metadata = info.extmetadata;
    if (metadataValue(metadata, "LicenseShortName") !== candidate.licenseShortName
        || metadataValue(metadata, "LicenseUrl") !== candidate.apiLicenseUrl
        || !metadataValue(metadata, "Artist") || !metadataValue(metadata, "Credit")
        || !metadataValue(metadata, "UsageTerms") || !metadataValue(metadata, "Copyrighted")) {
      return null;
    }
    return info;
  }

  function selectCandidate(themeKey, excludedPageId) {
    const pool = candidates.filter((candidate) => candidate.themeKey === themeKey && candidate.pageId !== excludedPageId);
    if (pool.length === 0) {
      return null;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function isCurrent(currentGeneration, candidate) {
    return currentGeneration === generation && candidate === pendingCandidate;
  }

  function clearApiTimeout() {
    if (activeApiTimeout !== null) {
      clearTimeout(activeApiTimeout);
      activeApiTimeout = null;
    }
  }

  function clearImageTimeout() {
    if (activeImageTimeout !== null) {
      clearTimeout(activeImageTimeout);
      activeImageTimeout = null;
    }
  }

  function cancelActiveRequest() {
    generation += 1;
    clearApiTimeout();
    clearImageTimeout();
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    activeImageLoader = null;
    isLoading = false;
  }

  function setDecisionAvailability(enabled) {
    for (const button of decisionButtons) {
      button.disabled = !enabled;
    }
  }

  function enterLoadingState() {
    isLoading = true;
    dom.status.textContent = LOADING_MESSAGE;
    setDecisionAvailability(false);
    dom.reconsider.disabled = true;
    dom.retry.hidden = true;
    dom.retry.disabled = true;
  }

  function finishFailure(currentGeneration, candidate) {
    if (!isCurrent(currentGeneration, candidate)) {
      return;
    }
    clearApiTimeout();
    clearImageTimeout();
    activeController = null;
    activeImageLoader = null;
    isLoading = false;
    dom.status.textContent = INITIAL_FAILURE_MESSAGE;
    dom.retry.hidden = false;
    dom.retry.disabled = false;
    if (displayedCandidate) {
      dom.theme.value = displayedTheme;
      setDecisionAvailability(!decisionMade);
      dom.reconsider.disabled = false;
    } else {
      dom.display.hidden = true;
      setDecisionAvailability(false);
      dom.reconsider.disabled = true;
    }
    try {
      dom.retry.focus({ preventScroll: true });
    } catch (_error) {
      dom.retry.focus();
    }
  }

  function renderCandidate(currentGeneration, candidate, themeKey, loader) {
    if (!isCurrent(currentGeneration, candidate) || loader !== activeImageLoader) {
      return;
    }
    clearImageTimeout();
    loader.alt = `${candidate.labelJa}。Wikimedia Commonsから提供された料理画像`;
    dom.imageSlot.replaceChildren(loader);
    dom.label.textContent = candidate.labelJa;
    dom.comment.textContent = candidate.meetingComment;
    dom.artist.textContent = candidate.artistText;
    dom.credit.textContent = candidate.creditText;
    dom.license.textContent = candidate.licenseShortName;
    dom.license.href = candidate.displayLicenseUrl;
    dom.license.target = "_blank";
    dom.license.rel = "noopener noreferrer";
    dom.license.hidden = false;
    dom.fileLink.href = candidate.descriptionUrl;
    dom.fileLink.target = "_blank";
    dom.fileLink.rel = "noopener noreferrer";
    dom.fileLink.hidden = false;
    dom.decisionResult.textContent = "";
    dom.display.hidden = false;
    dom.status.textContent = SUCCESS_MESSAGE;
    dom.theme.value = themeKey;
    displayedCandidate = candidate;
    displayedTheme = themeKey;
    lastCandidateByTheme.set(themeKey, candidate.pageId);
    decisionMade = false;
    pendingCandidate = null;
    pendingTheme = null;
    activeImageLoader = null;
    activeController = null;
    isLoading = false;
    setDecisionAvailability(true);
    dom.reconsider.disabled = false;
    dom.retry.hidden = true;
    dom.retry.disabled = true;
  }

  async function requestCandidate(candidate, themeKey) {
    if (!candidate) {
      return;
    }
    if (isLoading) {
      cancelActiveRequest();
    }
    const currentGeneration = ++generation;
    pendingCandidate = candidate;
    pendingTheme = themeKey;
    enterLoadingState();
    const controller = new AbortController();
    activeController = controller;
    activeApiTimeout = setTimeout(() => {
      if (!isCurrent(currentGeneration, candidate) || controller !== activeController) {
        return;
      }
      controller.abort();
      finishFailure(currentGeneration, candidate);
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(buildApiUrl(candidate), { signal: controller.signal });
      if (!isCurrent(currentGeneration, candidate) || controller !== activeController) {
        return;
      }
      clearApiTimeout();
      if (!response.ok) {
        throw new Error("HTTP error");
      }
      const payload = await response.json();
      if (!isCurrent(currentGeneration, candidate) || controller !== activeController) {
        return;
      }
      const info = validateApiPayload(payload, candidate);
      if (!info) {
        throw new Error("Invalid API data");
      }
      activeController = null;
      dom.status.textContent = "画像資料を確認しています…";
      const loader = new Image();
      activeImageLoader = loader;
      loader.onload = () => renderCandidate(currentGeneration, candidate, themeKey, loader);
      loader.onerror = () => {
        if (loader !== activeImageLoader) {
          return;
        }
        finishFailure(currentGeneration, candidate);
      };
      activeImageTimeout = setTimeout(() => {
        if (!isCurrent(currentGeneration, candidate) || loader !== activeImageLoader) {
          return;
        }
        activeImageLoader = null;
        finishFailure(currentGeneration, candidate);
      }, REQUEST_TIMEOUT_MS);
      loader.src = info.thumburl;
    } catch (error) {
      if (!isCurrent(currentGeneration, candidate)) {
        return;
      }
      if (error && error.name === "AbortError") {
        return;
      }
      finishFailure(currentGeneration, candidate);
    }
  }

  function startForTheme(themeKey, excludedPageId) {
    const candidate = selectCandidate(themeKey, excludedPageId);
    if (!candidate) {
      const currentGeneration = generation;
      pendingCandidate = null;
      finishFailure(currentGeneration, null);
      return;
    }
    requestCandidate(candidate, themeKey);
  }

  function handleThemeChange() {
    const themeKey = dom.theme.value;
    if (!themes.some(({ key }) => key === themeKey)) {
      dom.theme.value = displayedTheme || "rice";
      return;
    }
    if ((isLoading && themeKey === pendingTheme) || (!isLoading && displayedCandidate && themeKey === displayedTheme)) {
      return;
    }
    if (isLoading) {
      cancelActiveRequest();
    }
    startForTheme(themeKey, lastCandidateByTheme.get(themeKey));
  }

  function handleReconsider() {
    if (isLoading || !displayedCandidate) {
      return;
    }
    dom.reconsider.disabled = true;
    startForTheme(displayedTheme, displayedCandidate.pageId);
  }

  function handleRetry() {
    if (isLoading || !pendingCandidate || !pendingTheme) {
      return;
    }
    dom.retry.disabled = true;
    requestCandidate(pendingCandidate, pendingTheme);
  }

  function makeDecision(message) {
    if (isLoading || !displayedCandidate || decisionMade) {
      return;
    }
    decisionMade = true;
    dom.decisionResult.textContent = message;
    setDecisionAvailability(false);
  }

  if (requiredDom.some((element) => !element)) {
    failInitialization();
    return;
  }

  disableDynamicLink(dom.license);
  disableDynamicLink(dom.fileLink);
  if (!validateConfiguration()) {
    failInitialization();
    return;
  }

  dom.theme.addEventListener("change", handleThemeChange);
  dom.reconsider.addEventListener("click", handleReconsider);
  dom.retry.addEventListener("click", handleRetry);
  dom.approveSmall.addEventListener("click", () => makeDecision("小盛り希望で承認されました。"));
  dom.adopt.addEventListener("click", () => makeDecision("本日の候補として採用します。"));
  dom.viewOnly.addEventListener("click", () => makeDecision("本件は鑑賞のみで終了します。"));

  startForTheme("rice", undefined);
})();
