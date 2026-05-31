// ============================================
// Supabase Edge Function: ai-recommend
// 玄学宜do - AI每日推荐（纯文字输出）
// ============================================

import { corsHeaders } from '../_shared/cors.ts'

// ============================================
// 黄历宜忌规则库（按日干支推算，60条覆盖全部干支组合）
// ============================================

const ALMANAC_RULES = [
  { gan: '甲', zhi: '子', yi: ['祭祀', '祈福', '求嗣'], ji: ['动土', '破土'] },
  { gan: '甲', zhi: '丑', yi: ['签约', '交易', '纳财'], ji: ['出行', '移徙'] },
  { gan: '甲', zhi: '寅', yi: ['开业', '立券', '会亲友'], ji: ['安葬', '探病'] },
  { gan: '甲', zhi: '卯', yi: ['学习', '考试', '文书'], ji: ['争吵', '诉讼'] },
  { gan: '甲', zhi: '辰', yi: ['修造', '动土', '搬家'], ji: ['嫁娶', '订婚'] },
  { gan: '甲', zhi: '巳', yi: ['旅行', '出差', '远行'], ji: ['投资', '借贷'] },
  { gan: '甲', zhi: '午', yi: ['社交', '聚会', '表白'], ji: ['熬夜', '过度劳累'] },
  { gan: '甲', zhi: '未', yi: ['养生', '调理', '冥想'], ji: ['剧烈运动', '冒险'] },
  { gan: '甲', zhi: '申', yi: ['创新', '尝试新事物'], ji: ['保守', '犹豫不决'] },
  { gan: '甲', zhi: '酉', yi: ['整理', '收纳', '断舍离'], ji: ['浪费', '冲动消费'] },
  { gan: '甲', zhi: '戌', yi: ['规划', '制定目标'], ji: ['拖延', '逃避'] },
  { gan: '甲', zhi: '亥', yi: ['反思', '总结', '写作'], ji: ['抱怨', '消极'] },
  { gan: '乙', zhi: '子', yi: ['艺术', '创作', '音乐'], ji: ['争执', '冲突'] },
  { gan: '乙', zhi: '丑', yi: ['烹饪', '烘焙', '美食'], ji: ['暴饮暴食'] },
  { gan: '乙', zhi: '寅', yi: ['园艺', '种植', '自然'], ji: ['破坏环境'] },
  { gan: '乙', zhi: '卯', yi: ['阅读', '写作', '学习'], ji: ['沉迷游戏'] },
  { gan: '乙', zhi: '辰', yi: ['运动', '健身', '户外'], ji: ['久坐不动'] },
  { gan: '乙', zhi: '巳', yi: ['社交', '拓展人脉'], ji: ['孤立自己'] },
  { gan: '乙', zhi: '午', yi: ['表达', '演讲', '分享'], ji: ['沉默寡言'] },
  { gan: '乙', zhi: '未', yi: ['照顾家人', '陪伴'], ji: ['忽视亲情'] },
  { gan: '乙', zhi: '申', yi: ['合作', '谈判', '签约'], ji: ['独断专行'] },
  { gan: '乙', zhi: '酉', yi: ['美容', '打扮', '自我提升'], ji: ['邋遢', '不修边幅'] },
  { gan: '乙', zhi: '戌', yi: ['储蓄', '理财', '规划'], ji: ['挥霍', '冲动购物'] },
  { gan: '乙', zhi: '亥', yi: ['灵修', '冥想', '内省'], ji: ['浮躁', '焦虑'] },
  { gan: '丙', zhi: '子', yi: ['启动新项目', '创业'], ji: ['半途而废'] },
  { gan: '丙', zhi: '丑', yi: ['理财', '投资规划'], ji: ['盲目消费'] },
  { gan: '丙', zhi: '寅', yi: ['领导', '组织活动'], ji: ['独断专行'] },
  { gan: '丙', zhi: '卯', yi: ['教学', '指导他人'], ji: ['好为人师'] },
  { gan: '丙', zhi: '辰', yi: ['建设', '装修'], ji: ['违章搭建'] },
  { gan: '丙', zhi: '巳', yi: ['表演', '展示才艺'], ji: ['过度炫耀'] },
  { gan: '丙', zhi: '午', yi: ['竞争', '比赛'], ji: ['恶性竞争'] },
  { gan: '丙', zhi: '未', yi: ['公益', '志愿服务'], ji: ['冷漠旁观'] },
  { gan: '丙', zhi: '申', yi: ['探索', '冒险'], ji: ['鲁莽行事'] },
  { gan: '丙', zhi: '酉', yi: ['品鉴', '鉴赏'], ji: ['铺张浪费'] },
  { gan: '丙', zhi: '戌', yi: ['守成', '巩固'], ji: ['冒进'] },
  { gan: '丙', zhi: '亥', yi: ['沉淀', '内省'], ji: ['浮躁'] },
  { gan: '丁', zhi: '子', yi: ['研究', '学术', '深度思考'], ji: ['浅尝辄止'] },
  { gan: '丁', zhi: '丑', yi: ['收藏', '整理', '归档'], ji: ['杂乱无章'] },
  { gan: '丁', zhi: '寅', yi: ['策划', '谋略', '布局'], ji: ['盲目行动'] },
  { gan: '丁', zhi: '卯', yi: ['沟通', '协商', '调解'], ji: ['争吵', '对立'] },
  { gan: '丁', zhi: '辰', yi: ['学习新技能', '培训'], ji: ['自满', '停滞'] },
  { gan: '丁', zhi: '巳', yi: ['创意', '设计', '灵感'], ji: ['墨守成规'] },
  { gan: '丁', zhi: '午', yi: ['热情', '社交', '派对'], ji: ['冷漠', '孤僻'] },
  { gan: '丁', zhi: '未', yi: ['家庭', '团聚', '温馨'], ji: ['争吵', '冷战'] },
  { gan: '丁', zhi: '申', yi: ['旅行', '探索', '新鲜'], ji: ['宅家', '封闭'] },
  { gan: '丁', zhi: '酉', yi: ['精致', '品味', '美学'], ji: ['粗糙', '敷衍'] },
  { gan: '丁', zhi: '戌', yi: ['忠诚', '守信', '承诺'], ji: ['失信', '违约'] },
  { gan: '丁', zhi: '亥', yi: ['慈悲', '善良', '助人'], ji: ['自私', '冷漠'] },
  { gan: '戊', zhi: '子', yi: ['稳健', '踏实', '积累'], ji: ['急躁', '冒进'] },
  { gan: '戊', zhi: '丑', yi: ['务实', '执行', '落地'], ji: ['空想', '拖延'] },
  { gan: '戊', zhi: '寅', yi: ['开拓', '进取', '突破'], ji: ['保守', '退缩'] },
  { gan: '戊', zhi: '卯', yi: ['温和', '包容', '理解'], ji: ['苛刻', '挑剔'] },
  { gan: '戊', zhi: '辰', yi: ['建设', '奠基', '打基础'], ji: ['浮躁', '急功近利'] },
  { gan: '戊', zhi: '巳', yi: ['热情', '活力', '行动'], ji: ['懒惰', '消极'] },
  { gan: '戊', zhi: '午', yi: ['阳光', '乐观', '积极'], ji: ['悲观', '抱怨'] },
  { gan: '戊', zhi: '未', yi: ['收获', '感恩', '回馈'], ji: ['贪婪', '不知足'] },
  { gan: '戊', zhi: '申', yi: ['变通', '灵活', '适应'], ji: ['固执', '僵化'] },
  { gan: '戊', zhi: '酉', yi: ['精致', '细节', '品质'], ji: ['粗糙', '马虎'] },
  { gan: '戊', zhi: '戌', yi: ['忠诚', '坚守', '责任'], ji: ['背叛', '逃避'] },
  { gan: '戊', zhi: '亥', yi: ['深沉', '思考', '沉淀'], ji: ['浮躁', '浅薄'] },
  { gan: '己', zhi: '子', yi: ['滋养', '培育', '照顾'], ji: ['忽视', '冷漠'] },
  { gan: '己', zhi: '丑', yi: ['踏实', '勤勉', '耕耘'], ji: ['懒惰', '懈怠'] },
  { gan: '己', zhi: '寅', yi: ['规划', '布局', '筹备'], ji: ['盲目', '冲动'] },
  { gan: '己', zhi: '卯', yi: ['柔和', '协调', '平衡'], ji: ['极端', '偏激'] },
  { gan: '己', zhi: '辰', yi: ['包容', '宽厚', '大度'], ji: ['狭隘', '小气'] },
  { gan: '己', zhi: '巳', yi: ['温暖', '关怀', '体贴'], ji: ['冷淡', '疏远'] },
  { gan: '己', zhi: '午', yi: ['热情', '开朗', '阳光'], ji: ['阴郁', '沉闷'] },
  { gan: '己', zhi: '未', yi: ['收获', '分享', '感恩'], ji: ['独占', '吝啬'] },
  { gan: '己', zhi: '申', yi: ['灵活', '变通', '创新'], ji: ['死板', '教条'] },
  { gan: '己', zhi: '酉', yi: ['精致', '优雅', '品味'], ji: ['粗俗', '邋遢'] },
  { gan: '己', zhi: '戌', yi: ['忠诚', '可靠', '信任'], ji: ['虚伪', '欺骗'] },
  { gan: '己', zhi: '亥', yi: ['深沉', '智慧', '洞察'], ji: ['肤浅', '盲目'] },
  { gan: '庚', zhi: '子', yi: ['果断', '决策', '执行'], ji: ['犹豫', '拖延'] },
  { gan: '庚', zhi: '丑', yi: ['坚韧', '毅力', '坚持'], ji: ['放弃', '退缩'] },
  { gan: '庚', zhi: '寅', yi: ['勇敢', '挑战', '突破'], ji: ['怯懦', '逃避'] },
  { gan: '庚', zhi: '卯', yi: ['公正', '公平', '正义'], ji: ['偏私', '不公'] },
  { gan: '庚', zhi: '辰', yi: ['刚毅', '坚定', '果断'], ji: ['软弱', '优柔'] },
  { gan: '庚', zhi: '巳', yi: ['锐利', '敏锐', '洞察'], ji: ['迟钝', '麻木'] },
  { gan: '庚', zhi: '午', yi: ['光明', '正直', '坦荡'], ji: ['阴暗', '狡诈'] },
  { gan: '庚', zhi: '未', yi: ['收获', '成果', '回报'], ji: ['徒劳', '无功'] },
  { gan: '庚', zhi: '申', yi: ['变革', '革新', '突破'], ji: ['守旧', '停滞'] },
  { gan: '庚', zhi: '酉', yi: ['精炼', '纯粹', '专注'], ji: ['杂乱', '分散'] },
  { gan: '庚', zhi: '戌', yi: ['忠诚', '义气', '担当'], ji: ['背叛', '推诿'] },
  { gan: '庚', zhi: '亥', yi: ['深沉', '内敛', '蓄力'], ji: ['浮躁', '张扬'] },
  { gan: '辛', zhi: '子', yi: ['精致', '细腻', '用心'], ji: ['粗糙', '敷衍'] },
  { gan: '辛', zhi: '丑', yi: ['勤勉', '踏实', '积累'], ji: ['懒惰', '浮躁'] },
  { gan: '辛', zhi: '寅', yi: ['优雅', '品味', '美学'], ji: ['粗俗', '低劣'] },
  { gan: '辛', zhi: '卯', yi: ['柔和', '温润', '包容'], ji: ['尖锐', '刻薄'] },
  { gan: '辛', zhi: '辰', yi: ['珍贵', '稀有', '独特'], ji: ['平庸', '普通'] },
  { gan: '辛', zhi: '巳', yi: ['灵动', '机智', '聪慧'], ji: ['迟钝', '愚笨'] },
  { gan: '辛', zhi: '午', yi: ['光彩', '耀眼', '出众'], ji: ['暗淡', '平庸'] },
  { gan: '辛', zhi: '未', yi: ['温润', '柔和', '滋养'], ji: ['干燥', '枯竭'] },
  { gan: '辛', zhi: '申', yi: ['变通', '灵活', '巧妙'], ji: ['死板', '僵硬'] },
  { gan: '辛', zhi: '酉', yi: ['纯粹', '精致', '完美'], ji: ['杂乱', '粗糙'] },
  { gan: '辛', zhi: '戌', yi: ['忠诚', '守信', '可靠'], ji: ['失信', '虚伪'] },
  { gan: '辛', zhi: '亥', yi: ['深沉', '内敛', '含蓄'], ji: ['浅薄', '张扬'] },
  { gan: '壬', zhi: '子', yi: ['流动', '变化', '适应'], ji: ['停滞', '僵化'] },
  { gan: '壬', zhi: '丑', yi: ['深沉', '蓄力', '沉淀'], ji: ['浮躁', '浅薄'] },
  { gan: '壬', zhi: '寅', yi: ['智慧', '谋略', '远见'], ji: ['短视', '盲目'] },
  { gan: '壬', zhi: '卯', yi: ['柔和', '滋润', '养育'], ji: ['干燥', '枯竭'] },
  { gan: '壬', zhi: '辰', yi: ['包容', '广阔', '宏大'], ji: ['狭隘', '局限'] },
  { gan: '壬', zhi: '巳', yi: ['灵动', '变化', '创新'], ji: ['死板', '守旧'] },
  { gan: '壬', zhi: '午', yi: ['热情', '奔放', '自由'], ji: ['压抑', '束缚'] },
  { gan: '壬', zhi: '未', yi: ['滋养', '润泽', '丰收'], ji: ['干旱', '贫瘠'] },
  { gan: '壬', zhi: '申', yi: ['流动', '旅行', '探索'], ji: ['封闭', '固守'] },
  { gan: '壬', zhi: '酉', yi: ['清澈', '纯净', '透明'], ji: ['浑浊', '模糊'] },
  { gan: '壬', zhi: '戌', yi: ['深沉', '厚重', '稳健'], ji: ['轻浮', '浅薄'] },
  { gan: '壬', zhi: '亥', yi: ['智慧', '深邃', '洞察'], ji: ['肤浅', '无知'] },
  { gan: '癸', zhi: '子', yi: ['内敛', '深沉', '蓄力'], ji: ['张扬', '浮躁'] },
  { gan: '癸', zhi: '丑', yi: ['滋养', '孕育', '培养'], ji: ['忽视', '荒废'] },
  { gan: '癸', zhi: '寅', yi: ['灵感', '创意', '想象'], ji: ['呆板', '无趣'] },
  { gan: '癸', zhi: '卯', yi: ['温柔', '体贴', '关怀'], ji: ['冷漠', '粗暴'] },
  { gan: '癸', zhi: '辰', yi: ['包容', '宽厚', '大度'], ji: ['狭隘', '小气'] },
  { gan: '癸', zhi: '巳', yi: ['灵动', '机智', '巧妙'], ji: ['笨拙', '迟钝'] },
  { gan: '癸', zhi: '午', yi: ['热情', '温暖', '阳光'], ji: ['冷漠', '阴郁'] },
  { gan: '癸', zhi: '未', yi: ['滋养', '丰收', '感恩'], ji: ['贫瘠', '忘恩'] },
  { gan: '癸', zhi: '申', yi: ['变化', '适应', '灵活'], ji: ['僵化', '固执'] },
  { gan: '癸', zhi: '酉', yi: ['纯净', '清澈', '透明'], ji: ['浑浊', '复杂'] },
  { gan: '癸', zhi: '戌', yi: ['深沉', '厚重', '可靠'], ji: ['轻浮', '不可靠'] },
  { gan: '癸', zhi: '亥', yi: ['智慧', '深邃', '灵性'], ji: ['肤浅', '愚钝'] }
]

