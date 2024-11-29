require('dotenv').config(); // Cargar las variables de entorno
const admin = require('firebase-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Importar el middleware de CORS
const QRCode = require('qrcode'); // Importar la librería para generar el código QR

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

// Usar CORS para permitir solicitudes desde cualquier origen (para desarrollo)
app.use(cors({
  origin: '*', // Aquí agregas la URL de tu frontend local
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Ruta para registrar datos en Firestore
app.post('/registro', async (req, res) => {
  try {
    const { nombre, documentoTipo, documento, ciudad, celular, correo, edad } = req.body;

    if (!nombre) {
      return res.status(400).send({ error: 'El campo nombre es obligatorio' });
    }

    // Generar el código QR único
    const uniqueCode = `QR-${Math.random().toString(36).substr(2, 9)}`; // Código único basado en random
    const qrCodeDataUrl = await QRCode.toDataURL(uniqueCode); // Genera la imagen del QR en formato DataURL

    // Crear el documento en Firestore con ID automático
    const userDoc = await db.collection('boletas').add({
      nombre,
      documentoTipo,
      documento,
      ciudad,
      celular,
      correo,
      edad,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      qrCode: qrCodeDataUrl, // Guardamos el código QR generado
      usado: false, // Inicializamos el campo usado como false
    });

    res.status(201).send({ message: 'Registro exitoso', userId: userDoc.id });
  } catch (error) {
    console.error('Error al registrar en Firestore:', error);
    res.status(500).send({ error: 'Error al registrar en Firestore' });
  }
});

// Nuevo endpoint para obtener datos desde Firestore
app.get('/boletas', async (req, res) => {
  try {
    const querySnapshot = await db.collection('boletas').get();
    const boletas = querySnapshot.docs.map(doc => ({
      id: doc.id, // Incluimos el ID del documento
      ...doc.data() // Incluimos todos los datos del documento
    }));

    res.status(200).send(boletas);
  } catch (error) {
    console.error('Error al obtener datos de Firestore:', error);
    res.status(500).send({ error: 'Error al obtener datos de Firestore' });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
