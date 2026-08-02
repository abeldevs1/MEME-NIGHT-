import { FullScreenView } from "./fullscreen-view";

export default async function FullscreenRoute({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; title?: string }>;
}) {
  const { url = "", title = "" } = await searchParams;
  return <FullScreenView url={url} title={title} />;
}
