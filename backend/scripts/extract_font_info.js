#!/usr/bin/env node

/**
 * @fileoverview Extract pdf font tables into a json.
 *               This json is looked up during runtime
 *               for full font name and full char names
 *
 * @author  himanshu.garg@cse.iitd.ac.in (Himanshu Garg)
 *
 * @usage   node <this script name> <path-to-fonts-dir>
 */

'use strict';

const { spawnSync }  = require('child_process');
const fs             = require('fs');
const path           = require('path');
const xmlparser      = require('xml2js');

const sysFonts       = getSystemFontsInfo();
const fonts_dir      = process.argv[process.argv.length - 1];
const lookupFont     = {};

// read each ttf file of the pdf and create a lookup table
// keyed by the css class name used in html. Fill the values
// using information from system fonts where available and
// from the font file itself where not
try {
  console.log("reading from extract font");
  fs.readdirSync(fonts_dir)
    .filter(file => file.endsWith('.ttf') )
    .forEach( (ttf) => {
      let cssClassName = ttf.slice(0, -4);
      lookupFont[cssClassName] = {};
      ttf = path.join(fonts_dir, ttf);
      let fontName = getFontName(ttf);
      lookupFont[cssClassName]['FontName']  = fontName;
      lookupFont[cssClassName]['CharNames'] = (fontName in sysFonts)
                                            ? sysFonts[fontName]
                                            : getCharNames(ttf);
    });
} catch(err) {
  console.error(err);
}
fs.writeFileSync(path.join(fonts_dir, 'font_info.json'),
                 JSON.stringify(lookupFont, null, 2));

/**
 * return a lookup table of system fonts:-
 */
function getSystemFontsInfo() {
  let lookup = {};
  // we can't just JSON.load "system_font_info.json" as information about 
  // each font was appended to it in a single line json
  try {
    fs.readFileSync(path.join(__dirname, 'system_font_info.json'), 'utf-8')
      .split('\n')
      .filter(l => l.trim().length > 0)
      .forEach( line => {
        let json         = JSON.parse(line);
        let fontName     = Object.keys(json)[0];
        lookup[fontName] = json[fontName]} );
  } catch(err) {
    console.error(err);
  }
  return lookup;
}

/**
 * extract the font name of the specified css class
 */
function getFontName(ttf) {
  // convert ttf2afm and extract font name
  let afm = ttf.slice(0, -3) + 'afm';
  let ttf2afm = spawnSync( 'ttf2afm', [ttf, '-o', afm] );
  console.log(ttf2afm.stdout.toString()); console.error(ttf2afm.stderr.toString());
  let awk = spawnSync( 'awk', ['-f', path.join(__dirname, 'extract_font_name_from_afm.awk'), afm], { encoding : 'utf8' } );
  console.log(awk.stdout.toString()); console.error(awk.stderr.toString());
  return awk.stdout.trim();
}

/**
 * parse ttx file and return char names
 */
function getCharNames(ttf) {
  let ttx = spawnSync('ttx', ['-f', ttf]);
  console.log(ttx.stdout.toString()); console.error(ttx.stderr.toString());

  let xml = fs.readFileSync(ttf.slice(0, -1) + 'x', 'utf-8');
  let cmap = {};
  xmlparser.parseString(xml, (err, result) => {
    let chars  = result['ttFont']['cmap'][0]['cmap_format_4'][0]['map'];
    for (let prop in chars) {
      if (chars.hasOwnProperty(prop)) {
        let key = String.fromCharCode(parseInt(chars[prop]['$']['code']));
        cmap[key] = chars[prop]['$']['name'];
      }
    }
  });
  return cmap;
}
