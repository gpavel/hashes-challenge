const { difference, findNextWord } = require("./utils");

/**
 * @param {string[]} library 
 * @param {string} alphabet 
 * @param {{ minLength?: number, maxLength?: number, minIdx?: number, maxIdx?: number }} options
 */
function* getUniqueSets(library, alphabet, options = {}) {
  let minLength = options.minLength || 0;
  let maxLength = options.maxLength || Number.POSITIVE_INFINITY;
  let minIdx = options.minIdx || 0;
  let maxIdx = options.maxIdx || Number.POSITIVE_INFINITY;

  // start looking for unique sets with the first word of the wordlist that matches minIdx filter
  let stack = [minIdx];
  // the flag indicates if code shouldn't go deep after stack.push() operation of previous cycle
  let ignoreChildren = false;

  // process the stack while it is not empty
  while (stack.length) {
    // create a phrase (array of word) out of the words that is currently in stack
    let phrase = stack.map(idx => library[idx]);
    // create a string out of phrase
    let phraseStr = phrase.join("");
    // find a difference between the phrase and master alphabet
    let diff = difference(alphabet, phraseStr);
    // take the word's index of the latest element in stack
    let currentIdx = stack[stack.length - 1];
    // if diff has no chars left and resulting phrase is within the suitable range
    if (diff.length === 0 && phrase.length >= minLength && phrase.length <= maxLength) {
      // return this phrase to the user
      yield phrase;
      // if diff is not empty and phrase can be extended more and also algorithm is allowed to go deep
    } else if (!ignoreChildren && phrase.length + 1 <= maxLength) {
      // find next word that can be added to the phrase
      let nextChildIdx = findNextWord(library, alphabet, phraseStr, currentIdx);
      // if such word is found
      if (nextChildIdx !== undefined) {
        // put this word's index to the stack
        stack.push(nextChildIdx);
        // once child is added algorithm is allowed to go deeper
        ignoreChildren = false;
        // go to next cycle
        continue;
      }
    }

    // the current phrase doesn't match the requirements
    // so remove latest word of the phrase
    phrase.pop();
    // and remove its index of the stack
    stack.pop();
    // try to find word for the same level
    let nextIdx = findNextWord(library, alphabet, phrase.join(""), currentIdx + 1);
    // if such word is found
    if (nextIdx !== undefined && (stack.length > 0 || nextIdx <= minIdx && nextIdx >= maxIdx)) {
      // add its index to a stack
      stack.push(nextIdx);
      // algorithm should not ignore if the next word of the same level is added
      ignoreChildren = false;
    } else {
      // otherwise cycle should go up 1 level and ignore adding chilren
      ignoreChildren = true;
    }
  }
}

let alphabet;
let library;

process.on("message", (message) => {
  if (message.type === "register") {
    alphabet = message.payload.alphabet;
    library = message.payload.library;
    return;
  } else if (message.type === "find") {
    let idx = message.payload.idx;
    let length = message.payload.length;

    let uniqueSetsGen = getUniqueSets(library, alphabet, { minLength: length, maxLength: length, minIdx: idx, maxIdx: idx });

    let next = uniqueSetsGen.next();
    let uniqueSetsFound = 0;

    // process until the function finds all possible words sets
    while (!next.done) {
        uniqueSetsFound += 1;
        // once combination is found, send it to child process that calculates hashes
        // for all possible permutations of the set
        process.send({ type: "match", payload: next.value });
        // continue looking for unique sets
        next = uniqueSetsGen.next();
    }

    // notify the master process that all sets are found for the specific search filter
    process.send({ type: "complete", payload: uniqueSetsFound });
    return;
  }
});
