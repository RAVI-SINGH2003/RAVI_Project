/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
/**
 * @fileoverview handle request from client (index.html)
 *
 * @author  himanshu.garg@cse.iitd.ac.in (Himanshu Garg), Neha Jadhav, Punit Tigga ,
 *
 * @depends crypto, mysql
 *
 * @usage   node server.js
 *
 */

const path = require('path');
const fs = require('fs');
const busboy = require('busboy');
const mysql = require('mysql');
const util = require('util');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();
const {
  backendBaseUrl,
  JWT_SECRET,
  backendPort
} = require('../settings/settings');

//MIDDLEWARES-------------------------------------

app.use(express.json({ limit: '1000mb' }));
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  })
);
app.use(cookieParser());

//API------------------------------------------------------------------------------------------------------------

//login
app.post('/login', handleLogin);

//checkCookie
app.get('/checkcookie', handleCheckCookie);

//signup
app.post('/signup', handleSignup);

//logout
app.get('/logout', handleLogOut);

//displaydoc
app.get('/displaydoc', handleDocDisplay);

//updateModDocUpdate
app.post('/updatemoddoc', handleModDocUpdate);

//file upload
app.post('/fileupload', handleFileUpload);

//file processing
app.post('/fileprocess', handleFileProcess);

//fetch pdf
app.post('/fetchfile', fetchFile);

app.use((req, res, next) => {
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  if (req.method === 'GET') {
    handleGet(req, res);
  } else if (fullUrl.endsWith('.json')) {
    handleDocumentJson(req, res);
  } else if (fullUrl.endsWith('.jsonf')) {
    handleMathJsonf(req, res);
  } else {
    next();
  }
});

//--------------------------------------------------------------------------------------------------------

//starting the server
app.listen(
  backendPort,
  console.log(`Server is running at port ${backendPort}`)
);

//connecting the database
var conn = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'ravi@123'
});

function notOk(res) {
  console.log(`returning 500`);
  res.status(500).end();
}

function ok(res, body = '') {
  console.log(`returning 200`);
  res.status(200);
  if (body === '') res.end();
  else res.send(body);
}

//running of various scripts such as math_detect.py and image_detect.py
function runCommand(cmd, cmdargs, logfile, cb) {
  console.log(`running ${cmd} with args ${cmdargs}`);
  const child = spawn(cmd, cmdargs);
  const logStream = fs.createWriteStream(logfile, { flags: 'a' });
  child.stdout.on('data', (data) => {
    logStream.write(data);
    console.log(data.toString());
  });

  child.stderr.on('data', (data) => {
    if (cmd == 'scripts/run_puppeteer.js') {
      console.log('Running Script ........');
      cb(1);
    }
    logStream.write(data);
    console.log(data.toString());
  });

  child.on('close', (code) => {
    console.log('Insided runCommand');
    console.log(`${cmd} exited with code ${code}`);
    logStream.end();
    cb(code);
  });
}

function handleDocumentJson(req, res) {
  console.log('Inside handleDocumentJson......');
  let body = req.body;
  body = Buffer.concat(body).toString();
  const json = JSON.parse(body);
  // write json file at the same path and basename as html
  const jsonname = toFSPath(req.url);
  console.log(`saving ${JSON.stringify(json, null, 2)} to ${jsonname}`);
  try {
    writeFile(jsonname, JSON.stringify(json, null, 2));
    ok(res);
  } catch (err) {
    notOk(res);
  }
}

