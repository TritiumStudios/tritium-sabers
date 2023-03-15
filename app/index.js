import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Linking,
  AppState,
  Dimensions,
  Image,
} from "react-native";
import { Link, usePathname } from "expo-router";
import { RefreshControl } from "react-native-gesture-handler";

import * as SplashScreen from "expo-splash-screen";

import BleManager from "react-native-ble-manager";

import { bytesToHex, hexToBytes } from "./ble";
import { AsyncAlertWithCancel } from "./util";

const { height, width } = Dimensions.get("screen");

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const SECONDS_TO_SCAN_FOR = 3;
const SERVICE_UUIDS = ["b8bcb500-7296-4f1d-9a0e-25c2b7d5878a"];
const ALLOW_DUPLICATES = false;

const POWER_INDEX = Platform.OS === "ios" ? 2 : 22;
const RED_INDEX = Platform.OS === "ios" ? 3 : 23;
const GREEN_INDEX = Platform.OS === "ios" ? 4 : 24;
const BLUE_INDEX = Platform.OS === "ios" ? 5 : 25;

var timeout;

SplashScreen.preventAutoHideAsync();

const App = () => {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (Platform.OS !== "web") {
    const appState = useRef(AppState.currentState);
    const [appStateVisible, setAppStateVisible] = useState(appState.current);

    const [isScanning, setIsScanning] = useState(false);
    const [peripherals, setPeripherals] = useState(new Map());

    const [bleState, setBleState] = useState("on");

    const pathname = usePathname();

    useEffect(() => {
      disconnectPeripherals();
      if (appStateVisible === "active") {
        startScan();
      }
    }, [appStateVisible]);

    const updatePeripherals = (key, value) => {
      setPeripherals(new Map(peripherals.set(key, value)));
    };

    const startTimeout = () => {
      timeout = setTimeout(() => {
        stopScan();
        setIsScanning(false);
      }, 7000);
    };

    const stopTimeout = () => {
      clearTimeout(timeout);
    };

    const startScan = () => {
      setIsScanning(true);
      startTimeout();
      disconnectPeripherals();
      setPeripherals(new Map());
      if (!isScanning) {
        try {
          console.log("Scanning...");
          BleManager.scan(SERVICE_UUIDS, SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES);
          stopTimeout();
        } catch (error) {
          console.error(error);
        }
      }
    };

    const stopScan = () => {
      try {
        BleManager.stopScan();
      } catch (error) {
        console.log(error);
      }
    };

    const handleStopScan = () => {
      setIsScanning(false);
      console.log("Scan is stopped");
    };

    const handleDisconnectedPeripheral = (data) => {
      let peripheral = peripherals.get(data.peripheral);
      if (peripheral) {
        peripheral.connected = false;
        updatePeripherals(peripheral.id, peripheral);
      }
      console.log("Disconnected from " + data.peripheral);
    };

    const handleBleManagerDidUpdateState = async (data) => {
      setBleState(data?.state);
      if (data?.state != "on") {
        if (data?.state === "unauthorized") {
          let res = await AsyncAlertWithCancel(
            "Bluetooth Unauthorized",
            "Open settings and allow Bluetooth access"
          );
          if (res) {
            Linking.openSettings();
          }
        } else if (data?.state === "off") {
          let res = await AsyncAlertWithCancel(
            "Bluetooth Disabled",
            "Open settings and enable Bluetooth"
          );
          if (res) {
            Platform.OS === "ios"
              ? Linking.openURL("App-Prefs:Bluetooth")
              : Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");
          }
        } else {
          let res = await AsyncAlertWithCancel(
            "Bluetooth Issue",
            "Open settings and enable Bluetooth"
          );
          if (res) {
            Platform.OS === "ios"
              ? Linking.openURL("App-Prefs:Bluetooth")
              : Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");
          }
        }
      }
    };

    const handleDiscoverPeripheral = (peripheral) => {
      try {
        console.log(
          "Got ble peripheral",
          peripheral.name,
          peripheral,
          peripheral.advertising.manufacturerData.bytes
        );
        if (!peripheral.name) {
          peripheral.name = "NO NAME";
        }
        if (
          peripheral.advertising?.manufacturerData?.bytes[POWER_INDEX] === 0
        ) {
          peripheral.power = false;
        } else {
          peripheral.power = true;
        }
        let red = peripheral.advertising?.manufacturerData?.bytes[RED_INDEX];
        let green =
          peripheral.advertising?.manufacturerData?.bytes[GREEN_INDEX];
        let blue = peripheral.advertising?.manufacturerData?.bytes[BLUE_INDEX];
        let color =
          "#" +
          red.toString(16).padStart(2, "0") +
          green.toString(16).padStart(2, "0") +
          blue.toString(16).padStart(2, "0");
        peripheral.color = color;
        updatePeripherals(peripheral.id, peripheral);
      } catch (error) {}
    };

    const togglePower = async (peripheral, power) => {
      peripheral.updating = true;
      updatePeripherals(peripheral.id, peripheral);

      await connectPeripheral(peripheral);
      let services = await BleManager.retrieveServices(peripheral.id);

      let data = "00";
      if (power) {
        data = "01";
      }
      let bytes = hexToBytes(data);
      try {
        await BleManager.write(
          peripheral.id,
          Platform.OS === "ios"
            ? services?.services[0]
            : services?.services[2].uuid,
          Platform.OS === "ios"
            ? services?.characteristics[1]?.characteristic
            : services?.characteristics[5]?.characteristic,
          bytes
        );

        if (power) {
          peripheral.power = true;
        } else {
          peripheral.power = false;
        }
        console.log("Power", power);
      } catch (error) {
        console.log(error);
      }

      peripheral.updating = false;
      updatePeripherals(peripheral.id, peripheral);

      BleManager.disconnect(peripheral.id);
    };

    const connectPeripheral = async (peripheral) => {
      try {
        if (peripheral) {
          markPeripheral({ connecting: true });
          await BleManager.connect(peripheral.id);
          markPeripheral({ connecting: false, connected: true });
          await BleManager.retrieveServices(peripheral.id);
        }
      } catch (error) {
        console.log("Connection error", error);
      }
      function markPeripheral(props) {
        updatePeripherals(peripheral.id, { ...peripheral, ...props });
      }
    };

    async function disconnectPeripherals() {
      try {
        const connectedPeripherals = await BleManager.getConnectedPeripherals(
          SERVICE_UUIDS
        );
        if (connectedPeripherals) {
          try {
            connectedPeripherals.forEach((connectedPeripheral) => {
              BleManager.disconnect(connectedPeripheral.id);
            });
          } catch (error) {
            console.log(error);
          }
        }
      } catch (error) {
        console.log(error);
      }
    }

    useEffect(() => {
      BleManager.start({ showAlert: false });
      const listeners = [
        bleManagerEmitter.addListener(
          "BleManagerDiscoverPeripheral",
          handleDiscoverPeripheral
        ),
        bleManagerEmitter.addListener("BleManagerStopScan", handleStopScan),
        bleManagerEmitter.addListener(
          "BleManagerDisconnectPeripheral",
          handleDisconnectedPeripheral
        ),
        bleManagerEmitter.addListener(
          "BleManagerDidUpdateState",
          handleBleManagerDidUpdateState
        ),
      ];

      handleAndroidPermissionCheck();

      return () => {
        console.log("unmount");
        for (const listener of listeners) {
          listener.remove();
        }
      };
    }, []);

    useEffect(() => {
      const subscription = AppState.addEventListener(
        "change",
        (nextAppState) => {
          appState.current = nextAppState;
          setAppStateVisible(appState.current);
        }
      );

      return () => {
        subscription.remove();
      };
    }, []);

    useEffect(() => {
      if (pathname === "/") {
        setIsScanning(true);
        setTimeout(() => {
          startScan();
        }, 100);
      } else {
        setPeripherals(new Map());
        stopScan();
      }
    }, [pathname]);

    const handleAndroidPermissionCheck = () => {
      if (Platform.OS === "android" && Platform.Version >= 23) {
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ).then((result) => {
          if (result) {
            console.log("Permission is OK");
          } else {
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            ).then((result) => {
              if (result) {
                console.log("User accept");
              } else {
                console.log("User refuse");
              }
            });
          }
        });
      }
    };

    const renderItem = ({ item }) => {
      return (
        <Link
          href={{
            pathname: "/color",
            params: { peripheral: JSON.stringify(item) },
          }}
          asChild
        >
          <TouchableOpacity>
            <View style={[styles.row]}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <View
                    style={{
                      backgroundColor: item.color,
                      height: 30,
                      width: 30,
                      borderRadius: 5,
                    }}
                  />
                </View>
                <View style={{ flex: 4 }}>
                  <Text style={styles.peripheralName}>Tritium Saber Stand</Text>
                  {/* <Text style={styles.rssi}>RSSI: {item.rssi}</Text> */}
                  <Text style={styles.peripheralId}>{item.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {item.updating ? (
                    <ActivityIndicator />
                  ) : (
                    <Switch
                      value={item.power}
                      onValueChange={(val) => togglePower(item, val)}
                      style={{
                        alignSelf: "flex-start",
                        transform: [
                          { scale: Platform.OS === "android" ? 1.5 : 1 },
                        ],
                      }}
                    />
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Link>
      );
    };

    return (
      <>
        <StatusBar />
        <SafeAreaView style={styles.body}>
          <View
            style={{
              margin: 10,
              marginTop: 50,
              height: 70,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              style={{ width: width * 0.8, resizeMode: "contain" }}
              source={require("../assets/images/black-logo.png")}
            />
          </View>

          {bleState == "on" ? (
            <>
              <Pressable
                style={styles.scanButton}
                onPress={startScan}
                disabled={isScanning}
              >
                <Text style={styles.scanButtonText}>
                  {isScanning ? "Scanning..." : "Scan"}
                </Text>
              </Pressable>

              {!isScanning && Array.from(peripherals.values()).length == 0 && (
                <View style={styles.row}>
                  <Text style={styles.noPeripherals}>No devices found</Text>
                </View>
              )}
              <FlatList
                data={Array.from(peripherals.values())}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                  <RefreshControl
                    refreshing={isScanning}
                    onRefresh={() => {
                      startScan();
                    }}
                  />
                }
              />
            </>
          ) : bleState === "off" ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={styles.textDark}>Bluetooth Disabled</Text>
              <Text style={styles.textDark}>
                Check your control center settings
              </Text>
              <TouchableOpacity
                style={styles.blueBtn}
                onPress={() =>
                  Platform.OS === "ios"
                    ? Linking.openURL("App-Prefs:Bluetooth")
                    : Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS")
                }
              >
                <Text style={styles.textLight}>Go to settings</Text>
              </TouchableOpacity>
            </View>
          ) : bleState === "unauthorized" ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={styles.textDark}>Bluetooth Unauthorized</Text>
              <TouchableOpacity
                style={styles.blueBtn}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.textLight}>Go to settings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={styles.textDark}>Bluetooth Issue</Text>
              <Text style={styles.textDark}>
                Check your settings or restart your phone
              </Text>
              <TouchableOpacity
                style={styles.blueBtn}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.textLight}>Go to settings</Text>
              </TouchableOpacity>
            </View>
          )}
          <Pressable
            style={{
              alignItems: "center",
            }}
            onPress={() =>
              Linking.openURL("https://tritium-studios.canny.io/tritium-sabers")
            }
          >
            <Text style={styles.textLink}>Feedback</Text>
          </Pressable>
        </SafeAreaView>
      </>
    );
  } else {
    return (
      <>
        <StatusBar />
        <SafeAreaView style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.noPeripherals}>
              Web doesn't support Bluetooth
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }
};

