import { Util } from '../utility/utils';
import Bbox from '../utility/bbox';
import Canvas from '../utility/canvas';

// Custom classes for arrow detection component
export class Arrow {
  public type: string;

  public box_num: number;

  public style: string;

  constructor(type: string, style: string) {
    this.type = type;
    this.style = style;
    this.box_num = 0;
  }
}

export class Edge {
  public pixels: myPixel[];

  public endpoints: myPixel[];

  public rho: number;

  public theta: number;

  public cover_pixel: number; // This is an array of pixels around the edge. This is used in

  // Check_lines function to reduce false positives
  constructor() {
    this.pixels = [];
    this.endpoints = [];
    this.rho = 0; // This is the distance from the origin to the edge
    // (origin here is top left corner of bounding box)
    this.theta = 0; // Orientation of the edge
    this.cover_pixel = 0;
  }

  public draw(c: Canvas, style: string) {
    const ctx = c.getContext();
    for (let i = 0; i < this.pixels.length; i++) {
      ctx.fillStyle = style;
      ctx.fillRect(this.pixels[i].x, this.pixels[i].y, 1, 1);
    }
  }
}

/*
 * This class contains all pixel information necessary for edge detection,
 * Such as edge gradients in x and y direction, total gradient value
 */
export class myPixel {
  public x: number;

  public y: number;

  public component: number[];

  public eg: number; // Total edge gradient value

  public xg: number; // Gradient in x direction

  public yg: number; // Gradient in y direction

  public gt: number; // Denotes the direction of final gradient (gradient tangent)

  constructor() {
    this.x = 0;
    this.y = 0;
    this.component = new Array(4);
    this.eg = -1;
    this.xg = this.yg = 0;
    this.gt = 3; // -2,-1,0,1,2
  }

  public toString(): string {
    let s = 'rgba(';
    for (let i = 0; i < 3; i++) {
      s += this.component[i].toString();
      s += ',';
    }
    s += '1)';
    return s;
  }
}
// /////////////////

// Thresholds and other vectors for arrow component
export let xgf: number[];
export let ygf: number[];
export const xgfsize = 3;
export const ygfsize = 3;
export const sigmagb = 1;
export const edgethres1 = 600;
export const edgethres2 = 500;
export const grey_thres = 100;
export const ai = 10; // Intervals of angles considered for lines
export const li = 70; // Threshold for arrowbodies
export const strip_w = 5; // Strip width to detect arrow-heads
export const t = 0; // Minimum of length and width of bounding box
export const t2 = 0; // Maximum of length and width of bounding box
export let head: Edge[];

// Converts input coloured pixel grid to grayscale
export const toGrayScale = function (pixels: myPixel[][]): myPixel[][] {
  if (pixels == null) {
    return null;
  }
  for (let i = 0; i < pixels.length; i++) {
    for (let j = 0; j < pixels[i].length; j++) {
      const pixs: myPixel = pixels[i][j],
        comp: number[] = pixs.component;
      // Following is the accepted formula to convert RGB -> Grayscale
      let graynum: number = Math.round(
        0.299 * comp[0] + 0.587 * comp[1] + 0.114 * comp[2]
      );
      if (graynum < 230) {
        graynum = 0;
      } else {
        graynum = 255;
      }
      comp[0] = comp[1] = comp[2] = graynum;
      pixs.component = comp;
      pixels[i][j] = pixs;
    }
  }
  return pixels;
};

/*
 * Following applies gaussian blur to input pixel grid
 * This is adjusted according to arrow component, for which the convolution kernel
 * Is assumed to be 3x3 matrix. Also, this will thicken the thin lines
 * That usually appears incase of text arrows
 * To change dimensions of Gaussian Kernel, adjust xgf and ygf (global constants).
 */
export const gaussian_filter_update = function (): void {
  const den: number = 2 * this.sigmagb * this.sigmagb,
    numx: number = (this.xgfsize - 1) / 2,
    numy: number = (this.ygfsize - 1) / 2,
    den2: number = Math.sqrt(Math.PI * 2) * this.sigmagb;
  let sum = 0;
  this.xgf = new Array(this.xgfsize);
  this.ygf = new Array(this.ygfsize);
  for (let i = -1 * numx; i <= numx; i++) {
    this.xgf[i + numx] = Math.exp((-1 * i * i) / den) / den2;
    sum += this.xgf[i + numx];
  }
  for (let i = -1 * numx; i <= numx; i++) {
    this.xgf[i + numx] /= sum;
  }
  sum = 0;
  for (let i = -1 * numy; i <= numy; i++) {
    this.ygf[i + numy] = Math.exp((-1 * i * i) / den) / den2;
    sum += this.ygf[i + numy];
  }
  for (let i = -1 * numy; i <= numy; i++) {
    this.ygf[i + numy] /= sum;
  }
};

/*
 * Most of the arrows are too thin, and the edge detection algorithm fails to detect edges around them.
 * Therefore, a thickening of the pixels is done by using Gaussian blur and then darkening the resulting pixels.
 * Following applies gaussian blur to input pixel grid
 * This is adjusted according to arrow component, for which the convolution kernel
 * Is assumed to be 3x3 matrix (can change by changing xgfsize and ygfsize which are global variables).
 */

