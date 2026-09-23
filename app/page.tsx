'use client';

import { useState } from 'react';
import WordCard, { WordData } from '@/components/WordCard';
import PushSubscriptionButton from '@/components/PushSubscriptionButton';
import ImageWordUploader from '@/components/ImageWordUploader';

const SAMPLE_WORD: WordData = {
  word: 'Touch base',
  phonetic: '/tʌtʃ beɪs/',
  meaning: '(건으로) 간단히 연락하다 / 소통하다',
  category: 'Business English',
  nuance:
    '공식적인 긴 미팅이 아니라, 진행 상황을 가볍게 점검하거나 의견을 교환하기 위해 연락할 때 쓰는 대표적인 직장인 표현입니다.',
  example_sentence: "Let's touch base on this before EOD.",
  example_translation: '오늘 퇴근 전(EOD)에 이 건으로 간단히 이야기 나누시죠.',
  speaking_tip: "'터치'와 '베이스'를 멈추지 말고 '터치베이스'처럼 이어서 발음하세요.",
  quick_quiz: {
    question: "다음 중 'Touch base'와 가장 가까운 표현은?",
    options: ['진행 상황 짧게 체크하기', '계약서에 서명하기', '사과 인사 전하기'],
    answer_index: 0,
    explanation: "'Touch base'는 간단한 경과 보고나 연락을 뜻합니다.",
  },
};

export default function HomePage() {
  const [wordData, setWordData] = useState<WordData>(SAMPLE_WORD);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 학습 완료 & 다음 단어 불러오기
  const handleFetchNextWord = async () => {
    setLoading(true);
    setToastMessage(null);

    try {
      // 1. 학습 완료에 따른 출석 체크 API 자동 호출
      const attendRes = await fetch('/api/attendance', { method: 'POST' });
      if (attendRes.ok) {
        const attendData = await attendRes.json();
        if (attendData.success) {
          setToastMessage(`🎉 오늘 학습 완료! ${attendData.current_streak}일 연속 학습 중!`);
        }
      }

      // 2. 다음 AI 단어 추천 생성
      const wordRes = await fetch('/api/generate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: 'Leverage', category: 'Business' }),
      });

      if (wordRes.ok) {
        const newWord = await wordRes.json();
        setWordData(newWord);
      }
    } catch (err) {
      console.error('학습 및 단어 불러오기 실패:', err);
    } finally {
      setLoading(false);
      // 토스트 메시지 3초 후 자동 숨김
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 flex flex-col items-center justify-center gap-5 relative">
      {/* 출석 축하 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-full shadow-lg text-xs animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 서비스 타이틀 헤더 */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Adult AI Vocab <span className="text-blue-500 text-sm font-normal">3-Min Coach</span>
        </h1>
        <p className="text-xs text-slate-400">
          바쁜 직장인을 위한 출퇴근 맞춤 실전 영단어
        </p>
      </div>

      {/* 상단 액션 영역 (푸시 알림 구독 & OCR 이미지 업로더) */}
      <div className="w-full max-w-md space-y-3">
        <PushSubscriptionButton />
        <ImageWordUploader onWordGenerated={(newWord) => setWordData(newWord)} />
      </div>

      {/* 플래시 카드 UI 영역 */}
      <div className="w-full max-w-md">
        {loading ? (
          <div className="w-full h-[520px] bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center">
            <p className="text-xs text-slate-400 animate-pulse">
              AI 멘토가 다음 실전 단어를 준비 중입니다...
            </p>
          </div>
        ) : (
          <WordCard data={wordData} onNext={handleFetchNextWord} />
        )}
      </div>
    </main>
  );
}