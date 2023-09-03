import { Paragraph } from '../ts/paragraph/paragraph';
import Dokument from '../ts/core/dokument';
import { Characteristics } from '../ts/global/characteristics';

const fs = require('fs');

test('simple paragraph test', () => {

  let inputJson = JSON.parse(fs.readFileSync('samples/ncert.nic.in/jemh1/jemh100/output/jemh100.json', 'utf-8'));
  let inputDok = Dokument.fromJson(inputJson);

  Paragraph.match(inputDok, new Characteristics());

  let expectedJson = fs.readFileSync('samples/ncert.nic.in/jemh1/jemh100/expected/jemh100.json', 'utf-8');
  let expectedDok = Dokument.fromJson(JSON.parse(expectedJson));

  // check both have the same number of paragraphs
  expect(inputDok.elements.size).toEqual(expectedDok.elements.size);

  // check individual paragraphs have the same lines 
  for (let [k, v] of inputDok.elements) {
      expect(v.lines.keys()).toEqual(expectedDok.elements.get(k).lines.keys());
  }
})

