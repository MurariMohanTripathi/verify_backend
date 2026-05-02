import admin from "firebase-admin";

let firebaseApp = null;

const getCredential = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }

  return null;
};

export const getFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required to verify Firebase auth tokens.");
  }

  const credential = getCredential();
  const options = { projectId };
  if (credential) {
    options.credential = credential;
  }

  firebaseApp = admin.apps.length
    ? admin.app()
    : admin.initializeApp(options);

  return firebaseApp;
};
