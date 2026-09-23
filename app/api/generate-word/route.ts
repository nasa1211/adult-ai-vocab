import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// 1. 유효한 최신 모델 우선순위 배열 (존재하지 않는 모델명 제거)
const FALLBACK_MODELS = [
  "gemini-1.5-flash", // 1순위: 가장 빠르고 안정적 (약 0.8초)
  "gemini-1.5-pro",   // 2순위: Flash 실패 시 비상용 폴백
];

// 2. Structured Outputs JSON 스키마 정의 (속도 및 출력 정확도 향상)
const wordResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    word: { type: SchemaType.STRING },
    phonetic: { type: SchemaType.STRING },
    meaning: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    nuance: { type: SchemaType.STRING },
    example_sentence: { type: SchemaType.STRING },
    example_translation: { type: SchemaType.STRING },
    speaking_tip: { type: SchemaType.STRING },
    quick_quiz: {
      type: SchemaType.OBJECT,
      properties: {
        question: { type: SchemaType.STRING },
        options: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        answer_index: { type: SchemaType.INTEGER },
        explanation: { type: SchemaType.STRING },
      },
      required: ["question", "options", "answer_index", "explanation"],
    },
  },
  required: [
    "word",
    "phonetic",
    "meaning",
    "category",
    "nuance",
    "example_sentence",
    "example_translation",
    "speaking_tip",
    "quick_quiz",
  ],
};

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
요청된 단어: "${word}", 카테고리: "${category}"

[원칙]
1. 사전적 정의보다 실제 직장, 비즈니스 이메일, 슬랭 등 실전 "뉘앙스(Nuance)" 중심 설명.
2. 예문은 출퇴근길 3초 만에 이해할 수 있는 자연스럽고 유용한 문장.
3. 발음 팁에는 원어민 연음이나 억양 강조 포인트 포함.
`;

    let parsedData = null;
    let lastError = null;

    // 3. Fallback 순회 루프
    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: wordResponseSchema, // 스키마 전달로 빠른 직렬화
            temperature: 0.2,
          },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        parsedData = JSON.parse(responseText);
        break; // 성공 시 즉시 루프 종료 (다음 모델 시도하지 않음)
      } catch (err: any) {
        console.warn(`[Gemini API Warning] ${modelName} 호출 실패. 다음 모델로 전환합니다.`, err?.message);
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
    console.error("[Gemini API Error]", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}