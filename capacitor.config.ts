interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme?: string;
  };
  android?: {
    allowMixedContent?: boolean;
    backgroundColor?: string;
    webContentsDebuggingEnabled?: boolean;
  };
}

const config: CapacitorConfig = {
  appId: 'com.streetrush3d.game',
  appName: 'Street Rush 3D',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
    webContentsDebuggingEnabled: false,
  },
};

export default config;
