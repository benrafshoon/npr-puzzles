import {readFileSync, existsSync, writeFileSync} from 'fs';

export type Trie = {
  isWord?: boolean;
  suffixes: {
    [character: string]: Trie;
  }
}

function makeEmptyTrieNode(): Trie {
  return {suffixes: {}};
}

function addToTrie(word: string, trie: Trie) {
  if (word.length === 0) {
    trie.isWord = true;
    return;
  }
  const character = word[0];
  const remainder = word.substr(1);
  let subTrie: Trie;
  if (!trie.suffixes[character]) {
    subTrie = makeEmptyTrieNode();
    trie.suffixes[character] = subTrie;
  } else {
    subTrie = trie.suffixes[character];
  }
  addToTrie(remainder, subTrie);
}

function getFilename(name: string): string {
  return './' + name + '.json'
} 

export function buildTrie(words: string[]): Trie {
  const trie = makeEmptyTrieNode();
  words.forEach((word, index) => {
    addToTrie(word.toLowerCase(), trie);
  });
  return trie;
}