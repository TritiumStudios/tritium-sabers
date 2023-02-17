import { Alert } from "react-native";

export const AsyncAlert = async (title, message) =>
  new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: "Ok",
        onPress: () => {
          resolve(true);
        },
      },
    ]);
  });

export const AsyncAlertWithCancel = async (title, message) =>
  new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: "Ok",
        onPress: () => {
          resolve(true);
        },
      },
      {
        text: "Cancel",
        onPress: () => {
          resolve(false);
        },
      },
    ]);
  });
