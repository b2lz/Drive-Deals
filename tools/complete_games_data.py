import json

with open('details/games.json', 'r', encoding='utf-8') as f:
    games_details = json.load(f)

items = games_details['items']

# 1. Phantom Blade Zero
items['games/Phantom Blade Zero {HV}.jpg'] = {
    'title': 'Phantom Blade Zero {HV}',
    'canonicalTitle': 'Phantom Blade Zero',
    'type': 'game',
    'developer': 'S-Game',
    'publisher': 'S-Game / Cruel Man Studio',
    'releaseDate': '2026',
    'platforms': ['PC', 'PlayStation 5'],
    'genres': ['أكشن وتقمص أدوار', 'سولزلایک', 'فنون قتالية (Kung-Fu Punk)'],
    'modes': ['لاعب واحد'],
    'engine': 'Unreal Engine 5',
    'summaryAr': 'Phantom Blade Zero هي لعبة أكشن وتقمص أدوار ملحمية سريعة الوتيرة بتصميم مستوحى من فنون الدفاع عن النفس الصينية وجماليات الستيمبانك الخيالية المظلمة (Kung-Fu Punk). يتحكم اللاعب في المحارب "سول" (Soul)، وهو قاتل نخبوي خبير تم تلفيق تهمة اغتيال قائد منظمته إليه، وأصيب بجروح قاتلة استدعت علاجه بسحر غامض يبقيه على قيد الحياة لمدة 66 يوماً فقط، ليخوض سباقاً دموياً مع الزمن ومواجهة قوى مظلمة وكشف المؤامرة قبل فوات الأوان.',
    'summaryEn': 'Phantom Blade Zero is a fast-paced action role-playing game developed by S-Game. Set in a dark fantasy universe blending Chinese martial arts with steampunk aesthetics (Kung-Fu Punk), players step into the shoes of Soul, an elite assassin framed for the murder of his leader. Critically wounded, a mystic cure grants him just 66 days to live, launching him into a relentless race against time to uncover the truth and battle formidable foes before his time expires.',
    'requirements': {
        'minimum': {
            'os': 'Windows 10 64-bit',
            'cpu': 'Intel Core i5-8400 أو AMD Ryzen 5 2600',
            'ram': '16 GB',
            'gpu': 'NVIDIA GeForce GTX 1070 (8 GB) أو AMD Radeon RX 5600 XT',
            'directx': 'الإصدار 12',
            'storage': '120 GB SSD مساحة متوفرة'
        },
        'recommended': {
            'os': 'Windows 10 / 11 64-bit',
            'cpu': 'Intel Core i7-10700K أو AMD Ryzen 7 3700X',
            'ram': '16 GB / 32 GB',
            'gpu': 'NVIDIA GeForce RTX 3070 (8 GB) أو AMD Radeon RX 6800 XT',
            'directx': 'الإصدار 12',
            'storage': '120 GB SSD مساحة متوفرة'
        }
    },
    'links': [
        {'label': 'الموقع الرسمي', 'url': 'https://pbzero.s-game.com'},
        {'label': 'PlayStation Store', 'url': 'https://store.playstation.com/concept/10008436'}
    ],
    'confidence': 'high',
    'source': 'official+manual',
    'needsRequirements': False
}