function getAlmanacForDay(gan, zhi) {
  const rule = ALMANAC_RULES.find(r => r.gan === gan && r.zhi === zhi)
  if (rule) return { yi: rule.yi, ji: rule.ji }
  return {
    yi: ['学习', '运动', '社交', '阅读'],
    ji: ['熬夜', '争吵', '冲动决策']
  }
}

// ============================================
// RAG 知识库（扩充版：每类25+条）
// ============================================

const ASTROLOGY_KB = [
  { keywords: ['白羊', '火象'], content: '行动力强，适合运动、创业、挑战类活动。推荐：健身、攀岩、竞技游戏。' },
  { keywords: ['金牛', '土象'], content: '注重感官享受，适合美食、艺术、自然活动。推荐：烹饪、园艺、品酒。' },
  { keywords: ['双子', '风象'], content: '善于沟通学习，适合阅读、社交、知识探索。推荐：读书会、语言学习、播客。' },
  { keywords: ['巨蟹', '水象'], content: '情感丰富，适合家庭、烹饪、治愈活动。推荐：家庭聚会、烘焙、冥想。' },
  { keywords: ['狮子', '火象'], content: '创造力强，适合表演、创作、领导活动。推荐：戏剧、绘画、团队项目。' },
  { keywords: ['处女', '土象'], content: '注重细节，适合整理、分析、健康活动。推荐：收纳、数据分析、瑜伽。' },
  { keywords: ['天秤', '风象'], content: '追求和谐，适合美学、社交、平衡活动。推荐：花艺、茶道、约会。' },
  { keywords: ['天蝎', '水象'], content: '洞察力强，适合研究、深度探索、转化活动。推荐：心理学、侦探游戏、断舍离。' },
  { keywords: ['射手', '火象'], content: '热爱自由，适合旅行、哲学、冒险活动。推荐：户外徒步、异国美食、哲学阅读。' },
  { keywords: ['摩羯', '土象'], content: '目标导向，适合规划、学习、职业提升。推荐：技能课程、时间管理、职业咨询。' },
  { keywords: ['水瓶', '风象'], content: '创新思维，适合科技、社群、未来探索。推荐：AI工具、社群活动、科幻阅读。' },
  { keywords: ['双鱼', '水象'], content: '想象力丰富，适合艺术、灵性、治愈活动。推荐：音乐创作、灵修、电影欣赏。' },
  { keywords: ['月亮处女', '分析'], content: '逻辑思维强，适合数据分析、整理规划类学习。推荐：编程、Excel技巧、逻辑谜题。' },
  { keywords: ['月亮天蝎', '深度'], content: '洞察力强，适合心理学、神秘学、深度研究。推荐：心理学书籍、塔罗牌、冥想。' },
  { keywords: ['月亮射手', '探索'], content: '热爱探索，适合旅行规划、文化学习。推荐：异国料理、旅行攻略、外语学习。' },
  { keywords: ['月亮巨蟹', '情感'], content: '情感细腻，适合家庭活动、烹饪、照顾他人。推荐：家庭聚餐、烘焙、园艺。' },
  { keywords: ['月亮狮子', '创造'], content: '创造力旺盛，适合表演、艺术、领导活动。推荐：戏剧、绘画、团队组织。' },
  { keywords: ['月亮天秤', '和谐'], content: '追求平衡，适合美学、社交、调解活动。推荐：花艺、茶道、约会策划。' },
  { keywords: ['月亮摩羯', '责任'], content: '责任感强，适合规划、管理、长期目标。推荐：时间管理、职业规划、储蓄。' },
  { keywords: ['月亮水瓶', '创新'], content: '思维独特，适合科技、社群、未来探索。推荐：AI工具、社群活动、科幻。' },
  { keywords: ['月亮双鱼', '灵性'], content: '灵性敏锐，适合艺术、冥想、治愈活动。推荐：音乐创作、灵修、电影。' },
  { keywords: ['月亮白羊', '行动'], content: '行动力强，适合运动、创业、挑战。推荐：健身、攀岩、竞技。' },
  { keywords: ['月亮金牛', '享受'], content: '注重感官，适合美食、艺术、自然。推荐：烹饪、园艺、品酒。' },
  { keywords: ['月亮双子', '沟通'], content: '善于表达，适合阅读、社交、学习。推荐：读书会、语言学习、播客。' },
  { keywords: ['木星', '幸运'], content: '木星所在星座代表幸运领域，适合在该领域扩张和发展。' },
  { keywords: ['土星', '责任'], content: '土星所在星座代表挑战领域，需要通过努力和坚持来克服。' },
]

