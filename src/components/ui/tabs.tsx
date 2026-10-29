import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

// Radix only surfaces the active tab via a `data-state` attribute, but the
// sliding "pill" needs React to know which trigger is active so the shared
// `layoutId` element can mount on it. This context mirrors Radix's selected
// value out to the triggers (works for both controlled and uncontrolled Tabs),
// and carries a per-instance `layoutId` so multiple tab strips on one page
// each animate their own pill instead of sharing one. `keyboard` records
// whether the last input was a key press, so the pill can snap on arrow keys.
const TabsCtx = React.createContext<{
  value?: string
  layoutId: string
  keyboard: boolean
}>({
  layoutId: "tabs",
  keyboard: false,
})

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.Root>, "onValueChange"> & {
  /** `keyboard` is true when the arrow keys made the change, so a caller can
   *  bring the new panel in without animating it (see src/lib/entrance.ts). */
  onValueChange?: (value: string, details: { keyboard: boolean }) => void
}) {
  const layoutId = React.useId()
  // Mirror selection for the pill. Radix stays the source of truth for actual
  // tab switching — we only track the value to know where to draw the pill.
  const [internal, setInternal] = React.useState<string | undefined>(
    value ?? defaultValue
  )
  const current = value ?? internal
  // Radix selects a tab as the arrow keys move focus, so a key press can
  // change tabs several times a second. The pill snaps for those (motion that
  // trails behind the focus feels slow) and glides only for a pointer. The
  // state drives the pill; the ref is what the change handler reads.
  const [keyboard, setKeyboard] = React.useState(false)
  const keyboardRef = React.useRef(false)
  const setInput = (fromKeyboard: boolean) => {
    keyboardRef.current = fromKeyboard
    setKeyboard(fromKeyboard)
  }

  return (
    <TabsCtx.Provider value={{ value: current, layoutId, keyboard }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => {
          if (value === undefined) setInternal(v) // uncontrolled: track it
          onValueChange?.(v, { keyboard: keyboardRef.current })
        }}
        onKeyDownCapture={() => setInput(true)}
        onPointerDownCapture={() => setInput(false)}
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
        "bg-track text-muted-foreground inline-flex h-11 w-fit items-center justify-center rounded-full p-1",
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
  const { value: activeValue, layoutId, keyboard } = React.useContext(TabsCtx)
  const reduceMotion = useReducedMotion()
  const isActive = activeValue === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "text-muted-foreground hover:text-foreground data-[state=active]:text-primary-foreground data-[state=active]:z-10 relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-[color,background-color] duration-[var(--duration-fast)] outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-foreground/10 data-[state=active]:active:bg-transparent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={`${layoutId}-active`}
          // Only animate the pill when the selection changes. Without this,
          // any layout shift around the strip (e.g. a banner mounting above
          // it) re-measures the pill and springs it to its new position while
          // the rest of the strip jumps instantly — the pill looks like it
          // falls into place on its own.
          layoutDependency={activeValue}
          aria-hidden
          className="bg-primary absolute inset-0"
          // Inline, not `rounded-full`: Motion only corrects a radius it can
          // read from `style`, and the pill stretches between tabs of
          // different widths, which would squash its round ends mid-glide.
          style={{ borderRadius: 9999 }}
          transition={
            reduceMotion || keyboard
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
        // No entrance of its own: each panel's cards already animate in, and
        // a fade here would stack on theirs.
        "flex-1 outline-none",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
