interface ValueCard {
  title: string;
  description: string;
}

interface StatCard {
  stat: string;
  label: string;
}

const DEFAULT_VALUE_CARDS: ValueCard[] = [
  {
    title: "Built for instant wins",
    description: "Go from capture to download in seconds with automation baked into every step.",
  },
  {
    title: "Lifetime updates",
    description: "One-time purchase keeps you current with streaming updates and API changes.",
  },
  {
    title: "Streamlined hand-off",
    description: "Includes ready-made onboarding emails and SOPs so your clients can launch day one.",
  },
];

const DEFAULT_STATS: StatCard[] = [
  { stat: "500+", label: "teams deployed" },
  { stat: "2.4x", label: "average ROI in 90 days" },
  { stat: "18", label: "automation playbooks included" },
];

export interface HybridValueStackSectionProps {
  valueCards?: ValueCard[];
  stats?: StatCard[];
}

export function HybridValueStackSection({ valueCards = DEFAULT_VALUE_CARDS, stats = DEFAULT_STATS }: HybridValueStackSectionProps) {
  return (
    <section className="grid lg:grid-cols-3 gap-6">
      {valueCards.map((card) => (
        <div key={card.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
          <p className="text-sm text-gray-600 leading-6">{card.description}</p>
        </div>
      ))}

      <div className="lg:col-span-3 grid md:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-5 text-center">
            <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
            <p className="text-sm text-gray-600">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
