import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXT | 미래 금융 의사결정 설계",
  description:
    "목적을 먼저 묻고, 신탁·후견·지출 설계서를 조항 단위로 만들어 주는 금융 AI 프로토타입.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
