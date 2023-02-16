import { Stack } from "expo-router";

export default function Layout() {
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
          // headerTitleStyle: {
          //   fontFamily: "Comfortaa_500Medium",
          // },
          // headerShown: false,
        }}
      />
    </Stack>
  );
}
