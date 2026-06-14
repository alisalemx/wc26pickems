import { Toaster as Sonner, type ToasterProps } from "sonner"

// Styled to match the app's "polished neo-brutalist" look: popover surface with a
// strong `border-ink` outline and offset brutal shadow, small radius, Space Grotesk
// type. Positioned bottom-center and offset to sit *above* the fixed bottom nav.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="bottom-center"
      offset={{ bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      toastOptions={{
        classNames: {
          toast:
            "!bg-popover !text-popover-foreground !border !border-ink !rounded-md !shadow-brutal !font-sans",
          title: "!font-semibold !tracking-tight",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md",
          cancelButton: "!bg-secondary !text-secondary-foreground !rounded-md",
          success: "!text-primary",
          error: "!text-destructive",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
