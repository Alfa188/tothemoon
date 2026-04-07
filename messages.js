// Pool of natural-sounding message sequences.
// Each entry is an array of messages the bot sends in order.
// The last message in each sequence contains the promo mention.

const promoMessages = [
  "everyone here is male lol.. omefree.com has way more girls just saying",
  "omefree.com > this 😭",
  "this site is so dead i switched to omefree.com tbh",
  "ngl omefree.com killed this.. way more real ppl",
  "if ur bored here just go omefree.com actually worth it",
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
