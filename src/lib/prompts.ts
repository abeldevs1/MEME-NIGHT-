import type { PromptCategory, Twist } from "./types";
import { requireSupabase } from "./supabase/client";

export interface Prompt {
  text: string;
  category: Exclude<PromptCategory, "mixed">;
  adult?: boolean;
}

export const PROMPT_CATEGORIES: {
  key: Exclude<PromptCategory, "mixed">;
  label: string;
  emoji: string;
  description: string;
  adult?: boolean;
}[] = [
  { key: "general", label: "General", emoji: "🎲", description: "A bit of everything" },
  { key: "funny", label: "Fun", emoji: "😂", description: "Straight-up jokes and chaos" },
  { key: "reaction", label: "Reaction", emoji: "🤨", description: "Reaction-pic energy" },
  { key: "pov", label: "POV", emoji: "🎬", description: "POV scenarios" },
  { key: "outrageous", label: "Outrageous", emoji: "🤯", description: "Wild, unhinged, no limits" },
  { key: "caption", label: "Caption this", emoji: "🖼️", description: "Caption the picture" },
  { key: "feels", label: "How it feels", emoji: "💀", description: "Relatable life moments" },
  { key: "chat", label: "Group chat", emoji: "💬", description: "Text-message chaos" },
  { key: "local", label: "Local flavour", emoji: "🗺️", description: "Home-town inside jokes" },
  { key: "work", label: "Work", emoji: "💼", description: "Office, bosses, 5pm" },
  { key: "food", label: "Food", emoji: "🍕", description: "Snacks, cooking, cravings" },
  { key: "tech", label: "Tech", emoji: "📱", description: "Phones, bugs, software" },
  { key: "gaming", label: "Gaming", emoji: "🎮", description: "Lag, rage, one more game" },
  { key: "horror", label: "Horror", emoji: "👻", description: "Spooky vibes and jumpscares" },
  { key: "travel", label: "Travel", emoji: "✈️", description: "Trips, layovers, tourists" },
  { key: "spicy", label: "Spicy", emoji: "🌶️", description: "Risqué, but tasteful", adult: true },
  { key: "adult", label: "Adult", emoji: "🍸", description: "For the grown-ups", adult: true },
];

