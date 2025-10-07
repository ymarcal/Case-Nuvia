import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
import { AIResponseSchema, LeadData, AIResponse } from '../../../schemas/chatSchemas';
import { promptLogger } from '../../../lib/promptLogger';

// -----------------------------
// Configuração e Helpers
// -----------------------------

// Campos essenciais que devem ser coletados
const ESSENTIAL_FIELDS: Array<keyof LeadData> = [
  'nome', 'empresa', 'pais', 'contato', 'necessidade', 'cargo', 'numLeadsMensais', 'numVendedores', 'urgencia'
];


// Identifica o próximo campo que precisa ser coletado
function getNextMissingField(data: LeadData): keyof LeadData | null {
  // Verifica campos essenciais
  for (const field of ESSENTIAL_FIELDS) {
    const value = data[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      return field;
    }
  }
  
  return null;
}

// Perguntas para cada campo
const FIELD_QUESTIONS: Record<string, string> = {
  email: 'Para que possamos entrar em contato, você poderia informar seu email?',
  telefone: 'Para que possamos entrar em contato, você poderia informar seu telefone?',
  nome: 'Qual é o seu nome completo?',
  empresa: 'Qual é o nome da sua empresa?',
  pais: 'De qual país você está falando?',
  necessidade: 'Em uma frase, qual é a principal necessidade da sua empresa hoje?',
  urgencia: 'Qual é a urgência para implementar uma solução? (ex: 2 meses, para amanhã, 6 meses)',
  cargo: 'Qual é o seu cargo na empresa?',
  numVendedores: 'Quantos vendedores a empresa tem atualmente?',
  numLeadsMensais: 'Quantos leads mensais vocês geram hoje?',
};

// Gera ID único para o lead
function generateLeadId(): string {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Chama a API de análise se existir
async function analyzeLeadData(
  leadData: LeadData, 
  request: NextRequest, 
  conversationHistory: Array<{isUser: boolean; text: string}> = []
): Promise<{score: unknown; googleSheetsData: unknown; leadId: string} | null> {
  try {
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        leadData, 
        conversationHistory 
      }),
    });
    
    if (!response.ok) return null;
    const result = await response.json();
    return {
      score: result.score,
      googleSheetsData: result.googleSheetsData,
      leadId: result.leadId
    };
  } catch (error) {
    console.error('Erro ao analisar dados do lead:', error);
    return null;
  }
}

