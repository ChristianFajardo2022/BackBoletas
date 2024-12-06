const express = require("express");
const router = express.Router();
const db = require("../firebase/firebaseConfig");
const admin = require("firebase-admin"); // Necesario para usar Firestore Timestamp

// Ruta para actualizar documentos en la colección "souvenir"
router.post("/souvenir-alcarrito", async (req, res) => {
  const { userId, numeroOrden, stock } = req.body;

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
    const orderDate = admin.firestore.Timestamp.now(); // Fecha de creación
    const orderUpdate = admin.firestore.Timestamp.now(); // Última actualización

    // Datos a actualizar
    const updateData = {
      numeroOrden,
      stock,
      orderDate,
      orderUpdate,
      orderStatus
    };

    // Actualizar el documento
    await docRef.update(updateData);

    // Responder con los datos actualizados
    return res.status(200).json({
      message: "Documento actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar el documento:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
