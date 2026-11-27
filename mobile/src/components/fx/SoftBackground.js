import { memo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { CAN_BLUR } from "./Glass";

/**
 * Fond doux : dégradé crème + 3 grands halos flous (marron, caramel, touche dorée).
 * Chaque halo est fait de disques concentriques très transparents (flou naturel, même sur Android),
 * sans aucune animation : aucun coût pendant le défilement.
 * Les halos restent sur les bords et à faible opacité pour ne jamais gêner la lecture des prix.
 */
const LAYERS = 14;

function Halo({ size, x, y, from, to, strength }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      {Array.from({ length: LAYERS }).map((_, i) => {
        const s = size * (1 - i / (LAYERS + 1));
        return (
          <LinearGradient
            key={i}
            colors={[from, to]}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={{ position: "absolute", left: (size - s) / 2, top: (size - s) / 2, width: s, height: s, borderRadius: s / 2, opacity: strength }}
          />
        );
      })}
    </View>
  );
}

function SoftBackground() {
  const { width, height } = useWindowDimensions();
  const big = Math.max(width, 420) * 0.95;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["#F7F2EC", "#FFFFFF", "#FBF6F0"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <Halo size={big} x={width * 0.95} y={height * 0.08} from="#C8956A" to="#E8C9A0" strength={0.02} />
      <Halo size={big * 0.85} x={width * 0.02} y={height * 0.62} from="#4A2C21" to="#8A5A44" strength={0.013} />
      <Halo size={big * 0.6} x={width * 0.85} y={height * 0.95} from="#D9B26F" to="#F3E3C3" strength={0.024} />
      {/* iOS et web : un flou fixe (calculé une fois) lisse encore les halos */}
      {CAN_BLUR ? <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}

export default memo(SoftBackground);
