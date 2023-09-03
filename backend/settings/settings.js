//used for making it the global variable and used the article "https://dev.to/sbelzile/stop-using-dotenv-in-your-front-end-427p"
// and added the scripts tag in all the html files befopre the scripts of the javascript file.

  const backendPort = 9000;
  const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
  const JWT_SECRET = 'strnfsn2ienenddsdssd';
  
  //this module  is for providing url to server.js file
  // in other files settings.js is added as a script tags in html for providing path to their js
  module.exports = {
    backendBaseUrl,
    JWT_SECRET,
    backendPort
  };
  