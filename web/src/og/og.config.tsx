import { BraiinsOceanCard } from "./cards/braiins-ocean";
import { StartOsCard } from "./cards/startos";
import { UmbrelCard } from "./cards/umbrel";

export default {
  fonts: [
    {
      name: "Inter",
      path: "../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      style: "normal" as const,
      weight: 400 as const,
    },
    {
      name: "Inter",
      path: "../../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff",
      style: "normal" as const,
      weight: 500 as const,
    },
    {
      name: "Inter",
      path: "../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff",
      style: "normal" as const,
      weight: 600 as const,
    },
    {
      name: "JetBrains Mono",
      path: "../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff",
      style: "normal" as const,
      weight: 700 as const,
    },
  ],
  cards: [
    {
      description: "Main Braiins to OCEAN OG card",
      height: 630,
      name: "braiins-ocean",
      outputs: [
        {
          format: "svg" as const,
          path: "./braiins-ocean.svg",
        },
        {
          format: "png" as const,
          path: "../../public/images/rentsomehash-og-braiins-ocean.png",
        },
      ],
      async render({ asset }: { asset: { fitSvgDataUri: (path: string) => Promise<string> } }) {
        const artSrc = await asset.fitSvgDataUri("./assets/braiins-art.svg");

        return <BraiinsOceanCard artSrc={artSrc} />;
      },
      width: 1200,
    },
    {
      description: "StartOS home node OG card",
      height: 630,
      name: "startos",
      outputs: [
        {
          format: "svg" as const,
          path: "./startos.svg",
        },
        {
          format: "png" as const,
          path: "../../public/images/rentsomehash-og-startos.png",
        },
      ],
      async render({ asset }: { asset: { fitSvgDataUri: (path: string) => Promise<string> } }) {
        const artSrc = await asset.fitSvgDataUri("./assets/startos-art.svg");

        return <StartOsCard artSrc={artSrc} />;
      },
      width: 1200,
    },
    {
      description: "Umbrel home node OG card",
      height: 630,
      name: "umbrel",
      outputs: [
        {
          format: "svg" as const,
          path: "./umbrel.svg",
        },
        {
          format: "png" as const,
          path: "../../public/images/rentsomehash-og-umbrel.png",
        },
      ],
      async render({ asset }: { asset: { fitSvgDataUri: (path: string) => Promise<string> } }) {
        const artSrc = await asset.fitSvgDataUri("./assets/umbrel-art.svg");

        return <UmbrelCard artSrc={artSrc} />;
      },
      width: 1200,
    },
  ],
};
