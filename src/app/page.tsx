'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Dados coletados do lead (baseado no case.md)
interface LeadData {
  nome?: string;
  empresa?: string;
  email?: string;
  telefone?: string;
  pais?: string;
  necessidade?: string;
  urgencia?: string;
  cargo?: string;
  numVendedores?: string;
  numLeadsMensais?: string;
}


export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [collectedData, setCollectedData] = useState<LeadData>({});
  const collectedDataRef = useRef<LeadData>({});
  const [googleSheetsData, setGoogleSheetsData] = useState<unknown | null>(null);
  const [hasAutoExported, setHasAutoExported] = useState(false);
  const [isHotLead, setIsHotLead] = useState(false);

  // Função para fazer scroll para a última mensagem (otimizada com useCallback)
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Effect para fazer scroll quando uma nova mensagem for adicionada
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Effect para manter a ref sincronizada com o estado
  useEffect(() => {
    collectedDataRef.current = collectedData;
  }, [collectedData]);

  // 🎯 INICIALIZAÇÃO NO CLIENTE PARA EVITAR HYDRATION MISMATCH
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        text: 'Olá! Sou da Nuvia, empresa especializada em soluções de IA para geração de receita. Para te ajudar da melhor forma, preciso coletar algumas informações básicas. Qual é o seu nome completo?',
        isUser: false,
        timestamp: new Date(),
      }]);
    }
  }, [messages.length]); // Executa apenas uma vez no cliente


  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText; // Capturar valor antes de limpar
    // 🎯 CORREÇÃO: Incluir a mensagem atual no histórico antes do fetch
    const allMessages = [...messages, userMessage];
    setInputText('');
    setIsLoading(true);
    
    // Foca no input após enviar a mensagem
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    try {
      // 🎯 CORREÇÃO: Usar ref para obter o estado mais recente
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: currentInput,
          collectedData: collectedDataRef.current,
          conversationHistory: allMessages
        }),
      });

      const data = await response.json();


      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Desculpe, ocorreu um erro.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);

      // 🎯 ATUALIZAR DADOS COLETADOS SE A API RETORNAR NOVOS DADOS
      if (data.updatedData) {
        const newData = { ...collectedDataRef.current, ...data.updatedData };
        
        // 🎯 FIX REACT 19: Atualizar todos os estados em batch para evitar múltiplos re-renders
        setCollectedData(newData);
      }
      
      // 🎯 CAPTURAR DADOS DO GOOGLE SHEETS PARA EXPORTAÇÃO AUTOMÁTICA
      if (data.googleSheetsData && data.isComplete) {
        setGoogleSheetsData(data.googleSheetsData);
      }
      
      // 🎯 CAPTURAR INFORMAÇÃO SOBRE LEAD QUENTE
      if (data.isHotLead) {
        setIsHotLead(true);
      }
      
      // Foca no input após receber resposta do bot
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Foca no input após erro
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages]);

  // 🎯 FUNÇÃO DE EXPORTAÇÃO AUTOMÁTICA
  const performAutoExport = useCallback(async () => {
    if (hasAutoExported || !googleSheetsData) return;

    try {
      const exportData = {
        googleSheetsData: googleSheetsData
      };

      const response = await fetch('/api/export-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setHasAutoExported(true);
        console.log('✅ Dados exportados automaticamente para Google Sheets!');
      } else {
        console.error('❌ Erro na exportação automática:', result.error);
      }

    } catch (error) {
      console.error('❌ Erro na exportação automática:', error);
    }
  }, [googleSheetsData, hasAutoExported]);

  // 🎯 EFFECT PARA EXPORTAÇÃO AUTOMÁTICA
  useEffect(() => {
    if (googleSheetsData && !hasAutoExported) {
      // Pequeno delay para garantir que todos os estados foram atualizados
      const timer = setTimeout(() => {
        performAutoExport();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [googleSheetsData, hasAutoExported, performAutoExport]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);






  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-hidden">
      <div className="w-full max-w-5xl h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-3rem)] bg-white/80 backdrop-blur-sm rounded-2xl shadow-large border border-white/20 flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="gradient-primary px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-t-2xl text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="relative z-10 flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Nuvia ChatBot
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">IA para Geração de Receita</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-slate-50/50 to-white/50 min-h-0">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`max-w-xs sm:max-w-sm lg:max-w-md ${message.isUser ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
                {!message.isUser && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Nuvia Bot</span>
                  </div>
                )}
                <div
                  className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-soft hover-lift transition-all duration-200 ${
                    message.isUser
                      ? 'gradient-primary text-white ml-8 sm:ml-12'
                      : 'bg-white/80 backdrop-blur-sm text-slate-800 border border-slate-200/50'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p className={`text-xs mt-2 sm:mt-3 flex items-center ${
                    message.isUser ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-fade-in-up">
              <div className="bg-white/80 backdrop-blur-sm text-slate-800 shadow-soft border border-slate-200/50 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium">Nuvia está digitando...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* 🎯 COMPONENTE DE LEAD QUENTE - LINK DE AGENDAMENTO */}
          {isHotLead && (
            <div className="flex justify-center animate-fade-in-up">
              <div className="max-w-md w-full">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-2xl shadow-large border border-orange-200/50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-600/20"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">🔥 Lead de Alta Prioridade!</h3>
                        <p className="text-orange-100 text-sm">Você é um lead quente para nossa equipe</p>
                      </div>
                    </div>
                    
                    <p className="text-orange-100 mb-4 text-sm">
                      Com base no seu perfil, você tem alta prioridade! Agende uma reunião diretamente com nosso especialista:
                    </p>
                    
                    <a
                      href="https://meetings.hubspot.com/robson-lima/bate-papo-nuvia-ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full bg-white text-orange-600 font-bold py-3 px-6 rounded-xl hover:bg-orange-50 transition-all duration-200 hover-lift shadow-medium"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Agendar Reunião - Nuvia AI
                    </a>
                    
                    <p className="text-orange-200 text-xs mt-3 text-center">
                      Nossa equipe entrará em contato em breve para acelerar sua geração de receita! 🚀
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200/50 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-b-2xl flex-shrink-0">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="w-full border border-slate-300/50 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-900 bg-white/80 backdrop-blur-sm shadow-soft transition-all duration-200 placeholder:text-slate-400 text-sm sm:text-base"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="gradient-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover-lift flex items-center justify-center space-x-2 font-medium text-sm sm:text-base"
            >
              <span>Enviar</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
