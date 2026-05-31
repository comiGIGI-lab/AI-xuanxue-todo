// ============================================
// MBTI推测模块 - 荣格八维概率图表
// 综合六字五行 + 星盘，计算Ni/Ne/Si/Se/Ti/Te/Fi/Fe八维概率
// 并推算最可能的3-5个MBTI类型及置信度
// ============================================

// ===== 基于六字五行的八维概率计算 =====

function calcBaziEightFunctions(bazi) {
  const { wuxingCount, day } = bazi;
  const mu = wuxingCount['木'] || 0;
  const huo = wuxingCount['火'] || 0;
  const tu = wuxingCount['土'] || 0;
  const jin = wuxingCount['金'] || 0;
  const shui = wuxingCount['水'] || 0;
  const total = mu + huo + tu + jin + shui || 1;

  // 五行映射到八维
  // 木→Ne/Fe（生长、扩展、连接）
  // 火→Se/Te（能量、表达、行动）
  // 土→Si/Ti（稳定、根基、结构）
  // 金→Ti/Te（精确、逻辑、规则）
  // 水→Ni/Fi（深度、直觉、内在）
  const base = {
    Ni: (shui / total) * 40 + 10,
    Ne: (mu / total) * 40 + 10,
    Si: (tu / total) * 40 + 10,
    Se: (huo / total) * 40 + 10,
    Ti: ((jin + tu) / total) * 30 + 10,
    Te: ((jin + huo) / total) * 30 + 10,
    Fi: ((shui + mu) / total) * 30 + 10,
    Fe: ((mu + huo) / total) * 30 + 10
  };

  // 日柱天干阴阳影响内外倾
  const dayGan = day.charAt(0);
  const yangGan = ['甲', '丙', '戊', '庚', '壬'];
  const isYang = yangGan.includes(dayGan);

  // 阳干偏外倾（Te/Fe/Se/Ne），阴干偏内倾（Ti/Fi/Si/Ni）
  if (isYang) {
    base.Te += 5; base.Fe += 5; base.Se += 5; base.Ne += 5;
    base.Ti -= 3; base.Fi -= 3; base.Si -= 3; base.Ni -= 3;
  } else {
    base.Ti += 5; base.Fi += 5; base.Si += 5; base.Ni += 5;
    base.Te -= 3; base.Fe -= 3; base.Se -= 3; base.Ne -= 3;
  }

  // 归一化到0-100
  const maxVal = Math.max(...Object.values(base));
  const minVal = Math.min(...Object.values(base));
  const range = maxVal - minVal || 1;
  const normalized = {};
  for (const [key, val] of Object.entries(base)) {
    normalized[key] = Math.round(((val - minVal) / range) * 80 + 10);
  }

  return normalized;
}

// ===== 基于星盘的八维概率计算 =====

function calcAstrologyEightFunctions(astrology) {
  const signElements = {
    '白羊座': '火', '狮子座': '火', '射手座': '火',
    '金牛座': '土', '处女座': '土', '摩羯座': '土',
    '双子座': '风', '天秤座': '风', '水瓶座': '风',
    '巨蟹座': '水', '天蝎座': '水', '双鱼座': '水'
  };

  const sunEl = signElements[astrology.sun] || '火';
  const moonEl = signElements[astrology.moon] || '水';
  const risingEl = signElements[astrology.rising] || '火';
  const mercuryEl = signElements[astrology.mercury] || '风';
  const venusEl = signElements[astrology.venus] || '水';
  const marsEl = signElements[astrology.mars] || '火';

  // 元素映射到八维
  const elementToFunc = {
    '火': { Se: 25, Te: 20, Fe: 15, Ne: 10, Si: 5, Ti: 5, Fi: 5, Ni: 5 },
    '土': { Si: 25, Ti: 20, Te: 15, Ni: 10, Se: 5, Fe: 5, Fi: 5, Ne: 5 },
    '风': { Ne: 25, Ti: 20, Te: 15, Ni: 10, Si: 5, Se: 5, Fi: 5, Fe: 5 },
    '水': { Ni: 25, Fi: 20, Fe: 15, Si: 10, Ne: 5, Ti: 5, Te: 5, Se: 5 }
  };

  const base = { Ni: 10, Ne: 10, Si: 10, Se: 10, Ti: 10, Te: 10, Fi: 10, Fe: 10 };

  // 太阳→核心功能
  const sunFunc = elementToFunc[sunEl];
  for (const [k, v] of Object.entries(sunFunc)) base[k] += v * 0.3;

  // 月亮→内在功能
  const moonFunc = elementToFunc[moonEl];
  for (const [k, v] of Object.entries(moonFunc)) base[k] += v * 0.25;

  // 上升→外在功能
  const risingFunc = elementToFunc[risingEl];
  for (const [k, v] of Object.entries(risingFunc)) base[k] += v * 0.15;

  // 水星→思维功能(Ti/Te)
  base[mercuryEl === '风' || mercuryEl === '金' ? 'Ti' : 'Te'] += 10;

  // 金星→情感功能(Fi/Fe)
  base[venusEl === '水' || venusEl === '火' ? 'Fi' : 'Fe'] += 10;

  // 火星→感知功能(Si/Se)
  base[marsEl === '火' ? 'Se' : 'Si'] += 10;

  // 归一化到0-100
  const maxVal = Math.max(...Object.values(base));
  const minVal = Math.min(...Object.values(base));
  const range = maxVal - minVal || 1;
  const normalized = {};
  for (const [key, val] of Object.entries(base)) {
    normalized[key] = Math.round(((val - minVal) / range) * 80 + 10);
  }

  return normalized;
}

