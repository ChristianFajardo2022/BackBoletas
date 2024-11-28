require('dotenv').config(); // Cargar las variables de entorno
const admin = require('firebase-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Leer las credenciales desde el archivo especificado en el entorno
const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;
if (!credentialsPath) {
  throw new Error('FIREBASE_CREDENTIALS_PATH no está definido en .env');
}

// Asegúrate de que el archivo de credenciales existe
if (!fs.existsSync(credentialsPath)) {
  throw new Error(`El archivo de credenciales no se encontró en la ruta: ${credentialsPath}`);
}

// Inicializar Firebase
const serviceAccount = require(path.resolve(credentialsPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();

// Configuración del servidor Express
const app = express();
app.use(express.json());

// Ruta para registrar datos en Firestore
app.post('/registro', async (req, res) => {
  try {
    const { nombre, documento, ciudad, celular, correo, edad } = req.body;

    if (!nombre) {
      return res.status(400).send({ error: 'El campo nombre es obligatorio' });
    }

    const userDoc = db.collection('boletas').doc(nombre);
    await userDoc.set({
      documento,
      ciudad,
      celular,
      correo,
      edad,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).send({ message: 'Registro exitoso' });
  } catch (error) {
    console.error('Error al registrar en Firestore:', error);
    res.status(500).send({ error: 'Error al registrar en Firestore' });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
