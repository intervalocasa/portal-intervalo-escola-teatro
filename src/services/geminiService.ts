
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface PedagogicalAnalysis {
  status_turma: {
    clima_emocional: string;
    nivel_engajamento: "alto" | "medio" | "baixo";
  };
  pilares_individuais: {
    acolhimento: "baixo" | "medio" | "alto";
    presenca: "baixo" | "medio" | "alto";
    desafio: "baixo" | "medio" | "alto";
    clareza: "baixo" | "medio" | "alto";
    coletividade: "baixo" | "medio" | "alto";
  };
  analise_qualitativa: string;
  alerta_coordenacao: boolean;
}

const SYSTEM_INSTRUCTION = `
Você é o assistente de análise pedagógica da Intervalo Escola de Teatro. Sua tarefa é analisar o feedback de um aluno sobre sua experiência em uma aula de teatro.

Critérios de Análise (Os 5 Pilares):
- Segurança Psicológica (Acolhimento): O aluno se sentiu acolhido pela turma e pelo professor?
- Imersão (Presença): O aluno conseguiu se conectar com o "aqui e agora" da aula?
- Ruptura (Desafio): Houve superação de limites ou saída da zona de conforto?
- Consciência Artística (Clareza): Ficou claro o propósito técnico dos exercícios realizados?
- Sincronia Grupal (Coletividade): Como foi a troca e a escuta com os colegas de turma?

Regras de Resposta:
- O tom de voz deve ser profissional, voltado para a pedagogia teatral e extremamente acolhedor.
- Não utilize números ou notas frias. Utilize conceitos de intensidade (Baixo, Médio, Alto).
- Considere que este feedback é específico para a vivência daquela turma. Se o aluno mencionar "o grupo" ou "os colegas", priorize o pilar de Coletividade.
- Retorne um JSON seguindo exatamente o formato solicitado abaixo.

FORMATO DE RESPOSTA (JSON):
{
  "status_turma": {
    "clima_emocional": "string (ex: Tenso, Criativo, Acolhedor)",
    "nivel_engajamento": "alto/medio/baixo"
  },
  "pilares_individuais": {
    "acolhimento": "baixo/medio/alto",
    "presenca": "baixo/medio/alto",
    "desafio": "baixo/medio/alto",
    "clareza": "baixo/medio/alto",
    "coletividade": "baixo/medio/alto"
  },
  "analise_qualitativa": "Uma frase resumindo a experiência do aluno nesta turma hoje.",
  "alerta_coordenacao": boolean
}
`;

export async function analyzePedagogicalFeedback(
  studentName: string,
  className: string,
  openAnswers: Record<string, string>,
  notes: Record<string, number>
): Promise<PedagogicalAnalysis | null> {
  const prompt = `
Aluno: ${studentName}
Turma: ${className}
Relatos do Aluno:
${Object.entries(openAnswers).map(([id, answer]) => `- Campo ${id}: ${answer}`).join("\n")}

Notas (de 0 para "Nada satisfeito" a 4 para "Muito satisfeito"):
${Object.entries(notes).map(([id, note]) => `- Critério ${id}: ${note}`).join("\n")}

Por favor, forneça a análise pedagógica com base nestas informações da Intervalo Escola de Teatro.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status_turma: {
              type: Type.OBJECT,
              properties: {
                clima_emocional: { type: Type.STRING },
                nivel_engajamento: { type: Type.STRING, enum: ["alto", "medio", "baixo"] }
              },
              required: ["clima_emocional", "nivel_engajamento"]
            },
            pilares_individuais: {
              type: Type.OBJECT,
              properties: {
                acolhimento: { type: Type.STRING, enum: ["baixo", "medio", "alto"] },
                presenca: { type: Type.STRING, enum: ["baixo", "medio", "alto"] },
                desafio: { type: Type.STRING, enum: ["baixo", "medio", "alto"] },
                clareza: { type: Type.STRING, enum: ["baixo", "medio", "alto"] },
                coletividade: { type: Type.STRING, enum: ["baixo", "medio", "alto"] }
              },
              required: ["acolhimento", "presenca", "desafio", "clareza", "coletividade"]
            },
            analise_qualitativa: { type: Type.STRING },
            alerta_coordenacao: { type: Type.BOOLEAN }
          },
          required: ["status_turma", "pilares_individuais", "analise_qualitativa", "alerta_coordenacao"]
        }
      }
    });

    if (response && response.text) {
      return JSON.parse(response.text.trim()) as PedagogicalAnalysis;
    }
    return null;
  } catch (error) {
    console.error("Error analyzing pedagogical feedback:", error);
    return null;
  }
}
