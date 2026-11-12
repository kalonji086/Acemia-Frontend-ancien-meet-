export interface GoogleAccount {
  idToken: string;
  email: string;
  name: string;
}

export async function signInWithGoogle(): Promise<string | null> {
  throw new Error('La connexion Google est disponible uniquement sur Android.');
}

export async function signInWithGoogleAccount(): Promise<GoogleAccount | null> {
  throw new Error('La connexion Google est disponible uniquement sur Android.');
}
