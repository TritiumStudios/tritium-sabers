import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  NativeModules,
  NativeEventEmitter,
} from "react-native";
import { Link, useNavigation, useSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import ColorPicker from "react-native-wheel-color-picker";
import { HexColorPicker } from "react-colorful";

import BleManager from "react-native-ble-manager";

const SERVICE_UUID = "0000004a-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "00004a01-0000-1000-8000-00805f9b34fb";

const SERVICE_INDEX = Platform.OS === "ios" ? 0 : 2;
const CHARACTERISTIC_INDEX = Platform.OS === "ios" ? 0 : 4;

// Convert a hex string to a byte array
function hexToBytes(hex) {
  let bytes = [];
  for (let c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

// Convert a byte array to a hex string
function bytesToHex(bytes) {
  let hex = [];
  for (let i = 0; i < bytes.length; i++) {
    let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    hex.push((current >>> 4).toString(16));
    hex.push((current & 0xf).toString(16));
  }
  return hex.join("");
}

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

let services = null;

export default function Modal() {
  const navigation = useNavigation();
  const params = useSearchParams();

  const { peripheral: temp } = params;
  if (temp == null) {
    return <Text>Unknown Device</Text>;
  }

  const [peripheral, setPeripheral] = useState(JSON.parse(params.peripheral));
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const [ready, setReady] = useState(true);

  const [color, setColor] = useState("#ffffff");
  const [prevColor, setPrevColor] = useState("#ffffff");

  useEffect(() => {
    // console.log(peripheral);
    connectPeripheral(peripheral);
  }, [peripheral]);

  const connectPeripheral = async (peripheral) => {
    try {
      if (peripheral) {
        setConnecting(true);
        try {
          await BleManager.connect(peripheral.id);
          services = await BleManager.retrieveServices(peripheral.id);
          var initialColor = await BleManager.read(
            peripheral.id,
            Platform.OS === "ios"
              ? services?.services[0]
              : services?.services[2].uuid,
            Platform.OS === "ios"
              ? services?.characteristics[0]?.characteristic
              : services?.characteristics[4]?.characteristic
          );
          initialColor = "#" + bytesToHex(initialColor);
          setPrevColor(initialColor);
          setColor(initialColor);
          setConnected(true);
          setConnecting(false);
          console.log(`Connected to ${peripheral.id}`);
        } catch (error) {
          console.log(error);
          setConnected(false);
          setConnecting(false);
        }
      }
    } catch (error) {
      console.log("Connection error", error);
    }
  };

  const sendColor = async (val) => {
    if (services == null) {
      console.log("Device services not available");
      return;
    }
    const data = val.split("#")[1];
    const bytes = hexToBytes(data);
    try {
      await BleManager.write(
        peripheral.id,
        Platform.OS === "ios"
          ? services?.services[0]
          : services?.services[2].uuid,
        Platform.OS === "ios"
          ? services?.characteristics[0]?.characteristic
          : services?.characteristics[4]?.characteristic,
        bytes
      );
      // console.log("Wrote `" + bytes + "`");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!ready) {
      setTimeout(() => {
        setReady(true);
      }, 10);
    }
  }, [ready]);

  useEffect(() => {
    if (color === prevColor) {
      return;
    }
    if (ready) {
      sendColor(color);
      setReady(false);
    }
    setPrevColor(color);
  }, [color, ready]);

  const handleDisconnectedPeripheral = (data) => {
    console.log(data);
    if (data.peripheral === peripheral.id) {
      setConnected(false);
    }
  };

  useEffect(() => {
    const listeners = [
      bleManagerEmitter.addListener(
        "BleManagerDisconnectPeripheral",
        handleDisconnectedPeripheral
      ),
    ];

    return () => {
      for (const listener of listeners) {
        listener.remove();
      }
      BleManager.disconnect(peripheral.id);
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 25,
      }}
    >
      {connected ? (
        <View>
          {Platform.OS === "web" ? (
            <HexColorPicker color={color} onChange={setColor} />
          ) : (
            <ColorPicker
              color={color}
              onColorChange={(val) => setColor(val)}
              thumbSize={40}
              sliderSize={40}
              noSnap={true}
              row={false}
            />
          )}
        </View>
      ) : connecting ? (
        <View>
          <ActivityIndicator size={"large"} />
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text>Not Connected</Text>
          <TouchableOpacity
            style={{
              backgroundColor: "blue",
              marginVertical: 20,
              paddingVertical: 10,
              paddingHorizontal: 30,
              borderRadius: 5,
            }}
            onPress={() => connectPeripheral(peripheral)}
          >
            <Text style={{ color: "#fff" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* <Link
        asChild
        href="../"
        style={{ top: 40, left: 20, position: "absolute" }}
      >
        <TouchableOpacity>
          <Text style={{ color: "blue" }}>Go Back</Text>
        </TouchableOpacity>
      </Link> */}
    </View>
  );
}
