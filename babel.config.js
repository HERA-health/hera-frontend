module.exports = function (api) {
  const web = api.caller(caller => caller?.platform === 'web');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo exposes each icon family separately. Importing the barrel on web
      // includes glyph maps for every family in the first public download.
      ...(web ? [['transform-imports', {
        '@expo/vector-icons': { transform: '@expo/vector-icons/${member}' },
      }]] : []),
      'react-native-reanimated/plugin',
    ],
  };
};
