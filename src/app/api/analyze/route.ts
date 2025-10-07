import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
import { LeadData, ScoreResult, AnalysisDataSchema, AnalysisData, TemperatureAnalysisSchema, TemperatureAnalysis, GoogleSheetsData } from '../../../schemas/chatSchemas';

// 🎯 INTERFACE PARA DADOS DO LEAD (agora importada de chatSchemas.ts)

// 🎯 INTERFACE PARA DADOS PROCESSADOS PELA IA
interface ProcessedLeadData {
  nome?: string;
  empresa?: string;
  email?: string;
  telefone?: string;
  pais?: string;
  necessidade?: string;
  // Dados processados para cálculo
  urgenciaDias?: number; // Urgência convertida para dias
  cargoNivel?: string;
  numVendedores?: number; // Número exato de vendedores
  numLeadsMensais?: number; // Número exato de leads mensais
  // Dados originais para referência
  urgenciaOriginal?: string;
  cargoOriginal?: string;
  numVendedoresOriginal?: string;
  numLeadsMensaisOriginal?: string;
}

// 🎯 INTERFACE PARA RESULTADO DO SCORE (agora importada de chatSchemas.ts)

// 🎯 AGENTE LANGCHAIN PARA INTERPRETAÇÃO INTELIGENTE DE DADOS
async function interpretLeadDataWithAI(leadData: LeadData): Promise<ProcessedLeadData> {
  // console.log('🤖 [ANALYZER] Interpretando dados com LangChain:', leadData);

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ [CONFIG] Chave da API OpenAI não configurada');
    throw new Error('Chave da API OpenAI não configurada');
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.1, // Baixa temperatura para consistência
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const promptTemplate = new PromptTemplate({
    template: `Você é um especialista em interpretação de dados de leads para qualificação de vendas.

DADOS BRUTOS DO LEAD:
{leadData}

SUA MISSÃO:
1. **INTERPRETAR** os dados brutos e extrair informações estruturadas
2. **CONVERTER** urgência para dias (ex: "6 meses" = 180 dias, "2 semanas" = 14 dias)
3. **CLASSIFICAR** cargo por nível de autoridade
4. **EXTRAIR** números exatos de vendedores e leads mensais
5. **MANTER** dados originais para referência

REGRAS DE CONVERSÃO:
- 1 mês = 30 dias
- 1 semana = 7 dias
- 1 ano = 365 dias
- Palavras como "urgente", "asap", "imediato" = 7 dias
- "Não urgente", "sem prazo" = 365 dias

CLASSIFICAÇÃO DE CARGOS:
- c_level: CEO, CTO, CFO, COO, Presidente, Founder, VP, Diretor
- manager: Manager, Gerente, Coordenador, Supervisor, Chefe
- analista: Analista, Especialista, Consultor, Assessor
- estagiario: Estagiário, Intern, Trainee, Junior, Assistente
- outro: Qualquer outro cargo não listado

RESPOSTA ESPERADA (JSON):
{{
  "urgenciaDias": número_em_dias,
  "cargoNivel": "c_level|manager|analista|estagiario|outro",
  "numVendedores": número_exato,
  "numLeadsMensais": número_exato,
  "urgenciaOriginal": "texto_original",
  "cargoOriginal": "texto_original",
  "numVendedoresOriginal": "texto_original",
  "numLeadsMensaisOriginal": "texto_original"
}}

EXEMPLOS:
- "Preciso em 6 meses" → urgenciaDias: 180
- "Temos 2 semanas" → urgenciaDias: 14
- "É urgente" → urgenciaDias: 7
- "CEO da empresa" → cargoNivel: "c_level"
- "15 vendedores" → numVendedores: 15
- "800 leads por mês" → numLeadsMensais: 800

Responda APENAS com o JSON, sem explicações adicionais.`,
    inputVariables: ["leadData"]
  });

  const formattedPrompt = await promptTemplate.format({
    leadData: JSON.stringify(leadData, null, 2)
  });

  const systemMessage = new SystemMessage("Você é um especialista em interpretação de dados de leads. Responda sempre com JSON válido.");
  const humanMessage = new HumanMessage(formattedPrompt);

  try {
    // 🎯 USAR STRUCTURED OUTPUT para análise de dados
    const structuredModel = model.withStructuredOutput(AnalysisDataSchema);
    const response = await structuredModel.invoke([systemMessage, humanMessage]);
    // console.log('🤖 [ANALYZER] Resposta estruturada do modelo:', response);
    
    // 🎯 A RESPOSTA JÁ VEM ESTRUTURADA - não precisa de JSON.parse
    const parsedData = response as AnalysisData;
    
    // Combinar dados processados com dados originais
    const processedData: ProcessedLeadData = {
      nome: leadData.nome || undefined,
      empresa: leadData.empresa || undefined,
      pais: leadData.pais || undefined,
      necessidade: leadData.necessidade || undefined,
      urgenciaDias: parsedData.urgenciaDias,
      cargoNivel: parsedData.cargoNivel,
      numVendedores: parsedData.numVendedores,
      numLeadsMensais: parsedData.numLeadsMensais,
      urgenciaOriginal: parsedData.urgenciaOriginal || leadData.urgencia || undefined,
      cargoOriginal: parsedData.cargoOriginal || leadData.cargo || undefined,
      numVendedoresOriginal: parsedData.numVendedoresOriginal || leadData.numVendedores || undefined,
      numLeadsMensaisOriginal: parsedData.numLeadsMensaisOriginal || leadData.numLeadsMensais || undefined
    };
    
    // console.log('🤖 [ANALYZER] Dados processados:', processedData);
    return processedData;
    
  } catch (error) {
    console.error('❌ [ANALYZER] Erro na interpretação:', error);
    
    // Fallback: tentar extrair dados básicos sem IA
    return {
      nome: leadData.nome || undefined,
      empresa: leadData.empresa || undefined,
      pais: leadData.pais || undefined,
      necessidade: leadData.necessidade || undefined,
      urgenciaDias: 365, // Default para não urgente
      cargoNivel: 'outro',
      numVendedores: 0,
      numLeadsMensais: 0,
      urgenciaOriginal: leadData.urgencia || undefined,
      cargoOriginal: leadData.cargo || undefined,
      numVendedoresOriginal: leadData.numVendedores || undefined,
      numLeadsMensaisOriginal: leadData.numLeadsMensais || undefined
    };
  }
}

