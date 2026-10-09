// ============================================
// unsubscribe Edge Function
// GET ?token=xxx: 删除订阅记录
// ============================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(buildHtml('退订失败', '缺少退订令牌，请通过邮件中的退订链接操作。', false), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: sub, error: findError } = await supabase
      .from('subscriptions')
      .select('id, email')
      .eq('unsubscribe_token', token)
      .single()

    if (findError || !sub) {
      return new Response(buildHtml('退订失败', '未找到对应的订阅记录，可能已经退订过了。', false), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const { error: deleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('unsubscribe_token', token)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return new Response(buildHtml('退订失败', '退订操作失败，请稍后重试。', false), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    return new Response(buildHtml('退订成功', `邮箱 ${sub.email} 已成功退订玄学宜do每周宜忌。感谢你曾经的陪伴 ✦`, true), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })

  } catch (err) {
    console.error('Unsubscribe error:', err?.stack || err)
    return new Response(buildHtml('退订失败', '服务器错误，请稍后重试。', false), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
})

function buildHtml(title: string, message: string, success: boolean) {
  const color = success ? '#4ade80' : '#f87171'
  const icon = success ? '✦' : '⚠'
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} · 玄学宜do</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0a0a12; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .card { max-width: 480px; width: 90%; background: #12121f; border-radius: 16px;
    padding: 48px 32px; text-align: center; border: 1px solid #2a2a40; }
  .icon { font-size: 48px; margin-bottom: 16px; color: ${color}; }
  h1 { margin: 0 0 16px; font-size: 24px; color: #e8e6f0; }
  p { margin: 0 0 24px; font-size: 15px; color: #8b87a8; line-height: 1.6; }
  a { display: inline-block; padding: 12px 28px; background: #7c5cbf; color: #fff;
    text-decoration: none; border-radius: 8px; font-size: 14px; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="https://xuanxue.rowangie.top">返回玄学宜do</a>
</div>
</body>
</html>`
}
