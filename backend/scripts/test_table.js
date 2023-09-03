#!/usr/bin/env node

'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const testCases = []
const flags = {};
for(let i = 68; i<94; i++)
{
    const string = 'http://localhost/pdf2charinfo/samples/Table_Detect_Ayu_Sim/'+i+"/page.html"
    testCases.push([string])
}
(async () => {
    const browser = await puppeteer.launch({ headless: !flags.noheadless,
        args: ['--no-sandbox',
               '--disable-setuid-sandbox']});
 const page = await browser.newPage();
 
 await page.exposeFunction('testing', (path,ans) => {
    const loadData = (ofpath) => {
      try {
        return fs.promises.writeFile(ofpath, ans)
      } catch (err) {
        console.error(err)
        return false
      }
    }
    return loadData(path)
  })
 page.on('console', msg => console.log('PAGE LOG:', msg.text())); // log console events

 let promise = testCases.reduce(async (pr, testCase) => {
   let [url, expected] = testCase;
   console.log("Analysing url",url)
   let promise = pr.then(() => page.goto(url, {'waitUntil' : 'networkidle0'}));
  
   let orl = url.replace(/\.html$/, '.txt');
   let ofpath = __dirname + orl.replace(/.*pdf2charinfo/, '/../');
   promise = promise.then(() => page.evaluate((ofpath, flags, url) => {
    
     // Page analysis code goes here
     let page = new pdf2charinfo.page(document);
     return page.promise.
     then(() => page.matchSpans()).
     then(() => page.backgroundAnalysis()).
     then(() => page.table_analysis()).
     then(() => page.algo3()). // call your function here
     then(async () => 
        {
         if(page.table_list_algo1.length !=0 )
        {
            await testing(ofpath,"Algo 1 failed")
        }
        if(page.table_list_algo2.length !=0 )
        {
            await testing(ofpath,"Algo 2 failed")
        }
        if(page.table_list_algo3.length !=0 )
        {
            await testing(ofpath,"Algo 3 failed")
        }
        else{
            await testing(ofpath,"All passed")

        }
    });
   },ofpath, flags, url), () => console.error('Illegal page ' + url));
   return promise;
 }, Promise.resolve());
 promise.then(() => {setTimeout(() => {browser.close()}, 5000);});
})();