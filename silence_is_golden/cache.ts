import {readFileSync, existsSync, writeFileSync} from 'fs';

function getFilename(name: string): string {
  return './' + name + '.json'
} 

export function get<T>(name: string, getter: () => T): T {
  const filename = getFilename(name);
  if (existsSync(filename)) {
    console.error('Reading ' + name + ' from cached file');
    return JSON.parse(readFileSync(filename, {encoding: 'utf8'})) as T;
  } else {
    console.error('Getting ' + name);
    const value = getter();
    writeFileSync(filename, JSON.stringify(value));
    return value;
  }
}