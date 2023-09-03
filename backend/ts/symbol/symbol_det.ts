import { Util } from '../utility/utils';
import Bbox from '../utility/bbox';
import Canvas from '../utility/canvas';
import { myPixel } from './arrow';
import * as arrow from './arrow';
import { Forest, forestmain } from './forest';
import { Cluster, cluster } from './pixelCluster';
import { BigBbox } from '../background/BigBbox';

export class Radical {
  public position: myPixel; // Position of top-right feature point
  public pixels: myPixel[]; // Array of feature points in order
  public forest: Forest;

  constructor() {
    this.pixels = [];
    this.position = new myPixel();
  }
}

export const CONFIDENCETHRESH: number[] = [0.85],
  DOUGLASPEUCKERTHRESH = 0.1,
  DEGREEOFTOLFORSTRAIGHTENFOREST = 20,
  PERCENTCOLOREDTHRESH = 55,
  TOOBIGBOXAREA = 150000,
  TOOSMALLBOXAREA = 5,
  functions: any[] = [],
  functionCodes = new Map(),
  revFuncitonCodes: string[] = [],
  init = function () {
    clusterGenTime = [];
    heuristicsTime = [];
    confidenceScores = [];
    symbols = [];
    forests = [];

    functions.push(checkRadicalinForest);
    functionCodes.set(checkRadicalinForest, numFunctions);
    revFuncitonCodes[numFunctions++] = 'checkRadicalinForest';
  };

export let CLUSTHRESH = 0.1,
  SHOWFOREST = true,
  SHOWTHINNEDIMAGE = true,
  SHOWCOMMENTS = false,
  SHOWCOMMENTSsmall = false,
  DRAWBOX = true,
  numFunctions = 0;

let drawTime: number,
  end: number,
  endtime: number,
  forestGenTime: number,
  previous: number,
  start: number,
  starttime: number,
  thinningTime: number,
  clusterGenTime: number[],
  confidenceScores: number[],
  heuristicsTime: number[],
  forests: Forest[],
  symbols: any[],
  TotalTimePage = 0;

/**
 * Currently this function is being called in background_analysis.ts for identifying radical symbol boxes.
 * It has same code as symbolMain function. Removed variables and part of code unnecssary for this operation.
 * Added few changes as per requirement for background_analysis.ts.
 * Takes input as Big_Bbox[] instead of Bbox[].And does not consider division symbols pixels and water mark pixels before using Symbol_Help.
 * This function can be merged with symbolMain function whenever neccessary updates are made.
 */

export const update_radical_bigboxes = function (
  box: BigBbox[],
  canvas: Canvas
) {
  init();
  const ctx = canvas.getContext(),
    pix = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    pix_set = new Set();

  //All the pixels of horizontal boxes having similar dimensions of a division symbol are stored in pix_set.
  for (let i = 0; i < box.length; ++i) {
    const borders = box[i].box(),
      x1 = borders[0],
      y1 = borders[1],
      x2 = borders[2],
      y2 = borders[3],
      X = Math.abs(x1 - x2) + 1,
      Y = Math.abs(y1 - y2) + 1;

    if (Y <= 5 && X >= 15 && X <= 75) {
      for (let i = 0; i < X; i++) {
        for (let j = 0; j < Y; j++) {
          pix_set.add(x1 + i + ' ' + (y1 + j));
        }
      }
    }
  }

  for (let i = 0; i < box.length; ++i) {
    const borders = box[i].box(),
      x1 = borders[0],
      y1 = borders[1],
      x2 = borders[2],
      y2 = borders[3],
      X = Math.abs(x1 - x2) + 1,
      Y = Math.abs(y1 - y2) + 1,
      t = Math.min(X, Y);

    if (t < TOOSMALLBOXAREA) {
      continue;
    }

    if (X * Y > TOOBIGBOXAREA) {
      continue;
    }

    const pixels: myPixel[][] = new Array(x2 - x1 + 1);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = new Array(y2 - y1 + 1);
      for (let j = 0; j < pixels[i].length; j++) {
        const pixs: myPixel = new myPixel();
        pixs.x = x1 + i;
        pixs.y = y1 + j;

        const [r, g, b, a] = Util.getPixel(pix, pixs.x, pixs.y, canvas.width);

        if (r < 225 || b < 225 || g < 225) {
          //Ignoring WaterMark
          pixs.component = [r, g, b, a];
        } else {
          pixs.component = [255, 255, 255, a];
        }

        if (pix_set.has(pixs.x + ' ' + pixs.y)) {
          //Ignoring pixels present in pix_set
          pixs.component = [255, 255, 255, a];
        }

        pixels[i][j] = pixs;
      }
    }

    const douglasPeuckerThresh: number = DOUGLASPEUCKERTHRESH * t,
      [rad /* confidence */] = symbolHelp(
        pixels,
        douglasPeuckerThresh,
        box[i],
        canvas
      );

    /* Marks the box as a radical and math symbol */
    if (rad != null) {
      box[i].isRadicalSym = true;
      box[i].isMathSym = true;
    }
  }
};

/**
 *
 * @param box Array of Bounding boxes
 * @param canvas Canvas
 */
