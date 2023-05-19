import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
} from "react-native";

export default function Layout() {
  const [status, setStatus] = useState("loading");

  const handleAndroidPermissions = async () => {
    if (Platform.OS === "android" && Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      if (
        result?.["android.permission.BLUETOOTH_SCAN"] !== "granted" ||
        result?.["android.permission.BLUETOOTH_CONNECT"] !== "granted" ||
        result?.["android.permission.ACCESS_FINE_LOCATION"] !== "granted"
      ) {
        setStatus("failed");
      } else {
        setStatus("ready");
      }
    } else if (Platform.OS === "android" && Platform.Version >= 23) {
      const checkResult = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (checkResult) {
        setStatus("ready");
      } else {
        const requestResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (requestResult === "granted") {
          setStatus("ready");
        } else {
          setStatus("failed");
        }
      }
    }
  };

  useEffect(() => {
    handleAndroidPermissions();
  }, []);

  if (status === "failed") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ marginBottom: 10 }}>Required Permissions Denied</Text>
        <Text style={{ marginBottom: 10 }}>
          Please allow Bluetooth and Location Services for this app
        </Text>
        <TouchableOpacity
          style={styles.blueBtn}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.textLight}>Go to settings</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
        }}
      >
        <Text style={{ marginRight: 5 }}>Loading</Text>
        <ActivityIndicator size={"small"} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="color"
        options={{
          headerTitle: "Set Color",
        }}
      />
      <Stack.Screen
        name="info"
        options={{
          headerTitle: "Info",
          presentation: "modal",
        }}
      />
    </Stack>
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
  textLight: {
    fontSize: 16,
    color: "#fff",
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
