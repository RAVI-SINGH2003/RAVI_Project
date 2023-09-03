#!/usr/bin/env -S node -r esm
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

/**
 * @fileoverview do page analysis using puppeteer
 *
 * @author  himanshu.garg@cse.iitd.ac.in (Himanshu Garg)
 *
 * @depends puppeteer - https://github.com/GoogleChrome/puppeteer
 *
 * @usage   node run_puppeteer.js <url> [<url> ... <url>]
 *
 * @debug-usage
 * env DEBUG="puppeteer:*" env DEBUG_COLORS=true node run_puppeteer.js
 * <url> 2>&1 | grep -v '"Network'
 *
 */

'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const flags = { debug: false };
const urls = [];
let math_json_path = '';
let image_json_path = '';

// This is to be used when running only through run_puppeteer
//const characteristicJsonFilePath =  process.argv[3];
console.log(
  'console.log(process.argv.slice(2)) -------------->>>>  ' +
    process.argv.slice(2)
);
for (const arg of process.argv.slice(2)) {
  console.log('argggggggggggg --------->>>>> ' + arg);
  if (arg.match(/^-+/)) {
    flags[arg.replace(/^-+/, '')] = true;
  } else {
    if (!arg.includes('.json') && !arg.includes('.txt')) urls.push(arg);
    //txt file contains the response received from layout parser
    if (arg.includes('_img.txt')) {
      image_json_path = arg;
      console.log('image_JSON_PATH: ', image_json_path);
    }
    //txt file contains the response received from the docker server
    else if (arg.includes('.txt')) {
      math_json_path = arg;
      console.log('math_JSON_PATH: ', math_json_path);
    }
  }
}

/**
 * This will read the layout parser response saved in the file syncronously
 */
const math_json = fs.readFileSync(math_json_path).toString();

const image_json = fs.readFileSync(image_json_path).toString();

// Options:
// noheadless: show page
// nojsonf: don't output jsonf files
// nojson: don't serialize page json