export const symbolMain = function (
  box: Bbox[],
  canvas: Canvas,
  showForest = true,
  clusThresh = CLUSTHRESH,
  showComments = SHOWCOMMENTS,
  showCommentsSmall = SHOWCOMMENTSsmall,
  drawBox = DRAWBOX,
  showThinnedImage = SHOWTHINNEDIMAGE
): boolean {
  start = Date.now();
  CLUSTHRESH = clusThresh;
  SHOWFOREST = showForest;
  SHOWCOMMENTS = showComments;
  SHOWCOMMENTSsmall = showCommentsSmall;
  if (!SHOWCOMMENTSsmall) {
    SHOWCOMMENTS = false;
  }
  DRAWBOX = drawBox;
  SHOWTHINNEDIMAGE = showThinnedImage;
  if (showForest) {
    SHOWTHINNEDIMAGE = false;
  }
  /* CANVAS = canvas; */

  init();

  console.log(`show comments? ${SHOWCOMMENTS}`);
  console.log(`show forest? ${SHOWFOREST}`);

  console.log(`${box.length} bounding boxes`);
  let RadicalFound = false;
  const ctx = canvas.getContext(),
    pix = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < box.length; ++i) {
    starttime = Date.now() - start;
    if (SHOWCOMMENTSsmall) {
      console.log(`BOX ${i + 1}`);
    }
    const borders = box[i].box(),
      x1 = borders[0],
      y1 = borders[1],
      x2 = borders[2],
      y2 = borders[3],
      X = Math.abs(x1 - x2) + 1,
      Y = Math.abs(y1 - y2) + 1,
      t = Math.min(X, Y);
    if (SHOWCOMMENTSsmall) {
      console.log(
        `dimensions: ${X} ${Y} and location : ${x1} ${y1} ${x2} ${y2}`
      );
    }

    if (t < TOOSMALLBOXAREA) {
      if (SHOWCOMMENTSsmall) {
        console.log('Too small');
      }
      continue;
    }

    const tooBigThresh = TOOBIGBOXAREA;
    if (X * Y > tooBigThresh) {
      if (SHOWCOMMENTSsmall) {
        console.log(`Too big ${X * Y} > ${tooBigThresh}`);
      }
      continue;
    }
    const pixels: myPixel[][] = new Array(x2 - x1 + 1);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = new Array(y2 - y1 + 1);
      for (let j = 0; j < pixels[i].length; j++) {
        const pixs: myPixel = new myPixel();
        pixs.x = x1 + i;
        pixs.y = y1 + j;
        pixs.component = Util.getPixel(pix, pixs.x, pixs.y, canvas.width);
        pixels[i][j] = pixs;
      }
    }
    const douglasPeuckerThresh: number = DOUGLASPEUCKERTHRESH * t,
      [rad, confidence] = symbolHelp(
        pixels,
        douglasPeuckerThresh,
        box[i],
        canvas
      );
    endtime = Date.now() - start;
    const totaltime = endtime - starttime;
    if (rad != null) {
      RadicalFound = true;
      console.log(
        `BOX-${
          i + 1
        }: dimensions: ${X} ${Y} and location : ${x1} ${y1} ${x2} ${y2} GOT SYMBOL, with confidence ${confidence}, with total time: ${totaltime} ms`
      );
    }

    if (SHOWCOMMENTSsmall) {
      console.log(`Total time taken = ${totaltime}`);
    }
    TotalTimePage += totaltime;
    if (SHOWCOMMENTS) {
      console.log(
        `Thinning time = ${thinningTime}, ${
          (thinningTime / totaltime) * 100
        } percent time spent`
      );
    }
    if (SHOWCOMMENTS) {
      console.log(
        `Forest gen time = ${forestGenTime}, ${
          (forestGenTime / totaltime) * 100
        } percent time spent`
      );
    }
    if (SHOWCOMMENTS) {
      console.log(
        `Draw time = ${drawTime}, ${
          (drawTime / totaltime) * 100
        } percent time spent`
      );
    }
    if (SHOWCOMMENTS) {
      for (let i = 0; i < numFunctions; i++) {
        console.log(`for heuristic ${i}, for ${revFuncitonCodes[i]}`);
        console.log(
          `Clustering time = ${clusterGenTime[i]}, ${
            (clusterGenTime[i] / totaltime) * 100
          } percent time spent`
        );
        console.log(
          `Heuristic time = ${heuristicsTime[i]}, ${
            (heuristicsTime[i] / totaltime) * 100
          } percent time spent`
        );
      }
    }
  }
  end = Date.now();
  previous = Date.now();
  TotalTimePage = end - start;
  console.log(`TOTAL TIME FOR PAGE = ${TotalTimePage}`);
  return RadicalFound;
};

/**
 * Binarises given image
 */
export const preprocess = function (pixels: myPixel[][]): myPixel[][] {
  pixels = arrow.toGrayScale(pixels);
  // Pixels = arrow.gaussianblur(pixels);
  return pixels;
};

/**
 *
 * @param pixels Pixels of the bounding box in focus
 * @param thresh Threshold for Douglas-Peucker
 * @param box Bounding box in focus
 * @param canvas Canvas
 * @returns Information about Radical, if detected
 */

export const symbolHelp = function (
  pixels: myPixel[][],
  douglasPeuckerThresh: number,
  box: Bbox,
  canvas: Canvas
): [any, number] {
  previous = Date.now();
  pixels = preprocess(pixels);

  const threshPercentColored = PERCENTCOLOREDTHRESH,
    percentColored: number = percentage_pixels_colored(pixels);

  if (percentColored > threshPercentColored) {
    if (SHOWCOMMENTSsmall) {
      console.log(
        `Too much percent colored, with thresh = ${threshPercentColored} and percentage = ${percentColored}`
      );
    }
    return [null, 0];
  }
  pixels = thinning_zhang_suen(pixels);
  thinningTime = Date.now() - previous;
  previous = Date.now();
  if (SHOWTHINNEDIMAGE) {
    colorOnCanvas(pixels, box, canvas);
  }

  // STEP 2: Obtain raw forest of feature-points from thinned image
  const rawForest: Forest = forestmain(pixels, douglasPeuckerThresh);
  if (rawForest.adjList == null) {
    return [null, 0];
  }
  forestGenTime = Date.now() - previous;
  previous = Date.now();

  // Split into heuristics
  confidenceScores = [];
  symbols = [];
  forests = [];
  for (let i = 0; i < numFunctions; i++) {
    const [symbol, confidence] = functions[i](rawForest, box);
    if (SHOWCOMMENTSsmall) {
      console.log(`${revFuncitonCodes[i]} has confidence +${confidence}`);
    }
    confidenceScores.push(confidence);
    symbols.push(symbol);

    heuristicsTime.push(Date.now() - previous);
    previous = Date.now();
  }

  let maxConfidence = 0;
  confidenceScores.forEach((confidence) => {
    maxConfidence = Math.max(maxConfidence, confidence);
  });

  let rad: Radical;
  for (let i = 0; i < confidenceScores.length; ++i) {
    if (Math.abs(confidenceScores[i] - maxConfidence) < 0.0001) {
      if (maxConfidence < CONFIDENCETHRESH[i]) {
        if (SHOWCOMMENTSsmall) {
          console.log('NO SYMBOL DETECTED');
        }
        if (SHOWFOREST) {
          rawForest.dispForest(box, canvas);
          // Forests[i].dispForest(box, canvas);
          drawTime = Date.now() - previous;
          previous = Date.now();
        }
        return [null, 0];
      }
      if (SHOWFOREST) {
        forests[i].dispForest(box, canvas, '#00FF00');
        drawTime = Date.now() - previous;
        previous = Date.now();
      }
      if (SHOWCOMMENTSsmall) {
        console.log('GOT SYMBOL!');
      }
      if (i == 0) {
        rad = symbols[i];
      }
      break;
    }
  }
  if (DRAWBOX) {
    box.draw(canvas, '#00FF00');
  }
  // Return the symbol with the highest confidence, now there is only one, a radical
  return [rad, maxConfidence];
};

/**
 * Detects radicals in the input forest
 * @param forest Forest to be studied
 * @param box Bounding box containing forest
 * @returns detected Radical, if one exists
 */

