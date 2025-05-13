// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./ihub-chatbot-firebase-adminsdk-fbsvc-b26897bdff.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = db;