export const PROMPTS: Prompt[] = [
  // ------------------------- general -------------------------
  { text: "Your last text message, but as a reaction", category: "general" },
  { text: "Caption this: a normal Tuesday for you", category: "general" },
  { text: "One meme to sum up this friend group", category: "general" },
  { text: "The meme your group chat is sending right now", category: "general" },
  { text: "A meme for the last thing that made you laugh", category: "general" },
  { text: "The meme that describes your week", category: "general" },
  { text: "Send the meme you'd use if your phone was dying", category: "general" },
  { text: "The meme for 'I'm on my way' when you're not", category: "general" },
  { text: "A meme for the last 'good news' you got", category: "general" },
  { text: "Your lock screen energy, as a meme", category: "general" },
  { text: "The meme for 'it's complicated'", category: "general" },
  { text: "Your autobiography, one meme, go", category: "general" },
  { text: "The meme you send to avoid the question", category: "general" },
  { text: "A meme for your current mood right now", category: "general" },
  { text: "The meme for 'I told you so'", category: "general" },
  { text: "Your spirit animal, as a meme", category: "general" },
  { text: "A meme for the vibe of this room right now", category: "general" },
  { text: "The meme for 'we'll figure it out'", category: "general" },
  { text: "A meme for your biggest flex", category: "general" },
  { text: "The meme for 'no pressure'", category: "general" },
  { text: "A meme for that thing you keep procrastinating", category: "general" },
  { text: "Your reaction to 'it's just a prank bro'", category: "general" },
  { text: "A meme for the last time you got caught", category: "general" },
  { text: "The meme for your morning routine", category: "general" },
  { text: "A meme that describes your love life", category: "general" },
  { text: "The meme for your group's inside joke", category: "general" },
  { text: "A meme for the snack you can't stop eating", category: "general" },
  { text: "The meme for 'it's not you, it's me'", category: "general" },
  { text: "A meme for your workout 'plan'", category: "general" },
  { text: "The meme for your wifi dropping mid-call", category: "general" },
  { text: "A meme for the last time you said 'one more episode'", category: "general" },
  { text: "The meme for forgetting why you walked into the room", category: "general" },
  { text: "A meme for the group's unsolicited advice", category: "general" },
  { text: "The meme for 'I'll be ready in five minutes'", category: "general" },
  { text: "A meme for the friend who pays in coins", category: "general" },

  // ------------------------- funny -------------------------
  { text: "Send the funniest thing you've seen all week", category: "funny" },
  { text: "A meme that would make grandma double-take", category: "funny" },
  { text: "The meme for 'I'm not arguing, I'm explaining why I'm right'", category: "funny" },
  { text: "A meme for someone who says 'I don't meme'", category: "funny" },
  { text: "The funniest way to say 'I'm broke'", category: "funny" },
  { text: "A meme for the 'one more round' energy", category: "funny" },
  { text: "The meme for 'it's not my fault'", category: "funny" },
  { text: "A meme for your dumbest habit", category: "funny" },
  { text: "The meme for pretending to understand", category: "funny" },
  { text: "A meme that's funnier than this whole game", category: "funny" },
  { text: "The meme for 'I'm built different'", category: "funny" },
  { text: "A meme for the last thing you broke", category: "funny" },
  { text: "The meme for 'trust me bro'", category: "funny" },
  { text: "A meme for your worst pickup line", category: "funny" },
  { text: "The meme for 'I'll start my diet tomorrow'", category: "funny" },
  { text: "A meme for the group's official clown", category: "funny" },
  { text: "The meme for 'this is fine'", category: "funny" },
  { text: "A meme for your bank account after payday", category: "funny" },
  { text: "The meme for someone texting you 'we need to talk'", category: "funny" },
  { text: "A meme for the last excuse you made up", category: "funny" },
  { text: "The meme for 'I read the terms and conditions'", category: "funny" },
  { text: "A meme for your inner saboteur", category: "funny" },
  { text: "The meme for 'I'm not crying, it's allergies'", category: "funny" },
  { text: "A meme for your most dramatic friend", category: "funny" },
  { text: "The meme for 'working hard or hardly working?'", category: "funny" },
  { text: "A meme for the person who says 'I'm a very fast typer'", category: "funny" },
  { text: "The meme for your resting 'I heard that' face", category: "funny" },
  { text: "A meme for when the group laughs at your expense", category: "funny" },
  { text: "The meme for someone who 'accidentally' opened your package", category: "funny" },
  { text: "A meme for your overthinking at 3am", category: "funny" },
  { text: "The meme for a failed cooking attempt", category: "funny" },
  { text: "A meme for when your sibling lies to your parents", category: "funny" },

  // ------------------------- reaction -------------------------
  { text: "React to: Monday morning alarm", category: "reaction" },
  { text: "The face you make when your crush replies fast", category: "reaction" },
  { text: "React to: 'we need to talk'", category: "reaction" },
  { text: "Your reaction when the wifi comes back", category: "reaction" },
  { text: "React to: 'it's a surprise'", category: "reaction" },
  { text: "Your face when someone steals your food", category: "reaction" },
  { text: "React to: Monday's inbox after the weekend", category: "reaction" },
  { text: "React to: 'the bill is already paid'", category: "reaction" },
  { text: "Your energy when the DJ plays your song", category: "reaction" },
  { text: "React to: 'we're doing a group project'", category: "reaction" },
  { text: "The face when a plot twist hits", category: "reaction" },
  { text: "React to: free food appeared", category: "reaction" },
  { text: "Your reaction when plans get cancelled", category: "reaction" },
  { text: "React to: 'I already told you this'", category: "reaction" },
  { text: "Your face when the photocopy actually works", category: "reaction" },
  { text: "React to: someone sings along to your song", category: "reaction" },
  { text: "React to: 'one more round'", category: "reaction" },
  { text: "React to: 'the meeting could've been an email'", category: "reaction" },
  { text: "Your reaction when the code finally works", category: "reaction" },
  { text: "React to: someone says 'I don't like that movie'", category: "reaction" },
  { text: "React to: your ex liking your post", category: "reaction" },
  { text: "Your reaction to 'we ran out of coffee'", category: "reaction" },
  { text: "React to: finding money in your old jacket", category: "reaction" },
  { text: "Your face when they say 'dinner is on me'", category: "reaction" },
  { text: "React to: 'I'm not mad, I'm just disappointed'", category: "reaction" },
  { text: "Your reaction when the zoom unmutes you", category: "reaction" },
  { text: "React to: 'it's a Tuesday'", category: "reaction" },
  { text: "Your face when the waiter brings the bill", category: "reaction" },
  { text: "React to: 'this is a safe space'", category: "reaction" },
  { text: "React to: someone says 'that's a you problem'", category: "reaction" },
  { text: "Your face when you realize it's already Friday", category: "reaction" },
  { text: "React to: the group chat going silent", category: "reaction" },
  { text: "Your reaction when the elevator door opens on your floor", category: "reaction" },
  { text: "React to: 'guess what'", category: "reaction" },
  { text: "Your reaction when they replay the video from the start", category: "reaction" },
  { text: "React to: 'I'll explain everything later'", category: "reaction" },

  // ------------------------- POV -------------------------
  { text: "POV: you're explaining a joke that didn't land", category: "pov" },
  { text: "POV: you realize you've been texting the wrong person", category: "pov" },
  { text: "POV: someone says 'we need to talk' and goes offline", category: "pov" },
  { text: "POV: you just sent a risky text and your heart is beating out of your chest", category: "pov" },
  { text: "POV: you're pretending to listen but you're planning your dinner", category: "pov" },
  { text: "POV: you confidently give the wrong directions", category: "pov" },
  { text: "POV: you just realized your microphone wasn't muted", category: "pov" },
  { text: "POV: you're trying to sneak a snack at 3 AM without waking the house", category: "pov" },
  { text: "POV: you're the one who started the drama but you're playing innocent", category: "pov" },
  { text: "POV: you successfully parallel parked on the first try", category: "pov" },
  { text: "POV: you're waiting for them to finish typing...", category: "pov" },
  { text: "POV: the cashier is scanning your items too fast to bag them", category: "pov" },
  { text: "POV: you confidently answer 'yes' to a question you didn't hear", category: "pov" },
  { text: "POV: you finally win an argument in the shower, three days later", category: "pov" },
  { text: "POV: you realize the gossip is about you", category: "pov" },
  { text: "POV: your card gets declined over a $2 purchase", category: "pov" },
  { text: "POV: you're trying to act sober in front of your parents", category: "pov" },
  { text: "POV: you just found the perfect comeback, but the moment is gone", category: "pov" },
  { text: "POV: you're trying to take a cute selfie but the wind says no", category: "pov" },
  { text: "POV: you accidentally double-tap a photo from 2014", category: "pov" },
  { text: "POV: you're the friend giving relationship advice while single", category: "pov" },
  { text: "POV: someone compliments you and you don't know how to act", category: "pov" },
  { text: "POV: you're trying to read a long text without letting them know you read it", category: "pov" },
  { text: "POV: you walk into the wrong classroom and commit to it", category: "pov" },
  { text: "POV: your playlist is absolutely carrying the road trip", category: "pov" },
  { text: "POV: you're hyping up your best friend's terrible idea", category: "pov" },
  { text: "POV: you realize you're the toxic trait", category: "pov" },
  { text: "POV: you just woke up from a nap and don't know what year it is", category: "pov" },
  { text: "POV: you're pretending to work while looking at memes", category: "pov" },
  { text: "POV: you just discovered a new song and it's your entire personality now", category: "pov" },
  { text: "POV: you're trying to hold back a laugh at a serious moment", category: "pov" },
  { text: "POV: the delivery driver knocks instead of ringing the bell", category: "pov" },
  { text: "POV: you're the designated driver watching your friends lose it", category: "pov" },
  { text: "POV: you just stepped in a puddle wearing your favorite shoes", category: "pov" },
  { text: "POV: you realize you left your wallet at home after eating", category: "pov" },
  { text: "POV: you're waiting for the microwave to hit 0 so it doesn't beep", category: "pov" },
  { text: "POV: you're trying to remember where you parked your car", category: "pov" },
  { text: "POV: you just saw a dog out the window and pointed it out", category: "pov" },
  { text: "POV: someone hands you a baby and you panic", category: "pov" },
  { text: "POV: you're trying to keep a straight face while lying", category: "pov" },
  { text: "POV: you finally get a moment of peace and your phone rings", category: "pov" },
  { text: "POV: you're explaining your niche interest to someone who didn't ask", category: "pov" },
  { text: "POV: you just accidentally sent a heart emoji to your boss", category: "pov" },
  { text: "POV: you're the only one who didn't get the joke", category: "pov" },
  { text: "POV: you realize you've been pronouncing a word wrong your whole life", category: "pov" },
  { text: "POV: you're trying to leave a party without saying goodbye", category: "pov" },
  { text: "POV: you're hype for plans until the day actually arrives", category: "pov" },
  { text: "POV: you just dropped a fresh piece of food on the floor", category: "pov" },
  { text: "POV: you're staring at the menu after saying 'I know what I want'", category: "pov" },
  { text: "POV: you realize you're the adult in the room and it's terrifying", category: "pov" },

  // ------------------------- outrageous -------------------------
  { text: "The most unhinged thing to say to a parking officer", category: "outrageous" },
  { text: "POV: you're the chaos agent of the friend group", category: "outrageous" },
  { text: "A meme for someone who does everything 'for the plot'", category: "outrageous" },
  { text: "The energy of a raccoon that's had enough", category: "outrageous" },
  { text: "POV: the group told you not to, so you definitely did", category: "outrageous" },
  { text: "The meme for your most questionable life decision", category: "outrageous" },
  { text: "POV: you're the main character of a heist movie", category: "outrageous" },
  { text: "A meme for 'I did not plan this, but here we are'", category: "outrageous" },
  { text: "The most disrespectful yet accurate roast you can send", category: "outrageous" },
  { text: "POV: you'd fight a pigeon and win", category: "outrageous" },
  { text: "The meme for the friend who says 'it's not illegal, it's frowned upon'", category: "outrageous" },
  { text: "POV: your plan is 5% logic and 95% confidence", category: "outrageous" },
  { text: "A meme for the moment you committed to the bit", category: "outrageous" },
  { text: "POV: you're delivering the most unhinged toast of the night", category: "outrageous" },
  { text: "The meme for 'I'll do anything once' said with no hesitation", category: "outrageous" },
  { text: "POV: you're the wild card in every group project", category: "outrageous" },
  { text: "A meme for your greatest 'hold my drink' moment", category: "outrageous" },
  { text: "POV: you lost the bet and now you have to follow through", category: "outrageous" },
  { text: "The meme for 'this escalated quickly'", category: "outrageous" },
  { text: "POV: you're the villain but everyone roots for you", category: "outrageous" },
  { text: "A meme for someone who microwaves fish at work", category: "outrageous" },
  { text: "POV: you said something so chaotic everyone froze", category: "outrageous" },
  { text: "The meme for your most suspicious google search", category: "outrageous" },
  { text: "POV: you're 'investing' your rent money", category: "outrageous" },
  { text: "A meme for the friend who makes everything a competition", category: "outrageous" },
  { text: "POV: you have 0 poker face and you love it", category: "outrageous" },
  { text: "The meme for 'I fear no consequence' energy", category: "outrageous" },
  { text: "POV: you answered a survey with only chaos", category: "outrageous" },
  { text: "A meme for the group's public enemy #1 (lovingly)", category: "outrageous" },
  { text: "POV: the teacher said 'open book test' and you treat it like a buffet", category: "outrageous" },

  // ------------------------- caption this -------------------------
  { text: "Caption this: your face when plans fall through", category: "caption" },
  { text: "Caption this: a normal Tuesday for you", category: "caption" },
  { text: "Caption this: you pretending to listen", category: "caption" },
  { text: "Caption this: the 'one more dance' moment", category: "caption" },
  { text: "Caption this: your group's group photo", category: "caption" },
  { text: "Caption this: the 'we lost, but it was fun' face", category: "caption" },
  { text: "Caption this: your best 'I told you so'", category: "caption" },
  { text: "Caption this: walking into the room like", category: "caption" },
  { text: "Caption this: the last slice of pizza", category: "caption" },
  { text: "Caption this: 'I'll start tomorrow'", category: "caption" },
  { text: "Caption this: your reaction to this very prompt", category: "caption" },
  { text: "Caption this: the friend who's always on their phone", category: "caption" },
  { text: "Caption this: the group deciding where to eat", category: "caption" },
  { text: "Caption this: your Monday morning face", category: "caption" },
  { text: "Caption this: the 'it's fine' moment", category: "caption" },
  { text: "Caption this: your best friend's worst outfit", category: "caption" },
  { text: "Caption this: the family group chat", category: "caption" },
  { text: "Caption this: your charger at 1%", category: "caption" },
  { text: "Caption this: 'let's take one more photo'", category: "caption" },
  { text: "Caption this: the guy who says 'I know a shortcut'", category: "caption" },
  { text: "Caption this: the moment you realize you're the joke", category: "caption" },
  { text: "Caption this: your face in every group photo", category: "caption" },
  { text: "Caption this: the group's 'we've been here for an hour' energy", category: "caption" },
  { text: "Caption this: your victory lap after a small win", category: "caption" },
  { text: "Caption this: the dog that knows it did something wrong", category: "caption" },

  // ------------------------- how it feels -------------------------
  { text: "How it feels when the mic drops", category: "feels" },
  { text: "How it feels to be the last one laughing", category: "feels" },
  { text: "How it feels when your phone is at 2%", category: "feels" },
  { text: "How it feels when the song you love comes on", category: "feels" },
  { text: "How it feels when you win an argument", category: "feels" },
  { text: "How it feels when you finally find your keys", category: "feels" },
  { text: "How it feels to say 'I'm fine'", category: "feels" },
  { text: "How it feels when you remember a cringe memory", category: "feels" },
  { text: "How it feels when someone else washes the dishes", category: "feels" },
  { text: "How it feels to get the group chat reaction you wanted", category: "feels" },
  { text: "How it feels when the bus comes immediately", category: "feels" },
  { text: "How it feels when your favorite snack is on sale", category: "feels" },
  { text: "How it feels to finally close the tab you meant to", category: "feels" },
  { text: "How it feels when the movie twist gets you", category: "feels" },
  { text: "How it feels to be woken up by your alarm on a day off", category: "feels" },
  { text: "How it feels when your package arrives early", category: "feels" },
  { text: "How it feels to out-pizza the Hut", category: "feels" },
  { text: "How it feels when someone finishes your sentence", category: "feels" },
  { text: "How it feels to find money in a coat you forgot about", category: "feels" },
  { text: "How it feels when your team finally wins", category: "feels" },
  { text: "How it feels when the nap hits perfectly", category: "feels" },
  { text: "How it feels to finally delete that app", category: "feels" },
  { text: "How it feels when the queue moves faster than expected", category: "feels" },
  { text: "How it feels to be the one who called it", category: "feels" },
  { text: "How it feels when your stomach growls in silence", category: "feels" },

  // ------------------------- the group chat -------------------------
  { text: "Send the group chat's reaction to: 'game night tonight?'", category: "chat" },
  { text: "The group chat when someone says 'let's all split the bill'", category: "chat" },
  { text: "The group chat when the airdrop says 'received'", category: "chat" },
  { text: "The group chat's energy after one joke", category: "chat" },
  { text: "The group chat when someone drops a surprise", category: "chat" },
  { text: "The group chat when you say 'who's awake?'", category: "chat" },
  { text: "The group chat's reaction to 'I'm bringing my ex'", category: "chat" },
  { text: "The group chat after someone double texts", category: "chat" },
  { text: "The group chat's reaction to a 3am idea", category: "chat" },
  { text: "The group chat when the food arrives", category: "chat" },
  { text: "The group chat's reaction to 'who did this?'", category: "chat" },
  { text: "The group chat planning a trip they'll never take", category: "chat" },
  { text: "The group chat's reaction to a left-on-read", category: "chat" },
  { text: "The group chat when someone posts an unflattering photo", category: "chat" },
  { text: "The group chat's reaction to 'I have an announcement'", category: "chat" },
  { text: "The group chat when someone says 'I'm deleting the app'", category: "chat" },
  { text: "The group chat's reaction to a 45-second voice note", category: "chat" },
  { text: "The group chat when the '5 minutes' turns into 3 hours", category: "chat" },
  { text: "The group chat's energy when the friend with the car is busy", category: "chat" },
  { text: "The group chat when someone accidentally texts the wrong group", category: "chat" },

  // ------------------------- local flavour -------------------------
  { text: "React to: 'habesha auntie says you've gotten fat (affectionately)'", category: "local" },
  { text: "POV: it's seifu on a saturday", category: "local" },
  { text: "Your reaction when the berbere is extra spicy", category: "local" },
  { text: "POV: you're late to an Ethiopian wedding and the coffee ceremony already started", category: "local" },
  { text: "React to: 'the injera tore, the night is ruined'", category: "local" },
  { text: "The face you make when the shiro runs out", category: "local" },
  { text: "POV: grandma's 'come here, I need to tell you something'", category: "local" },
  { text: "React to: 'auntie says you need to get married'", category: "local" },
  { text: "POV: you're asked to dance and you absolutely deliver", category: "local" },
  { text: "The face when the honey wine is flowing", category: "local" },
  { text: "React to: 'the buna is ready'", category: "local" },
  { text: "POV: you arrive late but still first in line for food", category: "local" },
  { text: "React to: 'there's more food coming, don't finish yet'", category: "local" },
  { text: "POV: your aunties are comparing you to your cousins", category: "local" },
  { text: "The face when someone asks 'so, when are you bringing someone home?'", category: "local" },
  { text: "POV: the dj plays a classic and the whole table jumps", category: "local" },
  { text: "React to: 'you have to eat, you're getting thin'", category: "local" },
  { text: "POV: it's a sunday and the neighbours are having a party", category: "local" },

  // ------------------------- work -------------------------
  { text: "POV: the boss says 'quick question' at 5:59pm", category: "work" },
  { text: "The meme for a meeting that could've been an email", category: "work" },
  { text: "POV: you're the only one on camera in the meeting", category: "work" },
  { text: "The meme for 'I'll circle back to that'", category: "work" },
  { text: "POV: Monday morning when you still have 4 days of work", category: "work" },
  { text: "The face when your colleague says 'can you just help me quickly?'", category: "work" },
  { text: "POV: you typed 'ok sounds good' but you mean the opposite", category: "work" },
  { text: "The meme for your empty 'working from home' desk", category: "work" },
  { text: "POV: the internship asks if you want to shadow someone", category: "work" },
  { text: "The meme for 'I'll do it later' at work", category: "work" },
  { text: "POV: you're the 'go-to person' and it's exhausting", category: "work" },
  { text: "The face when you get a meeting invite called 'quick sync'", category: "work" },
  { text: "POV: you paste the same excuse into the status update", category: "work" },
  { text: "The meme for the colleague who talks during lunch", category: "work" },
  { text: "POV: it's Friday and the boss schedules a 5pm call", category: "work" },
  { text: "The meme for your badge photo energy", category: "work" },
  { text: "POV: the printer chooses violence today", category: "work" },
  { text: "The face when someone asks 'did you see my email?'", category: "work" },
  { text: "POV: you're pretending to be busy during a walk-by", category: "work" },
  { text: "The meme for your 'unlimited PTO' that you never take", category: "work" },
  { text: "POV: the onboarding video is 45 minutes and you've been here 2 years", category: "work" },
  { text: "The meme for 'this is a follow-up on my previous follow-up'", category: "work" },
  { text: "POV: you called out sick and the team is posting lunch pics", category: "work" },
  { text: "The face when your manager says 'think bigger'", category: "work" },

  // ------------------------- food -------------------------
  { text: "POV: the food delivery is 2 minutes away", category: "food" },
  { text: "The meme for 'I'll just have a small bite'", category: "food" },
  { text: "POV: you burn the toast and consider it character", category: "food" },
  { text: "The face when your fries are stolen", category: "food" },
  { text: "POV: the menu has 40 pages and you pick the first thing", category: "food" },
  { text: "The meme for 'one more plate' at the buffet", category: "food" },
  { text: "POV: someone says 'it tastes just like my mom's' and it doesn't", category: "food" },
  { text: "The meme for your 2am fridge raid", category: "food" },
  { text: "POV: you ordered 3 appetizers for yourself", category: "food" },
  { text: "The face when the food looks better than the picture", category: "food" },
  { text: "POV: the spice warning says 'not for the faint'", category: "food" },
  { text: "The meme for 'I'm not hungry' while ordering a large", category: "food" },
  { text: "POV: your group spends 40 minutes deciding where to eat", category: "food" },
  { text: "The face when someone orders the exact same thing as you", category: "food" },
  { text: "POV: you cook and it's a masterpiece but no one sees it", category: "food" },
  { text: "The meme for the last piece of injera", category: "food" },
  { text: "POV: the waiter asks 'how's everything?' mid-chew", category: "food" },
  { text: "The meme for a food picture you'll never cook", category: "food" },
  { text: "POV: you say 'I don't need a menu' and instantly regret it", category: "food" },
  { text: "The face when your order is wrong but you keep it", category: "food" },
  { text: "POV: it's 2am and the cravings hit", category: "food" },
  { text: "The meme for eating dessert first, no regrets", category: "food" },
  { text: "POV: the potluck and everyone brought the same thing", category: "food" },
  { text: "The face when the table next to you got better food", category: "food" },

  // ------------------------- tech -------------------------
  { text: "POV: the app updates and everything moved", category: "tech" },
  { text: "The meme for 'have you tried restarting it?'", category: "tech" },
  { text: "POV: you finally fixed it and have no idea how", category: "tech" },
  { text: "The face when the charger cable only works at one angle", category: "tech" },
  { text: "POV: the meeting is on mute and you're venting", category: "tech" },
  { text: "The meme for your 47 open browser tabs", category: "tech" },
  { text: "POV: your phone autocorrects to something cursed", category: "tech" },
  { text: "The face when the wifi drops mid-argument", category: "tech" },
  { text: "POV: you're the 'tech support' for your whole family", category: "tech" },
  { text: "The meme for 'I don't need to read the update notes'", category: "tech" },
  { text: "POV: the captcha asks you to prove you're not a robot", category: "tech" },
  { text: "The face when your password is wrong for no reason", category: "tech" },
  { text: "POV: you closed the tab you needed", category: "tech" },
  { text: "The meme for a 5GB update before a trip", category: "tech" },
  { text: "POV: the group calls you for 'one small tech thing'", category: "tech" },
  { text: "The face when the app asks for a review mid-task", category: "tech" },
  { text: "POV: your laptop fan sounds like a jet", category: "tech" },
  { text: "The meme for 'it worked on my machine'", category: "tech" },
  { text: "POV: you finally restarted and everything's fixed", category: "tech" },
  { text: "The face when the software updates at the worst time", category: "tech" },
  { text: "POV: the QR code won't scan and the line grows", category: "tech" },
  { text: "The meme for your notification badge at 99+", category: "tech" },
  { text: "POV: you typed the wifi password wrong 3 times", category: "tech" },
  { text: "The face when your 'smart' device acts dumb", category: "tech" },

  // ------------------------- gaming -------------------------
  { text: "POV: you lag at the worst possible moment", category: "gaming" },
  { text: "The meme for 'one more game' at 3am", category: "gaming" },
  { text: "POV: your teammate goes AFK mid-fight", category: "gaming" },
  { text: "The face when the boss has 1 HP and kills you", category: "gaming" },
  { text: "POV: you say 'I'm good' after a terrible run", category: "gaming" },
  { text: "The meme for your aim at 100% and your aim at 2am", category: "gaming" },
  { text: "POV: the lobby chat is pure chaos", category: "gaming" },
  { text: "The face when you finally beat the tutorial", category: "gaming" },
  { text: "POV: you 'borrowed' the controller from the group", category: "gaming" },
  { text: "The meme for 'it's not my ping, it's the game'", category: "gaming" },
  { text: "POV: the save file got corrupted", category: "gaming" },
  { text: "The face when your friend 'knows a shortcut' in the game", category: "gaming" },
  { text: "POV: you picked the hardest difficulty on accident", category: "gaming" },
  { text: "The meme for your character falling off the map", category: "gaming" },
  { text: "POV: the squad is deciding who's the healer", category: "gaming" },
  { text: "The face when the update changes your main", category: "gaming" },
  { text: "POV: you've been playing for '5 minutes'", category: "gaming" },
  { text: "The meme for your victory dance after one win", category: "gaming" },
  { text: "POV: someone tells you to touch grass", category: "gaming" },
  { text: "The face when you get matched with the trolls", category: "gaming" },
  { text: "POV: you're the one who breaks the 'no tryhard' rule", category: "gaming" },
  { text: "The meme for a new game being released the day before finals", category: "gaming" },
  { text: "POV: your teammate steals the kill and takes the credit", category: "gaming" },
  { text: "The face when the game asks you to 'wait for server sync'", category: "gaming" },

  // ------------------------- horror -------------------------
  { text: "POV: the house is too quiet", category: "horror" },
  { text: "The meme for 'it was just the cat'", category: "horror" },
  { text: "POV: you see a shadow move in the corner", category: "horror" },
  { text: "The face when the elevator opens to a dark hallway", category: "horror" },
  { text: "POV: your phone flashlight dies at the worst time", category: "horror" },
  { text: "The meme for 'I heard something' and it's nothing", category: "horror" },
  { text: "POV: you look in the mirror and it blinks first", category: "horror" },
  { text: "The face when the lights flicker", category: "horror" },
  { text: "POV: the basement stairs creak", category: "horror" },
  { text: "The meme for 'it's just the wind'", category: "horror" },
  { text: "POV: the doll was facing the other way yesterday", category: "horror" },
  { text: "The face when you check under the bed at 30", category: "horror" },
  { text: "POV: the gps says you're already there", category: "horror" },
  { text: "The meme for the group 'splitting up' to explore", category: "horror" },
  { text: "POV: someone whispers your name when you're alone", category: "horror" },
  { text: "The face when the door was unlocked but you locked it", category: "horror" },
  { text: "POV: the horror movie makes you check the hallway", category: "horror" },
  { text: "The meme for 'I was never scared' while clutching the blanket", category: "horror" },
  { text: "POV: the wifi cuts and the lights dim together", category: "horror" },
  { text: "The face when the cat stares at nothing", category: "horror" },
  { text: "POV: your friend says 'don't look behind you'", category: "horror" },
  { text: "The meme for the last one out of the building", category: "horror" },
  { text: "POV: the mirror steams up with a handprint", category: "horror" },
  { text: "The face when the elevator stops between floors", category: "horror" },

  // ------------------------- travel -------------------------
  { text: "POV: your flight is in 4 hours and you're not packed", category: "travel" },
  { text: "The meme for the 'gate changed' announcement", category: "travel" },
  { text: "POV: you're in the longest security line ever", category: "travel" },
  { text: "The face when your luggage comes out last", category: "travel" },
  { text: "POV: the seat recliner doesn't work", category: "travel" },
  { text: "The meme for 'we're almost there' during a 6 hour drive", category: "travel" },
  { text: "POV: you packed 4 outfits for a weekend trip", category: "travel" },
  { text: "The face when the hotel room looks nothing like the photos", category: "travel" },
  { text: "POV: the tourist next to you is lost and it's not their fault", category: "travel" },
  { text: "The meme for your layover that became an overnight", category: "travel" },
  { text: "POV: the pilot says 'we'll make up the time'", category: "travel" },
  { text: "The face when the local says 'it's just 5 minutes away'", category: "travel" },
  { text: "POV: you brought the wrong adapter", category: "travel" },
  { text: "The meme for the 'must-see' spot that's a rock", category: "travel" },
  { text: "POV: the wifi at the airport costs a fortune", category: "travel" },
  { text: "The face when your group photo includes a stranger", category: "travel" },
  { text: "POV: the 'all inclusive' buffet on day one vs day five", category: "travel" },
  { text: "The meme for getting lost and finding something better", category: "travel" },
  { text: "POV: the flight attendant's safety demo is your whole personality", category: "travel" },
  { text: "The face when the taxi driver takes the 'scenic' route", category: "travel" },
  { text: "POV: you're 'traveling light' with two suitcases", category: "travel" },
  { text: "The meme for the group chat photo spam from a trip", category: "travel" },
  { text: "POV: you arrive home and the jet lag hits", category: "travel" },
  // ------------------------- spicy (18+ risqué, gated) -------------------------
  { text: "React to: 'I wasn't looking respectfully'", category: "spicy", adult: true },
  { text: "POV: they send a 'you up?' text at 1:45 AM", category: "spicy", adult: true },
  { text: "The face you make when the accidental thigh touch wasn't accidental", category: "spicy", adult: true },
  { text: "POV: 'I'll bring the wine, you bring the...'", category: "spicy", adult: true },
  { text: "React to: 'Your place is nice, but your bed looks comfortable'", category: "spicy", adult: true },
  { text: "POV: you're trying to act normal after an intensely flirty conversation", category: "spicy", adult: true },
  { text: "The meme for 'I don't usually do this on the first date'", category: "spicy", adult: true },
  { text: "POV: you realize the 'study session' involves zero books", category: "spicy", adult: true },
  { text: "React to: 'Show me what I'm missing'", category: "spicy", adult: true },
  { text: "Your reaction when they know exactly what you like without you telling them", category: "spicy", adult: true },
  { text: "POV: it's getting hot in here and it's not the weather", category: "spicy", adult: true },
  { text: "The meme for 'I'm trying to be good, but you're making it hard'", category: "spicy", adult: true },
  { text: "React to: 'I was thinking about you in the shower'", category: "spicy", adult: true },
  { text: "POV: the tension is so thick you could cut it with a knife", category: "spicy", adult: true },
  { text: "The meme for when they bite their lip while looking at you", category: "spicy", adult: true },
  { text: "React to: 'Come here and make me'", category: "spicy", adult: true },
  { text: "POV: you just got caught staring at their lips", category: "spicy", adult: true },
  { text: "The meme for 'friends with benefits' turning into just 'benefits'", category: "spicy", adult: true },
  { text: "POV: they whispered exactly what you wanted to hear in a crowded room", category: "spicy", adult: true },
  { text: "React to: 'I dare you to kiss me'", category: "spicy", adult: true },
  { text: "The meme for 'we can't keep doing this' (narrator: they kept doing it)", category: "spicy", adult: true },
  { text: "POV: you're trying to hide the hickey with a turtleneck in summer", category: "spicy", adult: true },
  { text: "React to: 'I need you right now'", category: "spicy", adult: true },
  { text: "The face when they pull you in by your waist", category: "spicy", adult: true },
  { text: "POV: the eye contact just shifted from their eyes to your lips", category: "spicy", adult: true },
  { text: "The meme for 'I have a confession to make...'", category: "spicy", adult: true },
  { text: "React to: 'Are you going to keep teasing or do something about it?'", category: "spicy", adult: true },
  { text: "POV: they're wearing that one outfit that drives you crazy", category: "spicy", adult: true },
  { text: "The meme for 'I promise I won't bite... hard'", category: "spicy", adult: true },
  { text: "POV: you're 'watching a movie' but haven't seen the screen in 20 minutes", category: "spicy", adult: true },
  { text: "React to: 'Lock the door'", category: "spicy", adult: true },
  { text: "The face when they say 'Good girl' or 'Good boy'", category: "spicy", adult: true },
  { text: "POV: you just unlocked a new kink you didn't know you had", category: "spicy", adult: true },
  { text: "The meme for 'I can be whoever you want me to be tonight'", category: "spicy", adult: true },
  { text: "React to: 'I love it when you look at me like that'", category: "spicy", adult: true },
  { text: "POV: the playlist switches from chill to 'baby making music'", category: "spicy", adult: true },
  { text: "The meme for 'I'm feeling a little dangerous today'", category: "spicy", adult: true },
  { text: "React to: 'What if I don't want to leave?'", category: "spicy", adult: true },
  { text: "POV: you're the reason they're taking a cold shower", category: "spicy", adult: true },
  { text: "The face when they pin you against the wall", category: "spicy", adult: true },
  { text: "POV: you're trying to whisper but it sounds more like a moan", category: "spicy", adult: true },
  { text: "The meme for 'we shouldn't do this here'", category: "spicy", adult: true },

  // ------------------------- adult (18+, gated) -------------------------
  { text: "POV: 'We're going to need a towel'", category: "adult", adult: true },
  { text: "React to: 'Keep it down, my roommates are home'", category: "adult", adult: true },
  { text: "Caption this: When the toys run out of battery", category: "adult", adult: true },
  { text: "POV: You just pulled out the handcuffs", category: "adult", adult: true },
  { text: "The meme for 'I need a safe word for this'", category: "adult", adult: true },
  { text: "React to: 'Spit or swallow?'", category: "adult", adult: true },
  { text: "POV: You're doing the 'walk of shame' but it feels like a 'stride of pride'", category: "adult", adult: true },
  { text: "The meme for 'We broke the bed'", category: "adult", adult: true },
  { text: "React to: 'Did you finish?'", category: "adult", adult: true },
  { text: "POV: You're trying to untangle limbs in the morning", category: "adult", adult: true },
  { text: "The meme for 'That wasn't vanilla'", category: "adult", adult: true },
  { text: "React to: 'I swallowed, you owe me'", category: "adult", adult: true },
  { text: "POV: You're desperately looking for the condom wrapper in the dark", category: "adult", adult: true },
  { text: "The meme for the 'gag reflex check'", category: "adult", adult: true },
  { text: "React to: 'Choke me a little'", category: "adult", adult: true },
  { text: "POV: The neighbors definitely heard everything", category: "adult", adult: true },
  { text: "React to: 'I'm not wearing any underwear'", category: "adult", adult: true },
  { text: "The meme for a 'quickie' in the bathroom at a party", category: "adult", adult: true },
  { text: "POV: You realize you forgot to lock the bedroom door", category: "adult", adult: true },
  { text: "React to: 'Can I finish on your face?'", category: "adult", adult: true },
  { text: "The meme for the 'post-nut clarity' hitting hard", category: "adult", adult: true },
  { text: "POV: You're trying to figure out if it was a moan or a cry for help", category: "adult", adult: true },
  { text: "React to: 'Put it in the other hole'", category: "adult", adult: true },
  { text: "The face when the plug slips out", category: "adult", adult: true },
  { text: "POV: You're wiping sweat off places you didn't know could sweat", category: "adult", adult: true },
  { text: "The meme for 'Round 3 and I can't feel my legs'", category: "adult", adult: true },
  { text: "React to: 'You taste amazing'", category: "adult", adult: true },
  { text: "POV: You're staring at the ceiling rethinking your life choices after a hookup", category: "adult", adult: true },
  { text: "The meme for 'When they ask you to call them Daddy/Mommy'", category: "adult", adult: true },
  { text: "React to: 'I brought some toys'", category: "adult", adult: true },
  { text: "POV: You're trying to sneak out without waking them up", category: "adult", adult: true },
  { text: "The face when they hit the right spot completely by accident", category: "adult", adult: true },
  { text: "POV: You're the one who introduced them to the freaky stuff", category: "adult", adult: true },
  { text: "The meme for 'I need a glass of water and an ibuprofen after that'", category: "adult", adult: true },
  { text: "React to: 'Let's film it'", category: "adult", adult: true },
];

