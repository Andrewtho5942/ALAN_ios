module.exports = {
  assets: ['./src/models'],
  dependencies: {
    'react-native-tflite': {
      platforms: {
        ios: {
          podspecPath: 'node_modules/react-native-tflite/react-native-tflite.podspec',
        },
      },
    },
  },
};
