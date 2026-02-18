import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      const token = await SecureStore.getItemAsync(key);
      console.log('🔐 Clerk Cache HIT:', key, token ? '(found)' : '(null)');
      return token;
    } catch (err) {
      console.log('🔐 Clerk Cache ERROR:', err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      console.log('🔐 Clerk Cache SAVE:', key);
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export { tokenCache };
