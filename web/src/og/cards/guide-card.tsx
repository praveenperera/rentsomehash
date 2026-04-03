import type { CSSProperties, ReactNode } from "react";

interface GuideCardProps {
  eyebrow: string;
  footerLabel: string;
  pills: string[];
  renderIllustration: (size: IllustrationSize) => ReactNode;
  route: string;
  subtitle: string;
  title: string;
}

interface IllustrationSize {
  height: number;
  width: number;
}

interface LayoutProfile {
  artHeight: number;
  artWidth: number;
  bodyGap: number;
  eyebrowFontSize: number;
  eyebrowLineHeight: number;
  footerGap: number;
  footerPaddingTop: number;
  innerPadding: number;
  name: string;
  pillHeight: number;
  pillPadX: number;
  sectionGap: number;
  splitGap: number;
  subtitleFontSize: number;
  subtitleLineHeight: number;
  titleFontSize: number;
  titleLineHeight: number;
}

const panelBorder = "1px solid rgba(255,255,255,0.12)";
const canvasWidth = 1200;
const canvasHeight = 630;
const outerPadding = 48;
const accentBarHeight = 5;
const routeBadgeHeight = 46;
const footerTextHeight = 17;
const illustrationTopOffset = 18;

const layoutProfiles: LayoutProfile[] = [
  {
    artHeight: 208,
    artWidth: 264,
    bodyGap: 18,
    eyebrowFontSize: 29,
    eyebrowLineHeight: 1.1,
    footerGap: 24,
    footerPaddingTop: 14,
    innerPadding: 46,
    name: "balanced",
    pillHeight: 34,
    pillPadX: 22,
    sectionGap: 30,
    splitGap: 28,
    subtitleFontSize: 24,
    subtitleLineHeight: 1.3,
    titleFontSize: 50,
    titleLineHeight: 1.1,
  },
  {
    artHeight: 186,
    artWidth: 236,
    bodyGap: 16,
    eyebrowFontSize: 27,
    eyebrowLineHeight: 1.08,
    footerGap: 22,
    footerPaddingTop: 12,
    innerPadding: 42,
    name: "compact",
    pillHeight: 32,
    pillPadX: 20,
    sectionGap: 26,
    splitGap: 24,
    subtitleFontSize: 23,
    subtitleLineHeight: 1.28,
    titleFontSize: 46,
    titleLineHeight: 1.08,
  },
  {
    artHeight: 172,
    artWidth: 220,
    bodyGap: 14,
    eyebrowFontSize: 26,
    eyebrowLineHeight: 1.06,
    footerGap: 20,
    footerPaddingTop: 10,
    innerPadding: 40,
    name: "dense",
    pillHeight: 30,
    pillPadX: 18,
    sectionGap: 22,
    splitGap: 20,
    subtitleFontSize: 22,
    subtitleLineHeight: 1.24,
    titleFontSize: 42,
    titleLineHeight: 1.06,
  },
];

const routeBadgeStyle: CSSProperties = {
  alignItems: "center",
  alignSelf: "flex-start",
  backgroundColor: "#171A1F",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 999,
  color: "#E8EAEE",
  display: "flex",
  fontFamily: "Inter",
  fontSize: 19,
  fontWeight: 600,
  height: 46,
  letterSpacing: 3,
  paddingLeft: 24,
  paddingRight: 24,
  textTransform: "uppercase",
};

