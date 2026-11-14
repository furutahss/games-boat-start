import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ base: '/boat-start/', plugins: [react()], server: { port: 5176 } });
