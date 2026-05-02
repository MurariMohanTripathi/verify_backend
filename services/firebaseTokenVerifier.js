import crypto from "crypto";

const FIREBASE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedCerts = null;
let certsExpireAt = 0;

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

const parseJwt = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Token must be a JWT.");
  }

  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    payload: JSON.parse(base64UrlDecode(parts[1])),
    signature: parts[2],
    signedContent: `${parts[0]}.${parts[1]}`,
  };
};

const getMaxAge = (cacheControl) => {
  const match = cacheControl?.match(/max-age=(\d+)/);
  return match ? Number(match[1]) * 1000 : 60 * 60 * 1000;
};

const getFirebaseCerts = async () => {
  if (cachedCerts && Date.now() < certsExpireAt) {
    return cachedCerts;
  }

  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error("Unable to download Firebase public certificates.");
  }

  cachedCerts = await response.json();
  certsExpireAt = Date.now() + getMaxAge(response.headers.get("cache-control"));
  return cachedCerts;
};

export const verifyFirebaseIdToken = async (token, projectId) => {
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required to verify Firebase auth tokens.");
  }

  const { header, payload, signature, signedContent } = parseJwt(token);
  if (header.alg !== "RS256") {
    throw new Error("Firebase token must use RS256.");
  }

  const certs = await getFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error("Firebase token certificate was not found.");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signedContent);
  verifier.end();

  const isValidSignature = verifier.verify(cert, signature, "base64url");
  if (!isValidSignature) {
    throw new Error("Firebase token signature is invalid.");
  }

  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId) {
    throw new Error("Firebase token audience does not match this project.");
  }

  if (payload.iss !== expectedIssuer) {
    throw new Error("Firebase token issuer does not match this project.");
  }

  if (!payload.sub) {
    throw new Error("Firebase token has no user id.");
  }

  if (payload.exp <= now) {
    throw new Error("Firebase token has expired.");
  }

  if (payload.iat > now) {
    throw new Error("Firebase token was issued in the future.");
  }

  return {
    ...payload,
    uid: payload.sub,
  };
};
