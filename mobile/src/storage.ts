import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStorage } from '../../shared/sync';

export const nativeStorage: KeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
