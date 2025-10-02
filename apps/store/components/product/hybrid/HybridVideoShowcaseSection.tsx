interface HybridVideoShowcaseSectionProps {
  videos: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  productName: string;
}

export function HybridVideoShowcaseSection({ videos, selectedIndex, onSelect, productName }: HybridVideoShowcaseSectionProps) {
  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Watch it in action</h2>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-lg">
        <iframe
          key={selectedIndex}
          src={videos[selectedIndex]
            .replace("watch?v=", "embed/")
            .replace("vimeo.com/", "player.vimeo.com/video/")
            .replace("youtu.be/", "youtube.com/embed/")}
          className="absolute inset-0 h-full w-full"
          allowFullScreen
          title={`${productName} demo ${selectedIndex + 1}`}
        />
      </div>
      {videos.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => onSelect(index)}
              className={`h-1 rounded-full transition-all duration-200 ${
                selectedIndex === index ? "w-10 bg-blue-600" : "w-4 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
