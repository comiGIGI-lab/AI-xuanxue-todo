// ============================================
// subscribe Edge Function
// POST: 写入订阅记录，发送测试邮件
// ============================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders })
  }

  try {
    const body = await req.json()
    const { email, birth_year, birth_month, birth_day, send_weekday, send_hour } = body

    // 输入校验
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: '请输入有效的邮箱地址' }), { status: 400, headers: jsonHeaders })
    }
    if (!birth_year || !birth_month || !birth_day) {
      return new Response(JSON.stringify({ error: '请填写完整的出生日期' }), { status: 400, headers: jsonHeaders })
    }
    if (send_weekday === undefined || send_weekday < 0 || send_weekday > 6) {
      return new Response(JSON.stringify({ error: '请选择发送星期' }), { status: 400, headers: jsonHeaders })
    }
    if (send_hour === undefined || send_hour < 0 || send_hour > 23) {
      return new Response(JSON.stringify({ error: '请选择发送时间' }), { status: 400, headers: jsonHeaders })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 检查是否已订阅
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: '该邮箱已订阅，请勿重复提交' }), { status: 409, headers: jsonHeaders })
    }

    // 写入订阅记录
    const { data: sub, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        email,
        birth_year: parseInt(birth_year),
        birth_month: parseInt(birth_month),
        birth_day: parseInt(birth_day),
        send_weekday: parseInt(send_weekday),
        send_hour: parseInt(send_hour),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: '订阅失败，请稍后重试' }), { status: 500, headers: jsonHeaders })
    }

    // 生成专属 weekly 链接
    const weeklyUrl = `${SUPABASE_URL}/functions/v1/weekly-send?preview=1&token=${sub.unsubscribe_token}`
    const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?token=${sub.unsubscribe_token}`

    // 发送测试邮件
    const emailHtml = buildEmailHtml({
      email,
      birth_year: parseInt(birth_year),
      birth_month: parseInt(birth_month),
      birth_day: parseInt(birth_day),
      send_weekday: parseInt(send_weekday),
      send_hour: parseInt(send_hour),
      weeklyUrl,
      unsubscribeUrl,
      isTest: true,
    })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rowangie <onboarding@resend.dev>',
        to: [email],
        subject: '✦ 玄学宜do · 订阅成功！你的专属每周宜忌已就绪',
        html: emailHtml,
      }),
    })

    if (!resendRes.ok) {
      const resendErr = await resendRes.text()
      console.error('Resend error:', resendErr)
      // 订阅已写入，邮件失败不影响订阅成功
      return new Response(JSON.stringify({
        success: true,
        message: '订阅成功！（测试邮件发送失败，请检查邮箱地址）',
        warning: resendErr,
      }), { status: 200, headers: jsonHeaders })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `订阅成功！测试邮件已发送至 ${email}，每${WEEKDAY_NAMES[parseInt(send_weekday)]} ${send_hour}:00 将收到你的专属宜忌`,
    }), { status: 200, headers: jsonHeaders })

  } catch (err) {
    console.error('Subscribe error:', err?.stack || err)
    return new Response(JSON.stringify({ error: err.message || '服务器错误' }), { status: 500, headers: jsonHeaders })
  }
})

function buildEmailHtml(opts: {
  email: string
  birth_year: number
  birth_month: number
  birth_day: number
  send_weekday: number
  send_hour: number
  weeklyUrl: string
  unsubscribeUrl: string
  isTest?: boolean
  weeklyContent?: string
}) {
  const { email, birth_year, birth_month, birth_day, send_weekday, send_hour, weeklyUrl, unsubscribeUrl, isTest, weeklyContent } = opts
  const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>玄学宜do · 每周宜忌</title>
<style>
  body { margin: 0; padding: 0; background: #0a0a12; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; background: #12121f; border-radius: 16px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #1a1a3e 0%, #0a0a12 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #2a2a40; }
  .header h1 { margin: 0 0 8px; font-size: 28px; color: #e8e6f0; font-weight: 700; }
  .header p { margin: 0; font-size: 14px; color: #8b87a8; letter-spacing: 0.1em; }
  .badge { display: inline-block; background: rgba(212,165,255,0.15); color: #d4a5ff; border: 1px solid #d4a5ff; border-radius: 20px; padding: 4px 16px; font-size: 12px; margin-top: 12px; }
  .body { padding: 32px; }
  .info-box { background: #1a1a2e; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; border-left: 3px solid #7c5cbf; }
  .info-box p { margin: 6px 0; font-size: 14px; color: #8b87a8; }
  .info-box strong { color: #d4a5ff; }
  .cta-btn { display: block; width: fit-content; margin: 0 auto 24px; padding: 14px 32px; background: #7c5cbf; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; }
  .content-box { background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2a2a40; }
  .content-box h3 { margin: 0 0 16px; font-size: 16px; color: #d4a5ff; }
  .content-box p { margin: 8px 0; font-size: 14px; color: #e8e6f0; line-height: 1.8; }
  .footer { padding: 24px 32px; text-align: center; border-top: 1px solid #2a2a40; }
  .footer p { margin: 4px 0; font-size: 12px; color: #8b87a8; }
  .footer a { color: #7c5cbf; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>✦ 玄学宜do</h1>
    <p>一个不需要具体出生时刻的综合占星平台与每日宜忌</p>
    ${isTest ? '<span class="badge">✉ 订阅确认邮件</span>' : '<span class="badge">✦ 每周宜忌</span>'}
  </div>
  <div class="body">
    ${isTest ? `
    <div class="info-box">
      <p>🎉 <strong>订阅成功！</strong>你的专属每周宜忌已就绪</p>
      <p>📅 出生日期：<strong>${birth_year}年${birth_month}月${birth_day}日</strong></p>
      <p>⏰ 发送时间：每<strong>${WEEKDAY_NAMES[send_weekday]} ${send_hour}:00</strong></p>
      <p>📧 发送至：<strong>${email}</strong></p>
    </div>
    <a class="cta-btn" href="${weeklyUrl}">✦ 查看我的专属每周宜忌</a>
    ` : `
    <div class="info-box">
      <p>📅 出生日期：<strong>${birth_year}年${birth_month}月${birth_day}日</strong></p>
      <p>⏰ 本周宜忌已为你推算完毕</p>
    </div>
    ${weeklyContent ? `<div class="content-box"><h3>✦ 本周宜忌</h3><p>${weeklyContent.replace(/\n/g, '<br>')}</p></div>` : ''}
    <a class="cta-btn" href="${weeklyUrl}">✦ 查看完整每周宜忌</a>
    `}
  </div>
  <div class="footer">
    <p>由 <strong>Rowangie</strong> 用爱发电 · 玄学宜do</p>
    <p>如不想继续接收，<a href="${unsubscribeUrl}">点击退订</a></p>
  </div>
</div>
</body>
</html>
  `
}
