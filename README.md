# Nuvia ChatBot - IA para Geração de Receita

Um chatbot inteligente construído com Next.js, TypeScript, Tailwind CSS e LangChain integrado com OpenAI para coleta e qualificação automática de leads.

## 🚀 Funcionalidades

- **Interface de chat moderna e responsiva** com design profissional
- **Integração com LangChain e OpenAI GPT-4o-mini** para conversas inteligentes
- **Coleta automática de dados de leads** (nome, empresa, email, telefone, etc.)
- **Sistema de pontuação e qualificação** de leads em tempo real
- **Exportação automática para Google Sheets** com dados estruturados
- **Detecção de leads quentes** com link direto para agendamento
- **Design responsivo** com Tailwind CSS e animações suaves

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta na OpenAI com API key
- Conta Google Cloud com Google Sheets API habilitada
- Service Account do Google Cloud configurado

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd chatbot
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env.local` na raiz do projeto
   - Adicione as seguintes variáveis:
```env
# OpenAI
OPENAI_API_KEY=sua_chave_da_api_aqui

# Google Sheets
GOOGLE_SHEETS_ID=id_da_sua_planilha
GOOGLE_PROJECT_ID=id_do_projeto_google
GOOGLE_PRIVATE_KEY_ID=id_da_chave_privada
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nsua_chave_privada_completa\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=seu-service@projeto.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=id_do_cliente
```

4. Execute o projeto:
```bash
npm run dev
```

5. Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 🔧 Configuração das APIs

### OpenAI API
1. Acesse [OpenAI Platform](https://platform.openai.com/)
2. Crie uma conta ou faça login
3. Vá para "API Keys" no menu lateral
4. Clique em "Create new secret key"
5. Copie a chave e adicione no arquivo `.env.local`

### Google Sheets API
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Habilite a Google Sheets API
4. Crie um Service Account:
   - Vá para "IAM & Admin" → "Service Accounts"
   - Clique em "Create Service Account"
   - Baixe o arquivo JSON de credenciais
5. Compartilhe sua planilha Google Sheets com o email do Service Account
6. Configure as variáveis de ambiente com os dados do Service Account

## 🤖 Como Funciona

O Nuvia ChatBot é um agente conversacional inteligente que:

1. **Inicia a conversa** com uma mensagem de boas-vindas personalizada
2. **Coleta dados do lead** através de perguntas estratégicas:
   - Nome completo
   - Empresa
   - Email e telefone
   - País
   - Necessidade específica
   - Urgência para implementação
   - Cargo na empresa
   - Número de vendedores
   - Volume de leads mensais

3. **Analisa e pontua** o lead em tempo real usando IA
4. **Determina a temperatura** do lead (quente, morno, frio)
5. **Exporta automaticamente** os dados para Google Sheets
6. **Oferece agendamento direto** para leads quentes

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts      # API para análise e pontuação de leads
│   │   ├── chat/
│   │   │   └── route.ts      # API principal do chatbot
│   │   ├── export-sheets/
│   │   │   └── route.ts      # API para exportação ao Google Sheets
│   ├── globals.css           # Estilos globais
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Interface do chatbot
└── schemas/
    └── chatSchemas.ts        # Schemas TypeScript para validação
```

## 🎨 Tecnologias Utilizadas

- **Next.js 15.5.4** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - Estilização moderna
- **LangChain** - Framework para LLMs
- **OpenAI GPT-4o-mini** - Modelo de linguagem avançado
- **Google Sheets API** - Integração com planilhas
- **Zod** - Validação de schemas
- **Googleapis** - Cliente oficial do Google

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório GitHub no [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente no dashboard
3. Deploy automático a cada push

### Outras opções
- **Netlify** - Deploy simples com interface amigável
- **Railway** - Deploy com suporte a Node.js
- **Docker** - Para controle total do ambiente

## 📊 Funcionalidades Implementadas

- ✅ **Coleta automática de dados** de leads
- ✅ **Sistema de pontuação** baseado em critérios definidos
- ✅ **Exportação para Google Sheets** com dados estruturados
- ✅ **Detecção de leads quentes** com agendamento direto
- ✅ **Interface responsiva** e moderna
- ✅ **Validação de dados** com Zod
- ✅ **Deploy pronto** para produção

## 🔄 Próximos Passos

- [ ] Implementar autenticação de usuários
- [ ] Adicionar dashboard de analytics
- [ ] Implementar sistema de logs opcional
- [ ] Integração com CRM (HubSpot, Salesforce)
- [ ] Sistema de templates de mensagens
- [ ] Notificações em tempo real
- [ ] Suporte a múltiplos idiomas

## 📝 Licença

Este projeto está sob a licença MIT.