export const gaussianblur = function (pixels: myPixel[][]): myPixel[][] {
  if (pixels == null) {
    return null;
  }
  // ////////////////
  // First p=update xgf and ygf - vectors for gaussian filter
  this.gaussian_filter_update();
  // Xgf and ygf updated according to Gaussian Distribution
  // ////////////////

  const numx: number = (this.xgfsize - 1) / 2,
    numy: number = (this.ygfsize - 1) / 2;
  for (let i = 0; i < pixels.length; i++) {
    for (let j = 0; j < pixels[i].length; j++) {
      if (i >= numx && i + numx < pixels.length) {
        let newval = 0;
        for (let k = i - numx; k <= i + numx; k++) {
          newval += pixels[k][j].component[0] * this.xgf[k - i + numx];
        }
        pixels[i][j].component[0] =
          pixels[i][j].component[1] =
          pixels[i][j].component[2] =
            newval;
      }
      if (j >= numy && j + numy < pixels[i].length) {
        let newval = 0;
        for (let k = j - numy; k <= j + numy; k++) {
          newval += pixels[i][k].component[0] * this.ygf[k - j + numy];
        }
        pixels[i][j].component[0] =
          pixels[i][j].component[1] =
          pixels[i][j].component[2] =
            newval;
      }
    }
  }

  /*
   * The following is to darken the thin lines, for which pixels having grayscale value above a threshold
   * Will be interpreted as a fully black pixel. To change this threshold, adjust gray_thres (global constant).
   */
  for (let i = 0; i < pixels.length; i++) {
    for (let j = 0; j < pixels[i].length; j++) {
      const pixs: myPixel = pixels[i][j],
        comp: number[] = pixs.component;
      let graynum: number = Math.round(
        0.299 * comp[0] + 0.587 * comp[1] + 0.114 * comp[2]
      );
      if (graynum < this.grey_thres) {
        graynum = 0;
      } else {
        graynum = 255;
      }
      comp[0] = comp[1] = comp[2] = graynum;
      pixs.component = comp;
      pixels[i][j] = pixs;
    }
  }
  return pixels;
};
// Following will apply Sobel kernel to input Pixel grid
export const sobel_operator = function (pixels: myPixel[][]): myPixel[][] {
  const xkernel: number[][] = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ],
    ykernel: number[][] = [
      [1, 2, 1],
      [0, 0, 0],
      [-1, -2, -1]
    ];
  let maxval = 0;
  for (let i = 1; i < pixels.length - 1; i++) {
    for (let j = 1; j < pixels[i].length - 1; j++) {
      let xgval = 0,
        ygval = 0;
      for (let k = 0; k < 3; k++) {
        for (let l = 0; l < 3; l++) {
          xgval += xkernel[k][l] * pixels[i - 1 + k][j - 1 + l].component[0];
          ygval += ykernel[k][l] * pixels[i - 1 + k][j - 1 + l].component[0];
        }
      }
      pixels[i][j].xg = xgval;
      pixels[i][j].yg = ygval;
      pixels[i][j].eg = Math.sqrt(xgval * xgval + ygval * ygval);
      maxval = Math.max(pixels[i][j].eg, maxval);
      const theta: number = Math.atan(ygval / xgval),
        theta2: number = Math.round((theta * 4) / Math.PI);
      pixels[i][j].gt = theta2;
    }
  }
  for (let i = 1; i < pixels.length - 1; i++) {
    for (let j = 1; j < pixels[i].length - 1; j++) {
      for (let k = 0; k < 3; k++) {
        pixels[i][j].component[k] = (pixels[i][j].eg * 255) / maxval;
      }
    }
  }
  return pixels;
};
// Following will applyNon-maximal suppression to input Pixel grid
export const nms = function (pixels: myPixel[][]): myPixel[][] {
  for (let i = 1; i < pixels.length - 1; i++) {
    for (let j = 1; j < pixels[i].length - 1; j++) {
      if (pixels[i][j].gt == 0) {
        if (
          pixels[i][j].eg <= pixels[i - 1][j].eg ||
          pixels[i][j].eg <= pixels[i + 1][j].eg
        ) {
          for (let k = 0; k < 3; k++) {
            pixels[i][j].component[k] = 0;
          }
        }
      } else if (pixels[i][j].gt == 1) {
        if (
          pixels[i][j].eg <= pixels[i - 1][j - 1].eg ||
          pixels[i][j].eg <= pixels[i + 1][j + 1].eg
        ) {
          for (let k = 0; k < 3; k++) {
            pixels[i][j].component[k] = 0;
          }
        }
      } else if (pixels[i][j].gt == -1) {
        if (
          pixels[i][j].eg <= pixels[i - 1][j + 1].eg ||
          pixels[i][j].eg <= pixels[i + 1][j - 1].eg
        ) {
          for (let k = 0; k < 3; k++) {
            pixels[i][j].component[k] = 0;
          }
        }
      } else if (
        pixels[i][j].eg <= pixels[i][j - 1].eg ||
        pixels[i][j].eg <= pixels[i][j + 1].eg
      ) {
        for (let k = 0; k < 3; k++) {
          pixels[i][j].component[k] = 0;
        }
      }
    }
  }
  return pixels;
};
// Colours edges according to r,g,b
export const colour_edges = function (
  pixels: myPixel[][],
  r: number,
  g: number,
  b: number
): myPixel[][] {
  for (let i = 0; i < pixels.length; i++) {
    for (let j = 0; j < pixels[i].length; j++) {
      if (pixels[i][j].component[0] == 255) {
        pixels[i][j].component[0] = r;
        pixels[i][j].component[1] = g;
        pixels[i][j].component[2] = b;
      } else {
        pixels[i][j].component[0] = 255;
        pixels[i][j].component[1] = 255;
        pixels[i][j].component[2] = 255;
      }
    }
  }
  return pixels;
};

/*
 * Following function detects edges in the bounding box
 * All edges will be marked blue, rest white
 * This is a standard algorithm Canny Edge Detection
 */
export const cannyEdgeDet = function (pixels: myPixel[][]): myPixel[][] {
  // Following will apply Sobel kernel to input Pixel grid
  pixels = sobel_operator(pixels);

  // Nms as follows - non maximal supression
  pixels = nms(pixels);

  /*
   * Filtering edges according to the threshold set. See global constants edgethres1 and edgethres2
   * According to Non-Maximal Suppression algorithm (High and Low threshold respectively).
   */

  /*
   * Also, edges which are identified and filtered according to thresholds will be marked blue : (0,0,255) in RGB format
   * Rest pixels are marked white.
   */
  for (let i = 1; i < pixels.length - 1; i++) {
    for (let j = 1; j < pixels[i].length - 1; j++) {
      if (pixels[i][j].eg < this.edgethres2) {
        for (let k = 0; k < 3; k++) {
          pixels[i][j].component[k] = 0;
        }
      } else if (pixels[i][j].eg > this.edgethres1) {
        for (let k = 0; k < 3; k++) {
          pixels[i][j].component[k] = 255;
        }
      } else if (
        pixels[i - 1][j - 1].eg > this.edgethres1 ||
        pixels[i - 1][j].eg > this.edgethres1 ||
        pixels[i - 1][j + 1].eg > this.edgethres1 ||
        pixels[i][j - 1].eg > this.edgethres1 ||
        pixels[i][j + 1].eg > this.edgethres1 ||
        pixels[i + 1][j - 1].eg > this.edgethres1 ||
        pixels[i + 1][j].eg > this.edgethres1 ||
        pixels[i + 1][j + 1].eg > this.edgethres1
      ) {
        for (let k = 0; k < 3; k++) {
          pixels[i][j].component[k] = 255;
        }
      } else {
        for (let k = 0; k < 3; k++) {
          pixels[i][j].component[k] = 0;
        }
      }
    }
  }
  for (let i = 0; i < pixels.length; i++) {
    for (let k = 0; k < 3; k++) {
      pixels[i][0].component[k] = 0;
      pixels[i][pixels[i].length - 1].component[k] = 0;
    }
  }
  for (let i = 0; i < pixels[0].length; i++) {
    for (let k = 0; k < 3; k++) {
      pixels[0][i].component[k] = 0;
      pixels[pixels.length - 1][i].component[k] = 0;
    }
  }

  // Edges filtered
  pixels = this.colour_edges(pixels, 0, 0, 255);
  // Edges coloured blue
  return pixels;
};