// 🎯 ANÁLISE DE TEMPERATURA DO LEAD
async function analyzeLeadTemperature(
  leadData: LeadData, 
  conversationHistory: Array<{isUser: boolean; text: string}> = []
): Promise<TemperatureAnalysis> {
  // console.log('🌡️ [TEMPERATURE] Analisando temperatura do lead:', leadData);

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ [CONFIG] Chave da API OpenAI não configurada');
    throw new Error('Chave da API OpenAI não configurada');
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.1, // Baixa temperatura para consistência
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const promptTemplate = new PromptTemplate({
    template: `Você é um especialista em análise de temperatura de leads para vendas B2B.

DADOS DO LEAD:
{leadData}

HISTÓRICO DA CONVERSA:
{conversationHistory}

ANALISE a temperatura do lead baseada no interesse demonstrado na solução da Nuvia:

CRITÉRIOS PARA CLASSIFICAÇÃO:
🔥 QUENTE (80-100%): 
- Demonstra urgência clara ("preciso urgentemente", "para ontem", "ASAP")
- Mostra autoridade decisória (CEO, CTO, VP, Diretor, Founder)
- Tem necessidade específica que a Nuvia resolve (automatização de leads, qualificação)
- Faz perguntas técnicas sobre implementação, integração, ROI
- Menciona orçamento, processo de compra, aprovação
- Empresa com alto volume de leads (>1000/mês) e equipe de vendas robusta
- Urgência ≤ 30 dias

🌡️ MORNO (40-79%):
- Interesse moderado mas sem urgência clara
- Cargo de influência (Manager, Coordenador, Supervisor)
- Necessidade genérica ou em fase de exploração
- Faz perguntas sobre funcionalidades, preços, casos de uso
- Menciona "vamos ver", "preciso pensar", "vou conversar com a equipe"
- Empresa com volume médio de leads (100-1000/mês)
- Urgência 31-60 dias

❄️ FRIO (0-39%):
- Apenas curiosidade ou pesquisa de mercado
- Sem autoridade decisória clara (Analista, Estagiário, Assistente)
- Necessidade vaga ou não relacionada à solução da Nuvia
- Perguntas muito genéricas sobre IA, automação
- Demonstra baixo engajamento, respostas curtas
- Empresa com baixo volume de leads (<100/mês) ou sem equipe de vendas
- Urgência > 60 dias ou não especificada

RESPONDA APENAS COM JSON:
{{
  "temperatura": "quente|morno|frio",
  "confidence": 0.0-1.0,
  "indicadores": ["indicador1", "indicador2", "indicador3"],
  "reasoning": "explicação detalhada da classificação baseada nos dados e conversa"
}}`,
    inputVariables: ["leadData", "conversationHistory"]
  });

  const formattedPrompt = await promptTemplate.format({
    leadData: JSON.stringify(leadData, null, 2),
    conversationHistory: conversationHistory
      .map(msg => `${msg.isUser ? 'Usuário' : 'Agente'}: ${msg.text}`)
      .join('\n')
  });

  const systemMessage = new SystemMessage("Você é um especialista em análise de temperatura de leads. Responda sempre com JSON válido.");
  const humanMessage = new HumanMessage(formattedPrompt);

  try {
    // 🎯 USAR STRUCTURED OUTPUT para análise de temperatura
    const structuredModel = model.withStructuredOutput(TemperatureAnalysisSchema);
    const response = await structuredModel.invoke([systemMessage, humanMessage]);
    // console.log('🌡️ [TEMPERATURE] Resposta estruturada:', response);
    
    return response as TemperatureAnalysis;
    
  } catch (error) {
    console.error('❌ [TEMPERATURE] Erro na análise de temperatura:', error);
    
    // Fallback: análise básica baseada nos dados
    const fallbackAnalysis: TemperatureAnalysis = {
      temperatura: 'morno',
      confidence: 0.5,
      indicadores: ['Análise automática - dados insuficientes'],
      reasoning: 'Análise automática baseada nos dados disponíveis devido a erro na IA'
    };
    
    // Tentar classificar baseado nos dados disponíveis
    if (leadData.cargo) {
      const cargoLower = leadData.cargo.toLowerCase();
      if (cargoLower.includes('ceo') || cargoLower.includes('cto') || cargoLower.includes('diretor') || cargoLower.includes('vp')) {
        fallbackAnalysis.temperatura = 'quente';
        fallbackAnalysis.confidence = 0.7;
        fallbackAnalysis.indicadores = ['Cargo de alta autoridade'];
      }
    }
    
    if (leadData.urgencia) {
      const urgenciaLower = leadData.urgencia.toLowerCase();
      if (urgenciaLower.includes('urgente') || urgenciaLower.includes('asap') || urgenciaLower.includes('imediato')) {
        fallbackAnalysis.temperatura = 'quente';
        fallbackAnalysis.confidence = 0.8;
        fallbackAnalysis.indicadores.push('Urgência alta');
      }
    }
    
    return fallbackAnalysis;
  }
}

