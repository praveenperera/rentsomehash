import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

type TooltipContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  touchMode: boolean;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function Tooltip({
  children,
  defaultOpen = false,
  onOpenChange,
  open,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const touchMode = useTouchTooltipMode();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const resolvedOpen = open ?? uncontrolledOpen;

  function handleOpenChange(
    nextOpen: boolean,
    eventDetails: Parameters<NonNullable<typeof onOpenChange>>[1],
  ) {
    if (open === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen, eventDetails);
  }

  return (
    <TooltipContext.Provider
      value={{
        open: resolvedOpen,
        setOpen: (nextOpen: boolean) => {
          if (open === undefined) {
            setUncontrolledOpen(nextOpen);
          }
        },
        touchMode,
      }}
    >
      <TooltipPrimitive.Root
        defaultOpen={touchMode ? undefined : defaultOpen}
        onOpenChange={handleOpenChange}
        open={touchMode ? resolvedOpen : open}
        {...props}
      >
        {children}
      </TooltipPrimitive.Root>
    </TooltipContext.Provider>
  );
}

function TooltipTrigger({
  className,
  delay = 250,
  onClick,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const tooltip = React.useContext(TooltipContext);

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      delay={delay}
      className={cn(
        "inline-flex min-h-6 min-w-6 touch-manipulation items-center justify-center rounded-none p-1 outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);

        if (!tooltip?.touchMode || event.defaultPrevented) {
          return;
        }

        tooltip.setOpen(!tooltip.open);
      }}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof TooltipPrimitive.Positioner>,
    "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 max-w-72 border border-border bg-popover px-3 py-2 text-xs/relaxed text-popover-foreground shadow-sm outline-none data-[closed]:opacity-0 data-[open]:opacity-100",
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent };

function useTouchTooltipMode() {
  const [touchMode, setTouchMode] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const updateTouchMode = () => setTouchMode(mediaQuery.matches);

    updateTouchMode();

    mediaQuery.addEventListener("change", updateTouchMode);
    return () => mediaQuery.removeEventListener("change", updateTouchMode);
  }, []);

  return touchMode;
}
