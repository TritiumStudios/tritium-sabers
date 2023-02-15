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
} from "react-native";
import { Link, usePathname } from "expo-router";
import { RefreshControl } from "react-native-gesture-handler";

import * as SplashScreen from "expo-splash-screen";
import { useFonts, Comfortaa_500Medium } from "@expo-google-fonts/comfortaa";

import BleManager from "react-native-ble-manager";
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const SECONDS_TO_SCAN_FOR = 3;
const SERVICE_UUIDS = ["0000004a-0000-1000-8000-00805f9b34fb"];
const ALLOW_DUPLICATES = false;

// SplashScreen.preventAutoHideAsync();

const App = () => {
  // const [fontsLoaded] = useFonts({
  //   Comfortaa_500Medium,
  // });

  // useEffect(() => {
  //   if (fontsLoaded) {
  //     SplashScreen.hideAsync();
  //   }
  // }, [fontsLoaded]);

  // if (!fontsLoaded) {
  //   return null;
  // }

  if (Platform.OS !== "web") {
    const [isScanning, setIsScanning] = useState(false);
    const [peripherals, setPeripherals] = useState(new Map());

    const pathname = usePathname();

    // console.log({ peripherals: peripherals.entries() });

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

    // const handleUpdateValueForCharacteristic = (data) => {
    //   console.log(
    //     "Received data from " +
    //       data.peripheral +
    //       " characteristic " +
    //       data.characteristic,
    //     data.value
    //   );
    // };

    const handleDiscoverPeripheral = (peripheral) => {
      // console.log("Got ble peripheral", peripheral);
      if (!peripheral.name) {
        peripheral.name = "NO NAME";
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
        // bleManagerEmitter.addListener(
        //   "BleManagerDidUpdateValueForCharacteristic",
        //   handleUpdateValueForCharacteristic
        // ),
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
        console.log(connectedPeripherals);
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
      const backgroundColor = item.connected ? "#069400" : "#fff";
      return (
        <Link
          href={{
            pathname: "/color",
            params: { peripheral: JSON.stringify(item) },
          }}
          asChild
        >
          <TouchableOpacity>
            <View style={[styles.row, { backgroundColor }]}>
              <Text style={styles.peripheralName}>
                {item.name} {item.connecting && "Connecting..."}
              </Text>
              <Text style={styles.rssi}>RSSI: {item.rssi}</Text>
              <Text style={styles.peripheralId}>{item.id}</Text>
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

          {Array.from(peripherals.values()).length == 0 && (
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
                onRefresh={() => startScan()}
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
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "400",
    color: "#000",
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
    // fontFamily: "Comfortaa_500Medium",
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
    fontSize: 12,
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
