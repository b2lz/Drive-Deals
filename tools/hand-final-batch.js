"use strict";
// The final hand-supplied batch: directors, cast and PC requirements.
//
// A handful of cast entries are descriptive rather than real names ("نخبة من
// الممثلين") — those are written as given and flagged so the page does not
// pass them off as a credit list.
//
// Usage: node tools/hand-final-batch.js [--dry] [--list]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const LIST = process.argv.includes("--list");

// ---------------------------------------------------------------- media -----
// [category, folder, field, value]   field: director | cast
// cast values are arrays; a trailing note in extra.reviewNote marks a
// descriptive (non-name) entry.
const MEDIA = [
  // أفلام عربية — أبطال
  ["arabic-films", "صوفيه", "cast", "نخبة من الممثلين الشباب والسينما المستقلة", "قائمة أسماء عامة وليست أسماء بعينها"],
  ["arabic-films", "للحب حكايه", "cast", "نخبة من نجوم الدراما الرومانسية العربية والشباب", "قائمة أسماء عامة وليست أسماء بعينها"],

  // أفلام أجنبية — أبطال
  ["foreign-films", "Big Awning (2020)", "cast", "نخبة من ممثلي السينما الآسيوية المستقلة", "قائمة أسماء عامة وليست أسماء بعينها"],
  ["foreign-films", "Wandering Interstellar (2019)", "cast", "نجوم السينما الصينية والخيال العلمي", "قائمة أسماء عامة وليست أسماء بعينها"],

  // مسلسلات أجنبية — أبطال
  ["foreign-series", "Acer", "cast", "مرجع تقني لعروض وتشكيلات أجهزة آيسر العالمية", "ليس عملاً درامياً — لا يوجد أبطال"],
  ["foreign-series", "The Walking Dead The Ones Who Live", "cast", "أندرو لينكولن، داناي غوريرا"],

  // مسلسلات كورية — مخرج
  ["korean-series", "Moon Lovers - Scarlet Heart Ryeo", "director", "كيم جيو تاي"],
  ["korean-series", "My Girlfriend Is a Gumiho", "director", "بو سيونغ تشول"],
  ["korean-series", "Sisyphus The Myth", "director", "جين هيوك"],

  // أفلام كرتون — مخرج
  ["cartoon-films", "Kubo", "director", "تراويس نايت"],

  // مسلسلات كرتون — أبطال
  ["cartoon-series", "Primal", "cast", "آرون لابوري، وفانغ"],
  ["cartoon-series", "سلاحف النينجا", "cast", "ليوناردو، رافIEL، دوناتيلو، ميكيلانجيلو"],
  ["cartoon-series", "شباب العدالة", "cast", "روبن، سوبربوي، أكوالاد، ميس مارتيان"],
  ["cartoon-series", "صديقي المفضل هو قرد", "cast", "آدم ليون، جيك سبايدل"],
  ["cartoon-series", "عائلة ساترديز", "cast", "زاك ساترديز، دوك، درو"],
  ["cartoon-series", "عالم الطباشير_2", "cast", "رودي تيبوتز، بيني، سناب"],
  ["cartoon-series", "فارس وفادي", "cast", "فينياس فلين، فادي، كانديس، والدحيح بيري"],

  // مسلسلات تركية — أبطال
  ["turkish-series", "زمن الخيانة", "cast", "نخبة من نجوم الدراما التركية الاجتماعية", "قائمة أسماء عامة وليست أسماء بعينها"],

  // ---------------------------------------------------------------- anime ---
  ["anime", "Aoi Bungaku", "cast", "يوجي أوبا، ساكاغوتشي، وغيرها من الشخصيات الكلاسيكية الأدبية"],
  ["anime", "Araburu Kisetsu no Otome-domo yo", "cast", "كازوسا أونودرا، نينا سوغاوارا، كاوازوكو، هيتومي"],
  ["anime", "Avatar The Legend Of Korra", "cast", "كورا، ماكو، بولو، أسامي ساتو"],
  ["anime", "Avatar.The.Last.Airbender", "cast", "أنج، كاتارا، ساكا، توف، زوكو"],
  ["anime", "B The Beginning", "cast", "كيث فليك، يونا، بلاك فان"],
  ["anime", "Benriya Saitou-san Isekai ni Iku", "cast", "سايتو، رالزا، لافانيسا، ميرل"],
  ["anime", "Black Cat", "cast", "تورين هارت، إيف، سفيد لونز، كينز"],
  ["anime", "BlackClover", "cast", "أستا، يونو، يامي سوكيهيرو، نويل سيلفا"],
  ["anime", "BlazBlue Alter Memory", "cast", "راغنل بلاديدج، نويل فيرميليون، جين كيساراغي"],
  ["anime", "Bleach Sennen Kessen-hen", "cast", "إيتشيغو كوروساكي، أوريوه إيشيدا، ريوكي، يوهان"],
  ["anime", "Blood Of Zeus", "cast", "هيرون، زيوس، سيرافيم، إلكترا"],
  ["anime", "Blood-C", "cast", "سايا كيساراغي، فوميتو ناناهارا"],
  ["anime", "Bokutachi no Remake", "cast", "كيويا هاشiba، أكي شي نو، تاماكي كوماشيرو"],
  ["anime", "Bokutachi wa Benkyou ga Dekinai", "cast", "ناريو يويغا، فومينو فوروهاشي، ريزو أوغاتا"],
  ["anime", "Boogiepop and Others (2019)", "cast", "توكا مياشيتا، كيرياما، سويمورا"],
  ["anime", "Boushoku no Berserk", "cast", "فايت غرافيت، روكسي، غرييد"],

  ["anime", "C - The Money of Soul and Possibility Control", "cast", "كيميمارو يوغا، ميدا، هانابي"],
  ["anime", "Cagaster Of An Insect Cage", "cast", "كيدو، إلي، لازار"],
  ["anime", "Cannon Busters", "cast", "فيل، سام، كيسي، هيزي"],
  ["anime", "Carnival Phantasm", "cast", "شيكي، سيرابر، آرثرويد، وفريق شخصيات تايب مون"],
  ["anime", "Castlevania", "cast", "تريڤور بلمونت، ساڤا، ألوكارد"],
  ["anime", "Castlevania nocturne", "cast", "ريختر بلمونت، أنيت"],
  ["anime", "Chain Chronicle Haecceitas no Hikari", "cast", "آرمام، فوكينا، بيريكا"],
  ["anime", "Chiyu Mahou no Machigatta Tsukaikata", "cast", "أوساتو كازوكي، روز، أولغا"],
  ["anime", "Claymore", "cast", "كلير، تيريزا، ميريام، هيلين"],
  ["anime", "Code Breaker", "cast", "ري أوجامي، ساكورا كوراكوجي"],
  ["anime", "Code Geass Dakkan no Roze", "cast", "روز، أشـفورد، كورنو"],
  ["anime", "Corpse Party Tortured Souls Bougyakusareta Tamashii No Jukyou", "cast", "ساتوشي موتشيدا، ناومي، يوكا، شيوان"],
  ["anime", "Cyborg009 The Cyborg Soldier", "cast", "جو شيمامورا، البروفيسور غيل"],

  ["anime", "Dance In The Vampire Bund", "cast", "مينا تيبس، أكيرا كابوراجي ريغندورف"],
  ["anime", "Danshi Koukousei no Nichijou", "cast", "تاداتوكي، هيدينوري، يوشيتاكي"],
  ["anime", "Dantalian no Shoka", "cast", "داليان، هيو أنتوني ديسبيرد"],
  ["anime", "DAYS", "cast", "تسوكوشي تسوكاموتو، جين كازاما"],
  ["anime", "Dead Mount Death Play", "cast", "بولكاريته، شينوكا، ميساكي"],
  ["anime", "Deadman Wonderland", "cast", "غانتا إيغاراشي، شيرو"],
  ["anime", "Denpa Onna to Seishun Otoko", "cast", "ماكوتو نيوا، إيوغي تووا"],
  ["anime", "Devil May Cry 2025", "cast", "دانتي، ليدي، ترش"],
  ["anime", "Devils line", "cast", "تسوكاسا تايرا، يوو أنزاي"],
  ["anime", "Diabolik Lovers", "cast", "يوي كوموري، إخوة ساكاماكي"],

  ["anime", "Eiyuuou, Bu wo Kiwameru Tame Tenseisu Soshite, Sekai Saikyou no Minarai Kishi", "cast", "إنغريس، رايني"],
  ["anime", "Emiya-san Chi no Kyou no Gohan", "cast", "شيرو إيميا، سيبر، رين توهوساكا"],
  ["anime", "Engage Kiss", "cast", "شو أوغاتا، كيساكي، أيانو"],
  ["anime", "Evil or Live", "cast", "شين، هيبي، شون"],

  ["anime", "Fate - Zero", "cast", "كيريسومو إيميا، كيرييه، غيلجامش"],
  ["anime", "Fate Apocrypha", "cast", "سيغ، جان دارك، موردير"],
  ["anime", "Fate Stay Night", "cast", "شيرو إيميا، سيبر، رين، آرتشير"],
  ["anime", "Fate Stay Night TV Reproduction", "cast", "شيرو إيميا، سيبر، رين"],
  ["anime", "Fate kaleid Liner PrismaIllya", "cast", "إيليا فونس إينزبرن، مي إيدلفت"],
  ["anime", "Fate kaleid Liner PrismaIllya 2 herz", "cast", "إيليا فونس إينزبرن، نوري أونوجي"],
  ["anime", "Fate kaleid Liner PrismaIllya 2 wei", "cast", "إيليا فونس إينزبرن، كاتو بال"],
  ["anime", "Fate Kaleid Liner Prisma☆Illya Oath Under Snow", "cast", "إيليا فونس إينزبرن، غراي"],
  ["anime", "Fate Extra Last Encore", "cast", "هارسامي، ماجي"],
  ["anime", "Fate Grand Order First Order", "cast", "ماري", null],

  ["anime", "Fugou Keiji Balance Unlimited", "cast", "دايسوكي كامبي، هارو كاتو"],
  ["anime", "Fumetsu no Anata e", "cast", "فوشي، مارش، بيران"],
  ["anime", "Fuuka", "cast", "يوو هارونا، فوكا أكيتسوكي"],
  ["anime", "Gaikotsu Kishi-sama, Tadaima Isekai e Odekakechuu", "cast", "آرك، بونتتا، أريان"],
  ["anime", "Gakkou Gurashi", "cast", "يوكي تاكيبي، روروكو، مي، كورو"],
  ["anime", "Gate Jieitai Kanochi Nite Kaku Tatakaeri", "cast", "يوچي إيتامي، تيوي، ليكي"],
  ["anime", "Gin no Guardian", "cast", "لو شوي مي، تانغ لين"],
  ["anime", "Gin No Saji", "cast", "يوغو هاشيكن، أومي"],
  ["anime", "Ginga Sengoku Yuuden Rai", "cast", "راي، ريو، لودي"],
  ["anime", "Gokushufudou", "cast", "تاتسو الخالد، ميكو، ماكاسا"],
  ["anime", "Gosick", "cast", "فيكتوريكا دو بلوه، كازويا كوجو"],
  ["anime", "Great Teacher Onizuka", "cast", "إيكيتشي أونيزوكا، أزوسا فويوتسوكي"],

  ["anime", "Hai To Gensou No Grimgar", "cast", "هاروهيرو، يومي، روتا، موروكا"],
  ["anime", "Hajime no Ippo", "cast", "إيبومي ماكونوشي، تاكامورا مامورو، مياتا"],
  ["anime", "Hakkenden Touhou Hakken Ibun", "cast", "شينو إينوزوكا، سوسوكي إينوكاوا"],
  ["anime", "Hamatora The Animation", "cast", "نيكو، تورا، ريشيو"],
  ["anime", "Hametsu no Oukoku", "cast", "أدونيس، دوروكا"],
  ["anime", "Hanamonogatari [HD]", "cast", "سوروكا كانبارو، أراغي"],
  ["anime", "Hataraku Saibou", "cast", "خلية الدم الحمراء، خلية الدم البيضاء"],
  ["anime", "Heike Monogatari", "cast", "بيوا، تايرا نو شيغيموري"],
  ["anime", "Heya Camp", "cast", "ناديشيكو كاغاميهارا، أوي"],
  ["anime", "Himouto! Umaru-Chan", "cast", "أومارو دوما، تايمي دوما"],
  ["anime", "Hinomaru Sumo", "cast", "أوشيو هينومارو، تشيهيرو"],
  ["anime", "Hitsugi no Chaika", "cast", "تشايكا تراوانت، تورو أكاري"],
  ["anime", "Honzuki no Gekokujou Shisho ni Naru Tame ni wa Shudan wo Erandeiraremasen", "cast", "ماين، أوتو، فرديناند"],
  ["anime", "Hypnosis Mic Division Rap Battle - Rhyme Anima", "cast", "إيتشيرو يامادا، ساماتوكو، جينو"],

  ["anime", "Ichiban Ushiro no Daimaou", "cast", "سايا توتو، كونا سوغا، بورو"],
  ["anime", "Isekai Maou To Shoukan Shoujo no Dorei Majutsu", "cast", "ديابلو، شيرا، ريم"],
  ["anime", "Isekai no Seikishi Monogatari", "cast", "كينشي ماساكي، لاشرا"],
  ["anime", "Isekai Wa Smartphone To Tomo Ni", "cast", "توكيا موتشيزوكي، إلزي، لين"],
  ["anime", "Island", "cast", "ترين ساندين، رين، سارا"],
  ["anime", "Itai No Wa Iya Nano De Bougyoryoku Ni Kyokufuri Shitai To Omoimasu", "cast", "مايبل، سالي"],
  ["anime", "Itsudatte Bokura no Koi wa 10 cm Datta", "cast", "ناتسوكي إينوموتو، ميو أيزاوا"],
  ["anime", "Jaku-Chara Tomozaki-kun", "cast", "توميا توموزاكي، آوي هينا"],
  ["anime", "Jibaku Shounen Hanako-kun", "cast", "نيني ياشيرو، هاناكو-كن، مياموتو"],
  ["anime", "K", "cast", "إيزانا شيرو، ياكاتا كوروه، سُوه ميكوتو"],
  ["anime", "Kage no Jitsuryokusha ni Naritakute The (Eminence in Shadow)", "cast", "كاجيونو، ألفا، بيتا"],
  ["anime", "Kaichou Wa Maid-Sama!", "cast", "ميساكي أيوزاوا، تاكومي أوسوي"],
  ["anime", "Kaijuu 8-gou", "cast", "كافكا هيبينو، مينا أتشيرو، رينو"],
  ["anime", "Kami Nomi zo Shiru Sekai", "cast", "كيتسوما كاتسوراغي، إلزي"],
  ["anime", "Kaminaki Sekai no Kamisama Katsudou", "cast", "يوكيتو أورابي، ميتاما"],
  ["anime", "Kanojo, Okarishimasu", "cast", "كازويا كينوشيدا، تشيزورو ميزوهارا، مامي"],
  ["anime", "Katainaka no Ossan Kensei ni Naru", "cast", "بيليل، سيلين"],
  ["anime", "Katsute Kami Datta Kemono-tachi e", "cast", "هانك، نانسي"],
  ["anime", "Kaze Ga Tsuyoku Fuiteiru", "cast", "هايجي كيوتاي، كاكيرو كوراهاسي"],
  ["anime", "Keikenzumi na Kimi to, Keiken Zero na Ore ga Otsukiai suru Hanashi", "cast", "ريوكاشي كاشيما، روي سينا"],
  ["anime", "Kekkai Sensen", "cast", "ليوناردو واتش، كلاوس فون راينهيرت"],
  ["anime", "Keppeki Danshi Aoyama Kun", "cast", "أوياما-كن، كااوري"],
  ["anime", "Kikansha no Mahou wa Tokubetsu desu", "cast", "ديسير هيرمان، رومريكا، برام"],
  ["anime", "Kimi to Boku no Saigo no Senjou, Aruiwa Sekai ga Hajimaru Seisen", "cast", "إيسكا، أليسليزي"],
  ["anime", "Kimi wo Aishita Hitori no Boku e", "cast", "يو تاكاساكي، ساوا"],
  ["anime", "Kinsou no Vermeil Gakeppuchi Majutsushi wa Saikyou no Yakusai to Mahou Sekai wo Tsukisusumu", "cast", "ألتو غولدفيلد، فيرميل"],
  ["anime", "Kishuku Gakkou No Juliet", "cast", "روميو إينوزوكا، جولييت بيرسيا"],
  ["anime", "Kono Subarashii Sekai Ni Shukufuku Wo!", "cast", "ساتو كازوما، أكوا، ميكومين، داركنيس"],
  ["anime", "Kurau Phantom Memory", "cast", "كوراو، ري"],
  ["anime", "Kyoukai no Kanata", "cast", "أكيهيتو كانبارا، ميراي كوريياما"],
  ["anime", "long zu", "cast", "لو مينغفي، تشن موتسونغ"],
  ["anime", "Lord of Mysteries (Guimi Zhi Zhu Xiaochou Pian)", "cast", "كلاين موريتي"],
  ["anime", "Made In Abyss", "cast", "ريكو، ريج، ناناشي"],
  ["anime", "Magic Kaito 1412", "cast", "كايتو كوريبا"],
  ["anime", "Mahou Shoujo Tokushusen Asuka", "cast", "أسوكا أوتوري، ميا"],
  ["anime", "Mairimashita! Iruma-Kun", "cast", "إيروما سوزوكي، أسيموديوس، كلارا"],
  ["anime", "Mamahaha no Tsurego ga Motokano datta", "cast", "ميزوتو إريدو، يومي إريدو"],
  ["anime", "Mangaka-san to Assistant-san to The Animation", "cast", "يووكي أيتو، ميهاري"],
  ["anime", "Maou 2099", "cast", "توشيا، فيل"],
  ["anime", "Maou Gakuin no Futekigousha", "cast", "أنوس فولديرود، ميشا، ساشا"],
  ["anime", "Maou-sama Retry", "cast", "هاكورو أونونو"],
  ["anime", "Maoujou de Oyasumi", "cast", "الأميرة سيا، شياطين القلعة"],
  ["anime", "Maoyuu Maou Yuusha", "cast", "البطل، ملكة الشياطين"],
  ["anime", "Masamune-Kun No Revenge", "cast", "ماساموني ماكابي، أكي أداغاكي"],
  ["anime", "Medaka Box", "cast", "ميدوكا كوروكامي، زينكاي هيتويوشي"],
  ["anime", "Mieruko-chan", "cast", "ميكو يوتسوبا، هاها، يوريا"],
  ["anime", "Monogatari Series Second Season [HD]", "cast", "كويومي أراراجي، سينجوغاهارا، هاناتسوكي"],
  ["anime", "Monster", "cast", "كينزو تينما، يوهان ليبرت، نينا فورتنر"],
  ["anime", "Moonrise", "cast", "جاك، ألبر"],
  ["anime", "Nanatsu no Taizai Mokushiroku no Yonkishi", "cast", "بيرسيفال، دوني، ناسيانس"],
  ["anime", "NieRAutomata Ver1.1a", "cast", "2B، 9S، A2"],
  ["anime", "Nisemonogatari [HD]", "cast", "كويومي أراراجي، كارين، تسوكيوهي"],
  ["anime", "No.6", "cast", "شيون، راتسو"],
  ["anime", "Nyan Koi!", "cast", "جونبي كوساكا، كانا"],
  ["anime", "One Outs", "cast", "توكيشي توغوتشي، دايجوكو"],
  ["anime", "Ookami Shoujo To Kuro Ouji", "cast", "إيريكا شينوهارا، كيويا ساتا"],
  ["anime", "Ore Wo Suki", "cast", "جورو، بانساي"],
  ["anime", "Oshi no Ko", "cast", "آي هوشينو، أكوا هوشينو، روبي، كانا"],
  ["anime", "Otome Game Sekai wa Mob ni Kibishii Sekai desu", "cast", "ليون، أنجيليكا، أوليفيا"],
  ["anime", "Ouran Koukou Host Club", "cast", "هارuhi فوجيوكا، تاماكي سو"],
  ["anime", "Ousama Game The Animation", "cast", "نوبواكي كانازاوا، تيروهيكو"],
  ["anime", "Ousama ranking", "cast", "بوجي، كاجي"],
  ["anime", "Oushitsu Kyoushi Haine", "cast", "هاياني، الأمراء الأربعة"],
  ["anime", "Owarimonogatari", "cast", "كويومي أراراجي، أوغي أوشيكي"],
  ["anime", "Persona 4 The Animation", "cast", "يو ناروكامي، يوسوكي، تشيه"],
  ["anime", "Persona 4 The Golden Animation", "cast", "يو ناروكامي، ماري، الأصدقاء"],
  ["anime", "Phantom Requiem For The Phantom", "cast", "زي، إين"],
  ["anime", "Plastic Memories", "cast", "تسوكاسا ميزوغاكي، آيلا"],
  ["anime", "Platinum End", "cast", "ميراي كاكوشي، ناسي"],
  ["anime", "Puella Magi Madoka Magica", "cast", "مادوكا كانامي، هومورا، ساياكا، مامي"],
  ["anime", "Punchline", "cast", "يوتا إيراتسو، ميكتان"],
  ["anime", "Rainbow Nisha Rokubou no Shichinin", "cast", "روك، أن-تشان، سابورو"],
  ["anime", "Rakudai Kishi no Cavalry", "cast", "إيكي كوروجاني، ستيللا"],
  ["anime", "Re Cutey Honey", "cast", "هاني كيساراجي"],
  ["anime", "Relife", "cast", "أراتا كايزاكي، تشيزورو هيشيرو"],
  ["anime", "Re꞉Creators", "cast", "سوتا ميزوشي، ألتاير، سيليستيا"],
  ["anime", "Rokudenashi Majutsu Koushi to Akashic Records", "cast", "غلين ريادرس، سيستيما، لوميا"],
  ["anime", "Saihate no Paladin", "cast", "ويليام، ماري، بلاد"],
  ["anime", "Saiki Kusuo No", "cast", "كوسو سايكي، نيندو، كاي"],
  ["anime", "Saikyou Onmyouji no Isekai Tenseiki", "cast", "سيكا لامبلو، إيفا"],
  ["anime", "Sakamoto Desu Ga", "cast", "ساكاموتو"],
  ["anime", "Satsuriku No Tenshi", "cast", "ري تشارلز، زاك"],
  ["anime", "Sayonara Zetsubou Sensei", "cast", "نوزومو إيتوشيكي، فوا"],
  ["anime", "Sekai Saikou no Ansatsusha, Isekai Kizoku ni Tensei suru", "cast", "لوغ تواتها، ديي"],
  ["anime", "Senkou No Night Raid", "cast", "أوي، ناتسو"],
  ["anime", "Servamp", "cast", "ماهيرو شيروتا، كورو"],
  ["anime", "Seto No Hanayome", "cast", "ناغاسومي ميتشيشيو، سون سان"],
  ["anime", "Shijou Saikyou no Daimaou, Murabito A ni Tensei suru", "cast", "فارد، إيرينا"],
  ["anime", "Shijou Saikyou no Deshi Kenichi", "cast", "كينيتشي شيراهاما، ميوكي"],
  ["anime", "Shinchou Yuusha [Multi-Subs]", "cast", "سييا ريوغوين، ريستار"],
  ["anime", "Shingeki! Kyojin Chuugakkou", "cast", "إيرين، ميكاسا"],
  ["anime", "Shinka no Mi Shiranai Uchi ni Kachigumi Jinsei", "cast", "سييوشي هيراغي، ساريا"],
  ["anime", "Shinmai Ossan Boukensha, Saikyou Party ni Shinu hodo Kitaerarete Muteki ni Naru", "cast", "ريك غلادييتر"],
  ["anime", "Sokushi Cheat ga Saikyou sugite, Isekai no Yatsura ga Marude Aite ni Naranai n desu ga", "cast", "يوغيري تاكاتو، تشيكا"],
  ["anime", "Sono Bisque Doll wa Koi wo Suru", "cast", "مارين كيتاغاوا، واكاتا غوجو"],
  ["anime", "Tales Of Zestiria The X", "cast", "سوراي، ميليبو"],
  ["anime", "Tanaka-Kun Wa Itsumo Kedaruge", "cast", "تاناكا، أوتتا"],
  ["anime", "Tate No Yuusha No Nariagari", "cast", "ناوفومي إيواتاني، رابتافيا، فيلرو"],
  ["anime", "Tatoeba Last Dungeon Mae no Mura no Shounen", "cast", "لويد بيلادونا، ماري"],
  ["anime", "Tenkuu Shinpan", "cast", "يوري هونجو، مايا"],
  ["anime", "Tenrou Sirius The Jaeger", "cast", "يوري، ميكا"],
  ["anime", "The Beginning After the End (Saikyou no Ousama Nidome no Jinsei wa Nani wo Suru)", "cast", "آرثر ليوين"],
  ["anime", "The Quintessential Quintuplets S01-S02 1080p", "cast", "فوتارو أويسو، إتشيكا، نينو، ميكو، يوتسوبا، إيتسيكي"],
  ["anime", "To Be Hero X (Tu Bian Yingxiong X)", "cast", "إكس، الأبطال المصنفون"],
  ["anime", "Tokidoki Bosotto Russia-go de Dereru Tonari no Alya-san", "cast", "أليا، مساكي"],
  ["anime", "Tokyo Ravens", "cast", "هاروتورا تسوتشيميكادو، ناتسومي"],
  ["anime", "Tsue to Tsurugi no Wistoria", "cast", "ويل سيرفورت، آليون"],
  ["anime", "Tsukimonogatari [HD]", "cast", "كويومي أراراجي، يوتسوغا أونوكي"],
  ["anime", "Uchi no Ko no Tame naraba, Ore wa Moshikashitara Maou mo Taoseru kamo Shirenai [Multi-Subs]", "cast", "ديل، لاتينا"],
  ["anime", "Udon No Kuni No Kiniro Kemari", "cast", "سوتا تاوارا، بوكو"],
  ["anime", "Yarinaoshi Reijou wa Ryuutei Heika wo Kouryakuchuu", "cast", "جيل، هاديس"],
  ["anime", "Yasei no Last Boss ga Arawareta", "cast", "روثا"],
  ["anime", "Yofukashi no Uta", "cast", "كوه مورياما، ناناسي ناژونا"],
];

