import type { MetadataRoute } from 'next';

// Nom et icône quand le site est ajouté à l'écran d'accueil (Android).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gala Live — EI d’Israël',
    short_name: 'Gala Live',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0b4a9e',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
