import {readFileSync} from 'fs';
import {strict as assert} from 'assert';

const MINIMUM_WORD_SIZE = 2;

assert(MINIMUM_WORD_SIZE >= 2);
const dictionaryFile = readFileSync('/usr/share/dict/words', {encoding: 'utf8'});
const words = new Set(dictionaryFile.split('\n').filter(word => word.length >= MINIMUM_WORD_SIZE));
const validWordsPairs = [...words]
  .map((word): [string, string] => [word, suffixWord(word)])
  .filter(([_, suffixWord]) => words.has(suffixWord));
printResults(validWordsPairs);

function suffixWord(prefixWord: string): string {
  const lastLetter = prefixWord.charAt(prefixWord.length - 1);
  const firstPart = prefixWord.substring(0, prefixWord.length - 1);
  return lastLetter + firstPart;
}

function range(size: number): Array<number> {
  return Array.from(Array(size).keys());
}

function padLeft(word: string, totalLength: number): string {
  assert(word.length <= totalLength);
  const paddedWord = range(totalLength - word.length).reduce((padding, _) => ' ' + padding, '') + word;
  assert(paddedWord.length === totalLength);
  return paddedWord;
}

function printResults(wordPairs: Array<[string, string]>): void {
  const longestWordLength = validWordsPairs
    .map(([prefixWord, suffixWord]) => prefixWord)
    .reduce((currentMax, word) => word.length > currentMax ? word.length : currentMax, 0);
  assert(longestWordLength > 2);
  validWordsPairs.forEach(([prefixWord, suffixWord]) => {
    console.log(padLeft(prefixWord, longestWordLength) + ' table | table ' + suffixWord);
  });
}