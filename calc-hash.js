let crypto = require("crypto");

let hashes = ["e4820b45d2277f3844eac66c903e84be", "23170acc097c24edb98fc5488ab033fe", "665e5bcb0c20062fe8abaaf4628bb154"];

/**
 * Create an MD5 hash of a string
 *
 * @param {string} string 
 * @returns {string}
 */
function createHash(string) {
    return crypto.createHash("md5").update(string).digest('hex');
}

/**
 * Get all possible options of orders of the array elements
 *
 * @param {T[]} array
 * @returns {Array<T[]>}
 */
function getAllPermutations(array) {
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
        let innerPermutations = getAllPermutations(left);
        // make a resulting array of an every pair of the particular element and all permutations of the left elements
        for (let j = 0; j < innerPermutations.length; j++) {
            results.push([first, ...innerPermutations[j]]);
        }
    }

    // done
    return results;
}

// wait for messages from parent process
process.on("message", (words) => {
    // make all permutations of the array once message is obtained
    let permutations = getAllPermutations(words);

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
            console.log(`Solution for hash ${hashIdx + 1} is found: ${phrase}`);
        }
    }
});