// ------------------------- infinite generator -------------------------
// Each theme has its own situation pool, so generated prompts stay on-theme
// and the deck never runs dry.

const GEN_TEMPLATES = [
  (s: string) => `React to: "${s}"`,
  (s: string) => `POV: ${s}`,
  (s: string) => `The face when ${s}`,
  (s: string) => `Caption this: ${s}`,
  (s: string) => `A meme for ${s}`,
  (s: string) => `Your reaction to: "${s}"`,
  (s: string) => `Send the group chat's reaction to: "${s}"`,
  (s: string) => `How it feels when ${s}`,
];

const GEN_SITUATIONS = [
  "someone says 'it's fine' but it's not fine",
  "the elevator opens and your ex is inside",
  "you realize you forgot the gift at home",
  "someone asks 'what's your plan for the weekend'",
  "the waiter brings the wrong order and you keep it",
  "your phone autocorrects to something wild",
  "someone says 'be honest'",
  "the power goes out mid-sentence",
  "you hear your name across the room",
  "someone says 'I know a shortcut'",
  "the group splits the bill to the cent",
  "someone spoils the ending anyway",
  "you realize you've been singing the wrong lyrics",
  "the Uber is 1 minute away and you're not ready",
  "someone says 'we're almost there'",
  "your cat knocks something off the table",
  "someone asks 'do you have a minute?'",
  "you get tagged in a group photo you didn't know about",
  "the wifi password doesn't work",
  "someone says 'that's crazy' without listening",
  "you accidentally like a post from 2016",
  "the ice cream scoop falls off the cone",
  "someone says 'you up?' at 1am",
  "your favorite song comes on at the perfect moment",
  "someone says 'I'll pay you back'",
  "you realize it's a holiday and everything is closed",
  "someone asks 'what did you say?' and you freeze",
  "the group photo is taken mid-blink",
  "someone says 'let's do it for the plot'",
  "you find a hair in your food",
  "someone says 'it's not rocket science'",
  "your headphones die on the train",
  "someone says 'guess who I saw today'",
  "you're told 'take your time' and you panic",
  "you walk into a room and forget why",
  "someone sends '?' after your text",
  "the group is waiting on your answer",
  "you sneeze during the silence",
  "someone says 'we need to talk later'",
  "your alarm goes off during a nap",
];