function handleMathJsonf(req, res) {
  console.log('Inside handleMathJsonf......');

  let body = req.body;
  body = Buffer.concat(body).toString();
  const jsonf = JSON.parse(body);
  let file = toFSPath(req.url);
  const logTo = file.replace(/\.jsonf$/, '.log');
  console.log(`saving ${JSON.stringify(jsonf, null, 2)} to ${file}`);
  writeFile(file, JSON.stringify(jsonf, null, 2), (err) => {
    if (err) {
      res.status(500);
    }

    // run linearizer
    runCommand('bin/linearizer.opt', [file], logTo, (code) => {
      if (code == 0) {
        file = file.replace(/.jsonf$/, '.lin');
        runCommand(
          'bin/anderson_post.opt',
          [
            '--driver',
            'latex_med',
            '--type',
            'LINE',
            '--layout',
            'latex',
            file
          ],
          logTo,
          (code) => {
            if (code == 0) {
              fs.readFile(
                file.replace(/.lin$/, '.tex'),
                { encoding: 'utf8' },
                (err, texaway) => {
                  if (err) {
                    notOk(res);
                  } else {
                    ok(res, texaway);
                  }
                }
              );
            } else {
              notOk(res);
            }
          }
        );
      } else {
        notOk(res);
      }
    });
  });
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} uname
 * @param {*} upassword
 * @param {*} callback
 * Database operation: Checks if the username and password is correct
 * Output : Returns matching row else null.
 **/
async function checkValidUser(uname, upassword, callback) {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const rows = await query(
      `SELECT * FROM ravi_webapp.User where username = '${uname}'`
    );
    if (rows.length === 0) {
      callback(null);
    } else {
      const isMatch = await bcrypt.compare(upassword, rows[0].password);
      if (!isMatch) {
        callback(null);
      } else {
        callback(rows);
      }
    }
  } catch (e) {
    callback(null);
  }
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} uname
 * @param {*} callback
 * Database operation:  Checks if the username exists in database
 * Output : Returns matching row else null.
 **/
async function checkUser(uname, callback) {
  const query = util.promisify(conn.query).bind(conn);
  try {
    const rows = await query(
      `SELECT * FROM ravi_webapp.User where username = '${uname}'`
    );
    callback(rows);
  } catch {
    callback(null);
  }
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} uname
 * @param {*} upassword
 * @param {*} utype
 * @param {*} callback
 * Database operation: Adds a new user to the database
 * Output : Returns inserted row else null.
 **/
async function addUser(uname, upassword, utype, callback) {
  const query = util.promisify(conn.query).bind(conn);
  try {
    let hashedPassword = await bcrypt.hash(upassword, 10);
    await query(
      `INSERT INTO ravi_webapp.User (username, password, isactive, usertype) VALUES ('${uname}','${hashedPassword}',1,${utype})`
    );
    console.log('added user to database');
    const rows = await query(
      `SELECT * FROM ravi_webapp.User where username = '${uname}'`
    );
    callback(rows);
  } catch (e) {
    console.log('failed to add user to database' + e);
    callback(null);
  }
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} uid
 * @param {*} orgPdf
 * @param {*} bPath
 * Database operation: Inserts uploaded pdf information in database.
 * Output : Returns inserted row else null.
 **/
function addUploadInfo(uid, orgPdf, bPath, callback) {
  const query = util.promisify(conn.query).bind(conn);
  (async () => {
    try {
      const rows = await query(
        `INSERT INTO ravi_webapp.doc_upload (userid, originalPdf, uploaddate , status, basePath) VALUES (${uid}, '${orgPdf}', NOW() , 0, '${bPath}')`
      );
      callback(rows);
    } catch {
      callback(null);
    }
  })();
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} sessionid
 * @param {*} callback
 * Database operation: Gets user information from the session id.
 * Output : Returns user information for a session.
 **/
function getUserInfo(uname, callback) {
  const query = util.promisify(conn.query).bind(conn);
  (async () => {
    try {
      const rows = await query(
        `SELECT * FROM ravi_webapp.User where username = '${uname}'`
      );
      callback(rows);
    } catch {
      callback(null);
    }
  })();
}

/**
 * Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} uid
 * @param {*} orgPdf
 * @param {*} orgHtml
 * @param {*} callback
 * Update the status of document and generatedHtml file name in the database.
 */