export const checkRadicalinForest = function (
  rawForest: Forest,
  box: Bbox
): [Radical, number] {
  if (rawForest == null) {
    return null;
  }

  const [x1, y1, x2, y2] = box.box(),
    X = x2 - x1,
    Y = y2 - y1,
    t = Math.min(X, Y);
  if (X == 0 || Y == 0) {
    return [null, 0];
  }

  // STEP 3: Cluster forest
  let forest = rawForest,
    forest2 = rawForest;
  const thresh1 = t * CLUSTHRESH,
    thresh2 = t * CLUSTHRESH;
  forest = clusterForest(forest, thresh1);
  const degOfTol = DEGREEOFTOLFORSTRAIGHTENFOREST;
  forest = straightenForest(forest, degOfTol);

  clusterGenTime.push((Date.now() - previous) * 2);
  previous = Date.now();

  forests.push(forest);
  // Forest.dispForest(box, CANVAS);

  const [rad1, confidence1] = chkRadOne(forest, box);
  forest2 = clusterForest(forest2, thresh1 + 0.02, thresh2, 2);
  forest2 = straightenForest(forest2, degOfTol);

  const [rad2, confidence2] = chkRadTwo(forest2, box);

  if (SHOWCOMMENTS) {
    console.log(`confidence for radicals: ${confidence1} ${confidence2}`);
  }

  if (confidence1 >= confidence2) {
    return [rad1, confidence1];
  }

  forests.splice(forests.length - 1, 1);
  forests.push(forest2);
  return [rad2, confidence2];
};

// Util function to calculate confidence score of one part
const calc = function (
    val: number,
    mean: number,
    smallTol: number,
    tol: number
  ): number {
    const dev = Math.abs(val - mean);
    if (dev > tol) {
      return 0;
    }
    if (dev <= smallTol) {
      return 1;
    }
    return Math.max(0, 1 - (dev - smallTol) / (tol - smallTol));
  },
  // Calculates confidence given two means, and two boundaries; linearly interpolates between 0 and 100 between a mean and a boundary
  calc2 = function (
    val: number,
    mean1: number,
    mean2: number,
    boundary1: number,
    boundary2: number
  ): number {
    if (boundary1 >= boundary2) {
      return 0;
    }
    if (mean1 >= mean2) {
      mean1 = (boundary1 + boundary2) / 2;
      mean2 = mean1;
    }
    if (val <= boundary1 || val >= boundary2) {
      return 0;
    }
    if (val >= mean1 && val <= mean2) {
      return 1;
    }
    if (val < mean1) {
      return (val - boundary1) / (mean1 - boundary1);
    }
    if (val > mean2) {
      return (boundary2 - val) / (boundary2 - mean2);
    }
  },
  // Combines confidence scores
  calcConf = function (
    confidenceMetric: number,
    confidenceMap: Map<string, number>
  ): number {
    let confidence = 0,
      numActualFeatures = 0;
    for (const confidenceScore of confidenceMap) {
      confidence +=
        (confidenceMetric - confidenceScore[1]) *
        (confidenceMetric - confidenceScore[1]);
      ++numActualFeatures;
    }
    if (numActualFeatures == 0) {
      return 0;
    }
    if (numActualFeatures > 0) {
      confidence /= numActualFeatures;
    }
    confidence = Math.sqrt(confidence);
    confidence = confidenceMetric - confidence;
    return confidence;
  };