const CATEGORY_SITUATIONS: Partial<Record<Exclude<PromptCategory, "mixed">, string[]>> = {
  funny: [
    "your delivery is off but you commit anyway",
    "the joke lands on the wrong person",
    "someone laughs before you finish the story",
    "the pun was too good not to say",
    "your laugh is louder than the room",
    "you're the only one laughing",
    "the meme is older than the internet",
    "your humor gets you in trouble",
    "you say something so dumb it becomes funny",
    "the joke dies and everyone stares",
  ],
  pov: [
    "you're the main character and everyone knows it",
    "you walk in fashionably late",
    "you're the one everyone relies on",
    "you have 0 clue what's going on",
    "you said 'I got this' and you don't",
    "you're the sidekick stealing the scene",
    "you're the narrator of your own drama",
    "you get the call that changes the night",
    "you're the villain of the story and you're fine with it",
    "you're 'casually' doing the most",
  ],
  outrageous: [
    "you commit to the bit with no backup plan",
    "you're asked 'why did you do that?' and you smile",
    "the plan has a 10% chance and you take it",
    "you say the quiet part out loud",
    "you do the thing everyone said not to",
    "your chaotic energy breaks the room",
    "you turn a small thing into a whole event",
    "you bet on yourself and nobody believes you",
    "you show up with zero preparation and maximum confidence",
    "you make the group gasp on purpose",
  ],
  reaction: [
    "someone says 'brace yourself'",
    "the news is better than expected",
    "the news is way worse than expected",
    "you get tagged in a group photo",
    "the group chat explodes",
    "your name is called in a meeting",
    "someone asks for a favor with no warning",
    "the surprise is actually surprising",
    "you're told 'I've got a great idea'",
    "the bill arrives",
  ],
  caption: [
    "the photo is 3 years old and still gold",
    "your face in the group photo",
    "the pet's face says it all",
    "the pose was not the plan",
    "the background steals the shot",
    "the photobomb is perfect",
    "the group tried and failed together",
    "the food photo before the meal",
    "the 'candid' that isn't candid",
    "the reunion photo after years apart",
  ],
  feels: [
    "the nostalgia hits out of nowhere",
    "you're having a main character moment",
    "the wave of relief finally comes",
    "you're called by your full name",
    "the memory you tried to forget returns",
    "you realize it's been a while since you laughed like that",
    "the quiet moment after a long day",
    "you hear a song that takes you back",
    "someone says exactly what you needed to hear",
    "you're proud of yourself and it feels weird",
  ],
  chat: [
    "someone double texts after being left on read",
    "the group plans a trip at 2am",
    "someone sends a 3 minute voice note",
    "the group chat starts roasting someone",
    "someone asks 'who's in?' and the chat goes silent",
    "the friend with the car is suddenly busy",
    "someone shares the wrong screenshot",
    "the chat decides to get food",
    "the inside joke is back and everyone's losing it",
    "someone says 'let's call' and it's chaos",
  ],
  local: [
    "auntie asks about your love life",
    "the coffee ceremony is starting and you're not there yet",
    "the injera is coming and it's a competition",
    "the family debate starts at dinner",
    "the 'just one more plate' is not optional",
    "the neighbours are throwing a party",
    "the wedding is in a week and everyone's planning",
    "the food arrives and the table goes quiet",
    "someone compares you to a relative",
    "the tradition is non-negotiable",
  ],
  work: [
    "the boss adds 'urgent' to an email",
    "your coworker says 'quick question'",
    "the meeting runs 45 minutes over",
    "you get a task with no context",
    "the status update is due and nothing happened",
    "someone cc's the whole company",
    "the 'sync' turns into a monologue",
    "your coffee is cold by the time you drink it",
    "the deadline was yesterday",
    "the team celebrates a win you missed",
  ],
  food: [
    "the delivery is late and the hangry is real",
    "you ordered too much and you regret nothing",
    "the spice hits harder than expected",
    "someone steals your last bite",
    "the menu is overwhelming",
    "your cooking is questionable but you serve it",
    "the restaurant is too loud to order",
    "the food coma hits mid-sentence",
    "you say 'I'm full' and order dessert anyway",
    "the group argues about where to eat",
  ],
  tech: [
    "the update changes everything",
    "the wifi dies mid-call",
    "your password resets for no reason",
    "the charger only works at one angle",
    "the app crashes at the worst time",
    "the device updates on your one day off",
    "the captcha keeps failing",
    "the 'smart' device outsmarts you",
    "you restart it and it works",
    "the notification badge is at 99+",
  ],
  gaming: [
    "the lag strikes mid-boss",
    "your teammate quits the match",
    "the 'one more game' is a lie",
    "you die at the last second",
    "the update nerfs your character",
    "the lobby is pure chaos",
    "you win and nobody saw it",
    "the save file is gone",
    "you're blamed for the loss",
    "the tutorial takes forever",
  ],
  horror: [
    "the lights flicker",
    "you hear a noise downstairs",
    "the door was unlocked but it shouldn't be",
    "the mirror moves before you do",
    "the cat stares at nothing",
    "the hallway is longer than it was",
    "the phone rings with no caller",
    "the power cuts at midnight",
    "the footsteps stop right behind you",
    "the doll is facing the wrong way",
  ],
  travel: [
    "your flight is delayed again",
    "you forget the adapter",
    "the '10 minute walk' is 40",
    "the luggage doesn't make it",
    "the hotel is not what you booked",
    "you're lost and the maps app fails",
    "the buffet on day one vs day five",
    "the layover is 8 hours",
    "the local spots your tourist energy",
    "you board the wrong gate",
  ],
  spicy: [
    "they text 'you up?' at 2am",
    "the eye contact lasts a little too long",
    "they bite their lip while looking at you",
    "the 'friendly' hug lingers",
    "someone says 'show me'",
    "the playlist switches to R&B",
    "they whisper in your ear",
    "the tension is undeniable",
    "they send a risky text",
    "the innocent hangout gets complicated",
  ],
  adult: [
    "they say 'lock the door'",
    "the toys come out",
    "someone says 'choke me'",
    "the bed breaks",
    "the neighbors complain about the noise",
    "you realize you forgot the safe word",
    "the handcuffs get stuck",
    "they say 'I didn't know you were into that'",
    "the walk of shame happens",
    "the 'quickie' wasn't quick",
  ],
};