// Following function colours pixels of input pixel array pixs wrt r,g,b as colour channels
export const colour_object = function (
  pixels: myPixel[][],
  pixs: myPixel[],
  r: number,
  g: number,
  b: number
): myPixel[][] {
  for (let pec = 0; pec < pixs.length; pec++) {
    pixels[pixs[pec].x - pixels[0][0].x][
      pixs[pec].y - pixels[0][0].y
    ].component[0] = r;

    pixels[pixs[pec].x - pixels[0][0].x][
      pixs[pec].y - pixels[0][0].y
    ].component[1] = g;

    pixels[pixs[pec].x - pixels[0][0].x][
      pixs[pec].y - pixels[0][0].y
    ].component[2] = b;
  }
  return pixels;
};

// Following checks for the label of the arrow, and is called from from the loops present in linedet() function
export const check_double_side_arrow = function (
  pixels: myPixel,
  nheads: Edge[],
  arrow_bodies: Edge[],
  type1: string,
  type2: string,
  e1: number,
  e2: number,
  arr: Arrow,
  i: number,
  j: number,
  lining: string
): Arrow {
  const s1: string = lining + type1,
    s2: string = lining + type2;

  if (arr.type.valueOf() == s1.valueOf()) {
    for (let e3 = e1; e3 < nheads.length; e3++) {
      for (let e4 = e2; e4 < nheads.length; e4++) {
        if (e3 == e4) {
          continue;
        }
        if (Math.abs(nheads[e3].theta - nheads[e4].theta) * ai < 20) {
          continue;
        }
        if (
          Math.abs(nheads[e3].theta - arrow_bodies[i].theta) * ai < 20 &&
          Math.abs(nheads[e3].theta - arrow_bodies[j].theta) * ai < 20
        ) {
          continue;
        }
        if (
          Math.abs(nheads[e4].theta - arrow_bodies[i].theta) * ai < 20 &&
          Math.abs(nheads[e4].theta - arrow_bodies[j].theta) * ai < 20
        ) {
          continue;
        }
        if (
          (nheads[e3].theta + nheads[e4].theta) / 2 != arrow_bodies[i].theta &&
          (nheads[e3].theta + nheads[e4].theta) / 2 !=
            (arrow_bodies[i].theta + 90 / ai) % (180 / ai)
        ) {
          continue;
        }
        if (
          arrow_bodies[i].theta - nheads[e3].theta !=
            nheads[e4].theta - arrow_bodies[i].theta &&
          arrow_bodies[i].theta + 90 / ai - nheads[e3].theta !=
            nheads[e4].theta - arrow_bodies[i].theta - 90 / ai
        ) {
          continue;
        }
        if (!this.adjacent(nheads[e3], nheads[e4])) {
          continue;
        }

        const abtheta = arrow_bodies[i].theta,
          arr2: Arrow = this.give_arrow(
            '',
            nheads[e3],
            nheads[e4],
            abtheta,
            pixels,
            ai
          );
        if (arr2 == null) {
          continue;
        }
        if (arr2.type.valueOf() == s2.valueOf()) {
          if (s1.valueOf() == type1.valueOf()) {
            arr.type = `${type1}-${type2}`;
            return arr;
          }

          arr.type = `${s1} - ${type2}`;
          return arr;
        }
      }
    }
    return arr;
  } else if (arr.type.valueOf() == s2.valueOf()) {
    for (let e3 = e1; e3 < nheads.length; e3++) {
      for (let e4 = e2; e4 < nheads.length; e4++) {
        if (e3 == e4) {
          continue;
        }
        if (Math.abs(nheads[e3].theta - nheads[e4].theta) * ai < 20) {
          continue;
        }
        if (
          Math.abs(nheads[e3].theta - arrow_bodies[i].theta) * ai < 20 &&
          Math.abs(nheads[e3].theta - arrow_bodies[j].theta) * ai < 20
        ) {
          continue;
        }
        if (
          Math.abs(nheads[e4].theta - arrow_bodies[i].theta) * ai < 20 &&
          Math.abs(nheads[e4].theta - arrow_bodies[j].theta) * ai < 20
        ) {
          continue;
        }
        if (
          (nheads[e3].theta + nheads[e4].theta) / 2 != arrow_bodies[i].theta &&
          (nheads[e3].theta + nheads[e4].theta) / 2 !=
            (arrow_bodies[i].theta + 90 / ai) % (180 / ai)
        ) {
          continue;
        }
        if (
          arrow_bodies[i].theta - nheads[e3].theta !=
            nheads[e4].theta - arrow_bodies[i].theta &&
          arrow_bodies[i].theta + 90 / ai - nheads[e3].theta !=
            nheads[e4].theta - arrow_bodies[i].theta - 90 / ai
        ) {
          continue;
        }
        if (!this.adjacent(nheads[e3], nheads[e4])) {
          continue;
        }

        const abtheta = arrow_bodies[i].theta,
          arr2: Arrow = this.give_arrow(
            '',
            nheads[e3],
            nheads[e4],
            abtheta,
            pixels,
            ai
          );
        if (arr2 == null) {
          continue;
        }
        if (arr2.type.valueOf() == s1.valueOf()) {
          if (s2.valueOf() == type2.valueOf()) {
            arr.type = `${type1}-${type2}`;
            return arr;
          }

          arr.type = `${s1} - ${type2}`;
          return arr;
        }
      }
    }
    return arr;
  }
  return null;
};

