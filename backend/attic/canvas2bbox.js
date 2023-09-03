// Outline:
//
// 1. Run pdf2htmlex on the pdf page.
// 2. Wrap it into a foreign object.
// 3. We need to remove the sidebar and pagecontainer elements.
// 4. Run image binarization.
// 5. Connected Components to find bounding boxes.

let c2b = {};

// Index to elements. For now!
c2b.canvas = {};
c2b.images = {};
c2b.spans = {};
c2b.mult = 10;
c2b.delay = 100;

c2b.createImg = function() {
  let svg = c2b.createSVG();
  let img = document.createElement('img');
  img.setAttribute('src', 'data:image/svg+xml,' +
                   svg.replace('scale(1)', 'scale(10)'));
  return img;
};


c2b.createCanvas = function(width, height) {
  let canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  // canvas.style.zIndex = 0;
  canvas.style.position = 'relative';
  // canvas.style.border = '1px solid';
  let ctx = canvas.getContext('2d', {antialias: false});
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  return canvas;
};


c2b.binarizePixels = function(canvas, pixels, thresh) {
  thresh = thresh || 0;
  let width = canvas.width;
  let height = canvas.height;
  let ctx = canvas.getContext('2d', {antialias: false});
  let pix = ctx.getImageData(0, 0, width, height).data;
  let result = [];
  for (let [x, y] of pixels) {
    let [r, g, b, a] = c2b.getPixel(pix, x, y, width);
    let gray =  (0.299 * r + 0.587 * g + 0.114 * b);
    // console.log(`${y}, ${x}: ${gray}`);
    // This is our threshold. You can change it.
    if (gray <= thresh) {
      ctx.fillStyle = 'rgba(0,0,0,1)';
      result.push([x, y]);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,1)';
    }
    ctx.fillRect(x, y, 1, 1);
  }
  return result;
};


/**
 * 
 * @param {}
 * @return {}
 */
c2b.getPixels = function(canvas) {
  let width = canvas.width;
  let height = canvas.height;
  let ctx = canvas.getContext('2d', {antialias: false});
  let pix = ctx.getImageData(0, 0, width, height).data;
  let result = [];
  for (var x = 0; x < width; x++) {
    for (var y = 0; y < height; y++) {
      let [r, g, b, a] = c2b.getPixel(pix, x, y, width);
      // if (a > 0) {
      if (r < 255 || b < 255 || g < 255) {
        result.push([x, y]);
      }
    }
  }
  return result;
};


c2b.computeCharInfo = function(index, flags) {
  let canvas = c2b.canvas[index];
  let pixels = c2b.getPixels(canvas);
  let result = {}
  if (flags.bin) {
    pixels = c2b.binarizePixels(canvas, pixels, flags.bin);
  }
  result.pixels = pixels;
  result.bbox = c2b.getBbox(pixels);
  result.cc = c2b.getConnectedComponents(pixels);
  result.ccBbox = result.cc.map(c2b.getBbox);
  // Drawing commands
  if (flags.bbox) {
    c2b.drawBbox(canvas, bbox);
  }
  if (flags.pixels) {
    c2b.drawPixels(canvas, pixels);
  }
  // connected components
  if (typeof flags.cc === 'number' && result.cc[number]) {
    c2b.drawPixels(canvas, result.cc[number]);
  } else if (flags.cc) {
    result.cc.forEach((p) => c2b.drawPixels(canvas, p));
  }
  if (typeof flags.ccBbox === 'number' && result.ccBbox[number]) {
    c2b.drawBbox(canvas, result.ccBbox[number]);
  } else if (flags.ccBbox) {
    result.ccBbox.forEach((p) => c2b.drawBbox(canvas, p));
  }
  return result;
};


// Promise chain:
// Insert Image
// Insert Canvas
// Compute Measurements
// Repeat

// The following methods should all return a promise.
c2b.drawCanvas = function(count) {
  let canvas = c2b.canvas[count];
  let img = c2b.images[count];
  return new Promise(
    (ok, fail) => {
      setTimeout(() => {
        let ctx = canvas.getContext('2d', {antialias: false});
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
        ok();  // Maybe look for first black pixel on Canvas?
      }, c2b.delay)
    });
};