// -----------------------------
// POST /api/chat
// -----------------------------
export async function POST(request: NextRequest) {
  try {
    const { message, collectedData = {}, conversationHistory = [] } = await request.json();

    // Validação básica
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Mensagem é obrigatória' 
      }, { status: 400 });
    }

    // Verifica se a API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        response: 'Desculpe, o serviço está temporariamente indisponível. Tente novamente em alguns minutos.',
        updatedData: collectedData,
        isComplete: false,
        confidence: 0.0,
        leadId: null,
      });
    }

    const currentData: LeadData = collectedData as LeadData;

    // Template do prompt para o agente conversacional
    const promptTemplate = new PromptTemplate({
      template: `Você é um agente de qualificação de leads da Nuvia, especializado em conversas naturais e coleta de dados.

Você deve conversar com o usuário de forma natural e amigável, com o objetivo de coletar os dados necessários para a qualificação do lead.
Não deixe a conversa estagnar: sempre pergunte o próximo campo que precisa ser coletado.
SEMPRE termine sua resposta com uma pergunta sobre o próximo campo que falta

TAREFA: Analise a mensagem atual do usuário e extraia apenas os dados que aparecem explicitamente no texto. Se um dado não estiver presente, deixe como null.

CAMPOS PARA EXTRAIR:
- nome: Nome completo da pessoa
- empresa: Nome da empresa
- contato: Email ou telefone
- pais: País de origem
- necessidade: Principal necessidade/problema
- urgencia: Urgência para solução
- cargo: Cargo/função na empresa
- numVendedores: Quantidade de vendedores
- numLeadsMensais: Quantidade de leads mensais

REGRAS IMPORTANTES:
1. Extraia APENAS dados que aparecem na mensagem atual
2. NÃO invente ou assuma dados
3. Se múltiplos campos aparecem na mesma mensagem, extraia todos
4. Mantenha a resposta conversacional natural e amigável
5. Se a coleta estiver completa, agradeça e confirme

DADOS JÁ COLETADOS:
{collectedData}

HISTÓRICO DA CONVERSA:
{conversationHistory}

MENSAGEM ATUAL DO USUÁRIO:
{userMessage}

Responda de forma natural e extraia os dados presentes na mensagem.`,
      inputVariables: ['collectedData', 'conversationHistory', 'userMessage'],
    });

    // Formata os dados coletados para o prompt
    const collectedDataStr = Object.keys(currentData).length > 0 
      ? JSON.stringify(currentData, null, 2)
      : 'Nenhum dado coletado ainda';

    // Formata o histórico da conversa
    const conversationHistoryStr = conversationHistory
      .map((msg: { isUser: boolean; text: string }) => 
        `${msg.isUser ? 'Usuário' : 'Agente'}: ${msg.text}`
      )
      .join('\n');

    // Formata o prompt
    const formattedPrompt = await promptTemplate.format({
      collectedData: collectedDataStr,
      conversationHistory: conversationHistoryStr,
      userMessage: message,
    });

    // Configuração do modelo com structured output
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 500,
    });

    const structuredModel = model.withStructuredOutput(AIResponseSchema, {
      name: 'extract_lead_data',
    });

    let aiResponse: AIResponse;

    try {
      // Chama o modelo com structured output
      aiResponse = await structuredModel.invoke([
        new SystemMessage(
          'Você é um agente especializado em extrair dados de leads de forma natural e conversacional. Sempre seja amigável e profissional.'
        ),
        new HumanMessage(formattedPrompt),
      ]);
      console.log('Resposta da IA:', aiResponse);
    } catch (error) {
      console.error('Erro ao processar com IA:', error);
      
      // Fallback: usa lógica determinística
      const nextField = getNextMissingField(currentData);

      aiResponse = {
        response: nextField ? FIELD_QUESTIONS[nextField] : 'Poderia me contar mais sobre sua necessidade?',
        extractedData: {},
        isComplete: getNextMissingField(currentData) === null,
        confidence: 0.6,
      };
      console.log('Resposta do fallback:', aiResponse);
    }

    // Merge dos dados coletados
    const finalData: LeadData = { 
      ...currentData, 
      ...aiResponse.extractedData 
    };

    const isComplete = getNextMissingField(finalData) === null;

    // Se a coleta está completa, gera ID e chama análise
    let leadId: string | null = null;
    let score: unknown | null = null;
    let googleSheetsData: unknown | null = null;
    let isHotLead: boolean = false;

    if (isComplete) {
      const analysisResult = await analyzeLeadData(finalData, request, conversationHistory);
      
      if (analysisResult) {
        leadId = analysisResult.leadId;
        score = analysisResult.score;
        googleSheetsData = analysisResult.googleSheetsData;
        
        // Verifica se a temperatura é "quente" para enviar link de agendamento
        const temperatureAnalysis = (score as { temperatureAnalysis?: { temperatura?: string } })?.temperatureAnalysis;
        if (temperatureAnalysis?.temperatura === 'quente') {
          isHotLead = true;
          aiResponse.response = 'Perfeito! Coletamos todas as informações necessárias. Com base no seu perfil, você é um lead de alta prioridade para nossa equipe! 🚀\n\nPara agilizar o processo, você pode agendar uma reunião diretamente com nosso especialista através deste link:\n\n📅 [Agendar Reunião - Nuvia AI](https://meetings.hubspot.com/robson-lima/bate-papo-nuvia-ai)\n\nNossa equipe entrará em contato em breve para discutir como podemos ajudar sua empresa a acelerar a geração de receita!';
        } else {
          aiResponse.response = 'Perfeito! Coletamos todas as informações necessárias. Nossa equipe entrará em contato em breve para discutir como podemos ajudar sua empresa.';
        }
      } else {
        // Fallback se a análise falhar
        leadId = generateLeadId();
        aiResponse.response = 'Perfeito! Coletamos todas as informações necessárias. Nossa equipe entrará em contato em breve para discutir como podemos ajudar sua empresa.';
      }
    } else {
      // Se ainda faltam dados, garante que há uma pergunta para o próximo campo
      const nextField = getNextMissingField(finalData);
      if (nextField && (!aiResponse.response || aiResponse.response.trim().length === 0)) {
        aiResponse.response = FIELD_QUESTIONS[nextField];
      }
    }

    // Log do prompt para monitoramento
    try {
      await promptLogger.logPrompt({
        userMessage: message,
        prompt: formattedPrompt,
        response: aiResponse.response,
        extractedData: aiResponse.extractedData,
        isComplete: isComplete,
        confidence: aiResponse.confidence ?? 0.8,
        leadId: leadId || undefined,
      });
    } catch (logError) {
      console.error('Erro ao logar prompt:', logError);
      // Não falha a requisição se o log falhar
    }

    // Resposta final
    return NextResponse.json({
      response: aiResponse.response,
      updatedData: finalData,
      isComplete: isComplete,
      confidence: aiResponse.confidence ?? 0.8,
      score: score,
      leadId: leadId,
      googleSheetsData: googleSheetsData,
      isHotLead: isHotLead,
    });

  } catch (error) {
    console.error('Erro na API de chat:', error);
    
    return NextResponse.json(
      {
        response: 'Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes.',
        updatedData: {},
        isComplete: false,
        confidence: 0.0,
        leadId: null,
      },
      { status: 200 } // Retorna 200 para não quebrar o frontend
    );
  }
}
