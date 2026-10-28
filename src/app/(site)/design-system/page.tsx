import type { Metadata } from "next";
import { Showcase } from "./showcase";

export const metadata: Metadata = {
  title: "Design system",
  description: "Tokens, tipografia e componentes base da ENDJU BUSINESS.",
  robots: { index: false },
};

export default function DesignSystemPage() {
  return <Showcase />;
}
