import type { Metadata } from "next";
import { Noto_Sans_KR, DM_Mono } from "next/font/google";
import "./globals.css";

// 빌드 시점에 내려받아 자체 호스팅한다.
// 데모 현장에 네트워크가 없어도 폰트가 정상 표시되고, 렌더를 막지 않는다.
const notoKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-kr",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "NEXT | 미래 금융 의사결정 설계",
  description:
    "목적을 먼저 묻고, 신탁·후견·지출 설계서를 조항 단위로 만들어 주는 금융 AI 프로토타입.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${notoKr.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
