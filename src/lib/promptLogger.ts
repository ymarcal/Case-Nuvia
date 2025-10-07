import fs from 'fs';
import path from 'path';

export interface PromptLogEntry {
  id: string;
  timestamp: string;
  userMessage: string;
  prompt: string;
  response: string;
  extractedData: Record<string, any>;
  isComplete: boolean;
  confidence: number;
  leadId?: string;
  sessionId?: string;
}

export class PromptLogger {
  private logFilePath: string;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId();
    this.logFilePath = path.join(process.cwd(), 'logs', 'prompts.json');
    this.ensureLogDirectory();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private readLogs(): PromptLogEntry[] {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }
      const data = fs.readFileSync(this.logFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler logs de prompts:', error);
      return [];
    }
  }

  private writeLogs(logs: PromptLogEntry[]): void {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Erro ao escrever logs de prompts:', error);
    }
  }

  public logPrompt(entry: Omit<PromptLogEntry, 'id' | 'timestamp' | 'sessionId'>): void {
    const logEntry: PromptLogEntry = {
      id: `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      ...entry,
    };

    const logs = this.readLogs();
    logs.push(logEntry);
    this.writeLogs(logs);

    // Log no console para desenvolvimento
    // console.log('📝 [PROMPT LOG]', {
    //   id: logEntry.id,
    //   timestamp: logEntry.timestamp,
    //   userMessage: entry.userMessage.substring(0, 100) + '...',
    //   promptLength: entry.prompt.length,
    //   responseLength: entry.response.length,
    //   isComplete: entry.isComplete,
    //   confidence: entry.confidence,
    // });
  }

  public getLogs(limit?: number): PromptLogEntry[] {
    const logs = this.readLogs();
    return limit ? logs.slice(-limit) : logs;
  }

  public getLogsBySession(sessionId: string): PromptLogEntry[] {
    const logs = this.readLogs();
    return logs.filter(log => log.sessionId === sessionId);
  }

  public getRecentLogs(hours: number = 24): PromptLogEntry[] {
    const logs = this.readLogs();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return logs.filter(log => new Date(log.timestamp) > cutoffTime);
  }

  public clearLogs(): void {
    this.writeLogs([]);
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// Instância global do logger
export const promptLogger = new PromptLogger();
