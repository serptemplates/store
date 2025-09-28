export interface HybridIncludedStackSectionProps {
  items: string[];
}

export function HybridIncludedStackSection({ items }: HybridIncludedStackSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Everything that ships with your license</h2>
      <ul className="grid md:grid-cols-2 gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <svg className="mt-1 h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-700">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
