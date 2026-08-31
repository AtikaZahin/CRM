import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';

export const DashboardScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Dashboard</Text>
        
        <View style={styles.statsContainer}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>$24.5k</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </GlassCard>
          
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>124</Text>
            <Text style={styles.statLabel}>Active Leads</Text>
          </GlassCard>
        </View>

        <GlassCard style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.activityItem}>New lead: Sarah Connor</Text>
          <Text style={styles.activityItem}>Meeting scheduled with John Doe</Text>
          <Text style={styles.activityItem}>Deal closed: Stark Industries</Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 0.48,
    alignItems: 'center',
    paddingVertical: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  recentActivity: {
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  activityItem: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 12,
  },
});
