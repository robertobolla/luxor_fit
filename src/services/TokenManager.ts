// Utility to manage Clerk token outside of React lifecycle
// This allows the Supabase client (which is a singleton) to access the latest token

// Utility to manage Clerk token outside of React lifecycle
// This allows the Supabase client (which is a singleton) to access the latest token

let tokenFetcher: (() => Promise<string | null>) | null = null;
let currentToken: string | null = null;

export const TokenManager = {
    setTokenFetcher: (fetcher: () => Promise<string | null>) => {
        tokenFetcher = fetcher;
    },

    /**
     * Obtains a valid token, refreshing if necessary via the registered fetcher.
     */
    getToken: async (): Promise<string | null> => {
        if (tokenFetcher) {
            try {
                const token = await tokenFetcher();
                currentToken = token;
                return token;
            } catch (error) {
                console.error('Error fetching fresh token in TokenManager:', error);
                return currentToken; // Fallback to last known token
            }
        }
        return currentToken;
    },

    // Legacy method kept for compatibility, but primarily we rely on fetcher now
    setToken: (token: string | null) => {
        currentToken = token;
    },

    waitForToken: async (timeoutMs = 2000): Promise<string | null> => {
        // Try to get a fresh token immediately
        if (tokenFetcher) {
            const token = await TokenManager.getToken();
            if (token) return token;
        }

        if (currentToken) return currentToken;

        return new Promise((resolve) => {
            const checkInterval = setInterval(async () => {
                let token = currentToken;
                if (tokenFetcher) {
                    try {
                        token = await tokenFetcher();
                    } catch (e) { }
                }

                if (token) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutId);
                    resolve(token);
                }
            }, 100);

            const timeoutId = setTimeout(() => {
                clearInterval(checkInterval);
                resolve(null);
            }, timeoutMs);
        });
    },

    invalidateToken: async () => {
        console.log('🔄 TokenManager: Invalidando token actual...');
        currentToken = null;
        if (tokenFetcher) {
            try {
                // Intentar forzar un refresco si es posible
                const newToken = await tokenFetcher();
                if (newToken) {
                    currentToken = newToken;
                    console.log('🔄 TokenManager: Token refrescado exitosamente');
                }
            } catch (e) {
                console.error('Error refrescando token:', e);
            }
        }
    }
};
