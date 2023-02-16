import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  NativeModules,
  NativeEventEmitter,
  StyleSheet,
  Switch,
} from "react-native";
import { Link, useNavigation, useSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import ColorPicker from "react-native-wheel-color-picker";
import { HexColorPicker } from "react-colorful";

import BleManager from "react-native-ble-manager";
import { bytesToHex, hexToBytes } from "./ble";

const SERVICE_UUID = "0000004a-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "00004a01-0000-1000-8000-00805f9b34fb";

const SERVICE_INDEX = Platform.OS === "ios" ? 0 : 2;
const CHARACTERISTIC_INDEX = Platform.OS === "ios" ? 0 : 4;

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

let services = null;

var timeout;

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
  const [power, setPower] = useState(peripheral.power);

  useEffect(() => {
    // console.log(peripheral);
    connectPeripheral(peripheral);
  }, [peripheral]);

  const startTimeout = () => {
    timeout = setTimeout(() => {
      setConnecting(false);
      setConnected(false);
    }, 5000);
  };

  const stopTimeout = () => {
    clearTimeout(timeout);
  };

  const connectPeripheral = async (peripheral) => {
    startTimeout();
    try {
      if (peripheral) {
        setConnecting(true);
        try {
          await BleManager.connect(peripheral.id);
          stopTimeout();
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

  const sendPower = async (val) => {
    if (services == null) {
      console.log("Device services not available");
      return;
    }
    console.log("val");
    let data = "00";
    if (val) {
      data = "01";
    }
    const bytes = hexToBytes(data);
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
  };

  useEffect(() => {
    if (!ready) {
      setTimeout(() => {
        setReady(true);
      }, 20);
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

  useEffect(() => {
    sendPower(power);
  }, [power]);

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
    <View style={styles.body}>
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
          <Text
            style={[
              styles.textDark,
              { top: 30, right: 70, position: "absolute" },
            ]}
          >
            Power
          </Text>
          <Switch
            value={power}
            onChange={(val) => {
              setPower((previousState) => !previousState);
            }}
            style={{ top: 25, right: 10, position: "absolute" }}
          />
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
          <Text style={styles.textDark}>Not Connected</Text>
          <TouchableOpacity
            style={styles.tryAgainBtn}
            onPress={() => connectPeripheral(peripheral)}
          >
            <Text style={styles.textLight}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

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
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  textLight: {
    // fontFamily: "Comfortaa_500Medium",
    fontSize: 16,
    color: "#fff",
  },
  textDark: {
    // fontFamily: "Comfortaa_500Medium",
    fontSize: 16,
    color: "#000",
  },
  tryAgainBtn: {
    backgroundColor: "blue",
    marginVertical: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
    ...boxShadow,
  },
});
