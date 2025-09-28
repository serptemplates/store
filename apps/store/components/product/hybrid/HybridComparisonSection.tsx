export interface ComparisonRow {
  label: string;
  included: boolean;
  competitor: string;
}

export interface HybridComparisonSectionProps {
  rows: ComparisonRow[];
}

export function HybridComparisonSection({ rows }: HybridComparisonSectionProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Why product teams upgrade</h2>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Capability</th>
              <th className="px-4 py-3">This toolkit</th>
              <th className="px-4 py-3">Typical alternatives</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white text-sm text-gray-700">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3">
                  {row.included ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Included
                    </span>
                  ) : (
                    <span className="text-gray-400">Optional add-on</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{row.competitor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
