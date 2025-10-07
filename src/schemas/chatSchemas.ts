import { z } from 'zod';

// 🎯 SCHEMA PARA DADOS DO LEAD
export const LeadDataSchema = z.object({
  nome: z.string().nullable().optional(),
  empresa: z.string().nullable().optional(),
  contato: z.string().nullable().optional(),
  pais: z.string().nullable().optional(),
  necessidade: z.string().nullable().optional(),
  urgencia: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  numVendedores: z.string().nullable().optional(),
  numLeadsMensais: z.string().nullable().optional(),
});

// 🎯 SCHEMA PARA RESPOSTA DA IA
export const AIResponseSchema = z.object({
  response: z.string().describe("Resposta conversacional curta e natural (máximo 2 frases)"),
  extractedData: LeadDataSchema.describe("Dados extraídos da mensagem atual"),
  isComplete: z.boolean().describe("Se a coleta de dados está completa"),
  confidence: z.number().min(0).max(1).describe("Nível de confiança da extração (0.0 a 1.0)")
});

// 🎯 TIPOS DERIVADOS DOS SCHEMAS
export type LeadData = z.infer<typeof LeadDataSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;

// 🎯 SCHEMA PARA ANÁLISE DE DADOS (usado na API de análise)
export const AnalysisDataSchema = z.object({
  urgenciaDias: z.number().describe("Urgência convertida para dias"),
  cargoNivel: z.string().describe("Nível do cargo (estagiario, junior, senior, gerente, diretor, ceo, etc.)"),
  numVendedores: z.number().describe("Número de vendedores como número"),
  numLeadsMensais: z.number().describe("Número de leads mensais como número"),
  urgenciaOriginal: z.string().describe("Urgência original como informada"),
  cargoOriginal: z.string().describe("Cargo original como informado"),
  numVendedoresOriginal: z.string().describe("Número de vendedores original como string"),
  numLeadsMensaisOriginal: z.string().describe("Número de leads mensais original como string")
});

export type AnalysisData = z.infer<typeof AnalysisDataSchema>;

// 🎯 SCHEMA PARA ANÁLISE DE TEMPERATURA
export const TemperatureAnalysisSchema = z.object({
  temperatura: z.enum(['quente', 'morno', 'frio']).describe("Temperatura do lead baseada no interesse"),
  confidence: z.number().min(0).max(1).describe("Confiança da análise de temperatura"),
  indicadores: z.array(z.string()).describe("Indicadores que levaram à classificação"),
  reasoning: z.string().describe("Justificativa da classificação")
});

export type TemperatureAnalysis = z.infer<typeof TemperatureAnalysisSchema>;

// 🎯 SCHEMA PARA SCORE DE QUALIFICAÇÃO
export const ScoreBreakdownSchema = z.object({
  score: z.number(),
  maxScore: z.number(),
  details: z.string()
});

export const ScoreResultSchema = z.object({
  totalScore: z.number(),
  maxScore: z.number(),
  percentage: z.number(),
  breakdown: z.record(z.string(), ScoreBreakdownSchema),
  processedData: z.record(z.string(), z.any()),
  temperatureAnalysis: TemperatureAnalysisSchema.optional()
});

export type ScoreResult = z.infer<typeof ScoreResultSchema>;

// 🎯 SCHEMA PARA DADOS COMPLETOS PARA GOOGLE SHEETS
export const GoogleSheetsDataSchema = z.object({
  leadId: z.string(),
  tsCriacaoLead: z.string(),
  tsUltimoContato: z.string(),
  nome: z.string().nullable().optional(),
  empresa: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  necessidade: z.string().nullable().optional(),
  urgencia: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  numVendedores: z.string().nullable().optional(),
  numLeadsMensais: z.string().nullable().optional(),
  escore: z.number(),
  conversationStatus: z.string(),
  dataFollowup: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  temperatura: z.enum(['quente', 'morno', 'frio'])
});

export type GoogleSheetsData = z.infer<typeof GoogleSheetsDataSchema>;
