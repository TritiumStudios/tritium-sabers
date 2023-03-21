import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
} from "react-native";
import { Link, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Info() {
  const navigation = useNavigation();
  const isPresented = navigation.canGoBack();

  return (
    <View style={styles.body} onPress={() => Keyboard.dismiss()}>
      {!isPresented && (
        <Link href="../" style={[styles.textLink]}>
          Dismiss
        </Link>
      )}
      <View
        style={{
          flex: 1,
          justifyContent: "space-evenly",
          alignItems: "center",
          paddingVertical: 200,
        }}
      >
        <TouchableOpacity
          style={[styles.tryAgainBtn]}
          onPress={() =>
            WebBrowser.openBrowserAsync(
              "https://github.com/TritiumStudios/tritium-sabers"
            )
          }
        >
          <Text style={styles.textLight}>Source Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tryAgainBtn, { backgroundColor: "purple" }]}
          onPress={() =>
            WebBrowser.openBrowserAsync(
              "https://tritium-studios.canny.io/tritium-sabers"
            )
          }
        >
          <Text style={styles.textLight}>Have Feedback?</Text>
        </TouchableOpacity>
        <Text style={styles.textDark}>{`v`}</Text>
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
