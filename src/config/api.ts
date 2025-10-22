// API Configuration for different environments
// This file handles environment-based API URL switching

// Detect environment
const __DEV__ = process.env.NODE_ENV !== 'production';

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
  if (__DEV__) {
    return ENV.dev;
  }
  return ENV.prod;
};

export default getEnvVars;
