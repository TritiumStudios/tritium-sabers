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
