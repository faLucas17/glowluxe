import { View } from "react-native";
import { Image } from "expo-image";

/**
 * Logo officiel GlowLuxe By SoFa (image or, fond transparent).
 *  - variant "wordmark" : GlowLuxe + By SoFa (en-tête, petites zones)
 *  - variant "full"     : couronne + GL + GlowLuxe + By SoFa (accueil, connexion, à propos)
 * "size" garde l'échelle de l'ancien logo texte (hauteur du mot GlowLuxe).
 */
const SOURCES = {
  wordmark: { src: require("../../assets/brand/logo-wordmark.png"), ratio: 620 / 208, factor: 2.1 },
  full: { src: require("../../assets/brand/logo-full.png"), ratio: 760 / 559, factor: 4.2 },
};

export default function Logo({ size = 22, center = true, variant = "wordmark" }) {
  const logo = SOURCES[variant] || SOURCES.wordmark;
  const height = size * logo.factor;
  return (
    <View style={{ alignItems: center ? "center" : "flex-start" }}>
      <Image
        source={logo.src}
        style={{ height, width: height * logo.ratio }}
        contentFit="contain"
        accessibilityLabel="GlowLuxe By SoFa"
        cachePolicy="memory-disk"
      />
    </View>
  );
}
