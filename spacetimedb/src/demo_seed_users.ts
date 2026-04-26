/**
 * 本機／測試庫用：產生 100 筆 demo 帳號（多為 12–18 歲女生口吻暱稱、長短不一）。
 * 實際寫入由 `dev_seed_demo_users` reducer；每位帳號有**各自**的 `plainPassword`（寫入時再 hash）。
 *
 * 信箱使用 IANA 保留網域 **`.test`**（`@inbox.volta.test`），外觀接近個人帳號、避免 `seed.user.000@…` 一眼假帳。
 */

export type DemoSeedUser = {
  identityHex: string;
  email: string;
  displayName: string;
  gender: 'male' | 'female' | 'other';
  ageYears: number;
  profileNote: string;
  /** 明文登入密碼（僅種子資料與清單文件；不入庫） */
  plainPassword: string;
};

/** 預留 U256 區段，避免與一般客戶端隨機 Identity 重疊（ff6e5c4d… + index） */
export function demoSeedIdentityHex(index: number): string {
  const n = BigInt('0xff6e5c4d00000000000000000000000000000000000000000000000000') + BigInt(index);
  return n.toString(16).padStart(64, '0');
}

/** 每位不同、可複現（≥6 字元；不帶 seed 字樣） */
export function demoSeedPlainPassword(index: number): string {
  const n = ((index + 1) * 2654435761) >>> 0;
  const tail = (n % 899999) + 100000;
  return `Pw${index.toString(36)}x${tail}!`;
}

/** 種子帳專用網域（僅供辨識／更新路徑；勿用於真人註冊） */
export const DEMO_SEED_EMAIL_DOMAIN = 'inbox.volta.test';

const LOCAL_A = [
  'yuki',
  'mika',
  'hana',
  'weiwei',
  'tingyu',
  'ruojia',
  'enxi',
  'zoeiris',
  'nana',
  'mina',
  'soso',
  'yoyo',
  'kiki',
  'lulu',
  'jojo',
  'nini',
  'qiqi',
  'xuan',
  'chen',
  'jolin',
  'hebe',
  'taro',
  'berry',
  'momo',
  'coco',
  'luna',
  'sora',
  'neco',
  'yuzu',
  'peko',
  'rin',
  'shiro',
  'kuro',
  'aoi',
  'mei',
  'yui',
  'aki',
  'rio',
  'leo',
  'ian',
  'max',
  'neo',
  'eli',
  'mia',
  'amy',
  'joy',
  'bea',
  'ivy',
  'eve',
  'sky',
  'jun',
  'kai',
  'hao',
  'bo',
  'yan',
  'lin',
  'fang',
  'qi',
  'xin',
  'yu',
  'an',
  'zi',
  'yun',
  'ning',
  'rou',
  'xi',
  'wan',
  'rou',
  'ting',
  'jia',
  'qi',
  'mo',
  'ke',
  'su',
  'ru',
  'fei',
  'han',
  'lu',
  'qiu',
  'xiao',
  'da',
  'xuan2',
  'meng',
  'luo',
  'tang',
  'song',
  'gu',
  'ye',
  'du',
  'cai',
  'deng',
  'fan',
  'gao',
  'he',
  'hu',
  'jiang',
  'kong',
  'lai',
  'ma',
  'niu',
  'ou',
  'pan',
  'qian',
  'ren',
  'sun',
  'tao',
  'weng',
  'xia',
  'yang',
  'zha',
];

const LOCAL_B = [
  'cat',
  'bear',
  'tea',
  'moon',
  'star',
  'day',
  'night',
  'mrt',
  'bus',
  'bag',
  'pen',
  'desk',
  'room',
  'nap',
  'run',
  'zzz',
  'lol',
  'owo',
  'qq',
  'me',
  'us',
  'hk',
  'tw',
  'mc',
  'ig',
  'fb',
  'line',
  'mail',
  'box',
  'drop',
  'sky',
  'sea',
  'rain',
  'wind',
  'sun',
  'ice',
  'hot',
  'cool',
  'pink',
  'blue',
  'mint',
  'peach',
  'milk',
  'bobo',
  'qiuqiu',
  'paopao',
  'tangtang',
  'douya',
  'mangguo',
  'putao',
  'caomei',
  'ningmeng',
  'xigua',
  'boluo',
  'yingtao',
  'hamigua',
  'lizhi',
  'longyan',
  'juzi',
  'shizi',
  'yezi',
  'hetao',
  'songzi',
  'xingzi',
  'taozi',
  'pingguo',
  'xiangjiao',
  'hamigua2',
  'huolongguo',
  'lanmei',
  'heihei',
  'haha',
  'xixi',
  'gege',
  'didi',
  'meimei',
  'bubu',
  'tutu',
  'nono',
  'yeye',
  'wuwu',
  'vovo',
  'zizi',
  'coco2',
  'fafa',
  'gaga',
  'hihi',
  'jiji',
  'kaka',
  'lala',
  'meme',
  'nene',
  'popo',
  'qeqe',
  'rere',
  'sese',
  'tete',
  'veve',
  'wewe',
  'xexe',
  'yeye2',
  'zeze',
];