// Checks for radical with an overhead bar
export const chkRadOne = function (
  forest: Forest,
  box: Bbox
): [Radical, number] {
  const confidenceMap: Map<string, number> = new Map(),
    [x1, y1, x2, y2] = box.box(),
    X = x2 - x1,
    Y = y2 - y1;
  if (X == 0 || Y == 0) {
    return [null, 0];
  }

  const pixels: myPixel[] = [];
  let ok = true;
  const bigthresh = 0.8,
    smallthresh = 0.6,
    // LIST OF CONSTANTS USED:
    TOPRIGHTX = x2,
    TOPRIGHTY = y1;
  (1 - smallthresh) * X;
  (1 - bigthresh) * Y;
  const TOPRIGHTTOLX = 0.5 * X,
    TOPRIGHTTOLY = (1 - bigthresh) * Y,
    TOPBARELEVATION = 0,
    TOPBARELEVATIONTOLsmall = 0,
    TOPBARELEVATIONTOL = 60,
    SLANTELEVATION = 75,
    SLANTELEVATIONTOLsmall = 8,
    SLANTELEVATIONTOL = 38,
    TAILELEVATION = 132,
    TAILELEVATIONTOL = 60,
    TAILELEVATIONMEAN1 = 105,
    TAILELEVATIONMEAN2 = 160,
    TAILELEVATIONBOUNDARY1 = 70,
    TAILELEVATIONBOUNDARY2 = 195,
    TAILABSENCEPENALTY = 0.98,
    CONFIDENCEMETRICRAD1 = 1.5,
    CONFIDENCEMETRICRAD1notail = 1.1,
    BOTTOMPOINTY = y2;
  (1 - bigthresh) * Y;
  const BOTTOMPOINTYTOL = 0.3 * Y,
    /*
     * Let BOTTOMPOINTX = x1 + Y*0.27;
     * Let BOTTOMPOINTXTOLsmall = Y* 0.12;
     * Let BOTTOMPOINTXTOL = Y* 0.27;
     */

    BOTTOMPOINTXMEAN1 = x1 + Y * 0.17,
    BOTTOMPOINTXMEAN2 = x1 + Math.max(Y * 0.38),
    BOTTOMPOINTXBOUNDARY1 = x1 - Y * 0.08,
    BOTTOMPOINTXBOUNDARY2 = Math.max(x2, Y),
    TAILPOINTMEAN1 = y1 + smallthresh * Y,
    TAILPOINTMEAN2 = y2 + 1,
    TAILPOINTBOUNDARY1 = y1,
    TAILPOINTBOUNDARY2 = y2 + 5,
    ELEGAP = Math.abs(TAILELEVATION - SLANTELEVATION), // Gap between slant line and tail
    ELEGAPTOL = 80,
    TAILSLANTLENGTHTHRESH = 0.8,
    LASTBITELEVATION = 40,
    LASTBITELEVATIONTOLsmall = 30,
    LASTBITELEVATIONTOL = 55,
    topRightCorner = new myPixel();
  let confidence = 0,
    numFeatures = 0,
    numActualFeatures = 0,
    pos: myPixel = new myPixel();
  pos.x = -1;
  pos.y = 1e9;
  let minDist = 1e9;
  topRightCorner.x = x2;
  topRightCorner.y = y1;
  if (SHOWCOMMENTS) {
    console.log('List of features: ');
  }
  for (const feature of forest.adjList.keys()) {
    const dist = arrow.distance(topRightCorner, feature);
    if (minDist > dist) {
      minDist = dist;
      pos = feature;
    }
    if (SHOWCOMMENTS) {
      console.log(`${feature.x} ${feature.y}`);
    }
    numFeatures++;
  }

  if (pos.x < 0) {
    if (SHOWCOMMENTS) {
      console.log('No features!');
    }
    return [null, 0];
  }

  if (
    Math.abs(pos.x - TOPRIGHTX) >= TOPRIGHTTOLX ||
    Math.abs(pos.y - TOPRIGHTY) >= TOPRIGHTTOLY
  ) {
    ok = false;
  }

  if (SHOWCOMMENTS) {
    console.log(`location of top-right = ${pos.x} ${pos.y}`);
  }

  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(`top-right position problem, rad1, at ${pos.x} ${pos.y}`);
    }
    return [null, 0];
  }
  if (forest.adjList.get(pos).length != 1) {
    ok = false;
  }
  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(
        `top-right prob, with degree ${forest.adjList.get(pos).length}`
      );
    }
    return [null, 0];
  }
  pixels.push(pos);
  pos = forest.adjList.get(pixels[0])[0];
  let topBarElevation = elevation(pos, pixels[0]);
  if (topBarElevation > 90) {
    topBarElevation = 180 - topBarElevation;
  }

  confidence *=
    1 - Math.abs(topBarElevation - TOPBARELEVATION) / TOPBARELEVATIONTOL;
  if (SHOWCOMMENTS) {
    console.log(`topBarElevation = ${topBarElevation}`);
  }
  confidenceMap.set(
    'topBarElevation',
    calc(
      topBarElevation,
      TOPBARELEVATION,
      TOPBARELEVATIONTOLsmall,
      TOPBARELEVATIONTOL
    )
  );
  numActualFeatures++;

  if (forest.adjList.get(pos).length != 2) {
    ok = false;
  }
  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(
        `top bar elevation problem: rad1, with ele = ${topBarElevation} and points ${
          pixels[0].x
        } ${pixels[0].y} ${pos.x} ${pos.y} with degree = ${
          forest.adjList.get(pos).length
        }`
      );
      for (let i = 0; i < forest.adjList.get(pos).length; ++i) {
        console.log(forest.adjList.get(pos)[i]);
      }
    }
    return [null, 0];
  }
  pixels.push(pos);
  pos = forest.adjList.get(pixels[1])[0];
  if (pos.x == pixels[0].x && pos.y == pixels[0].y) {
    pos = forest.adjList.get(pixels[1])[1];
  }

  const slantELevation = elevation(pixels[1], pos);

  confidence *=
    1 - Math.abs(slantELevation - SLANTELEVATION) / SLANTELEVATIONTOL;
  if (SHOWCOMMENTS) {
    console.log(`slantELevation = ${slantELevation}`);
  }
  confidenceMap.set(
    'slantElevtion',
    calc(
      slantELevation,
      SLANTELEVATION,
      SLANTELEVATIONTOLsmall,
      SLANTELEVATIONTOL
    )
  );
  numActualFeatures++;

  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(`slant elevation problem, with ele = ${slantELevation}`);
    }
    return [null, 0];
  }

  if (Math.abs(pos.y - BOTTOMPOINTY) >= BOTTOMPOINTYTOL) {
    ok = false;
  }
  confidenceMap.set(
    'bottomPointX',
    calc2(
      pos.x,
      BOTTOMPOINTXMEAN1,
      BOTTOMPOINTXMEAN2,
      BOTTOMPOINTXBOUNDARY1,
      BOTTOMPOINTXBOUNDARY2
    )
  );
  numActualFeatures++;

  if (forest.adjList.get(pos).length > 2) {
    ok = false;
  }
  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(
        `bottom point location problem, with pos = ${pos.x} ${
          pos.y
        } with degree = ${forest.adjList.get(pos).length}`
      );
    }
    return [null, 0];
  }
  pixels.push(pos);

  if (forest.adjList.get(pixels[2]).length >= 2) {
    if (forest.adjList.get(pixels[2]).length > 2) {
      if (SHOWCOMMENTS) {
        console.log(
          `bottom point deg = ${forest.adjList.get(pixels[2]).length}`
        );
      }
      ok = false;
      return [null, 0];
    }
    if (
      forest.adjList.get(pixels[2])[0].x == pixels[1].x &&
      forest.adjList.get(pixels[2])[0].y == pixels[1].y
    ) {
      pos = forest.adjList.get(pixels[2])[1];
    } else {
      pos = forest.adjList.get(pixels[2])[0];
    }
    pixels.push(pos);

    const tailElevation = elevation(pixels[2], pixels[3]);

    if (
      pixels[3].y > pixels[2].y ||
      (tailElevation > 160 && pixels[3].x > pixels[2].x)
    ) {
      ok = false;
    }
    if (!ok) {
      if (SHOWCOMMENTS) {
        console.log(
          `tailEnd unusually placed w.r.t. bottomPoint, bottomPoint: ${pixels[2].x} ${pixels[2].y} tailEnd: ${pixels[3].x} ${pixels[3].y}`
        );
      }
      return [null, 0];
    }

    if (Math.abs(tailElevation - TAILELEVATION) >= TAILELEVATIONTOL) {
      ok = false;
      if (SHOWCOMMENTS) {
        console.log(
          `tail elevation problem, rad1, with ele = ${tailElevation}`
        );
      }
      return [null, 0];
    }
    if (SHOWCOMMENTS) {
      console.log(`tailElevation = ${tailElevation}`);
    }
    confidenceMap.set(
      'tailElevation',
      calc2(
        tailElevation,
        TAILELEVATIONMEAN1,
        TAILELEVATIONMEAN2,
        TAILELEVATIONBOUNDARY1,
        TAILELEVATIONBOUNDARY2
      )
    );
    numActualFeatures++;

    confidenceMap.set(
      'tailPointY',
      calc2(
        pixels[3].y,
        TAILPOINTMEAN1,
        TAILPOINTMEAN2,
        TAILPOINTBOUNDARY1,
        TAILPOINTBOUNDARY2
      )
    );
    numActualFeatures++;

    if (
      Math.abs(tailElevation - slantELevation - ELEGAP) >= ELEGAPTOL ||
      tailElevation < slantELevation
    ) {
      ok = false;
      if (SHOWCOMMENTS) {
        console.log(
          `unusual elevation gap between tail and slant line = ${
            tailElevation - slantELevation
          }`
        );
      }
      return [null, 0];
    }

    const len1 = arrow.distance(pixels[1], pixels[2]),
      len2 = arrow.distance(pixels[2], pixels[3]);
    if (len1 < TAILSLANTLENGTHTHRESH * len2) {
      ok = false;
      if (SHOWCOMMENTS) {
        console.log(`long tail, rad1: ${len1} ${len2}`);
      }
      return [null, 0];
    }

    if (forest.adjList.get(pixels[3]).length >= 2) {
      if (forest.adjList.get(pixels[3]).length > 2) {
        ok = false;
      }
      if (
        forest.adjList.get(pixels[3])[0].x == pixels[2].x &&
        forest.adjList.get(pixels[3])[0].y == pixels[2].y
      ) {
        pos = forest.adjList.get(pixels[3])[1];
      } else {
        pos = forest.adjList.get(pixels[3])[0];
      }
      pixels.push(pos);
      if (forest.adjList.get(pos).length > 1) {
        ok = false;
      }
      if (!ok) {
        if (SHOWCOMMENTS) {
          console.log('last bit problem degree, rad1');
        }
        return [null, 0];
      }

      const lastBitElevation = elevation(pixels[3], pixels[4]),
        lastBitLength = arrow.distance(pixels[3], pixels[4]);

      if (lastBitLength < Y / 3) {
        if (pixels[4].x > pixels[3].x + Math.max(5, 0.1 * X)) {
          if (SHOWCOMMENTS) {
            console.log(
              `unusual last bit position w.r.t tail, last bit pos. = ${pixels[4].x} ${pixels[4].y} and tail end pos = ${pixels[3].x} ${pixels[3].y}`
            );
          }
          ok = false;
          return [null, 0];
        }
      } else {
        if (SHOWCOMMENTS) {
          console.log(`Too large last bit, length = ${lastBitLength}`);
        }
        ok = false;
        return [null, 0];
      }
      if (
        Math.abs(lastBitElevation - LASTBITELEVATION) >= LASTBITELEVATIONTOL
      ) {
        ok = false;
        if (SHOWCOMMENTS) {
          console.log(`last bit ele prob, with ele = ${lastBitElevation}`);
        }
        return [null, 0];
      }
      confidenceMap.set(
        'lastBitElevation',
        calc(
          lastBitElevation,
          LASTBITELEVATION,
          LASTBITELEVATIONTOLsmall,
          LASTBITELEVATIONTOL
        )
      );
      numActualFeatures++;
    }
  }

  if (Math.abs(confidenceMap.get('topBarElevation')) == 0) {
    ok = false;
    if (SHOWCOMMENTS) {
      console.log(`unusual top bar elevation, at: ${topBarElevation}`);
    }
    return [null, 0];
  }
  if (SHOWCOMMENTSsmall) {
    console.log(confidenceMap);
  }

  if (confidenceMap.has('tailElevation')) {
    confidence = calcConf(CONFIDENCEMETRICRAD1, confidenceMap);
  } else {
    confidence = calcConf(CONFIDENCEMETRICRAD1notail, confidenceMap);
    confidence *= TAILABSENCEPENALTY;
  }

  if (numFeatures > numActualFeatures) {
    ok = false;
    if (SHOWCOMMENTS) {
      console.log(
        `Too many features: ${numFeatures} with actual features ${numActualFeatures}`
      );
    }
    return [null, 0];
  }

  const rad = new Radical();
  rad.pixels = pixels;
  rad.position = pixels[0];
  rad.forest = forest;

  if (SHOWCOMMENTSsmall) {
    console.log('rad1');
  }
  return [rad, confidence];
};