# 2. Call of Duty - MW4
items['games/Call of Duty - MW4.jpg'] = {
    'title': 'Call of Duty - MW4',
    'canonicalTitle': 'Call of Duty: Modern Warfare (MW4)',
    'type': 'game',
    'developer': 'Infinity Ward',
    'publisher': 'Activision',
    'releaseDate': '2019-10-25',
    'platforms': ['PC', 'PlayStation 4', 'Xbox One', 'PlayStation 5', 'Xbox Series X|S'],
    'genres': ['تصويب منظور الشخص الأول (FPS)', 'أكشن وتكتيك عسكري', 'حرب حديثة'],
    'modes': ['لاعب واحد', 'لاعب متعدد', 'عمليات خاصة (Co-op)'],
    'engine': 'IW 8.0',
    'series': 'Call of Duty',
    'summaryAr': 'Call of Duty: Modern Warfare (المعروفة بين اللاعبين كالجزء الرابع من السلسلة MW4 / ريبوت Modern Warfare) هي لعبة تصويب تكتيكية وأكشن حربي من منظور الشخص الأول. تأخذ اللعبة اللاعبين في مهام عسكرية بالغة السرية والواقعية بجانب الكابتن جون برايس وقوات الـ SAS والعملاء الدوليين وقوات التحرير في الشرق الأوسط لمنع نشوب حرب عالمية واسعة النطاق واستعادة شحنات غاز كيميائي خطيرة، وتتميز بمحرك رسومي وصوتي سينمائي فائق الدقة.',
    'summaryEn': 'Call of Duty: Modern Warfare (widely recognized among gamers and repackers as MW4, the reboot of the Modern Warfare series) is a visceral, high-stakes tactical first-person shooter. Players engage in breathtaking covert operations alongside the iconic Captain John Price, SAS operatives, and international forces across Europe and the Middle East to halt a brewing global conflict and recover stolen chemical weapons.',
    'requirements': {
        'minimum': {
            'os': 'Windows 10 64-bit (أحدث تحديث)',
            'cpu': 'Intel Core i3-4340 أو AMD FX-6300',
            'ram': '8 GB',
            'gpu': 'NVIDIA GeForce GTX 670 / GTX 1650 أو AMD Radeon HD 7950',
            'vram': '2 GB',
            'directx': 'الإصدار 12',
            'storage': '61 GB مساحة متوفرة (Campaign Repack)'
        },
        'recommended': {
            'os': 'Windows 10 / 11 64-bit',
            'cpu': 'Intel Core i5-2500K أو AMD Ryzen R5 1600X',
            'ram': '12 GB',
            'gpu': 'NVIDIA GeForce GTX 970 / GTX 1660 أو AMD Radeon R9 390 / RX 580',
            'vram': '4 GB',
            'directx': 'الإصدار 12',
            'storage': '61 GB مساحة متوفرة'
        }
    },
    'links': [
        {'label': 'الموقع الرسمي', 'url': 'https://www.callofduty.com/modernwarfare'},
        {'label': 'Wikipedia', 'url': 'https://en.wikipedia.org/wiki/Call_of_Duty:_Modern_Warfare_(2019_video_game)'}
    ],
    'confidence': 'high',
    'source': 'official+manual',
    'needsRequirements': False
}

# 3. DRIVECLUB
items['games/DRIVECLUB.jpg'] = {
    'title': 'DRIVECLUB',
    'canonicalTitle': 'Driveclub',
    'type': 'game',
    'developer': 'Evolution Studios',
    'publisher': 'Sony Computer Entertainment',
    'releaseDate': '2014-10-07',
    'platforms': ['PlayStation 4', 'محاكي PC'],
    'genres': ['سباقات', 'محاكاة قيادة', 'سيارات'],
    'modes': ['لاعب واحد', 'لاعب متعدد'],
    'engine': 'Evolution Engine',
    'summaryAr': 'Driveclub هي لعبة سباقات سيارات شهيرة وسريعة تم تطويرها حصرياً بواسطة Evolution Studios ونشرتها Sony لجهاز PlayStation 4. تركز اللعبة على التنافس الجماعي وتأسيس أندية القيادة والتحديات بين اللاعبين، وتشتهر برسومياتها المبهرة ونظام الطقس الديناميكي فائق الواقعية مثل الأمطار الغزيرة والعواصف الثلجية، مع قيادة أسرع وأرقى السيارات الرياضية الخارقة في مسارات خلابة حول العالم.',
    'summaryEn': 'Driveclub is a premier racing game developed by Evolution Studios and published by Sony Computer Entertainment for the PlayStation 4. Emphasizing team racing and club competition, the game features breathtaking visual fidelity, class-leading dynamic weather effects like realistic rainfall and snowstorms, and a prestige roster of exotic sports cars and supercars racing across scenic international circuits.',
    'requirements': {
        'minimum': {
            'os': 'Windows 10 64-bit (محاكي PS4 مثل shadPS4)',
            'cpu': 'Intel Core i5-8400 أو AMD Ryzen 5 2600',
            'ram': '16 GB',
            'gpu': 'NVIDIA GeForce GTX 1060 (6 GB) أو AMD Radeon RX 580',
            'directx': 'الإصدار 12 / Vulkan',
            'storage': '15 GB مساحة متوفرة'
        },
        'recommended': {
            'os': 'Windows 10 / 11 64-bit',
            'cpu': 'Intel Core i7-10700K أو AMD Ryzen 7 3700X',
            'ram': '16 GB أو أكثر',
            'gpu': 'NVIDIA GeForce RTX 2060 Super / RTX 3060 أو AMD Radeon RX 6600 XT',
            'directx': 'الإصدار 12 / Vulkan',
            'storage': '15 GB SSD مساحة متوفرة'
        }
    },
    'extra': {
        'factsSource': 'بحث يدوي',
        'reviewNote': 'لعبة كونسول حصرية على بلايستيشن 4؛ متطلبات التشغيل المذكورة لتشغيلها على الحاسب عبر محاكيات PS4 (مثل shadPS4 / fpPS4)'
    },
    'links': [
        {'label': 'Wikipedia', 'url': 'https://en.wikipedia.org/wiki/Driveclub'}
    ],
    'confidence': 'high',
    'source': 'manual',
    'needsRequirements': False
}

