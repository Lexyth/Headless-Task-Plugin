import { GoogleGenAI, Type } from "@google/genai";
import { RequirementType } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert Quest Designer for a Task Management System. 
Your goal is to convert user requests into structured Task JSON objects.
The system supports:
- Numeric requirements (count target)
- Boolean requirements (checklist)
- Grouped requirements (nested)
- XOR logic (mutually exclusive options)
- Optional requirements

Strictly return JSON conforming to the requested schema.
`;

export const generateTaskFromPrompt = async (prompt: string): Promise<any> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            timeLimit: { type: Type.NUMBER, description: "Time limit in seconds (optional)" },
            requirements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["BOOLEAN", "NUMERIC", "GROUP"] },
                  isOptional: { type: Type.BOOLEAN },
                  xorGroup: { type: Type.STRING, description: "Group ID for mutually exclusive items" },
                  targetValue: { type: Type.NUMBER, description: "Required for NUMERIC type" },
                  children: {
                    type: Type.ARRAY,
                    description: "Required for GROUP type. Nested requirements.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                             title: { type: Type.STRING },
                             type: { type: Type.STRING, enum: ["BOOLEAN", "NUMERIC"] },
                             targetValue: { type: Type.NUMBER }
                        }
                    } 
                  }
                },
                required: ["title", "type"]
              }
            }
          },
          required: ["title", "description", "requirements"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
