import * as SecureStore from 'expo-secure-store';
import { apiClient, setAuthToken } from './api';

const TOKEN_KEY = 'moneymind_auth_token';

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  setAuthToken(token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  setAuthToken(null);
}

export async function initAuth(): Promise<boolean> {
  const token = await getStoredToken();
  if (token) {
    setAuthToken(token);
    return true;
  }
  return false;
}

export async function register(
  email: string,
  password: string,
  displayName: string
): Promise<{ token: string; user: { id: string; email: string; displayName: string } }> {
  const { data } = await apiClient.post('/auth/register', { email, password, displayName });
  await storeToken(data.token);
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: { id: string; email: string; displayName: string } }> {
  const { data } = await apiClient.post('/auth/login', { email, password });
  await storeToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  await removeToken();
}
