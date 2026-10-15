import BuyerGate from "@/components/BuyerGate";

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <BuyerGate path="/concierge">{children}</BuyerGate>;
}
