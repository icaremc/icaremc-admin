import fs from "fs";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import {
  FirebaseMessagingError,
  getMessaging,
  type Message,
} from "firebase-admin/messaging";

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function isVercelDeploy() {
  return Boolean(process.env.VERCEL);
}

function readServiceAccount(): ServiceAccountJson {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    const parsed = JSON.parse(jsonEnv) as Record<string, unknown>;
    return {
      project_id: String(parsed.project_id ?? parsed.projectId ?? ""),
      client_email: String(parsed.client_email ?? parsed.clientEmail ?? ""),
      private_key: String(parsed.private_key ?? parsed.privateKey ?? ""),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (filePath && isVercelDeploy()) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_PATH cannot be used on Vercel. " +
        "Remove it from Vercel env vars and set FIREBASE_SERVICE_ACCOUNT_JSON " +
        "(paste the full service account JSON from Firebase Console).",
    );
  }

  if (filePath) {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    if (fs.existsSync(resolved)) {
      return JSON.parse(fs.readFileSync(resolved, "utf8")) as ServiceAccountJson;
    }
    throw new Error(`Firebase service account file not found at ${resolved}`);
  }

  throw new Error(
    isVercelDeploy()
      ? "Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel environment variables."
      : "Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

function ensureFirebaseApp() {
  if (getApps().length > 0) return;

  const account = readServiceAccount();
  initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
  });
}

export type FcmSendInput = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "UNREGISTERED",
]);

export class FcmSendError extends Error {
  errorCode: string;

  constructor(message: string, errorCode: string) {
    super(message);
    this.name = "FcmSendError";
    this.errorCode = errorCode;
  }
}

export function isStaleFcmTokenError(error: unknown): boolean {
  if (error instanceof FirebaseMessagingError) {
    return STALE_TOKEN_CODES.has(error.code);
  }
  return error instanceof FcmSendError && STALE_TOKEN_CODES.has(error.errorCode);
}

export function fcmErrorMessage(error: unknown): string {
  const code =
    error instanceof FirebaseMessagingError
      ? error.code
      : error instanceof FcmSendError
        ? error.errorCode
        : null;

  if (code === "messaging/third-party-auth-error") {
    return (
      "Firebase could not reach Apple Push Notification service (APNs). " +
      "Upload a valid APNs Auth Key (.p8) in Firebase Console → Project settings → " +
      "Cloud Messaging → Apple app configuration for com.example.icareMc."
    );
  }

  if (code === "messaging/invalid-apns-credentials") {
    return (
      "Invalid or expired APNs credentials in Firebase. Re-upload the APNs Auth Key " +
      "for the iOS app in Firebase Console → Cloud Messaging."
    );
  }

  if (code === "messaging/mismatched-credential") {
    return (
      "The Firebase service account does not match the mobile app project. " +
      "Use credentials from the same Firebase project as the app (icaremc)."
    );
  }

  return error instanceof Error ? error.message : "Could not send notification";
}

export async function sendFcmMessage(input: FcmSendInput): Promise<string> {
  ensureFirebaseApp();

  const message: Message = {
    token: input.token,
    notification: { title: input.title, body: input.body },
    ...(input.data && Object.keys(input.data).length > 0
      ? { data: input.data }
      : {}),
    android: {
      priority: "high",
      notification: {
        channelId: "icare_default",
        priority: "high",
      },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: {
        aps: {
          alert: { title: input.title, body: input.body },
          sound: "default",
        },
      },
    },
  };

  try {
    return await getMessaging().send(message);
  } catch (error) {
    if (error instanceof FirebaseMessagingError) {
      throw new FcmSendError(error.message, error.code);
    }
    throw error;
  }
}
