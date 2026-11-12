import Constants from 'expo-constants';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import type { GoogleAccount } from './google-auth';

const webClientId = Constants.expoConfig?.extra?.googleWebClientId;

if (typeof webClientId === 'string' && webClientId.length > 0) {
  GoogleSignin.configure({ webClientId, offlineAccess: false });
}

export async function signInWithGoogleAccount(): Promise<GoogleAccount | null> {
  if (typeof webClientId !== 'string' || webClientId.length === 0) {
    throw new Error('La connexion Google n’est pas configurée pour cette application.');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (isCancelledResponse(response)) return null;
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error('Google n’a pas fourni de jeton de connexion.');
  }

  const { email, name } = response.data.user;
  if (!email) {
    throw new Error('Google n’a pas fourni d’adresse e-mail.');
  }

  return {
    idToken: response.data.idToken,
    email,
    name: name || '',
  };
}

export async function signInWithGoogle(): Promise<string | null> {
  const account = await signInWithGoogleAccount();
  return account?.idToken || null;
}
