import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GoogleSheetsData } from '../../../schemas/chatSchemas';

// 🎯 INTERFACE PARA DADOS DE EXPORTAÇÃO (usando o novo formato)
interface ExportData {
  googleSheetsData: GoogleSheetsData;
  // Manter compatibilidade com formato antigo
  leadData?: unknown;
  scoreData?: unknown;
  leadId?: string;
  timestamp?: string;
  conversationLength?: number;
}

// 🎯 CONFIGURAÇÃO DO GOOGLE SHEETS
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SHEET_NAME = 'Leads Coletados';

// 🎯 FUNÇÃO PARA AUTENTICAR COM GOOGLE SHEETS
async function authenticateGoogleSheets() {
  try {
    // Usar Service Account para autenticação
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('❌ [SHEETS] Erro na autenticação:', error);
    throw new Error('Erro na autenticação com Google Sheets');
  }
}

// 🎯 FUNÇÃO PARA PREPARAR DADOS PARA A PLANILHA (conforme conversa.txt)
function prepareDataForSheet(exportData: ExportData): unknown[][] {
  // Se temos dados no novo formato, usar eles
  if (exportData.googleSheetsData) {
    const data = exportData.googleSheetsData;
    
    // Cabeçalhos conforme especificação do conversa.txt
    const headers = [
      'Lead id',
      'ts de criação do lead',
      'ts de último contato',
      'nome',
      'empresa',
      'email',
      'telefone',
      'necessidade/caso de uso (texto curto)',
      'urgência na resolução do problema',
      'cargo',
      'número de vendedores',
      'número de leads mensais',
      'escore',
      'conversation_status',
      'data_followup',
      'observacoes',
      'temperatura (lead frio, morno ou quente - segundo o interesse demonstrado na solução)'
    ];

    // Dados do lead no novo formato
    const rowData = [
      data.leadId,
      data.tsCriacaoLead,
      data.tsUltimoContato,
      data.nome || '',
      data.empresa || '',
      data.email || '',
      data.telefone || '',
      data.necessidade || '',
      data.urgencia || '',
      data.cargo || '',
      data.numVendedores || '',
      data.numLeadsMensais || '',
      data.escore,
      data.conversationStatus,
      data.dataFollowup || '',
      data.observacoes || '',
      data.temperatura
    ];

    return [headers, rowData];
  }
  
  // Fallback para formato antigo (compatibilidade)
  const { leadData, scoreData, leadId, timestamp, conversationLength } = exportData;
  
  const headers = [
    'Data/Hora',
    'Lead ID',
    'Nome',
    'Empresa',
    'Email',
    'Telefone',
    'País',
    'Necessidade',
    'Urgência',
    'Cargo',
    'Número de Vendedores',
    'Número de Leads Mensais',
    'Score Total',
    'Score %',
    'Tamanho da Conversa',
    'Status'
  ];

  const rowData = [
    timestamp,
    leadId || 'N/A',
    (leadData as any)?.nome || '',
    (leadData as any)?.empresa || '',
    (leadData as any)?.email || '',
    (leadData as any)?.telefone || '',
    (leadData as any)?.pais || '',
    (leadData as any)?.necessidade || '',
    (leadData as any)?.urgencia || '',
    (leadData as any)?.cargo || '',
    (leadData as any)?.numVendedores || '',
    (leadData as any)?.numLeadsMensais || '',
    (scoreData as { totalScore?: number })?.totalScore || 0,
    (scoreData as { percentage?: number })?.percentage || 0,
    conversationLength || 0,
    ((scoreData as { percentage?: number })?.percentage || 0) >= 60 ? 'Qualificado' : 'Não Qualificado'
  ];

  return [headers, rowData];
}

