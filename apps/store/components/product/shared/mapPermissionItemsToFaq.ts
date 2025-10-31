import type { FaqItem } from "@/components/product/landers/marketplace/sections/FaqAccordion";

export type PermissionDisplayItem = {
  id: string;
  title: string;
  description: string;
  learnMoreUrl?: string;
};

export function mapPermissionItemsToFaq(items: PermissionDisplayItem[]): FaqItem[] {
  return items
    .map((item) => {
      const question = item.title.trim();
      const answerBase = item.description.trim();
      if (!question || !answerBase) {
        return null;
      }
      const answer = item.learnMoreUrl ? `${answerBase}\n\nLearn more: ${item.learnMoreUrl}` : answerBase;
      return {
        id: item.id,
        question,
        answer,
      };
    })
    .filter((value): value is FaqItem => Boolean(value));
}
