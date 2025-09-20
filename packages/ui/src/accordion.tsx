import * as React from "react"
import { cn } from "./lib/utils"

type AccordionRootProps = {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
};

type RootContext = {
  openValues: Set<string>;
  toggle: (value: string) => void;
  type: "single" | "multiple";
  collapsible: boolean;
};

const RootCtx = React.createContext<RootContext | null>(null);

function Accordion({
  type = "single",
  collapsible = true,
  defaultValue,
  className,
  children,
}: AccordionRootProps) {
  const initial = React.useMemo(() => {
    if (type === "single") {
      const v = typeof defaultValue === "string" ? defaultValue : undefined;
      return new Set(v ? [v] : []);
    }
    const arr = Array.isArray(defaultValue) ? defaultValue : [];
    return new Set(arr);
  }, [type, defaultValue]);

  const [openValues, setOpenValues] = React.useState<Set<string>>(initial);

  const toggle = (value: string) => {
    setOpenValues((prev) => {
      const next = new Set(prev);
      if (type === "single") {
        const isOpen = next.has(value);
        next.clear();
        if (!isOpen || !collapsible) next.add(value);
        return next;
      }
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <RootCtx.Provider value={{ openValues, toggle, type, collapsible }}>
      <div className={cn(className)}>{children}</div>
    </RootCtx.Provider>
  );
}

type ItemProps = React.HTMLAttributes<HTMLDivElement> & { value: string };

const ItemCtx = React.createContext<{ value: string; open: boolean } | null>(null);

const AccordionItem = ({ className, value, children, ...props }: ItemProps) => {
  const root = React.useContext(RootCtx);
  const open = !!root?.openValues.has(value);
  return (
    <ItemCtx.Provider value={{ value, open }}>
      <div className={cn("rounded-lg border", className)} data-state={open ? "open" : "closed"} {...props}>
        {children}
      </div>
    </ItemCtx.Provider>
  );
};

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string };
const AccordionTrigger = ({ className, children, ...props }: TriggerProps) => {
  const root = React.useContext(RootCtx);
  const item = React.useContext(ItemCtx);
  if (!root || !item) return null;
  const { value, open } = item;
  return (
    <div className="flex">
      <button
        type="button"
        className={cn(
          "group flex w-full items-center justify-between py-4 px-4 text-left text-base font-medium transition-all hover:underline",
          className
        )}
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        onClick={() => root.toggle(value)}
        {...props}
      >
        {children}
        <ChevronDownIcon className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
};

type ContentProps = React.HTMLAttributes<HTMLDivElement>;
const AccordionContent = ({ className, children, ...props }: ContentProps) => {
  const item = React.useContext(ItemCtx);
  if (!item) return null;
  const open = item.open;
  return (
    <div className={cn("overflow-hidden text-muted-foreground", className)} data-state={open ? "open" : "closed"} {...props}>
      {open && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
