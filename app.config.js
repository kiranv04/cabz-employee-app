// Wraps app.json so the Google Maps keys come from the build environment
// (EAS secrets / local env) instead of being committed. Use SEPARATE keys per
// platform, each restricted to this app's package / bundle id.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: { ...config.ios?.config, googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY },
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    },
  },
});
