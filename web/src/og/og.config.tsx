import { BraiinsOceanCard } from "./cards/braiins-ocean";
import { CalculatorCard } from "./cards/calculator";
import { StartOsCard } from "./cards/startos";
import { UmbrelCard } from "./cards/umbrel";
import { VpsCard } from "./cards/vps";

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
      description: "Hashpower calculator OG card",
      height: 630,
      name: "calculator",
      outputs: [
        {
          format: "svg" as const,
          path: "./calculator.svg",
        },
        {
          format: "png" as const,
          path: "../../public/images/rentsomehash-og-calculator.png",
        },
      ],
      async render({
        asset,
      }: {
        asset: { fitSvgDataUri: (path: string) => Promise<string> };
      }) {
        const artSrc = await asset.fitSvgDataUri("./assets/braiins-art.svg");

        return <CalculatorCard artSrc={artSrc} />;
      },
      width: 1200,
    },
    {
      description: "Fresh VPS node setup OG card",
      height: 630,
      name: "vps",
      outputs: [
        {
          format: "svg" as const,
          path: "./vps.svg",
        },
        {
          format: "png" as const,
          path: "../../public/images/rentsomehash-og-vps.png",
        },
      ],
      async render({
        asset,
      }: {
        asset: { fitSvgDataUri: (path: string) => Promise<string> };
      }) {
        const artSrc = await asset.fitSvgDataUri("./assets/braiins-art.svg");

        return <VpsCard artSrc={artSrc} />;
      },
      width: 1200,
    },
    {
      description: "Shared Braiins OG card",
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
      async render({
        asset,
      }: {
        asset: { fitSvgDataUri: (path: string) => Promise<string> };
      }) {
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
      async render({
        asset,
      }: {
        asset: { fitSvgDataUri: (path: string) => Promise<string> };
      }) {
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
      async render({
        asset,
      }: {
        asset: { fitSvgDataUri: (path: string) => Promise<string> };
      }) {
        const artSrc = await asset.fitSvgDataUri("./assets/umbrel-art.svg");

        return <UmbrelCard artSrc={artSrc} />;
      },
      width: 1200,
    },
  ],
};
