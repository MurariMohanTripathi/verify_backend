import { getFirebaseAdmin } from "../config/firebaseAdmin.js";
import { verifyFirebaseIdToken } from "../services/firebaseTokenVerifier.js";

const getBearerToken = (req) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
};

export const optionalFirebaseAuth = async (req, _res, next) => {
  const token = getBearerToken(req);
  if (!token) return next();

  try {
    const decodedToken = await verifyToken(token);
    req.user = decodedToken;
  } catch (error) {
    console.error("Optional Firebase auth failed:", error.message);
  }

  next();
};

export const requireFirebaseAuth = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Please log in to vote." });
  }

  try {
    const decodedToken = await verifyToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Firebase auth failed:", error.message);
    res.status(401).json({ message: "Your session expired. Please log in again." });
  }
};

const verifyToken = async (token) => {
  if (
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  ) {
    return getFirebaseAdmin().auth().verifyIdToken(token);
  }

  return verifyFirebaseIdToken(token, process.env.FIREBASE_PROJECT_ID);
};
