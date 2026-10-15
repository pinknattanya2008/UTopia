import BuyerGate from "@/components/BuyerGate";

export const dynamic = "force-dynamic";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuyerGate path={`/concert/${id}/book`}>{children}</BuyerGate>;
}
