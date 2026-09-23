'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Flame, Trophy, Calendar, LogOut, CheckCircle } from 'lucide-react';
import AuthModal from '@/components/AuthModal';

export default function MyPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attending, setAttending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data || { email: user.email, current_streak: 0, longest_streak: 0 });
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    setAttending(true);
    const res = await fetch('/api/attendance', { method: 'POST' });
    if (res.ok) {
      await fetchProfile();
    }
    setAttending(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">불러오는 중...</div>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-950 py-12 px-4 flex items-center justify-center">
        <AuthModal />
      </main>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const isCheckedInToday = profile.last_visited_at === todayStr;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 max-w-md mx-auto space-y-6">
      {/* 1. 상단 유저 프로필 헤더 */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Learner Profile</span>
          <h1 className="text-base font-bold text-white mt-0.5">{profile.display_name || profile.email}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Streak 대시보드 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 현재 스트릭 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl relative overflow-hidden">
          <div className="flex items-center gap-2 text-orange-400 mb-2">
            <Flame className="w-5 h-5 fill-orange-400/20" />
            <span className="text-xs font-semibold">연속 학습</span>
          </div>
          <p className="text-3xl font-extrabold text-white">{profile.current_streak || 0}<span className="text-sm font-normal text-slate-400 ml-1">일</span></p>
          <p className="text-[10px] text-slate-500 mt-2">매일 1단어 이상 학습 달성</p>
        </div>

        {/* 최장 스트릭 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Trophy className="w-5 h-5" />
            <span className="text-xs font-semibold">최고 기록</span>
          </div>
          <p className="text-3xl font-extrabold text-white">{profile.longest_streak || 0}<span className="text-sm font-normal text-slate-400 ml-1">일</span></p>
          <p className="text-[10px] text-slate-500 mt-2">나의 역대 최대 Streak</p>
        </div>
      </div>

      {/* 3. 오늘 출석 체크 액션 버튼 */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center">
        <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-sm mb-1">오늘의 학습 출석 완료하기</h3>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          {isCheckedInToday ? '오늘의 출석이 완료되었습니다! 내일도 연속 학습을 이어가세요.' : '오늘의 단어 학습 카드를 마스터하고 출석 도장을 찍으세요.'}
        </p>

        <button
          onClick={handleCheckIn}
          disabled={isCheckedInToday || attending}
          className={`w-full py-3 px-4 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
            isCheckedInToday
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 cursor-default'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
          }`}
        >
          {attending ? '출석 기록 중...' : isCheckedInToday ? <><CheckCircle className="w-4 h-4" /> 오늘 출석 완료</> : '🔥 오늘 학습 완료 및 출석하기'}
        </button>
      </div>
    </main>
  );
}