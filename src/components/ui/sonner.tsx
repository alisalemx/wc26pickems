import { Toaster as Sonner, type ToasterProps } from "sonner"

// Styled as a Signage black panel (inverted in dark mode): the primary ink as
// the surface, no outline or shadow, the app's radius and type. Positioned
// bottom-center and offset to sit *above* the fixed bottom nav on phones.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="bottom-center"
      offset={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      toastOptions={{
        classNames: {
          toast:
            "!bg-primary !text-primary-foreground !border-0 !rounded-xl !shadow-none !font-sans",
          title: "!font-semibold !tracking-tight",
          description: "!text-primary-foreground/70",
          actionButton: "!bg-signal !text-signal-foreground !rounded-full",
          cancelButton: "!bg-primary-foreground/15 !text-primary-foreground !rounded-full",
          success: "[&_[data-icon]]:!text-win",
          error: "[&_[data-icon]]:!text-destructive",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