// 🎯 SISTEMA DE CÁLCULO BASEADO EM INTERVALOS
function calculateScoreFromProcessedData(processedData: ProcessedLeadData): {
  urgencia: { score: number; maxScore: number; details: string };
  cargo: { score: number; maxScore: number; details: string };
  numVendedores: { score: number; maxScore: number; details: string };
  numLeadsMensais: { score: number; maxScore: number; details: string };
} {
  // console.log('🎯 [SCORE] Calculando score baseado em intervalos:', processedData);

  // 🎯 CÁLCULO DE SCORE DE URGÊNCIA (baseado em dias)
  let urgenciaScore = 0;
  let urgenciaDetails = '';
  
  if (processedData.urgenciaDias !== undefined) {
    if (processedData.urgenciaDias <= 30) {
      urgenciaScore = 20;
      urgenciaDetails = `${processedData.urgenciaDias} dias (≤30 dias)`;
    } else if (processedData.urgenciaDias <= 60) {
      urgenciaScore = 10;
      urgenciaDetails = `${processedData.urgenciaDias} dias (31-60 dias)`;
    } else {
      urgenciaScore = 5;
      urgenciaDetails = `${processedData.urgenciaDias} dias (>60 dias)`;
    }
  } else {
    urgenciaDetails = 'Urgência não informada';
  }

  // 🎯 CÁLCULO DE SCORE DE CARGO (baseado em nível)
  let cargoScore = 0;
  let cargoDetails = '';
  
  if (processedData.cargoNivel) {
    if (processedData.cargoNivel === 'c_level') {
      cargoScore = 20;
      cargoDetails = `C-level/Decisor (${processedData.cargoOriginal})`;
    } else if (processedData.cargoNivel === 'manager') {
      cargoScore = 15;
      cargoDetails = `Manager/Influenciador (${processedData.cargoOriginal})`;
    } else if (processedData.cargoNivel === 'analista') {
      cargoScore = 5;
      cargoDetails = `Analista/Especialista (${processedData.cargoOriginal})`;
    } else if (processedData.cargoNivel === 'estagiario') {
      cargoScore = 0;
      cargoDetails = `Estagiário/Sem autoridade (${processedData.cargoOriginal})`;
    } else {
      cargoScore = 0;
      cargoDetails = `Cargo não reconhecido (${processedData.cargoOriginal})`;
    }
  } else {
    cargoDetails = 'Cargo não informado';
  }

  // 🎯 CÁLCULO DE SCORE DE VENDEDORES (baseado em número exato)
  let vendedoresScore = 0;
  let vendedoresDetails = '';
  
  if (processedData.numVendedores !== undefined) {
    if (processedData.numVendedores >= 11) {
      vendedoresScore = 30;
      vendedoresDetails = `${processedData.numVendedores} vendedores (≥11)`;
    } else if (processedData.numVendedores >= 4 && processedData.numVendedores <= 10) {
      vendedoresScore = 20;
      vendedoresDetails = `${processedData.numVendedores} vendedores (4-10)`;
    } else if (processedData.numVendedores >= 1 && processedData.numVendedores <= 3) {
      vendedoresScore = 10;
      vendedoresDetails = `${processedData.numVendedores} vendedores (1-3)`;
    } else {
      vendedoresScore = 0;
      vendedoresDetails = `${processedData.numVendedores} vendedores (0)`;
    }
  } else {
    vendedoresDetails = 'Número de vendedores não informado';
  }

  // 🎯 CÁLCULO DE SCORE DE LEADS MENSAIS (baseado em número exato)
  let leadsScore = 0;
  let leadsDetails = '';
  
  if (processedData.numLeadsMensais !== undefined) {
    if (processedData.numLeadsMensais > 1000) {
      leadsScore = 30;
      leadsDetails = `${processedData.numLeadsMensais} leads mensais (>1000)`;
    } else if (processedData.numLeadsMensais >= 501 && processedData.numLeadsMensais <= 1000) {
      leadsScore = 20;
      leadsDetails = `${processedData.numLeadsMensais} leads mensais (501-1000)`;
    } else if (processedData.numLeadsMensais >= 101 && processedData.numLeadsMensais <= 500) {
      leadsScore = 10;
      leadsDetails = `${processedData.numLeadsMensais} leads mensais (101-500)`;
    } else if (processedData.numLeadsMensais >= 0 && processedData.numLeadsMensais <= 100) {
      leadsScore = 5;
      leadsDetails = `${processedData.numLeadsMensais} leads mensais (0-100)`;
    }
  } else {
    leadsDetails = 'Número de leads mensais não informado';
  }

  const result = {
    urgencia: { score: urgenciaScore, maxScore: 20, details: urgenciaDetails },
    cargo: { score: cargoScore, maxScore: 20, details: cargoDetails },
    numVendedores: { score: vendedoresScore, maxScore: 30, details: vendedoresDetails },
    numLeadsMensais: { score: leadsScore, maxScore: 30, details: leadsDetails }
  };

  // console.log('🎯 [SCORE] Resultado do cálculo por intervalos:', result);
  return result;
}

