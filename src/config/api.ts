// API Configuration for different environments
// This file handles environment-based API URL switching

// Environment configurations
const ENV = {
  dev: {
    apiUrl: 'http://localhost:3000/api',
  },
  prod: {
    apiUrl: 'https://web-production-d125.up.railway.app/api',
  },
};

// Get current environment configuration
const getEnvVars = () => {
  // Check if running in browser (web)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If on localhost, use dev, otherwise use prod
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return ENV.dev;
    }
    return ENV.prod;
  }

  // For native (React Native)
  const isDev = process.env.NODE_ENV !== 'production';
  return isDev ? ENV.dev : ENV.prod;
};

export default getEnvVars;
