import { View } from "react-native";
import { Image } from "expo-image";

/**
 * Logo officiel GlowLuxe By SoFa (couronne + GL + signature), en image.
 *  - variant "wordmark" : GlowLuxe + By SoFa (en-tête)
 *  - variant "full"     : couronne, GL, GlowLuxe, By SoFa (accueil, connexion)
 *  - light=true         : version or lumineux pour fond noir ; sinon or foncé pour fond clair
 * "size" garde la même échelle qu'avant (hauteur du mot GlowLuxe).
 */
const SOURCES = {
  wordmark: {
    dark: require("../../assets/brand/logo-wordmark-dark.png"),
    light: require("../../assets/brand/logo-wordmark-light.png"),
    ratio: 1049 / 352,
  },
  full: {
    dark: require("../../assets/brand/logo-full-dark.png"),
    light: require("../../assets/brand/logo-full-light.png"),
    ratio: 1073 / 793,
  },
};

export default function Logo({ size = 22, light = false, center = true, variant = "wordmark" }) {
  const src = SOURCES[variant] || SOURCES.wordmark;
  const height = variant === "full" ? size * 4.2 : size * 2.1;
  return (
    <View style={{ alignItems: center ? "center" : "flex-start" }}>
      <Image
        source={light ? src.dark : src.light}
        style={{ height, width: height * src.ratio }}
        contentFit="contain"
        accessibilityLabel="GlowLuxe By SoFa"
        cachePolicy="memory-disk"
      />
    </View>
  );
}
