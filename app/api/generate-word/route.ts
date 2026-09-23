// app/api/generate-word/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CANDIDATE_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  
  // "gemini-2.5-pro",
  // "gemini-3.6-flash",
  // "gemini-2.5-flash",
  // "gemini-3.1-flash-lite-preview",
  // "gemini-2.5-flash-lite",
  // "gemini-1.5-pro",
  // "gemini-1.5-flash",
];

function safeJsonParse(rawText: string) {
  let cleanText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (initialError) {
    const fixedText = cleanText.replace(/\\/g, "\\\\");
    return JSON.parse(fixedText);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { word, category = "business" } = await req.json();

    if (!word) {
      return NextResponse.json(
        { error: "학습할 단어가 입력되지 않았습니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
당신은 바쁜 성인을 위한 실전 영단어 AI 멘토입니다.
요청된 단어("${word}")와 카테고리("${category}")에 맞추어 오직 순수 JSON 형식으로만 답변하세요. 다른 설명이나 마크다운 백틱(\`\`\`json)은 절대로 포함하지 마세요.

==================================================
[성인 학습자 콘텐츠 제공 원칙]
==================================================
1. 사전적 정의보다는 실제 직장, 비즈니스 이메일, 해외 여행, 현지 슬랭 등 실전에서 쓰이는 "뉘앙스(Nuance)"에 집중하세요.
2. 예문(example_sentence)은 바쁜 직장인들이 출퇴근길에 3초 만에 이해할 수 있는 자연스럽고 유용한 문장이어야 합니다.
3. 발음 및 억양 가이드(speaking_tip)에는 원어민 연음이나 강조할 억양 포인트(예: "touch base는 연속해서 '터치베이스'처럼 부드럽게 연결하세요")를 포함하세요.

==================================================
[JSON 반환 스키마]
==================================================
{
  "word": "${word}",
  "phonetic": "발음기호 (예: /fəʊkəs/)",
  "meaning": "핵심 한글 뜻",
  "category": "${category}",
  "nuance": "성인을 위한 실전 뉘앙스 및 사전적 뜻과의 차이점 설명",
  "example_sentence": "실전 영문 예문",
  "example_translation": "자연스러운 한글 번역",
  "speaking_tip": "원어민 발음 및 억양 팁",
  "quick_quiz": {
    "question": "단어 활용 간단 퀴즈 (빈칸 채우기 등)",
    "options": ["보기1", "보기2", "보기3"],
    "answer_index": 0,
    "explanation": "해설"
  }
}
`;

    let lastError: any = null;
    let parsedData = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        parsedData = safeJsonParse(responseText);
        break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!parsedData) {
      return NextResponse.json(
        { error: "단어 분석 생성 실패", details: lastError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}