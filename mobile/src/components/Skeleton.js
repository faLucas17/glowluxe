import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

import { colors, radius } from "../theme";
import { useGrid } from "../utils/layout";

/** Cases grises animées pendant le chargement : l'écran n'est jamais vide. */
export default function GridSkeleton({ count = 6 }) {
  const { columns, itemWidth, gap, padding } = useGrid();
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap, paddingHorizontal: padding }}>
      {Array.from({ length: Math.max(count, columns * 2) }).map((_, i) => (
        <Animated.View key={i} style={{ width: itemWidth, opacity: pulse, marginBottom: 18 }}>
          <View style={{ height: itemWidth * 1.22, borderRadius: radius.sm, backgroundColor: colors.cream }} />
          <View style={{ height: 10, width: "40%", backgroundColor: colors.cream, marginTop: 10, borderRadius: 4 }} />
          <View style={{ height: 12, width: "80%", backgroundColor: colors.cream, marginTop: 6, borderRadius: 4 }} />
        </Animated.View>
      ))}
    </View>
  );
}
