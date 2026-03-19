// Minimal layout for SDK-embedded views.
// No sidebar, no header — renders the content directly inside a bare HTML shell.
// The root layout's ThemeProvider and Toaster are inherited; this layout only
// removes the chrome that would be inappropriate inside an iframe embed.

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full overflow-hidden bg-background">
      {children}
    </div>
  )
}