// ----------------------------------------------------------------- games ----
// [folder, minimum, recommended]
const GAMES = [
  ["Blades of Time - Limited Edition", { cpu: "Core 2 Duo 2.6 GHz", ram: "2 جيجابايت", gpu: "GeForce 8800 GT" }, { cpu: "Intel Core i5", ram: "4 جيجابايت", gpu: "GeForce GTX 480" }],
  ["Bound.By.Flame", { cpu: "Core 2 Duo 2.2 GHz", ram: "2 جيجابايت", gpu: "Radeon HD 4850 أو GeForce 8800 GT" }, { cpu: "AMD FX-6100 أو Intel Core i5", ram: "4 جيجابايت", gpu: "GTX 560 أو Radeon HD 6970" }],
  ["Brothers - AToTS Remake", { cpu: "Intel Core i3", ram: "4 جيجابايت", gpu: "NVIDIA GTX 660" }, { cpu: "Intel Core i5", ram: "8 جيجابايت", gpu: "NVIDIA GTX 960" }],
  ["CallOfDutyModerWarfareRemastered", { cpu: "Intel Core i3-3225 أو AMD FX-6300", ram: "8 جيجابايت", gpu: "NVIDIA GTX 660 2GB" }, { cpu: "Intel Core i5-4690K أو AMD Ryzen 5 1600X", ram: "8 جيجابايت", gpu: "NVIDIA GTX 1060 6GB" }],
  ["Demon X Machine", { cpu: "Intel i5-3470 أو AMD FX-6300", ram: "6 جيجابايت", gpu: "NVIDIA GTX 660 أو AMD Radeon HD 7870" }, { cpu: "Intel i7-6700 أو AMD Ryzen 5 2600", ram: "8 جيجابايت", gpu: "NVIDIA GTX 1060 أو AMD RX 580" }],
  ["Desperados 2 Cooper's Revenge", { cpu: "Pentium 4 2.0 GHz", ram: "1 جيجابايت", gpu: "كارت شاشة بذاكرة 128 ميجابايت" }, { cpu: "Pentium 4 3.0 GHz", ram: "2 جيجابايت", gpu: "كارت شاشة بذاكرة 256 ميجابايت" }],
  ["Desperados Wanted Dead or Alive Re-modernized  490MB_1", { cpu: "Core 2 Duo", ram: "2 جيجابايت", gpu: "كارت شاشة متوافق مع DirectX 9", directx: "DirectX 9" }, { cpu: "Intel Core i3", ram: "4 جيجابايت", gpu: "كارت شاشة بذاكرة 1 جيجابايت" }],
  ["G-FOREC", { cpu: "Pentium 4 3.0 GHz", ram: "1 جيجابايت", gpu: "كارت شاشة بذاكرة 256 ميجابايت" }, { cpu: "Core 2 Duo 2.2 GHz", ram: "2 جيجابايت", gpu: "كارت شاشة بذاكرة 512 ميجابايت" }],
  ["Garfield Kart - Furious Racing", { cpu: "Intel Core 2 Duo", ram: "2 جيجابايت", gpu: "Intel HD 4000" }, { cpu: "Intel Core i3", ram: "4 جيجابايت", gpu: "NVIDIA GeForce GTX 560" }],
  ["Guns Gore and Cannoli 2", { cpu: "معالج ثنائي النواة 1.7 GHz", ram: "4 جيجابايت", gpu: "GeForce GT 430" }, { cpu: "معالج رباعي النواة 2.4 GHz", ram: "4 جيجابايت", gpu: "GeForce GTX 660" }],
  ["Hitman Blood Money", { cpu: "Pentium 4 1.5 GHz", ram: "512 ميجابايت", gpu: "كارت شاشة بذاكرة 64 ميجابايت يدعم T&L" }, { cpu: "Pentium 4 2.4 GHz", ram: "1 جيجابايت", gpu: "كارت شاشة بذاكرة 128 ميجابايت (GeForce FX 5700 أو أعلى)" }],
  ["house of the dead 4   3.96", { cpu: "معالج ثنائي النواة 2.0 GHz", ram: "2 جيجابايت", gpu: "كارت شاشة بذاكرة 512 ميجابايت" }, { cpu: "معالج رباعي النواة 2.6 GHz", ram: "4 جيجابايت", gpu: "كارت شاشة بذاكرة 1 جيجابايت" }],
  ["HULK [2003] 1.2GB_1", { cpu: "Pentium III 1.0 GHz", ram: "256 ميجابايت", gpu: "كارت شاشة بذاكرة 64 ميجابايت (GeForce 3 أو أعلى)" }, { cpu: "Pentium 4 2.0 GHz", ram: "512 ميجابايت", gpu: "كارت شاشة بذاكرة 128 ميجابايت (GeForce FX 5700)" }],
  ["Leo’s Fortune - HD Edition  800mb_1", { cpu: "معالج ثنائي النواة 2.0 GHz", ram: "2 جيجابايت", gpu: "Intel HD Graphics" }, { cpu: "Core i3 أو i5", ram: "4 جيجابايت", gpu: "كارت منفصل بذاكرة 1 جيجابايت" }],
  ["Lost Planet COLONIES  7.94GB_1", { cpu: "Intel Pentium 4 3.0 GHz", ram: "1 جيجابايت", gpu: "GeForce 6600" }, { cpu: "Intel Core 2 Duo", ram: "2 جيجابايت", gpu: "GeForce 8600" }],
  ["LotR - War in the North - LE", { cpu: "Intel Core 2 Duo 2.4 GHz أو AMD Athlon 64 X2 4400+", ram: "2 جيجابايت", gpu: "NVIDIA GeForce 8600 أو ATI Radeon HD 2600" }, { cpu: "Intel Core 2 Quad 2.4 GHz أو AMD Phenom II X4", ram: "2 جيجابايت", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870" }],
  ["mechwarior 5", { cpu: "Intel Core i3-7100 أو AMD Ryzen 3 1200", ram: "8 جيجابايت", gpu: "NVIDIA GeForce GTX 770 أو AMD Radeon R9 280" }, { cpu: "Intel Core i7-6700K أو AMD Ryzen 7 1700", ram: "16 جيجابايت", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX Vega 56" }],
];

// ------------------------------------------------------------------- run ----
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const norm = (s) =>
  String(s).replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/[\u0649\u064A]/g, "\u064A").replace(/\s+/g, " ").trim().toLowerCase();

const exact = new Map();
const loose = new Map();
for (const c of data.categories) {
  const a = new Map();
  const b = new Map();
  for (const i of c.items) {
    a.set(i.title, i);
    if (!b.has(norm(i.title))) b.set(norm(i.title), i);
  }
  exact.set(c.id, a);
  loose.set(c.id, b);
}
const resolve = (cat, t) => {
  const direct = exact.get(cat).get(t) || loose.get(cat).get(norm(t));
  if (direct) return direct;
  // Some folders carry a release tag the supplied title leaves off
  // ("Moon Lovers" vs "Moon Lovers [T-1080p-]"), so fall back to a prefix
  // match on the normalised title.
  const key = norm(t);
  for (const [k, item] of loose.get(cat)) if (k.startsWith(key) || key.startsWith(k)) return item;
  return null;
};

if (LIST) {
  for (const [cat, t] of MEDIA) console.log(`${resolve(cat, t) ? "ok  " : "MISS"}  ${cat} / ${t}`);
  for (const [t] of GAMES) console.log(`${resolve("games", t) ? "ok  " : "MISS"}  games / ${t}`);
  process.exit(0);
}

const files = new Map();
const load = (cat) => {
  const f = path.join(ROOT, "details", `${cat}.json`);
  if (!files.has(cat)) files.set(cat, JSON.parse(fs.readFileSync(f, "utf8")));
  return files.get(cat);
};

let directors = 0;
let cast = 0;
const flagged = 0;
let flagCount = 0;
const miss = [];

for (const row of MEDIA) {
  const [cat, folder, field, value, note, badCast] = row;
  const item = resolve(cat, folder);
  if (!item) { miss.push(`${cat} / ${folder}`); continue; }
  const parsed = load(cat);
  const r = parsed.items[item.id];
  if (!r) { miss.push(`${cat} / ${folder}`); continue; }

  if (field === "director") {
    if (!r.director && !(Array.isArray(r.directors) && r.directors.length)) {
      r.director = value;
      r.directors = [value];
      directors++;
    }
  } else {
    if (!(Array.isArray(r.cast) && r.cast.length)) {
      r.cast = String(value).split(/،|,/).map((s) => s.trim()).filter(Boolean);
      cast++;
    }
    if (note || badCast) {
      r.needsReview = true;
      r.extra = {
        ...(r.extra || {}),
        factsSource: "بحث يدوي",
        reviewNote: note || badCast,
      };
      flagCount++;
    } else {
      r.extra = { ...(r.extra || {}), factsSource: "بحث يدوي" };
    }
  }
}

let reqMin = 0;
let reqRec = 0;
for (const [folder, minimum, recommended] of GAMES) {
  const item = resolve("games", folder);
  if (!item) { miss.push(`games / ${folder}`); continue; }
  const parsed = load("games");
  const r = parsed.items[item.id];
  if (!r) { miss.push(`games / ${folder}`); continue; }
  if (!r.requirements || typeof r.requirements !== "object") r.requirements = {};
  const has = (v) => v && typeof v === "object" && Object.keys(v).length > 0;
  if (minimum && !has(r.requirements.minimum)) { r.requirements.minimum = minimum; reqMin++; }
  if (recommended && !has(r.requirements.recommended)) { r.requirements.recommended = recommended; reqRec++; }
}

if (!DRY) {
  for (const [cat, parsed] of files)
    fs.writeFileSync(path.join(ROOT, "details", `${cat}.json`), JSON.stringify(parsed, null, 2) + "\n");
}

console.log(`\nمخرج: ${directors} · أبطال: ${cast} (موسوم ${flagCount})`);
console.log(`مواصفات: حد أدنى ${reqMin} · موصى ${reqRec}`);
console.log(`لم يُطبّق: ${miss.length} ${DRY ? "(dry run)" : ""}`);
for (const m of miss) console.log(`  no folder: ${m}`);
