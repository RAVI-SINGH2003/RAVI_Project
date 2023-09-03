#!/usr/bin/env node

/**
 * @fileoverview wrapper http server around MaxTract's linearizer 
 *
 * @author  himanshu.garg@cse.iitd.ac.in (Himanshu Garg)
 *
 * @usage   node linearizer.js
 *
 */

'use strict';

const http      = require('http');
const path      = require('path');
const fs        = require('fs');
const { spawn } = require('child_process');

function notOk(resp, code, err) {
  console.log(err);
  resp.setHeader('Access-Control-Allow-Origin', '*');
  resp.setHeader('Access-Control-Allow-Methods', 'POST');
  resp.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  resp.statusCode = code; 
  resp.end();
}

function ok(resp, body) {
  resp.setHeader('Access-Control-Allow-Origin', '*');
  resp.setHeader('Access-Control-Allow-Methods', 'POST');
  resp.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  resp.statusCode = 200;
  resp.end(body);
}

http.createServer((request, response) => {
  console.log(request.method + ": " + request.url);
  request.on('error', (err) => {
    console.error(err);
    notOk(response, 400, err);
  });
  response.on('error', (err) => {
    console.error(err);
    notOk(response, 400, err);
  });
  if (request.method === 'OPTIONS') {
    ok(response);
  } else if (request.method === 'POST' && request.url === '/json') {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      let [url, json] = JSON.parse(body);

      // write json file at the same path and basename as html
      let jsonname = toFSPath(url).replace(/\.html$/, '.json');
      try {
        writeFile(jsonname, JSON.stringify(json, null, 2));
        ok(response);
      } catch(err) {
        notOk(response, 500, err)
      }
    });
  } else if (request.method === 'POST' && request.url === '/jsonf') {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      let [url, jsonf] = JSON.parse(body);
      let dir = path.dirname(toFSPath(url));
      let timestamp = Date.now();
      let file = path.join(dir, timestamp + '.jsonf');
      console.log(`saving ${JSON.stringify(jsonf, null, 2)} to ${file}`);
      writeFile(file, JSON.stringify(jsonf, null, 2), (err) => {
        // run linearizer
        let lin = spawn('linearizer', [file]);
        lin.stderr.on('data', (data) => {
          console.log(data.toString());
          notOk(response, 500, err);
        });
        lin.on('close', (code) => {
          console.log(`linearizer process exited with code ${code}`);
          if (code == 0) {
            file = file.replace(/.jsonf$/, '.lin');
            let tex = spawn('anderson_post.opt', ['--driver', 'latex_med', '--type', 'LINE', '--layout', 'latex', file]);
            tex.stderr.on('data', (data) => {
              console.error(data.toString());
              notOk(response, 500, err);
            });
            tex.stdout.on('data', (data) => {
              console.log(data.toString());
            });
            tex.on('close', (code) => {
              console.log(`anderson_post.opt process exited with code ${code}`);
              if (code == 0) {
                fs.readFile(file.replace(/.lin$/, '.tex'), {'encoding': 'utf8'}, (err, texaway) => {
                  if (err) {
                    notOk(response, 500, err);
                  } else {
                    console.log(texaway);
                    ok(response, texaway);
                  } 
                });
              }
            });
          }
        })
      });
    });
  } else {
    notOk(response, 404, 'Not found');
  }
}).listen(8080);

function toFSPath(url) {
  let index = url.indexOf("/samples");
  return __dirname + "/.." + url.substring(index);
}

function writeFile(file, contents, callback) {
  fs.mkdir(path.dirname(file), {recursive: true}, (err) => {
    if (err) throw err;
    fs.writeFile(file, contents, err => {
        if (err) throw err;
        console.log('saved ' + file);
        if (callback) {
          callback(err);
        }
    });
  });
}
