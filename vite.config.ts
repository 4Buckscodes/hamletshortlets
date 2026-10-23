import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-expect-error The optional local plugin is JavaScript without a declaration file.
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {
    // The source-tag plugin is only available in development workspaces.
  }

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    server: {
      allowedHosts: ['.e2b.app'],
    },
    preview: {
      allowedHosts: ['.e2b.app'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
            if (/node_modules[\\/](react-router|@remix-run)[\\/]/.test(id)) return 'router-vendor';
            if (/node_modules[\\/]framer-motion[\\/]/.test(id)) return 'motion-vendor';
            if (/node_modules[\\/]lucide-react[\\/]/.test(id)) return 'icon-vendor';
            return 'vendor';
          },
        },
      },
    },
  };
})