function updateProcessedHtml(uid, orgPdf, orgHtml, callback) {
  const query = util.promisify(conn.query).bind(conn);
  (async () => {
    try {
      const rows = await query(
        `UPDATE ravi_webapp.doc_upload set originalHtml='${orgHtml}',status = 2 where userid = ${uid} and originalPdf = '${orgPdf}'`
      );
      callback(rows);
    } catch {
      callback(null);
    }
  })();
}
// ====================================================================
/**
 * Author : Ravi Singh
 * @param {*} uid
 * @param {*} orgPdf
 * @param {*} orgHtml
 * Update  only the status of the document in the database.
 */
async function updateStatus(uid, orgPdf, docStatus, callback) {
  const query = util.promisify(conn.query).bind(conn);
  try {
    const rows = await query(
      `UPDATE ravi_webapp.doc_upload set status = ${docStatus} where userid = ${uid} and originalPdf = '${orgPdf}'`
    );
    return rows;
  } catch {
    return null;
  }
}
// ========================================================================

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} aid
 * @param {*} modHtml
 * @param {*} callback
 * Updates modified html information.
 * Output : Returns updated rows else null.
 **/
function updateModifiedHtml(aid, modHtml, callback) {
  const query = util.promisify(conn.query).bind(conn);
  (async () => {
    try {
      const rows = await query(
        `UPDATE ravi_webapp.doc_upload set modifiedHtml = '${modHtml}', modifieddate = NOW() where autoid = ${aid}`
      );
      callback(rows);
    } catch {
      callback(null);
    }
  })();
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} uid
 * @param {*} callback
 * Gets all the documents for an end user.
 * Output : Returns all documents for an end user, else null.
 **/
function getUserDocInfo(uid, callback) {
  const query = util.promisify(conn.query).bind(conn);
  (async () => {
    try {
      const rows = await query(
        `SELECT * FROM ravi_webapp.doc_upload where userid = ${uid}`
      );
      callback(rows);
    } catch {
      callback(null);
    }
  })();
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} callback
 * Gets all the documents for an editor user.
 * Output : Returns all documents for an editor user, else null.
 **/
function getEditorDocInfo(callback) {
  const query = util.promisify(conn.query).bind(conn);
  (async () => {
    try {
      const rows = await query(`SELECT * FROM ravi_webapp.doc_upload`);
      callback(rows);
    } catch {
      callback(null);
    }
  })();
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} id
 * @param {*} callback
 * Gets uploaded document information for an id.
 * Output : Returns uploaded document information for an id, else null.
 **/
function getModifiedHtmlInfo(id, callback) {
  const query = util.promisify(conn.query).bind(conn);
  (async () => {
    try {
      const rows = await query(
        `SELECT * FROM ravi_webapp.doc_upload where autoid=${id}`
      );
      callback(rows);
    } catch {
      callback(null);
    }
  })();
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} req
 * @param {*} res
 * Main api function for saving modified html and updating information in database
 * Output : Returns success(200) or error(500) response.
 **/
function handleModDocUpdate(req, res) {
  const { autoid, htmlData } = req.body;

  if (!autoid) {
    autoid = -1;
  }

  let value = true;
  statusCode = 200;
  getModifiedHtmlInfo(autoid, function (result) {
    if (result == null) {
      value = false;
      statusCode = 500;
    } else if (result.length > 0) {
      // write and send response
      const modifHtml = result[0].originalPdf.replace('.pdf', '.out.mod.html');
      const pathToWrite = result[0].basePath.concat(modifHtml);
      // Sample of data written to flagJson file
      fs.writeFile(pathToWrite, htmlData, function (err, result) {
        // if error then send false
        if (err) {
          value = false;
          statusCode = 500;
        }
      });
      updateModifiedHtml(autoid, modifHtml, function (res1) {
        if (res1 == null) {
          value = false;
          statusCode = 500;
        }
      });
    }
    return res.status(statusCode).json({
      valid: value
    });
  });
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} req
 * @param {*} res
 * Main api function for handling login
 * Output : Returns success(200) or error(500) response.
 **/

