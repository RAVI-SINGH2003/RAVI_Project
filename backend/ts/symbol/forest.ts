import Bbox from '../utility/bbox';
import Canvas from '../utility/canvas';
import { myPixel } from './arrow';
import {
  MarkPointsOnCanvas,
  //colorOnCanvas,
  draw_util
} from './symbol_det';

const dr: number[] = [1, 1, 0, -1, -1, -1, 0, 1],
  dc: number[] = [0, 1, 1, 1, 0, -1, -1, -1];
const LINELIMIT = 100,
  STACKLIMIT = 2000;
//height = 1000,
let stackDepth = 0;
//width = 1000; // Set to -1 if don't want // 100 should suffice for most symbols

export class Forest {
  private lines: Line[];

  public adjList: Map<myPixel, myPixel[]>; // Adjacency list of numbers corresponding to myPixels

  constructor() {
    this.lines = [];
    this.adjList = new Map();
  }

  public addLine(line: Line) {
    this.lines.push(line);
  }

  public getLines() {
    return this.lines;
  }

  public makeAdjList() {
    this.lines.forEach((line) => {
      for (
        let i = 0;
        line.features != null && i < line.features.length - 1;
        ++i
      ) {
        const num1 = line.features[i],
          num2 = line.features[i + 1];
        // If(num1.x == num2.x && num1.y == num2.y) {console.log("ABORT! point repeated in feature list"); continue;}
        if (this.adjList.get(num1) == null) {
          this.adjList.set(num1, []);
        }
        this.adjList.get(num1).push(num2);
        if (this.adjList.get(num2) == null) {
          this.adjList.set(num2, []);
        }
        this.adjList.get(num2).push(num1);
      }
    });
  }

  public dispForest(box: Bbox, canvas: Canvas, style = '#0000FF') {
    const pixList: myPixel[] = [],
      ctx = canvas.getContext();
    ctx.fillStyle = '#FFFFFF';
    const [x1, y1, x2, y2] = box.box();
    for (let i = x1; i < x2; i++) {
      for (let j = y1; j < y2; j++) {
        ctx.fillRect(i, j, 1, 1);
      }
    }
    ctx.fillStyle = style;
    this.adjList.forEach((value: myPixel[], from: myPixel) => {
      pixList.push(from);
      value.forEach((to) => {
        draw_util(from, to, canvas, style, 1);
      });
    });
    MarkPointsOnCanvas(pixList, box, canvas);
  }
}

export class Line {
  public pix: myPixel[];

  public resolution: number;

  public features: myPixel[];

  constructor(resolution_: number) {
    this.pix = [];
    this.resolution = resolution_;
    this.features = [];
  }

  public push(pixel: myPixel) {
    this.pix.push(pixel);
  }

  public douglas_peucker(): myPixel[] {
    stackDepth = 0;
    this.features = gen_poly_lines_douglas_peucker(
      0,
      this.pix.length - 1,
      this.resolution,
      this.pix
    );
    stackDepth = 0;
    return this.features;
  }
}

/**
 * Accepts a thinned binary image: pixels, thresh: for douglas peucker
 * Outputs a forest of connected points
 * @param pixels Pixels to work on
 * @param thresh Douglas-Peucker threshold
 * @param box Correponding bounding box
 * @param canvas Corresponding canvas
 * @returns formed forest
 */
export const forestmain = function (
  pixels: myPixel[][],
  douglasPeuckerThresh: number
  /*  box: Bbox,
  canvas: Canvas */
): Forest {
  if (pixels == null || pixels.length == 0) {
    return null;
  }
  /*   width = pixels[0].length;
  height = pixels.length; */
  // ColorOnCanvas(pixels, box, canvas);

  const forest = new Forest(),
    lines = gen_lines(pixels, douglasPeuckerThresh);
  lines.forEach((line) => {
    line.douglas_peucker();
    if (line && line.features) {
      forest.addLine(line);
    }
  });
  forest.makeAdjList();

  return forest;
};

/**
 * Splits the thinned image into continous lines at junctions
 * @param pixels
 * @param thresh
 * @returns List of Lines
 */
