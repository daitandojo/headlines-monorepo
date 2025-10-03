// apps/client/src/app/(public)/layout.jsx

export const metadata = {
  title: 'Headlines Intelligence | AI-Powered Wealth Event Discovery',
  description:
    'Capture alpha before it becomes common knowledge. Our AI scans thousands of global sources to deliver verified private wealth opportunities and liquidity events daily.',
}

export default function PublicLayout({ children }) {
  // This layout applies a clean slate for the landing page, ensuring no styles
  // from the main application's authenticated layout interfere.
  return <div className="bg-background text-foreground antialiased">{children}</div>
}