/** 擬真信箱（小寫、英數為主，尾段帶 index 保證 100 筆互異） */
export function demoSeedEmail(index: number): string {
  const a = pick(LOCAL_A, index);
  const b = pick(LOCAL_B, index * 13 + 7);
  const n = ((index + 3) * 7919 + 10007) % 90000 + 10000;
  const local = `${a}${b}${n}x${index.toString(36)}`.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48);
  return `${local}@${DEMO_SEED_EMAIL_DOMAIN}`;
}

export function isDemoSeedMailbox(raw: string): boolean {
  const em = raw.trim().toLowerCase();
  return em.endsWith(`@${DEMO_SEED_EMAIL_DOMAIN}`);
}

function pick<T>(arr: T[], i: number): T {
  return arr[Math.abs(i) % arr.length]!;
}

/** 暱稱最多 32 字元（與後端 `MAX_DISPLAY_NAME_LEN` 一致） */
function clipDisplayName(s: string): string {
  const t = s.trim();
  if (!t) return '未命名小帳';
  const arr = Array.from(t);
  return arr.length <= 32 ? t : arr.slice(0, 32).join('');
}

const FEMALE_NAMES = [
  '桃子起泡酒', '奶汁櫻桃', '軟奶酪甜心', '草莓果醬', '小奶貓的甜吻', '滿身奶油香', '糖果夢幻',
  '果味仙女', '官方小可愛', '甜橙少女心', '焦糖布丁', '偷喝汽水', '愛吃香芋派', '西瓜涼了半個夏',
  '萌比萌噠噠', '蜜糖小姐姐', '甜風少女心', '嬌軟甜萌淑', '小魚偶偶泡', '樹上有隻熊',
  '霧島聽風', '銀河投遞員', '月光刻本', '海鹽幻想', '抵抗月球', '春物敘事曲', '九厘米的霧',
  '織一束月色', '霧眠氣泡水', '山復爾爾', '星星住在對岸', '恩莉爾的裙擺', '霧月', '寧靜的夏天',
  '櫻花爛漫', '十六月', '水星衝浪手', '落日飛機', '霧島風起時', '記錄小熊帳本', '眉眼清澈',
  '粉色信箋', '甜心棠糖', '軟萌兔斯基', '泡泡糖味兒', '奶油芝士醬', '啵啵喵醬', '甜系少女感',
  '芝麻醬味少女', '莓好時光', '星星泡泡糖', '噗噗小熊', '蜜桃小可愛', '軟綿綿雲朵', '薄荷味甜心',
  '櫻花棒棒糖', '一番星', '月亮島', '溫室偵查員', '七十二時', '北極甜蝦', '一隻檸檬精',
  '藍鯨的日記', '漫步雲端', '風軟一江水', '遇見少女心', '靜謐森林', '話別已深秋', '疏影橫斜水清淺',
  '幻墨如煙', '濁酒傾觴', '清風與酒', '素顏良人', '衣上雪花', '眉間砂', '花落知多少',
  '淺淺的溫存', '幽夜星空', '半世琉璃', '煙花易冷終成殤', '夢裡相遇你', '斷秋風', '一曲離殤',
  '墨染錦年', '南風知我意', '醉臥清風', '琴聲渺渺', '故夢未央', '青絲蘸白雪', '夢裡花落',
  '離歌淺唱', '淺笑安然', '浮生若夢', '霓裳羽衣', '雲卷雲舒',
];