# 4. Enhance short summaries
if 'games/DYNASTY WARRIORS - ORIGINS.jpg' in items:
    items['games/DYNASTY WARRIORS - ORIGINS.jpg']['summaryAr'] = 'انغمس في معارك أسطورية ملحمية كبطل مجهول في حقبة الممالك الثلاث الصينية. خض مواجهات ضخمة ضد آلاف الأعداء بأسلوب الأكشن الهاك آند سلاش مع تحركات تكتيكية استراتيجية لقيادة الجيوش وصنع التاريخ.'

if 'games/King of Fighters XV.jpg' in items:
    items['games/King of Fighters XV.jpg']['summaryAr'] = 'الجزء الخامس عشر من سلسلة ألعاب القتال الشهيرة KOF. يجمع نخبة المقاتلين في معارك ثلاثية حماسية ومؤثرات بصرية مذهلة مع نظام لعب محسّن وشبكة قتال عبر الإنترنت بتقنية Rollback Netcode.'

if 'games/Undertale.jpg' in items:
    items['games/Undertale.jpg']['summaryAr'] = 'لعبة تقمص أدوار مبتكرة وشهيرة للغاية؛ تسقط فيها كطفل بشري في عالم سفلي مليء بالوحوش السحرية. تتميز بنظام معارك فريد يتيح لك الفوز دون قتل أي مخلوق وحرية اختيار طريق السلام أو النزاع مع قصة إنسانية مؤثرة وموسيقى ساحرة.'

if 'games/IGI.jpg' in items:
    items['games/IGI.jpg']['summaryAr'] = 'لعبة التسلل والتصويب التكتيكي الكلاسيكية من منظور الشخص الأول. يتقمص اللاعب شخصية العميل السري ديفيد جونز في مهام عسكرية معقدة خلف خطوط العدو لاختراق القواعد الحصينة واستعادة سلاح نووي مسروق.'

# 5. Update _meta
if '_meta' in games_details:
    games_details['_meta']['counts']['total'] = len(items)
    games_details['_meta']['counts']['withRequirements'] = len(items)
    games_details['_meta']['updatedAt'] = '2026-11-04'

with open('details/games.json', 'w', encoding='utf-8') as f:
    json.dump(games_details, f, ensure_ascii=False, indent=2)

print(f'Successfully updated details/games.json! Total items: {len(items)}')

# 6. Update data.json
with open('data.json', 'r', encoding='utf-8') as f:
    data_json = json.load(f)

games_cat = [c for c in data_json['categories'] if c.get('id') == 'games'][0]['items']
for g in games_cat:
    if g['id'] == 'games/Phantom Blade Zero {HV}.jpg':
        g['year'] = 2026
    elif g['id'] == 'games/Call of Duty - MW4.jpg':
        g['year'] = 2019
    elif g['id'] == 'games/DRIVECLUB.jpg':
        g['year'] = 2014

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data_json, f, ensure_ascii=False, indent=2)

print('Successfully updated data.json with game years!')
