const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error('Falta definir VITE_API_BASE_URL en las variables de entorno.');
}

export const env = {
  apiBaseUrl,
};
