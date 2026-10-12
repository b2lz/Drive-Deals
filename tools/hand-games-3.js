"use strict";
// Third hand-researched batch: genres, summaries and the remaining
// fields, supplied by hand.
//
// Applied as given. An entry whose year or developer is a placeholder
// keeps its existing value rather than being overwritten with a guess,
// and an entry whose requirements describe an emulator rather than the
// game is marked so the page says so.
//
// Usage: node tools/hand-games-3.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

/**
 * [folder, genre or null, summary or null, year or null, developer or null,
 *  requirements {minimum,recommended} or null, note]
 */
const DATA = [
  ["BEAM NG", "محاكاة، سباق، فيزياء واقعية", "لعبة محاكاة فريدة تركز على الأضرار الفيزيائية الواقعية وحركة المركبات بناءً على الديناميكا الهوائية والتحطيم، في تجربة قيادة مفتوحة ومبتكرة لا حدود لحريتها.", null, null, null, ""],
  ["Blades of Time - Limited Edition", "أكشن، مغامرات، تقمص أدوار", "تلعب دور صائدة الكنز «آيومي» التي تستخدم مهاراتها بالسيف وقوة التحكم في الزمن لتراجع الوقت وصنع نسخ طبق الأصل منك، لكشف أسرار جزيرة غامضة وخطيرة.", null, null, null, ""],
  ["Brothers - AToTS Remake", "مغامرات، ألغاز، دراما", "رحلة عاطفية لشقيقين ينطلقان في مغامرة محفوفة بالمخاطر للعثور على علاج لوالدهما المريض، حيث تتحكم في كل شقيق بشكل فريد لحل الألغاز وتخطي العقبات.", null, null, null, ""],
  ["Call of Duty - MW2CR", "تصويب منظور الشخص الأول (FPS)، أكشن عسكري", "النسخة المحسنة لواحدة من أكثر حملات القصة إثارة في تاريخ الألعاب، حيث تعود لملاحقة التهديدات العالمية مع فرقة العمل 141 في أحداث ملحمية ومشوقة.", null, null, null, ""],
  ["Call Of Duty 1", "تصويب منظور الشخص الأول (FPS)، حرب عالمية ثانية", null, null, null, null, ""],
  ["call of duty black obs 6", "تصويب منظور الشخص الأول (FPS)، تجسس، أكشن", "تدور أحداثها في أوائل التسعينيات وسط فترة اضطرابات سياسية عالمية ونهاية الحرب الباردة، وتقدم قصة تشويقية تتمحور حول مؤامرة مظلمة تسيطر على الوكالات الأمنية.", 2024, "Treyarch / Raven Software", null, ""],
  ["call of duty black obs1", "تصويب منظور الشخص الأول (FPS)، عمليات سرية", "خض تجربة العمليات السرية خلال الحرب الباردة وحرب فيتنام من منظور الجندي أليكس ماسون، بينما تحاول كشف خبايا وألغاز غسيل الدماغ والذكريات المبهمة.", 2010, "Treyarch", null, ""],
  ["call of duty modern warfare 2 2022", null, null, null, null, { minimum: { os: "Windows 10 (64-bit)", cpu: "Intel Core i3-6100 أو AMD Ryzen 3 1200", ram: "8 GB", gpu: "GTX 960 أو Radeon RX 570", storage: "125 GB" }, recommended: null }, ""],
  ["call of duty modern warfare 2019", null, null, null, null, { minimum: { os: "Windows 7/10 (64-bit)", cpu: "Intel Core i3-4340 أو AMD FX-6300", ram: "8 GB", gpu: "GTX 670 أو Radeon HD 7950", storage: "175 GB" }, recommended: null }, ""],
  ["call of duty vangard", "تصويب منظور الشخص الأول (FPS)، حرب عالمية ثانية", "تتبع اللعبة جذور القوات الخاصة من خلال قصص أبطال من مختلف الجبهات العالمية وهم يتكاتفون للتصدي للتهديد النازي الأخير في اللحظات الحرجة من الحرب.", 2021, "Sledgehammer Games", null, ""],
  ["Call of Juarez The Cartel", null, null, 2011, null, null, ""],
  ["Call to Arms - GoH - Ostfront", "استراتيجية واقعية (RTS)، تكتيكية، حرب عالمية ثانية", "لعبة استراتيجية عميقة ومفصلة تضعك في قلب معارك الجبهة الشرقية الضارية خلال الحرب العالمية الثانية، حيث تتطلب دقة تكتيكية وإدارة دقيقة للموارد والمعدات العسكرية.", null, null, null, ""],
  ["CallOfDutyModerWarfareRemastered", "تصويب منظور الشخص الأول (FPS)، أكشن عسكري", "النسخة المحسنة بالكامل لأيقونة ألعاب التصويب Call of Duty 4، تضعك مجدداً في مهام عالمية خطيرة بجودة بصريات مذهلة وتفاصيل لا تُنسى.", null, null, null, ""],
  ["Car.X.Street", "سباق سيارات، عالم مفتوح، تفحيط (Drift)", "انطلق في شوارع مدينة ضخمة ومفتوحة ليلاً ونهاراً، وابنِ سيارة أحلامك الخاصة وقم بتعديلها حتى النخاع لتصبح ملك سباقات الشوارع غير الرسمية.", 2022, "CarX Technologies", null, ""],
  ["Castlevania - Lords of Shadow UE", "تقمص أدوار، أكشن، مغامرات", "رحلة مظلمة وملحمية لبطل يحمل ندوب الماضي، يقاتل قوى الظلام ومخلوقات الليل الخارقة عبر عوالم قوطية ساحرة لإنقاذ العالم من لعنة مدمرة.", null, null, null, ""],
  ["Castlevania - LoS - Mirror of Fate HD", "أكشن، مغامرات، منصات", "تروي فصولاً جديدة من صراع عائلة بلمونت الأسطورية ضد مصاصي الدماء وقوى الشر عبر أجيال متعاقبة من الانتقام والمصير المظلم.", null, null, null, ""],
  ["CoD - Black Ops - Cold War", "تصويب منظور الشخص الأول (FPS)، تجسس سياسي", "تكملة مباشرة للأجزاء الكلاسيكية، تضعك على أثر جاسوس سوفيتي غامض يُدعى «بيرسيوس» الذي يخطط لقلب موازين القوة العالمية خلال الثمانينات.", 2020, "Treyarch / Raven Software", null, ""],
  ["Condemned.Criminal.Origins", "رعب نفسي، تحقيق، أكشن", null, 2005, null, null, ""],
  ["DCG - Aladdin & The Lion King", null, null, null, null, { minimum: { os: "Windows 7/8/10", cpu: "1.5 GHz", ram: "2 GB", directx: "DirectX 9.0c", storage: "2 GB" }, recommended: null }, ""],
  ["Demon X Machine", "أكشن، خيال علمي، قتال آليات عملاقة (Mecha)", "تحكم ببدلة قتالية متطورة لخوض معارك حماسية ضد ذكاء اصطناعي متمرد ووحوش ميكانيكية عملاقة في عالم دمرته كارثة قاهرة.", null, null, null, ""],
  ["Desperados Wanted Dead or Alive Re-modernized  490MB_1", null, null, null, null, { minimum: { os: "Windows 7/8/10", cpu: "ثنائي النواة 2.0 GHz", ram: "4 GB", directx: "DirectX 11", storage: "5 GB" }, recommended: null }, ""],
  ["disbatch", "محاكاة، استراتيجية، إدارة أزمات", "لعبة تركز على تلقي مكالمات الطوارئ وتوجيه وحدات الشرطة والإسعاف والمطافئ بدقة وسرعة لإنقاذ الأرواح وسط ضغوط الوقت.", 2023, "استوديو مستقل", null, "السنة تقديرية"],
  ["Dragonball Xenoverse", "قتال، أكشن، تقمص أدوار", "انضم إلى شرطة الزمن لحماية أحداث تاريخ دراغون بول الشهيرة من التلاعب والتخريب من قِبل أشرار مجهولين، مع إمكانية تصميم شخصيتك الفريدة.", null, null, null, ""],
  ["Earthfall.Invasion", "تصويب منظور الشخص الأول (FPS)، تعاوني، بقاء ضد الفضائيين", "تعاون مع أصدقائك لصد غزو فضائي كتاح لمواجهة الكائنات الفضائية الشرسة وبناء التحصينات للنجاة في مدن أرضية مدمرة.", null, null, null, ""],
  ["End of Abyss", null, null, null, "استوديو مستقل", null, ""],
  ["F.E.A.R. Platinum Collection", null, null, null, null, { minimum: { os: "Windows XP/Vista/7", cpu: "Pentium 4 1.7 GHz", ram: "512 MB", vram: "64 MB", storage: "5 GB" }, recommended: null }, ""],
  ["F1 22 Champions Edition", "سباق سيارات، محاكاة رياضية", "عِش حياة أبطال سباقات الفورمولا 1 مع قوانين وعربات جديدة كلياً لموسم 2022، وتجربة قيادة مذهلة على أشهر حلبات العالم.", null, null, null, ""],
  ["FNAF-Help-Wanted", "رعب نفسي، واقع افتراضي (VR)، بقاء", "مجموعة من الألعاب المصغرة المخيفة المستوحاة من تاريخ مطعم فريدي فازبير، حيث تواجه الكوابيس الآلية وتختبر أعصابك في بيئات مرعبة.", null, null, null, ""],
  ["FNAF-Security-Breach", "رعب بقاء، مغامرات في عالم واسع", "تلعب دور الصبي «غريغوري» المحاصر داخل مركز تسوق ترفيهي ضخم ومرعب ليلاً، وعليك الهروب من الآليات القاتلة بمساعدة شخصية غلامروك فريدي.", null, null, null, ""],
  ["FNAF.Help.Wanted.2", "رعب، ألغاز، بقاء", "تجربة مرعبة جديدة ومكملة لسلسلة «هيل وونتد»، تقدم تحديات جديدة مخيفة ومزيداً من الألغاز المرتبطة بعالم الكوابيس الميكانيكية.", null, null, null, ""],
  ["G-FOREC", "أكشن، مغامرات، منصات", "استمتع بمغامرات فرقة خنازير غينيا السرية المدربة بأعلى تقنيات التجسس لإنقاذ العالم من مؤامرة شريرة يقودها جهاز منزلي ذكي متمرد.", null, null, null, ""],
  ["Ghost Of Recon", "تصويب تكتيكي، عالم مفتوح، أكشن عسكري", "قُد فرقة النخبة «غوست» في مهام سرية خلف خطوط العدو داخل بيئات عالم مفتوح واسعة ومخطط لها بعناية لتفكيك منظمات إجرامية أو عسكرية خطيرة.", 2017, "Ubisoft Paris", { minimum: { cpu: "Core i5-2400 أو FX-6300", ram: "8 GB", gpu: "GTX 660 أو HD 7850" }, recommended: null }, "السنة والمواصفات تخص Wildlands؛ المجلد لا يحدد أي جزء"],
  ["GTA - The Original Trilogy", null, null, null, null, { minimum: { cpu: "يعمل على الأجهزة الحديثة", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["GTA Trilogy - DE-BSE", "أكشن، عالم مفتوح، جريمة", "النسخ المحسنة بثلاثية الألعاب الأسطورية (GTA III, Vice City, San Andreas) برسومات محدثة وتحكم عصري مع الحفاظ على القصة والأجواء الأصلية الخالدة.", null, null, null, ""],
  ["gta vice city", null, null, null, null, { minimum: { cpu: "800 MHz", ram: "128 MB", vram: "32 MB", storage: "أقل من 2 GB" }, recommended: null }, ""],
  ["GTA VICE CITY NEXT GEN", null, null, 2024, "فريق تعديل مجتمعي", null, "السنة تقديرية — مشروع تعديل مجتمعي"],
  ["Half-Life - Source Quadrilogy", null, null, null, null, { minimum: { cpu: "متوافقة مع جميع الأجهزة الحديثة", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["Harry Potter And The Deathly Hallows Part 1", "تصويب بالتعويذات السحرية، أكشن ومغامرات", "هاري بوتر وأصدقاؤه في حالة هرب مستمر وخارج أسوار هوغوورتس، حيث يواجهون أتباع لورد فولدمورت في معارك شرسة للبقاء على قيد الحياة.", null, null, null, ""],
  ["Harry Potter And The Deathly Hallows Part 2", "أكشن، مغامرات، خيال سحري", "المواجهة الحتمية والملحمية الأخيرة بين قوى الخير والشر، حيث يعود هاري إلى مدرسة هوغوورتس لخوض المعركة الكبرى وإنهاء تهديد فولدمورت للأبد.", null, null, null, ""],
  ["Hitman Sniper Challenge", "تصويب دقيق، اغتيال تكتيكي", "تجربة قنص مركزة ومحدودة المكان، تلعب فيها بشخصية العميل 47 لإنجاز مهمة اغتيال دقيقة والقضاء على الأهداف من مسافات بعيدة بطرق مبتكرة.", null, null, null, ""],
  ["Hold Out", "بقاء، تصويب، زومبي", "صمد لأطول فترة ممكنة ضد موجات لا تنتهي من الكائنات المتوحشة والزومبي، وقم بجمع الإمدادات وبناء الدفاعات للبقاء حياً.", null, "استوديو مستقل", null, ""],
  ["Horizon - Zero Dawn CE", "أكشن، تقمص أدوار، عالم مفتوح", "تتبع قصة «ألوي»، صائدة نبذة عن ماضيها في عالم مستقبلية تسيطر عليه مخلوقات روبوتية عملاقة تشبه الديناصورات، بينما تهدد الكارثة بقايا البشرية.", null, null, null, ""],
  ["Horizon Chase Turbo", "سباق أركيد، كلاسيكي سريع", "مستوحاة من ألعاب السباقات الكلاسيكية في التسعينيات، تقدم تجربة سباق ممتعة وملونة بسرعة عالية وموسيقى تصويرية حماسية.", null, null, null, ""],
  ["house of the dead 4   3.96", "تصويب على مسار ثابت، رعب وزومبي", "انغمس في كابوس مليء بالزومبي والمخلوقات المتحولة واستخدم سلاحك لإطلاق النيران بلا هده وسط بيئات مروعة ومظلمة.", 2005, "Sega", { minimum: { cpu: "معالج متوسط للمحاكي", ram: "2 GB", gpu: "—" }, recommended: null }, "محاكي"],
  ["IGI", null, null, null, null, { minimum: { cpu: "تعمل على أي جهاز", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["IGI2", null, null, null, null, { minimum: { cpu: "مواصفات بسيطة جداً", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["Injustice 2 Legendary Edition", "قتال، أكشن، أبطال خارقين", "معارك طاحنة تجمع أبطال وأشرار عالم دي سي، حيث تخوض نزالات ملحمية لتقرير مصير العدالة والصراع الداخلي بين باتمان وسوبرمان.", null, null, null, ""],
  ["James Bond 007 Legends", "تصويب من منظور الشخص الأول، تجسس وأكشن", "تحتفل اللعبة بتاريخ الجاسوس الأشهر جيمس بوند عبر دمج أبرز وأعظم مهامه السينمائية الكلاسيكية في قصة تشويقية واحدة.", null, null, null, ""],
  ["Kingdom Hearts 3 and Re-Mind", "تقمص أدوار، مغامرات خيالية", "انضم إلى سورا وأصدقائه من ديزني وفاينل فانتسي في ملحمة خيالية لمواجهة قوى الظلام واستعادة النور لعوالم ديزني المتنوعة والمدهشة.", null, null, null, ""],
  ["Kunitsu", "أكشن، استراتيجية، فلكلور ياباني", "لعبة تجمع بين الأكشن الاستراتيجي والأجواء اليابانية العريقة، حيث تحمي عذراء مقدسة من أرواح شريرة تنحدر من الجبال طوال الليل.", null, null, null, ""],
  ["Life is Strange - BtS Remastered", "مغامرات تفاعلية، دراما خيالية", "قصة عاطفية تركز على صداقة «كلوي برايس» و«رايتشل إمبر» قبل أحداث اللعبة الأصلية، وكيف واجهتا أسرار بلدتهما ومشاكلهما الشخصية المؤثرة.", null, null, null, ""],
  ["LotR - War in the North - LE", "تقمص أدوار، أكشن، تعاوني", "عِش قصة فرعية غير مروية من ثلاثية سيد الخواتم، حيث يتكاتف أبطال ثلاثة لصد تهديد جيوش الظلام في شمال أرض الوسط.", null, null, null, ""],
  ["MAXPYNE 2", "نوار، تصويب، دراما وجريمة", "قصة حب ومأساة مظلمة تحيط بشرطي مكافحة الجريمة ماكس باين وسط عالم نيويورك القاسي، ممزوجة بميكانيكا الحركة البطيئة المميزة (Bullet Time).", null, null, { minimum: { cpu: "مواصفات منخفضة جداً", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["mechwarior 5", "محاكاة، قتال آليات ضخمة، أكشن", "قُد مجموعة من المرتزقة وتقمص دور قائد آليات حربية عملاقة في حروب مستقبلية طاحنة بحثاً عن الثروة والانتقام.", null, null, null, ""],
  ["MGS MASTER COLLECTION Vol.1 BONUS CONTENT", "محتوى إضافي، أرشيف وثائقي، تسلل", "مجموعة إضافية تضم ملفات وسيناريوهات كلاسيكية ومحتويات نادرة توثق تاريخ سلسلة التسلل والأسطورة هيدو كوجيما.", null, null, null, ""],
  ["MGS Peace Walker", "تسلل، أكشن، استراتيجية إدارة قواعد", "تتبع «بيغ بوس» في كوستاريكا خلال فترة الحرب الباردة، حيث ينشئ جيشه الخاص بلا حدود ويواجه تهديدات نووية سرية.", 2010, "Kojima Productions", { minimum: { cpu: "معالج متوسط للمحاكي", ram: "4 GB", gpu: "—" }, recommended: null }, "محاكي"],
  ["MGS2 Sons of Liberty Master Collection Version", "تسلل، تجسس، أكشن سياسي", "العب دور الجاسوس «سنيك» ثم «رايدر» داخل منشأة بحرية غامضة تسيطر عليها جماعة إرهابية تُهدد الاستقرار العالمي في قصة معقدة ومليئة بالمفاجآت.", null, null, null, ""],
  ["MGS3 Snake Eater Master Collection Version", "تسلل، بقاء في الغابات، تجسس", "العب القصة الأيقونية لجندي الأجيال «نايتد سنيك» أثناء مهمته الخطيرة وسط الأدغال السوفيتية إبان الحرب الباردة لإنقاذ معلمه السابق وكشف خيانة مدوية.", null, null, null, ""],
  ["Middle-earth - Shadow of War DE", "أكشن، تقمص أدوار، عالم مفتوح", "واجه جيوش سورون في أرض الوسط باستخدام نظام «العدو» الفريد الذي يتذكر تفاعلاتك السابقة، وابنِ جيشك الخاص من العفاريت للسيطرة على القلاع الحصينة.", null, null, null, ""],
  ["NARUTO X BORUTO - UNSC", "قتال أركيدي، أنمي، أكشن", "خض أقوى وأعنف معارك نينجا قرية الورق مع قائمة ضخمة تضم أجيال ناروتو وبوروتو وقصص جديدة حصرية للسلسلة.", null, null, null, ""],
  ["Need for Spee  3.3gbd  ProStreet", "سباق سيارات، محاكاة احترافية", "تحول فريد في السلسلة يترك سباقات الشوارع غير القانونية ليدخل حلبات السباق الرسمية والاحترافية المنظمة مع نظام أضرار واقعي ومثير.", null, null, { minimum: { cpu: "2.8 GHz", ram: "512 MB", vram: "128 MB", storage: "8 GB" }, recommended: null }, ""],
  ["Neighbours from Hell - Revenge Is a Sweet Game", "ألغاز، مقالب كوميدية، تسلل خفيف", "ساعد بطل اللعبة «وودي» في تنفيذ مقالب مضحكة ومبتكرة لإزعاج جاره المزعج دون أن يتم القبض عليك أثناء قضاء إجازته الصيفية.", 2020, "JoWooD / Far From Home", { minimum: { cpu: "مواصفات بسيطة جداً", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["Neighbours from Hell 2 - On Vacation", null, null, 2004, null, { minimum: { cpu: "مواصفات منخفضة جداً", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["NFS Hot Pursuit Remastered", "سباق سيارات، مطاردات شرطة، أركيد", "استمتع بإثارة الهروب بالسيارات الخارقة كمتسابق متهور، أو قم بملاحقة الخارجين عن القانون كشرطي باستخدام ترسانة من التكتيكات والمطاردات السريعة.", null, null, null, ""],
  ["NFS Most Wanted Unofficial Remake", "سباق سيارات، عالم مفتوح، مطاردات شرطة", "إعادة إحياء للعبة السباقات الأسطورية مع رسومات عصرية وتعديلات بصرية مذهلة تعيد ذكريات الصعود لقائمة المطلوبين الأوائل.", null, "تعديلات مجتمعية (Community Modders)", { minimum: { cpu: "ثنائي النواة", ram: "4 GB", gpu: "كارت متوسط", storage: "5 GB" }, recommended: null }, ""],
  ["NieR Replicant", null, "قصة عميقة ومظلمة لشاب يحاول إيجاد علاج لمرض غامض يصيب شقيقته في عالم ممزق وفناء بشري غامض.", null, null, { minimum: { os: "Windows 10 (64-bit)", cpu: "AMD Ryzen 3 1300X أو Intel Core i5-6400", ram: "8 GB", gpu: "Radeon R9 280X أو GTX 960" }, recommended: null }, ""],
  ["Nikoderiko - The Magical World DC", "منصات، مغامرات عائلية", null, 2024, null, null, ""],
  ["NODE - The Last Favor of the Antarii", null, null, 2023, "استوديو مستقل", null, ""],
  ["Olympic Games Tokyo 2020", "رياضة، ألعاب مصغرة، تنافسي", "شارك في منافسات الألعاب الأولمبية الشهيرة عبر عشرات الألعاب الرياضية الحماسية مع إمكانية تصميم رياضيك والمنافسة عالمياً.", null, null, null, ""],
  ["Planet_Coaster_Alpha", "محاكاة، بناء، إدارة مدن ملاهي", "أطلق العنان لإبداعك لتصميم وبناء أضخم وأعقد ملاهي ترفيهية وأفعوانيات مرعبة تجذب الزوار وتحقق النجاح المالي.", null, null, null, ""],
  ["Prince of Persia Trilogy", null, null, null, null, { minimum: { cpu: "مواصفات خفيفة جداً", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["ptototype2", "أكشن، عالم مفتوح، قوى خارقة", "تلعب دور الجندي «جيمس هيلر» الساعي للانتقام من أليكس ميرسر بعد تسببه في تفشي فيروس مدمر، مستخدماً قدرات تحول جسدي مرعبة وخارقة.", null, null, null, ""],
  ["Rabbids - Party of Legends [HV]", "حفلات، ألعاب مصغرة، كوميدي عائلي", "مغامرة مجنونة ومليئة بالضحك والمقالب مع كائنات الرابيدز المشاغبة عبر مجموعة ضخمة من الألعاب المصغرة التنافسية.", null, null, { minimum: { os: "Windows 10", cpu: "ثنائي النواة", ram: "4 GB", directx: "DirectX 11" }, recommended: null }, ""],
  ["Rage Anarchy Edition", "تصويب من منظور الشخص الأول، عالم مفتوح، ما بعد الكارثة", "استيقظ في عالم مستقبلية قاحل دمره نيزك عملاقة، حيث تتقاتل العصابات والناجون للسيطرة على الموارد بينما تواجه أسراراً حكومية مرعبة.", null, null, null, ""],
  ["Red Alert 2", null, null, null, null, { minimum: { cpu: "تعمل على جميع الحواسيب الحديثة", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["ResidentEvil4UltimateHD", "رعب بقاء، أكشن، منظور ثالث", "العب دور العميل ليون إس كينيدي في مهمة لإنقاذ ابنة الرئيس الأمريكي المحتجزة في قرية أوروبية نائية تسيطر عليها طائفة غامضة ومخيفة.", null, null, null, ""],
  ["silient hill f", null, null, 2025, null, null, "السنة متوقعة — الإصدار لم يُعلن بعد"],
  ["Sim Digital Combat World", "محاكاة طيران عسكري واقعية للغاية", "تجربة الطيران الحربي الأكثر دقة وواقعية لطائرات ومقاتلات حقيقية في بيئات قتالية معقدة تتطلب تدريباً واحترافية عالية.", null, null, null, ""],
  ["snow runner", "محاكاة قيادة، وعورة وتضاريس صعبة", "خض تحديات قيادة الشاحنات الضخمة عبر تضاريس وعرة وطينية وثلوج كثيفة لنقل البضائع والمعدات في بيئات طبيعية قاسية.", null, null, null, ""],
  ["Sonic Heroes", null, null, null, null, { minimum: { cpu: "مواصفات منخفضة جداً", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["Sonic Unleashed", null, null, null, null, { minimum: { cpu: "معالج متوسط للمحاكي RPCS3", ram: "—", gpu: "—" }, recommended: null }, "محاكي"],
  ["Spider-Man - Miles Morales", "أكشن، مغامرات، أبطال خارقين، عالم مفتوح", "تتبع قصة المراهق مايلز موراليس وهو يتأقلم مع قواه الجديدة ليصبح سبايدرمان الخاص بمدينة نيويورك، بينما يدافع عن منزله في حوادث شتاء قاسية.", null, null, null, ""],
  ["Spider-man Remastered", "أكشن، مغامرات، أبطال خارقين", "عِش قصة بيتر باركر المخضرم وهو يحارب الجريمة المنظمة والأشرار الأسطوريين في مدينة نيويورك المصممة بعناية فائقة وبرسومات محسنة.", null, null, null, ""],
  ["Spider-Man Shattered Dimensions", null, null, 2010, null, null, ""],
  ["Spider-Man Web of Shadows", null, null, 2008, null, null, ""],
  ["StarCraft 2 - The Trilogy", null, null, 2010, null, { minimum: { cpu: "Intel Core 2 Duo أو AMD Athlon 64 X2", ram: "2 GB", gpu: "NVIDIA GeForce 7600 GT", storage: "30 GB" }, recommended: null }, ""],
  ["Stranger of Paradise - FFO", "تقمص أدوار، قتال صعب (Souls-like)", "رحلة مظلمة وعنيفة لمجموعة من الأبطال بقيادة جاك وهم يسعون للقضاء على ظلام «كاوس» عبر معارك سريعة وقوية ومليئة بالحماس.", null, null, null, ""],
  ["Styx - Master of Darkness", "تسلل خفي، مغامرات، فانتازيا مظلمة", "تلعب دور العفريت «ستيكس» الماكر الذي يعتمد على الظلال والتسلل السري لسرقة الكنوز وتنفيذ اغتيالات مستحيلة داخل حصون بشرية وجنية محصنة.", null, null, null, ""],
  ["Super Mario 3D World + Bowser's Fury", "منصات، عائلي، مغامرات", "انطلق في مغامرات ملونة ومبتكرة مع ماريو وأصدقائه لإنقاذ الجنيات، مع وضع إضافي مفتوح يواجه فيه ماريو غضب باوزر العملاق.", null, "Nintendo", { minimum: { cpu: "محاكي Nintendo Switch", ram: "8 GB", gpu: "—" }, recommended: null }, "محاكي"],
  ["TABS", "محاكاة معارك كوميدية، استراتيجية فيزيائية", "لعبة استراتيجية قائمة على فيزياء غريبة ومضحكة، حيث تضع جنوداً من مختلف العصور من الرجال الحجريين وحتى الفضائيين لمشاهدة معارك طريفة لا تخلو من الفوضى.", null, null, null, ""],
  ["TDPA - The Devil in Me", "رعب نفسي، خيارات تفاعلية، سينمائي", "مجموعة من صناع الأفلام يتلقون دعوة غاممة لزيارة فندق يحاكي جرائم سفاح مرعب، ليكتشفوا سريعاً أنهم وقعوا في فخ مصيدة قاتلة ومميتة.", null, null, null, ""],
  ["The Elder Scrolls oblivian REMAKE  108GB_1", null, null, null, null, { minimum: { os: "Windows 10/11", cpu: "سداسي النواة", ram: "16 GB", gpu: "RTX 2060 أو أعلى", storage: "واسعة" }, recommended: null }, ""],
  ["The Elder Scrolls V - Skyrim - Legendary Edition", "تقمص أدوار، عالم مفتوح، فانتازيا", "تقمص دور قاتل التنانين في عالم شمالي شاسع ومفتوح مليء بالتنانين والسحر والمغامرات الأسطورية التي تصنع فيها مصيرك بنفسك.", null, null, null, ""],
  ["The Outer Worlds - SCE", "تقمص أدوار، خيال علمي، تصويب", "استيقظ من سبات طويل على سفينة فضاء ضائعة لتجد نفسك في مستعمرة فضائية تسيطر عليها شركات طشع تتدخل في كل تفاصيل حياة البشر.", null, null, null, ""],
  ["The Walking Dead - Definitive Series  2019  16.4GB_1", "مغامرات تفاعلية، دراما ونيل الزومبي", "قصة عاطفية وقاسية تلخص رحلة الطفلة «كليمنتاين» وهي تحاول البقاء على قيد الحياة وحماية من تحب في عالم اجتاحته جحافل الموتى والأحياء المتوحشين.", null, null, null, ""],
  ["TLotR War in the North", "تقمص أدوار، أكشن تعاوني", "انضم إلى ثلاثة أبطال في رحلة عبر الأراضي الشمالية لأرض الوسط للتصدي لقائد جيش مظلم تابع لسورون وابعاد الخطر عن ممالك البشر.", null, null, null, ""],
  ["TMNT - Shredder's Revenge", "أركيد كلاسيكي، أكشن جماعي", "استمتع بالقتال الكلاسيكي السريع مع سلاحف النينجا الثلاثة للقصاص من شريددر وجيشه الشرير برسومات بكسل فنية مذهلة وأجواء تسعينيات أصيلة.", null, null, { minimum: { cpu: "خفيفة جداً", ram: "—", gpu: "—" }, recommended: null }, ""],
  ["Tony Hawk's Pro Skater 1 plus 2", "رياضة، تزلج، أركيد", "النسخة المعاد إتقانها لأفضل ألعاب التزلج التاريخية، مع حركات بهلوانية خيالية وموسيقى تصويرية كلاسيكية حماسية.", null, null, null, ""],
  ["Ultimate Spiderman  1.71GB_1", "أكشن، عالم مفتوح، أبطال خارقين", "عش القصة الكلاسيكية لشخصية سبايدرمان مع القدرة على اللعب بشخصية العدو «فينوم» في مدينة نيويورك المفعمة بالحيوية والرسومات الكرتونية الفريدة.", null, null, { minimum: { cpu: "لا تتطلب مواصفات عالية", ram: "—", gpu: "—" }, recommended: null }, ""],
];

(async () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
  const cat = data.categories.find((c) => c.id === "games");
  const file = path.join(ROOT, "details", "games.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const byTitle = new Map(cat.items.map((i) => [i.title, i]));

  let written = 0;
  let missing = 0;

  for (const [folder, genre, summary, year, developer, requirements, note] of DATA) {
    const item = byTitle.get(folder);
    if (!item) {
      console.log(`  no folder named "${folder}"`);
      missing++;
      continue;
    }

    const rec = parsed.items[item.id];
    if (!rec) {
      console.log(`  "${folder}" has no record yet`);
      missing++;
      continue;
    }

    if (genre) rec.genres = [genre];
    if (summary && !rec.summaryAr && !rec.summaryEn) rec.summaryAr = summary;
    if (year && !rec.releaseDate) rec.releaseDate = String(year);
    if (developer && !rec.developer) rec.developer = developer;

    if (requirements && !rec.requirements) {
      rec.requirements = requirements;
      rec.needsRequirements = false;
    }

    if (note) {
      rec.needsReview = true;
      rec.extra = { ...(rec.extra || {}), reviewNote: note };
    }

    rec.extra = { ...(rec.extra || {}), factsSource: "بحث يدوي" };
    written++;
  }

  if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
  console.log(`\n${written} updated, ${missing} not applied. ${DRY ? "(dry run)" : ""}`);
})();