// Checks for radical without an overhead bar
export const chkRadTwo = function (
  forest: Forest,
  box: Bbox
): [Radical, number] {
  const confidenceMap: Map<string, number> = new Map(),
    [x1, y1, x2, y2] = box.box(),
    X = x2 - x1,
    Y = y2 - y1;
  if (X == 0 || Y == 0) {
    return [null, 0];
  }

  const pixels: myPixel[] = [];
  let ok = true;
  const bigthresh = 0.8,
    smallthresh = 0.6,
    // LIST OF CONSTANTS USED:
    TOPRIGHTX = x2,
    TOPRIGHTY = y1;
  (1 - smallthresh) * X;
  (1 - bigthresh) * Y;
  const TOPRIGHTTOLX = 0.5 * X,
    TOPRIGHTTOLY = (1 - bigthresh) * Y,
    SLANTELEVATION = 75,
    SLANTELEVATIONTOLsmall = 10,
    SLANTELEVATIONTOL = 40,
    TAILELEVATIONMEAN1 = 95,
    TAILELEVATIONMEAN2 = 140,
    TAILELEVATIONBOUNDARY1 = 70,
    TAILELEVATIONBOUNDARY2 = 175,
    CONFIDENCEMETRICRAD2 = 1.1,
    BOTTOMPOINTY = y2;
  (1 - bigthresh) * Y;
  const BOTTOMPOINTYTOL = 0.3 * Y,
    /*
     * Let BOTTOMPOINTX = x1 + Y*0.27;
     * Let BOTTOMPOINTXTOLsmall = Y* 0.1;
     * Let BOTTOMPOINTXTOL = Y* 0.27;
     */

    BOTTOMPOINTXMEAN1 = x1 + Y * 0.17,
    BOTTOMPOINTXMEAN2 = x1 + Math.max(Y * 0.38),
    BOTTOMPOINTXBOUNDARY1 = x1 - Y * 0.08,
    BOTTOMPOINTXBOUNDARY2 = Math.max(x2, Y),
    TAILPOINTMEAN1 = y1 + smallthresh * Y,
    TAILPOINTMEAN2 = y2 + 1,
    TAILPOINTBOUNDARY1 = y1,
    TAILPOINTBOUNDARY2 = y2 + 5,
    TAILSLANTLENGTHTHRESH = 0.8,
    LASTBITELEVATION = 40,
    LASTBITELEVATIONTOLsmall = 30,
    LASTBITELEVATIONTOL = 55;
  let confidence = 0,
    numFeatures = 0,
    numActualFeatures = 0,
    pos: myPixel = new myPixel();
  pos.x = -1;
  pos.y = 1e9;
  let minDist = 1e9;
  const topRightCorner = new myPixel();
  topRightCorner.x = x2;
  topRightCorner.y = y1;
  if (SHOWCOMMENTS) {
    console.log('List of features: ');
  }
  for (const feature of forest.adjList.keys()) {
    const dist = arrow.distance(topRightCorner, feature);
    if (minDist > dist) {
      minDist = dist;
      pos = feature;
    }
    if (SHOWCOMMENTS) {
      console.log(`${feature.x} ${feature.y}`);
    }
    numFeatures++;
  }
  if (pos.x < 0) {
    if (SHOWCOMMENTS) {
      console.log('No features!');
    }
    return [null, 0];
  }

  if (
    Math.abs(pos.x - TOPRIGHTX) >= TOPRIGHTTOLX ||
    Math.abs(pos.y - TOPRIGHTY) >= TOPRIGHTTOLY
  ) {
    ok = false;
  }

  if (SHOWCOMMENTS) {
    console.log(`location of top-right = ${pos.x} ${pos.y}`);
  }

  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(`top-right position problem, rad2, at ${pos.x} ${pos.y}`);
    }
    return [null, 0];
  }
  if (forest.adjList.get(pos).length != 1) {
    ok = false;
  }
  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(
        `top-right prob, with degree ${forest.adjList.get(pos).length}`
      );
    }
    return [null, 0];
  }
  pixels.push(pos);

  pos = forest.adjList.get(pixels[0])[0];
  const slantELevation = elevation(pixels[0], pos);

  confidence *=
    1 - Math.abs(slantELevation - SLANTELEVATION) / SLANTELEVATIONTOL;
  if (SHOWCOMMENTS) {
    console.log(`slantELevation = ${slantELevation}`);
  }
  numActualFeatures++;
  confidenceMap.set(
    'slantElevtion',
    calc(
      slantELevation,
      SLANTELEVATION,
      SLANTELEVATIONTOLsmall,
      SLANTELEVATIONTOL
    )
  );

  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(`slant elevation problem, with ele = ${slantELevation}`);
    }
    return [null, 0];
  }

  if (Math.abs(pos.y - BOTTOMPOINTY) >= BOTTOMPOINTYTOL) {
    ok = false;
  }
  numActualFeatures++;
  confidenceMap.set(
    'bottomPointX',
    calc2(
      pos.x,
      BOTTOMPOINTXMEAN1,
      BOTTOMPOINTXMEAN2,
      BOTTOMPOINTXBOUNDARY1,
      BOTTOMPOINTXBOUNDARY2
    )
  );

  if (forest.adjList.get(pos).length > 2) {
    ok = false;
  }
  if (!ok) {
    if (SHOWCOMMENTS) {
      console.log(
        `bottom point location problem, with pos = ${pos.x} ${
          pos.y
        } with degree = ${forest.adjList.get(pos).length}`
      );
    }
    return [null, 0];
  }
  pixels.push(pos);

  {
    if (forest.adjList.get(pixels[1]).length != 2) {
      if (SHOWCOMMENTS) {
        console.log(
          `bottom point deg = ${forest.adjList.get(pixels[1]).length}`
        );
      }
      ok = false;
      return [null, 0];
    }
    if (
      forest.adjList.get(pixels[1])[0].x == pixels[0].x &&
      forest.adjList.get(pixels[1])[0].y == pixels[0].y
    ) {
      pos = forest.adjList.get(pixels[1])[1];
    } else {
      pos = forest.adjList.get(pixels[1])[0];
    }
    pixels.push(pos);

    const tailElevation = elevation(pixels[1], pixels[2]);
    if (
      pixels[2].y > pixels[1].y ||
      (tailElevation > 160 && pixels[2].x > pixels[1].x)
    ) {
      ok = false;
    }
    if (!ok) {
      if (SHOWCOMMENTS) {
        console.log(
          `tailEnd unusually placed w.r.t. bottomPoint, bottomPoint: ${pixels[1].x} ${pixels[1].y} tailEnd: ${pixels[2].x} ${pixels[2].y}`
        );
      }
      return [null, 0];
    }

    if (SHOWCOMMENTS) {
      console.log(`tailElevation = ${tailElevation}`);
    }
    confidenceMap.set(
      'tailElevation',
      calc2(
        tailElevation,
        TAILELEVATIONMEAN1,
        TAILELEVATIONMEAN2,
        TAILELEVATIONBOUNDARY1,
        TAILELEVATIONBOUNDARY2
      )
    );
    numActualFeatures++;

    confidenceMap.set(
      'tailPointY',
      calc2(
        pixels[2].y,
        TAILPOINTMEAN1,
        TAILPOINTMEAN2,
        TAILPOINTBOUNDARY1,
        TAILPOINTBOUNDARY2
      )
    );
    numActualFeatures++;

    const len1 = arrow.distance(pixels[0], pixels[1]),
      len2 = arrow.distance(pixels[1], pixels[2]);
    if (len1 < TAILSLANTLENGTHTHRESH * len2) {
      ok = false;
      if (SHOWCOMMENTS) {
        console.log(`long tail, rad2: ${len1} ${len2}`);
      }
      return [null, 0];
    }

    if (forest.adjList.get(pixels[2]).length >= 2) {
      if (forest.adjList.get(pixels[2]).length > 2) {
        ok = false;
      }
      if (
        forest.adjList.get(pixels[2])[0].x == pixels[1].x &&
        forest.adjList.get(pixels[2])[0].y == pixels[1].y
      ) {
        pos = forest.adjList.get(pixels[2])[1];
      } else {
        pos = forest.adjList.get(pixels[2])[0];
      }
      pixels.push(pos);
      if (forest.adjList.get(pixels[3]).length > 1) {
        ok = false;
      }
      if (!ok) {
        if (SHOWCOMMENTS) {
          console.log('last bit problem degree, rad2');
        }
        return [null, 0];
      }

      const lastBitElevation = elevation(pixels[2], pixels[3]),
        lastBitLength = arrow.distance(pixels[2], pixels[3]);

      if (lastBitLength < Y / 3) {
        if (pixels[3].x > pixels[2].x + Math.max(5, 0.1 * X)) {
          if (SHOWCOMMENTS) {
            console.log(
              `unusual last bit position w.r.t tail, last bit pos. = ${pixels[3].x} ${pixels[3].y} and tail end pos = ${pixels[2].x} ${pixels[2].y}`
            );
          }
          ok = false;
          return [null, 0];
        }
      } else {
        if (SHOWCOMMENTS) {
          console.log(`Too large last bit, length = ${lastBitLength}`);
        }
        ok = false;
        return [null, 0];
      }
      if (
        Math.abs(lastBitElevation - LASTBITELEVATION) >= LASTBITELEVATIONTOL
      ) {
        ok = false;
        if (SHOWCOMMENTS) {
          console.log(`last bit ele prob, with ele = ${lastBitElevation}`);
        }
        return [null, 0];
      }
      numActualFeatures++;
      confidenceMap.set(
        'lastBitElevation',
        calc(
          lastBitElevation,
          LASTBITELEVATION,
          LASTBITELEVATIONTOLsmall,
          LASTBITELEVATIONTOL
        )
      );
    }
  }

  if (SHOWCOMMENTSsmall) {
    console.log(confidenceMap);
  }

  confidence = calcConf(CONFIDENCEMETRICRAD2, confidenceMap);

  if (numFeatures > numActualFeatures) {
    ok = false;
    if (SHOWCOMMENTS) {
      console.log(
        `Too many features: ${numFeatures} with actual features ${numActualFeatures}`
      );
    }
    return [null, 0];
  }

  const rad = new Radical();
  rad.pixels = pixels;
  rad.position = pixels[0];
  rad.forest = forest;

  if (SHOWCOMMENTSsmall) {
    console.log('rad2');
  }
  return [rad, confidence];
};

