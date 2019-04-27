import {readFileSync} from 'fs';
import parse from 'csv-parse/lib/sync'
import {readDictionary} from './dictionary'
import pluralize from 'pluralize';
import {Trie, buildTrie} from './trie';
import {get} from './cache';

const bookFile = readFileSync('goodbooks-10k/books.csv', {encoding: 'utf8'});
const data: Array<{[columnName: string]: string}> = parse(bookFile, {
  columns: true,
  skip_empty_lines: true,
});

const nonWordsAndSpaces = /[\W]/g;
const nonWords = /[^\w ]/g;
const titles = data
  .map(datum => datum['original_title']);
const titlesOf13 = titles.filter(title => title.replace(nonWordsAndSpaces, '').length === 13);

const dictionary = readDictionary();

function isWord(potentialWord: string, wordTrie: Trie) {
  function isWordInternal(potentialWord: string, wordTrie: Trie): boolean {
    if (potentialWord.length === 0) {
      return !!wordTrie.isWord;
    }
    const character = potentialWord[0];
    if (!wordTrie.suffixes[character]) {
      return false;
    }
    const remainder = potentialWord.substr(1);
    return isWordInternal(remainder, wordTrie.suffixes[character]);
  }
  return isWordInternal(potentialWord.toLowerCase(), wordTrie);
}

interface WordPair {
  leftWord: string;
  rightWords: string[];
}

function findWordPairs(word: string, rootTrie: Trie): Array<[string, string]> {
  function remove<T>(array: Array<T>, index: number): Array<T> {
    return [...array.slice(0, index), ...array.slice(index + 1)]
  }

  function buildWord(prefix: string, letters: string[], wordTrie: Trie, foundWords: string[]) {
    if (letters.length === 0) {
      if (wordTrie.isWord) {
        foundWords.push(prefix);
      }
      return;
    } 

    let previousLetter = '';
    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];
      if (letter === previousLetter) {
        continue;
      }
      const remainingLetters = remove(letters, i)
      if (wordTrie.suffixes[letter]) {
        buildWord(prefix + letter, remainingLetters, wordTrie.suffixes[letter], foundWords);
      } 
      previousLetter = letter;
    }
  }

  function buildWordPairs(prefix: string, letters: string[], wordTrie: Trie, foundWordPairs: WordPair[]) {
    if (wordTrie.isWord) {
      const leftWord = prefix;
      const rightWords: string[] = [];
      buildWord('', letters, rootTrie, rightWords);
      if (rightWords.length > 0) {
        foundWordPairs.push({leftWord, rightWords});
      }
    }

    if (letters.length <= 1) {
      return;
    }

    let previousLetter = '';
    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];
      if (letter === previousLetter) {
        continue;
      }
      const remainingLetters = remove(letters, i)
      if (wordTrie.suffixes[letter]) {
        buildWordPairs(prefix + letter, remainingLetters, wordTrie.suffixes[letter], foundWordPairs);
      } 
      previousLetter = letter;
    }
  }

  const letters = word.toLowerCase().split('').sort();
  const wordPairs: WordPair[] = [];
  buildWordPairs('', letters, rootTrie, wordPairs);

  return wordPairs.reduce((allWordPairs, wordPair) => ([
      ...allWordPairs,
      ...wordPair.rightWords.map(rightWord => [wordPair.leftWord, rightWord].sort() as [string, string])
    ]), [] as Array<[string, string]>)
    .sort(sortPair);
}

function sortPair(left: [string, string], right: [string, string]): number {
  if (left[0] === right[0]) {
    return left[1] < right[1] ? -1 : 1;
  } else {
    return left[0] < right[0] ? -1 : 1;
  }
}


const webstersDictionary = readFileSync('websterdictionary.txt', {encoding: 'utf8'});
const dictionaryLines = webstersDictionary.split('\r\n');
interface DictionaryEntry {
  word: string,
  definition: string,
}

const lastLineRegex = /^End of Project/;
const dictionaryEntries: DictionaryEntry[] = [];
let lastWordLine = 0;
for(let lineNumber = 0; lineNumber < dictionaryLines.length; lineNumber++) {
  const line = dictionaryLines[lineNumber];
  if (line.match(lastLineRegex) || line.length > 0 && line.match(/^[A-Z]/) !== null && line.toUpperCase() === line) {
    if (lastWordLine) {
      dictionaryEntries.push({
        word: dictionaryLines[lastWordLine],
        definition: dictionaryLines.slice(lastWordLine, lineNumber).join('\n'),
      });
    }
    lastWordLine = lineNumber;
    if (line.match(lastLineRegex)) {
      break;
    }
  }
}
//const dictionaryJson = JSON.parse(webstersDictionary) as {[word: string]: string};

const femaleLikeWords = [
  'woman',
  'women',
  'girl',
  'lady',
  'ladies',
  'female',
  'femin',
  'wife',
  'whore',
  'prostitute',
  'slut',
  'womb',
  'daughter',
  'sister',
];
const femaleLikeRegex = new RegExp(femaleLikeWords.join('|'), 'i');
const femaleEntries = dictionaryEntries
  .filter(entry => entry.definition.match(femaleLikeRegex) !== null)

function makeDictionary(entries: DictionaryEntry[]): string[] {
  return entries
    .map(entry => entry.word.toLowerCase().replace(nonWordsAndSpaces, ''))
    .filter(word => word.length <= 12)
    .reduce((allWords, word, index) => {
      if ((index + 1) % 1000 === 0) {
        console.error('Pluralizing word ' + (index + 1));
      }
      return [...allWords, word, pluralize(word)];
    }, [] as string[]);
}
const allWordsTrie = get('all_words', () => buildTrie(makeDictionary(dictionaryEntries)));

const titlesWithWordPairs = get('titles_with_word_pairs', () => titlesOf13.map((title, index) => {
  console.error(index + ' of ' + titlesOf13.length +  ": " + title);
  return {
    title,
    wordPairs: findWordPairs(title.replace(nonWordsAndSpaces, ''), allWordsTrie),
  };
}).filter(result => result.wordPairs.length > 0));

//const femaleWordsTrie = get('female_words', () => buildTrie(makeDictionary(femaleEntries)));
const femaleWordsTrie = buildTrie(makeDictionary(femaleEntries));
function hasFemaleWord(pair: [string, string]): boolean {
  return pair.some(word => isWord(word, femaleWordsTrie));
}

const titlesWithFemaleWords = titlesWithWordPairs
  .map(({title, wordPairs}) => ({
    title,
    wordPairs: wordPairs.filter(hasFemaleWord).map(([first, second]): [string, string] => isWord(first, femaleWordsTrie)
      ? [first, second] 
      : [second, first])
      .sort(sortPair),
  }))
  .filter(({title, wordPairs}) => wordPairs.length > 0);

titlesWithFemaleWords.forEach(({title, wordPairs}) => {
  console.log(title);
  wordPairs.forEach(wordPair => console.log('  ' + wordPair));
});
