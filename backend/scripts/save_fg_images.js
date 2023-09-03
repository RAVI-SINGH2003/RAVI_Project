#!/usr/bin/env node

/**
 * @fileoverview save canvases as image1.png, image2.png etc
 *
 * @author  himanshu.garg@cse.iitd.ac.in (Himanshu Garg)
 *
 * @usage   node save_fg_images.js <url> [<url> ... <url>]
 *
 *
 */

'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const flags = {'debug': false};
const urls = [];
const loglevel = 'info';

for (let arg of process.argv.slice(2)) {
  if (arg.match(/^-+/)) {
    flags[arg.replace(/^-+/, '')] = true;
  } else {
    urls.push(arg);
  }
}

// Options:
//
// noheadless: show page
// nojsonf: don't output jsonf files
// nojson: don't serialize page json

//const columnSize = process.argv[4];

if (process.argv.length < 3) {
  console.log(process.argv[1] + ' <url>\n');
} else {
  (async () => {
    const browser = await puppeteer.launch({ headless: !flags.noheadless,
                                             args: ['--no-sandbox',
                                                    '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text())); // log console events

    let promise = urls.reduce((pr, url) => {
      let promise = pr.then(() => page.goto(url, {'waitUntil' : 'networkidle0'}));
      promise = promise.then(() => page.evaluate((flags, url) => {
        let doc = new pdf2charinfo.dokument();
	return doc.promise.then(() => {
	  let canvases = document.getElementsByTagName('canvas');
	  let dataUrls = [];
	  for (canvas of canvases) {
	    dataUrls.push(canvas.toDataURL());
	  }
	  return dataUrls;
	});
      }, flags, url), () => console.error('Illegal page ' + url));
      // save the page's html
      promise.then((data) => {
	for (let i = 0; i < data.length; i++) {
	  const img = Buffer.from(data[i].split(',').pop(), 'base64');
	  console.log('writing image ' + i);
          fs.writeFile(('fg' +  i + '.png'), img, err => {
	    if (err) {
	      console.error(err);
	      return
	    }
	  });
	}
      });
      return promise;
    }, Promise.resolve());
    // TODO: Fix after jsonf output uses a promise!
    promise.then(() => {setTimeout(() => {browser.close()}, 5000);});
  })();
}
