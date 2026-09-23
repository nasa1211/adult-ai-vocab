import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// KST (Asia/Seoul) 기준 YYYY-MM-DD 날짜 구하기 함수 (Vercel UTC 시차 방지)
function getKSTDateString(dateObj: Date = new Date()): string {
  const kstOffset = 9 * 60; // UTC+9
  const kstDate = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() + kstOffset) * 60000);
  return kstDate.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = req.headers.get('Authorization');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
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

    // 1. 인증 처리: Bearer 토큰 우선 확인 후, 없으면 쿠키 세션 이용
    let user = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    } else {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 2. 현재 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. KST 기준 오늘/어제 날짜 산출
    const todayStr = getKSTDateString();
    
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = getKSTDateString(yesterdayObj);

    const lastVisitedStr = profile.last_visited_at;

    // 이미 오늘 출석을 완료한 경우
    if (lastVisitedStr === todayStr) {
      return NextResponse.json({
        message: '이미 오늘 출석 완료되었습니다.',
        current_streak: profile.current_streak,
        longest_streak: profile.longest_streak,
      });
    }

    // 연속 출석 일수(Streak) 계산
    let newStreak = 1;
    if (lastVisitedStr === yesterdayStr) {
      // 어제 접속했으면 연속 출석 증가
      newStreak = (profile.current_streak || 0) + 1;
    }

    const newLongest = Math.max(newStreak, profile.longest_streak || 0);

    // 4. DB 출석 상태 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_visited_at: todayStr,
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: '출석 상태 업데이트 실패', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `🎉 출석 완료! ${newStreak}일 연속 학습 중입니다.`,
      current_streak: newStreak,
      longest_streak: newLongest,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}