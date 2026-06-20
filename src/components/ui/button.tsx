import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-primary-foreground bg-primary text-primary-foreground shadow-brutal-sm hover:bg-primary/90 active:bg-primary/80",
        destructive:
          "border border-ink bg-destructive text-destructive-foreground shadow-brutal-sm hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-ink bg-background shadow-brutal-sm hover:bg-accent hover:text-accent-foreground active:bg-accent-pressed active:text-accent-foreground",
        secondary:
          "border border-ink bg-secondary text-secondary-foreground shadow-brutal-sm hover:bg-accent hover:text-accent-foreground active:bg-accent-pressed active:text-accent-foreground",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent-pressed active:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:bg-foreground/10 rounded-sm",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
