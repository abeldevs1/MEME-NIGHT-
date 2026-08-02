"use client";

import type { AnonymousCaption, HandCard, Player, Room, RoundCaption } from "./types";
import { requireSupabase } from "./supabase/client";
import { errorMessage } from "./utils";

export const CAPTION_DECK = [
  "Said it, done it, posting it.",
  "Not today, satan.",
  "This is fine. This is SO fine.",
  "My lawyer has advised me not to answer that.",
  "I'm not saying it was aliens… but it was aliens.",
  "We do not speak of this again.",
  "Plot twist: I did it on purpose.",
  "That's a great question for someone who cares.",
  "Bold of you to assume I'd notice.",
  "I just work here.",
  "Me, to everyone, always.",
  "I have no idea what's happening and I'm so here for it.",
  "It was at this moment I knew I f'd up.",
  "And I took that personally.",
  "I did a thing. I'm not sorry.",
  "Nobody: Absolutely nobody: Me:",
  "It's not a phase, mom.",
  "You can't sit with us.",
  "I was today years old when I found out.",
  "Hold my beer.",
  "This is the way.",
  "Another one.",
  "Shots fired. (figuratively, probably)",
  "I didn't choose the thug life, the thug life chose me.",
  "Sir, this is a Wendy's.",
  "We're gonna need a bigger boat.",
  "I volunteer as tribute.",
  "Not the sharpest tool in the shed, but I'm here.",
  "Chaos, chaos, I'm always on time.",
  "Living my best life (derogatory).",
  "Main character energy.",
  "Supportive friend in my head: do it.",
  "I'll allow it.",
  "Calculated. But boy, am I bad at math.",
  "You know I had to do it to 'em.",
  "The audacity.",
  "Sir, this is a group project.",
  "I'm in danger.",
  "One does not simply…",
  "So you're telling me there's a chance.",
  "I'm ready. I've been ready.",
  "Bet.",
  "We ride at dawn.",
  "Me pretending to know what's going on.",
  "The math ain't mathing.",
  "Real talk: same.",
  "It's giving… main character.",
  "Big brain time.",
  "I'm not crying, you're crying.",
  "And yet, I keep going.",
  "This escalated quickly.",
  "I'd like to speak to the manager.",
  "They said jump, I said how high.",
  "Cowabunga it is.",
  "Hakuna matata.",
  "Live, laugh, log off.",
  "That's what she said.",
  "I'm something of a scientist myself.",
  "Understandable, have a nice day.",
  "I oop—",
  "No thoughts, just vibes.",
  "It's giving: disaster.",
  "This comment section is my therapist.",
  "Evidence? Not needed.",
  "I manifested this.",
  "The prophecy was real.",
  "Meh, I've seen worse.",
  "I have no enemies.",
  "First try, baby.",
  "It costs zero dollars to be kind. I choose violence.",
  "On god.",
  "I'm built different.",
  "This ain't it, chief.",
  "Respectfully, no.",
  "The audacity to exist like that.",
  "My toxic trait is…",
  "I can fix him.",
  "That's a bold strategy, Cotton. Let's see if it pays off.",
  "Worth it.",
  "I'm here for the chaos.",
  "Trust the process.",
  "It just works.",
  "The vibes are immaculate.",
  "Sorry, I don't speak nonsense.",
  "No notes.",
  "Gone, but not forgotten.",
  "This is the energy we need.",
  "I'm not arguing, I'm just explaining why I'm right.",
  "Plot armor activated.",
  "Some people juggle geese.",
  "I was born at night, but not last night.",
  "Failure is not an option. It's a tradition.",
  "I've made a huge mistake.",
  "When the intrusive thoughts win.",
  "My red flags are actually just fun quirks.",
  "I'm just a girl/guy.",
  "I didn't ask to be born.",
  "I survived another meeting that could have been an email.",
  "Just smile and wave, boys.",
  "The inner machinations of my mind are an enigma.",
  "That escalated from 0 to 100 real quick.",
  "I am never recovering from this financially.",
  "Me? Overreacting? Probably.",
  "Who let me be an adult?",
  "I'm 99% sure I forgot something.",
  "When they ask 'where do you see yourself in 5 years'.",
  "I need a 6 month vacation, twice a year.",
  "Can we normalize not doing anything ever?",
  "My bed is calling my name.",
  "I came, I saw, I made it awkward.",
  "Error 404: Motivation not found.",
  "I don't know who needs to hear this, but go to sleep.",
  "Just dropping in to ruin your day.",
  "I'm not late, I'm on my own time.",
  "Send help or snacks.",
  "When the coffee kicks in but it's anxiety instead of energy.",
  "My brain has too many tabs open.",
  "I'm currently unsupervised. I know, it freaks me out too.",
  "Professional overthinker.",
  "I'm running on caffeine and inappropriate thoughts.",
  "I need a timeout.",
  "My wallet is crying.",
  "I'm doing my best, okay?",
  "When you accidentally open the front camera.",
  "I'm not anti-social, I'm pro-solitude.",
  "Me trying to hold it together.",
  "I feel personally attacked by this.",
  "The face you make when the wifi drops.",
  "I didn't read the terms and conditions.",
  "When someone eats the leftovers you've been thinking about all day.",
  "Me looking at my bank account.",
  "I'm putting this on my resume.",
  "When you realize tomorrow is Monday.",
  "I'm fluent in sarcasm.",
  "When the joke doesn't land.",
  "I'm sorry for what I said when I was hungry.",
  "My response to literally everything.",
  "When you see someone you know in public and try to hide.",
  "I need a nap.",
  "Me trying to explain my logic.",
  "I'm ready for the weekend.",
  "When you hit your funny bone.",
  "I have 0 unread messages and I like it that way.",
  "Me watching the drama unfold.",
  "I'm not ignoring you, I'm just prioritizing myself.",
  "When you finally get a good night's sleep.",
  "I'm too sober for this.",
  "Me pretending to be productive.",
  "I'm a masterpiece and a work in progress simultaneously.",
  "When you forget what you were going to say.",
  "I'm not lazy, I'm on energy saving mode.",
  "Me ignoring my responsibilities.",
  "I'm not weird, I'm a limited edition.",
  "When you step on a Lego.",
  "I'm here for a good time, not a long time.",
  "Me trying to take a compliment.",
  "I'm one inconvenience away from a breakdown.",
  "When you realize you're the drama.",
  "I'm just happy to be here.",
  "Me trying to follow the instructions.",
  "I'm not short, I'm fun sized.",
  "When you accidentally send a screenshot to the person it's about.",
  "I'm a delight.",
  "Me trying to act natural.",
  "I'm not bossy, I just have better ideas.",
  "When you find out someone is talking trash.",
  "I'm an acquired taste.",
  "Me trying to stay awake.",
  "I'm not clumsy, it's just the floor hates me.",
  "When you realize you've been scrolling for 3 hours.",
  "I'm a handful, but that's what you got two hands for.",
  "Me trying to find something to wear.",
  "I'm not always right, but I'm never wrong.",
  "When you try to take a cute picture but the wind ruins it.",
  "I'm a limited edition, there's only one of me.",
  "Me trying to make a healthy choice.",
  "I'm not entirely useless. I can be used as a bad example.",
  "When you finally get to sit down.",
  "I'm a lot to handle, but I'm worth it.",
  "Me trying to keep a straight face.",
  "I'm not responsible for what my face does when you talk.",
  "When you realize you have to do laundry.",
  "I'm a work of art.",
  "Me trying to figure out what day it is.",
  "I'm not sweating, I'm sparkling.",
  "When you try to be productive but get distracted.",
  "I'm a genius in disguise.",
  "Me trying to remember my password.",
  "I'm not trying to be difficult, it just comes naturally.",
  "When you finally finish a project.",
  "I'm a legend in my own mind.",
  "Me trying to act cool in front of a crush.",
  "I'm not arguing, I'm just passionately expressing my rightness.",
  "When you try to hold a sneeze.",
  "I'm a walking disaster.",
  "Me trying to read the menu from far away.",
  "I'm not ignoring you, my brain is just buffering.",
  "When you finally get the joke.",
  "I'm a ray of sunshine.",
  "Me trying to understand the plot of the movie.",
  "I'm not clumsy, I'm just doing random gravity checks.",
  "When you try to sneak a snack quietly.",
  "I'm a force to be reckoned with.",
  "Me trying to untangle my headphones.",
  "I'm not late, I'm just early for tomorrow.",
  "When you try to hold back a laugh at a serious moment.",
  "I'm a snack.",
  "Me trying to follow a recipe.",
  "I'm not weird, I'm wonderfully unique.",
  "When you try to take a selfie in public.",
  "I'm a whole mood.",
  "Me trying to parallel park.",
  "I'm not bossy, I'm the boss.",
  "When you try to hold a door open but the person is too far away.",
  "I'm a catch.",
  "Me trying to assemble furniture.",
  "I'm not anti-social, I'm selectively social.",
  "When you try to pretend you didn't trip.",
  "I'm a blessing.",
  "Me trying to pack for a trip.",
  "I'm not ignoring you, I'm just not listening.",
  "When you try to act like you're not out of breath.",
  "I'm a prize.",
  "Me trying to take a group photo.",
  "I'm not stubborn, my way is just better.",
  "When you try to hold a conversation while chewing.",
  "I'm a treasure.",
  "Me trying to keep up with the trends.",
  "I'm not ignoring you, I'm just enjoying the silence.",
  "When you try to pretend you didn't hear that.",
  "I'm a vibe.",
  "Me trying to adult.",
  "I'm not complaining, I'm just stating facts.",
  "When you try to be sneaky but drop everything.",
  "I'm a gem.",
  "Me trying to be healthy.",
  "I'm not tired, I'm just resting my eyes.",
  "When you try to ignore a text but accidentally open it.",
  "I'm a star.",
  "Me trying to save money.",
  "I'm not ignoring you, I'm just busy being awesome.",
  "When you try to act like you know the song lyrics.",
  "I'm a queen/king.",
  "Me trying to be organized.",
  "I'm not lost, I'm just exploring.",
  "When you try to pretend you didn't see someone.",
  "I'm a boss.",
  "Me trying to be on time.",
  "I'm not ignoring you, I'm just in my own world.",
  "When you try to hold back tears during a movie.",
  "I'm a rockstar.",
  "Me trying to be a morning person.",
  "I'm not ignoring you, I'm just thinking really hard.",
  "When you try to be cool but fail miserably.",
  "I'm a winner.",
  "Me trying to understand modern slang.",
  "I'm not ignoring you, I'm just admiring the view.",
  "When you try to act like you're not cold.",
  "I'm a champion.",
  "Me trying to keep a secret.",
  "I'm not ignoring you, I'm just lost in thought.",
  "When you try to pretend you didn't fall asleep.",
];

