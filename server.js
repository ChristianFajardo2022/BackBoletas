require('dotenv').config(); // Cargar las variables de entorno
const admin = require('firebase-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Importar el middleware de CORS
const QRCode = require('qrcode'); // Importar la librería para generar el código QR
const XLSX = require('xlsx');

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

// Nuevo endpoint para obtener una boleta específica
app.get('/boletas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await db.collection('boletas2').doc(id).get();
    if (!doc.exists) {
      return res.status(404).send({ error: 'Boleta no encontrada' });
    }
    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error al obtener la boleta:', error);
    res.status(500).send({ error: 'Error al obtener la boleta' });
  }
});


// Nuevo endpoint para obtener datos desde Firestore
app.get('/boletas', async (req, res) => {
  try {
    const querySnapshot = await db.collection('boletas2').get();
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


// Nuevo endpoint para exportar los datos a un archivo Excel
app.get('/exportar-excel', async (req, res) => {
  try {
    const querySnapshot = await db.collection('boletas').get();
    const boletas = querySnapshot.docs.map(doc => {
      const data = doc.data();

      // Convertir el campo timestamp a un formato legible
      if (data.timestamp) {
        data.timestamp = data.timestamp.toDate().toISOString(); // Convierte a formato ISO
      }

      return {
        id: doc.id, // Incluimos el ID del documento
        ...data, // Incluimos todos los datos del documento
      };
    });

    // Creamos una hoja de trabajo de Excel con los datos
    const worksheet = XLSX.utils.json_to_sheet(boletas);

    // Creamos un libro de trabajo con la hoja creada
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Boletas');

    // Guardamos el archivo Excel en memoria
    const filePath = path.join(__dirname, 'boletas.xlsx');
    XLSX.writeFile(workbook, filePath);

    // Enviar el archivo al cliente
    res.download(filePath, 'boletas.xlsx', (err) => {
      if (err) {
        console.error('Error al descargar el archivo:', err);
        res.status(500).send({ error: 'Error al generar el archivo Excel' });
      } else {
        // Eliminar el archivo temporal después de la descarga
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    res.status(500).send({ error: 'Error al exportar a Excel' });
  }
});

// Endpoint para validar el código QR
app.get('/validar-qr', async (req, res) => {
  try {
    const { qrContent } = req.query;

    if (!qrContent) {
      return res.status(400).json({ message: 'El contenido del QR es obligatorio.' });
    }

    // Analizar el contenido del QR
    const [type, id, correo] = qrContent.split('-');

    if (!type || !id || !correo) {
      return res.status(400).json({ message: 'El contenido del QR no es válido.' });
    }

    // Buscar el documento en Firestore
    const docRef = db.collection('boletas2').doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({ message: 'QR no encontrado.' });
    }

    const data = docSnapshot.data();

    // Verificar el tipo de QR y su estado
    if (type === 'QR') {
      if (data.usadoPrincipal) {
        return res.status(400).json({ message: 'QR principal ya usado.' });
      }

      // Marcar el QR principal como usado
      await docRef.update({ usadoPrincipal: true });
      return res.status(200).json({ message: 'QR principal validado con éxito.' });
    } else if (type === 'QR-AC') {
      if (data.usadoAcompanante) {
        return res.status(400).json({ message: 'QR acompañante ya usado.' });
      }

      // Marcar el QR acompañante como usado
      await docRef.update({ usadoAcompanante: true });
      return res.status(200).json({ message: 'QR acompañante validado con éxito.' });
    } else {
      return res.status(400).json({ message: 'Tipo de QR no reconocido.' });
    }
  } catch (error) {
    console.error('Error al validar el QR:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});



// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
