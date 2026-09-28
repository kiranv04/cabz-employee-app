import { View, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

// Slim brand bar shown above every tab screen so the SmartCabz logo is always
// visible (Features Item 34). It owns the status-bar safe area, so screens
// below it only need their normal spacing.
export default function BrandHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Image
        source={require('../../assets/brand-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessible
        accessibilityRole="image"
        accessibilityLabel="SmartCabz"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  // Source is 1003×120 - keep that ratio at 22px tall.
  logo: {
    height: 22,
    width: 184,
  },
});
