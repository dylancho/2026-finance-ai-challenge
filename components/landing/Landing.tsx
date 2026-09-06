"use client";

import LenisProvider from "./LenisProvider";
import Stage from "./stage/Stage";
import AssetsSection from "./sections/AssetsSection";
import BridgeSection from "./sections/BridgeSection";
import EstateSection from "./sections/EstateSection";
import NumbersSection from "./sections/NumbersSection";
import PeopleSection from "./sections/PeopleSection";
import ClosingSection from "./sections/ClosingSection";
import type { LandingStats } from "../../lib/landing/stats";

/** 랜딩 조립. 순서가 곧 스토리보드 순서다. */
export default function Landing({ stats }: { stats: LandingStats }) {
  return (
    <LenisProvider>
      <main className="ld">
        <Stage />
        <AssetsSection />
        <BridgeSection />
        <EstateSection />
        <NumbersSection stats={stats} />
        <PeopleSection />
        <ClosingSection />
      </main>
    </LenisProvider>
  );
}
