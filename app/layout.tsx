import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Blackjack Premium - 21 | Jogue Agora",
  description: "Blackjack Premium - O melhor jogo de 21 online. Desafie o dealer, faca suas apostas e tente chegar aos 21 pontos sem estourar.",
  keywords: "blackjack, 21, jogo, cartas, casino",
  authors: [{ name: "Blackjack Premium" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>♠️</text></svg>",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a3d2e",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
