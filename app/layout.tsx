import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arquearia",
  description:
    "Bowman é um jogo de arco e flecha em 2D onde os jogadores se alternam atirando flechas uns nos outros para eliminar o oponente. O jogo foca em mirar e ajustar o ângulo e a força de cada tiro, com disparos na cabeça causando o maior dano. Pode ser jogado contra o computador ou com um amigo, e algumas versões incluem modos extras, como caça a pássaros. Detalhamento: Jogabilidade: Jogo por turnos onde os jogadores alternam disparos de flechas. Objetivo: Atingir o oponente com uma flecha, sendo o tiro na cabeça a forma mais eficaz de eliminá-lo. Controles: Os jogadores ajustam o ângulo e a força dos tiros com um mecanismo simples de arrastar e soltar, mirando para acertar o oponente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
