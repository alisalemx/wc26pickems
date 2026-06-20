import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

// Radix only surfaces the active tab via a `data-state` attribute, but the
// sliding "pill" needs React to know which trigger is active so the shared
// `layoutId` element can mount on it. This context mirrors Radix's selected
// value out to the triggers (works for both controlled and uncontrolled Tabs),
// and carries a per-instance `layoutId` so multiple tab strips on one page
// each animate their own pill instead of sharing one.
const TabsCtx = React.createContext<{ value?: string; layoutId: string }>({
  layoutId: "tabs",
})

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const layoutId = React.useId()
  // Mirror selection for the pill. Radix stays the source of truth for actual
  // tab switching — we only track the value to know where to draw the pill.
  const [internal, setInternal] = React.useState<string | undefined>(
    value ?? defaultValue
  )
  const current = value ?? internal

  return (
    <TabsCtx.Provider value={{ value: current, layoutId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => {
          if (value === undefined) setInternal(v) // uncontrolled: track it
          onValueChange?.(v)
        }}
        {...props}
      />
    </TabsCtx.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg border p-[3px]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value: activeValue, layoutId } = React.useContext(TabsCtx)
  const reduceMotion = useReducedMotion()
  const isActive = activeValue === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "text-muted-foreground data-[state=active]:text-foreground data-[state=active]:z-10 focus-visible:ring-ring/50 focus-visible:outline-ring relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,background-color] duration-[var(--duration-fast)] focus-visible:ring-[3px] focus-visible:outline-1 active:bg-foreground/10 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={`${layoutId}-active`}
          aria-hidden
          className="bg-background border-ink absolute inset-0 rounded-md border"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", duration: 0.4, bounce: 0.2 }
          }
        />
      )}
      <span className="relative">{children}</span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:fill-mode-backwards data-[state=active]:duration-[var(--duration-base)] data-[state=active]:ease-out-cubic",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
