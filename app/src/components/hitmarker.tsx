import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * The hitmarker: four short diagonal ticks around an empty centre. MemeLine's
 * logo mark, and the flash when you favourite something.
 */
export function Hitmarker({ size = 24, color = Colors.text }: { size?: number; color?: string }) {
  const tick = { width: size * 0.32, height: Math.max(2, size * 0.09), backgroundColor: color };
  // each tick sits on a diagonal, pushed out from the centre
  const offset = size * 0.27;
  return (
    <View style={{ width: size, height: size }}>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([x, y]) => (
        <View
          key={`${x}${y}`}
          style={[
            styles.tick,
            tick,
            {
              left: size / 2 - tick.width / 2 + x * offset,
              top: size / 2 - tick.height / 2 + y * offset,
              transform: [{ rotate: x * y > 0 ? '45deg' : '-45deg' }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * A hitmarker that pops and fades once each time `trigger` changes to a new
 * non-zero value. Lay it over whatever was "hit".
 */
export function HitmarkerFlash({ trigger, size = 96 }: { trigger: number; size?: number }) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!trigger) return;
    anim.setValue(1);
    Animated.timing(anim, { toValue: 0, duration: 450, useNativeDriver: true }).start();
  }, [trigger, anim]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.View
        style={{
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }],
        }}>
        <Hitmarker size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tick: { position: 'absolute', borderRadius: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
