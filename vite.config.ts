import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages sirve el proyecto en /GymRat/ (nombre del repositorio).
export default defineConfig({
  base: '/GymRat/',
  plugins: [react()],
});
