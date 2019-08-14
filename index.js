let fs = require("fs");
let childProcess = require("child_process");

// entry phrase that is an anogram of the resulting phrase
let phrase = "poultry outwits ants";
// launch child process that is responsible for searching for hashes out of unique set of words
let calcHashProcess = childProcess.fork(__dirname + "/calc-hash.js");

// prepare an alphabet that will be used for searching
let masterAlphabet = phrase.replace(/\s+/g, "");

// read wordlist file and create an array where each element is a word
let masterWordsList = fs.readFileSync(__dirname + "/wordlist", "utf8").split("\n");
// ignore all letters except "a" and "i" as they are the only single-letter words in English
masterWordsList = masterWordsList.filter((word) => word.length > 1).concat(["a", "i"]);
// exclude all words that definitely cannot be used for searching for unique sets of words
masterWordsList = masterWordsList.filter((word) => isSubset(masterAlphabet, word));
// exclude all duplications from words list
masterWordsList = Array.from(new Set(masterWordsList));

/**
 * Returns TRUE if master strings contains all characters of child string. Otherwise returns FALSE.
 * 
 * @property {string} master
 * @property {string} child
 * @returns {boolean}
 */
function isSubset(master, child) {
    let nextMaster = master;
    // get a character from a child string
    for (let char of child.split("")) {
        // remove this character from master string
        let diff = nextMaster.replace(char, "");
        // check that character was removed successfully
        if (nextMaster.length > diff.length) {
            nextMaster = diff;
        } else {
            return false;
        }
    }

    // code reaches this point if all child characters are successfully removed from master string
    return true;
}

/**
 * Find a difference between master and child strings
 * Example: apple - ale = pp
 *
 * @param {string} master 
 * @param {string} child
 * @returns {string}
 */
function difference(master, child) {
    let res = master;
    for (let char of child.split("")) {
        res = res.replace(char, "");
    }
    return res;
}

// create an array of indexes from the master word list
// it contains only indexes and is used for reducing memory usage
let indexes = masterWordsList.map((_, idx) => idx);

/**
 * The function looks for the first word that is subset of the diff between "master alphabet" and "phrase"
 *
 * @param {string} phrase - phrase that should be used to obtain difference between master and phrase itself
 * @param {number} ignoreIdxTill - ignore all words with indexes that are bellow the specified value
 * @returns {string | undefined}
 */
function findNextWord(phrase, ignoreIdxTill = -1) {
    // find a difference between master alphabet and the phrase that is passed to the function
    let diff = difference(masterAlphabet, phrase);
    // ingore all words up to specified index
    return indexes.slice(ignoreIdxTill)
    // find the first word that is subset of "diff" alphabet
        .find((idx) => isSubset(diff, masterWordsList[idx]));
}

// the function 
function* getUniqueSets(minLength = 0, maxLength = Number.POSITIVE_INFINITY) {
    // start looking for unique sets with the first word of the wordlist
    let stack = [0];
    // the flag indicates if code shouldn't go deep after stack.push() operation of previous cycle
    let ignoreChildren = false;

    // process the stack while it is not empty
    while (stack.length) {
        // create a phrase (array of word) out of the words that is currently in stack
        let phrase = stack.map(idx => masterWordsList[idx]);
        // create a string out of phrase
        let phraseStr = phrase.join("");
        // find a difference between the phrase and master alphabet
        let diff = difference(masterAlphabet, phraseStr);
        // take the word's index of the latest element in stack
        let currentIdx = stack[stack.length - 1];
        // if diff has no chars left and resulting phrase is within the suitable range
        if (diff.length === 0 && phrase.length >= minLength && phrase.length <= maxLength) {
            // return this phrase to the user
            yield phrase;
            // if diff is not empty and phrase can be extended more and also algorithm is allowed to go deep
        } else if (!ignoreChildren && phrase.length + 1 <= maxLength) {
            // find next word that can be added to the phrase
            let nextChildIdx = findNextWord(phraseStr, currentIdx);
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
        let nextIdx = findNextWord(phrase.join(""), currentIdx + 1);
        // if such word is found
        if (nextIdx !== undefined) {
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

function main() {
    let searchStarts = Date.now();

    // try to find hashes out of unique word phrases from 2 to 5 words length
    let matchesGen = getUniqueSets(2, 6);
    let next = matchesGen.next();
    let uniqueSetsFound = 0;

    // process until the function finds all possible words sets
    while (!next.done) {
        uniqueSetsFound += 1;
        // once combination is found, send it to child process that calculates hashes
        // for all possible permutations of the set
        calcHashProcess.send(next.value);
        // continue looking for unique sets
        next = matchesGen.next();
    }

    let searchEnds = Date.now();

    console.log(`Words search ends in ${searchEnds - searchStarts}ms. ${uniqueSetsFound} possible sets found.`);

    // once all combinations are found disconnect the child process
    calcHashProcess.disconnect();
}

main();