/**
 *
 * @param rawForest forest
 * @param thresh1 kernel bandwidth in the first iteration of clustering
 * @param thresh2 kernel bandwidth in the reamining iterations of clustering
 * @param iters no. of iterations of clustering to be done on the forest
 * @returns clustered forest
 */
const clusterForest = function (
  rawForest: Forest,
  thresh1: number,
  thresh2 = 0.02,
  iters = 1
): Forest {
  let forest = rawForest;
  for (let it = 0; it < iters; it++) {
    const pixList: myPixel[] = [];
    for (const key of forest.adjList.keys()) {
      pixList.push(key);
    }
    let kernel_bandwidth = thresh1;
    if (it > 0) {
      kernel_bandwidth = thresh2;
    }
    const clusters: Cluster[] = cluster(pixList, kernel_bandwidth);

    forest = getForestfromRaw(clusters, forest);
  } // Cluster feature points to eliminate undesired features due to thinning    // Mean Shift Clustering  // TODO: 3 TIMES ?
  return forest;
};

/**
 * Helper function to build the forest after clustering
 * @param clusters Clusters obtaained from raw forest
 * @param rawForest the raw forest
 * @returns forest after clustering nearby points in raw forest
 */
export const getForestfromRaw = function (
  clusters: Cluster[],
  rawForest: Forest
): Forest {
  const forest: Forest = new Forest();
  clusters.forEach((clus) => {
    forest.adjList.set(clus.mode, []);
  });
  for (let i = 0; i < clusters.length; ++i) {
    const neigh: Set<myPixel> = new Set();
    clusters[i].original_points.forEach((element) => {
      rawForest.adjList.get(element).forEach((neighbour) => {
        neigh.add(neighbour);
      });
    });
    for (let j = i + 1; j < clusters.length; ++j) {
      // Clus_i, clus_j
      for (let it = 0; it < clusters[j].original_points.length; ++it) {
        const element: myPixel = clusters[j].original_points[it];
        if (neigh.has(element)) {
          forest.adjList.get(clusters[i].mode).push(clusters[j].mode);
          forest.adjList.get(clusters[j].mode).push(clusters[i].mode);
          break;
        }
      }
    }
  }
  return forest;
};

