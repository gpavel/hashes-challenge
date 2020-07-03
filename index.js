let fs = require("fs");
let childProcess = require("child_process");
let os = require("os");

const { isSubset, getAllPermutations, createHash } = require("./utils");

// entry phrase that is an anagram of the resulting phrase
let initialPhrase = "poultry outwits ants";

// prepare an alphabet that will be used for searching
let alphabet = initialPhrase.replace(/\s+/g, "");

// read wordlist file and create an array where each element is a word
let library = fs.readFileSync(__dirname + "/wordlist", "utf8").split("\n");
// ignore all letters except "a" and "i" as they are the only single-letter words in English
library = library.filter((word) => word.length > 1).concat(["a", "i"]);
// exclude all words that definitely cannot be used for searching for unique sets of words
library = library.filter((word) => isSubset(alphabet, word));
// exclude all duplications from words list
library = Array.from(new Set(library));

let hashes = [
  "e4820b45d2277f3844eac66c903e84be",
  "23170acc097c24edb98fc5488ab033fe",
  "665e5bcb0c20062fe8abaaf4628bb154",
];
let solutionsLeft = hashes.length;

class TimeLogger {
  constructor(interval = 10 * 1000) {
    this.interval = interval;
  }

  phrase() {
    let phrases = [
      "Please wait a few more seconds...",
      "I am still alive",
      "I'm doing my best, please wait",
      "It's hot! Have you seen your CPU usage?",
      "I know you're in a hurry, but what can I do?",
      "Searching...",
      "No, I am not hanging. It is just a bit time consuming...",
    ];

    let phraseIdx = Math.round(Math.random() * (phrases.length - 1));
    return phrases[phraseIdx];
  }

  start() {
    if (this.timerId) {
      this.kill();
    }

    this.startedAt = Date.now();
    this.timerId = setInterval(() => {
      console.log(`${this.timeDiffReadable()}: ${this.phrase()}`);
    }, this.interval);
  }

  kill() {
    console.log(`${this.timeDiffReadable()}: Hooray!`);
    clearInterval(this.timerId);
    this.timerId = undefined;
    this.startedAt = undefined;
  }

  timeDiff() {
    return Date.now() - this.startedAt;
  }

  timeDiffReadable() {
    let seconds = Math.round(this.timeDiff() / 1000);
    return `${seconds}s`;
  }
}

class SearchFilter {
  constructor(minLength, maxLength, maxIdx) {
    // max length of the phrase
    this.maxLength = maxLength;
    // max possible value for index (amount of words in wordlist)
    this.maxIdx = maxIdx;
    // min length of the phrase
    this.length = minLength;
    // starting point for the index
    this.idx = 0;
  }

  next() {
    // return null if the filter exceeds its limits
    if (this.length > this.maxLength) {
      return null;
    }

    // create a filter
    let result = {
      idx: this.idx++,
      length: this.length,
    };

    // check if idx exceeds maxIdx
    // if true then reset idx and add increment the length
    if (this.idx > this.maxIdx) {
      this.length += 1;
      this.idx = 0;
    }

    return result;
  }
}

function main() {
  // create a time logger to notify a user the application is working fine
  let timeLogger = new TimeLogger();
  timeLogger.start();
  process.on("exit", () => timeLogger.kill());

  // create an array of child processes
  // each array is responsible for looking for unique set of words that match the initial phrase
  let childProcesses = [];
  for (let i = 0; i < os.cpus().length; i++) {
    let fork = childProcess.fork(__dirname + "/find-set.js");
    childProcesses.push(fork);
  }

  // look for unique sets that contain from min to max words
  let minWords = 2;
  let maxWords = 6;

  // create a search filter that is used by all children
  let searchFilter = new SearchFilter(minWords, maxWords, library.length - 1);

  // run for each child
  childProcesses.forEach((fork) => {
    let goNext = () => {
      // get next search filter for the fork
      let next = searchFilter.next();

      // if the filter is exceed its limits then destroy the fork
      if (!next) {
        fork.disconnect();
        // revoke the fork from the array of forks
        childProcesses = childProcesses.filter((child) => child !== fork);
        return;
      }

      // send next search filter to the child process
      fork.send({
        type: "find",
        payload: { length: next.length, idx: next.idx },
      });
    };

    // listen to messages from the fork
    fork.on("message", ({ type, payload }) => {
      // match is found
      if (type === "match") {
        // make all permutations of the array once message is obtained
        let permutations = getAllPermutations(payload);

        // process every permutation
        for (let permutation of permutations) {
          // combine array into a string
          let phrase = permutation.join(" ");
          // calculate a hash of the string
          let hash = createHash(phrase);
          // check is hash matches one of the hashes
          let hashIdx = hashes.indexOf(hash);
          // display the hash number into console if it is found
          if (hashIdx > -1) {
            // count how many hashes are left
            solutionsLeft -= 1;
            console.log(`${timeLogger.timeDiffReadable()}: solution for hash ${hashIdx + 1} has been found: ${phrase} = ${hash}`);

            // if all hashes all decrypted then stop the application
            if (solutionsLeft === 0) {
              console.log(`${timeLogger.timeDiffReadable()}: all solutions have been found`);
              process.exit(0);
            }
          }
        }
      } else if (type === "complete") {
        // the fork completed processing its search filter
        // so get new search filter and continue searching for the unique word sets
        goNext();
      }
    });

    // send a library and an alphabet to the child
    fork.send({ type: "register", payload: { library, alphabet } });
    // launch first loop of the search
    goNext();
  });
}

main();