const boxShadow = {
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
};

const styles = StyleSheet.create({
  scanButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#000",
    marginTop: 40,
    margin: 10,
    borderRadius: 12,
    height: 75,
    ...boxShadow,
  },
  scanButtonText: {
    fontSize: 20,
    letterSpacing: 0.25,
    color: "#fff",
  },
  body: {
    backgroundColor: "#fff",
    flex: 1,
  },
  highlight: {
    fontWeight: "700",
  },
  footer: {
    color: "#000",
    fontSize: 12,
    fontWeight: "600",
    padding: 4,
    paddingRight: 12,
    textAlign: "right",
  },
  peripheralName: {
    fontSize: 16,
    textAlign: "center",
    padding: 10,
  },
  rssi: {
    fontSize: 12,
    textAlign: "center",
    padding: 2,
  },
  peripheralId: {
    fontSize: 8,
    textAlign: "center",
    padding: 2,
    paddingBottom: 20,
  },
  row: {
    marginLeft: 10,
    marginRight: 10,
    paddingVertical: 2,
    borderTopWidth: 1,
    borderColor: "#0002",
  },
  noPeripherals: {
    margin: 10,
    textAlign: "center",
    color: "#777",
  },
  textLight: {
    fontSize: 16,
    color: "#fff",
  },
  textDark: {
    fontSize: 16,
    color: "#000",
  },
  textLink: {
    fontSize: 12,
    color: "blue",
  },
  blueBtn: {
    backgroundColor: "blue",
    marginVertical: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
    ...boxShadow,
  },
});

export default App;
