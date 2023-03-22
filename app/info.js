import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { openBrowserAsync } from "expo-web-browser";
import { nativeApplicationVersion } from "expo-application";

export default function Info() {
  return (
    <View style={styles.body} onPress={() => Keyboard.dismiss()}>
      <View
        style={{
          flex: 1,
          justifyContent: "space-evenly",
          alignItems: "center",
          paddingVertical: 200,
        }}
      >
        <Text style={styles.textDark}>{"Thanks for using our app! 🙌"}</Text>
        <TouchableOpacity
          style={[styles.tryAgainBtn, { backgroundColor: "blue" }]}
          onPress={() => openBrowserAsync("https://tritiumsabers.com/")}
        >
          <Text style={styles.textLight}>Tritium Sabers Store</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tryAgainBtn, { backgroundColor: "indigo" }]}
          onPress={() =>
            openBrowserAsync("https://github.com/TritiumStudios/tritium-sabers")
          }
        >
          <Text style={styles.textLight}>Source Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tryAgainBtn, { backgroundColor: "purple" }]}
          onPress={() =>
            openBrowserAsync("https://tritium-studios.canny.io/tritium-sabers")
          }
        >
          <Text style={styles.textLight}>Have Feedback?</Text>
        </TouchableOpacity>
        <Text style={styles.textDark}>{`v${nativeApplicationVersion}`}</Text>
      </View>
      {Platform.OS === "ios" && <StatusBar style="light" />}
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
    fontSize: 16,
    color: "#fff",
  },
  textDark: {
    fontSize: 16,
    color: "#000",
  },
  tryAgainBtn: {
    backgroundColor: "blue",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
    ...boxShadow,
  },
  textLink: {
    fontSize: 16,
    color: "blue",
    alignSelf: "flex-start",
  },
});