function handleLogin(req, res) {
  const { name: username, password: upassword } = req.body;

  // receive radio button information
  checkValidUser(username, upassword, function (result) {
    if (result == null) {
      return res.status(500).json({
        valid: false
      });
    } else if (result.length > 0) {
      const token = jwt.sign({ uname: result[0].username }, JWT_SECRET, {
        expiresIn: '15d'
      });
      console.log('Cookies set .....');
      const cookieOptions = {
        maxAge: 15 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      };
      return res.status(200).cookie('loginToken', token, cookieOptions).json({
        valid: true
      });
    }
  });
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} req
 * @param {*} res
 * Main api function for handling logout
 * Output : Returns success(200) or error(500) response.
 **/
function handleLogOut(req, res) {
  res
    .status(200)
    .cookie('loginToken', 'INVALID', {
      expiresIn: new Date(Date.now()),
      httpOnly: true,
      sameSite: 'none',
      secure: true
    })
    .json({
      valid: true
    });
  console.log('Cookies Deleted......');
  console.log('Logout Done......');
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} req
 * @param {*} res
 * Main api function for handling signup
 * Output : Returns success(200) or error(500) response.
 **/
async function handleSignup(req, res) {
  const { name: username, password: upassword, type: utype } = req.body;
  let value, statusCode;
  await checkUser(username, async function (result) {
    console.log('check user result: ', result);
    if (result == null) {
      value = false;
      statusCode = 500;
    } else if (result.length > 0) {
      value = false;
      statusCode = 500;
    } else {
      value = true;
      statusCode = 201;
      console.log('need to add user');
      await addUser(username, upassword, utype, function (res1) {
        if (res1 == null) {
          value = false;
          statusCode = 500;
        }
      });
    }
  });
  return res.status(statusCode).json({
    valid: value
  });
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} req
 * @param {*} res
 * Main api function for checking session validity
 * Output : Returns success(200) or error(500) response.
 **/
async function handleCheckCookie(req, res) {
  const cookies = req.cookies;
  let statusCode,
    value = false;
  if (cookies && cookies['loginToken'] !== 'INVALID') {
    const decoded = jwt.verify(cookies['loginToken'], JWT_SECRET);
    await checkUser(decoded.uname, async function (result) {
      if (result == null) {
        statusCode = 500;
        value = false;
      } else {
        value = true;
        statusCode = 200;
      }
    });
  } else {
    value = false;
    statusCode = 200;
  }
  return res.status(statusCode).json({
    valid: value
  });
}

/**
 *Author : Punit Tigga and Tuhinanksu Das.
 * @param {*} req
 * @param {*} res
 * Main api function for listing documents uploaded by an user
 * Output : Returns success(200) or error(500) response.
 **/

function handleDocDisplay(req, res) {
  let userid = 0;
  let usertype = 0;
  let statusCode = 200; //added
  let value = true;
  const cookies = req.cookies;
  if (!cookies || cookies['loginToken'] === 'INVALID') {
    return res.status(200).json({
      success: false,
      data: []
    });
  } else {
    const decoded = jwt.verify(cookies['loginToken'], JWT_SECRET);
    getUserInfo(decoded.uname, function (result) {
      if (result == null) {
        value = false;
        statusCode = 500;
      } else if (result.length > 0) {
        userid = result[0].autoid;
        usertype = result[0].usertype;
      }

      if (usertype == 1) {
        getUserDocInfo(userid, function (uresult) {
          if (uresult == null) {
            value = false;
            statusCode = 500;
          }
          return res.status(statusCode).json({ success: value, data: uresult });
        });
      } else if (usertype == 2) {
        getEditorDocInfo(function (edresult) {
          if (edresult == null) {
            value = false;
            statusCode = 500;
          }
          return res
            .status(statusCode)
            .json({ success: value, data: edresult });
        });
      } else {
        data = result;
        return res.status(statusCode).json({ success: value, data: result });
      }
    });
  }
}

