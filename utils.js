const crypto = require("crypto");

/**
 * Returns TRUE if master strings contains all characters of child string. Otherwise returns FALSE.
 * 
 * @property {string} master
 * @property {string} child
 * @returns {boolean}
 */
exports.isSubset = function(master, child) {
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
};

/**
 * Find a difference between master and child strings
 * Example: apple - ale = pp
 *
 * @param {string} master 
 * @param {string} child
 * @returns {string}
 */
exports.difference = function(master, child) {
    let res = master;
    for (let char of child.split("")) {
        res = res.replace(char, "");
    }
    return res;
};

/**
 * The function looks for the first word that is subset of the diff between "master alphabet" and "phrase"
 *
 * @param {string[]} wordList - a list of words which is used for obtaining words
 * @param {string} alphabet - an alphabet that is a superset of a word and phrase combination
 * @param {string} phrase - phrase that should be used to obtain difference between master and phrase itself
 * @param {number} ignoreIdxTill - ignore all words with indexes that are bellow the specified value
 * @returns {string | undefined}
 */
exports.findNextWord = function(wordList, alphabet, phrase, ignoreIdxTill = -1) {
    // create an array of indexes from the master word list
    // it contains only indexes and is used for reducing memory usage
    let indexes = wordList.map((_, idx) => idx);
    // find a difference between master alphabet and the phrase that is passed to the function
    let diff = exports.difference(alphabet, phrase);
    // ingore all words up to specified index
    return indexes.slice(ignoreIdxTill)
    // find the first word that is subset of "diff" alphabet
        .find((idx) => exports.isSubset(diff, wordList[idx]));
}

/**
 * Create an MD5 hash of a string
 *
 * @param {string} string 
 * @returns {string}
 */
exports.createHash = function(string) {
    return crypto.createHash("md5").update(string).digest('hex');
}

/**
* Get all possible options of orders of the array elements
*
* @param {T[]} array
* @returns {Array<T[]>}
*/
exports.getAllPermutations = function(array) {
   let results = [];

   // if the array has only one element the processing is finished
   if (array.length === 1) {
       results.push([array[0]]);
       return results;
   }

   // otherwise continue processing the array
   for (let i = 0; i < array.length; i++) {
       // take a particular element of an array
       let first = array[i];
       // combine all other elements into a single array
       let left = array.slice(0, i).concat(array.slice(i + 1, array.length));
       // find all permutations for the other elements of the array
       let innerPermutations = exports.getAllPermutations(left);
       // make a resulting array of an every pair of the particular element and all permutations of the left elements
       for (let j = 0; j < innerPermutations.length; j++) {
           results.push([first, ...innerPermutations[j]]);
       }
   }

   // done
   return results;
}
