import { merge } from './module';

const object = {
  'a': [{ 'b': 2 }, { 'd': 4 }]
};
const other = {
  'a': [{ 'c': 3 }, { 'e': 5 }]
};
console.log(merge(object, other));
