// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.whyfired.app',
  appName: 'Why Fired',
  webDir: 'dist', // fallback bundle, used only if the network is unreachable on first load
  server: {
    url: 'https://whyfired.com',
    cleartext: false,
  },
};

export default config;