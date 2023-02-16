import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Link, usePathname } from "expo-router";
import { RefreshControl } from "react-native-gesture-handler";

import * as SplashScreen from "expo-splash-screen";
import { useFonts, Comfortaa_500Medium } from "@expo-google-fonts/comfortaa";

import BleManager from "react-native-ble-manager";
import { bytesToHex, hexToBytes } from "./ble";
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const SECONDS_TO_SCAN_FOR = 3;
const SERVICE_UUIDS = ["0000004a-0000-1000-8000-00805f9b34fb"];
const ALLOW_DUPLICATES = false;

SplashScreen.preventAutoHideAsync();

const App = () => {
  const [fontsLoaded] = useFonts({
    Comfortaa_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (Platform.OS !== "web") {
    const [isScanning, setIsScanning] = useState(false);
    const [peripherals, setPeripherals] = useState(new Map());

    const pathname = usePathname();

    useEffect(() => {
      console.log("peripherals", peripherals.entries());
    }, [peripherals]);

    const updatePeripherals = (key, value) => {
      setPeripherals(new Map(peripherals.set(key, value)));
    };

    const startScan = () => {
      setPeripherals([]);
      if (!isScanning) {
        try {
          console.log("Scanning...");
          setIsScanning(true);
          BleManager.scan(SERVICE_UUIDS, SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES);
        } catch (error) {
          console.error(error);
        }
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

    const handleUpdateValueForCharacteristic = (data) => {
      console.log(
        "Received data from " +
          data.peripheral +
          " characteristic " +
          data.characteristic,
        data.value
      );
    };

    const handleDiscoverPeripheral = (peripheral) => {
      console.log(
        "Got ble peripheral",
        peripheral.advertising.manufacturerData.bytes
      );
      if (!peripheral.name) {
        peripheral.name = "NO NAME";
      }
      if (peripheral.advertising?.manufacturerData?.bytes[0] === 0) {
        peripheral.power = false;
      } else {
        peripheral.power = true;
      }
      updatePeripherals(peripheral.id, peripheral);
    };

    // const togglePeripheralConnection = async (peripheral) => {
    //   if (peripheral && peripheral.connected) {
    //     BleManager.disconnect(peripheral.id);
    //   } else {
    //     connectPeripheral(peripheral);
    //   }
    // };

    const togglePower = async (peripheral) => {
      peripheral.updating = true;
      updatePeripherals(peripheral.id, peripheral);

      await connectPeripheral(peripheral);
      let services = await BleManager.retrieveServices(peripheral.id);

      var initialPower = await BleManager.read(
        peripheral.id,
        Platform.OS === "ios"
          ? services?.services[0]
          : services?.services[2].uuid,
        Platform.OS === "ios"
          ? services?.characteristics[1]?.characteristic
          : services?.characteristics[5]?.characteristic
      );

      initialPower = bytesToHex(initialPower);
      console.log("initialPower hex", initialPower);
      let power = "00";
      if (initialPower === "00") {
        power = "01";
      }
      let bytes = hexToBytes(power);
      console.log("power", power, bytes);
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
        console.log("Wrote `" + bytes + "`");
      } catch (error) {
        console.log(error);
      }

      peripheral.updating = false;
      if (power === "00") {
        peripheral.power = false;
      } else {
        peripheral.power = true;
      }
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
          "BleManagerDidUpdateValueForCharacteristic",
          handleUpdateValueForCharacteristic
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
      async function disconnectPeripherals() {
        const connectedPeripherals = await BleManager.getConnectedPeripherals(
          SERVICE_UUIDS
        );
        if (connectedPeripherals) {
          connectedPeripherals.forEach((connectedPeripheral) => {
            BleManager.disconnect(connectedPeripheral.id);
          });
        }
      }
      if (pathname === "/") {
        disconnectPeripherals();
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
      console.log("power", item.power);
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
                <View style={{ flex: 1 }}></View>
                <View style={{ flex: 5 }}>
                  <Text style={styles.peripheralName}>{item.name}</Text>
                  <Text style={styles.rssi}>RSSI: {item.rssi}</Text>
                  <Text style={styles.peripheralId}>{item.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {item.updating ? (
                    <ActivityIndicator />
                  ) : (
                    <Switch
                      value={item.power}
                      onChange={() => togglePower(item)}
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
    // fontFamily: "Comfortaa_500Medium",
    fontSize: 20,
    letterSpacing: 0.25,
    color: "#fff",
  },
  body: {
    backgroundColor: "#fff",
    flex: 1,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    // fontFamily: "Comfortaa_500Medium",
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
  },
  sectionDescription: {
    marginTop: 8,
    // fontFamily: "Comfortaa_500Medium",
    fontSize: 18,
    fontWeight: "400",
    color: "#000",
  },
  highlight: {
    fontWeight: "700",
  },
  footer: {
    color: "#000",
    // fontFamily: "Comfortaa_500Medium",
    fontSize: 12,
    fontWeight: "600",
    padding: 4,
    paddingRight: 12,
    textAlign: "right",
  },
  peripheralName: {
    // fontFamily: "Comfortaa_500Medium",
    fontSize: 16,
    textAlign: "center",
    padding: 10,
  },
  rssi: {
    // fontFamily: "Comfortaa_500Medium",
    fontSize: 12,
    textAlign: "center",
    padding: 2,
  },
  peripheralId: {
    // fontFamily: "Comfortaa_500Medium",
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
});

export default App;