export const gen_lines = function (
  pixels: myPixel[][],
  thresh: number
): Line[] {
  // eslint-disable-next-line @typescript-eslint/no-array-constructor
  const visited = new Array();
  for (let i = 0; i < pixels.length; i++) {
    visited.push([]);
    for (let j = 0; j < pixels[i].length; j++) {
      visited[i].push(false);
    }
  }

  const res: Line[] = [];
  res.push(new Line(thresh));
  for (let i = 0; i < pixels.length; i++) {
    for (let j = 0; j < pixels[i].length; j++) {
      if (pixels[i][j].component[0] == 0 && ~visited[i][j]) {
        stackDepth = 0;
        gen_line_branches(i, j, pixels, visited, res, thresh);
        if (res[res.length - 1].pix.length <= 1) {
          res.splice(res.length - 1, 1);
        }
        stackDepth = 0;
        if (LINELIMIT > 0 && res.length > LINELIMIT) {
          console.log(
            `reached no. of lines limit in gen_lines , with line limit = ${LINELIMIT}`
          );
          return [];
        }
        res.push(new Line(thresh));
      }
    }
  }
  /* if (SHOWCOMMENTS) {
    console.log(`no. of lines = ${res.length}`);
  } */

  return res;
};

// Util functions
const gen_poly_lines_douglas_peucker = function (
  st: number,
  end: number,
  thresh: number,
  pix: myPixel[]
): myPixel[] {
  stackDepth++;
  let ans: myPixel[] = [];
  if (st > end) {
    return null;
  }
  if (end == st) {
    return [pix[st]];
  }
  if (end - st + 1 == 2) {
    ans.push(pix[st]);
    ans.push(pix[end]);
    return ans;
  }
  let ind = 1,
    mx: number = perpendicular_distance_three_points(
      pix[st],
      pix[end],
      pix[st + 1]
    );
  for (let i = st + 2; i <= end - 1; i++) {
    const dist = perpendicular_distance_three_points(pix[st], pix[end], pix[i]);
    if (mx <= dist) {
      mx = dist;
      ind = i;
    }
  }
  if (mx < thresh) {
    ans.push(pix[st]);
    ans.push(pix[end]);
    return ans;
  }
  if (stackDepth > STACKLIMIT) {
    return null;
  }
  try {
    const ans1 = gen_poly_lines_douglas_peucker(st, ind, thresh, pix),
      ans2 = gen_poly_lines_douglas_peucker(ind, end, thresh, pix);

    ans =
      ans2 != null && ans2.length > 1 && ans1 != null
        ? ans1.concat(ans2.slice(1, ans2.length))
        : ans1;
  } catch {
    return null;
  }
  return ans;
};

/**
 *
 * @param i x coordinate of pixel to start DFS with
 * @param j y coordinate of pixel to start DFS with
 * @param pixels all pixels in bounding box
 * @param visited Visited array to keep track of visited pixels
 * @param res List of Lines
 * @param thresh Douglas Peucker thresh for the constructor of Line
 */
export const gen_line_branches = function (
  i: number,
  j: number,
  pixels: myPixel[][],
  visited: boolean[][],
  res: Line[],
  thresh: number
) {
  if (pixels[i][j].component[0] != 0) {
    return;
  }
  if (visited[i][j]) {
    return;
  }
  visited[i][j] = true;
  stackDepth++;
  if (stackDepth > STACKLIMIT) {
    return;
  }
  let p = 0;
  res[res.length - 1].push(pixels[i][j]);

  for (let ii = 0; ii < 8; ii++) {
    const x = i + dr[ii],
      y = j + dc[ii];
    if (
      x < 0 ||
      y < 0 ||
      x >= pixels.length ||
      y >= pixels[i].length ||
      pixels[x][y].component[0] > 0 ||
      visited[x][y]
    ) {
      continue;
    }
    p++;
  }
  for (let ii = 0; ii < 8; ii++) {
    const x = i + dr[ii],
      y = j + dc[ii];
    if (x < 0 || y < 0 || x >= pixels.length || y >= pixels[i].length) {
      continue;
    }
    if (pixels[x][y].component[0] > 0) {
      continue;
    }
    if (visited[x][y]) {
      continue;
    }
    if (p > 1) {
      res.push(new Line(thresh));
      res[res.length - 1].push(pixels[i][j]);
    }
    try {
      gen_line_branches(x, y, pixels, visited, res, thresh);
    } catch {
      return;
    }
  }
};
const perpendicular_distance_three_points = function (
  A: myPixel,
  B: myPixel,
  pix: myPixel
): number {
  const X = B.x - A.x,
    Y = B.y - A.y;
  if (X == 0 && Y == 0) {
    return -1;
  }

  const cons = A.x * Y - A.y * X,
    den = Math.sqrt(X * X + Y * Y);
  let dist = Math.abs(X * pix.y - Y * pix.x + cons);
  dist /= den;

  return dist;
};
