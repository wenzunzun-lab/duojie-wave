import { GoogleGenAI } from "@google/genai";
import { AIAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes a physics wave problem image.
 */
export const analyzeWaveProblem = async (
  imageFile: File,
  additionalContext: string
): Promise<AIAnalysisResult> => {
  try {
    const model = "gemini-2.5-flash";
    
    // Convert file to base64
    const base64Data = await fileToGenerativePart(imageFile);

    const prompt = `
      你是一位精通高中物理的助教，特别擅长机械波、简谐运动以及波的多解问题。
      
      你的任务是分析用户上传的物理题目图片（通常包含波形图 y-x 和振动图 y-t）。
      
      1. **解答题目**：提供清晰、分步的中文讲解。
      2. **重点解释多解性**：如果题目涉及多解性（例如“波峰之间的距离是 X”，这可能是 n*lambda；或者只给出了两个时刻的波形，波速可能有多个解；或者传播方向未定导致双向解），请务必详细解释这些多解情况（空间周期性、时间周期性、双向性）。
      3. **提取参数**：尽可能从图像或文本中提取以下参数，以便我更新模拟器：
         - 振幅 Amplitude (A) (cm)
         - 波长 Wavelength (lambda) (m)
         - 周期 Period (T) (s)
         - 传播方向 Direction (1 代表沿 +x 传播, -1 代表沿 -x 传播)
      
      用户的具体问题/补充信息："${additionalContext}"

      重要：在你的回复最后，必须严格输出一个 JSON 块（后面不要有任何内容），包含检测到的参数。
      格式：
      \`\`\`json
      {
        "amplitude": number,
        "wavelength": number,
        "period": number,
        "direction": 1 or -1
      }
      \`\`\`
      尽可能使用标准 SI 单位（米、秒），但振幅保持为 cm 以方便可视化。如果未找到某个值，请使用 null。
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
              inlineData: {
                  data: base64Data,
                  mimeType: imageFile.type
              }
          },
          { text: prompt }
        ]
      },
    });

    const fullText = response.text || "";
    
    // Extract JSON if present
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
    let suggestedParams = undefined;
    let displayText = fullText;

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1];
        suggestedParams = JSON.parse(jsonStr);
        // Remove the JSON block from the display text to keep it clean
        displayText = fullText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
      } catch (e) {
        console.error("Failed to parse AI suggested parameters", e);
      }
    }

    return {
      text: displayText,
      suggestedParams
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("分析图片失败，请重试。");
  }
};

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}