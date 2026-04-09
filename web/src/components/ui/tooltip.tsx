import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

type TooltipContextValue = {
  touchMode: boolean;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

type TooltipProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: React.ComponentProps<
    typeof TooltipPrimitive.Root
  >["onOpenChange"];
  open?: boolean;
};

function Tooltip({
  children,
  defaultOpen = false,
  onOpenChange,
  open,
}: TooltipProps) {
  const touchMode = useTouchTooltipMode();

  return (
    <TooltipContext.Provider value={{ touchMode }}>
      {touchMode ? (
        <PopoverPrimitive.Root
          defaultOpen={defaultOpen}
          onOpenChange={
            onOpenChange as React.ComponentProps<
              typeof PopoverPrimitive.Root
            >["onOpenChange"]
          }
          open={open}
        >
          {children}
        </PopoverPrimitive.Root>
      ) : (
        <TooltipPrimitive.Root
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          open={open}
        >
          {children}
        </TooltipPrimitive.Root>
      )}
    </TooltipContext.Provider>
  );
}

type TooltipTriggerProps = React.ComponentPropsWithoutRef<"button"> & {
  delay?: number;
};

function TooltipTrigger({
  className,
  delay = 250,
  ...props
}: TooltipTriggerProps) {
  const tooltip = React.useContext(TooltipContext);

  if (tooltip?.touchMode) {
    return (
      <PopoverPrimitive.Trigger
        data-slot="tooltip-trigger"
        className={cn(
          "inline-flex min-h-6 min-w-6 touch-manipulation items-center justify-center rounded-none p-1 outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
          className,
        )}
        {...props}
      />
    );
  }

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      delay={delay}
      className={cn(
        "inline-flex min-h-6 min-w-6 touch-manipulation items-center justify-center rounded-none p-1 outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

type TooltipContentProps = React.ComponentPropsWithoutRef<"div"> & {
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
};

function TooltipContent({
  className,
  side = "top",
  sideOffset = 8,
  ...props
}: TooltipContentProps) {
  const tooltip = React.useContext(TooltipContext);

  if (tooltip?.touchMode) {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side={side} sideOffset={sideOffset}>
          <PopoverPrimitive.Popup
            data-slot="tooltip-content"
            className={cn(
              "z-50 max-w-72 border border-border bg-popover px-3 py-2 text-xs/relaxed text-popover-foreground shadow-sm outline-none data-[closed]:opacity-0 data-[open]:opacity-100",
              className,
            )}
            {...props}
          />
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    );
  }

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
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(hover: none), (pointer: coarse)")
        : null;
    const updateTouchMode = () =>
      setTouchMode(
        navigator.maxTouchPoints > 0 || mediaQuery?.matches === true,
      );

    updateTouchMode();

    if (mediaQuery === null) {
      return;
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateTouchMode);
      return () => mediaQuery.removeEventListener("change", updateTouchMode);
    }
  }, []);

  return touchMode;
}
