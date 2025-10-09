import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { FaPlay } from "react-icons/fa6";
import { Button } from "../button";
import { cn } from "../lib/utils";
import { getVideoEmbedUrl } from "../utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "./ui/carousel";

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

export type HeroMediaHandle = {
  open: (index?: number) => void;
};

const HeroMedia = forwardRef<HeroMediaHandle, HeroMediaProps>(
  ({ className, items }, ref) => {
    const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>();
    const hasMultipleItems = items.length > 1;
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [dialogItem, setDialogItem] = useState<SHeroMediaItem | null>(null);
    const closeDialog = useCallback(() => setDialogItem(null), []);

    const carouselOptions = useMemo(
      () => ({
        align: "center" as const,
        loop: hasMultipleItems,
        containScroll: "trimSnaps" as const,
        skipSnaps: false,
        inViewThreshold: 0.4,
      }),
      [hasMultipleItems],
    );

    const handleControl = useCallback(
      (action: "prev" | "next") => {
        if (!carouselApi) return;
        if (action === "prev") {
          carouselApi.scrollPrev();
        } else {
          carouselApi.scrollNext();
        }
      },
      [carouselApi],
    );

    const handleScrollTo = useCallback(
      (index: number) => {
        if (!carouselApi) return;
        carouselApi.scrollTo(index);
      },
      [carouselApi],
    );

    useImperativeHandle(
      ref,
      () => ({
        open: (index = 0) => {
          const boundedIndex = Math.max(0, Math.min(index, items.length - 1));
          const target = items[boundedIndex];
          if (!target) return;
          setDialogItem(target);
          setSelectedIndex(boundedIndex);
          carouselApi?.scrollTo(boundedIndex);
        },
      }),
      [items, carouselApi],
    );

    useEffect(() => {
      if (!carouselApi) return;

      const handleSelect = () => {
        setSelectedIndex(carouselApi.selectedScrollSnap());
      };

      handleSelect();
      carouselApi.on("select", handleSelect);
      carouselApi.on("reInit", handleSelect);

      return () => {
        carouselApi.off("select", handleSelect);
        carouselApi.off("reInit", handleSelect);
      };
    }, [carouselApi]);

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
        <div className={cn(className, "relative mx-auto w-full")}>
          <Carousel
            className="group"
            opts={carouselOptions}
            setApi={setCarouselApi}
          >
            <CarouselContent className="items-stretch -ml-2 sm:-ml-4">
              {items.map((item, index) => (
                <CarouselItem
                  key={index}
                  className={cn(
                    "pl-2 sm:pl-4",
                    hasMultipleItems
                      ? "md:basis-[85%] lg:basis-[70%]"
                      : "basis-full",
                  )}
                >
                  <Item
                    item={item}
                    onClick={() => setDialogItem(item)}
                    isActive={index === selectedIndex}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>

            {!isOnlyOneItem && (
              <>
                <Button
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border bg-background/90 p-2 shadow transition hover:bg-background sm:left-4 md:-left-10"
                  variant="outline"
                  onClick={() => handleControl("prev")}
                >
                  <ChevronLeft />
                </Button>

                <Button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border bg-background/90 p-2 shadow transition hover:bg-background sm:right-4 md:-right-10"
                  variant="outline"
                  onClick={() => handleControl("next")}
                >
                  <ChevronRight />
                </Button>
              </>
            )}
          </Carousel>

          {!isOnlyOneItem && (
            <Thumbnails
              items={items}
              onScroll={handleScrollTo}
              selectedIndex={selectedIndex}
            />
          )}
        </div>

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
                className="absolute right-4 top-4 h-8 w-8 rounded-full"
                onClick={() => closeDialog()}
              >
                <span className="sr-only">Close Dialog</span>
                <X />
              </Button>

              <div className="aspect-video w-full">
                {dialogItem.type === "video" && (
                  <iframe
                    src={getVideoEmbedUrl(dialogItem.src)}
                    title={dialogItem.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    className="h-full w-full rounded-2xl"
                    allowFullScreen
                  />
                )}

                {dialogItem.type === "image" && (
                  <img
                    src={dialogItem.src}
                    alt={dialogItem.alt || "Media"}
                    className="h-full w-full rounded-2xl object-contain"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  },
);

const Item = ({
  item,
  onClick,
  isActive,
}: {
  item: SHeroMediaItem;
  onClick?: () => void;
  isActive?: boolean;
}) => {
  return (
    <button
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-2xl border-2 bg-muted/40 transition duration-300 ease-out",
        isActive
          ? "scale-[1.01] border-primary shadow-2xl shadow-primary/20"
          : "border-gray-300 opacity-80 hover:scale-[1.01] hover:border-primary/60 hover:opacity-100",
      )}
      onClick={onClick}
    >
      {item.type === "video" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-full bg-black/70 p-3">
            <FaPlay className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
      <img
        src={item.type === "video" ? item.thumbnail : item.src}
        alt={item.title}
        className="h-full w-full object-cover"
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
            "h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg transition-all",
            selectedIndex === index
              ? "border-2 border-primary"
              : "opacity-70 hover:opacity-100",
          )}
        >
          <img
            src={item.type === "video" ? item.thumbnail : item.src}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        </button>
      ))}
    </div>
  );
};

HeroMedia.displayName = "HeroMedia";

export default HeroMedia;