/**
 *
 * @param forest Forest to be straightened
 * @param degOfTol angle to be ignored
 * @returns Straightened forest: any point with two neighbours at an angle 180 - degOfTol or more is removed
 */
const straightenForest = function (forest: Forest, degOfTol: number): Forest {
  const adj = forest.adjList;
  let iters = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    iters++;
    // If(iters%100 == 0) console.log(iters);
    let isb = true;
    for (const point of adj) {
      if (point[1].length == 2) {
        const ele1 = elevation(point[0], point[1][0]),
          ele2 = elevation(point[0], point[1][1]);
        if (
          Math.abs(ele1 - ele2) > degOfTol &&
          180 - Math.max(ele1, ele2) + Math.min(ele1, ele2) > degOfTol
        ) {
          continue;
        }

        const pix0: myPixel[] = adj.get(point[1][0]);

        /*
         * If(pix0 == null) { console.log("ABORT! straightenForest; pix0 null"); continue;}
         * If(pix0.length<1){ console.log("ABORT! straightenForest; pix0 length0"); continue;}
         */
        pix0.push(point[1][1]);
        for (let it = 0; it < pix0.length; it++) {
          if (pix0[it].x == point[0].x && pix0[it].y == point[0].y) {
            pix0.splice(it, 1);
            break;
          }
        }

        const pix1: myPixel[] = adj.get(point[1][1]);

        /*
         * If(pix1 == null) { console.log("ABORT! straightenForest; pix1 null"); continue;}
         * If(pix1.length<1){ console.log("ABORT! straightenForest; pix1 length0"); continue;}
         */
        pix1.push(point[1][0]);
        for (let it = 0; it < pix1.length; it++) {
          if (pix1[it].x == point[0].x && pix1[it].y == point[0].y) {
            pix1.splice(it, 1);
            break;
          }
        }
        adj.delete(point[0]);
        isb = false;
        break;
      }
    }
    if (isb || iters > 10000) {
      break;
    }
  }
  for (const point of adj) {
    for (let it = 0; it < point[1].length; it++) {
      if (point[1][it].x == point[0].x && point[1][it].y == point[0].y) {
        point[1].splice(it, 1);
        it--;
      }
    }
  }
  return forest;
};

/**
 * Thins a binary image
 * @param pixels Binary Pixels to thin
 * @returns Thinned image, Zhen-Shuan Algorithm; Also removes double layer. CAUTION: Can cause a one-pixel gap in connected figues.
 */
export const thinning_zhang_suen = function (pixels: myPixel[][]): myPixel[][] {
  let changes2 = 0,
    // Console.log("Thinning");
    even_iter = true,
    iters = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    iters++;
    // If(iters%100 == 0) console.log(iters);
    if (iters > 500) {
      console.log(`Too many iterations in thinning! ${iters} breaking`);
      break;
    }
    // Keep thinning till no change

    const marker: boolean[][] = new Array(pixels.length);
    for (let i = 1; i < pixels.length - 1; i++) {
      marker[i] = new Array(pixels[i].length);
      for (let j = 1; j < pixels[i].length - 1; j++) {
        const p: number[] = new Array(8);

        /*
         *
         *P7 p0 p1
         *p6    p2
         *p5 p4 p3
         *
         */
        p[0] = pixels[i - 1][j].component[0] == 255 ? 0 : 1;
        p[1] = pixels[i - 1][j + 1].component[0] == 255 ? 0 : 1;
        p[2] = pixels[i][j + 1].component[0] == 255 ? 0 : 1;
        p[3] = pixels[i + 1][j + 1].component[0] == 255 ? 0 : 1;
        p[4] = pixels[i + 1][j].component[0] == 255 ? 0 : 1;
        p[5] = pixels[i + 1][j - 1].component[0] == 255 ? 0 : 1;
        p[6] = pixels[i][j - 1].component[0] == 255 ? 0 : 1;
        p[7] = pixels[i - 1][j - 1].component[0] == 255 ? 0 : 1;

        const A: number =
          (p[0] == 0 && p[1] == 1 ? 1 : 0) +
          (p[1] == 0 && p[2] == 1 ? 1 : 0) +
          (p[2] == 0 && p[3] == 1 ? 1 : 0) +
          (p[3] == 0 && p[4] == 1 ? 1 : 0) +
          (p[4] == 0 && p[5] == 1 ? 1 : 0) +
          (p[5] == 0 && p[6] == 1 ? 1 : 0) +
          (p[6] == 0 && p[7] == 1 ? 1 : 0) +
          (p[7] == 0 && p[0] == 1 ? 1 : 0);
        let B = 0;
        for (let it = 0; it < 8; it++) {
          B += p[it];
        }
        const m1 = even_iter ? p[0] * p[2] * p[4] : p[0] * p[2] * p[6],
          m2 = even_iter ? p[2] * p[4] * p[6] : p[0] * p[4] * p[6];

        if (A == 1 && B >= 2 && B <= 6 && m1 == 0 && m2 == 0) {
          marker[i][j] = true;
        } else {
          marker[i][j] = false;
        }
      }
    }
    even_iter = !even_iter;

    for (let i = 1; i < pixels.length - 1; i++) {
      for (let j = 1; j < pixels[i].length - 1; j++) {
        if (marker[i][j]) {
          if (pixels[i][j].component[0] == 0) {
            changes2++;
          }
          pixels[i][j].component[0] = 255;
          pixels[i][j].component[1] = 255;
          pixels[i][j].component[2] = 255;
        }
      }
    }
    if (even_iter) {
      if (changes2 == 0) {
        break;
      }
      changes2 = 0;
    }
  }
  if (SHOWCOMMENTS) {
    console.log(`Thinning done in ${iters} iterations`);
  }
  remDoubleLayer(pixels);
  return pixels;
};
// Removes extra pixels not removed in thinning
/*
 *
 *P0 p1
 *   p2
 *Here, p1 will be removed
 */
