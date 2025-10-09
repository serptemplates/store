"use client";

import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { cn } from "../../lib/utils";

type CarouselOptions = NonNullable<
  Parameters<typeof useEmblaCarousel>[0]
>;

export type CarouselApi = UseEmblaCarouselType[1];
export type CarouselRef = UseEmblaCarouselType[0];
export type CarouselOrientation = "horizontal" | "vertical";

type CarouselProps = {
  opts?: CarouselOptions;
  setApi?: (api: CarouselApi | undefined) => void;
  orientation?: CarouselOrientation;
} & React.HTMLAttributes<HTMLDivElement>;

type CarouselContextValue = {
  carouselRef: CarouselRef;
  api: CarouselApi | undefined;
  orientation: CarouselOrientation;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

const CarouselContext =
  React.createContext<CarouselContextValue | null>(null);

export function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used inside <Carousel />");
  }

  return context;
}

export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const mergedOptions = React.useMemo<CarouselOptions>(
      () => ({
        ...(opts ?? {}),
        axis: orientation === "horizontal" ? "x" : "y",
      }),
      [opts, orientation],
    );
    const [carouselRef, api] = useEmblaCarousel({
      ...mergedOptions,
    });
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback(
      (emblaApi: CarouselApi | undefined) => {
        if (!emblaApi) return;
        setCanScrollPrev(emblaApi.canScrollPrev());
        setCanScrollNext(emblaApi.canScrollNext());
      },
      [],
    );

    React.useEffect(() => {
      if (!api) {
        setApi?.(undefined);
        return;
      }

      setApi?.(api);
      onSelect(api);
      api.on("select", onSelect);
      api.on("reInit", onSelect);

      return () => {
        api.off("select", onSelect);
        api.off("reInit", onSelect);
      };
    }, [api, onSelect, setApi]);

    const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
    const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api,
          orientation,
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          className={cn("relative w-full", className)}
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  },
);
Carousel.displayName = "Carousel";

type CarouselContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CarouselContent = React.forwardRef<
  HTMLDivElement,
  CarouselContentProps
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex touch-pan-y touch-pinch-zoom",
          orientation === "horizontal"
            ? "-ml-4"
            : "-mt-4 flex-col",
          className,
        )}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

type CarouselItemProps = React.HTMLAttributes<HTMLDivElement>;

export const CarouselItem = React.forwardRef<
  HTMLDivElement,
  CarouselItemProps
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel();
  return (
    <div
      ref={ref}
      role="group"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className,
      )}
      {...props}
    />
  );
});
CarouselItem.displayName = "CarouselItem";

type CarouselControlProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  CarouselControlProps
>(({ className, children, ...props }, ref) => {
  const { scrollPrev, canScrollPrev, orientation } = useCarousel();

  return (
    <button
      ref={ref}
      type="button"
      onClick={scrollPrev}
      disabled={!canScrollPrev}
      className={cn(
        "absolute inline-flex h-8 w-8 items-center justify-center rounded-full border border-input bg-background text-foreground shadow transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "left-1/2 -top-12 -translate-x-1/2 rotate-90",
        className,
      )}
      {...props}
    >
      {children}
      <span className="sr-only">Previous slide</span>
    </button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

export const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  CarouselControlProps
>(({ className, children, ...props }, ref) => {
  const { scrollNext, canScrollNext, orientation } = useCarousel();

  return (
    <button
      ref={ref}
      type="button"
      onClick={scrollNext}
      disabled={!canScrollNext}
      className={cn(
        "absolute inline-flex h-8 w-8 items-center justify-center rounded-full border border-input bg-background text-foreground shadow transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "left-1/2 -bottom-12 -translate-x-1/2 rotate-90",
        className,
      )}
      {...props}
    >
      {children}
      <span className="sr-only">Next slide</span>
    </button>
  );
});
CarouselNext.displayName = "CarouselNext";