if (process.argv.length < 3) {
  console.log(process.argv[1] + ' <url>\n');
} else {
  (async () => {
    const browser = await puppeteer.launch({
      headless: !flags.noheadless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text())); // log console events

    const promise = urls.reduce((pr, url) => {
      let promise = pr.then(() =>
        page.goto(url, { waitUntil: 'networkidle0' })
      );

      promise = promise.then(
        () =>
          page.evaluate(
            async (flags, url, math_json, image_json) => {
              function toServer(content) {
                // use the fetch api so we can wait for it to finish
                const baseURL = document.URL.replace(/html$/, 'json');
                console.log('Fetch ' + baseURL);
                return fetch(baseURL, {
                  method: 'POST',
                  cache: 'no-cache',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(content) // body data type must match "Content-Type" header
                });
              }
              characteristicJsonFilePath = url.replace(
                '.html',
                '_characteristics.json'
              );
              console.log(
                'URL for characteristics: ',
                characteristicJsonFilePath
              );

              // Page analysis code goes here

              let characteristicsObj = new pdf2charinfo.characteristics();
              const request = new Request(characteristicJsonFilePath);
              const req = fetch(request);
              data = await req
                .then((response) => {
                  if (!response.ok) {
                    throw new Error('No file');
                  }
                  return response.json();
                })
                .then((json) => {
                  console.log('JSON: ', json);
                  characteristicsObj = json;
                })
                .catch((err) => {
                  console.log('Error Line 125 run_puppeteer: ' + err);
                });

              //const baseURL = document.URL.replace(/html$/, 'json');

              /*
               * Create workflow and
               * Assign radio button information to flag setting object
               */

              /*     const workflow = new pdf2charinfo.workflow();
              workflow.setflagSettingObj(characteristicsObj); */
              //console.log('workflow obj created');
              //await workflow.preProcessing(url, flags, baseURL)
              /* .then(() => {
                  console.log('saving data to server 1st time');
                  if (flags.nojson && flags.nojsonf) return;
                  return toServer(());
                }) */
              /* .then(() => {
                  workflow.controlFlow(url, flags, baseURL);
                }); */
              /* .then(() => {
                  console.log('saving data to server 2nd time');
                  if (flags.nojson && flags.nojsonf) return;
                  return toServer(doc.json());
                }) */
              const doc = new pdf2charinfo.dokument.fromHtml();
              //const lines = [];
              return (
                doc.promise
                  // .then(() => doc.backgroundAnalysis())
                  /**
                   * json: Function helps to get json information which includes font info
                   * @returns Pages along with their JSON information
                   */
                  // .then(() => doc.json())
                  .then(() => doc.columnDetection(characteristicsObj))
                  /**
                   * Function returns lines after analysing spans
                   * @returns Promise returns text lines in the Line data structure
                   */
                  .then(() => doc.linify())
                  /**
                   * This is document level function which calculates all the characteristics
                   * for the document related to fonts, line height, most common characteristics
                   * within the document.
                   */
                  .then(() => doc.analyseCharacteristics())
                  // .then(() => doc.captionDetection())
                  /**
                   * This function helps to display both foreground and background together
                   * @returns Pages' content
                   */
                  .then(() => doc.showPage())
                  /**
                   * draw_object_box: function page is cropped to get the Complete images of the
                   * captions for placement in the final html
                   * @returns promise once all boxes are drawn around captions
                   */
                  .then(() => doc.draw_object_box())
                  .then(() => doc.tableDetection())
                  /**
                   * match: Check the next unmatched line(s) to see if a Heading, ListItem,
                   * or Paragraph in that order using the corresponding match fun
                   * remove all lines included inside image as line glyphs
                   */
                  .then(() => doc.match())
                  .then(() => doc.mathDetection(math_json))
                  .then(() => doc.imageInsertion(image_json))

                  .then(() => {
                    if (flags.nojson && flags.nojsonf) return;
                    return toServer(doc.json());
                  })
                  .then(() => doc.cleanDocument())
                  .then(() => doc.toHtml())
                  .catch((err) => {
                    console.log('Error Line 203 run_puppeteer: ' + err);
                  })
              )
              // .then(() => doc.ImagestoHtml());
            },
            flags,
            url,
            math_json,
            image_json
          ),
        () => console.error('Illegal page ' + url)
      );
      // save the page's html
      const orl = url.replace(/\.html$/, '.out.html');
      const ofpath =
        __dirname +
        // orl.replace(/${backendBaseUrl}?.(pdf2charinfo.)?/, '/../');output link --> scriptshttp://127.0.0.1:8000/uploads/Denish_11/file_name
        // orl.replace(/http?:..127.0.0.1(:\d+)?.(pdf2charinfo.)?/, '/../');

        // originally used below but hardcoded!!
        orl.replace(/http?:..127.0.0.1(:\d+)?.(pdf2charinfo.)?/, '/../');
      // orl.replace(http?:..//127\.0\.0\.1:8000, '/../');
      promise
        .then(() => page.content())
        .then((html) => {
          console.log('PATH', ofpath);
          console.log(`Writing output to ${ofpath}`);
          fs.promises.writeFile(ofpath, html);
        }).catch((err) => {
          console.log('Error Line 234 run_puppeter: ' + err);
        });

      //   const ofpath =
      //   __dirname +
      //   orl.replace(/https?:..[^\/]+.(pdf2charinfo.)?/, '/../');
      // promise
      //   .then(() => page.content())
      //   .then((html) => {
      //     console.log(`Writing output to ${ofpath}`);
      //     fs.promises.writeFile(ofpath, html);
      //   });

      return promise;
    }, Promise.resolve());
    // TODO: Fix after jsonf output uses a promise!
    promise.then(() => {
      setTimeout(() => {
        browser.close();
      }, 5000);
    }).catch((err) => {
        console.log('Error Line 255 run_puppeteer' + err);
      });
  })();
}
