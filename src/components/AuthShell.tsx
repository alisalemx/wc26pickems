import type { CSSProperties, ReactNode } from "react"
import { SignHeading } from "@/components/SignHeading"

/** Centered single-column layout shared by the logged-out Login and first-run
 *  Welcome pages: a turf-green signage panel with the two-tone title over a
 *  huge "26" that bleeds off the bottom edge, then the page's content (the auth
 *  card, alerts, etc.) below it. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <section
          className="@container relative isolate overflow-hidden rounded-2xl bg-signal px-6 pt-6 text-signal-foreground animate-in fade-in-0 slide-in-from-bottom-2 animation-duration-[var(--duration-base)] ease-out-quint stagger-in"
          style={{ "--i": 0 } as CSSProperties}
        >
          <SignHeading
            as="h1"
            size="md"
            title={title}
            sub={subtitle}
            className="text-2xl"
            subClassName="text-signal-foreground/65"
          />
          <p
            aria-hidden
            className="-mr-2 -mb-[0.1em] text-right text-[58cqw] leading-[0.74] font-bold tracking-display select-none"
          >
            26
          </p>
        </section>
        <div
          className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-2 animation-duration-[var(--duration-base)] ease-out-quint stagger-in"
          style={{ "--i": 1 } as CSSProperties}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
