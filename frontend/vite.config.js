import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy pour les API calls
      "/api": {
        target: "http://localhost:2029",
        changeOrigin: true,
        secure: false,
      },
      // Proxy pour l'authentification
      "/auth": {
        target: "http://localhost:2029",
        changeOrigin: true,
        secure: false,
      },
      // Proxy pour les fichiers uploadés
      "/uploads": {
        target: "http://localhost:2029",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
