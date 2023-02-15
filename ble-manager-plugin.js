module.exports = function withBleManager(config) {
  // Ensure the objects exist
  if (!config.ios) {
    config.ios = {};
  }
  if (!config.ios.infoPlist) {
    config.ios.infoPlist = {};
  }

  // Append the apiKey
  config.ios.infoPlist["NSBluetoothAlwaysUsageDescription"] =
    "Allow $(PRODUCT_NAME) to use Bluetooth";

  return config;
};
