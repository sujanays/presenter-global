/** Backend base URL for REST + Socket.IO (client-side). */
export function getBackendUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // Render mobile host → cloud backend (when NEXT_PUBLIC_* missing at build)
    if (hostname.includes('presenter-mobile')) {
      return 'https://presenter-global.onrender.com';
    }
    return `${protocol}//${hostname}:3001`;
  }

  return 'http://localhost:3001';
}
