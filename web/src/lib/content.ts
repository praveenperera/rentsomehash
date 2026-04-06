import { getCollection, type CollectionEntry } from "astro:content";

export type GuideEntry = CollectionEntry<"guides">;
export type GuideStage = GuideEntry["data"]["stage"];

const guideStageOrder: Record<GuideStage, number> = {
  node: 0,
  braiins: 1,
};

export async function getHomePage() {
  const pages = await getCollection("pages");
  const home = pages.find((entry) => entry.id === "home");

  if (!home) {
    throw new Error("Expected content/pages/home.md to exist");
  }

  return home;
}

export async function getGuides() {
  return [...(await getCollection("guides"))].sort(
    (left, right) =>
      guideStageOrder[left.data.stage] - guideStageOrder[right.data.stage] ||
      left.data.order - right.data.order,
  );
}

export function getGuideHref(entry: GuideEntry) {
  return `/guides/${entry.data.slug}/`;
}

export function getNodeGuides(guides: GuideEntry[]) {
  return guides.filter((entry) => entry.data.stage === "node");
}

export function getBraiinsGuides(guides: GuideEntry[]) {
  return guides.filter((entry) => entry.data.stage === "braiins");
}

export function getFeaturedNodeGuide(guides: GuideEntry[]) {
  const nodeGuides = getNodeGuides(guides);

  return nodeGuides.find((entry) => entry.data.featured) ?? nodeGuides[0];
}

export function getPrimaryBraiinsGuide(guides: GuideEntry[]) {
  return getBraiinsGuides(guides)[0];
}

export function getGuideStageLabel(entry: GuideEntry) {
  return entry.data.stage === "node" ? "Node setup" : "Braiins setup";
}

export function getReadingTime(entry: GuideEntry) {
  const body = entry.body ?? "";
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 190));

  return `${minutes} min read`;
}
