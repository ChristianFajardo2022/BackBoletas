require("dotenv").config(); // Cargar las variables de entorno desde el archivo .env

const express = require("express");
const router = express.Router();
const db = require("../firebase/firebaseConfig");
const admin = require("firebase-admin");
const { google } = require("googleapis");

// Inicializar Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SHEET_KEY_FILE,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Alcance para Google Sheets API
});

async function writeToSheet(values) {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_SPREADSHEET_ID; // ID del Google Sheet
  const range = "Hoja 1!A1:E1"; // Rango inicial (Ajusta según tus necesidades)
  const valueInputOption = "USER_ENTERED"; // Cómo se interpreta la entrada

  const resource = { values };

  try {
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption,
      resource,
    });
    console.log("Datos enviados a Google Sheets:");
  } catch (error) {
    console.error("Error al enviar datos a Google Sheets:", error);
  }
}

// Ruta para actualizar documentos en la colección "souvenir"
router.post("/souvenir-alcarrito", async (req, res) => {
  const { userId, numeroOrden, stock, orderStatus } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "El campo userId es obligatorio" });
  }

  try {
    // Buscar el documento en Firestore usando where
    const snapshot = await db
      .collection("souvenir")
      .where("userId", "==", userId)
      .get();

    // Verificar si el documento existe
    if (snapshot.empty) {
      return res.status(404).json({
        error: "No se encontró un documento con el userId proporcionado",
      });
    }

    // Obtener el primer documento encontrado
    const userDoc = snapshot.docs[0];
    const docRef = userDoc.ref; // Referencia al documento
    const docData = userDoc.data(); // Datos actuales del documento

    // Generar fechas actuales en formato Firestore Timestamp
    const orderUpdate = admin.firestore.Timestamp.now(); // Última actualización

    // Datos a actualizar
    const updateData = {
      numeroOrden,
      updatedAt: orderUpdate,
      orderStatus,
    };

    // Actualizar el documento en Firestore
    await docRef.update(updateData);

    console.log("El Stock es de " + stock);
    console.log({ Usuario: userId, updateData });

    // Verificar si el orderStatus es "approved"
    if (orderStatus === "approved") {
      const email = docData.email || "Sin email";
      const audio = docData.audio || "Sin audio";
      const imagen = docData.imagen || "Sin imagen";
      const updatedAt = new Date(orderUpdate.toDate()).toLocaleString("en-US", {
        timeZone: "America/Bogota",
      }); // UTC-5

      // Datos a enviar a Google Sheets
      const values = [[email, numeroOrden, audio, imagen, updatedAt]];

      // Enviar datos a Google Sheets
      await writeToSheet(values);
    }

    // Responder con los datos actualizados
    return res.status(200).json({
      message: "Documento actualizado exitosamente",
      data: updateData,
    });
  } catch (error) {
    console.error("Error al actualizar el documento:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
