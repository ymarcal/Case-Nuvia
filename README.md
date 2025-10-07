# ChatBot com Next.js e LangChain

Um chatbot simples construído com Next.js, TypeScript, Tailwind CSS e LangChain integrado com OpenAI.

## 🚀 Funcionalidades

- Interface de chat moderna e responsiva
- Integração com LangChain e OpenAI GPT-3.5-turbo
- Mensagens em tempo real
- Indicador de carregamento
- Design responsivo com Tailwind CSS

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta na OpenAI com API key

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
   - Adicione sua chave da API OpenAI:
```env
OPENAI_API_KEY=sua_chave_da_api_aqui
```

4. Execute o projeto:
```bash
npm run dev
```

5. Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 🔧 Configuração da API OpenAI

1. Acesse [OpenAI Platform](https://platform.openai.com/)
2. Crie uma conta ou faça login
3. Vá para "API Keys" no menu lateral
4. Clique em "Create new secret key"
5. Copie a chave e adicione no arquivo `.env.local`

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # API route para processar mensagens
│   ├── globals.css           # Estilos globais
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Página principal do chat
```

## 🎨 Tecnologias Utilizadas

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **LangChain** - Framework para LLMs
- **OpenAI** - Modelo de linguagem GPT-3.5-turbo

## 🔄 Próximos Passos

- [ ] Adicionar histórico de conversas
- [ ] Implementar diferentes modelos de IA
- [ ] Adicionar upload de arquivos
- [ ] Implementar autenticação
- [ ] Adicionar temas (claro/escuro)
- [ ] Melhorar tratamento de erros

## 📝 Licença

Este projeto está sob a licença MIT.