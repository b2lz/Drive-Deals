const fs = require('fs');
const path = require('path');

const targetFile = 'details/foreign-film-series.json';
const jsonPath = path.resolve(__dirname, '..', targetFile);
const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 21 عنصر بالعامية المصرية الطبيعية بدون حرق، جملة أو جملتين
const updates = {
  "foreign-film-series/Siccin_1.jpg":
    "سلسلة أفلام رعب تركية مشهورة بتدور حول السحر الأسود والجن وأعمال الدجل اللي بتدمر حياة العائلات بسبب الانتقام والغيرة.",

  "foreign-film-series/The Boy.jpg":
    "مربية أطفال أمريكية بتسافر إنجلترا عشان تشتغل عند عيلة غنية، بس بتتصدم لما تلاقي الطفل اللي هترعاه عبارة عن عروسة خزف مرعبة بيعاملوها كأنها ابنهم بجد.",

  "foreign-film-series/Agent Cody  1+2.jpg":
    "ولد مراهق عادي في المدرسة بيتم تجنيده في السر كعميل مخابرات، وينفذ مهمات سرية خطيرة ومضحكة من غير ما أهله وصحابه يحسوا بحاجة.",

  "foreign-film-series/Charlies Angels.jpg":
    "تلات بنات محترفات وجامدات جداً شغالين لصالح وكالة تحريات خاصة بيديرها راجل غامض، وبينفذوا مهمات خطيرة ومثيرة بأكشن عالي.",

  "foreign-film-series/DEADPOOL COLLECTEON.jpg":
    "مرتزق سابق بيمر بمرض خطير وبيخضع لتجربة سرية بتديه قدرة خارقة على الشفاء بس بتشوه شكله، فيتحول لبطل خارق ساخر بيصفي حساباته بأكشن كوميدي ودموي.",

  "foreign-film-series/G.I. Joe 1 Retaliation_1.jpg":
    "فرقة عسكرية سرية من أعتى المقاتلين بيحاربوا منظمة إرهابية دولية بتحاول تسيطر على العالم بأسلحة تكنولوجية متطورة وفتاكة.",

  "foreign-film-series/JACKEI CHAN COLLECTION_1.jpg":
    "أشهر أفلام أسطورة الكونغ فو والكوميديا جاكي شان، مليانة حركات بهلوانية خطيرة ومواقف طريفة من غير دوبلير.",

  "foreign-film-series/Jet Li Coleection.jpg":
    "مجموعة أفلام الفنون القتالية للنجم العالمي جت لي، بتركّز على مهارات الكونغ فو الصينية السريعة والقتال بالأيدي في أجواء أكشن حماسية.",

  "foreign-film-series/Jim Carrey Collection.jpg":
    "سلسلة الكوميديا الأيقونية لنجم الضحك جيم كاري بأشهر أفلامه زي The Mask وAce Ventura وLiar Liar بمواقفه وتعبيراته المضحكة اللي متتنسيش.",

  "foreign-film-series/Jump Street.jpg":
    "اتنين ظباط شرطة فاشلين بيتكلفوا بمهمة سرية يتنكروا فيها كطلبة مدرسة وجامعة عشان يوقعوا عصابة مخدرات، وسط مواقف كوميدية ومفارقات تفرط من الضحك.",

  "foreign-film-series/K.G.F Chapter 1+2.jpg":
    "ملحمة أكشن هندية ضخمة بترصد صعود شاب يتيم وطموح لحد ما يبقى الحاكم المطلق لمناجم الذهب ويقف في وش كبار العصابات والشرطة.",

  "foreign-film-series/MARVEL Movies.jpg":
    "أضخم عالم سينمائي بيجمع أبطال مارفل الخارقين زي الأفينجرز وIron Man وThor وSpider-Man عشان يدافعوا عن الأرض والكون ضد أقوى الأشرار.",

  "foreign-film-series/Mr BeanThe Ultimate Collection.jpg":
    "المغامرات الكوميدية الصامتة الشهيرة للشخصية الطريفة مستر بين، وتصرفاته الغريبة والمضحكة مع تفاصيل الحياة اليومية.",

  "foreign-film-series/Night at the Museum Collection Bul-ray.jpg":
    "حارس أمن ليلي في متحف تاريخي بيكتشف إن فيه لوحة فرعونية سحرية بتصحي كل التماثيل والمعروضات بالليل، فبيدخل في مغامرات كوميدية مجنونة.",

  "foreign-film-series/Raid 1+2.jpg":
    "فرقة اقتحام من الشرطة بتدخل عمارة محصنة بيسيطر عليها زعيم عصابة خطير، وتتحول المهمة لمعركة بقاء وقتال بالأيدي عنيف وسريع جداً.",

  "foreign-film-series/snowwhite.jpg":
    "أميرة جميلة بتهرب للغابة من مرات أبوها الملكة الشريرة اللي بتغير من جمالها، وتلاقي أمانها في بيت سبعة أقزام طيبين بيحموها.",

  "foreign-film-series/Taken Collection Bulu-ray.jpg":
    "عميل مخابرات سابق ومحترف بيستخدم مهاراته القتالية الصعبة عشان يطارد عصابات خطيرة خطفت بنته ومراته وينتقم منهم واحد ورا التاني.",

  "foreign-film-series/The Expendapels.jpg":
    "فريق من أشرس المرتزقة القدامى بقيادة سيلفستر ستالون بينفذوا عمليات عسكرية انتحارية ومستحيلة للإطاحة بطغاة وتجار سلاح حول العالم.",

  "foreign-film-series/The Maze Runner Collection Bul-ray.jpg":
    "مجموعة مراهقين بيصحوا يلاقوا نفسهم محبوسين جوة متاهة عملاقة بتتحرك كل يوم وبتحرسها كائنات وحشية، فيحاولوا يفكوا لغزها ويهربوا للعالم الخارجي.",

  "foreign-film-series/Transformes.jpg":
    "حرب طاحنة بين روبوتات فضائية متطورة بتتحول لعربيات وآلات على كوكب الأرض، ويتورط معاهم البشر في معركة إنقاذ الكوكب.",

  "foreign-film-series/Van Damme_1.jpg":
    "أشهر أفلام الأكشن والفنون القتالية للنجم فان دام زي Bloodsport وKickboxer المشهورة بالحركات القتالية القوية والركلات الطايرة."
};

let count = 0;
for (const [key, newSummary] of Object.entries(updates)) {
  if (j.items[key]) {
    j.items[key].summaryAr = newSummary;
    count++;
  } else {
    console.warn('Key not found:', key);
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(j, null, 2) + "\n", "utf8");
console.log(`Updated ${count} items in ${targetFile}`);
