// 🎯 VERSÃO COMPATÍVEL COM VERCEL - SEM SISTEMA DE ARQUIVOS
// import fs from 'fs';
// import path from 'path';

export interface PromptLogEntry {
  id: string;
  timestamp: string;
  userMessage: string;
  prompt: string;
  response: string;
  extractedData: Record<string, unknown>;
  isComplete: boolean;
  confidence: number;
  leadId?: string;
  sessionId?: string;
}

export class PromptLogger {
  private sessionId: string;
  private logs: PromptLogEntry[] = []; // 🎯 ARMAZENAMENTO EM MEMÓRIA PARA VERCEL

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId();
    // 🎯 REMOVIDO: Sistema de arquivos não funciona no Vercel
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  public logPrompt(entry: Omit<PromptLogEntry, 'id' | 'timestamp' | 'sessionId'>): void {
    const logEntry: PromptLogEntry = {
      id: `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      ...entry,
    };

    // 🎯 ARMAZENAR EM MEMÓRIA (Vercel-compatible)
    this.logs.push(logEntry);

    // Log no console para desenvolvimento
    console.log('📝 [PROMPT LOG]', {
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      userMessage: entry.userMessage.substring(0, 100) + '...',
      promptLength: entry.prompt.length,
      responseLength: entry.response.length,
      isComplete: entry.isComplete,
      confidence: entry.confidence,
    });
  }

  public getLogs(limit?: number): PromptLogEntry[] {
    return limit ? this.logs.slice(-limit) : this.logs;
  }

  public getLogsBySession(sessionId: string): PromptLogEntry[] {
    return this.logs.filter(log => log.sessionId === sessionId);
  }

  public getRecentLogs(hours: number = 24): PromptLogEntry[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter(log => new Date(log.timestamp) > cutoffTime);
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// Instância global do logger
export const promptLogger = new PromptLogger();