const BAZI_KB = [
  { keywords: ['甲木', '木旺'], content: '木旺宜疏，适合户外活动、植物养护。忌：过度劳累。推荐：晨跑、园艺、植树。' },
  { keywords: ['乙木', '木柔'], content: '木柔宜养，适合温和运动、艺术创作。忌：急躁决策。推荐：瑜伽、绘画、茶道。' },
  { keywords: ['丙火', '火旺'], content: '火旺宜泄，适合水上活动、清凉饮食。忌：辛辣燥热。推荐：游泳、凉拌菜、冥想。' },
  { keywords: ['丁火', '火柔'], content: '火柔宜温，适合温和社交、文化活动。忌：过度消耗。推荐：读书会、音乐会、品茶。' },
  { keywords: ['戊土', '土旺'], content: '土旺宜通，适合户外运动、土地相关。忌：久坐不动。推荐：徒步、农耕体验、陶艺。' },
  { keywords: ['己土', '土柔'], content: '土柔宜养，适合室内活动、养生调理。忌：潮湿环境。推荐：烘焙、中医养生、整理收纳。' },
  { keywords: ['庚金', '金旺'], content: '金旺宜炼，适合运动挑战、技能学习。忌：过度刚硬。推荐：健身、武术、金属工艺。' },
  { keywords: ['辛金', '金柔'], content: '金柔宜润，适合精致活动、美学追求。忌：尖锐冲突。推荐：珠宝鉴赏、花艺、书法。' },
  { keywords: ['壬水', '水旺'], content: '水旺宜流，适合旅行探索、流动活动。忌：停滞不前。推荐：旅行、漂流、舞蹈。' },
  { keywords: ['癸水', '水柔'], content: '水柔宜静，适合内省学习、灵性活动。忌：过度封闭。推荐：冥想、写作、音乐欣赏。' },
  { keywords: ['木火', '相生'], content: '木火相生，活力充沛，适合创意表达。推荐：摄影、短视频创作、户外派对。' },
  { keywords: ['火土', '相生'], content: '火土相生，稳定成长，适合技能深耕。推荐：烹饪课程、手工艺、园艺。' },
  { keywords: ['土金', '相生'], content: '土金相生，收获季节，适合财务规划。推荐：理财学习、收藏、投资研究。' },
  { keywords: ['金水', '相生'], content: '金水相生，智慧流动，适合学术交流。推荐：研讨会、写作、语言学习。' },
  { keywords: ['水木', '相生'], content: '水木相生，生机勃发，适合新计划启动。推荐：创业规划、学习新技能、旅行。' },
  { keywords: ['木土', '相克'], content: '木土相克，需要平衡，适合调和活动。推荐：太极、瑜伽、冥想。' },
  { keywords: ['火金', '相克'], content: '火金相克，需要降温，适合冷静活动。推荐：游泳、阅读、独处。' },
  { keywords: ['土水', '相克'], content: '土水相克，需要疏通，适合流动活动。推荐：旅行、舞蹈、漂流。' },
  { keywords: ['金木', '相克'], content: '金木相克，需要柔化，适合温和活动。推荐：园艺、绘画、茶道。' },
  { keywords: ['水火', '相克'], content: '水火相克，需要平衡，适合调和活动。推荐：太极、瑜伽、冥想。' },
  { keywords: ['木缺', '补木'], content: '五行缺木，宜补木：绿色食物、东方方位、木质物品、植物养护。' },
  { keywords: ['火缺', '补火'], content: '五行缺火，宜补火：红色食物、南方方位、阳光活动、热情社交。' },
  { keywords: ['土缺', '补土'], content: '五行缺土，宜补土：黄色食物、中央方位、陶瓷物品、稳定活动。' },
  { keywords: ['金缺', '补金'], content: '五行缺金，宜补金：白色食物、西方方位、金属物品、果断决策。' },
  { keywords: ['水缺', '补水'], content: '五行缺水，宜补水：黑色食物、北方方位、水流活动、灵活变通。' },
  { keywords: ['木旺', '泄木'], content: '木旺宜泄，适合火属性活动：烹饪、阳光运动、热情社交。' },
]

