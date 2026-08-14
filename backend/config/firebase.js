const admin = require("firebase-admin");

const serviceAccount = require("../firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

const FieldValue = admin.firestore.FieldValue;

module.exports = {
  admin,
  firestore,
  FieldValue,
};