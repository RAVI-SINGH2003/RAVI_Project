#!/usr/bin/env -S node -r esm
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const fs = require('fs');

math_json_path =
  '/home/sanjeev/projects/mtp-1/pdf2charinfo/uploads/dummy_maths_equtions.pdf/dummy_maths_equtions.txt';
const math_json = fs.readFileSync(math_json_path);

console.log('Reading done!' + math_json);

json = JSON.parse(math_json);
console.log(typeof json);

for (const page in json) {
  console.log(page);
}
