const admin = require("firebase-admin");
const fs = require("fs");
const path = require('path');

// Leer las credenciales desde el archivo especificado en el entorno
const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;
if (!credentialsPath) {
  throw new Error("FIREBASE_CREDENTIALS_PATH no está definido en .env");
}

// Asegúrate de que el archivo de credenciales existe
if (!fs.existsSync(credentialsPath)) {
  throw new Error(
    `El archivo de credenciales no se encontró en la ruta: ${credentialsPath}`
  );
}

// Inicializar Firebase
const serviceAccount = require(path.resolve(credentialsPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();

module.exports = db;
