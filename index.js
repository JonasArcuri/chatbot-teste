require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const responder = require('./responder');
const scheduler = require('./scheduler');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('📱 Escaneie este QR Code apenas uma vez:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot pronto e autenticado!');
    scheduler.start(client); // Inicia agendamentos
});

client.on('message', async message => {
    await responder.handleMessage(client, message);
});

client.initialize();