function Pill({ children, layout }: { children: string; layout: LayoutProfile }) {
  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: "#1A1D22",
        border: panelBorder,
        borderRadius: 999,
        display: "flex",
        height: layout.pillHeight,
        justifyContent: "center",
        paddingLeft: layout.pillPadX,
        paddingRight: layout.pillPadX,
      }}
    >
      <span
        style={{
          color: "#FF9F57",
          fontFamily: "JetBrains Mono",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: 1.5,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function GuideCard({
  eyebrow,
  footerLabel,
  pills,
  renderIllustration,
  route,
  subtitle,
  title,
}: GuideCardProps) {
  const layout = pickLayoutProfile({
    eyebrow,
    pills,
    route,
    subtitle,
    title,
  });
  const textWidth = getTextWidth(layout);
  const illustration = renderIllustration({
    height: layout.artHeight,
    width: layout.artWidth,
  });

  return (
    <div
      style={{
        backgroundColor: "#090A0D",
        backgroundImage: "linear-gradient(135deg, #14161A 0%, #090A0D 100%)",
        display: "flex",
        height: "100%",
        overflow: "hidden",
        padding: 48,
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          backgroundColor: "#FF7A18",
          borderRadius: 999,
          height: 360,
          left: -120,
          opacity: 0.08,
          position: "absolute",
          top: 340,
          width: 360,
        }}
      />
      <div
        style={{
          backgroundColor: "#FF7A18",
          borderRadius: 999,
          height: 300,
          opacity: 0.06,
          position: "absolute",
          right: -70,
          top: 30,
          width: 300,
        }}
      />

      <div
        style={{
          backgroundColor: "rgba(15,17,21,0.96)",
          backgroundImage:
            "linear-gradient(135deg, rgba(26,29,34,0.98) 0%, rgba(15,17,21,0.96) 100%)",
          border: panelBorder,
          borderRadius: 28,
          display: "flex",
          flex: 1,
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            backgroundImage: "linear-gradient(90deg, #FF7A18 0%, #FF9F57 100%)",
            height: 5,
            width: "100%",
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: layout.sectionGap,
            padding: layout.innerPadding,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: layout.sectionGap,
            }}
          >
            <div style={routeBadgeStyle}>{route}</div>
            <div
              style={{
                color: "#FF9F57",
                fontFamily: "JetBrains Mono",
                fontSize: layout.eyebrowFontSize,
                fontWeight: 700,
                letterSpacing: 2.5,
                lineHeight: layout.eyebrowLineHeight,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </div>

            <div
              style={{
                alignItems: "flex-start",
                display: "flex",
                gap: layout.splitGap,
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  flexDirection: "column",
                  gap: layout.bodyGap,
                  maxWidth: textWidth,
                }}
              >
                <div
                  style={{
                    color: "#F7F8FA",
                    fontFamily: "JetBrains Mono",
                    fontSize: layout.titleFontSize,
                    fontWeight: 700,
                    letterSpacing: -2,
                    lineHeight: layout.titleLineHeight,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    color: "#C9CED6",
                    fontFamily: "Inter",
                    fontSize: layout.subtitleFontSize,
                    fontWeight: 500,
                    lineHeight: layout.subtitleLineHeight,
                  }}
                >
                  {subtitle}
                </div>
              </div>

              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "center",
                  minWidth: layout.artWidth,
                  paddingTop: illustrationTopOffset,
                }}
              >
                {illustration}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: layout.footerGap,
              marginTop: "auto",
              paddingTop: layout.footerPaddingTop,
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              {pills.map((pill) => (
                <Pill key={pill} layout={layout}>{pill}</Pill>
              ))}
            </div>

            <div
              style={{
                alignItems: "center",
                color: "#AEB5C0",
                display: "flex",
                fontFamily: "Inter",
                fontSize: 17,
                fontWeight: 600,
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  color: "#8F98A6",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                rentsomehash.com
              </div>

              <div
                style={{
                  fontWeight: 500,
                }}
              >
                {footerLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pickLayoutProfile(content: {
  eyebrow: string;
  pills: string[];
  route: string;
  subtitle: string;
  title: string;
}): LayoutProfile {
  for (const layout of layoutProfiles) {
    if (layoutFits(layout, content)) {
      return layout;
    }
  }

  return layoutProfiles[layoutProfiles.length - 1];
}

function layoutFits(
  layout: LayoutProfile,
  content: {
    eyebrow: string;
    pills: string[];
    route: string;
    subtitle: string;
    title: string;
  },
): boolean {
  const textWidth = getTextWidth(layout);
  const titleLines = estimateWrappedLines(
    content.title,
    layout.titleFontSize,
    textWidth,
    0.62,
  );
  const subtitleLines = estimateWrappedLines(
    content.subtitle,
    layout.subtitleFontSize,
    textWidth,
    0.54,
  );
  const titleHeight = titleLines * layout.titleFontSize * layout.titleLineHeight;
  const subtitleHeight = subtitleLines * layout.subtitleFontSize * layout.subtitleLineHeight;
  const textBlockHeight = titleHeight + layout.bodyGap + subtitleHeight;
  const eyebrowHeight = layout.eyebrowFontSize * layout.eyebrowLineHeight;
  const splitHeight = Math.max(
    textBlockHeight,
    layout.artHeight + illustrationTopOffset,
  );
  const topHeight =
    routeBadgeHeight
    + layout.sectionGap
    + eyebrowHeight
    + layout.sectionGap
    + splitHeight;
  const pillLines = estimatePillLines(content.pills, layout);
  const pillHeight =
    pillLines * layout.pillHeight + (pillLines - 1) * 14;
  const footerHeight =
    layout.footerPaddingTop
    + pillHeight
    + layout.footerGap
    + footerTextHeight;
  const availableHeight =
    canvasHeight
    - outerPadding * 2
    - accentBarHeight
    - layout.innerPadding * 2;

  return titleLines <= 3
    && subtitleLines <= 4
    && topHeight + footerHeight <= availableHeight;
}

function getTextWidth(layout: LayoutProfile): number {
  const contentWidth = canvasWidth - outerPadding * 2 - layout.innerPadding * 2;
  return contentWidth - layout.artWidth - layout.splitGap;
}

function estimateWrappedLines(
  text: string,
  fontSize: number,
  maxWidth: number,
  averageCharWidth: number,
): number {
  const words = text.trim().split(/\s+/);

  if (words.length === 0) {
    return 1;
  }

  const spaceWidth = fontSize * averageCharWidth;
  let currentLineWidth = 0;
  let lines = 1;

  for (const word of words) {
    const wordWidth = word.length * fontSize * averageCharWidth;
    const nextWidth = currentLineWidth === 0
      ? wordWidth
      : currentLineWidth + spaceWidth + wordWidth;

    if (nextWidth > maxWidth && currentLineWidth > 0) {
      lines += 1;
      currentLineWidth = wordWidth;
      continue;
    }

    currentLineWidth = nextWidth;
  }

  return lines;
}

function estimatePillLines(pills: string[], layout: LayoutProfile): number {
  const contentWidth = canvasWidth - outerPadding * 2 - layout.innerPadding * 2;
  const gap = 14;
  let currentLineWidth = 0;
  let lines = 1;

  for (const pill of pills) {
    const textWidth = pill.length * 15 * 0.62;
    const pillWidth = textWidth + layout.pillPadX * 2;
    const nextWidth = currentLineWidth === 0
      ? pillWidth
      : currentLineWidth + gap + pillWidth;

    if (nextWidth > contentWidth && currentLineWidth > 0) {
      lines += 1;
      currentLineWidth = pillWidth;
      continue;
    }

    currentLineWidth = nextWidth;
  }

  return lines;
}