const MALE_NAMES = [
  '風清雲淡', '思契十里', '青燈有味', '白晝之月', '西岸風', '長青詩', '歸舟', '淺暮流光', '半山月',
  '墨有初秋', '孤燈夜行', '風與水', '一夢等七年', '歲月沉澱', '靜觀其變', '所謂路人', '淡若輕風',
  '窗前舊時', '穩步前行', '山君與見山', '淵魚', '鴿嶼', '行路難', '卮留', '逐L', '啞巴說愛',
  '璞初', '懷瑾', '玄武', '玳瑁', '麒麟', '滄海月明', '醉臥紅塵', '孤星冷月', '墨雨成煙',
  '清風不醉', '笑靨漾暖', '暮雪千里', '英雄無悔', '追夢人', '包容夢想', '骨子裡的倔強',
  '自己選的路', '驕傲不羈', '跌跌撞撞堅強', '不忘初心', '少年奮鬥中', '夢在遠方', '傲視群雄',
  '向陽而生', '堅持到底', '逐夢星空', '逆風飛翔', '青春未成年', '純爺們', '給力Man', '黑衣少',
  '承羽', '風奇', '銘軒', '辰聖', '磊振', '逸瑋', '哲望', '偉倫', '金遠', '鴻鵠', '傲世', '戰魂',
  'Jason', 'Kevin', 'Eric', 'David', 'James', 'Alex', 'Jerry', 'Andy', 'Jack', 'Allen',
  'Vincent', 'Sam', 'Ken', 'Chris', 'Tony', 'Leo', 'Peter', 'Steven', 'Ryan',
];

const OTHER_NAMES = [
  '霧月', '山復爾爾', '星星住在對岸', '雲卷雲舒', '漫步雲端', '月光刻本',
  '風軟一江水', '靜謐森林', '故夢未央', '半山月',
];

const NOTES_F = [
  '喜歡手帳和貼紙，最近在練英文歌><',
  '追韓團、偶爾畫畫，想認識聊得來的朋友',
  '社恐但熟了會很吵，喜歡貓咪',
  '放學會去圖書館，喜歡推理小說',
  '最近在減糖，手搖還是忍不住點微糖',
  '喜歡拍天空和晚霞，IG 很少發限動',
  '玩音遊，手指很廢但很快樂',
  '想學吉他，目前只會 C 和弦',
  '喜歡逛文具店，零用錢都變成筆',
  '夜貓子，凌晨比較有靈感寫日記',
  '喜歡芭蕾風穿搭，其實不會跳舞',
  '追番中，歡迎推冷門番（不要太長篇）',
  '喜歡做甜點，戚風常常塌',
  '桌遊新手，常常規則聽一半',
  '喜歡寫小紙條，字有點醜別介意',
];

const NOTES_M = [
  '打籃球、聽饒舌，課業還在掙扎中',
  '喜歡模型，房間已經快沒位子',
  '電玩居多，偶爾跑步',
  '喜歡天文，希望有天能去看星星',
  '最近在練畫人物比例',
];

function buildDisplayName(i: number, gender: DemoSeedUser['gender']): string {
  if (gender === 'male') {
    return clipDisplayName(pick(MALE_NAMES, i * 11 + 7));
  }
  if (gender === 'other') {
    return clipDisplayName(pick(OTHER_NAMES, i * 5 + 3));
  }
  return clipDisplayName(pick(FEMALE_NAMES, i * 13 + 9));
}

export function buildDemoSeedUsers(): DemoSeedUser[] {
  const out: DemoSeedUser[] = [];
  for (let i = 0; i < 100; i++) {
    const isMale = i % 10 === 0;
    const isOther = i === 37 || i === 82;
    const gender: DemoSeedUser['gender'] = isOther ? 'other' : isMale ? 'male' : 'female';

    const displayName = buildDisplayName(i, gender);

    const ageYears =
      gender === 'male'
        ? 12 + ((i * 5) % 6)
        : gender === 'other'
          ? 15
          : 12 + ((i * 7) % 7);

    const profileNote =
      gender === 'male'
        ? pick(NOTES_M, i)
        : gender === 'other'
          ? '稱呼隨意，喜歡聽別人分享日常。'
          : pick(NOTES_F, i * 2 + 1);

    out.push({
      identityHex: demoSeedIdentityHex(i),
      email: demoSeedEmail(i),
      displayName,
      gender,
      ageYears,
      profileNote,
      plainPassword: demoSeedPlainPassword(i),
    });
  }
  return out;
}

/** 維運用：Markdown 表格（信箱、暱稱、明文密碼） */
export function formatDemoSeedUsersMarkdown(): string {
  const rows = buildDemoSeedUsers();
  let md =
    '| # | 信箱 | 暱稱 | 登入密碼（明文） | 性別 | 年齡 |\n|:---:|:---|:---|:---|:---|:---:|\n';
  for (let idx = 0; idx < rows.length; idx++) {
    const u = rows[idx]!;
    const nick = u.displayName.replace(/\|/g, '\\|');
    md += `| ${idx} | \`${u.email}\` | ${nick} | \`${u.plainPassword}\` | ${u.gender} | ${u.ageYears} |\n`;
  }
  return md;
}
