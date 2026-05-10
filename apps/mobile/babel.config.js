module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // No añadir react-native-reanimated/plugin aquí: babel-preset-expo ya lo inyecta
    // (usa react-native-worklets/plugin si el paquete worklets está instalado).
  };
};