// 🎯 FUNÇÃO PRINCIPAL DE ANÁLISE E CÁLCULO DE SCORE
async function analyzeLeadData(
  leadData: LeadData, 
  conversationHistory: Array<{isUser: boolean; text: string}> = []
): Promise<ScoreResult> {
  // console.log('🎯 [ANALYZER] Iniciando análise de lead:', leadData);
  
  try {
    // 🤖 PASSO 1: INTERPRETAR DADOS COM LANGCHAIN
    const processedData = await interpretLeadDataWithAI(leadData);
    // console.log('🤖 [ANALYZER] Dados interpretados:', processedData);
    
    // 🎯 PASSO 2: CALCULAR SCORE BASEADO EM INTERVALOS
    const breakdown = calculateScoreFromProcessedData(processedData);
    
    // 🎯 PASSO 3: ANÁLISE DE TEMPERATURA
    const temperatureAnalysis = await analyzeLeadTemperature(leadData, conversationHistory);
    // console.log('🌡️ [ANALYZER] Análise de temperatura:', temperatureAnalysis);
    
    // 🎯 PASSO 4: CALCULAR SCORE TOTAL
    const totalScore = breakdown.urgencia.score + breakdown.cargo.score + 
                      breakdown.numVendedores.score + breakdown.numLeadsMensais.score;
    const maxScore = 100; // 20 + 20 + 30 + 30
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    const result: ScoreResult = {
      totalScore,
      maxScore,
      percentage,
      breakdown,
      processedData, // Incluir dados processados no resultado
      temperatureAnalysis // Incluir análise de temperatura
    };
    
    // console.log('🎯 [ANALYZER] Resultado final da análise:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [ANALYZER] Erro na análise:', error);
    
    // Fallback: cálculo básico sem IA
    const fallbackResult: ScoreResult = {
      totalScore: 0,
      maxScore: 100,
      percentage: 0,
      breakdown: {
        urgencia: { score: 0, maxScore: 20, details: 'Erro na interpretação' },
        cargo: { score: 0, maxScore: 20, details: 'Erro na interpretação' },
        numVendedores: { score: 0, maxScore: 30, details: 'Erro na interpretação' },
        numLeadsMensais: { score: 0, maxScore: 30, details: 'Erro na interpretação' }
      },
      processedData: {
        ...leadData,
        urgenciaDias: undefined,
        cargoNivel: 'outro',
        numVendedores: 0,
        numLeadsMensais: 0
      }
    };
    
    return fallbackResult;
  }
}