export const linedet = function (pixels: myPixel[][]): Arrow {
  /*
   * Following line implemetss line_extract() function to extract arrow bodies from input
   * Bounding box.
   */

  const arrow_bodies = this.line_extract(pixels, this.t / 2, this.ai);

  if (arrow_bodies == null) {
    // Console.log("Not enough bodies");
    return null;
  }
  const nnbc: number = arrow_bodies.length;
  if (nnbc < 2 || nnbc == null) {
    // Console.log("Not enough bodies");
    return null;
  }
  // Following updates the accumulator grid (used in Hough-Line detection). Also, the arrowbodies are marked red.
  const x1: number = pixels.length - 1,
    y1: number = pixels[0].length - 1,
    x2 = 0,
    y2 = 0,
    { ai } = this,
    accum = new Array(4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)));
  for (let p = 0; p < 4 * Math.max(x1 - x2, y1 - y2); p++) {
    accum[p] = new Array(180 / ai);
  }
  for (let p = 0; p < 4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)); p++) {
    for (let q = 0; q < 180 / ai; q++) {
      accum[p][q] = 0;
    }
  }
  for (let i = 0; i < nnbc; i++) {
    const ite = arrow_bodies[i].pixels;
    pixels = colour_object(pixels, ite, 255, 0, 0);
  }

  for (let j = x2; j <= x1; j++) {
    for (let k = y2; k <= y1; k++) {
      if (
        /* Pixels[j][k].component[2] == 255 && */ pixels[j][k].component[0] < 10
      ) {
        for (let q = 0; q < 180 / ai; q++) {
          let ind: number = Math.floor(
            Math.cos((q * Math.PI) / (180 / ai)) * (j - x2) +
              Math.sin((q * Math.PI) / (180 / ai)) * (k - y2)
          );
          ind += 2 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
          accum[ind][q]++;
        }
      }
    }
  }

  /*
   * For arrow-heads, instead of Hough-Lines, "Hough-Strips" are extracted, which are of strip_w pixels width,
   * Inorder to capture the curved arrow head strokes into one strip.
   */
  for (
    let p = 0;
    p + this.strip_w - 1 < 4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    p++
  ) {
    for (let q = 0; q < 180 / ai; q++) {
      for (let r = 1; r < this.strip_w; r++) {
        accum[p][q] += accum[p + r][q];
      }
    }
  }

  /*
   * Following sorts length of arrow bodies in decreasing order of length, to ensure that the most probable
   * Arrow-bodies are picked first
   */
  for (let h1 = 0; h1 < nnbc; h1++) {
    for (let h2 = h1 + 1; h2 < nnbc; h2++) {
      if (
        arrow_bodies[h1].pixels.length - arrow_bodies[h1].cover_pixel <
        arrow_bodies[h2].pixels.length - arrow_bodies[h2].cover_pixel
      ) {
        const temp: Edge = arrow_bodies[h1];
        arrow_bodies[h1] = arrow_bodies[h2];
        arrow_bodies[h2] = temp;
      }
    }
  }
  // ////////////////////////////////////////////
  // Following is the main part of the code :
  // ////////////////////////////////////////////
  // First, the presence of double lined arrows are checked and extracted if present.
  // If not, then the presence of single lined arrows are checked (if the reverse was done, a double
  // Lined arrow will also be interpreted as a single lined arrow using the farthest placed edges).
  // For each pair of arrow bodies, first they are checked whether they are of approximately equal length and are oriented at the same angle.
  // If yes, for each pair of the same, appropriate arrow-heads are found from the accumulator grid updated above.
  // Following conditions are checked for a set of arrow-heads to be compatible of forming an arrow with the chosen pair of arrow heads :
  // 1. Arrow-heads to be of comparable lengths
  // 2. Arrow-heads are to be oriented away by atleast 20 degrees
  // 3. Angle formed by arrow-heads are to be bisected by an imaginary line between the arrow-bodies.
  // 4. Arrow-heads are to pass the head/body length ratio threshold. The heads should not be too short, nor too large.
  // If the above conditions are satisfied, the orientation of the arrow comes directly from the angle of arrow-body, The direction of the arrow is one
  // Of two directions, which is further detemined from the placement of arrow-heads. For each orientation, the arrow-head is checked to be either near any particular
  // Edge of bounding box (for up, down, right, left arrows) or a corner of the bounding box to determine the orientation.

  /*
   * Also, to determine the presence of double sided arrows (For eg : right-left arrow), whenever one arrow is found to be present, the presence of arrow-heads on the
   * Opposite side of the arrow body are checked to be present. If yes, then we find a double sided arrow, else a single sided arrow. The above algorithm
   * Is the same for single and double lined arrows.
   */

  for (let i = 0; i < nnbc; i++) {
    for (let j = i + 1; j < nnbc; j++) {
      const p11: myPixel = arrow_bodies[i].endpoints[0],
        p12: myPixel = arrow_bodies[i].endpoints[1],
        d1: number = this.distance(p11, p12),
        p21: myPixel = arrow_bodies[j].endpoints[0],
        p22: myPixel = arrow_bodies[j].endpoints[1],
        d2: number = this.distance(p21, p22);
      if (
        (d1 / d2 < 0.8 && d2 / d1 < 0.8) ||
        arrow_bodies[i].theta != arrow_bodies[j].theta
      ) {
        continue;
      }
      for (let k = j + 1; k < nnbc; k++) {
        const __p11: myPixel = arrow_bodies[j].endpoints[0],
          __p12: myPixel = arrow_bodies[j].endpoints[1],
          __d1: number = this.distance(__p11, __p12),
          __p21: myPixel = arrow_bodies[k].endpoints[0],
          __p22: myPixel = arrow_bodies[k].endpoints[1],
          __d2: number = this.distance(__p21, __p22);
        if (
          (__d1 / __d2 < 0.8 && __d2 / __d1 < 0.8) ||
          arrow_bodies[k].theta != arrow_bodies[j].theta
        ) {
          continue;
        }
        for (let l = k + 1; l < nnbc; l++) {
          const _p11: myPixel = arrow_bodies[k].endpoints[0],
            _p12: myPixel = arrow_bodies[k].endpoints[1],
            _d1: number = this.distance(_p11, _p12),
            _p21: myPixel = arrow_bodies[l].endpoints[0],
            _p22: myPixel = arrow_bodies[l].endpoints[1],
            _d2: number = this.distance(_p21, _p22);
          if (
            (_d1 / _d2 < 0.8 && _d2 / _d1 < 0.8) ||
            arrow_bodies[k].theta != arrow_bodies[l].theta
          ) {
            continue;
          }

          const d3 = Math.min(d1, d2, _d1, _d2, __d1, __d2),
            minpi: number = Math.min(
              arrow_bodies[i].pixels.length,
              arrow_bodies[j].pixels.length,
              arrow_bodies[k].pixels.length,
              arrow_bodies[l].pixels.length
            ),
            nheads: Edge[] = this.find_heads(
              d3,
              minpi,
              accum,
              pixels,
              x1,
              x2,
              y1,
              y2,
              ai
            );
          // Console.log("entered1 " + nheads.length);
          for (let e1 = 0; e1 < nheads.length; e1++) {
            // Console.log("entered3");
            for (let e2 = 0; e2 < nheads.length; e2++) {
              // Console.log("entered2");
              if (e1 == e2) {
                continue;
              }
              if (Math.abs(nheads[e1].theta - nheads[e2].theta) * ai < 20) {
                continue;
              }
              if (
                Math.abs(nheads[e1].theta - arrow_bodies[i].theta) * ai < 20 &&
                Math.abs(nheads[e1].theta - arrow_bodies[j].theta) * ai < 20
              ) {
                continue;
              }
              if (
                Math.abs(nheads[e2].theta - arrow_bodies[i].theta) * ai < 20 &&
                Math.abs(nheads[e2].theta - arrow_bodies[j].theta) * ai < 20
              ) {
                continue;
              }
              if (
                (nheads[e1].theta + nheads[e2].theta) / 2 !=
                  arrow_bodies[i].theta &&
                (nheads[e1].theta + nheads[e2].theta) / 2 !=
                  (arrow_bodies[i].theta + 90 / ai) % (180 / ai)
              ) {
                continue;
              }
              if (
                arrow_bodies[i].theta - nheads[e1].theta !=
                  nheads[e2].theta - arrow_bodies[i].theta &&
                arrow_bodies[i].theta + 90 / ai - nheads[e1].theta !=
                  nheads[e2].theta - arrow_bodies[i].theta - 90 / ai
              ) {
                continue;
              }
              const abtheta = arrow_bodies[i].theta,
                arr: Arrow = this.give_arrow(
                  'double lined ',
                  nheads[e1],
                  nheads[e2],
                  abtheta,
                  pixels,
                  ai
                );
              if (arr == null) {
                continue;
              }
              let now_arrow: Arrow = this.check_double_side_arrow(
                pixels,
                nheads,
                arrow_bodies,
                'up',
                'down',
                e1,
                e2,
                arr,
                i,
                j,
                'double lined '
              );
              if (now_arrow != null) {
                return now_arrow;
              }

              now_arrow = this.check_double_side_arrow(
                pixels,
                nheads,
                arrow_bodies,
                'right',
                'left',
                e1,
                e2,
                arr,
                i,
                j,
                'double lined '
              );
              if (now_arrow != null) {
                return now_arrow;
              }

              now_arrow = this.check_double_side_arrow(
                pixels,
                nheads,
                arrow_bodies,
                'up right',
                'down left',
                e1,
                e2,
                arr,
                i,
                j,
                'double lined '
              );
              if (now_arrow != null) {
                return now_arrow;
              }
              now_arrow = this.check_double_side_arrow(
                pixels,
                nheads,
                arrow_bodies,
                'up left',
                'down right',
                e1,
                e2,
                arr,
                i,
                j,
                'double lined '
              );
              if (now_arrow != null) {
                return now_arrow;
              }

              if (arr == null) {
                continue;
              }
              return arr;
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < nnbc; i++) {
    for (let j = i + 1; j < nnbc; j++) {
      const p11: myPixel = arrow_bodies[i].endpoints[0],
        p12: myPixel = arrow_bodies[i].endpoints[1],
        d1: number = this.distance(p11, p12),
        p21: myPixel = arrow_bodies[j].endpoints[0],
        p22: myPixel = arrow_bodies[j].endpoints[1],
        d2: number = this.distance(p21, p22);
      if (
        (d1 / d2 < 0.8 && d2 / d1 < 0.8) ||
        arrow_bodies[i].theta != arrow_bodies[j].theta
      ) {
        continue;
      }
      const d3 = Math.min(d1, d2),
        minpi: number = Math.min(
          arrow_bodies[i].pixels.length,
          arrow_bodies[j].pixels.length
        ),
        nheads: Edge[] = this.find_heads(
          d3,
          minpi,
          accum,
          pixels,
          x1,
          x2,
          y1,
          y2,
          ai
        );

      for (let e1 = 0; e1 < nheads.length; e1++) {
        for (let e2 = 0; e2 < nheads.length; e2++) {
          if (e1 == e2) {
            continue;
          }
          if (Math.abs(nheads[e1].theta - nheads[e2].theta) * ai < 20) {
            continue;
          }
          if (
            Math.abs(nheads[e1].theta - arrow_bodies[i].theta) * ai < 20 &&
            Math.abs(nheads[e1].theta - arrow_bodies[j].theta) * ai < 20
          ) {
            continue;
          }
          if (
            Math.abs(nheads[e2].theta - arrow_bodies[i].theta) * ai < 20 &&
            Math.abs(nheads[e2].theta - arrow_bodies[j].theta) * ai < 20
          ) {
            continue;
          }
          if (
            (nheads[e1].theta + nheads[e2].theta) / 2 !=
              arrow_bodies[i].theta &&
            (nheads[e1].theta + nheads[e2].theta) / 2 !=
              (arrow_bodies[i].theta + 90 / ai) % (180 / ai)
          ) {
            continue;
          }
          if (
            arrow_bodies[i].theta - nheads[e1].theta !=
              nheads[e2].theta - arrow_bodies[i].theta &&
            arrow_bodies[i].theta + 90 / ai - nheads[e1].theta !=
              nheads[e2].theta - arrow_bodies[i].theta - 90 / ai
          ) {
            continue;
          }
          if (!this.adjacent(nheads[e1], nheads[e2])) {
            continue;
          }

          const abtheta = arrow_bodies[i].theta,
            arr: Arrow = this.give_arrow(
              '',
              nheads[e1],
              nheads[e2],
              abtheta,
              pixels,
              ai
            );
          if (arr == null) {
            continue;
          }
          let now_arrow: Arrow = this.check_double_side_arrow(
            pixels,
            nheads,
            arrow_bodies,
            'up',
            'down',
            e1,
            e2,
            arr,
            i,
            j,
            ''
          );
          if (now_arrow != null) {
            return now_arrow;
          }
          now_arrow = this.check_double_side_arrow(
            pixels,
            nheads,
            arrow_bodies,
            'right',
            'left',
            e1,
            e2,
            arr,
            i,
            j,
            ''
          );
          if (now_arrow != null) {
            return now_arrow;
          }

          now_arrow = this.check_double_side_arrow(
            pixels,
            nheads,
            arrow_bodies,
            'up right',
            'down left',
            e1,
            e2,
            arr,
            i,
            j,
            ''
          );
          if (now_arrow != null) {
            return now_arrow;
          }

          now_arrow = this.check_double_side_arrow(
            pixels,
            nheads,
            arrow_bodies,
            'up left',
            'down right',
            e1,
            e2,
            arr,
            i,
            j,
            ''
          );
          if (now_arrow != null) {
            return now_arrow;
          }

          return arr;
        }
      }
    }
  }

  // Console.log("No arrows detected");
  return null;
};

/*
 * Following function determines the orientation of the arrow candidate.
 * The arguments are two arrow head strokes, angle of orientation of arrow-body,
 * And the pixel grid. The string str determines whether the arrow is double lined
 * Or not.
 */
export const give_arrow = function (
  str: string,
  nh1: Edge,
  nh2: Edge,
  abtheta: number,
  pixels: myPixel[][],
  ai: number
): Arrow {
  const p3: myPixel = new myPixel(),
    p2: myPixel = new myPixel(),
    p4: myPixel = new myPixel(),
    p5: myPixel = new myPixel();
  p3.x = pixels[pixels.length - 1][pixels[pixels.length - 1].length - 1].x;
  p3.y = pixels[pixels.length - 1][pixels[pixels.length - 1].length - 1].y;
  p2.x = pixels[0][0].x;
  p2.y = pixels[0][0].y;
  p4.x = p3.x;
  p4.y = p2.y;
  p5.x = p2.x;
  p5.y = p3.y;
  const d3: number = this.dist_poi(p3, nh1) + this.dist_poi(p3, nh2),
    d2: number = this.dist_poi(p2, nh1) + this.dist_poi(p2, nh2),
    d4: number = this.dist_poi(p4, nh1) + this.dist_poi(p4, nh2),
    d5: number = this.dist_poi(p5, nh1) + this.dist_poi(p5, nh2),
    portion: number = this.t2 * (nh1.pixels.length + nh2.pixels.length);
  if (d2 > portion && d3 > portion && d4 > portion && d5 > portion) {
    return null;
  }

  if (abtheta == 0) {
    if (d3 < d2) {
      const arr_type = 'down';

      let arrow: Arrow;
      if (str.valueOf() == '') {
        arrow = new Arrow(str + arr_type, 'orange');
      } else {
        arrow = new Arrow(str + arr_type, 'black');
      }

      return arrow;
    }

    const arr_type = 'up';
    let arrow: Arrow;
    if (str.valueOf() == '') {
      arrow = new Arrow(str + arr_type, 'red');
    } else {
      arrow = new Arrow(str + arr_type, 'black');
    }
    return arrow;
  } else if (abtheta == 90 / ai) {
    if (d3 < d2) {
      const arr_type = 'right';
      let arrow: Arrow;
      if (str.valueOf() == '') {
        arrow = new Arrow(str + arr_type, 'purple');
      } else {
        arrow = new Arrow(str + arr_type, 'black');
      }
      return arrow;
    }

    const arr_type = 'left';
    let arrow: Arrow;
    if (str.valueOf() == '') {
      arrow = new Arrow(str + arr_type, 'blue');
    } else {
      arrow = new Arrow(str + arr_type, 'black');
    }

    return arrow;
  }

  if (abtheta > 90 / ai) {
    if (d3 < d2) {
      const arr_type = 'down right';
      let arrow: Arrow;
      if (str.valueOf() == '') {
        arrow = new Arrow(str + arr_type, 'yellow');
      } else {
        arrow = new Arrow(str + arr_type, 'black');
      }
      return arrow;
    }

    const arr_type = 'up left';
    let arrow: Arrow;
    if (str.valueOf() == '') {
      arrow = new Arrow(str + arr_type, 'brown');
    } else {
      arrow = new Arrow(str + arr_type, 'black');
    }
    return arrow;
  }

  if (d5 > d4) {
    const arr_type = 'up right';
    let arrow: Arrow;
    if (str.valueOf() == '') {
      arrow = new Arrow(str + arr_type, 'pink');
    } else {
      arrow = new Arrow(str + arr_type, 'black');
    }
    return arrow;
  }

  const arr_type = 'down left';
  let arrow: Arrow;
  if (str.valueOf() == '') {
    arrow = new Arrow(str + arr_type, 'green');
  } else {
    arrow = new Arrow(str + arr_type, 'black');
  }
  return arrow;
};

/*
 * Following is the main branch function that is called from page.ts. It iterates over
 * Bounding boxes and runs the arrowhelp() function, which implements the rest of the code.
 */

export const arrowdet = function (canvas: Canvas, b: Bbox[]) {
  const bbbox: Bbox[] = b;
  for (let i = 0; i < bbbox.length; i++) {
    const borders: number[] = bbbox[i].box(),
      x1 = borders[0],
      y1 = borders[1],
      x2 = borders[2],
      y2 = borders[3],
      t = Math.min(Math.abs(x1 - x2), Math.abs(y1 - y2)),
      t2 = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    if (t < 5 || t2 < 40 || t > 200 || t2 > 300 || t * t2 > 40000) {
      console.log(`Bounding Box ${i}: ` + 'No Arrows Detected');
      continue;
    }

    // Following adjusts the line threshold relative to bounding box dimensions
    const oli = this.li;
    this.li = Math.max(oli, t);
    let arrow: Arrow = this.arrowhelp(bbbox[i], canvas);
    this.li = oli;
    if (arrow == null) {
      this.ai /= 2;
      arrow = this.arrowhelp(bbbox[i], canvas);
      this.ai *= 2;
    }
    if (arrow == null) {
      console.log(`Bounding Box ${i}: ` + 'No Arrows Detected');
      continue;
    }

    arrow.box_num = i;

    /*
     * Following colours the bounding box according to the type of arrow. It is commented for the moment,
     * But can be uncommented to see the working of the algorithm. Colour-code is asily understandable from the
     * Following code.
     * Also, output of type of arrow for a specific bounding box will also be given
     */

    bbbox[i].draw(canvas, arrow.style);
    console.log(`Bounding Box ${i}: ${arrow.type} arrow detected`);
  }
};
// Following is a helper function. It runs over a single bounding box.
export const arrowhelp = function (box: Bbox, canvas: Canvas): Arrow {
  const ctx = canvas.getContext(),
    pix = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    borders: number[] = box.box(),
    x1 = borders[0] - 1,
    y1 = borders[1] - 1,
    x2 = borders[2] + 1,
    y2 = borders[3] + 1;
  this.t = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  this.t2 = Math.min(Math.abs(x1 - x2), Math.abs(y1 - y2));

  let pixels: myPixel[][] = new Array(x2 - x1 + 1);
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
  pixels = this.toGrayScale(pixels);

  pixels = this.gaussianblur(pixels);
  const count_pixels: number = check_lines(pixels, this.t / 2, this.ai);
  if (count_pixels == 0) {
    // Console.log("poooo");
    return null;
  }
  pixels = this.cannyEdgeDet(pixels);

  const idenarrow: Arrow = this.linedet(pixels);
  // //////////////////////
  // Outputs modified pixel data  (red pixels constitute possible arrowbodies and blue constitute possible arrow heads)
  // For(let i=0; i <pixels.length; i ++){
  //   For(let j=0; j <pixels[i].length; j ++){

  //     Var nowcol:string = pixels[i][j].toString();
  //     Ctx.fillStyle = nowcol;
  //     Ctx.fillRect(pixels[i][j].x,pixels[i][j].y, 1, 1);
  //   }
  // }
  // //////////////////////
  return idenarrow;
  // Return null;
};
// Checks whether two edges are adjacent or not
export const adjacent = function (a: Edge, b: Edge): boolean {
  for (let i = 0; i < a.pixels.length; i++) {
    for (let j = 0; j < b.pixels.length; j++) {
      if (this.distance(a.pixels[i], b.pixels[j]) < 3) {
        return true;
      }
    }
  }
  return false;
};
// Integral distance between two pixels
export const distance = function (a: myPixel, b: myPixel): number {
  return Math.round(
    Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
  );
};
// Sum of distances of edge from a point
export const dist_poi = function (a: myPixel, b: Edge): number {
  let num = 0;
  for (let i = 0; i < b.pixels.length; i++) {
    num += this.distance(a, b.pixels[i]);
  }
  return num;
};

/*
 * Following extracts arrow-bodies from given grid of pixels
 * Pixels : pixel grid
 * Threshold : pixel threshold of lines to be extracted
 * Ai : interval of angles of lines
 */
export const line_extract = function (
  pixels: myPixel[][],
  threshold: number,
  ai: number
): Edge[] {
  const x1: number = pixels.length - 1,
    y1: number = pixels[0].length - 1,
    x2 = 0,
    y2 = 0,
    accum = new Array(4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2))),
    thresh = new Array(180 / ai);
  for (let i = 0; i < 180 / ai; i++) {
    if (i == 0) {
      thresh[i] = 10;
    }
    thresh[i] = threshold;
  }
  for (let p = 0; p < 4 * Math.max(x1 - x2, y1 - y2); p++) {
    accum[p] = new Array(180 / ai);
  }
  for (let p = 0; p < 4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)); p++) {
    for (let q = 0; q < 180 / ai; q++) {
      accum[p][q] = 0;
    }
  }

  for (let j = x2; j <= x1; j++) {
    for (let k = y2; k <= y1; k++) {
      if (
        /* Pixels[j][k].component[2] == 255 && */ pixels[j][k].component[0] < 10
      ) {
        for (let q = 0; q < 180 / ai; q++) {
          let ind: number = Math.floor(
            Math.cos((q * Math.PI) / (180 / ai)) * (j - x2) +
              Math.sin((q * Math.PI) / (180 / ai)) * (k - y2)
          );
          ind += 2 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
          accum[ind][q]++;
        }
      }
    }
  }
  const lines: Edge[] = [];
  for (let p = 0; p < 4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)); p++) {
    for (let q = 0; q < 180 / ai; q++) {
      if (accum[p][q] > threshold) {
        const e = new Edge();
        e.rho = p;
        e.theta = q;
        lines.push(e);
      }
    }
  }
  const nbodies: Edge[] = [];

  for (let i = lines.length - 1; i >= 0; i--) {
    const minp: myPixel = new myPixel();
    minp.x = 1e9;
    minp.y = 1e9;
    const maxp: myPixel = new myPixel();
    for (let j = x2; j <= x1; j++) {
      for (let k = y2; k <= y1; k++) {
        if (
          /* Pixels[j][k].component[2] == 255 && */ pixels[j][k].component[0] <
          10
        ) {
          const q = lines[i].theta;
          let ind: number = Math.floor(
            Math.cos((q * Math.PI) / (180 / ai)) * (j - x2) +
              Math.sin((q * Math.PI) / (180 / ai)) * (k - y2)
          );
          ind += 2 * Math.max(x1 - x2, y1 - y2);
          if (ind == lines[i].rho) {
            lines[i].pixels.push(pixels[j - x2][k - y2]);
            if (j - x2 < minp.x || (j - x2 == minp.x && k - y2 < minp.y)) {
              minp.x = j - x2;
              minp.y = k - y2;
            } else if (
              j - x2 > maxp.x ||
              (j - x2 == maxp.x && k - y2 > maxp.y)
            ) {
              maxp.x = j - x2;
              maxp.y = k - y2;
            }
          }
        }
      }
    }
    lines[i].endpoints[0] = minp;
    lines[i].endpoints[1] = maxp;
    const t = threshold,
      len = this.distance(minp, maxp);
    if (
      len > t &&
      lines[i].pixels.length - lines[i].cover_pixel > (3 * t) / 4
    ) {
      nbodies.push(lines[i]);
    }
  }
  const nnbodies: Edge[] = new Array(0);
  let nnbc = 0;
  for (let i = nbodies.length - 1; i >= 0; i--) {
    let cnt = 1;
    for (let j = 0; j < nnbodies.length; j++) {
      if (
        Math.abs(nnbodies[j].rho - nbodies[i].rho) < 2 &&
        nnbodies[j].theta == nbodies[i].theta
      ) {
        cnt = 0;
        for (let k = 0; k < nbodies[i].pixels.length; k++) {
          nnbodies[j].pixels.push(nbodies[i].pixels[k]);
        }
        break;
      }
    }
    if (cnt == 1) {
      nnbodies.push(nbodies[i]);
      nnbc++;
    }
  }
  for (let i = 0; i < nnbodies.length; i++) {
    const ite = nnbodies[i].pixels;
    pixels = colour_object(pixels, ite, 255, 255, 255);
  }

  if (nnbc == 0) {
    return null;
  }
  return nnbodies;
};

