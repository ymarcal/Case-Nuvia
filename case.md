# Nuvia Case - Forward Deployed Engineer

## Contexto

A **Nuvia** é uma empresa de crescimento acelerado que oferece soluções de geração de receita assistida por inteligência artificial. Entre seus produtos, estão:  

1. Plataforma de enriquecimento e prospecção de leads  
2. Implementação de agentes de IA para inbound (qualificação e agendamento)  
3. Implementação de agentes de IA para outbound e Go-To-Market (prospecção ativa)  

O cliente deste projeto é a própria Nuvia, que já possui um bom volume de leads inbound e deseja automatizar a qualificação e o agendamento de reuniões com leads qualificados para seus vendedores humanos (*closers*).  

Nesse case, a título de simplificação, iremos criar um **agente de IA (ISA - Intelligent Sales Agent)** que qualifica apenas leads que desejam **AGENTES INBOUND** (como a própria Nuvia) para suas operações.  

---

## Objetivo

Implementar um **agente conversacional inbound** que:  

- Coleta dados mínimos do lead (uma pergunta por vez).  
- Calcula um escore por uma régua fixa.  
- Em função desse escore, sugere a próxima ação:  
  - Agendar  
  - Pedir detalhe  
  - Reciclar  
  - Descartar  
- Faz *upsert* no Google Sheets (mini-CRM) com idempotência por uma chave e-mail/telefone.  
- Responde aos leads até a fase de agendamento.  

> Não é necessário implementar a ferramenta de agendamento; podemos simular apenas o envio de um link:  
> [Link Hubspot](https://meetings.hubspot.com/robson-lima/bate-papo-nuvia-ai)

---

## Dados a coletar

- Nome  
- Empresa  
- E-mail ou telefone (pelo menos um)  
- País  
- Necessidade/caso de uso (texto curto)  
- Urgência na resolução do problema  
- Cargo  
- Número de vendedores  
- Número de leads mensais  

---

## Régua de qualificação (fixa)

| Critério | Peso | Regra de pontuação | Pontos |
|----------|------|---------------------|--------|
| **Urgência na resolução** | 20 | ≤ 30 dias | 20 |
| | | 31–60 dias | 10 |
| | | 61+ dias | 5 |
| **Cargo (autoridade)** | 20 | C-level / VP / Head / Founder (decisor) | 20 |
| | | Manager / Coordenador (influenciador) | 15 |
| | | Analista / Especialista | 5 |
| | | Estagiário / Sem autoridade clara | 0 |
| **Nº de vendedores** | 30 | 11+ | 30 |
| | | 4–10 | 20 |
| | | 1–3 | 10 |
| | | 0 | 0 |
| **Nº de leads mensais** | 30 | > 1000 (alto volume, risco de legado/processo) | 30 |
| | | 501–1000 | 20 |
| | | 101–500 | 10 |
| | | 0–100 | 5 |

---

## Mini-CRM no Google Sheets

**Colunas:**  
- Lead id  
- ts de criação do lead  
- ts de último contato  
- Nome  
- Empresa  
- Email  
- Telefone  
- Necessidade/caso de uso (texto curto)  
- Urgência na resolução do problema  
- Cargo  
- Número de vendedores  
- Número de leads mensais  
- Escore  
- Conversation_status  
- Data_followup  
- Observações  
- Temperatura (lead frio, morno ou quente — segundo o interesse demonstrado na solução)  

---

## Bônus (opcional)

Criar uma **rotina de follow-up automatizada** para leads que deixam de conversar, que ative automaticamente o lead após:  

- 5 minutos sem resposta  
- 10 minutos sem resposta  
- 15 minutos sem resposta  

---

## Entregáveis

1. Repositório no GitHub com o código  
2. Interface onde seja possível testar o bot ao vivo  
3. Planilha do Google Sheets com a base de leads  
