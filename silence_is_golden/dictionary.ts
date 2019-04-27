import {readFileSync} from 'fs';
import {strict as assert} from 'assert';

export function readDictionary() {
  const dictionaryFile = readFileSync('/usr/share/dict/words', {encoding: 'utf8'});
  const dictionaryWords = dictionaryFile.split('\n');
  return dictionaryWords.slice(0, dictionaryWords.length - 1);
}