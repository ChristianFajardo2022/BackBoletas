const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config(); // Importar dotenv para leer las variables de entorno

// Inicializar Firebase Admin SDK
const serviceAccount = require(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

app.post('/submit', async (req, res) => {
  const { nombre, documento, ciudad, celular, correo, edad } = req.body;

  if (!nombre) {
    return res.status(400).send('El campo "nombre" es obligatorio.');
  }

  try {
    // Crear o actualizar un documento en la colección 'boletas'
    await db.collection('boletas').doc(nombre).set({
      documento,
      ciudad,
      celular,
      correo,
      edad,
    });

    res.status(200).send('Datos registrados en Firestore.');
  } catch (error) {
    console.error('Error al guardar en Firestore:', error);
    res.status(500).send('Error al guardar en Firestore.');
  }
});

app.listen(PORT, () =>
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
);
