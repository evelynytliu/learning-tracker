import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Magic link / OAuth callback：把 ?code=... 換成 cookie session
// 然後導去 next (預設 /)。
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // 失敗：把錯誤訊息丟回 login 顯示
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
