const express = require('express');
const cors = require('cors'); // Importa el paquete CORS
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();

// Configuración de CORS para permitir solicitudes desde cualquier origen
app.use(cors()); // Si deseas restringir los orígenes, pasa un objeto de opciones

app.use(bodyParser.json()); // Para parsear los datos JSON

admin.initializeApp(); // Inicialización de Firebase Admin SDK
const db = admin.firestore();

// Endpoint para registrar los datos
app.post('/registro', async (req, res) => {
  const { nombre, documentoTipo, documento, ciudad, celular, correo, edad } = req.body;

  // Validación de los datos
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
    await db.collection('usuarios').add({
      nombre,
      documentoTipo,
      documento,
      ciudad,
      celular,
      correo,
      edad,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: 'Datos registrados con éxito.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar los datos.' });
  }
});

// Puerto en el que el servidor escucha
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor en ejecución en puerto ${PORT}`);
});
