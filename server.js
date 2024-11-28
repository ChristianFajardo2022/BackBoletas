const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();

// Configurar CORS
app.use(cors());

// Parsear JSON
app.use(bodyParser.json());

// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Endpoint para registrar los datos
app.post('/registro', async (req, res) => {
  const { nombre, documentoTipo, documento, ciudad, celular, correo, edad } = req.body;

  // Validación de los campos
  if (!nombre || !documentoTipo || !documento || !ciudad || !celular || !correo || !edad) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo)) {
    return res.status(400).json({ error: 'Por favor, introduce un correo válido.' });
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(celular)) {
    return res.status(400).json({ error: 'Por favor, introduce un número de celular válido.' });
  }

  if (isNaN(edad) || edad <= 0) {
    return res.status(400).json({ error: 'Por favor, introduce una edad válida.' });
  }

  try {
    // Guardar datos en Firestore
    const newDocRef = await db.collection('usuarios').add({
      nombre,
      documentoTipo,
      documento,
      ciudad,
      celular,
      correo,
      edad,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Confirmar éxito
    res.status(200).json({ message: 'Datos registrados con éxito.', documentId: newDocRef.id });
  } catch (error) {
    console.error('Error al agregar datos a Firestore:', error);
    res.status(500).json({ error: 'Error al guardar los datos.' });
  }
});

// Puerto en el que el servidor escucha
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor en ejecución en puerto ${PORT}`);
});