//handle File Uploading
function handleFileUpload(req, res) {
  console.log('Hi from handleFileUpload');
  res.setHeader('Content-Type', 'application/json');
  req.setTimeout(0);
  let bby = busboy({ headers: req.headers });
  let saveTo = '',
    logTo = '',
    mainFilename = '',
    modHtml = '',
    orgHtml = '',
    basePath = '',
    userid = 0,
    username = '',
    userDetails = '',
    statusCode = 200;

  const fieldInfo = {};
  const cookies = req.cookies;
  const decoded = jwt.verify(cookies['loginToken'], JWT_SECRET);

  // receive radio button information
  bby.on('field', (name, val) => {
    console.log('inside field');
    fieldInfo[name] = val;
  });
  // on receiving file write to uploads/<timestamp>/filename
  bby.on('file', function (fieldname, file, filename) {
    console.log('fieldInfo', fieldInfo);
    console.log('inside by.on file');
    getUserInfo(decoded.uname, function (result) {
      if (result == null) {
        statusCode = 500;
      } else if (result.length > 0) {
        userid = result[0].autoid;
        username = result[0].username;
        const datetext = new Date().toISOString();
        const data = datetext.split('.');
        const timestamp = data[0].replace(/[^a-zA-Z0-9]/g, '_');

        userDetails = username.concat('_', userid);

        //FILE NAME SANIIZATION
        mainFilename = filename.filename.trim().replace(/[^a-z0-9]/gi, '');
        const fnDetail = mainFilename.split('.pdf');
        mainFilename = fnDetail[0].concat('_', timestamp, '.pdf');

        orgHtml = fnDetail[0].concat('_', timestamp, '.out.html');
        modHtml = fnDetail[0].concat('_', timestamp, '.out.mod.html');
        basePath = path.join(`uploads/${userDetails}/${mainFilename}/`);
        saveTo = path.join(
          `uploads/${userDetails}/${mainFilename}/${mainFilename}`
        );

        addUploadInfo(userid, mainFilename, basePath, function (res1) {
          if (res1 == null) {
            statusCode = 500;
          } else {
            const modHtmlPath = path.join(
              `uploads/${userDetails}/${mainFilename}/${modHtml}`
            );
            let flagJsonFilePath = path.join(
              `uploads/${userDetails}/${mainFilename}/${mainFilename}`
            );
            let characteristicsJsonFilePath = path.join(
              `uploads/${userDetails}/${mainFilename}/${mainFilename}`
            );

            // Path for creating flag JSON file
            flagJsonFilePath = flagJsonFilePath.replace(/.pdf$/, '_flags.json');
            // Path for creating characteristics JSON file
            characteristicsJsonFilePath = characteristicsJsonFilePath.replace(
              /.pdf$/,
              '_characteristics.json'
            );
            fs.mkdir(path.dirname(saveTo), { recursive: true }, (err) => {
              if (err) throw err;
              file.pipe(fs.createWriteStream(saveTo));
            });

            // Sample of data written to flagJson file
            fs.writeFile(
              flagJsonFilePath,
              JSON.stringify(fieldInfo),
              function (err) {
                if (err) {
                  console.log('line 782 ' + err);
                }
              }
            );
            // Sample of data written to characterJson file
            fs.writeFile(
              characteristicsJsonFilePath,
              JSON.stringify(fieldInfo),
              function (err) {
                if (err) {
                  console.log('line 798 ' + err);
                }
              }
            );

            // Sample of data written to characterJson file
            fs.writeFile(modHtmlPath, '', function (err) {
              if (err) {
                console.log('line 812 ' + err);
              }
            });
          }
        });
      }
    });
  });
  bby.on('finish', async function () {
    let info = {};
    if (statusCode === 200) {
      await updateStatus(userid, mainFilename, 1);
      info = {
        saveTo: saveTo,
        userid: userid,
        mainFilename: mainFilename,
        orgHtml: orgHtml,
        userDetails: userDetails
      };
    }
    return res.status(statusCode).json({
      success: statusCode === 200,
      info: info
    });
  });
  return req.pipe(bby);
}

