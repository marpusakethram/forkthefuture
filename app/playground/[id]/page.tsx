import { Studio } from "@/components/studio";

export const metadata = { title: "Studio — ForkTheFuture" };

export default async function PlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Studio id={id} />;
}
