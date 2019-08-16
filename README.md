# Hashes Challenge

It is a Node.js-based solution of looking for hash for this challenge https://followthewhiterabbit.trustpilot.com/cs/step3.html

## Performance

In order to improve performance, the application has one node.js process per CPU's core plus one master process. Every child process is responsible for looking for unique set of words out of the wordlist that match the initial phrase. Master process rules child processes and makes calculation of hashes once unique word combination is found by any of children.
