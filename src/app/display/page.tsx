import type { Metadata } from "next";
import { Displayer } from "./displayer";

export const metadata: Metadata = {
  title: "Meme displayer — meme night",
  description: "Browse memes and beam them to the big screen.",
};

export default function DisplayPage() {
  return <Displayer />;
}