// 🎯 FUNÇÃO PARA GERAR JSON COMPLETO PARA GOOGLE SHEETS
function generateGoogleSheetsData(
  leadData: LeadData,
  scoreResult: ScoreResult,
  leadId: string,
  conversationHistory: Array<{isUser: boolean; text: string}> = []
): GoogleSheetsData {
  const now = new Date().toISOString();
  
  // Determinar status da conversa baseado no score e temperatura
  let conversationStatus = 'em_andamento';
  if (scoreResult.percentage >= 70) {
    conversationStatus = 'qualificado_para_agendamento';
  } else if (scoreResult.percentage >= 50) {
    conversationStatus = 'precisa_detalhes';
  } else if (scoreResult.percentage >= 30) {
    conversationStatus = 'reciclar_futuro';
  } else {
    conversationStatus = 'descartar';
  }
  
  // Calcular data de follow-up baseado na temperatura
  let dataFollowup: string | null = null;
  if (scoreResult.temperatureAnalysis) {
    const followupDate = new Date();
    switch (scoreResult.temperatureAnalysis.temperatura) {
      case 'quente':
        followupDate.setHours(followupDate.getHours() + 2); // 2 horas
        break;
      case 'morno':
        followupDate.setDate(followupDate.getDate() + 1); // 1 dia
        break;
      case 'frio':
        followupDate.setDate(followupDate.getDate() + 7); // 1 semana
        break;
    }
    dataFollowup = followupDate.toISOString();
  }
  
  // Gerar observações baseadas na análise
  const observacoes = [
    `Score: ${scoreResult.percentage}%`,
    `Temperatura: ${scoreResult.temperatureAnalysis?.temperatura || 'não_analisada'}`,
    `Confiança: ${Math.round((scoreResult.temperatureAnalysis?.confidence || 0) * 100)}%`,
    `Indicadores: ${scoreResult.temperatureAnalysis?.indicadores?.join(', ') || 'nenhum'}`
  ].join(' | ');
  
  const googleSheetsData: GoogleSheetsData = {
    leadId,
    tsCriacaoLead: now,
    tsUltimoContato: now,
    nome: leadData.nome || null,
    empresa: leadData.empresa || null,
    email: leadData.contato || null,
    telefone: leadData.contato || null,
    necessidade: leadData.necessidade || null,
    urgencia: leadData.urgencia || null,
    cargo: leadData.cargo || null,
    numVendedores: leadData.numVendedores || null,
    numLeadsMensais: leadData.numLeadsMensais || null,
    escore: scoreResult.percentage,
    conversationStatus,
    dataFollowup,
    observacoes,
    temperatura: scoreResult.temperatureAnalysis?.temperatura || 'morno'
  };
  
  return googleSheetsData;
}

// 🎯 ENDPOINT DA API
export async function POST(request: NextRequest) {
  try {
    const { leadData, conversationHistory = [], leadId } = await request.json();

    if (!leadData) {
      return NextResponse.json(
        { error: 'Dados do lead são obrigatórios' },
        { status: 400 }
      );
    }

    // console.log('🎯 [ANALYZER] Recebendo dados para análise:', leadData);

    // Analisar dados com IA e calcular score + temperatura
    const scoreResult = await analyzeLeadData(leadData as LeadData, conversationHistory);

    // Gerar ID do lead se não fornecido
    const finalLeadId = leadId || `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Gerar JSON completo para Google Sheets
    const googleSheetsData = generateGoogleSheetsData(
      leadData as LeadData,
      scoreResult,
      finalLeadId,
      conversationHistory
    );

    console.log('🎯 [ANALYZER] Análise concluída:', {
      totalScore: scoreResult.totalScore,
      percentage: scoreResult.percentage,
      temperatura: scoreResult.temperatureAnalysis?.temperatura,
      leadId: finalLeadId
    });

    return NextResponse.json({
      success: true,
      score: scoreResult,
      googleSheetsData,
      leadId: finalLeadId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ANALYZER] Erro na API de análise:', error);
    
    return NextResponse.json(
      { error: 'Erro interno na análise de dados' },
      { status: 500 }
    );
  }
}