// ===== 综合双轨八维概率 =====

export function calcEightFunctions(astrology, bazi) {
  const baziFunc = calcBaziEightFunctions(bazi);
  const astroFunc = calcAstrologyEightFunctions(astrology);

  // 加权平均（六字五行权重55%，星盘权重45%）
  const wBazi = 0.55;
  const wAstro = 0.45;

  const combined = {};
  for (const key of ['Ni', 'Ne', 'Si', 'Se', 'Ti', 'Te', 'Fi', 'Fe']) {
    combined[key] = Math.round(baziFunc[key] * wBazi + astroFunc[key] * wAstro);
  }

  return combined;
}

// ===== 从八维推算最可能的MBTI类型 =====

export function calcTopMBTITypes(eightFunc) {
  const { Ni, Ne, Si, Se, Ti, Te, Fi, Fe } = eightFunc;

  // 计算四组维度概率
  const N = Ni + Ne;
  const S = Si + Se;
  const T = Ti + Te;
  const F = Fi + Fe;

  const I_score = Ni + Si + Ti + Fi;
  const E_score = Ne + Se + Te + Fe;

  const nPct = Math.round((N / (N + S)) * 100);
  const sPct = 100 - nPct;
  const tPct = Math.round((T / (T + F)) * 100);
  const fPct = 100 - tPct;
  const ePct = Math.round((E_score / (I_score + E_score)) * 100);
  const iPct = 100 - ePct;

  // J/P由主导功能态度决定
  const judgingFuncs = Te + Fe + Ti + Fi;
  const perceivingFuncs = Ne + Se + Ni + Si;
  const jPct = Math.round((judgingFuncs / (judgingFuncs + perceivingFuncs)) * 100);
  const pPct = 100 - jPct;

  // 基础MBTI
  const baseType = (ePct >= iPct ? 'E' : 'I') +
                   (nPct >= sPct ? 'N' : 'S') +
                   (tPct >= fPct ? 'T' : 'F') +
                   (jPct >= pPct ? 'J' : 'P');

  // 计算所有16种类型的置信度
  const allTypes = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP'
  ];

  const typeScores = allTypes.map(type => {
    let score = 50; // 基础分
    const [ei, ns, tf, jp] = type.split('');

    if (ei === 'E') score += (ePct - 50) * 0.8;
    else score += (iPct - 50) * 0.8;

    if (ns === 'N') score += (nPct - 50) * 0.8;
    else score += (sPct - 50) * 0.8;

    if (tf === 'T') score += (tPct - 50) * 0.8;
    else score += (fPct - 50) * 0.8;

    if (jp === 'J') score += (jPct - 50) * 0.8;
    else score += (pPct - 50) * 0.8;

    // 八维匹配加分
    if (type.includes('N') && (Ni > 60 || Ne > 60)) score += 5;
    if (type.includes('S') && (Si > 60 || Se > 60)) score += 5;
    if (type.includes('T') && (Ti > 60 || Te > 60)) score += 5;
    if (type.includes('F') && (Fi > 60 || Fe > 60)) score += 5;

    return { type, confidence: Math.min(95, Math.max(15, Math.round(score))) };
  });

  // 排序返回全部16种
  typeScores.sort((a, b) => b.confidence - a.confidence);

  return {
    dimensions: {
      ei: { left: 'I', leftPct: iPct, right: 'E', rightPct: ePct },
      ns: { left: 'S', leftPct: sPct, right: 'N', rightPct: nPct },
      tf: { left: 'T', leftPct: tPct, right: 'F', rightPct: fPct },
      jp: { left: 'J', leftPct: jPct, right: 'P', rightPct: pPct }
    },
    eightFunc,
    allTypes: typeScores,
    baseType
  };
}

// 16种MBTI类型列表
export const ALL_MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];
