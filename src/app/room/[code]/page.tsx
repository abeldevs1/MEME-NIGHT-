import { HostRoom } from "./host-room";

export const runtime = "edge";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostRoom code={code} />;
}
