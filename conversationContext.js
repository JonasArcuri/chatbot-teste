const { v4: uuidv4 } = require('uuid');

// Classe para gerenciar o contexto das conversas
class ConversationContextManager {
    constructor() {
        // Armazenamento em memória para contextos de conversa
        this.conversations = new Map();
        
        // Tempo de expiração do contexto (15 minutos)
        this.CONTEXT_EXPIRATION_TIME = 15 * 60 * 1000;
    }

    // Iniciar uma nova conversa
    startConversation(phoneNumber) {
        const conversationId = uuidv4();
        const conversationContext = {
            id: conversationId,
            phoneNumber: phoneNumber,
            messages: [],
            stage: 'initial', // Estágios possíveis: initial, collecting_info, proposing_solution
            collectedInfo: {},
            createdAt: Date.now()
        };

        this.conversations.set(phoneNumber, conversationContext);
        return conversationContext;
    }

    // Obter o contexto da conversa
    getConversation(phoneNumber) {
        let conversation = this.conversations.get(phoneNumber);

        // Se não existir, cria um novo contexto
        if (!conversation) {
            conversation = this.startConversation(phoneNumber);
        }

        // Verificar se o contexto expirou
        if (Date.now() - conversation.createdAt > this.CONTEXT_EXPIRATION_TIME) {
            conversation = this.startConversation(phoneNumber);
        }

        return conversation;
    }

    // Adicionar mensagem ao contexto
    addMessage(phoneNumber, message, sender) {
        const conversation = this.getConversation(phoneNumber);
        
        // Limitar histórico de mensagens para evitar consumo excessivo de memória
        if (conversation.messages.length >= 10) {
            conversation.messages.shift(); // Remove a mensagem mais antiga
        }

        conversation.messages.push({
            text: message,
            sender: sender, // 'user' ou 'bot'
            timestamp: Date.now()
        });

        return conversation;
    }

    // Atualizar estágio da conversa
    updateStage(phoneNumber, newStage) {
        const conversation = this.getConversation(phoneNumber);
        conversation.stage = newStage;
        return conversation;
    }

    // Adicionar informações coletadas
    updateCollectedInfo(phoneNumber, newInfo) {
        const conversation = this.getConversation(phoneNumber);
        conversation.collectedInfo = {
            ...conversation.collectedInfo,
            ...newInfo
        };
        return conversation;
    }

    // Limpar contexto da conversa
    clearConversation(phoneNumber) {
        this.conversations.delete(phoneNumber);
    }
}

// Exportar uma instância do gerenciador de contexto
module.exports = new ConversationContextManager();