"use client";

import LenisProvider from "./LenisProvider";
import Stage from "./stage/Stage";
import AssetsSection from "./sections/AssetsSection";
import BridgeSection from "./sections/BridgeSection";
import EstateSection from "./sections/EstateSection";
import NumbersSection from "./sections/NumbersSection";
import ClosingSection from "./sections/ClosingSection";
import type { LandingStats } from "../../lib/landing/stats";

/** 랜딩 조립. 순서가 곧 스토리보드 순서다. */
export default function Landing({ stats }: { stats: LandingStats }) {
  return (
    <LenisProvider>
      <main className="ld">
        {/* 홈은 그림으로 시작한다 — 화면 카피는 없지만 문서 제목은 있어야 한다 */}
        <h1 className="sr-only">NEXT, 판단이 흐려져도 정해 둔 대로 움직이는 금융 설계</h1>
        <Stage />
        <AssetsSection />
        <BridgeSection />
        <EstateSection />
        <NumbersSection stats={stats} />
        <ClosingSection />
      </main>
    </LenisProvider>
  );
}
