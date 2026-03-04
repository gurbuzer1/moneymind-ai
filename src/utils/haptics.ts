import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const hapticLight = () => {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const hapticMedium = () => {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const hapticHeavy = () => {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

export const hapticSuccess = () => {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

export const hapticError = () => {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

export const hapticSelection = () => {
  if (isNative) Haptics.selectionAsync();
};