// 🎯 FUNÇÃO PARA VERIFICAR SE A PLANILHA EXISTE E CRIAR CABEÇALHOS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSheetExists(sheets: any) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('ID da planilha não configurado');
    }

    // Verificar se a planilha existe
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });

    // Verificar se a aba existe
    const sheetExists = spreadsheet.data.sheets?.some(
      (sheet: { properties: { title: string } }) => sheet.properties.title === SHEET_NAME
    );

    if (!sheetExists) {
      // Criar nova aba
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: SHEET_NAME
              }
            }
          }]
        }
      });
      console.log('📊 [SHEETS] Nova aba criada:', SHEET_NAME);
    }

    // Verificar se há dados na planilha (para saber se precisa adicionar cabeçalhos)
    const range = `${SHEET_NAME}!A1:Q1`; // 17 colunas conforme conversa.txt
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range
    });

    const hasHeaders = response.data.values && response.data.values.length > 0;
    
    if (!hasHeaders) {
      // Adicionar cabeçalhos conforme especificação do conversa.txt
      const headers = [
        'Lead id',
        'ts de criação do lead',
        'ts de último contato',
        'nome',
        'empresa',
        'email',
        'telefone',
        'necessidade/caso de uso (texto curto)',
        'urgência na resolução do problema',
        'cargo',
        'número de vendedores',
        'número de leads mensais',
        'escore',
        'conversation_status',
        'data_followup',
        'observacoes',
        'temperatura (lead frio, morno ou quente - segundo o interesse demonstrado na solução)'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });
      console.log('📊 [SHEETS] Cabeçalhos adicionados conforme conversa.txt');
    }

  } catch (error) {
    console.error('❌ [SHEETS] Erro ao verificar/criar planilha:', error);
    throw error;
  }
}

// 🎯 FUNÇÃO PARA ADICIONAR DADOS À PLANILHA
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addDataToSheet(sheets: any, exportData: ExportData) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('ID da planilha não configurado');
    }

    // Preparar dados
    const dataToAdd = prepareDataForSheet(exportData);
    
    // Encontrar a próxima linha vazia
    const range = `${SHEET_NAME}!A:Q`; // 17 colunas conforme conversa.txt
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range
    });

    const nextRow = (response.data.values?.length || 0) + 1;
    const insertRange = `${SHEET_NAME}!A${nextRow}:Q${nextRow}`;

    // Adicionar dados
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: insertRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [dataToAdd[1]] // Apenas os dados, não os cabeçalhos
      }
    });

    console.log('📊 [SHEETS] Dados adicionados na linha:', nextRow);
    return nextRow;

  } catch (error) {
    console.error('❌ [SHEETS] Erro ao adicionar dados:', error);
    throw error;
  }
}

// 🎯 ENDPOINT PRINCIPAL
export async function POST(request: NextRequest) {
  try {
    const exportData: ExportData = await request.json();

    // Verificar se temos dados no novo formato ou formato antigo
    if (!exportData.googleSheetsData && !exportData.leadData) {
      return NextResponse.json(
        { error: 'Dados do lead são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('📊 [SHEETS] Iniciando exportação:', {
      leadId: exportData.googleSheetsData?.leadId || exportData.leadId,
      nome: exportData.googleSheetsData?.nome || (exportData.leadData as any)?.nome,
      empresa: exportData.googleSheetsData?.empresa || (exportData.leadData as any)?.empresa,
      formato: exportData.googleSheetsData ? 'novo' : 'antigo'
    });

    // Verificar configurações
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: 'ID da planilha Google Sheets não configurado' },
        { status: 500 }
      );
    }

    // Autenticar com Google Sheets
    const sheets = await authenticateGoogleSheets();

    // Garantir que a planilha e cabeçalhos existam
    await ensureSheetExists(sheets);

    // Adicionar dados
    const rowNumber = await addDataToSheet(sheets, exportData);

    console.log('📊 [SHEETS] Exportação concluída com sucesso na linha:', rowNumber);

    return NextResponse.json({
      success: true,
      message: 'Dados exportados com sucesso para Google Sheets',
      rowNumber: rowNumber,
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [SHEETS] Erro na exportação:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao exportar dados para Google Sheets',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// 🎯 ENDPOINT GET PARA TESTE
export async function GET() {
  try {
    if (!SPREADSHEET_ID) {
      return NextResponse.json(
        { error: 'ID da planilha Google Sheets não configurado' },
        { status: 500 }
      );
    }

    // Testar autenticação
    const sheets = await authenticateGoogleSheets();
    
    // Verificar se a planilha existe
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });

    return NextResponse.json({
      success: true,
      message: 'Conexão com Google Sheets funcionando',
      spreadsheetTitle: spreadsheet.data.properties?.title,
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [SHEETS] Erro no teste:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao conectar com Google Sheets',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
