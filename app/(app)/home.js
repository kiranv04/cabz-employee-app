import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/constants/colors';

export default function HomeScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const employee = user?.employee;
  const costCenter = employee?.cost_center;
  const branch = costCenter?.branch;
  const company = branch?.company;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = (name) => name?.split(' ')[0] || 'there';

  const onRefresh = async () => {
    setRefreshing(true);
    // Will hook into real API later
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()},
            </Text>
            <Text style={styles.userName}>
              {getFirstName(user?.name)} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/(app)/profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.profileInitial}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Company Info */}
        <View style={styles.contextBar}>
          <View style={styles.contextItem}>
            <Ionicons name="business-outline" size={14} color={colors.primary} />
            <Text style={styles.contextText} numberOfLines={1}>
              {company?.name || '—'}
            </Text>
          </View>
          <View style={styles.contextDivider} />
          <View style={styles.contextItem}>
            <Ionicons name="people-outline" size={14} color={colors.primary} />
            <Text style={styles.contextText} numberOfLines={1}>
              {costCenter?.name || '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Book a Cab CTA */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => router.push('/(app)/book-cab')}
          activeOpacity={0.85}
        >
          <View style={styles.bookButtonLeft}>
            <View style={styles.bookIconContainer}>
              <Ionicons name="car" size={26} color={colors.white} />
            </View>
            <View>
              <Text style={styles.bookButtonTitle}>Book a Cab</Text>
              <Text style={styles.bookButtonSubtitle}>
                Schedule your next ride
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward-circle" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Active Booking */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Booking</Text>
        <ActiveBookingEmpty />
      </View>

      {/* Recent Trips */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/history')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <RecentTripsEmpty />
      </View>

    </ScrollView>
  );
}

function ActiveBookingEmpty() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="car-outline" size={28} color={colors.gray300} />
      </View>
      <Text style={styles.emptyTitle}>No active bookings</Text>
      <Text style={styles.emptySubtitle}>
        Your current or upcoming ride will appear here.
      </Text>
    </View>
  );
}

function RecentTripsEmpty() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="time-outline" size={28} color={colors.gray300} />
      </View>
      <Text style={styles.emptyTitle}>No trips yet</Text>
      <Text style={styles.emptySubtitle}>
        Your completed rides will show up here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },

  // Header
  header: {
    backgroundColor: colors.white,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: colors.gray500,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 2,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // Context bar
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contextDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.gray200,
  },
  contextText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // Book CTA
  bookButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  bookButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bookIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  bookButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // Empty states
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
});