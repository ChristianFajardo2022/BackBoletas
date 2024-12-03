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
/* app.post('/registro', async (req, res) => {
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
 */
// Endpoint para obtener una boleta específica
app.get('/boletas/:id', async (req, res) => {
  const { id } = req.params;  // Obtenemos el 'id' del parámetro de la URL
  try {
    // Buscamos el documento en la colección 'boletas2' usando el ID
    const doc = await db.collection('boletas2').doc(id).get();

    if (!doc.exists) {
      // Si el documento no existe, devolvemos un error 404
      return res.status(404).send({ error: 'Boleta no encontrada' });
    }

    // Si el documento existe, devolvemos los datos
    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (error) {
    // Si ocurre un error en el proceso, se captura y devuelve un error 500
    console.error('Error al obtener la boleta:', error);
    res.status(500).send({ error: 'Error al obtener la boleta' });
  }
});


// Endpoint para obtener todas las boletas
app.get('/boletas', async (req, res) => {
  try {
    // Obtenemos todos los documentos de la colección 'boletas2'
    const querySnapshot = await db.collection('boletas2').get();
    
    // Mapeamos los documentos a un formato que incluya el ID y los datos
    const boletas = querySnapshot.docs.map(doc => ({
      id: doc.id,  // Incluimos el ID del documento
      ...doc.data(),  // Incluimos todos los datos del documento
    }));

    // Respondemos con el arreglo de boletas
    res.status(200).send(boletas);
  } catch (error) {
    // Si ocurre un error en el proceso, se captura y devuelve un error 500
    console.error('Error al obtener datos de Firestore:', error);
    res.status(500).send({ error: 'Error al obtener datos de Firestore' });
  }
});

// Endpoint para exportar los datos a un archivo Excel
app.get('/exportar-excel', async (req, res) => {
  try {
    const querySnapshot = await db.collection('boletas2').get();
    const boletas = querySnapshot.docs.map(doc => {
      const data = doc.data();

      // Convertir el campo createdAt a un formato legible
      if (data.createdAt) {
        data.createdAt = data.createdAt.toDate().toISOString(); // Convierte a formato ISO
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

// Endpoint para validar el QR ----------------------------------------------------------------------------------------------------
// Endpoint para validar el QR
app.get('/validar-qr', async (req, res) => {
  const { uniqueCode } = req.query;  // Obtenemos el código QR escaneado de los parámetros de la query

  if (!uniqueCode) {
    return res.status(400).json({ error: 'No se proporcionó el código QR' });
  }

  console.log('Código QR recibido:', uniqueCode);  // Imprime el código QR recibido para depuración

  try {
    // Buscar en la colección 'boletas2' por uniqueCodePrincipal
    const snapshot = await db.collection('boletas2')
      .where('uniqueCodePrincipal', '==', uniqueCode.trim())  // Buscamos el uniqueCodePrincipal
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      console.log('Documento encontrado (Principal):', doc.data());  // Imprime el documento encontrado para depuración
      return res.json({ 
        message: 'QR válido', 
        type: 'principal', 
        nombre: doc.data().nombre,  // Retorna el nombre asociado al QR principal
        id: doc.id,
        usado: doc.data().usadoPrincipal 
      });
    }

    // Si no se encuentra por uniqueCodePrincipal, buscamos por uniqueCodeAcompanante
    const snapshotAcompanante = await db.collection('boletas2')
      .where('uniqueCodeAcompanante', '==', uniqueCode.trim())  // Buscamos el uniqueCodeAcompanante
      .get();

    if (!snapshotAcompanante.empty) {
      const doc = snapshotAcompanante.docs[0];
      console.log('Documento encontrado (Acompañante):', doc.data());  // Imprime el documento encontrado para depuración
      return res.json({ 
        message: 'QR válido', 
        type: 'acompanante', 
        nombre: doc.data().nombre,  // Retorna el nombre asociado al QR del acompañante
        id: doc.id,
        usado: doc.data().usadoAcompanante 
      });
    }

    // Si no se encuentra el código, respondemos con error 404
    return res.status(404).json({ error: 'Código QR no encontrado' });
  } catch (error) {
    console.error('Error validando el QR:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});


// Endpoint para actualizar el estado del QR
app.post('/actualizar-qr', async (req, res) => {
  const { id, type } = req.body;

  if (!id || !type) {
    return res.status(400).json({ error: 'Faltan datos necesarios' });
  }

  try {
    const docRef = db.collection('boletas2').doc(id);

    const fieldToUpdate = type === 'principal' ? 'usadoPrincipal' : 'usadoAcompanante';

    await docRef.update({ [fieldToUpdate]: true });
    return res.json({ message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando el estado:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});