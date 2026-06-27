import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
                name: 'ParkSmart',
                short_name: 'ParkSmart',
                description: 'Tìm bãi đỗ xe & gửi xe không vé giấy',
                theme_color: '#00B14F',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/',
                icons: [
                    { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
                ],
            },
            devOptions: { enabled: true },
        }),
    ],
    server: { port: 5173 },
});
