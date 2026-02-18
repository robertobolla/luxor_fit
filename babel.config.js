module.exports = function (api) {
  api.cache(true);
  
  const plugins = [
    [
      "module-resolver",
      {
        root: ["./"],
        alias: {
          "@": "./src",
        },
      },
    ],
  ];

  // Eliminar console.logs en producción
  // Eliminar console.logs en producción
  if (process.env.NODE_ENV === 'production') {
    plugins.push([
      "transform-remove-console",
      {
        "exclude": ["error", "warn"] // Mantener console.error y console.warn
      }
    ]);
  }

  // react-native-reanimated debe ir último
  plugins.push("react-native-reanimated/plugin");

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
