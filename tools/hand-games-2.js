"use strict";
// Second hand-researched batch: games supplied by hand, with dates,
// developers, genres, summaries and system requirements.
//
// Written as given, with one distinction preserved: an entry whose
// details are a placeholder ("indie studio", "a modern PC is fine") or
// whose requirements describe an emulator rather than the game is stored,
// but is marked. The page then says the details are unverified instead
// of presenting them as fact.
//
// Usage: node tools/hand-games-2.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

// Markers: "p" = the developer or year is a placeholder, not a fact.
//          "e" = the requirements describe an emulator, not the game.
//          ""  = written as supplied.
const DATA = [
  ["A Juggler's Tale 2020", "A Juggler's Tale", 2020, "Kaleidoscube", null, "مغامرات / منصات وألغاز", "قصة فتاة عرائس تحاول الهروب من السيرفر ومواجهة مصيرها في عالم مظلم وخيالي يعتمد على خيوط التحكم.", { cpu: "Intel Core i3", ram: "4 GB", gpu: "Nvidia GeForce GTX 660" }, { cpu: "Intel Core i5", ram: "8 GB", gpu: "Nvidia GeForce GTX 1060" }, ""],
  ["Ace Combat 7", "Ace Combat 7: Skies Unknown", 2019, "Bandai Namco Studios", null, "محاكاة طيران عسكري / أكشن", "حروب جوية استثنائية وطائرات مقاتلة متطورة في أجواء سينمائية حماسية وقصة صراع بين الدول.", { cpu: "Core i3-7100", ram: "8 GB", gpu: "GTX 750 Ti" }, { cpu: "Core i5-7500", ram: "8 GB", gpu: "GTX 1060" }, ""],
  ["Age of Empires 3 - Complete Edition", "Age of Empires III: Complete Edition", 2007, "Ensemble Studios", null, "استراتيجية في الوقت الفعلي (RTS)", "بناء الإمبراطوريات واستعمار العالم الجديد وخوض المعارك التاريخية الكلاسيكية.", { cpu: "Pentium 4 1.4 GHz", ram: "256 MB", vram: "64 MB" }, { cpu: "2.2 GHz", ram: "1 GB", vram: "256 MB" }, ""],
  ["Alan Wakes American Nightmare", "Alan Wake's American Nightmare", 2012, "Remedy Entertainment", null, "رعب نفسي / منظور ثالث", "مواجهة الكاتب ألان ويك لنسخته المظلمة ووحوش الظلام في أحداث مشوقة بأريزونا.", { cpu: "Dual Core 2 GHz", ram: "2 GB", vram: "512 MB" }, { cpu: "Quad Core 2.66 GHz", ram: "4 GB", gpu: "GTX 560" }, ""],
  ["Alekhines Gun", "Alekhine's Gun", 2016, "Maximum Games", null, "تسلل وتجسس", "عميل استخباري سوفيتي في فترة الحرب الباردة ينفذ عمليات اغتيال خفية وسرية.", { cpu: "Core i3 3.1 GHz", ram: "4 GB", gpu: "GTX 650" }, { cpu: "Core i7", ram: "8 GB", gpu: "GTX 760" }, ""],
  ["Alfred Hitchcock - Vertigo 2021  12.5GB_1", "Alfred Hitchcock - Vertigo", 2021, "Pendulo Studios", null, "مغامرات / تحقيق نفسي", "قصة درامية معقدة حول كاتب يعاني من الدوار وفقدان الذاكرة بعد حادث سيارة غامض.", { cpu: "Core i5-4670K", ram: "8 GB", gpu: "GTX 960" }, { cpu: "Core i7-6700K", ram: "16 GB", gpu: "GTX 1080" }, ""],
  ["Alice American McGees", "Alice: Madness Returns", 2011, "Spicy Horse", null, "أكشن ومغامرات / تقطيع وتذبيح", "رحلة مظلمة وسريالية لأليس في عوالم عجيبة لكشف غموض جنونها وحريق عائلتها.", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "Nvidia 8800 GT" }, { cpu: "Core i5", ram: "4 GB", gpu: "GTX 560" }, "العنوان يخلط بين نسختين: الأصلية 2000 وهذه 2011"],
  ["Alone in the Dark 2024", "Alone in the Dark", 2024, "Pieces Interactive", null, "رعب بقاء / تحقيق", "إعادة إحياء لرعبة الكلاسيكية الأولي في قصر ديرسيت المرعب والبحث عن المفقودين.", { cpu: "Ryzen 3 3100", ram: "8 GB", gpu: "GTX 1050 Ti" }, { cpu: "Ryzen 5 3600", ram: "16 GB", gpu: "RTX 2060" }, ""],
  ["Anno - History Collection", "Anno: History Collection", 2020, "Blue Byte", null, "استراتيجية وبناء مدن", "مجموعة كلاسيكية لأجزاء بناء المدن وإدارة التجارة والاستعمار التاريخي.", { cpu: "Core i3-3225", ram: "4 GB", gpu: "GTX 660" }, { cpu: "Core i5-4460", ram: "8 GB", gpu: "GTX 770" }, ""],
  ["Aragami 2016  2Gb_1", "Aragami", 2016, "Lince Works", null, "تسلل / أكشن", "نينجا شبحي يتحكم في الظلال للانتقام واختراق الحصون دون كشف أمره.", { cpu: "Core i5", ram: "8 GB", vram: "1 GB" }, { cpu: "Core i7", ram: "8 GB", gpu: "GTX 960" }, ""],
  ["Army Men Collection", "Army Men Collection", "1998-2006", "The 3DO Company", null, "أكشن منظور ثالث / استراتيجية مصغرة", "حروب جنود البلاستيك الخضر والصفراء في غرف النوم والحدائق بأسلحة مصغرة.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["Assassin's Creed Chronicles - Trilogy", "Assassin's Creed Chronicles", "2015-2016", "Climax Studios / Ubisoft", "Ubisoft", "منصات / تسلل ثنائي الأبعاد", "مغامرات ثلاثية لقتلة سريين في الهند والصين وروسيا بأسلوب التمرير الجانبي.", { cpu: "Core i3-2105", ram: "4 GB", gpu: "GT 440" }, { cpu: "Core i5-2400S", ram: "6 GB", gpu: "GTX 760" }, ""],
  ["Assassins Creed III", "Assassin's Creed III", 2012, "Ubisoft Montreal", "Ubisoft", "أكشن ومغامرات / عالم مفتوح", "تقمص دور المقاتل كاونور خلال حرب الاستقلال الأمريكية والغابات والمدن الكبرى.", { cpu: "Core 2 Duo 2.6 GHz", ram: "2 GB", vram: "512 MB" }, { cpu: "Quad Core 2.6 GHz", ram: "4 GB", gpu: "GTX 560" }, ""],
  ["Assassins.Creed.Valhalla", "Assassin's Creed Valhalla", 2020, "Ubisoft Montreal", "Ubisoft", "تقمص أدوار / عالم مفتوح", "رحلة الفايكنج إيفور لغزو أراضي إنجلترا وبناء مستوطنة ومحاربة الملوك.", { cpu: "Ryzen 3 1200", ram: "8 GB", gpu: "GTX 960" }, { cpu: "Ryzen 5 1600", ram: "8 GB", gpu: "GTX 1060" }, ""],
  ["Astral Chain", "Astral Chain", 2019, "PlatinumGames", null, "أكشن / تقطيع وتذبيح", "شرطة مستقبلية تتحكم بكائنات بيولوجية مقيدة بسلاسل لمواجهة غزو فضائي.", null, { gpu: "GTX 1060 أو أعلى" }, "e"],
  ["Attack on Titan", "Attack on Titan", 2016, "Omega Force", "Koei Tecmo", "أكشن / أنمي", "استخدام معدات المناورة لقطع رقاب العمالقة وحماية أسوار البشرية.", { cpu: "Core i7 870", ram: "4 GB", gpu: "GTS 450" }, { cpu: "Core i7 2600", ram: "8 GB", gpu: "GTX 760" }, ""],
  ["Battle vs Chess", "Battle vs Chess", 2011, "TopWare Interactive", null, "استراتيجية / شطرنج قتالي", "لعبة شطرنج تقليدية تتحول فيها قطع الشطرنج لمعارك حية وقتالية دموية عند الهجوم.", { cpu: "2.0 GHz", ram: "1 GB", vram: "256 MB" }, { cpu: "Dual Core 2.4 GHz", ram: "2 GB", vram: "512 MB" }, ""],
  ["Battlefield 1942", "Battlefield 1942", 2002, "EA DICE", "Electronic Arts", "منظور أول / حرب عالمية", "معارك كلاسيكية ضخمة في مسارح الحرب العالمية الثانية مع قيادة دبابات وطائرات وسفن.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["Blur", "Blur", 2010, "Bizarre Creations", null, "سباقات أركيدية / قتالية", "سباقات سيارات واقعية مدمجة بقدرات وأسلحة هجومية ودفاعية ممتعة.", { cpu: "Pentium D 3.4 GHz", ram: "1 GB", vram: "256 MB" }, { cpu: "Intel Core 2 Duo 2.0 GHz", ram: "2 GB", vram: "512 MB" }, ""],
  ["Borderlands - The Pre-Sequel - Remastered", "Borderlands: The Pre-Sequel - Remastered", 2014, "2K Australia / Gearbox", "2K Games", "منظور أول / تقمص أدوار", "مغامرة فضائية على قمر باندورا والجاذبية المنخفضة وأسلحة لا تُحصى.", { cpu: "Core 2 Duo 2.4 GHz", ram: "2 GB", gpu: "GeForce 8500" }, { cpu: "Quad Core 2.3 GHz", ram: "2 GB", gpu: "GeForce GTX 560" }, ""],
  ["Bloodborne", "Bloodborne", 2015, "FromSoftware", null, "أكشن وتقمص أدوار / صعبة", "مدينة يهارنام الملعونة ووحوش الليل في رحلة صيد مرعبة ومظلمة.", null, { cpu: "Core i7", ram: "16 GB", gpu: "RTX 2060" }, "e"],
  ["Control The Foundation", "Control: The Foundation", 2020, "Remedy Entertainment", null, "أكشن / خيال علمي", "محتوى إضافي يغوص في أسرار البيت القديم والتصدعات الغامضة.", { cpu: "Core i5-7500", ram: "8 GB", gpu: "GTX 1060" }, { cpu: "Core i5-8600K", ram: "16 GB", gpu: "RTX 2060" }, ""],
  ["Crash Team Racing Nitro", "Crash Team Racing Nitro-Fueled", 2019, "Beenox", null, "سباقات أركيدية كرتونية", "سباقات مجنونة لشخصيات كراش بانديكوت مع أسلحة خفيفة وانجرافات ممتعة.", null, { cpu: "معالج متوسط", ram: "8 GB" }, "e"],
  ["CRISIS CORE - FF7 - REUNION", "Crisis Core: Final Fantasy VII Reunion", 2022, "Square Enix", null, "تقمص أدوار وأكشن (Action RPG)", "قصة البطل زاك فير وماضيه مع منظمة شينرا وفتى الأسطورة سيفيروث.", { cpu: "Core i3-3225", ram: "8 GB", gpu: "GTX 660" }, { cpu: "Core i7-3770", ram: "8 GB", gpu: "GTX 1060" }, ""],
  ["Dark Souls - Prepare to Die Edition", "Dark Souls: Prepare to Die Edition", 2012, "FromSoftware", null, "أكشن وتقمص أدوار / صعبة", "رحلة مظلمة وصعبة للغاية في عالم لوردران لاختبار مهارات الصبر والقتال ضد زعماء أسطوريين.", { cpu: "Intel Core 2 Duo 2.6 GHz", ram: "2 GB", gpu: "GeForce 8800 GT" }, { cpu: "Intel Core 2 Quad 2.4 GHz", ram: "4 GB", gpu: "GeForce GTX 260" }, ""],
  ["Darksiders 2 - The Complete Edition", "Darksiders II - The Complete Edition", 2012, "Vigil Games", "THQ", "أكشن ومغامرات / تقطيع وتذبيح", "الفارس «موت» يحاول تبرئة أخيه «حرب» وإعادة البشرية للحياة في عوالم مقدسة وملعونة.", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "GeForce 9800 GT" }, { cpu: "Quad Core", ram: "4 GB", gpu: "GeForce GTX 260" }, ""],
  ["DCG - Aladdin & The Lion King", "Disney Classic Games: Aladdin and The Lion King", 2019, "Digital Eclipse", "Nighthawk Interactive", "منصات كلاسيكية", "النسخ المحسنة لألعاب الكرتون الخالدة لعلاء الدين والأسد الملك لأجهزة الجيل الذهبي.", null, null, "المواصفات موصوفة بأنها تعمل على أي جهاز مكتبي"],
  ["Dead Space Remake", "Dead Space Remake", 2023, "Motive Studio", "EA", "رعب بقاء / خيال علمي", "المهندس إيزاك كلارك يواجه مسوخ النيكرومورفز على متن سفينة الفضاء العملاقة USG Ishimura.", { cpu: "Core i5-8600", ram: "16 GB", gpu: "GTX 1070" }, { cpu: "Core i5-11600K", ram: "16 GB", gpu: "RTX 2070" }, ""],
  ["Demon's Souls", "Demon's Souls", "2009 (الريميك 2020)", "FromSoftware / Bluepoint Games", null, "أكشن وتقمص أدوار / صعبة", "مملكة بوليشيريا الملعونة بالضباب والروح الشيطانية الأولى.", null, { cpu: "Core i7", ram: "16 GB" }, "e"],
  ["Desperados Wanted Dead or Alive Re-modernized  490MB_1", "Desperados: Wanted Dead or Alive", 2001, "Spellbound Entertainment", "THQ Nordic", "استراتيجية تكتيكية / غرب أمريكي", "قيادة فريق من الخارجين عن القانون لتنفيذ خطط تكتيكية وتسلل بدقة عالية.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["disbatch", null, null, null, null, null, null, null, null, "p"],
  ["Disney Infinity - Gold Collection", "Disney Infinity", "2013 (تجميعة الحاسب 2021)", "Avalanche Software", null, "مغامرات / عوالم مفتوحة", "مغامرات تدمج شخصيات ديزني وبيكسار في عوالم مفتوحة وبناء حر.", { cpu: "Core i3", ram: "4 GB", gpu: "GTX 560" }, { cpu: "Core i5", ram: "8 GB", gpu: "GTX 770" }, ""],
  ["DOOM 3 BFG Edition", "DOOM 3 BFG Edition", 2012, "id Software", "Bethesda", "رعب / منظور أول (FPS)", "نسخة محسنة لرعب الفضاء الشهير DOOM 3 وإضافة أجزاء السلسلة الكلاسيكية الأولى.", { cpu: "Dual Core 2.4 GHz", ram: "3 GB", vram: "512 MB" }, { cpu: "Quad Core", ram: "3 GB", gpu: "GTX 260" }, ""],
  ["Dungeons & Dragons - Dark Alliance", "Dungeons & Dragons: Dark Alliance", 2021, "Tuque Games", null, "أكشن وتقمص أدوار (Action RPG)", "مغامرة تعاونية ملحمية لمحاربة وحوش وعفاريت عوالم دنغنز آند دراغونز.", { cpu: "FX-8320", ram: "8 GB", gpu: "GTX 760" }, { cpu: "Ryzen 5 3600", ram: "16 GB", gpu: "GTX 1660 Ti" }, ""],
  ["Dying Light - The Following EE", "Dying Light: The Following Enhanced Edition", 2016, "Techland", null, "رعب بقاء / عالم مفتوح", "باركور سريع وقتال شرس ضد حشود الزومبي في مدينة حران المنكوبة مع قيادة عربات الباقين.", { cpu: "Core i5-2500", ram: "8 GB", gpu: "GTX 560" }, { cpu: "Core i5-4670K", ram: "8 GB", gpu: "GTX 780" }, ""],
  ["Dynasty Warriors 6", "Dynasty Warriors 6", 2008, "Omega Force", "Koei Tecmo", "أكشن / تقطيع وتذبيح", "حروب الممالك الثلاث الصينية وهزيمة الآلاف من الجنود بضربات خارقة.", { cpu: "Core 2 Duo", ram: "1 GB", vram: "256 MB" }, { cpu: "Core 2 Quad", ram: "2 GB", vram: "512 MB" }, ""],
  ["eldin ring nightreign", "Elden Ring: Nightreign", "2025-2026", "FromSoftware", null, "أكشن وتقمص أدوار / صعبة", "تجربة جماعية ومظلمة جديدة في عالم إلدن رينغ تركز على التعاون ومواجهة زعماء جدد.", { cpu: "Core i5-8400", ram: "12 GB", gpu: "GTX 1060" }, { cpu: "Core i7-10700K", ram: "16 GB", gpu: "RTX 3060" }, ""],
  ["End of Abyss", null, null, null, null, "مغامرات واستكشاف", "رحلة استكشاف ومتاهات مظلمة في أعماق البحار والمواقع الغامضة.", null, { cpu: "Core i3", ram: "4 GB" }, "p"],
  ["Entoria The Last Song", "Entoria: The Last Song", 2019, "Taboo Games", null, "مغامرات / ألغاز", "فتاة صغيرة تستخدم آلة موسيقية سحرية لإنقاذ عالمها وحل الألغاز المعقدة.", { cpu: "Core i3", ram: "4 GB", vram: "1 GB" }, { cpu: "Core i5", ram: "8 GB", vram: "2 GB" }, ""],
  ["Expedition 33", "Clair Obscur: Expedition 33", 2025, "Sandfall Interactive", null, "تقمص أدوار تبادل الأدوار", "رحلة خيالية مذهلة لمنع «الرسمة» من محو البشرية كل عام في قصة درامية عميقة.", { cpu: "Core i5-8400", ram: "16 GB", gpu: "GTX 1060" }, { cpu: "Core i7-10700", ram: "16 GB", gpu: "RTX 3060" }, ""],
  ["F.E.A.R. Platinum Collection", "F.E.A.R.", 2005, "Monolith Productions", "Vivendi Games", "رعب / منظور أول", "تحقيق عسكري مرعب في ظاهرة فتاة خارقة وغامضة وتصويب سريع ببطء حركة.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["Fast & Furious Showdown", "Fast & Furious Showdown", 2013, "Firebrand Games", null, "سباقات وأكشن", "مطاردات سيارات سريعة مستوحاة من أحداث أفلام السرعة الشهيرة.", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "GeForce 8800" }, { cpu: "Core i3", ram: "4 GB", gpu: "GTX 460" }, ""],
  ["Fifa 2013", "FIFA 13", 2012, "EA Sports", "Electronic Arts", "رياضي / كرة قدم", "الإصدار الكلاسيكي الشهير لكرة القدم مع نظام التحكم بالكرة المطور.", { cpu: "Core 2 Duo 2.4 GHz", ram: "2 GB", vram: "512 MB" }, { cpu: "Core i3", ram: "4 GB", vram: "1 GB" }, ""],
  ["FIFA 2018", "FIFA 18", 2017, "EA Sports", "Electronic Arts", "رياضي / كرة قدم", "تجربة مباريات كرة القدم مع قصة اللاعب ألكسندر هانتر في وضع الرحلة.", { cpu: "i3-6300T", ram: "8 GB", gpu: "GTX 660" }, { cpu: "i3-6300T", ram: "8 GB", gpu: "NVIDIA GeForce GTX 670" }, ""],
  ["Fifa 26  {HV}", "EA Sports FC 26", 2026, "EA Sports", "Electronic Arts", "رياضي / كرة قدم", "أحدث إصدارات كرة القدم بفرق وملاعب وتحديثات انتقالات موسمية جديدة.", { cpu: "Core i5-6600", ram: "12 GB", gpu: "GTX 1050 Ti" }, { cpu: "Core i7-6700", ram: "16 GB", gpu: "GTX 1660" }, ""],
  ["FNAF-Into-the-Pit", "Five Nights at Freddy's: Into the Pit", 2024, "Mega Cat Studios", "Scott Cawthon", "رعب / مغامرات مستقلة", "قصة رعب كلاسيكية تعتمد على الهروب من الأرنب الشرير في مطعم بيتزا قديم.", { ram: "4 GB" }, { cpu: "Core i5", ram: "8 GB", vram: "2 GB" }, ""],
  ["Forza Motorsport 7 2017", "Forza Motorsport 7", 2017, "Turn 10 Studios", "Microsoft", "سباقات سيارات احترافية", "سباقات مضامير حقيقية تضم مئات السيارات وظروف طقس متغيرة.", { cpu: "i5-750", ram: "8 GB", gpu: "GTX 650 Ti" }, { cpu: "i5-4460", ram: "8 GB", gpu: "GTX 670" }, ""],
  ["Generals-Zero Hour - Last Stand", "Command & Conquer: Generals - Zero Hour", 2003, "EA Los Angeles", "Electronic Arts", "استراتيجية في الوقت الفعلي", "معارك عسكرية استراتيجية كلاسيكية بقوات وأسلحة مطورة حديثة.", null, { ram: "1 GB" }, "المواصفات موصوفة بأنها خفيفة جداً"],
  ["Ghost Of Recon", null, null, null, null, null, null, null, null, "p"],
  ["God of War - Ghost of Sparta", "God of War: Ghost of Sparta", 2010, "Ready at Dawn", "Sony", "أكشن ومغامرات / تقطيع وتذبيح", "رحلة كريتوس الأسطورية لكشف أسرار ماضيه وعائلته بأرض إسبرطة.", null, { cpu: "معالج متوسط", ram: "4 GB" }, "e"],
  ["GodOfWar", "God of War", 2022, "Santa Monica Studio", "Sony", "أكشن ومغامرات / تقمص أدوار", "رحلة كريتوس وابنه أتريوس في الأراضي النورسية ومواجهة آلهة الشمال.", { cpu: "i5-2500K", ram: "8 GB", gpu: "GTX 960" }, { cpu: "i5-6600K", ram: "8 GB", gpu: "GTX 1060" }, ""],
  ["Grand Theft Auto V Enhanched Edition", "Grand Theft Auto V Enhanced", 2022, "Rockstar North", "Rockstar Games", "عالم مفتوح / أكشن", "مغامرة ثلاثية الشخصيات (مايكل، فرانكلين، تريفور) في مدينة لوس سانتوس مع رسومات محسنة.", { cpu: "Core i5-3470", ram: "8 GB", gpu: "GTX 660" }, { cpu: "Core i5-8400", ram: "16 GB", gpu: "GTX 1060" }, ""],
  ["GTA - The Original Trilogy", "Grand Theft Auto: The Original Trilogy", "2001-2004", "Rockstar Games", null, "عالم مفتوح / أكشن", "النسخ الأصلية الكلاسيكية (III, Vice City, San Andreas).", null, null, "المواصفات موصوفة بأنها تعمل على أضعف الأجهزة"],
  ["gta vice city", "Grand Theft Auto: Vice City", 2002, "Rockstar North", "Rockstar Games", "عالم مفتوح / أكشن", "قصة تومي فيرسيتي في مدينة ميامي الثمانينيات وسيطرته على تجارة الجريمة.", null, null, "المواصفات موصوفة بأنها تعمل على أي جهاز"],
  ["GTA VICE CITY NEXT GEN", "Grand Theft Auto: Vice City Next Gen", null, "فريق تعديل مجتمعي", null, "عالم مفتوح / أكشن", "VICE CITY الكلاسيكية معدلة بالكامل برسومات جيل جديد وتقنيات بصرية حديثة.", null, { cpu: "معالج متوسط", ram: "4 GB", gpu: "كارت اقتصادي" }, "p"],
  ["Half Life Collection", "Half-Life Collection", "1998-2007", "Valve", null, "منظور أول / خيال علمي", "مغامرات العالم غوردون فريمان ومكافحة الفضائيين والمؤامرات.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["Half-Life - Source Quadrilogy", "Half-Life: Source Quadrilogy", 2004, "Valve", null, "منظور أول / خيال علمي", "أجزاء هاف لايف الكلاسيكية المعاد تطويرها بمحرك Source.", null, null, "المواصفات موصوفة بأنها ضعيفة جداً"],
  ["Ice Age 3", "Ice Age 3: Dawn of the Dinosaurs", 2009, "Eurocom", null, "مغامرات / عائلي", "مغامرة ممتعة مع شخصيات العصر الحجري في عالم الديناصورات.", { cpu: "Pentium D", ram: "1 GB", gpu: "GeForce 6800" }, { cpu: "Core 2 Duo", ram: "2 GB", gpu: "GeForce 8800" }, ""],
  ["IGI", "Project I.G.I.", 2000, "Innerloop Studios", "Eidos Interactive", "تسلل وتصويب عسكري", "العميل ديفيد جونز في مهمات خطيرة لإنقاذ العالم.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["IGI2", "Project I.G.I. 2: Covert Strike", 2003, "Innerloop Studios", "Codemasters", "تسلل وتصويب عسكري", "استكمال مغامرات ديفيد جونز في مهام تجسس عالمية ومعقدة.", null, null, "المواصفات موصوفة بأنها تعمل على أي جهاز"],
  ["James Cameron`s Avatar - The Game", "James Cameron's Avatar - The Game", 2009, "Ubisoft Montreal", "Ubisoft", "أكشن / خيال علمي", "استكشاف كوكب باندورا والانضمام لصراع البشر ضد شعب النافي.", { cpu: "Core 2 Duo 3.0 GHz", ram: "2 GB", gpu: "GeForce 6800" }, { cpu: "Quad Core", ram: "4 GB", gpu: "GeForce GTX 260" }, ""],
  ["JoJos Bizarre Adventure All Star Battle R", "JoJo's Bizarre Adventure: All Star Battle R", 2022, "CyberConnect2", null, "قتال أركيدي", "لعبة قتال تضم جميع شخصيات أنمي جوجو بأسلوب فني مذهل وحركات خارقة.", { cpu: "i5-4460", ram: "8 GB", gpu: "GTX 960" }, { cpu: "i7-6700", ram: "16 GB", gpu: "GTX 1060" }, ""],
  ["keeper  25GB_1", "Keeper", 2021, "استوديو مستقل", null, "رعب نفسي / مغامرات", "رحلة استكشاف مرعبة وأسرار غامضة في بيئات مظلمة.", { cpu: "Core i3", ram: "8 GB", gpu: "GTX 960" }, { cpu: "Core i5", ram: "16 GB", gpu: "GTX 1060" }, "p"],
  ["LA Noire -", "L.A. Noire", 2011, "Team Bondi", null, "تحقيق / جريمة / عالم مفتوح", "المحقق كول فيلبس يحقق في جرائم قتل وغش في لوس أنجلوس بخمسينيات القرن العشرين.", { cpu: "Dual Core 2.2 GHz", ram: "2 GB", gpu: "GeForce 8600 GT" }, { cpu: "Quad Core 3.2 GHz", ram: "6 GB", gpu: "GeForce GTX 580" }, ""],
  ["Lantern", "Lantern", 2016, "Storm in a Teacup", null, "مغامرات / استرخاء", "إعادة إحياء الألوان لعالم مظلم باستخدام فانوس سحري في رحلة هادئة وبصرية فريدة.", { cpu: "Core 2 Duo", ram: "4 GB", vram: "1 GB" }, { cpu: "Core i3", ram: "8 GB", vram: "2 GB" }, ""],
  ["Layers of Fear 2023", "Layers of Fear", 2023, "Bloober Team", null, "رعب نفسي", "رسام مجنون يحاول إنهاء تحفته الفنية الأخيرة وسط أطياف وهلوسات مرعبة داخل قصره.", { cpu: "Core i5-4690", ram: "16 GB", gpu: "GTX 1060" }, { cpu: "Core i7-6700K", ram: "16 GB", gpu: "RTX 2070" }, ""],
  ["lego horizon", "LEGO Horizon Adventures", 2024, "Guerrilla Games / Studio Gobo", null, "أكشن ومغامرات / ليغو", "مغامرة كوميدية وممتعة لشخصيات ليغو في عالم هورايزون الآلي.", { cpu: "Core i5-8400", ram: "16 GB", gpu: "GTX 1060" }, { cpu: "Core i7-10700", ram: "16 GB", gpu: "RTX 3060" }, ""],
  ["little nghtmare 3", "Little Nightmares III", "2025-2026", "Supermassive Games", null, "رعب / منصات وألغاز", "مغامرة تعاونية مرعبة لشخصيتين تحاولان الهرب من عالم مشوه ومخيف.", { cpu: "Core i5-8400", ram: "12 GB", gpu: "GTX 1060" }, { cpu: "Core i7-10700", ram: "16 GB", gpu: "RTX 3060" }, ""],
  ["Little Nightmares II Enhanced Edition", "Little Nightmares II", 2021, "Tarsier Studios", null, "رعب / منصات وألغاز", "الطفل مونو وكسوي في رحلة مرعبة للهروب من مدينة شوّهتها إشارات تلفزيونية غامضة.", { cpu: "Core i5-2300", ram: "4 GB", gpu: "GTX 570" }, { cpu: "Core i7-3770", ram: "8 GB", gpu: "GTX 760" }, ""],
  ["Man of Medan [21.1GB]_3", "The Dark Pictures Anthology: Man of Medan", 2019, "Supermassive Games", null, "رعب سينمائي تفاعلي", "مجموعة شباب محاصرين في سفينة أشباح تابعة للحرب العالمية الثانية وتتأثر قراراتهم بمصيرهم.", { cpu: "Core i5-3570K", ram: "8 GB", gpu: "GTX 660" }, { cpu: "Core i5-8400", ram: "8 GB", gpu: "GTX 1060" }, ""],
  ["Mario vs. Donkey Kong", "Mario vs. Donkey Kong", 2024, "Nintendo", "Nintendo", "منصات / ألغاز", "ماريو يلاحق دونكي كونغ لاستعادة ألعاب ميني ماريو المسروقة عبر ألغاز ذكية.", null, { cpu: "معالج متوسط", ram: "8 GB" }, "e"],
  ["Marvel - Ultimate Alliance Bundle 2016  7.39GB_1", "Marvel: Ultimate Alliance", 2006, "Activision", "Activision", "أكشن / تقمص أدوار", "تجميعة أبطال مارفيل الخارقين لإنقاذ الكون من تهديد الأشرار بتشكيل فرق من 4 أبطال.", { cpu: "Intel Core i3", ram: "4 GB", gpu: "GTX 550 Ti" }, { cpu: "Intel Core i5", ram: "8 GB", gpu: "GTX 750 Ti" }, "السنة في العنوان 2016 تاريخ الحزمة؛ اللعبة 2006"],
  ["Marvels Avengers Full unlocked  87GB_3", "Marvel's Avengers", 2020, "Crystal Dynamics", "Square Enix", "أكشن ومغامرات", "قصة إعادة تجمع فريق الأفينجرز ومواجهة منظمة A.I.M الشريرة.", { cpu: "i3-8100", ram: "8 GB", gpu: "GTX 950" }, { cpu: "i7-4770K", ram: "16 GB", gpu: "GTX 1060" }, ""],
  ["Marvels Guardians of the Galaxy [14.5GB]_4", "Marvel's Guardians of the Galaxy", 2021, "Eidos-Montréal", "Square Enix", "أكشن ومغامرات / خيال علمي", "مغامرة فضائية سينمائية تقود فيها شخصية ستار لورد وفريقه لإنقاذ المجرة وسط موسيقى صاخبة.", { cpu: "Core i5-4460", ram: "8 GB", gpu: "GTX 1060" }, { cpu: "Core i7-4790", ram: "16 GB", gpu: "GTX 1660 Super" }, ""],
  ["Medal of Honor Airborne", "Medal of Honor: Airborne", 2007, "EA Los Angeles", "Electronic Arts", "منظور أول / حرب عالمية", "معارك شرسة وإنزال مظلي خلف خطوط العدو خلال الحرب العالمية الثانية.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["Medal of Honor Pacific Assault  3.53GB_1", "Medal of Honor: Pacific Assault", 2004, "EA Los Angeles", "Electronic Arts", "منظور أول / حرب عالمية", "معارك شرسة وإنزال مظلي خلف خطوط العدو خلال الحرب العالمية الثانية.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["METAL GEAR SOLID DELTA  63gb_1", "Metal Gear Solid Delta: Snake Eater", 2025, "Konami / Virtuos", "Konami", "تسلل / أكشن", "ريمك كامل لأسطورة التجسس الكلاسيكية بأعلى معايير الرسومات والواقعية.", { cpu: "Core i7-8700", ram: "16 GB", gpu: "GTX 1060" }, { cpu: "Core i7-10700K", ram: "16 GB", gpu: "RTX 2070 Super" }, ""],
  ["Middle-Earth - Shadow of Mordor - GOTY Edition", "Middle-earth: Shadow of Mordor", 2014, "Monolith Productions", "Warner Bros", "أكشن وتقمص أدوار / عالم مفتوح", "رحلة الحارس تاليون وعلامة الانتقام في أرض مورودور ونظام النيميسيس.", { cpu: "Core i5-750", ram: "4 GB", gpu: "GeForce GTX 460" }, { cpu: "Core i7-3770", ram: "8 GB", gpu: "GeForce GTX 660" }, ""],
  ["Mortal Kombat XL", "Mortal Kombat XL", 2016, "NetherRealm Studios", "Warner Bros", "قتال دموي", "أشهر ألعاب القتال الدموية مع شخصيات ضيفة مرعبة وحركات الفطالتي.", { cpu: "Intel Core i5-750", ram: "3 GB", gpu: "GeForce GTX 460" }, { cpu: "Intel Core i7-3770", ram: "8 GB", gpu: "GeForce GTX 660" }, ""],
  ["NARUTO SHIPPUDEN - UNS 4", "Naruto Shippuden: Ultimate Ninja Storm 4", 2016, "CyberConnect2", "Bandai Namco", "قتال / أنمي", "الحرب العالمية النينجا الكبرى والمعارك الخارقة الأخيرة لناروتو وساسكي.", { cpu: "Core i3-530", ram: "2 GB", vram: "512 MB" }, { cpu: "Core i3-8100", ram: "4 GB", gpu: "GTX 660" }, ""],
  ["NODE - The Last Favor of the Antarii", null, null, null, null, "مغامرات / خيال علمي", "رحلة استكشاف وكشف مصير الحضارات السابقة في كوكب فضائي غامض.", null, { cpu: "معالج متوسط", ram: "4 GB", vram: "1 GB" }, "p"],
  ["pes 6", "Pro Evolution Soccer 6", 2006, "Konami", "Konami", "رياضي / كرة قدم", "إصدار كلاسيكي من سلسلة Pro Evolution Soccer يتميز بثلاثة أبعاد وهواميل جريءة.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["pes 10", "Pro Evolution Soccer 2010", 2009, "Konami", "Konami", "رياضي / كرة قدم", "سلسلة ألعاب كرة القدم الكلاسيكية وتطورها الأسطوري عبر السنوات.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["pes 13", "Pro Evolution Soccer 2013", 2012, "Konami", "Konami", "رياضي / كرة قدم", "سلسلة ألعاب كرة القدم الكلاسيكية وتطورها الأسطوري عبر السنوات.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["PES 15", "Pro Evolution Soccer 2015", 2014, "Konami", "Konami", "رياضي / كرة قدم", "سلسلة ألعاب كرة القدم الكلاسيكية وتطورها الأسطوري عبر السنوات.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["pes 17", "Pro Evolution Soccer 2017", 2016, "Konami", "Konami", "رياضي / كرة قدم", "سلسلة ألعاب كرة القدم الكلاسيكية وتطورها الأسطوري عبر السنوات.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["pes 18", "Pro Evolution Soccer 2018", 2017, "Konami", "Konami", "رياضي / كرة قدم", "سلسلة ألعاب كرة القدم الكلاسيكية وتطورها الأسطوري عبر السنوات.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["PES 19", "Pro Evolution Soccer 2019", 2018, "Konami", "Konami", "رياضي / كرة قدم", "سلسلة ألعاب كرة القدم الكلاسيكية وتطورها الأسطوري عبر السنوات.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["PES 20", "Pro Evolution Soccer 2020", 2019, "Konami", "Konami", "رياضي / كرة قدم", "سلسلة ألعاب كرة القدم الكلاسيكية وتطورها الأسطوري عبر السنوات.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["PES 21", "eFootball 2021", 2021, "Konami", "Konami", "رياضي / كرة قدم", "سلسلة ألعاب كرة القدم الكلاسيكية وتطورها الأسطوري عبر السنوات.", null, null, "المواصفات موصوفة بأنها تتدرج حسب الإصدار"],
  ["Portal.Collection", "Portal Collection", "2007-2011", "Valve", "Valve", "ألغاز / منظور أول", "استخدام بندقية الثقوب لحل الألغاز المعقدة والهروب من مختبرات Aperture.", { cpu: "Pentium 4 3.0 GHz", ram: "1 GB", vram: "128 MB" }, { cpu: "Core 2 Duo", ram: "2 GB", vram: "512 MB" }, ""],
  ["Prince Of Persia 4", "Prince of Persia: The Two Thrones", 2005, "Ubisoft Montreal", "Ubisoft", "أكشن ومغامرات / منصات", "مغامرات الأمير الأسطورية في تسلق الجدران واستخدام القوى السحرية.", { cpu: "Core 2 Duo", ram: "1 GB", gpu: "GeForce 6800" }, { cpu: "Core 2 Quad", ram: "2 GB", gpu: "GeForce 8800 GT" }, "أي جزء بالضبط غير مؤكد"],
  ["Prince of Persia Trilogy", "Prince of Persia Trilogy", "2003-2005", "Ubisoft Montreal", "Ubisoft", "أكشن ومغامرات / منصات", "ثلاثية رمال الزمن الكلاسيكية والتحكم في الوقت وهزيمة قوى الظلام.", null, null, "المواصفات موصوفة بأنها ضعيفة جداً"],
  ["Prototype1 5.06 GB_1", "Prototype", 2009, "Radical Entertainment", "Activision", "أكشن / عالم مفتوح", "بطل خارق بدم فاسد وقدرات مرعبة لتغيير الشكل وتشكيل الأسلحة بمدينة نيويورك.", { cpu: "Core 2 Duo 2.6 GHz", ram: "2 GB", gpu: "GeForce 8800 GT" }, { cpu: "Quad Core", ram: "4 GB", gpu: "GeForce GTX 260" }, ""],
  ["Race Driver GRID", "Race Driver: GRID", 2008, "Codemasters", null, "سباقات سيارات", "سباقات سيارات احترافية ومضامير عالمية مع نظام تحطم واقعي وممتع.", { cpu: "Pentium D", ram: "1 GB", vram: "256 MB" }, { cpu: "Core 2 Duo", ram: "2 GB", vram: "512 MB" }, ""],
  ["Red Alert 2", "Command & Conquer: Red Alert 2", 2000, "Westwood Studios", "Electronic Arts", "استراتيجية في الوقت الفعلي", "الحرب الباردة البديلة الكلاسيكية بين الحلفاء والسوفيتي والتقنيات العسكرية الخيالية.", null, null, "المواصفات موصوفة بأنها خفيفة جداً"],
  ["Resident Evil Zero - HD Remaster", "Resident Evil Zero", 2016, "Capcom", "Capcom", "رعب بقاء", "قصة ريبيكا تشامبرز وعميل سري داخل قطار مرعب ومختبرات أمبريلا السرية.", { cpu: "Core 2 Duo 2.4 GHz", ram: "2 GB", gpu: "GTX 260" }, { cpu: "Core i3", ram: "4 GB", gpu: "GTX 560" }, ""],
  ["rock of age 3", "Rock of Ages 3: Make & Break", 2020, "ACE Team", null, "برج دفاع / أركيد كوميدي", "التحكم بصخرة عملاقة تدمر كل ما تحطمه في طريقها بأسلوب كوميدي وتاريخي ساخر.", { cpu: "Intel Core i3", ram: "4 GB", gpu: "GTX 660" }, { cpu: "Intel Core i5", ram: "8 GB", gpu: "GTX 970" }, ""],
  ["Shank 1 [2010]", "Shank", 2010, "Klei Entertainment", null, "أكشن ثنائي الأبعاد", "لعبة أكشن دموية وعنيفة تدور قصتها حول الانتقام واستخدام الأسلحة النارية والسكاكين.", { cpu: "Intel Pentium 4", ram: "1.5 GB", vram: "256 MB" }, { cpu: "Intel Core 2 Duo", ram: "2 GB", vram: "512 MB" }, ""],
  ["Silent Hill 2 Remake", "Silent Hill 2 Remake", 2024, "Bloober Team", "Konami", "رعب نفسي", "جيمس سندرلاند يتلقى رسالة من زوجته المتوفاة ويذهب لمدينة سايلنت هيل في كابوس مرعب.", { cpu: "Core i5-8400", ram: "16 GB", gpu: "GTX 1080" }, { cpu: "Core i7-8700K", ram: "16 GB", gpu: "RTX 2080" }, ""],
  ["Silent Hill Downpour PC", "Silent Hill: Downpour", 2012, "Vatra Games", null, "رعب بقاء", "السجين ميرفي بيندلتون يجد نفسه ضائعاً في مدينة سايلنت هيل الضبابية بعد تحطم عربة السجن.", null, { cpu: "مواصفات متوسطة للمحاكي" }, "e"],
  ["SILENT.HILL.3", "Silent Hill 3", 2003, "Konami", "Konami", "رعب نفسي", "الفتاة هيذر ماسون وتورطها في كابوس مظلم وغموض طائفة دينية مرعبة.", { cpu: "Pentium 4", ram: "512 MB", vram: "64 MB" }, null, ""],
  ["Silent.Hill.4.New.Edition", "Silent Hill 4: The Room", 2004, "Konami", "Konami", "رعب نفسي", "هنري تاونسيند المحبوس بداخل شقته رقم 302 والحفرة في الحمام تقوده لعوالم كابوسية.", { cpu: "1.5 GHz", ram: "512 MB", vram: "64 MB" }, null, ""],
  ["silient hill f", "Silent Hill f", null, "Neobards Entertainment", null, "رعب نفسي", "جزء جديد كلياً تدور أحداثه في اليابان الريفية بفترة الستينيات وسط أجواء مرعبة وغامضة.", { cpu: "Core i5-8400", ram: "16 GB", gpu: "GTX 1060" }, { cpu: "Core i7-10700", ram: "16 GB", gpu: "RTX 3060" }, ""],
  ["Sim Supermarket Security 2023", "Supermarket Security Simulator", 2023, "استوديو مستقل", null, "محاكاة / إدارة أمن", "مراقبة كاميرات المتجر القبض على اللصوص ومنع السرقات بمتجر تسوق.", { cpu: "Core i3", ram: "4 GB" }, { cpu: "Core i5", ram: "8 GB", gpu: "GTX 960" }, "p"],
  ["Slender - The Arrival remake", "Slender: The Arrival", 2013, "Blue Isle Studios", null, "رعب بقاء", "البحث عن المفقودين في غابات مظلمة ومنازل مهجورة مع ملاحقة الكائن المرعب سلندرمان.", { cpu: "Dual Core", ram: "2 GB", vram: "512 MB" }, { cpu: "Quad Core", ram: "4 GB", gpu: "GTX 560" }, ""],
  ["Sniper Ghost Warior 3", "Sniper Ghost Warrior 3", 2017, "CI Games", null, "تصويب وقنص عسكري", "قصة قنص أمريكي في جورجيا لتنفيذ مهام خلف خطوط العدو واستخدام التسلل والبيئة المفتوحة.", { cpu: "i3-6100", ram: "8 GB", gpu: "GTX 660" }, { cpu: "i7-4790", ram: "16 GB", gpu: "GTX 1060" }, ""],
  ["Sonic.And.All.Stars.Racing", "Sonic & All-Stars Racing Transformed", 2012, "Sumo Digital", null, "سباقات أركيدية", "سباقات سيارات وقوارب وطائرات ممتعة تضم شخصيات سيجا في مسارات تتحول أثناء السباق.", { cpu: "Intel Core 2 Duo", ram: "2 GB", gpu: "GeForce 8800" }, { cpu: "Intel Core i5", ram: "4 GB", gpu: "GeForce GTX 460" }, ""],
  ["Sonic Heroes", "Sonic Heroes", 2003, "SEGA", "SEGA", "منصات / سرعة وأكشن", "مغامرات القنفذ سونيك السريعة في عوالم ثلاثية الأبعاد وتحولات مرعبة بالليل.", null, null, "المواصفات موصوفة بأنها تعمل على الأجهزة القديمة"],
  ["Sonic Unleashed", "Sonic Unleashed", 2008, "SEGA", "SEGA", "منصات / سرعة وأكشن", "مغامرات القنفذ سونيك السريعة في عوالم ثلاثية الأبعاد.", null, null, "المواصفات موصوفة بأنها عبر محاكي"],
  ["Space Marine 2", "Warhammer 40,000: Space Marine 2", 2024, "Saber Interactive", "THQ", "أكشن / تقطيع وتذبيح", "جندي فضائي خارق في حروب طاحنة لمواجهة حشود هائلة من كائنات التايرايد المرعبة.", { cpu: "Ryzen 5 2600", ram: "8 GB", gpu: "GTX 1060" }, { cpu: "Ryzen 7 5800X", ram: "16 GB", gpu: "RTX 3070" }, ""],
  ["Spec.Ops-The.Line", "Spec Ops: The Line", 2012, "Yager Development", null, "منظور ثالث / إثارة عسكرية", "الكابتن مارتن ووكر في مهام إنقاذ بمدينة دبي المدمرة والمدفونة تحت العواصف الرملية.", { cpu: "Core 2 Duo 2 GHz", ram: "2 GB", gpu: "GeForce 8600" }, { cpu: "Quad Core 2.4 GHz", ram: "3 GB", gpu: "GeForce GTX 260" }, ""],
  ["Splinter Cell Blacklist", "Tom Clancy's Splinter Cell: Blacklist", 2013, "Ubisoft", "Ubisoft", "تسلل وتجسس عسكري", "العميل السري سام فيشر في مهام استخباراتية وظلال داكنة لإحباط عمليات إرهابية.", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "GeForce 8800" }, { cpu: "Core i5", ram: "4 GB", gpu: "GTX 560" }, ""],
  ["Splinter Cell Conviction", "Tom Clancy's Splinter Cell: Conviction", 2010, "Ubisoft", "Ubisoft", "تسلل وتجسس عسكري", "العميل السري سام فيشر في مهام استخباراتية وظلال داكنة لإحباط عمليات إرهابية.", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "GeForce 8800" }, { cpu: "Core i5", ram: "4 GB", gpu: "GTX 560" }, ""],
  ["Splinter Cell® Double Agent", "Tom Clancy's Splinter Cell: Double Agent", 2006, "Ubisoft", "Ubisoft", "تسلل وتجسس عسكري", "العميل السري سام فيشر في مهام استخباراتية وظلال داكنة لإحباط عمليات إرهابية.", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "GeForce 8800" }, { cpu: "Core i5", ram: "4 GB", gpu: "GTX 560" }, ""],
  ["Stalker Anomaly", "S.T.A.L.K.E.R.: Anomaly", 2019, "فريق مجتمعي (Community Mod)", null, "رعب بقاء / عالم مفتوح", "تجربة بقاء واستكشاف صعبة ومرعبة في منطقة تشيرنوبيل المحظورة والمملوءة بالإشعاعات.", { cpu: "Core i3", ram: "8 GB", gpu: "GTX 660" }, { cpu: "Core i5", ram: "16 GB", gpu: "GTX 1060" }, ""],
  ["Stalker Shadow of Chernobyl -", "S.T.A.L.K.E.R.: Shadow of Chernobyl", 2007, "GSC Game World", null, "رعب بقاء / منظور أول", "استكشاف منطقة تشيرنوبيل والمخلوقات المتحولة وجمع الآثار الغامضة.", { cpu: "Pentium 4 2.0 GHz", ram: "512 MB", vram: "128 MB" }, { cpu: "Core 2 Duo", ram: "2 GB", vram: "512 MB" }, ""],
  ["State of Decay Year One Survival", "State of Decay: Year-One Survival Edition", 2015, "Undead Labs", "Microsoft", "رعب بقاء / بناء قواعد", "جمع الناجين وبناء الملاجئ وحصن الحماية والدفاع في عالم ممتلئ بالزومبي.", { cpu: "Intel Core i5", ram: "2 GB", gpu: "GeForce GTX 470" }, { cpu: "Intel Core i5", ram: "8 GB", gpu: "GeForce GTX 660" }, ""],
  ["Stray Souls", "Stray Souls", 2023, "Jukai Studio", null, "رعب نفسي", "مغامرة لفتاة تواجه أسراراً مظلمة وكيانات شريرة في بلدة غريبة.", { cpu: "Core i5-4670K", ram: "8 GB", gpu: "GTX 960" }, { cpu: "Core i7-6700K", ram: "16 GB", gpu: "GTX 1080" }, ""],
  ["Street Fighter V - Champion Edition", "Street Fighter V", 2016, "Capcom", "Capcom", "قتال", "أشهر ألعاب القتال الثنائية مع قائمة مقاتلين ضخمة وحركات خارقة وحماسية.", { cpu: "Core i3-4160", ram: "6 GB", gpu: "GTX 480" }, { cpu: "Core i5-4690K", ram: "8 GB", gpu: "GTX 960" }, ""],
  ["System Shock Remake", "System Shock Remake", 2023, "Nightdive Studios", null, "رعب / منظور أول / خيال علمي", "مواجهة الكمبيوتر الشرير SHODAN على متن محطة فضائية معزولة ومهجورة.", { cpu: "Core i5-2400", ram: "8 GB", gpu: "GTX 670" }, { cpu: "Core i7-3770", ram: "16 GB", gpu: "GTX 1660" }, ""],
  ["The Amazing Spid  er Man 1", "The Amazing Spider-Man", 2012, "Beenox", "Activision", "أكشن ومغامرات / عالم مفتوح", "التأرجح في مانهاتن ومطاردة المسوخ والعلماء الأشرار بعد أحداث الفيلم.", { cpu: "Core 2 Duo 2.6 GHz", ram: "3 GB", gpu: "GeForce 8800 GT" }, { cpu: "Quad Core 2.4 GHz", ram: "4 GB", gpu: "GeForce GTX 560" }, ""],
  ["The Crew  13.9GB_1", "The Crew", 2014, "Ivory Tower", "Ubisoft", "سباقات سيارات / عالم مفتوح", "سباقات سيارات ضخمة تغطي كامل خريطة الولايات المتحدة الأمريكية ببيئة واسعة.", { cpu: "Core 2 Quad Q9300", ram: "4 GB", gpu: "GeForce GTX 260" }, { cpu: "Core i5-750", ram: "8 GB", gpu: "GeForce GTX 580" }, ""],
  ["The Crew unlimited", "The Crew Unlimited", null, "فريق تعديل مجتمعي", null, "سباقات عالم مفتوح", "نسخة مفتوحة ومعدلة للعبة السابقة لاستمرار اللعب الجماعي والسباقات الطويلة.", null, { cpu: "Core i5", ram: "8 GB", gpu: "GTX 760" }, "p"],
  ["The Elder Scrolls oblivian REMAKE  108GB_1", "The Elder Scrolls IV: Oblivion (Skyblivion)", "2006", "فريق تعديل مجتمعي", null, "تقمص أدوار / عالم مفتوح", "إعادة إحياء أوبليفيون بالكامل داخل محرك سكايريم الحديث لاستكشاف سيروديل.", null, null, "p"],
  ["The Exit", "The Exit 8", 2023, "Kakehashi Games", null, "رعب نفسي / ألغاز", "محاصرة في ممر مترو تحت الأرض ويجب ملاحظة أي شذوذ غريب للوصول للمخرج 8.", { cpu: "Core i5", ram: "8 GB", gpu: "GTX 970" }, { cpu: "Core i7", ram: "16 GB", gpu: "GTX 1060" }, ""],
  ["The Legend Of Korra", "The Legend Of Korra", 2014, "PlatinumGames", null, "أكشن ومغامرات", "لعبة أكشن مقتبسة من المسلسل الكرتوني أسطورة كورا للتحكم بالعناصر الأربعة وهزيمة الأعداء.", { cpu: "Core 2 Duo 2.4 GHz", ram: "2 GB", gpu: "8800 GT" }, { cpu: "Core i5", ram: "4 GB", gpu: "GTX 560" }, ""],
  ["The Legend of Zelda - Skyward Sword HD", "The Legend of Zelda: Skyward Sword HD", 2011, "Nintendo", "Nintendo", "أكشن ومغامرات / عالم مفتوح", "مغامرات لينك الأسطورية في إنقاذ مملكة هيرول واستكشاف العوالم السحرية.", null, { cpu: "معالج قوي للمحاكي", ram: "8-16 GB" }, "e"],
  ["The Legend of Zelda Breath of Wild", "The Legend of Zelda: Breath of the Wild", 2017, "Nintendo", "Nintendo", "أكشن ومغامرات / عالم مفتوح", "مغامرات لينك الأسطورية في إنقاذ مملكة هيرول واستكشاف العوالم السحرية.", null, { cpu: "معالج قوي للمحاكي", ram: "8-16 GB" }, "e"],
  ["The Lord of the Rings  Battle for Middle-Earth II", "The Lord of the Rings: Battle for Middle-earth II", 2006, "EA Los Angeles", "Electronic Arts", "استراتيجية في الوقت الفعلي", "قيادة جيوش الخير والشر في معارك ملحمية ضخمة بمتوسط الأرض.", null, null, "المواصفات موصوفة بأنها تعمل على الأجهزة القديمة"],
  ["The Lord of the Rings Battle for Mid Earth", "The Lord of the Rings: Battle for Middle-earth", 2004, "EA Los Angeles", "Electronic Arts", "استراتيجية في الوقت الفعلي", "قيادة جيوش الخير والشر في معارك ملحمية ضخمة بمتوسط الأرض.", null, null, "المواصفات موصوفة بأنها تعمل على الأجهزة القديمة"],
  ["The Punisher", "The Punisher", 2005, "Volition", null, "أكشن وعنف / منظور ثالث", "لعبة أكشن قوية لشخصية فرانك كاسل (المعاقب) والانتقام من العصابات بطرق قاسية.", null, null, "المواصفات موصوفة بأنها تعمل على كل الأجهزة"],
  ["Time Shift", "TimeShift", 2007, "Saber Interactive", null, "منظور أول / تحكم بالزمن", "استخدام بدلة تكنولوجية خاصة للتحكم بالوقت (إبطاء وإيقاف وإرجاع الزمن) لحل الألغاز.", { cpu: "Pentium 4 2.0 GHz", ram: "1 GB", vram: "256 MB" }, { cpu: "Core 2 Duo", ram: "2 GB", gpu: "GeForce 8800" }, ""],
  ["Tomb.Raider 1-2-3 Remastered", "Tomb Raider I-III Remastered", 2024, "Aspyr", null, "مغامرات واستكشاف", "مغامرات لارا كروفت الكلاسيكية لاستكشاف المقابر القديمة وحل الألغاز التاريخية الصعبة.", { cpu: "i3-3225", ram: "4 GB", gpu: "GTX 660" }, { cpu: "i5-4460", ram: "8 GB", gpu: "GTX 970" }, ""],
  ["tomp rider 4-5-6 Remastered", "Tomb Raider IV-VI Remastered", 2024, "Aspyr", null, "مغامرات واستكشاف", "مغامرات لارا كروفت الكلاسيكية لاستكشاف المقابر القديمة وحل الألغاز التاريخية الصعبة.", { cpu: "i3-3225", ram: "4 GB", gpu: "GTX 660" }, { cpu: "i5-4460", ram: "8 GB", gpu: "GTX 970" }, "اسم المجلد مكتوب خطأً؛ غير واضح إن كان Tomb Raider"],
  ["Transformers Rise Of The Dark Spark", "Transformers: Rise of the Dark Spark", 2014, "Edge of Reality", null, "أكشن ومغامرات", "صراع الآليات المتحولة المحولات للحصول على القطعة المظلمة المدمرة.", { cpu: "Core 2 Duo 2.6 GHz", ram: "2 GB", gpu: "GeForce 8800 GT" }, { cpu: "Core i3", ram: "4 GB", gpu: "GTX 660" }, ""],
  ["ultra street fighter", "Ultra Street Fighter IV", 2014, "Capcom", "Capcom", "قتال", "اللعبة الكلاسيكية للقتال الثنائي مع تشكيلة واسعة من المقاتلين والضربات الخارقة.", { cpu: "Intel Core 2 Duo 2.0 GHz", ram: "1 GB", gpu: "GeForce 6600" }, { cpu: "Intel Core 2 Quad 2.6 GHz", ram: "4 GB", gpu: "GeForce 8600" }, ""],
  ["Uncharted - Golden Abyss", "Uncharted: Golden Abyss", 2007, "Naughty Dog", null, "أكشن ومغامرات / سينمائي", "مغامرات ناثان دريك في البحث عن الكنوز والمقابر المفقودة حول العالم.", null, { cpu: "معالج قوي للمحاكي", ram: "8-16 GB" }, "e"],
  ["Uncharted Trilogy", "Uncharted Trilogy", "2007-2012", "Naughty Dog", null, "أكشن ومغامرات / سينمائي", "مغامرات ناثان دريك في البحث عن الكنوز والمقابر المفقودة حول العالم.", null, { cpu: "معالج قوي للمحاكي", ram: "8-16 GB" }, "e"],
  ["Virtua Fighter 5 R.E.V.O", "Virtua Fighter 5 R.E.V.O", 2021, "SEGA", "SEGA", "قتال", "قتال فنون قتالية حقيقية وتقنية عالية ببطولات ومنافسات قوية.", { cpu: "Core i3", ram: "4 GB", gpu: "GTX 750" }, { cpu: "Core i5", ram: "8 GB", gpu: "GTX 960" }, ""],
  ["Wolfenstein II  New Order", "Wolfenstein II: The New Colossus", 2017, "MachineGames", "Bethesda", "منظور أول / أكشن", "بلاسكو فيتز في رحلة تحرير أمريكا من سيطرة النظام النازي المتطور.", { cpu: "i7-3770", ram: "8 GB", gpu: "GTX 770" }, { cpu: "i7-4770", ram: "16 GB", gpu: "GTX 1060" }, ""],
  ["WRC 10", "WRC 10", 2021, "KT Racing", null, "سباقات رالي", "البطولة الرسمية لسباقات الرالي والطرق الوعرة الصعبة في مختلف بلدان العالم.", { cpu: "i5-4690", ram: "8 GB", gpu: "GTX 1060" }, { cpu: "i7-6700K", ram: "16 GB", gpu: "RTX 2060" }, ""],
  ["Yakuza 3 Remastered 2021   8.95GB_1", "Yakuza 3 Remastered", 2021, "Ryu Ga Gotoku Studio", "Sega", "أكشن / تقمص أدوار", "كازوما كيريو يدير ملجأ للأيتام بأوكينا قبل أن تلاحقه صراعات الماضي المظلم.", { cpu: "i5-3470", ram: "4 GB", gpu: "GTX 660" }, { cpu: "i7-6700", ram: "8 GB", gpu: "GTX 1070" }, ""],
  ["Yakuza Like a Dragon - Infinite Wealth 30GB   {HV{", "Yakuza: Like a Dragon - Infinite Wealth", 2024, "Ryu Ga Gotoku Studio", "Sega", "تقمص أدوار", "مغامرة إيتشيبان كاسوجا في شوارع يوكوهاما وهاواي الأمريكية بأسلوب ممتع.", { cpu: "Core i5-7400", ram: "16 GB", gpu: "GTX 1060" }, { cpu: "Core i7-8700", ram: "16 GB", gpu: "RTX 2060" }, ""],
  ["Yakuza Like a Dragon - Ishin [HV]", "Yakuza: Like a Dragon - Ishin!", 2023, "Ryu Ga Gotoku Studio", "Sega", "أكشن وتاريخي", "تدور أحداثها بحقبة باكوماتسو التاريخية باليابان وأبطال ياكوزا بدور ساموراي.", { cpu: "Core i7-4790", ram: "8 GB", gpu: "GTX 960" }, { cpu: "Core i7-6700", ram: "16 GB", gpu: "RTX 2060" }, ""],
  ["Yakuza Like a Dragon Gaiden  {HV]", "Like a Dragon Gaiden: The Man Who Erased His Name", 2023, "Ryu Ga Gotoku Studio", "Sega", "أكشن ومغامرات / قتال شوارع", "قصة كازوما كيريو وعمله تحت اسم مستعار مع وكالة سرية بعد أحداث الجزء السادس.", { cpu: "Core i5-8400", ram: "16 GB", gpu: "GTX 1060" }, { cpu: "Core i7-8700", ram: "16 GB", gpu: "RTX 2060" }, ""],
  ["Yakuza Lost Judgment {HV}", "Lost Judgment", 2022, "Ryu Ga Gotoku Studio", "Sega", "تحقيق / أكشن ومغامرات", "رحلة المحقق تاكايوكي ياجامي في كشف جرائم تنمر وغموض قانوني في شوارع كاموروتشو.", { cpu: "Core i7-6700", ram: "8 GB", gpu: "GTX 1060" }, { cpu: "Core i7-8700", ram: "16 GB", gpu: "RTX 2060" }, ""],
];

(async () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
  const cat = data.categories.find((c) => c.id === "games");
  const file = path.join(ROOT, "details", "games.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const byTitle = new Map(cat.items.map((i) => [i.title, i]));

  let written = 0;
  let flagged = 0;
  let missing = 0;

  for (const [folder, canonical, year, developer, publisher, genre, summary, min, rec, flag] of DATA) {
    const item = byTitle.get(folder);
    if (!item) {
      console.log(`  no folder named "${folder}"`);
      missing++;
      continue;
    }

    const requirements =
      min || rec
        ? { minimum: min || null, recommended: rec || null }
        : null;

    const existing = parsed.items[item.id];
    const record = {
      title: folder,
      canonicalTitle: canonical || null,
      type: "game",
      releaseDate: year === null || year === undefined ? null : String(year),
      developer: developer || null,
      publisher: publisher || null,
      platforms: ["PC"],
      genres: genre ? [genre] : null,
      summaryAr: summary || null,
      requirements,
      needsRequirements: !requirements,
      needsSummary: !summary,
      confidence: flag ? "low" : "medium",
      extra: { factsSource: "بحث يدوي" },
    };

    if (flag === "p") {
      record.needsReview = true;
      record.extra.reviewNote = "البيانات جزئية أو وصفها عام — تحتاج مراجعة";
    }
    if (flag === "e") {
      record.needsReview = true;
      record.extra.reviewNote = "لا توجد نسخة حاسب رسمية؛ المواصفات تخص محاكي المنصة الأصلية";
    }
    if (flag && flag !== "p" && flag !== "e") {
      record.extra.note = flag;
      flagged++;
    }

    if (existing) {
      // Keep an existing summary or richer text; take the new facts.
      existing.canonicalTitle = record.canonicalTitle || existing.canonicalTitle;
      if (!existing.releaseDate) existing.releaseDate = record.releaseDate;
      if (!existing.developer) existing.developer = record.developer;
      if (!existing.publisher) existing.publisher = record.publisher;
      if (!existing.genres) existing.genres = record.genres;
      if (!existing.summaryAr && !existing.summaryEn) existing.summaryAr = record.summaryAr;
      if (!existing.requirements && requirements) {
        existing.requirements = requirements;
        existing.needsRequirements = false;
      }
      if (flag === "p" || flag === "e") {
        existing.needsReview = true;
        existing.extra = { ...(existing.extra || {}), reviewNote: record.extra.reviewNote };
      }
      existing.extra = { ...(existing.extra || {}), factsSource: "بحث يدوي" };
    } else {
      parsed.items[item.id] = record;
    }
    written++;
  }

  if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
  console.log(
    `\n${written} written, ${flagged} noted, ${missing} folder names not found. ${DRY ? "(dry run)" : ""}`,
  );
})();