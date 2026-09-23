// app/page.tsx
'use client';

import { useState } from 'react';
import WordCard, { WordData } from '@/components/WordCard';
import PushSubscriptionButton from '@/components/PushSubscriptionButton';

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

  // 다음 단어 AI 생성 호출
  const handleFetchNextWord = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: 'Leverage', category: 'Business' }),
      });
      if (res.ok) {
        const data = await res.json();
        setWordData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 flex flex-col items-center justify-center gap-8">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Adult AI Vocab <span className="text-blue-500 text-sm font-normal">3-Min Coach</span>
        </h1>
        <p className="text-xs text-slate-400">
          바쁜 직장인을 위한 출퇴근 맞춤 실전 영단어
        </p>
      </div>

      {/* 푸시 알림 배너 */}
      <div className="w-full max-w-md">
        <PushSubscriptionButton />
      </div>

      {/* 카드 UI */}
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