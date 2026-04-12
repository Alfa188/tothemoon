// Pool of natural-sounding message sequences.
// Each entry is an array of messages the bot sends in order.
// The last message in each sequence contains the promo mention.

const promoMessages = [
  "everyone here is male lol.. omefree.com has way more girls just saying",
  "omefree.com > this 😭",
  "ngl omefree.com is way better for actually meeting people",
  "this site is dead rn.. omefree.com is where everyone moved to",
  "omefree.com actually has girls on it, way better if u wanna meet new people",
  "if u tryna vibe and make friends omefree.com is way better ngl 🙏",
  "if u want real convos not just creeps try omefree.com",
  "omefree.com is way less weird if u just wanna chat and meet ppl",
];

function getRandomPromo() {
  return promoMessages[Math.floor(Math.random() * promoMessages.length)];
}

const greetings = [
  "sup",
  "hi",
  "hey",
  "heyyy",
  "hii",
  "yo",
  "f",
  "F",
  "hey :)",
  "hi :)",
];

function getRandomGreeting() {
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function getRandomSequence() {
  return [getRandomGreeting(), getRandomPromo()];
}

module.exports = { getRandomSequence };
