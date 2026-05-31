// ============================================
// 八字六字计算模块
// ============================================

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const WU_XING = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土',
  '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

// 年柱
function getYearGanZhi(year) {
  const ganIndex = (year - 4) % 10;
  const zhiIndex = (year - 4) % 12;
  return {
    gan: TIAN_GAN[ganIndex < 0 ? ganIndex + 10 : ganIndex],
    zhi: DI_ZHI[zhiIndex < 0 ? zhiIndex + 12 : zhiIndex]
  };
}

// 月柱
function getMonthGanZhi(year, month) {
  const yearGanIndex = (year - 4) % 10;
  const monthGanStart = (yearGanIndex % 5) * 2;
  let monthZhiIndex = (month + 1) % 12;
  if (monthZhiIndex < 0) monthZhiIndex += 12;
  let monthGanIndex = (monthGanStart + month - 1) % 10;
  if (monthGanIndex < 0) monthGanIndex += 10;
  return {
    gan: TIAN_GAN[monthGanIndex],
    zhi: DI_ZHI[monthZhiIndex]
  };
}

// 日柱
function getDayGanZhi(year, month, day) {
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  const daysDiff = Math.floor((targetDate - baseDate) / (1000 * 60 * 60 * 24));
  const ganIndex = (daysDiff % 10 + 10) % 10;
  const zhiIndex = (daysDiff % 12 + 4 + 12) % 12;
  return {
    gan: TIAN_GAN[ganIndex],
    zhi: DI_ZHI[zhiIndex]
  };
}

// 计算指定日期的八字
export function calculateBazi(year, month, day) {
  const yearPillar = getYearGanZhi(year);
  const monthPillar = getMonthGanZhi(year, month);
  const dayPillar = getDayGanZhi(year, month, day);

  const yearWuxing = WU_XING[yearPillar.gan] + WU_XING[yearPillar.zhi];
  const monthWuxing = WU_XING[monthPillar.gan] + WU_XING[monthPillar.zhi];
  const dayWuxing = WU_XING[dayPillar.gan] + WU_XING[dayPillar.zhi];

  // 统计五行分布
  const wuxingCount = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  [yearPillar.gan, yearPillar.zhi, monthPillar.gan, monthPillar.zhi, dayPillar.gan, dayPillar.zhi].forEach(c => {
    if (WU_XING[c]) wuxingCount[WU_XING[c]]++;
  });

  return {
    year: `${yearPillar.gan}${yearPillar.zhi}`,
    month: `${monthPillar.gan}${monthPillar.zhi}`,
    day: `${dayPillar.gan}${dayPillar.zhi}`,
    yearWuxing, monthWuxing, dayWuxing,
    display: `${yearPillar.gan}${yearPillar.zhi} ${monthPillar.gan}${monthPillar.zhi} ${dayPillar.gan}${dayPillar.zhi}`,
    wuxingCount,
    dominantWuxing: Object.entries(wuxingCount).sort((a, b) => b[1] - a[1])[0][0]
  };
}

// 计算当天（目标日期）的日柱
export function getDayPillarForDate(year, month, day) {
  return getDayGanZhi(year, month, day);
}

// 计算目标日期的完整三柱
export function getThreePillarsForDate(year, month, day) {
  const yearPillar = getYearGanZhi(year);
  const monthPillar = getMonthGanZhi(year, month);
  const dayPillar = getDayGanZhi(year, month, day);
  return {
    year: `${yearPillar.gan}${yearPillar.zhi}`,
    month: `${monthPillar.gan}${monthPillar.zhi}`,
    day: `${dayPillar.gan}${dayPillar.zhi}`,
    dayWuxing: WU_XING[dayPillar.gan] + WU_XING[dayPillar.zhi]
  };
}