export const remDoubleLayer = function (pixels: myPixel[][]) {
  for (let i = 0; i < pixels.length - 1; i++) {
    for (let j = 0; j < pixels[i].length - 1; j++) {
      if (
        pixels[i][j].component[0] == 0 &&
        pixels[i + 1][j + 1].component[0] == 0
      ) {
        pixels[i + 1][j].component[0] = 255;
        pixels[i + 1][j].component[1] = 255;
        pixels[i + 1][j].component[2] = 255;

        pixels[i][j + 1].component[0] = 255;
        pixels[i][j + 1].component[1] = 255;
        pixels[i][j + 1].component[2] = 255;
      }
      if (
        pixels[i + 1][j].component[0] == 0 &&
        pixels[i][j + 1].component[0] == 0
      ) {
        pixels[i + 1][j + 1].component[0] = 255;
        pixels[i + 1][j + 1].component[1] = 255;
        pixels[i + 1][j + 1].component[2] = 255;

        pixels[i][j].component[0] = 255;
        pixels[i][j].component[1] = 255;
        pixels[i][j].component[2] = 255;
      }
    }
  }
  return pixels;
};

/**
 * Retuns angle of elevation of a line joining two given points
 */
export const elevation = function (Pix0: myPixel, Pix1: myPixel) {
  const pix0 = new myPixel();
  pix0.x = Pix0.x;
  pix0.y = Pix0.y;
  const pix1 = new myPixel();
  pix1.x = Pix1.x;
  pix1.y = Pix1.y;
  if (pix0.x == pix1.x) {
    if (pix0.y == pix1.y) {
      if (SHOWCOMMENTS) {
        console.log('same point elevation');
      }
      return 0;
    }
    return 90;
  }
  let theta = (pix0.y - pix1.y) / (pix0.x - pix1.x);
  theta = Math.atan(theta);
  theta = (theta * 180) / Math.PI;
  if (theta < 0) {
    theta += 180;
  }
  return 180 - theta;
};

/**
 * CAUTION: Overwrites on canvas in the bounding box, irreversibly
 * @param pixels to be shown
 * @param box coresponding bounding box
 * @param canvas Canvas on which to paint
 */
export const colorOnCanvas = function (
  pixels: myPixel[][],
  box: Bbox,
  canvas: Canvas
) {
  const ctx = canvas.getContext();
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < pixels.length; ++i) {
    for (let j = 0; j < pixels[i].length; ++j) {
      const pix: myPixel = pixels[i][j];
      // If(pix.component[0] > 0) continue;
      ctx.fillRect(pix.x, pix.y, 1, 1);
    }
  }
  const cr = `rgb(${Math.floor(Math.random() * 256)},${Math.floor(
    Math.random() * 256
  )},${Math.floor(Math.random() * 256)})`;
  ctx.fillStyle = cr;
  for (let i = 0; i < pixels.length; ++i) {
    for (let j = 0; j < pixels[i].length; ++j) {
      const pix: myPixel = pixels[i][j];
      if (pix.component[0] > 0) {
        continue;
      }
      ctx.fillRect(pix.x, pix.y, 1, 1);
    }
  }
};

/**
 * Marks a given list of points on canvas
 * @param pixels List of pixels to mark
 * @param box Corresponding bounding box
 * @param canvas Corresponding canvas
 */
export const MarkPointsOnCanvas = function (
  pixels: myPixel[],
  box: Bbox,
  canvas: Canvas,
  style = '#FF0000'
) {
  const ctx = canvas.getContext(),
    cr = `rgb(${Math.floor(Math.random() * 256)},${Math.floor(
      Math.random() * 256
    )},${Math.floor(Math.random() * 256)})`;
  ctx.fillStyle = cr;
  ctx.fillStyle = style;
  for (let i = 0; i < pixels.length; ++i) {
    const pix: myPixel = pixels[i];
    if (pix.component[0] > 0) {
      continue;
    }
    ctx.fillRect(pix.x, pix.y, 1, 1);
  }
};

/**
 * Util function to draw a line between two given points
 * @param a First pixel
 * @param b Last pixel
 * @param canvas Corresponding canvas
 * @param style Hex code of color of line desired
 * @param thick thickness of line desired in pixels
 * @returns
 */
export const draw_util = function (
  a: myPixel,
  b: myPixel,
  canvas: Canvas,
  style = '#FF0000',
  thick = 1
) {
  const ctx = canvas.getContext();
  ctx.fillStyle = style;

  if (a.x == b.x) {
    for (let i = a.y; i <= b.y; i++) {
      ctx.fillRect(Math.floor(a.x), i, thick, thick);
    }
    return;
  }
  if (a.y == b.y) {
    for (let i = a.x; i <= b.x; i++) {
      ctx.fillRect(i, Math.floor(a.y), thick, thick);
    }
    return;
  }

  if (a.x > b.x || (a.x == b.x && a.y > b.y)) {
    const temp = a;
    a = b;
    b = temp;
  }

  const mul: number = (b.y - a.y) / (b.x - a.x);

  let /* prev_x = -1,
    prev_y = -1, */
    cur_x = -1,
    cur_y = -1;
  for (let i = a.x; i <= b.x; i++) {
    const j = (i - a.x) * mul + a.y;
    cur_x = Math.floor(i);
    cur_y = Math.floor(j);
    ctx.fillRect(cur_x, cur_y, thick, thick);
    /* 
    prev_x = cur_x;
    prev_y = cur_y; */
  }

  if (a.y > b.y || (a.y == b.y && a.x > b.x)) {
    const temp: myPixel = a;
    a = b;
    b = temp;
  }

  const mulx: number = (b.x - a.x) / (b.y - a.y);

  for (let i = a.y; i <= b.y; ++i) {
    const j = (i - a.y) * mulx + a.x;
    cur_y = Math.floor(i);
    cur_x = Math.floor(j);
    ctx.fillRect(cur_x, cur_y, thick, thick);
    /*  prev_x = cur_x;
    prev_y = cur_y; */
  }
};

/**
 *
 * @param pixels
 * @returns percentage of colored area
 */
export const percentage_pixels_colored = function (
  pixels: myPixel[][]
): number {
  if (pixels.length == 0) {
    return 0;
  }
  const total = pixels.length * pixels[0].length;
  if (total == 0) {
    return 0;
  }
  let white = 0;
  for (let i = 0; i < pixels.length; i++) {
    for (let j = 0; j < pixels[0].length; j++) {
      const info = pixels[i][j].component;
      if (info[0] > 200 && info[1] > 200 && info[2] > 200) {
        white++;
      }
    }
  }
  return 100 - (white / total) * 100;
};
