require('dotenv').config(); // Cargar las variables de entorno
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Importar el middleware de CORS
const QRCode = require('qrcode'); // Importar la librería para generar el código QR
const XLSX = require('xlsx');
const souvenirRoutes = require('./routes/souvenir');
const db = require('./firebase/firebaseConfig');

const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const morgan = require("morgan");
/* const fs = require("fs/promises"); // Módulo para trabajar con promesas en FS.
 */const fsStream = require("fs"); // Para manejar la transmisión de archivos.



// Configuración del servidor Express
const app = express();

// Usar CORS para permitir solicitudes desde cualquier origen (para desarrollo)
app.use(cors({
  origin: '*', // Aquí agregas la URL de tu frontend local
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());



const upload = multer({ dest: "uploads/" });

app.use('/api', souvenirRoutes);

// Ruta para combinar audios
app.post("/combine-audios", upload.array("audioFiles", 2), async (req, res) => {
  // Verifica si los archivos están presentes
  if (!req.files || req.files.length !== 2) {
    return res.status(400).send("Se requieren exactamente dos archivos de audio.");
  }

  // Resuelve las rutas completas de los archivos recibidos
  const [audio1, audio2] = req.files.map((file) => path.resolve(file.path));
  const outputPath = path.resolve("uploads", `combined-${Date.now()}.mp3`);

  try {
    // Combina los audios usando la función de FFmpeg
    await combineAudios(audio1, audio2, outputPath);

    // Enviar el archivo combinado como respuesta
    const readStream = fsStream.createReadStream(outputPath);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=combined.mp3");
    readStream.pipe(res);

    // Eliminar archivos temporales después de enviar la respuesta
    readStream.on('end', async () => {
      try {
        await fs.unlink(audio1); // Eliminar el primer archivo de audio
        await fs.unlink(audio2); // Eliminar el segundo archivo de audio
        await fs.unlink(outputPath); // Eliminar el archivo combinado
      } catch (delError) {
        console.error("Error eliminando archivos temporales:", delError);
      }
    });

  } catch (error) {
    console.error("Error combinando audios:", error);
    res.status(500).send("Error combinando audios.");
  }
});

// Función para combinar audios con FFmpeg
async function combineAudios(audio1Path, audio2Path, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(audio1Path)
      .input(audio2Path)
      .on("end", resolve)
      .on("error", (err) => {
        console.error("Error de FFmpeg:", err);
        reject(err);
      })
      .mergeToFile(outputPath);
  });
}

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
/* app.get('/boletas/:id', async (req, res) => {
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
}); */


// Endpoint para obtener todas las boletas
/* app.get('/boletas', async (req, res) => {
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
}); */

// Endpoint para exportar los datos a un archivo Excel
/* app.get('/exportar-excel', async (req, res) => {
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
}); */

// Endpoint para exportar los datos de Firestore a un archivo Excel
/* app.get('/exportar-excel2', async (req, res) => {
  try {
    // Obtener los documentos de la colección 'boletas2'
    const querySnapshot = await db.collection('boletas2').get();
    const boletas = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, // Incluimos el ID del documento
        nombre: data.nombre,
        correo: data.correo,
        telefono: data.telefono,
        uniqueCodePrincipal: data.uniqueCodePrincipal,
        qrCodePrincipal: data.qrCodePrincipal,
        usadoPrincipal: data.usadoPrincipal,
        createdAt: data.createdAt.toDate().toISOString(), // Convertimos la fecha a string legible
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
}); */



// Endpoint para validar el QR ----------------------------------------------------------------------------------------------------
// Endpoint para validar el QR
/* app.get('/validar-qr', async (req, res) => {
  const { uniqueCode } = req.query;  // Obtenemos el código QR escaneado de los parámetros de la query

  if (!uniqueCode) {
    return res.status(400).json({ error: 'No se proporcionó el código QR' });
  }

  console.log('Código QR recibido:', uniqueCode);  // Imprime el código QR recibido para depuración

  // Eliminar el prefijo 'QR-' si está presente
  const cleanedUniqueCode = uniqueCode.replace(/^QR-/, '').trim();

  console.log('Código QR limpio:', cleanedUniqueCode);  // Imprime el código limpio sin el prefijo 'QR-'

  try {
    // Buscar en la colección 'boletas2' por uniqueCodePrincipal
    const snapshot = await db.collection('boletas2')
      .where('uniqueCodePrincipal', '==', cleanedUniqueCode)  // Buscamos el uniqueCodePrincipal sin el prefijo 'QR-'
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
      .where('uniqueCodeAcompanante', '==', cleanedUniqueCode)  // Buscamos el uniqueCodeAcompanante sin el prefijo 'QR-'
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
}); */

// Endpoint para actualizar el estado del QR
/* app.post('/actualizar-qr', async (req, res) => {
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
}); */

app.get('/abuelito', async (req, res) => {
  try {
    const { tipoInteraccion } = req.query;

    if (!tipoInteraccion) {
      return res.status(400).json({ error: 'Tipo de interacción requerido' });
    }

    const abuelitosRef = db.collection('abuelitos');
    const snapshot = await abuelitosRef.get();

    const abuelitos = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const opciones = Object.keys(data)
        .filter((key) => key.startsWith('opcion'))
        .map((key) => data[key]);

      const opcionesFiltradas = opciones.filter(
        (opcion) =>
          opcion.interaccion === tipoInteraccion && opcion.estado === false
      );

      if (opcionesFiltradas.length > 0) {
        abuelitos.push({
          id: doc.id,
          foto: data.foto,
          nombre: doc.id,
        });
      }
    });

    if (abuelitos.length === 0) {
      return res.status(404).json({ error: 'No hay abuelitos disponibles' });
    }

    // Seleccionar un abuelito aleatorio
    const abuelitoAleatorio =
      abuelitos[Math.floor(Math.random() * abuelitos.length)];
    res.json(abuelitoAleatorio);
  } catch (error) {
    console.error('Error al obtener abuelito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post("/registrar-donacion", async (req, res) => {
  try {
    const { documentoId, tipoInteraccion, fecha, hora, donador } = req.body;

    if (!documentoId || !fecha || !hora || !donador) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const abuelitoRef = db.collection("abuelitos").doc(documentoId);
    const abuelitoSnap = await abuelitoRef.get();

    if (!abuelitoSnap.exists) {
      return res.status(404).json({ error: "Abuelito no encontrado" });
    }

    // Buscar la opción correspondiente en el documento del abuelito
    const opciones = Object.keys(abuelitoSnap.data())
      .filter((key) => key.startsWith("opcion"))
      .find(
        (key) =>
          abuelitoSnap.data()[key].fecha === fecha &&
          abuelitoSnap.data()[key].hora === hora &&
          abuelitoSnap.data()[key].interaccion === tipoInteraccion
      );

    if (!opciones) {
      return res.status(404).json({
        error: "No se encontró una opción para la fecha, hora e interacción proporcionadas.",
      });
    }

    // Actualizar el estado de la opción a true
    await abuelitoRef.update({
      [`${opciones}.estado`]: true,
    });

    // Guardar los datos en la colección "donador"
    const donadorId = db.collection("donador").doc().id; // Generar un ID único
    await db.collection("donador").doc(donadorId).set({
      ...donador,
      fecha,
      hora,
      tipoInteraccion,
      abuelito: documentoId,
    });

    res.status(200).json({ message: "Registro exitoso" });
  } catch (error) {
    console.error("Error al registrar la donación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

