import type { ReactNode } from "react"

/** Centered single-column layout with the 🏆 hero, shared by the logged-out
 *  Login and first-run Welcome pages. Children render below the hero (the
 *  auth card, alerts, etc.). */
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
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl">🏆</div>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
