import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ChannelScreen } from "../screens/ChannelScreen";

export type RootStackParamList = {
  Dashboard: undefined;
  Channel: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Channel" component={ChannelScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
