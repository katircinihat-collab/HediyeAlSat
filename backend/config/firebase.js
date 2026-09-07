const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(__dirname, "../firebase-admin.json");
  if (fs.existsSync(credentialPath)) {
    return admin.credential.cert(JSON.parse(fs.readFileSync(credentialPath, "utf8")));
  }
  return admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: getCredential() });
}

const firestore = admin.firestore();

const FieldValue = admin.firestore.FieldValue;

module.exports = {
  admin,
  firestore,
  FieldValue,
};