const ADULT_SITUATIONS = [
  "someone says 'keep it quiet'",
  "the gag reflex is tested",
  "they say 'spit or swallow?'",
  "the post-nut clarity hits",
  "someone asks for round 3",
  "the plug slips out",
  "they say 'put it in the other one'",
  "someone says 'good girl/boy'",
  "you're looking for the wrapper in the dark",
  "someone says 'I swallowed'",
  "you're trying to untangle in the morning",
  "someone says 'we shouldn't do this here'",
];

export function generateInfinitePrompt(category: PromptCategory, allowAdult: boolean): string {
  const tpl = GEN_TEMPLATES[Math.floor(Math.random() * GEN_TEMPLATES.length)];
  const pools: string[][] = [];
  if (category !== "mixed") {
    pools.push(CATEGORY_SITUATIONS[category] ?? GEN_SITUATIONS);
  }
  pools.push(GEN_SITUATIONS);
  const useAdult =
    allowAdult && (category === "spicy" || category === "adult" || Math.random() < 0.15);
  const pool = useAdult ? ADULT_SITUATIONS : pools[Math.floor(Math.random() * pools.length)];
  return tpl(pool[Math.floor(Math.random() * pool.length)]);
}

/**
 * Pick a random prompt for a theme. Never repeats a prompt already in `exclude`
 * (used this room) while fresh options remain, and blends in a ~25% share of
 * community-saved prompts plus ~35% freshly generated ones so the night always
 * feels new.
 */
