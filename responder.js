require('dotenv').config();
const axios = require('axios');
const db = require('./firebase/firebase.js');
const conversationContext = require('./conversationContext.js'); // Importar gerenciador de contexto

// Armazena mensagens processadas recentemente
const processedMessages = new Set();

async function handleMessage(client, message) {
    const text = message.body.toLowerCase().trim();
    const from = message.from;
    const messageId = message.id._serialized;

    // Ignora se a mensagem já foi processada
    if (processedMessages.has(messageId)) return;
    processedMessages.add(messageId);

    // Limpa a mensagem do cache após 10 segundos
    setTimeout(() => {
        processedMessages.delete(messageId);
    }, 10000);

    // Recuperar ou criar contexto da conversa
    const conversation = conversationContext.getConversation(from);

    // Adicionar mensagem do usuário ao contexto
    conversationContext.addMessage(from, text, 'user');

    // Lógica para tratamento contextual de mensagens
    if (conversation.stage === 'collecting_business_info') {
        return handleBusinessInfoCollection(client, from, text, conversation);
    }

    // 🔍 Comando específico: Serviços
    if (text.includes('servicos') || text.includes('serviços') || text.includes('serviço')) {
        const servicos = await buscarServicosDoFirebase();
        const resposta = servicos.length > 0
            ? `🛒 Serviços disponíveis:\n\n${servicos.map(p => `• ${p.Nome} - ${p.descricao} - `).join('\n')}`
            : '⚠️ Nenhum serviço encontrado.';

        conversationContext.addMessage(from, resposta, 'bot');
        return setTimeout(() => {
            client.sendMessage(from, resposta);
        }, 1500);
    }

    // Outros comandos semelhantes...

    // 🤖 Resposta via IA com contexto completo
    const iaReply = await perguntarParaOpenRouter(text, conversation);

    // Adicionar resposta da IA ao contexto
    conversationContext.addMessage(from, iaReply, 'bot');

    return setTimeout(() => {
        client.sendMessage(from, iaReply);
    }, 1500);
}

// Nova função para lidar com coleta de informações de negócio
async function handleBusinessInfoCollection(client, from, text, conversation) {
    // Exemplo de coleta de informações para um site
    if (conversation.collectedInfo.service === 'website') {
        switch (conversation.collectedInfo.currentField) {
            case 'company_name':
                conversationContext.updateCollectedInfo(from, { company_name: text });
                conversationContext.updateCollectedInfo(from, { currentField: 'product_service' });

                const nextQuestion = '🤔 Que tipo de produto ou serviço sua empresa oferece?';
                client.sendMessage(from, nextQuestion);
                conversationContext.addMessage(from, nextQuestion, 'bot');
                break;

            case 'product_service':
                conversationContext.updateCollectedInfo(from, { product_service: text });
                conversationContext.updateCollectedInfo(from, { currentField: 'site_goal' });

                const goalQuestion = '🎯 Qual o principal objetivo do site? (ex: vendas, portfólio, agendamento)';
                client.sendMessage(from, goalQuestion);
                conversationContext.addMessage(from, goalQuestion, 'bot');
                break;

            // Adicionar mais casos para coleta completa de informações
        }
        return;
    }
}

async function perguntarParaOpenRouter(pergunta, conversation) {
    try {
        // Preparar histórico de mensagens para contexto
        const messageHistory = conversation.messages
            .slice(-5) // Limitar para as últimas 5 mensagens
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }));

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'deepseek/deepseek-chat-v3-0324:free',
                messages: [
                    {
                        role: 'system',
                        content: `Você é o Brunno, assistente da Criaté, e está aqui no WhatsApp para ajudar a marcar uma reunião com um tom leve, humano e natural, como se fosse uma pessoa da equipe conversando normalmente.

Seu objetivo é:

Receber o cliente com simpatia e leveza

Coletar 3 informações de forma conversada: nome, empresa e motivo da reunião

Pedir duas opções de data e horário

Encerrar a conversa com carinho e repassar tudo para um humano do time

🧠 Estilo de fala:
Use frases curtas.

Evite textos longos ou linguagem formal demais.

Escreva como se estivesse em um papo por mensagem com um cliente querido.

Pause entre mensagens (em blocos pequenos).

Não use palavras como “processo”, “formulário”, “agendamento”, “fluxo”. Seja direto, simples e gentil.

Priorize: empatia, leveza e direção.

🗣️ Exemplo de conversa guiada:
Mensagem 1:
Oii! Tudo certo por aí? 😊

Mensagem 2 (depois de alguns segundos):
Que bom ter você aqui.
Tô por aqui pra te ajudar a marcar uma conversa com nosso time, beleza?

Mensagem 3:
Posso te pedir umas infos rapidinho?

Mensagem 4 (depois de resposta):
Show! Me diz seu nome? 🙏

Mensagem 5:
E o nome da sua empresa?

Mensagem 6:
Pra gente te ajudar da melhor forma, qual seria o motivo da reunião?

Mensagem 7 (após resposta):
Maravilha.
Agora me conta:
Quais dois dias e horários funcionam melhor pra você?

Mensagem 8 (após receber as opções):
Perfeito! Obrigado por isso.
Vou passar tudo pro pessoal aqui, e eles já te respondem confirmando, tá?

Mensagem 9:
Valeu mesmo! Até já ✨

⚠️ Regras comportamentais para o bot:
Nunca escreva blocos longos. Sempre que possível, divida a mensagem em partes.

Use emojis de forma sutil (1 por mensagem, no máximo).

Não seja mecânico. Trate cada resposta do cliente como algo único e responda de forma natural e flexível.

Se o cliente fizer perguntas fora do escopo, responda brevemente e conduza de volta com delicadeza.

Nunca confirme a reunião. Apenas colete as informações e avise que um humano dará sequência.`
                    },
                    ...messageHistory, // Adicionar histórico de mensagens
                    { role: 'user', content: pergunta }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost',
                    'X-Title': 'whatsapp-chatbot'
                }
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Erro com IA (OpenRouter):', error.response?.data || error.message);
        return '⚠️ Desculpe, não consegui entender. Pode repetir?';
    }
}

// Funções de busca no Firebase permanecem iguais
// ...

// 🔥 Buscar dados do Firestore
async function buscarServicosDoFirebase() {
    try {
        const snapshot = await db.collection('servicos').get();
        const servicos = [];
        snapshot.forEach(doc => servicos.push(doc.data()));
        return servicos;
    } catch (error) {
        console.error('Erro ao buscar servicos no Firebase:', error.message);
        return [];
    }
}

async function buscarSobreDoFirebase() {
    try {
        const snapshot = await db.collection('sobre').get();
        const sobre = [];
        snapshot.forEach(doc => sobre.push(doc.data()));
        return sobre;
    } catch (error) {
        console.error('Erro ao buscar Sobre no Firebase:', error.message);
        return [];
    }
}

async function buscarPublicoDoFirebase() {
    try {
        const snapshot = await db.collection('publico').get();
        const publico = [];
        snapshot.forEach(doc => publico.push(doc.data()));
        return publico;
    } catch (error) {
        console.error('Erro ao buscar Publico no Firebase:', error.message);
        return [];
    }
}
// Outras funções de busca no Firebase permanecem iguais

module.exports = { handleMessage };