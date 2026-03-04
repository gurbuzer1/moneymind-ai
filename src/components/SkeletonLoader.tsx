import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.sm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const DashboardSkeleton: React.FC = () => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.row}>
      <SkeletonLoader width="48%" height={100} borderRadius={borderRadius.lg} />
      <SkeletonLoader width="48%" height={100} borderRadius={borderRadius.lg} />
    </View>
    <SkeletonLoader height={80} borderRadius={borderRadius.lg} style={{ marginTop: 12 }} />
    <SkeletonLoader height={24} width={160} style={{ marginTop: 20 }} />
    <SkeletonLoader height={200} borderRadius={borderRadius.lg} style={{ marginTop: 8 }} />
    <SkeletonLoader height={24} width={180} style={{ marginTop: 20 }} />
    {[1, 2, 3].map((i) => (
      <SkeletonLoader key={i} height={60} borderRadius={borderRadius.lg} style={{ marginTop: 8 }} />
    ))}
  </View>
);

export const TransactionListSkeleton: React.FC = () => (
  <View style={skeletonStyles.container}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <SkeletonLoader key={i} height={68} borderRadius={borderRadius.lg} style={{ marginTop: 8 }} />
    ))}
  </View>
);

const skeletonStyles = StyleSheet.create({
  container: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