export function randomPrompt(opts?: {
  category?: PromptCategory;
  allowAdult?: boolean;
  exclude?: string[];
  community?: string[];
}): string {
  const category = opts?.category ?? "mixed";
  const allowAdult = opts?.allowAdult ?? false;
  const exclude = new Set((opts?.exclude ?? []).map((t) => t.trim().toLowerCase()));

  let pool = PROMPTS.filter((p) => (p.adult ? allowAdult : true));
  if (category !== "mixed") {
    const filtered = pool.filter((p) => p.category === category);
    if (filtered.length > 0) pool = filtered;
  }
  const fresh = pool.filter((p) => !exclude.has(p.text.trim().toLowerCase()));
  const candidates = fresh.length >= 5 ? fresh : pool;
  const curated = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)].text : null;

  const community = (opts?.community ?? []).filter((t) => !exclude.has(t.trim().toLowerCase()));

  const generated = generateInfinitePrompt(category, allowAdult);

  const roll = Math.random();
  if (community.length > 0 && roll < 0.25) return community[Math.floor(Math.random() * community.length)];
  if (roll < 0.6) return generated;
  return curated ?? generated;
}

/** Load a community prompt deck for a theme (same category plus general ones). */
export async function loadCommunityPrompts(
  category: PromptCategory,
  allowAdult: boolean,
): Promise<string[]> {
  const supabase = requireSupabase();
  let query = supabase.from("community_prompts").select("prompt");
  if (!allowAdult) query = query.eq("adult", false);
  if (category !== "mixed") {
    query = query.or(`category.eq.${category},category.eq.general`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as { prompt: string }[]).map((r) => r.prompt).filter(Boolean);
}

/**
 * Pick a fresh prompt for a room: excludes every prompt already played this
 * room (tracked in `rounds.prompt`) and blends in community-saved prompts.
 */
export async function randomPromptForRoom(
  code: string,
  opts?: { category?: PromptCategory; allowAdult?: boolean },
): Promise<string> {
  const supabase = requireSupabase();
  const category = opts?.category ?? "mixed";
  const allowAdult = opts?.allowAdult ?? false;

  let used: string[] = [];
  try {
    const { data } = await supabase
      .from("rounds")
      .select("prompt")
      .eq("room_code", code)
      .not("prompt", "is", null);
    used = ((data ?? []) as { prompt: string | null }[]).map((r) => r.prompt ?? "").filter(Boolean);
  } catch {
    // rounds table missing — just proceed without the exclude list
  }

  let community: string[] = [];
  try {
    community = await loadCommunityPrompts(category, allowAdult);
  } catch {
    // community_prompts table missing — fall back to the curated deck only
  }

  return randomPrompt({ category, allowAdult, exclude: used, community });
}

/** Users contribute prompts to the shared deck. Category falls back to general for mixed. */
export async function saveCommunityPrompt(input: {
  prompt: string;
  category: PromptCategory;
  adult: boolean;
  authorName?: string;
}): Promise<void> {
  const supabase = requireSupabase();
  const text = input.prompt.trim();
  if (text.length < 3) throw new Error("That prompt is too short — give it at least 3 characters.");
  if (text.length > 200) throw new Error("Keep prompts under 200 characters.");
  const { error } = await supabase.from("community_prompts").insert({
    prompt: text,
    category: input.category === "mixed" ? "general" : input.category,
    adult: input.adult,
    author_name: input.authorName ?? null,
  });
  if (error) throw error;
}

export function promptForRound(round: number, opts?: { category?: PromptCategory; allowAdult?: boolean }): string {
  const category = opts?.category ?? "mixed";
  const allowAdult = opts?.allowAdult ?? false;
  if (category !== "mixed") return randomPrompt({ category, allowAdult });
  const pool = PROMPTS.filter((p) => (p.adult ? allowAdult : true));
  if (round % 5 === 0) {
    const captions = pool.filter((p) => p.category === "caption");
    if (captions.length > 0) return captions[Math.floor(Math.random() * captions.length)].text;
  }
  return randomPrompt({ category, allowAdult });
}

const TWISTS: Twist[] = [
  { title: "Double Trouble", emoji: "🎲", text: "The winner of this round takes DOUBLE points." },
  { title: "Silent Round", emoji: "🤫", text: "No laughing allowed while the memes drop. First to crack is judged." },
  { title: "Speed Round", emoji: "⚡", text: "You've got 30 seconds to pick. GO GO GO." },
  { title: "Double Pick", emoji: "🃏", text: "Everyone submits TWO memes. The host picks one winner." },
  { title: "Mystery Round", emoji: "🕵️", text: "Submissions are anonymous. Judge the meme, not the friend." },
  { title: "Steal Season", emoji: "😈", text: "The winner steals a point from the player below them on the board." },
  { title: "All or Nothing", emoji: "🎯", text: "Win this round? +3. Lose it? -1. No chill." },
  { title: "Wrong Answer Only", emoji: "🤡", text: "The LEAST fitting meme wins. Yes, you read that right." },
  { title: "Oldest Wins", emoji: "🦖", text: "The winner is crowned by the ROOM, not the host. Everyone votes." },
  { title: "Shuffle Round", emoji: "🔀", text: "The host picks a winner BLINDFOLDED. Good luck." },
  { title: "Golden Round", emoji: "✨", text: "Double points AND the winner picks the next prompt." },
];

export function randomTwist(): Twist {
  return TWISTS[Math.floor(Math.random() * TWISTS.length)];
}
