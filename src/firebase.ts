import { initializeApp } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
} from 'firebase/auth';
import {
  clearIndexedDbPersistence,
  doc,
  Firestore,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  terminate,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { redactPII } from './utils/security';

const app = initializeApp(firebaseConfig);

const isSafariOrIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)));

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: isSafariOrIOS
          ? persistentSingleTabManager({})
          : persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;
export const auth = getAuth(app);
auth.useDeviceLanguage();
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
    }[];
  };
}

export function reportFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: redactPII(rawMessage),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
        })) || [],
    },
    operationType,
    path: path ? redactPII(path) : null,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));

  const normalized = rawMessage.toLowerCase();
  if (normalized.includes('permission') || normalized.includes('insufficient')) {
    return 'Sem permissão para sincronizar este item. Verifique se você ainda participa desta lista.';
  }
  if (normalized.includes('quota')) {
    return 'Limite diário de sincronização atingido. Tente novamente mais tarde.';
  }
  if (normalized.includes('unavailable') || normalized.includes('offline') || normalized.includes('network')) {
    return 'Conexão instável. As alterações serão enviadas assim que a internet voltar.';
  }
  return 'Não foi possível concluir a sincronização com a nuvem.';
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const friendlyMessage = reportFirestoreError(error, operationType, path);
  throw new Error(friendlyMessage);
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Verifique a conexão ou a configuração do Firebase.');
    }
  }
}

testConnection();

let activeSignInPromise: Promise<UserCredential> | null = null;

export async function signInWithGoogle(): Promise<UserCredential> {
  if (activeSignInPromise) {
    return activeSignInPromise;
  }
  activeSignInPromise = signInWithPopup(
    auth,
    googleProvider,
    browserPopupRedirectResolver
  ).finally(() => {
    activeSignInPromise = null;
  });
  return activeSignInPromise;
}

export async function signOutUser(): Promise<boolean> {
  await signOut(auth);
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
    return true;
  } catch {
    return false;
  }
}
