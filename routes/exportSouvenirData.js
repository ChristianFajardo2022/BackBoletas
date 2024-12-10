const express = require("express");
const router = express.Router();
const db = require("../firebase/firebaseConfig"); // Reutiliza la configuración existente
const path = require("path");
const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { zonedTimeToUtc, format } = require("date-fns-tz"); // Importa las funciones necesarias

// Endpoint para exportar datos como CSV
router.get("/export-souvenir", async (req, res) => {
  try {
    // Verificar y crear la carpeta 'exports' si no existe
    const exportsDir = path.join(__dirname, "../exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }

    // Referencia a la colección 'souvenir'
    const collectionRef = db.collection("souvenir");

    // Filtrar documentos con orderStatus igual a 'approved'
    const querySnapshot = await collectionRef
      .where("orderStatus", "==", "approved")
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({ message: "No se encontraron datos con el estado 'approved'." });
    }

    // Procesar los documentos y extraer los campos necesarios
    const records = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // Convertir `updatedAt` a UTC-5
      const timeZone = "America/Bogota"; // Zona horaria UTC-5
      const updatedAt =
        data.updatedAt && data.updatedAt._seconds
          ? format(
              new Date(data.updatedAt._seconds * 1000),
              "yyyy-MM-dd HH:mm:ssXXX",
              { timeZone }
            )
          : "";

      return {
        email: data.email || "",
        numeroOrden: data.numeroOrden || "",
        audio: data.audio || "",
        imagen: data.imagen || "",
        updatedAt,
      };
    });

    // Configuración del escritor de CSV
    const csvFilePath = path.join(exportsDir, "souvenir_approved.csv");
    const csvWriter = createCsvWriter({
      path: csvFilePath,
      header: [
        { id: "email", title: "Email" },
        { id: "numeroOrden", title: "Número de Orden" },
        { id: "audio", title: "Audio" },
        { id: "imagen", title: "Imagen" },
        { id: "updatedAt", title: "Última Actualización" },
      ],
    });

    // Escribir los datos en el archivo CSV
    await csvWriter.writeRecords(records);

    // Enviar el archivo CSV como respuesta
    res.download(csvFilePath, "souvenir_approved.csv", (err) => {
      if (err) {
        console.error("Error enviando el archivo CSV:", err);
        res.status(500).send("Error enviando el archivo CSV.");
      }
    });
  } catch (error) {
    console.error("Error exportando datos:", error);
    res.status(500).json({ message: "Error exportando datos.", error });
  }
});

module.exports = router;