const MBTI_KB = [
  { keywords: ['INTJ', '战略'], content: 'INTJ适合独立深度工作。推荐：战略游戏、编程、哲学阅读、独处冥想。' },
  { keywords: ['INTP', '分析'], content: 'INTP适合探索未知。推荐：科学实验、解谜游戏、技术博客、自由研究。' },
  { keywords: ['ENTJ', '领导'], content: 'ENTJ适合领导挑战。推荐：团队项目、公开演讲、商业模拟、目标规划。' },
  { keywords: ['ENTP', '创新'], content: 'ENTP适合思维碰撞。推荐：辩论赛、创业头脑风暴、即兴表演、新技术尝试。' },
  { keywords: ['INFJ', '洞察'], content: 'INFJ适合深度连接。推荐：心理咨询、写作、艺术创作、志愿服务。' },
  { keywords: ['INFP', '理想'], content: 'INFP适合自我表达。推荐：诗歌写作、音乐创作、独立电影、自然漫步。' },
  { keywords: ['ENFJ', '启发'], content: 'ENFJ适合影响他人。推荐：导师计划、社群组织、公开分享、团队建设。' },
  { keywords: ['ENFP', '热情'], content: 'ENFP适合多元体验。推荐：旅行探险、创意工作坊、社交活动、即兴创作。' },
  { keywords: ['ISTJ', '责任'], content: 'ISTJ适合结构化活动。推荐：整理规划、历史研究、传统工艺、财务管理。' },
  { keywords: ['ISFJ', '守护'], content: 'ISFJ适合照顾他人。推荐：烹饪分享、家庭活动、志愿服务、手工艺。' },
  { keywords: ['ESTJ', '执行'], content: 'ESTJ适合高效执行。推荐：项目管理、健身计划、组织活动、技能认证。' },
  { keywords: ['ESFJ', '和谐'], content: 'ESFJ适合社交连接。推荐：聚会组织、美食分享、社区活动、节日策划。' },
  { keywords: ['ISTP', '实操'], content: 'ISTP适合动手操作。推荐：机械修理、户外运动、摄影、DIY制作。' },
  { keywords: ['ISFP', '审美'], content: 'ISFP适合感官体验。推荐：艺术展览、美食探索、自然摄影、音乐欣赏。' },
  { keywords: ['ESTP', '冒险'], content: 'ESTP适合刺激体验。推荐：极限运动、竞技比赛、即兴表演、商业谈判。' },
  { keywords: ['ESFP', '表演'], content: 'ESFP适合舞台表现。推荐：卡拉OK、舞蹈课程、派对主持、美食探店。' },
  { keywords: ['INTJ', '职业'], content: 'INTJ适合战略规划、系统架构、投资分析、科研等需要深度思考的职业。' },
  { keywords: ['INTP', '职业'], content: 'INTP适合软件工程、数据科学、哲学研究、技术咨询等需要逻辑分析的职业。' },
  { keywords: ['ENTJ', '职业'], content: 'ENTJ适合企业管理、项目管理、法律、创业等需要领导力的职业。' },
  { keywords: ['ENTP', '职业'], content: 'ENTP适合创业、创意总监、咨询顾问、产品经理等需要创新的职业。' },
  { keywords: ['INFJ', '职业'], content: 'INFJ适合心理咨询、写作、社会工作、教育等需要深度理解他人的职业。' },
  { keywords: ['INFP', '职业'], content: 'INFP适合艺术、写作、音乐、社会活动等需要创意表达的职业。' },
  { keywords: ['ENFJ', '职业'], content: 'ENFJ适合教师、培训师、人力资源、公关等需要启发他人的职业。' },
  { keywords: ['ENFP', '职业'], content: 'ENFP适合市场营销、活动策划、记者、创意总监等需要多元体验的职业。' },
  { keywords: ['ISTJ', '职业'], content: 'ISTJ适合会计、审计、行政管理、质量控制等需要细致负责的职业。' },
  { keywords: ['ISFJ', '职业'], content: 'ISFJ适合护士、行政助理、客户服务、教育等需要照顾他人的职业。' },
]

