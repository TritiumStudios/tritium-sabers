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
  Alert,
  TextInput,
  Pressable,
  Keyboard,
} from "react-native";
import { useNavigation, useSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import ColorPicker from "react-native-wheel-color-picker";
import { HexColorPicker } from "react-colorful";

import BleManager from "react-native-ble-manager";
import { bytesToHex, hexToBytes } from "./ble";

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

let services = null;

var timeout;

export default function Color() {
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

  const [color, setColor] = useState(peripheral.color);
  const [prevColor, setPrevColor] = useState(peripheral.color);
  const [power, setPower] = useState(peripheral.power);

  const [bleError, setBleError] = useState(null);

  const [inputColor, setInputColor] = useState(peripheral.color);

  useEffect(() => {
    setInputColor(color);
  }, [color]);

  useEffect(() => {
    connectPeripheral(peripheral);
  }, [peripheral]);

  useEffect(() => {
    if (bleError != null) {
      Alert.alert("Error", bleError);
      navigation.goBack();
    }
  }, [bleError]);

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
      setBleError("Lost connection to the device...");
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
      setPower(true);
      console.log("Color", val);
      console.log("Power true");
    } catch (error) {
      console.log(error);
    }
  };

  const sendPower = async (val) => {
    if (services == null) {
      console.log("Device services not available");
      setPower(!val);
      return;
    }
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
      console.log("Power", power);
    } catch (error) {
      console.log(error);
      setPower(!val);
    }
  };

  useEffect(() => {
    if (!ready) {
      setTimeout(() => {
        setReady(true);
      }, 100);
    }
  }, [ready]);

  useEffect(() => {
    if (color === prevColor) {
      return;
    }
    if (ready) {
      sendColor(color);
      setPrevColor(color);
      setReady(false);
    }
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
      // try {
      //   BleManager.disconnect(peripheral.id);
      // } catch (error) {
      //   console.log(error);
      // }
    };
  }, []);

  const onChangeInput = (newColor) => {
    console.log(newColor);
    var RegExp = /(^#[0-9A-F]{6}$)/i;
    if (RegExp.test(newColor)) {
      setColor(newColor);
    }
    setInputColor(newColor);
  };

  return (
    <Pressable style={styles.body} onPress={() => Keyboard.dismiss()}>
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
              { top: 30, left: 10, position: "absolute" },
            ]}
          >
            Color
          </Text>
          <TextInput
            style={[
              styles.textDark,
              {
                top: 25,
                left: 60,
                position: "absolute",
                backgroundColor: "#ffffff",
                paddingVertical: 5,
                paddingHorizontal: 20,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: "#0003",
              },
            ]}
            value={inputColor}
            onChangeText={onChangeInput}
          ></TextInput>
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
            onValueChange={(val) => {
              setPower(val);
              sendPower(val);
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
    </Pressable>
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
    fontSize: 16,
    color: "#fff",
  },
  textDark: {
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
