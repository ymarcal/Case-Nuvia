import { NextRequest, NextResponse } from 'next/server';
import { promptLogger, PromptLogEntry } from '../../../lib/promptLogger';

// GET /api/prompts - Buscar logs de prompts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const sessionId = searchParams.get('sessionId');
    const hours = searchParams.get('hours');

    let logs: PromptLogEntry[];

    if (sessionId) {
      logs = promptLogger.getLogsBySession(sessionId);
    } else if (hours) {
      logs = promptLogger.getRecentLogs(parseInt(hours));
    } else if (limit) {
      logs = promptLogger.getLogs(parseInt(limit));
    } else {
      logs = promptLogger.getLogs();
    }

    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
      sessionId: promptLogger.getSessionId(),
    });
  } catch (error) {
    console.error('Erro ao buscar logs de prompts:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar logs de prompts' },
      { status: 500 }
    );
  }
}

// POST /api/prompts - Salvar novo log de prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      userMessage,
      prompt,
      response,
      extractedData,
      isComplete,
      confidence,
      leadId,
    } = body;

    if (!userMessage || !prompt || !response) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: userMessage, prompt, response' },
        { status: 400 }
      );
    }

    promptLogger.logPrompt({
      userMessage,
      prompt,
      response,
      extractedData: extractedData || {},
      isComplete: isComplete || false,
      confidence: confidence || 0.0,
      leadId,
    });

    return NextResponse.json({
      success: true,
      message: 'Prompt logado com sucesso',
      sessionId: promptLogger.getSessionId(),
    });
  } catch (error) {
    console.error('Erro ao salvar log de prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar log de prompt' },
      { status: 500 }
    );
  }
}

// DELETE /api/prompts - Limpar logs
export async function DELETE() {
  try {
    promptLogger.clearLogs();
    return NextResponse.json({
      success: true,
      message: 'Logs limpos com sucesso',
    });
  } catch (error) {
    console.error('Erro ao limpar logs:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao limpar logs' },
      { status: 500 }
    );
  }
}