/*
 * Following function will find and return appropriate arrow-head candidates
 * From input pixel grid, and arrow-body. Different arrays of Edges may be returned for different
 * Arrow-bodies as the following function is applied relative to sizes of arrow-body candidates.
 */
export const find_heads = function (
  d3: number,
  minpi: number,
  accum: number[][],
  pixels: myPixel[][],
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  ai: number
): Edge[] {
  let heads: Edge[] = [],
    nheads: Edge[] = [];
  const nnheads: Edge[] = [];
  // Following loop identifies possible arrow-head candidates and pushes them in heads array.
  for (let p = 0; p < accum.length; p++) {
    for (let q = 0; q < accum[p].length; q++) {
      if (accum[p][q] > Math.max(minpi / 20, 20)) {
        const e = new Edge();
        e.rho = p;
        e.theta = q;
        heads.push(e);
      }
    }
  }
  nheads = heads;

  /*
   * Following loop fills pixel array of each arrow-head candidate. Also, length of
   * Arrow-head candidate is checked to meet the relative size thresholds according to arrow-body candidates
   */
  for (let i = nheads.length - 1; i >= 0; i--) {
    const minp: myPixel = new myPixel(),
      maxp: myPixel = new myPixel();
    for (let j = x2; j <= x1; j++) {
      for (let k = y2; k <= y1; k++) {
        if (
          /* Pixels[j][k].component[2] == 255 && */ pixels[j][k].component[0] <
          10
        ) {
          const q = nheads[i].theta;
          let ind: number = Math.floor(
            Math.cos((q * Math.PI) / (180 / ai)) * (j - x2) +
              Math.sin((q * Math.PI) / (180 / ai)) * (k - y2)
          );
          ind += 2 * Math.max(x1 - x2, y1 - y2);
          if (ind == nheads[i].rho) {
            nheads[i].pixels.push(pixels[j - x2][k - y2]);
            if (j - x2 < minp.x || (j - x2 == minp.x && k - y2 < minp.y)) {
              minp.x = j - x2;
              minp.y = k - y2;
            } else if (
              j - x2 > maxp.x ||
              (j - x2 == maxp.x && k - y2 > maxp.y)
            ) {
              maxp.x = j - x2;
              maxp.y = k - y2;
            }
          }
        }
      }
    }
    nheads[i].endpoints[0] = minp;
    nheads[i].endpoints[1] = maxp;
    const len = this.distance(minp, maxp);
    // Var len2 = nheads[i].pixels.length;
    if (len > d3 / 50) {
      nnheads.push(nheads[i]);
    }
  }
  // Following code will club multiple edges if they are found very close together (adjacent).
  heads = nnheads;
  nheads = [];
  for (let i = heads.length - 1; i >= 0; i--) {
    let cnt = 1;
    for (let j = 0; j < nheads.length; j++) {
      if (
        Math.abs(nheads[j].rho - heads[i].rho) < 2 &&
        nheads[j].theta == heads[i].theta
      ) {
        cnt = 0;
        for (let k = 0; k < heads[i].pixels.length; k++) {
          nheads[j].pixels.push(heads[i].pixels[k]);
        }
        break;
      }
    }
    if (cnt == 1) {
      nheads.push(heads[i]);
    }
  }

  /*
   * Following sorts the nheads (arrow-heads) array in decreasing order of their lengths to
   * Find the approprite arrow-head
   */
  for (let h1 = 0; h1 < nheads.length; h1++) {
    for (let h2 = h1 + 1; h2 < nheads.length; h2++) {
      if (nheads[h1].pixels.length < nheads[h2].pixels.length) {
        const temp: Edge = nheads[h1];
        nheads[h1] = nheads[h2];
        nheads[h2] = temp;
      }
    }
  }

  return nheads;
};