function retrieveRelevant(query, kb, topK = 5) {
  const queryLower = query.toLowerCase()
  const scored = kb.map(item => {
    const matchCount = item.keywords.filter(kw => queryLower.includes(kw.toLowerCase())).length
    return { content: item.content, score: matchCount }
  })
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.content)
}

// ============================================
// Edge Function 主处理
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { astrology, bazi, mbti, targetDate } = body

    if (!astrology || !bazi) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const dayPillar = targetDate?.pillars?.day || bazi.day
    const dayGan = dayPillar.charAt(0)
    const dayZhi = dayPillar.charAt(1)
    const dayWuxing = targetDate?.pillars?.dayWuxing || bazi.dayWuxing
    const almanac = getAlmanacForDay(dayGan, dayZhi)

    const queryParts = [
      astrology.sun, astrology.moon, astrology.rising,
      bazi.year, bazi.month, bazi.day,
      mbti?.type || '', dayWuxing
    ]
    const queryString = queryParts.join(' ')

    const astrologyDocs = retrieveRelevant(queryString, ASTROLOGY_KB, 3)
    const baziDocs = retrieveRelevant(queryString, BAZI_KB, 3)
    const mbtiDocs = mbti?.type ? retrieveRelevant(queryString, MBTI_KB, 3) : []
    const allDocs = [...astrologyDocs, ...baziDocs, ...mbtiDocs]
    const ragContext = allDocs.length > 0 ? allDocs.join('\n\n') : '暂无相关知识库匹配'

    const targetDateStr = targetDate ? `${targetDate.year}年${targetDate.month}月${targetDate.day}日` : '今天'

    const mbtiInfo = mbti?.type ? `MBTI：${mbti.type}` : '用户未确认MBTI类型，以下推荐仅基于星盘和八字五行。'

    const systemPrompt = `你是一位玄学融合顾问，精通星盘、八字、MBTI性格分析和黄历宜忌。请根据用户提供的玄学档案和当天日柱五行，生成每日推荐。

严格要求：
1. 必须按以下格式输出，不要添加任何Markdown格式符号（不要用**、##、*、_、[]等），全部用纯文字。
2. 必须包含以下所有部分，每部分用空行分隔：

今日适合吃什么
（具体食物建议，2-3项，结合五行和星座）

今日适合玩什么
（具体活动建议，2-3项，结合MBTI和星盘）

今日适合学什么
（具体学习建议，1-2项，结合八字和性格）

今日不宜做的事情
（2-3项禁忌，结合黄历忌和五行）

人际交往
（1-2句小提醒）

事业发展
（1-2句小提醒）

生活小提醒
（1-2句小提醒）

家庭
（1-2句小提醒）

健康
（1-2句小提醒）

参考来源
（列出参考的知识库条目，2-4条）

3. 建议要具体、可执行、有趣。
4. 语气轻松有趣，适合年轻人。
5. 不要输出分析过程，只输出最终推荐。
6. 绝对不要使用任何Markdown符号。`

    const userPrompt = `我的玄学档案：
- 星盘确定值：太阳${astrology.sun}，木星${astrology.jupiter}，土星${astrology.saturn}，天王星${astrology.uranus}，海王星${astrology.neptune}，冥王星${astrology.pluto}
- 星盘需时辰确认（仅供参考，不做具体建议）：月亮${astrology.moonRange?.join('或')}，上升${astrology.risingRange?.join('或')}，水星${astrology.mercuryRange?.join('或')}，金星${astrology.venusRange?.join('或')}，火星${astrology.marsRange?.join('或')}
- 八字：${bazi.display}（时辰暂缺），主导五行${bazi.dominantWuxing}
- ${mbtiInfo}

查看日期：${targetDateStr}
当天日柱：${dayPillar}（${dayWuxing}）
当天黄历宜：${almanac.yi.join('、')}
当天黄历忌：${almanac.ji.join('、')}

请为我生成${targetDateStr}的推荐。注意：对于需时辰确认的行星落位，不要基于它们给出具体建议，只作为参考背景。

参考知识库：
${ragContext}`

    const CREO4U_API_KEY = Deno.env.get('CREO4U_API_KEY')
    if (!CREO4U_API_KEY) {
      throw new Error('CREO4U_API_KEY 环境变量未配置')
    }

    const response = await fetch('https://creo4u.com/autoagent/api/proxy/044b4dba-ec0f-4779-998c-e8a7893253cd/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CREO4U_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3.5-plus',
        enable_thinking: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`大模型API错误 [${response.status}]:`, errText)
      return new Response(
        JSON.stringify({ error: `大模型调用失败: ${response.status}`, details: errText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    const aiContent = result.choices?.[0]?.message?.content || '未能生成推荐'

    return new Response(
      JSON.stringify({ recommendation: aiContent, sources: allDocs.slice(0, 4) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function 错误:', error?.stack || error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error?.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