/** Fisher–Yates shuffle. Returns a new array; the input is untouched. */
export function fisherYatesShuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Deal a fresh hand to every player in the roster. The previous round's
 * `hand_cards` rows are replaced so every round starts with a full hand.
 */
export async function dealHands(room: Room, roster: Player[], handSize = 7): Promise<boolean> {
  const supabase = requireSupabase();
  try {
    await supabase.from("hand_cards").delete().eq("room_code", room.code);
    const dealt = fisherYatesShuffle(CAPTION_DECK);
    const rows: { room_code: string; player_id: string; caption_id: null; text: string; played: boolean }[] = [];
    let i = 0;
    for (const player of roster) {
      for (let n = 0; n < handSize; n++) {
        rows.push({
          room_code: room.code,
          player_id: player.player_id,
          caption_id: null,
          text: dealt[i % dealt.length],
          played: false,
        });
        i++;
      }
    }
    if (rows.length > 0) {
      const { error } = await supabase.from("hand_cards").insert(rows);
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.error("dealHands failed", errorMessage(e));
    return false;
  }
}

/**
 * Play a hand card for the current round. Re-playing any other card first
 * un-plays your previous pick, so changing your mind works until reveal.
 */
export async function playCaption(room: Room, playerId: string, card: HandCard): Promise<boolean> {
  const supabase = requireSupabase();
  try {
    await supabase
      .from("hand_cards")
      .update({ played: false, round_played: null })
      .eq("room_code", room.code)
      .eq("player_id", playerId)
      .neq("id", card.id);
    await supabase
      .from("hand_cards")
      .update({ played: true, round_played: room.round_number })
      .eq("id", card.id);
    const { error } = await supabase.from("round_captions").upsert(
      {
        room_code: room.code,
        round_number: room.round_number,
        player_id: playerId,
        caption_id: card.id,
        text: card.text,
        was_auto: false,
      },
      { onConflict: "room_code,round_number,player_id" },
    );
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("playCaption failed", e);
    return false;
  }
}

/**
 * Play a completely custom caption typed by the player — no hand card needed.
 * Un-plays any hand_cards that were already played this round for this player,
 * then upserts the custom text directly into round_captions.
 */
export async function playCustomCaption(room: Room, playerId: string, text: string): Promise<boolean> {
  const supabase = requireSupabase();
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    // Un-play any hand card they previously committed this round
    await supabase
      .from("hand_cards")
      .update({ played: false, round_played: null })
      .eq("room_code", room.code)
      .eq("player_id", playerId)
      .eq("round_played", room.round_number);
    const { error } = await supabase.from("round_captions").upsert(
      {
        room_code: room.code,
        round_number: room.round_number,
        player_id: playerId,
        caption_id: null,
        text: trimmed,
        was_auto: false,
      },
      { onConflict: "room_code,round_number,player_id" },
    );
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("playCustomCaption failed", e);
    return false;
  }
}