//handle File Processing
async function handleFileProcess(req, res) {
  // when upload finishes, run pdf2htmlEx
  let { responses } = req.body;
  for (let i = 0; i < responses.length; i++) {
    let { saveTo, userid, mainFilename, orgHtml, userDetails } =
      responses[i].info;
    let logTo = saveTo.replace(/.pdf$/, '.log');
    runCommand('scripts/pdf2html_doc.sh', [saveTo], logTo, async (code) => {
      var pdf = saveTo;
      var response = saveTo.replace(/.pdf$/, '.txt');
      var img_response = saveTo.replace(/.pdf$/, '_img.txt');
      saveTo = saveTo.replace(/.pdf$/, '.html');
      var imgPath = `uploads/${userDetails}/${mainFilename}/imgs`;
      fs.mkdirSync(imgPath);
      const url = `${backendBaseUrl}/${saveTo}`;
      if (code == 0) {
        let orl = url.replace(/http:\/\/.*?\//, '/');
        if (req.url !== '/pdf2htmlEx') {
          runCommand(
            'python3',
            ['scripts/image_detect.py', pdf, imgPath, img_response],
            logTo,
            (code) => {
              console.log('THIS IS CODE????????????????????? ', code);
              runCommand(
                'python3',
                ['scripts/math_detect_client.py', pdf, response],
                logTo,
                (code) => {
                  runCommand(
                    'scripts/run_puppeteer.js',
                    ['--nojson', url, response, img_response],
                    logTo,
                    (code) => {
                      if (code == 0) {
                        orl = orl.replace(/.html$/, '.out.html');
                        const url1 =
                          `${backendBaseUrl}/htmleditor/html-editor.html#${saveTo}`
                            .replace(/http:\/\/.*?\//, '/')
                            .replace(/.html$/, '.out.html');

                        updateProcessedHtml(
                          userid,
                          mainFilename,
                          orgHtml,
                          function (result1) {
                            if (result1 == null) {
                              res.statusCode = 500;
                            }
                          }
                        );

                        console.log(`returning ${orl}`);
                        res.end(JSON.stringify({ url: url1, success: true }));
                      } else {
                        res.statusCode == 500;
                        res.end();
                      }
                    }
                  );
                }
              );
            }
          );
        } else {
          console.log(`singh returning ${orl}`);
        }
      } else {
        await updateStatus(userid, mainFilename, 0);
      }
    });
  }
  return res.status(200).json({
    success: true
  });
}

// Get Html
function handleGet(req, res) {
  let filePath = req.url.replace(/^\//, '');
  if (filePath == '') {
    filePath = 'index.html';
  }
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      console.log(`${filePath} ${err ? 'is not readable' : 'is readable'}`);
      res.writeHead(404, { Connection: 'close' });
      res.end();
    } else {
      fs.stat(filePath, (err, stats) => {
        if (stats.isDirectory()) {
          filePath = 'index.html';
        }
        const readStream = fs.createReadStream(filePath);
        res.writeHead(200, { Connection: 'close' });
        readStream.pipe(res);
      });
    }
  });
}

/*
 * Author : Ravi Singh
   email : singhravi110059@gmail.com 
   input :  pdf file path
   output : pdf file in base64 format
 */
function fetchFile(req, res) {
  const { filePath } = req.body;
  const pdfFilePath = path.join(__dirname, '..', filePath);

  fs.readFile(pdfFilePath, (err, data) => {
    if (err) {
      console.error('Error reading PDF file:', err);
      return res.status(500).send('Internal Server Error');
    }
    const base64Data = 'data:application/pdf;base64,' + data.toString('base64');
    res.status(200).json({ base64Data: base64Data });
  });
}

/**
 * Derive path on filesystem from the pdf/html doc urldoc_upload
 */
function toFSPath(url) {
  let index = url.indexOf('/uploads');
  if (index == -1) {
    index = url.indexOf('/samples');
  }
  return __dirname + '/..' + url.substring(index);
}

function writeFile(file, contents, callback) {
  console.log(`writing to ${file}`);
  fs.mkdir(path.dirname(file), { recursive: true }, (err) => {
    if (err) throw err;
    fs.writeFile(file, contents, (err) => {
      if (err) throw err;
      console.log('saved ' + file);
      if (callback) {
        callback(err);
      }
    });
  });
}
