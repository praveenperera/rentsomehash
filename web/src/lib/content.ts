import { getCollection, type CollectionEntry } from "astro:content";

export type GuideEntry = CollectionEntry<"guides">;

export async function getHomePage() {
  const pages = await getCollection("pages");
  const home = pages.find((entry) => entry.id === "home");

  if (!home) {
    throw new Error("Expected content/pages/home.md to exist");
  }

  return home;
}

export async function getGuides() {
  return (await getCollection("guides")).sort(
    (left, right) => left.data.order - right.data.order,
  );
}

export function getGuideHref(entry: GuideEntry) {
  return `/guides/${entry.data.slug}/`;
}

export function getReadingTime(entry: GuideEntry) {
  const body = entry.body ?? "";
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 190));

  return `${minutes} min read`;
}

export function getGuideNeighbors(guides: GuideEntry[], slug: string) {
  const currentIndex = guides.findIndex((entry) => entry.data.slug === slug);

  return {
    previous: currentIndex > 0 ? guides[currentIndex - 1] : undefined,
    next:
      currentIndex >= 0 && currentIndex < guides.length - 1
        ? guides[currentIndex + 1]
        : undefined,
  };
}