/** Strip player ids and shuffle, so the judge can't infer ownership. */
export function anonymizeCaptions(rows: RoundCaption[]): AnonymousCaption[] {
  return fisherYatesShuffle(rows.map((r) => ({ id: r.id, text: r.text })));
}

/** Next player after the current judge, wrapping around. */
export function nextJudge(roster: Player[], currentJudgeId: string | null): Player | null {
  if (roster.length === 0) return null;
  if (!currentJudgeId) return roster[0];
  const idx = roster.findIndex((p) => p.player_id === currentJudgeId);
  return roster[(idx + 1) % roster.length];
}

/** Resolve the caption owner + score the round host-side (never sent to judge). */
export async function resolveCaptionWinner(
  room: Room,
  captionId: string,
  pointsToAdd = 1,
): Promise<{ playerId: string; playerName: string; points: number } | null> {
  const supabase = requireSupabase();
  try {
    const { data, error } = await supabase.from("round_captions").select("*").eq("id", captionId).maybeSingle();
    if (error || !data) return null;
    const played: RoundCaption = data;
    const { data: nameRow } = await supabase
      .from("players")
      .select("player_name")
      .eq("room_code", room.code)
      .eq("player_id", played.player_id)
      .maybeSingle();
    const { data: leaderRow } = await supabase
      .from("leaderboard")
      .select("*")
      .eq("room_code", room.code)
      .eq("player_id", played.player_id)
      .maybeSingle();
    const playerName = nameRow?.player_name ?? "Player";
    const points = (leaderRow?.points ?? 0) + pointsToAdd;
    await supabase.from("leaderboard").upsert(
      {
        room_code: room.code,
        player_id: played.player_id,
        player_name: playerName,
        points,
      },
      { onConflict: "room_code,player_id" },
    );
    return { playerId: played.player_id, playerName, points };
  } catch (e) {
    console.error("resolveCaptionWinner failed", e);
    return null;
  }
}
