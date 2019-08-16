let fs = require("fs");
let childProcess = require("child_process");
let os = require("os");

const { isSubset, getAllPermutations, createHash } = require("./utils");

// entry phrase that is an anogram of the resulting phrase
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

let hashes = ["e4820b45d2277f3844eac66c903e84be", "23170acc097c24edb98fc5488ab033fe", "665e5bcb0c20062fe8abaaf4628bb154"];
let solutionsLeft = hashes.length;

class SearchFilter {
  constructor(minLength, maxLength, maxIdx) {
    this.maxLength = maxLength;
    this.maxIdx = maxIdx;
    this.length = minLength;
    this.idx = 0;
    this.loops = 0;
  }

  next() {
    if (this.length > this.maxLength) {
      return null;
    }

    let result = {
      idx: this.idx++,
      length: this.length
    };

    if (this.idx > this.maxIdx) {
      this.length += 1;
      this.idx = 0;
    }

    return result;
  }
}

function main() {
  let searchStarts = Date.now();

  let childProcesses = [];

  for (let i = 0; i < os.cpus().length; i++) {
    childProcesses.push(childProcess.fork(__dirname + "/find-set.js"));
  }

  let minWords = 2;
  let maxWords = 6;

  let searchFilter = new SearchFilter(minWords, maxWords, library.length - 1);

  childProcesses.forEach((fork) => {
    let goNext = () => {
      let next = searchFilter.next();

      if (!next) {
        fork.disconnect();
        childProcesses = childProcesses.filter((child) => child !== fork);
        return;
      }

      fork.send({ type: "find", payload: { length: next.length, idx: next.idx} });
    };

    fork.on("message", ({ type, payload }) => {
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
            solutionsLeft -= 1;
            console.log(`Solution for hash ${hashIdx + 1} is found: ${phrase}`);

            if (solutionsLeft === 0) {
              console.log(`All solutions are found after ${Date.now() - searchStarts}ms`);
              process.exit(0);
            }
          }
        }
      } else if (type === "complete") {
        goNext();
      }
    });
  
    fork.send({ type: "register", payload: { library, alphabet } });
    goNext();
  });
}

main();
