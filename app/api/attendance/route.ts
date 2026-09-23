import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  // 현재 프로필 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const todayStr = new Date().toISOString().split('T')[0];
  const lastVisitedStr = profile?.last_visited_at;

  // 이미 오늘 출석한 경우
  if (lastVisitedStr === todayStr) {
    return NextResponse.json({
      message: '이미 오늘 출석 완료되었습니다.',
      current_streak: profile.current_streak,
    });
  }

  let newStreak = 1;
  if (lastVisitedStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 어제 접속했으면 연속 일수 증가, 안 했으면 1로 리셋
    if (lastVisitedStr === yesterdayStr) {
      newStreak = (profile.current_streak || 0) + 1;
    }
  }

  const newLongest = Math.max(newStreak, profile?.longest_streak || 0);

  // DB 업데이트
  await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_visited_at: todayStr,
    })
    .eq('id', user.id);

  return NextResponse.json({
    success: true,
    message: `🎉 출석 완료! ${newStreak}일 연속 학습 중입니다.`,
    current_streak: newStreak,
    longest_streak: newLongest,
  });
}