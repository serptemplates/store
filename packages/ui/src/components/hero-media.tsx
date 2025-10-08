import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getVideoEmbedUrl } from "../utils";
import { FaPlay } from "react-icons/fa6";
import { Button } from "../button";
import { cn } from "../lib/utils";
import useEmblaCarousel from "embla-carousel-react";

export type SHeroMediaItem =
  | {
      type: "video";
      src: string;
      alt?: string;
      title?: string;
      thumbnail?: string;
    }
  | {
      type: "image";
      src: string;
      alt?: string;
      title?: string;
    };

export type HeroMediaProps = {
  items: SHeroMediaItem[];
  className?: string;
};

const HeroMedia = ({ className, items }: HeroMediaProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dialogItem, setDialogItem] = useState<SHeroMediaItem | null>(null);
  const closeDialog = useCallback(() => setDialogItem(null), []);

  const onControl = (action: "prev" | "next") => {
    if (!emblaApi) return;
    if (action === "prev") {
      emblaApi.scrollPrev();
    } else {
      emblaApi.scrollNext();
    }
  };

  const onScroll = useCallback(
    (index: number) => {
      if (!emblaApi) return;
      emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (dialogItem == null) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dialogItem, closeDialog]);

  const isOnlyOneItem = items.length === 1;

  return (
    <>
      <div className={cn(className, "relative w-full mx-auto")}>
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-10 touch-pan-y touch-pinch-zoom">
              {items.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    isOnlyOneItem ? "lg:flex-[0_0_100%]" : "lg:flex-[0_0_48%]",
                    "min-w-0 flex-[0_0_100%]"
                  )}
                >
                  <Item item={item} onClick={() => setDialogItem(item)} />
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          {!isOnlyOneItem && (
            <>
              <Button
                className="rounded-full w-8 h-8 absolute left-0 top-1/2 -translate-y-1/2 translate-x-2 lg:-translate-x-10 transition-all"
                variant="outline"
                onClick={() => onControl("prev")}
              >
                <ChevronLeft />
              </Button>

              <Button
                className="rounded-full w-8 h-8 absolute right-0 top-1/2 -translate-y-1/2 -translate-x-2 lg:translate-x-10 transition-all"
                variant="outline"
                onClick={() => onControl("next")}
              >
                <ChevronRight />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {!isOnlyOneItem && (
          <Thumbnails
            items={items}
            onScroll={onScroll}
            selectedIndex={selectedIndex}
          />
        )}
      </div>

      {/* Dialog */}
      {dialogItem != null && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal
          onClick={() => closeDialog()}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              aria-label="Close Dialog"
              className="absolute right-4 top-4 w-8 h-8 rounded-full"
              onClick={() => closeDialog()}
            >
              <span className="sr-only">Close Dialog</span>
              <X />
            </Button>

            <div className="w-full aspect-video">
              {dialogItem.type === "video" && (
                <iframe
                  src={getVideoEmbedUrl(dialogItem.src)}
                  title={dialogItem.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  className="w-full h-full rounded-2xl"
                  allowFullScreen
                />
              )}

              {dialogItem.type === "image" && (
                <img
                  src={dialogItem.src}
                  alt={dialogItem.alt || "Media"}
                  className="w-full h-full object-contain rounded-2xl"
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Item = ({
  item,
  onClick,
}: {
  item: SHeroMediaItem;
  onClick?: () => void;
}) => {
  return (
    <button
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted/40 border-2 border-gray-300"
      onClick={onClick}
    >
      {item.type === "video" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-black/70 rounded-full p-3">
            <FaPlay className="w-6 h-6 text-white" />
          </div>
        </div>
      )}
      <img
        src={item.type === "video" ? item.thumbnail : item.src}
        alt={item.title}
        className="w-full h-full object-cover"
      />
    </button>
  );
};

type ThumbnailsProps = {
  items: SHeroMediaItem[];
  selectedIndex: number;
  onScroll: (index: number) => void;
};

const Thumbnails = ({ items, selectedIndex, onScroll }: ThumbnailsProps) => {
  return (
    <div className="mt-5 flex justify-center gap-3 overflow-x-auto">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => onScroll(index)}
          className={cn(
            "flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden transition-all",
            selectedIndex === index
              ? "border-2 border-primary"
              : "opacity-70 hover:opacity-100"
          )}
        >
          <img
            src={item.type === "video" ? item.thumbnail : item.src}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );
};

export default HeroMedia;