/*
 * Following is a function is called to reduce false positives. As mentioned in the report, there are cases
 * Where boxes containing slanted lines gives false positives due to stray pixels near arrow_bodies.
 * The following is a modification of above line_detection function, except that this function extracts pixels
 * Adjacent to arrow_bodies and updates the count of such pixels(cover_pixels -> a variable inside Edge Class)
 * This thus removes stray pixels and reduces false positives
 */
export const check_lines = function (
  pixels: myPixel[][],
  threshold: number,
  ai: number
): number {
  const x1: number = pixels.length - 1,
    y1: number = pixels[0].length - 1,
    x2 = 0,
    y2 = 0,
    accum = new Array(4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)));
  for (let p = 0; p < 4 * Math.max(x1 - x2, y1 - y2); p++) {
    accum[p] = new Array(180 / ai);
  }
  for (let p = 0; p < 4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)); p++) {
    for (let q = 0; q < 180 / ai; q++) {
      accum[p][q] = 0;
    }
  }

  for (let j = x2; j <= x1; j++) {
    for (let k = y2; k <= y1; k++) {
      if (
        pixels[j][k].component[2] == 0 &&
        pixels[j][k].component[0] == 0 &&
        pixels[j][k].component[1] == 0
      ) {
        for (let q = 0; q < 180 / ai; q++) {
          let ind: number = Math.floor(
            Math.cos((q * Math.PI) / (180 / ai)) * (j - x2) +
              Math.sin((q * Math.PI) / (180 / ai)) * (k - y2)
          );
          ind += 2 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
          accum[ind][q]++;
        }
      }
    }
  }
  const lines: Edge[] = [];
  for (let p = 0; p < 4 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)); p++) {
    for (let q = 0; q < 180 / ai; q++) {
      if (accum[p][q] > threshold) {
        const e = new Edge();
        e.rho = p;
        e.theta = q;
        lines.push(e);
      }
    }
  }
  const nbodies: Edge[] = [];
  /* nnbc = 0; */
  for (let i = lines.length - 1; i >= 0; i--) {
    const minp: myPixel = new myPixel(),
      maxp: myPixel = new myPixel();
    for (let j = x2; j <= x1; j++) {
      for (let k = y2; k <= y1; k++) {
        if (
          pixels[j][k].component[2] == 0 &&
          pixels[j][k].component[0] == 0 &&
          pixels[j][k].component[1] == 0
        ) {
          const q = lines[i].theta;
          let ind: number = Math.floor(
            Math.cos((q * Math.PI) / (180 / ai)) * (j - x2) +
              Math.sin((q * Math.PI) / (180 / ai)) * (k - y2)
          );
          ind += 2 * Math.max(x1 - x2, y1 - y2);
          if (ind == lines[i].rho) {
            lines[i].pixels.push(pixels[j - x2][k - y2]);
            if (j - x2 < minp.x || (j - x2 == minp.x && k - y2 < minp.y)) {
              minp.x = j - x2;
              minp.y = k - y2;
            } else if (
              j - x2 > maxp.x ||
              (j - x2 == maxp.x && k - y2 > maxp.y)
            ) {
              maxp.x = j - x2;
              maxp.y = k - y2;
            }
          }
        }
      }
    }
    lines[i].endpoints[0] = minp;
    lines[i].endpoints[1] = maxp;
    const t = threshold,
      len = this.distance(minp, maxp);
    if (
      len > t &&
      lines[i].pixels.length - lines[i].cover_pixel > (3 * t) / 4
    ) {
      nbodies.push(lines[i]);
    }
  }
  const nnbodies: Edge[] = nbodies;

  for (let i = nnbodies.length - 1; i >= 0; i--) {
    const minp: myPixel = new myPixel(),
      maxp: myPixel = new myPixel();
    for (let j = x2; j <= x1; j++) {
      for (let k = y2; k <= y1; k++) {
        if (
          pixels[j][k].component[2] == 0 &&
          pixels[j][k].component[0] == 0 &&
          pixels[j][k].component[1] == 0
        ) {
          const q = nnbodies[i].theta;
          let ind: number = Math.floor(
            Math.cos((q * Math.PI) / (180 / ai)) * (j - x2) +
              Math.sin((q * Math.PI) / (180 / ai)) * (k - y2)
          );
          ind += 2 * Math.max(x1 - x2, y1 - y2);
          if (q != 0 && q != 90 / ai) {
            if (ind >= nnbodies[i].rho - 2 && ind <= nnbodies[i].rho + 2) {
              nnbodies[i].pixels.push(pixels[j - x2][k - y2]);
              if (j - x2 < minp.x || (j - x2 == minp.x && k - y2 < minp.y)) {
                minp.x = j - x2;
                minp.y = k - y2;
              } else if (
                j - x2 > maxp.x ||
                (j - x2 == maxp.x && k - y2 > maxp.y)
              ) {
                maxp.x = j - x2;
                maxp.y = k - y2;
              }
              nnbodies[i].cover_pixel++;
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < nnbodies.length; i++) {
    const ite = nnbodies[i].pixels;
    pixels = colour_object(pixels, ite, 0, 255, 0);
  }
  let cnt = 0;
  for (let j = x2; j <= x1; j++) {
    for (let k = y2; k <= y1; k++) {
      if (
        pixels[j][k].component[2] == 0 &&
        pixels[j][k].component[0] == 0 &&
        pixels[j][k].component[1] == 255
      ) {
        for (let x = Math.max(x2, j - 2); x <= Math.min(x1, j + 2); x++) {
          for (let y = Math.max(y2, k - 2); y <= Math.min(y1, k + 2); y++) {
            if (
              pixels[x][y].component[2] == 0 &&
              pixels[x][y].component[0] == 0 &&
              pixels[x][y].component[1] == 0
            ) {
              cnt++;
            }
          }
        }
      }
    }
  }
  for (let i = 0; i < nnbodies.length; i++) {
    const ite = nnbodies[i].pixels;
    pixels = colour_object(pixels, ite, 0, 0, 0);
  }

  return cnt;
};
