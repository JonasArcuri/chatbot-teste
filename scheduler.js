const cron = require('node-cron');

function start(client) {
    // Mensagem agendada diária para número pessoal
    cron.schedule('0 8 * * *', () => {
        const number = '5547992025362@c.us'; // número pessoal
        const text = 'Bom dia meu amor, que você tenha um ótimo dia hoje, amo você!!!';
        client.sendMessage(number, text);
        console.log('⌛ Mensagem agendada enviada às 8h.');
    });

    // Você pode adicionar mais agendamentos aqui
}

module.exports = { start };