c2b.insertCanvas = function(count) {
  let canvas = c2b.canvas[count];
  if (!canvas) {
    canvas = c2b.createCanvas(c2b.json.pageWidth,
                              c2b.json.pageHeight);
    c2b.canvas[count] = canvas;
  }
  return new Promise(
    (ok, fail) => {
      setTimeout(
        () => {
          document.body.appendChild(canvas);
          ok();
        }, c2b.delay)});
};

c2b.insertImg = function(count) {
  let image = c2b.images[count];
  if (!image) {
    image = c2b.createImg();
    c2b.images[count] = image;
  }
  return new Promise(
    (ok, fail) => {
      setTimeout(
        () => {
          document.body.appendChild(image);
          ok();
        }, c2b.delay)});
};


c2b.computeJson = function(count, span) {
  span.classList.remove('hidden');
  c2b.spans[count] = span;
  return c2b.insertImg(count).
    then(
      () => c2b.insertCanvas(count)).
    then(
      () => c2b.drawCanvas(count)).
    then(
      () => {
        // Here we have to compute the json!
        c2b.removeNode(c2b.images[count]);
        c2b.removeNode(c2b.canvas[count]);
        span.classList.add('hidden');
      });
};


c2b.iterateSpans = function(count, spans) {
  if (!spans.length) return;
  c2b.computeJson(count, spans.shift()).then(
    () => {
      c2b.iterateSpans(++count, spans);
    }
  )
}


c2b.fillJson = function() {
  let count = 0;
  let lines = Array.from(c2b.page.querySelectorAll('.line'));
  lines = lines.slice(0, 2);
  lines.reduce(
    (p, line) => 
      p.then(_ => {
        console.log(count);
        let spans = Array.from(line.querySelectorAll('*[has-font]'));
        spans = spans.filter(x => !x.textContent.match(/^\s*$/));
        spans.reduce(
          (q, span) =>
            q.then(
              c2b.computeJson(count++, span)
            ),
          Promise.resolve())}),
    Promise.resolve());
  // console.log(lines.length);
  // spans = spans.filter(x => !x.textContent.match(/^\s*$/));
  // // Let's do that in chunks!
  // c2b.iterateSpans(count, spans);
  // c2b.iterateSpans(10, spans.slice(10, 20));
  // c2b.iterateSpans(20, spans.slice(20, 30));
  // c2b.iterateSpans(30, spans.slice(30, 40));
};


c2b.page = null;
c2b.background = null;

// This initialises the jsonf structure.
c2b.json = null;

c2b.initJson = function() {
  return new Promise((ok, fail) => {
    setTimeout(() => {
      let rect = c2b.page.getBoundingClientRect();
      if (rect.width) {
        ok(rect);
      } else {
        console.log('Failed on JSON!');
      }
    }, c2b.delay);
  }).then(function(rect) {
    let width = rect.width * c2b.mult;
    let height = rect.height * c2b.mult;
    c2b.json = {
    srcPDF: '',   // We need this info for convenience!
    page: '',
    pageWidth: width,
    pageHeight: height,
    clipX: 0,
    clipY: 0,
    clipWidth: rect.width * 2,
    clipHeight: rect.height * 2,
    clipImage: '',
    symbols: []
    };
  });
};

                     
c2b.cleanDocument = function() {
  c2b.removeScripts();
  c2b.cleanStyles();
  c2b.removeUnused().then(
    c2b.linify
  ).then(
    c2b.spanify
  ).then(
    c2b.initJson
  ).then(
    () => {
      c2b.removeNode(c2b.page);
      c2b.canvas = {};
      c2b.spans = {};
    }
  ).then(
    c2b.fillJson
  );
};

c2b.showPage = function() {
  document.body.appendChild(c2b.page);
  document.styleSheets[0].
    deleteRule(document.styleSheets[0].cssRules[0]);
};

c2b.removePage = function() {
  document.styleSheets[0].
    insertRule('span.hidden { visibility: hidden}');
  c2b.removeNode(c2b.page);
};


//


document.addEventListener('readystatechange',
                          event => {
                            if (event.target.readyState === 'complete') {
                              c2b.cleanDocument();
                            }});


