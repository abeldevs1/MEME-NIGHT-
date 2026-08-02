import { PlayerView } from "./player-view";

export default async function RoomPlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlayerView code={code} />;
}
