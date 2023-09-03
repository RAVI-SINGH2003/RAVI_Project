/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 ************************************************************
 *
 *  Copyright (c) 2019 Progressive Accessibility Solutions
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * @fileoverview Class for Table functions.
 *
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */

import Bbox from '../utility/bbox';
import Canvas from '../utility/canvas';
import { Cluster } from '../utility/cluster';
import { Cell, Row, Table } from './table';
import { Span } from '../core/span';
import { Pixel, Util } from '../utility/utils';
import { tableThreshold } from '../global/parameters';
import * as foo from '../utility/helper_functions';
import { Caption } from '../caption/caption';
import Page from '../core/page';
import log from 'loglevel';
let table: Table;

/**
 * @param box: a single box of table
 * @param spans: all spans of a document as an array
 * @return spans present in the given box
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
export function spansInBox(box: Bbox, spans: Span[]) {
  let spanList: Span[] = spans;
  spanList = spanList.filter((s) => box.contains(s.bbox));
  return spanList;
}

/**
 * @param box: outer box of a table
 * @return true if box is associated with table using caption
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
export function bbox_filter_fig(bbox: Bbox) {
  if (Caption.getcaptions().size > 0) {
    for (const c of Caption.getcaptions().values()) {
      if (c.flag == 0) {
        if (c.object_box.contains(bbox)) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * @param t: input as number
 * @returns the sigmoid value of the parameter passed
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
export function sigmoid(t: number) {
  return 1 / (1 + Math.E ** -t);
}

/**
 * Input -> List of Spans
 * Returns a list of various comparison measures
 * which can be used as parameters in say doClustering
 * return -> array of maxH, avgH, RMSH, Height found
 * using slopes of sigmoid function
 * @param spans: array of spans in a page of a document
 * @return parameters value of maximum, sum, sumRMS, weighted Mean
 * @author Simarpreet Singh Saluja, Ayush Garg
 */

export function cluster_parameters(spans: Span[]) {
  let minH = Infinity,
    maxH = -1,
    sum = 0,
    sumRMS = 0,
    weightSum = 0,
    weightedMean = 0;

  for (const s of spans) {
    const b = s.bbox.box(),
      height = b[3] - b[1];

    if (height > maxH) {
      maxH = height;
    }
    if (height < minH) {
      minH = height;
    }

    sum += height;
    sumRMS += height * height;
  }

  sum /= spans.length;
  sumRMS = Math.sqrt(sumRMS / spans.length);
  const mean = (maxH + minH) / 2;

  for (const s of spans) {
    const b = s.bbox.box(),
      h = b[3] - b[1],
      z = h - mean,
      sig = sigmoid(z),
      w = sig * (1 - sig);
    weightSum += w;
    weightedMean += w * h;
  }
  weightedMean /= weightSum;

  return [maxH, sum, sumRMS, weightedMean];
}

/**
 * @param box: a single box
 * @return true if given bounding box is valid or not ie minX < maxX and minY < maxY
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */

export function bbox_valid(bbox: Bbox) {
  if (bbox.box()[0] >= bbox.box()[2]) {
    return false;
  }
  if (bbox.box()[1] >= bbox.box()[3]) {
    return false;
  }
  return true;
}

// Table To HTML creator

/**
 * Function to create HTML tags for the table
 * Table information given as a and b
 * document and spans passed as parameters.
 * @param a: 3d array of cell boxes of a table
 * @param b: 1 for bordered table algorithm
 * @param document: document html
 * @param spans: Hash table of spans of a page
 * @return a table html
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
export function makeHTML(
  a: number[][][],
  b: number,
  document: HTMLDocument,
  spans: Map<string, Span>
) {
  const my_table = document.createElement('table');
  my_table.style.border = '1px solid black';
  my_table.style.borderCollapse = 'collapse';

  /**
   * My_table.style.height = "100px"
   * My_table.style.width = "100%"
   */
  //filter table spans
  const table_spans = new Map<string, Span>();
  const table_box: Bbox = new Bbox([
    [a[0][0][0], a[0][0][3]],
    [
      a[a.length - 1][a[a.length - 1].length - 1][2],
      a[a.length - 1][a[a.length - 1].length - 1][1]
    ]
  ]);
  for (const [id, span] of spans) {
    if (table_box.contains(span.bbox)) table_spans.set(id, span);
  }

  for (let r = 0; r < a.length; r++) {
    const row = my_table.insertRow();
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c][4] != 1 && a[r][c][5] != 1) {
        //let iscell:number = 0;
        const cell = row.insertCell();
        if (b == 1) {
          cell.style.border = '1px solid black';
        }
        let prev_key = '';
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [key, value] of table_spans) {
          /*if (value.bbox.pixels().length == 0) {
            continue;
          }*/
          if (b == 1) {
            //for algo1
            const b_cell: Bbox = new Bbox([
              [a[r][c][0], a[r][c][3]],
              [a[r][c][2], a[r][c][1]]
            ]);
            //filter cell spans
            //space and null chars
            if (cell.innerText.length != 0 && value.bbox.pixels().length == 0 && (value.html.innerText==''||value.html.innerText==' ')) {
              cell.innerText += value.html.innerText;
              table_spans.delete(key);
            }
            //span inside cell
            else if (b_cell.contains(value.bbox)) {
              if (prev_key != '') {
                if (value.bbox.minY >= spans.get(prev_key).bbox.maxY) {
                  //two lines vertically have a word chopped off
                  if (!cell.innerText.endsWith('-')) {
                    cell.innerText += ' ' + value.html.innerText;
                  } else {
                    const last_char = cell.innerText.charAt(
                      cell.innerText.length - 1
                    );
                    cell.innerText = cell.innerText.replace(
                      last_char,
                      value.html.innerText
                    );
                  }
                }
                //two words without space coming in consecutive iteration of a line,
                //check if there exists a space char in between
                else {
                  if (!cell.innerText.endsWith(' '))
                    if (
                      (spans.has(`span${parseInt(prev_key.substr(4)) + 1}`) &&
                        spans.get(`span${parseInt(prev_key.substr(4)) + 1}`)
                          .html.innerText == ' ') ||
                      (spans.has(`span${parseInt(key.substr(4)) - 1}`) &&
                        spans.get(`span${parseInt(key.substr(4)) - 1}`).html
                          .innerText == ' ')
                    )
                      cell.innerText += ' ';
                  cell.innerText += value.html.innerText;
                }
              } else {
                //first non space word inside cell
                cell.innerText += value.html.innerText;
              }
              prev_key = key;
              table_spans.delete(key);
              //console.log("removing:",key,value.html.innerText);
            } else {
              //any glyphs inside this cell
              const isglyphs = [];
              let g_index = 1;
              let g_ovrl_index = 1;
              for (const g of value.glyphs.values()) {
                if (b_cell.contains(g.bbox)) isglyphs.push(g_index);
                if (b_cell.overlapLine(g.bbox, b_cell)) g_ovrl_index++;
                g_index++;
              }
              if (isglyphs.length != 0 && g_ovrl_index - 1 == isglyphs.length) {
                if (value.html.innerText.includes(' ')) {
                  const split_span = value.splitspanwithspace();
                  if (split_span.length > 1) {
                    for (let i_s = 0; i_s < split_span.length; i_s++) {
                      table_spans.set(split_span[i_s].id, split_span[i_s]);
                    }
                    table_spans.delete(key);
                    //console.log("removing multi cell:",key,value.html.innerText);
                  } else cell.innerText += value.html.innerText;
                } else {
                  cell.innerText += value.html.innerText;
                }
              } else if (
                g_ovrl_index > 1 &&
                g_ovrl_index - 1 != isglyphs.length
              )
                cell.innerText += value.html.innerText;
              //console.log(r,c,key,value.html.innerText,cell.innerText);
            }
            //console.log(table_spans);
          } else {
            //for algo2
            if (value.bbox.pixels().length == 0) continue;
            const x: number = value.bbox.pixels()[0][0];
            const y: number = value.bbox.pixels()[0][1];

            if (
              x >= a[r][c][0] &&
              x <= a[r][c][2] &&
              y >= a[r][c][3] &&
              y <= a[r][c][1]
            ) {
              cell.innerText += value.html.innerText;
              //console.log(key);
            }
          }
        }
        // cell.innerText = "";
        // console.log(table_spans);
        let rowspan = 1;
        let colspan = 1;
        let j = r + 1;
        while (j < a.length) {
          if (a[j][c][5] != 1) break;
          else {
            rowspan += 1;
          }
          j++;
        }
        let k = c + 1;
        while (k < a[r].length) {
          if (a[r][k][4] != 1) break;
          else {
            colspan += 1;
          }
          k++;
        }
        cell.rowSpan = rowspan;
        cell.colSpan = colspan;
      }
    }
  }

  return my_table;
  //document.body.appendChild(my_table);
}

/**
 * Algo 1 Helper Functions
 * @param pix: 8 bits unsigned pixel array
 * @param canvas: canvas of a page
 * @param x1: rightmost co-ordinate
 * @param x2: leftmost co-ordinate
 * @param y1: bottom co-ordinate
 * @param y2: top co-ordinate
 * @param accum: array of sum of graypixels columnwise and rowwise
 * @return the sum of graypixel value column and row-wise
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */

function FillAccum(
  pix: Uint8ClampedArray,
  canvas: Canvas,
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  accum: number[][]
) {
  for (let j = x2; j <= x1; j++) {
    for (let k = y2; k <= y1; k++) {
      const rgba: number[] = Util.getPixel(pix, j, k, canvas.width);
      let graynum = 0.2989 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2];
      graynum /= 255;
      if (graynum < 0.4) {
        for (let q = 0; q < 2; q++) {
          const ind: number = q == 1 ? j - x2 : k - y2;
          accum[ind][q]++;
        }
      }
    }
  }
  return accum;
}
/**
 * detect lines co-ordinates by using accumulator's spike
 * @param tkn: line thickness in pixel
 * @param maxD: size of background glyphs in height or width
 * @param accum: accumulator array sum of graypixels rowwise or columnwise
 * @param linethres: minimum distance between lines of a table
 * @param type: rowwose or columnwise flag
 * @return line co-ordinates as an array 
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
function LineDetect(
  tkn: number,
  maxD: number,
  accum: number[][],
  linethres: number,
  type: number
) {
  const lines = [];
  lines.push([tkn, type]);
  let nextline = tkn;
  let lastline = tkn;
  for (let p: number = 3 * tkn + 1; p <= maxD - 3 * tkn - 1; p += 1) {
    const q: number = type;
    let x = 0;
    for (let pec = 0; pec < tkn; pec++) {
      x += accum[p - pec][q];
    }
    if (x > linethres) {
      nextline = p;
      const linecheck = Table.collapceCell(lastline, nextline, type);
      if (linecheck != lastline) {
        lines.push([p, q]);
        p += 3 * tkn;
        lastline = p;
      }
    }
  }
  nextline = maxD - tkn;
  const linecheck = Table.collapceCell(lastline, nextline, type);
  if (linecheck != lastline) {
    lines.push([maxD - tkn, type]);
    lastline = maxD - tkn;
  }
  return lines;
}
/**
 * populate horizontal and vertical lines corresponding to spike co-ordinates in accumulator
 * @param type: rowwise or columnwise flag
 * @param linearr: line co-ordinates as an array
 * @param x1: rightmost co-ordinate
 * @param x2: leftmost co-ordinate
 * @param y1: bottom co-ordinate
 * @param y2: top co-ordinate
 * @param pix: 8 bit unsigned pixel array
 * @param canvas: canvas of a page
 * @param linepixels: populate horizontal and vertical lines corresponding to spike co-ordinates in linearr
 * @return linepixels
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
function PixPop(
  type: number,
  linearr: number[][],
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  pix: Uint8ClampedArray,
  canvas: Canvas,
  linepixels: any[]
) {
  // Populating the horpixels array
  for (let l = 0; l < linearr.length; l++) {
    for (let j = x2; j <= x1; j++) {
      for (let k = y2; k <= y1; k++) {
        const rgba: number[] = Util.getPixel(pix, j, k, canvas.width);
        let graynum = 0.2989 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2];
        graynum /= 255;
        if (graynum < 0.4) {
          const ind: number = type == 0 ? k - y2 : j - x2,
            param: number = type == 0 ? j : k;

          if (ind == linearr[l][0]) {
            if (param < linepixels[l][0][type]) {
              linepixels[l][0][0] = j;
              linepixels[l][0][1] = k;
            }
            if (param > linepixels[l][1][type]) {
              linepixels[l][1][0] = j;
              linepixels[l][1][1] = k;
            }
          }
        }
      }
    }
  }
  return linepixels;
}
/**
 * merge two rows if there is no horizontal lines between two cells
 * @param canvas: canvas of a page
 * @param pix: 8 bit unsigned pixel array
 * @param Nhor: size of horizontal lines
 * @param Nver: size of vertical lines
 * @param bboxe: 3d array of cell boxes
 * @return bboxes
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
function MergeRows(
  canvas: Canvas,
  pix: Uint8ClampedArray,
  Nhor: number,
  Nver: number,
  bboxes: any[]
) {
  // Merging adjacent rows
  for (let r = 0; r < Nhor - 1; r++) {
    for (let c = 0; c < Nver - 1; c++) {
      if (bboxes[r][c][4] != 1) {
        for (let q: number = c; q < Nver - 2; q++) {
          let flag = 0;
          for (
            let j: number = bboxes[r][q][2] - 3;
            j <= bboxes[r][q][2] + 3;
            j++
          ) {
            let cntu = 0;
            for (let k: number = bboxes[r][q][3]; k < bboxes[r][q][1]; k++) {
              const rgba: number[] = Util.getPixel(pix, j, k, canvas.width);
              let graynum =
                0.2989 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2];
              graynum /= 255;
              if (graynum < 0.4) {
                cntu++;
              }
            }
            // Console.log(cntu)

            if (cntu > 30) {
              flag = 1;
              break;
            }
          }
          if (flag == 1) {
            break;
          } else {
            bboxes[r][c][2] = bboxes[r][q + 1][2];
            bboxes[r][q + 1][4] = 1;
          }
        }
      }
    }
  }
  return bboxes;
}
/**
 * merge adjacent columns if there is no vertical line between two cells
 * @param canvas: canvas of a page
 * @param pix: 8 bit unsigned pixel array
 * @param Nhor: size of horizontal lines
 * @param Nver: size of vertical lines
 * @param bboxe: 3d array of cell boxes
 * @return bboxes
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
function MergeColumns(
  canvas: Canvas,
  pix: Uint8ClampedArray,
  Nhor: number,
  Nver: number,
  bboxes: any[]
) {
  // Merging adjacent columns
  for (let c = 0; c < Nver - 1; c++) {
    for (let r = 0; r < Nhor - 1; r++) {
      if (bboxes[r][c][5] != 1) {
        for (let q: number = r; q < Nhor - 2; q++) {
          let flag = 0;
          for (
            let j: number = bboxes[q][c][1] - 3;
            j <= bboxes[q][c][1] + 3;
            j++
          ) {
            let cntu = 0;
            for (let k: number = bboxes[q][c][0]; k < bboxes[q][c][2]; k++) {
              const rgba: number[] = Util.getPixel(pix, k, j, canvas.width);
              let graynum =
                0.2989 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2];
              graynum /= 255;
              if (graynum < 0.4) {
                cntu++;
              }
            }
            if (cntu > 35) {
              flag = 1;
              break;
            }
          }
          if (flag == 1) {
            break;
          } else {
            bboxes[r][c][1] = bboxes[q + 1][c][1];
            bboxes[q + 1][c][5] = 1;
          }
        }
      }
    }
  }
  return bboxes;
}
/**
 * draw green lines for table lines on document canvas
 * @param canvas of a table
 * @param boxes of cells of a table
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
function DrawTable(canvas: Canvas, bboxes: any[]) {
  for (const boxes of bboxes) {
    for (const box of boxes) {
      if (box[4] != 1 && box[5] != 1) {
        const pixs: Pixel[] = [];
        for (let i = box[0]; i <= box[2]; i++) {
          for (let j = box[3]; j <= box[1]; j++) {
            pixs.push([i, j]);
          }
        }
        const dispbox = new Bbox(pixs);
        dispbox.draw(canvas, 'rgba(0,255,0,1)');
      }
    }
  }
}
/**
 * normalising threshold for each document using its dimension
 * @param vthr: spike threshold of vertical line graypixels
 * @param hthr: spike threshold of horizontal line graypixels
 * @return [vthr, hthr] after page normalization
 * @author Hire Vikram Umaji and Amar Agnihotri
 */
function calcThreshold(vthr: number, hthr: number) {
  const width = Page._width;
  const height = Page._height;

  //Assuming 3508 x 2480 px as standard A4 dimension
  if (width < 2480 && height < 3508) {
    let vthr1 = Math.round(vthr * (height / 2480));
    let hthr1 = Math.round(hthr * (width / 3508));
    if (0.3 > Table.table_width / width) {
      hthr1 = Math.round(hthr / 2);
    }
    if (0.2 > Table.table_height / height) {
      vthr1 = Math.round(vthr / 2);
    }

    return [vthr1, hthr1];
  } else {
    return [vthr, hthr];
  }
  //return [vthr, hthr, lthr];
}
/**
 * make cell boxes of bordered table
 * @param bbbox: cell boxes array
 * @param canvas: canvas of a page
 * @return array of table as cell boxes, number of rows and columns
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
function GridTable(bbbox: Bbox[], canvas: Canvas) {
  const fans: any = [];
  for (let i = 0; i < bbbox.length; i++) {
    Table.settable_dimension(
      bbbox[i].maxX - bbbox[i].minX,
      bbbox[i].maxY - bbbox[i].minY
    );
    const ctx = canvas.getContext(),
      pix = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      borders: number[] = bbbox[i].box(),
      x2 = borders[0],
      y2 = borders[1],
      x1 = borders[2],
      y1 = borders[3];

    // Shift the origin at top left corner, then maximum distance of a horizontal/vertical line
    let accum = new Array(Math.max(x1 - x2, y1 - y2));
    for (let p = 0; p <= Math.max(x1 - x2, y1 - y2); p++) {
      accum[p] = new Array(2);
    }
    for (let p = 0; p <= Math.max(x1 - x2, y1 - y2); p++) {
      for (let q = 0; q < 2; q++) {
        accum[p][q] = 0;
      }
    }

    // Fill accumulator array
    accum = FillAccum(pix, canvas, x1, x2, y1, y2, accum);

    //let vlinethres = tableThresholds.vlinethres;
    let vlinethres = new tableThreshold().tableDetectParameters.get(
      'vlinethres'
    );
    // Threshold for horizontal lines
    let hlinethres = new tableThreshold().tableDetectParameters.get(
      'hlinethres'
    );
    // Thickness of lines
    const tkn = new tableThreshold().tableDetectParameters.get('tkn');
    [vlinethres, hlinethres] = calcThreshold(vlinethres, hlinethres);

    // Array of horizontal lines
    const horiz = LineDetect(tkn, y1 - y2, accum, hlinethres, 0);
    // Array of vertical lines
    const vertiz = LineDetect(tkn, x1 - x2, accum, vlinethres, 1);

    // Line detection using Hough Transform, accum being the accumulation matrix

    // Will not analyse further any bounding boxes having less than 3 vertical/horizontal lines (minimum structure of table 2x2)
    if (vertiz.length < 3 || horiz.length < 3) {
      continue;
    }
    // Array of pixels of horizontal lines
    let horpixels = new Array(horiz.length),
      // Array of pixels of vertical lines
      verpixels = new Array(vertiz.length);

    for (let p = 0; p < horiz.length; p++) {
      horpixels[p] = new Array(2);
      horpixels[p][0] = [canvas.width, canvas.height];
      horpixels[p][1] = [0, 0];
    }
    for (let p = 0; p < vertiz.length; p++) {
      verpixels[p] = new Array(2);
      verpixels[p][0] = [canvas.width, canvas.height];
      verpixels[p][1] = [0, 0];
    }
    horpixels = PixPop(0, horiz, x1, x2, y1, y2, pix, canvas, horpixels);

    // Populating the verpixels array
    verpixels = PixPop(1, vertiz, x1, x2, y1, y2, pix, canvas, verpixels);

    // At this stage, assuming the table to have a complete R x C structure, and finding coordinates of cells [minx,maxy,maxx,miny]
    let bboxes = new Array(horiz.length - 1);
    for (let p = 0; p < bboxes.length; p++) {
      bboxes[p] = new Array(vertiz.length - 1);
    }
    for (let r = 0; r < horiz.length - 1; r++) {
      for (let c = 0; c < vertiz.length - 1; c++) {
        const ans = [
          verpixels[c][0][0],
          horpixels[r + 1][0][1],
          verpixels[c + 1][0][0],
          horpixels[r][0][1],
          0,
          0
        ];
        bboxes[r][c] = ans;
      }
    }
    //   Console.log(bboxes);
    bboxes = MergeRows(canvas, pix, horiz.length, vertiz.length, bboxes);
    bboxes = MergeColumns(canvas, pix, horiz.length, vertiz.length, bboxes);
    //   Console.log(bboxes);
    DrawTable(canvas, bboxes);
    fans.push({
      need: bboxes,
      box: bbbox[i],
      rows: horiz.length - 1,
      columns: vertiz.length - 1
    });
  }
  return fans;
}
/**
 * bordered table analysis to make cells boxes and table html
 * @param box: array of background glyphs boxes
 * @param canvas: canvas of a page
 * @param document: html element
 * @param spans: all apans of a page in a hash table
 * @return tables as array of table
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */
export function analysis(
  box: Bbox[],
  canvas: Canvas,
  document: HTMLDocument,
  spans: Map<string, Span>
) {
  //console.log('Algo1 Working');
  const arr = GridTable(box, canvas);
  const tables = [];
  if (arr.length == 0) {
    log.info(`No Table Found`);
  } else {
    log.info(`Tables Found:${arr.length}`);
    for (const a of arr) {
      tables.push(makeHTML(a.need, 1, document, spans));
      Table.table_boxes.push(a.box);
    }
  }
  return tables;
}
/**
 * append after creating table html in the document html
 * @param Tables: array of table
 * @param document: html element
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function algo2analysis(Tables: Table[], document: HTMLDocument) {
  for (const table of Tables) {
    const rowspans = this.rowSpan_list(table),
      colspans = this.col_span_list(table),
      /*
       * colspans
       */
      my_table = document.createElement('table');
    my_table.style.border = '1px solid black';
    my_table.style.borderCollapse = 'collapse';

    let whichrow = -1;
    for (let i = 0; i < table.rowList.length; i++) {
      //   Console.log("2")
      const ROWW = table.rowList[i],
        rowspanl = rowspans[i];
      for (let j = 0; j < ROWW.rowList.length; j++) {
        whichrow += 1;
        const row = my_table.insertRow(),
          subrow = ROWW.rowList[j];

        /**
         * subrow
         */
        for (let abc = 0; abc < subrow.cellList.length; abc++) {
          //Console.log("3")
          const cell = row.insertCell();

          let colspan = 1,
            rowspan = 1;
          if (j == 0) {
            rowspan = rowspanl[abc];
          }
          colspan = colspans[whichrow][abc];
          // Console.log("row",whichrow)
          cell.rowSpan = rowspan;
          cell.colSpan = colspan;
          let text = '';
          for (const span of subrow.cellList[abc].spanList) {
            text += span.html.innerText;
          }
          cell.innerText = text;
          // Cell.innerText = ""
        }
      }
    }
    document.body.appendChild(my_table);
  }
}
/**
 * @return table after making row by using conditions of valid box and nonempty span
 * @author Simarpreet Singh Saluja, Ayush Garg
 */

export function rowTableAnalysis() {
  const spans = table.spanList,
    { tableBox } = table,
    arr = cluster_parameters(spans),
    threshold = arr[3];

  let index = -1,
    rowId = 0,
    colId = 0,
    row: Row = new Row(rowId++, tableBox),
    col: Cell = new Cell(colId, tableBox),
    colChec: boolean,
    rowChec1,
    rowChec2,
    rowChec3,
    rowChec4;

  col.addSpan(spans[0]);
  row.addSpan(spans[0]);

  for (let i = 1; i < spans.length; i++) {
    // Console.log("Span ",spans[i].html.innerText);
    if (row.cellList.length === 0) {
      rowChec1 = foo.condRow1(col.spanBox, spans[i].bbox);
      rowChec2 = foo.condRow2(col.spanBox, spans[i].bbox);
      rowChec3 = foo.condRow3(col.spanBox, i, spans);
      rowChec4 = !foo.condRow2(spans[i].bbox, col.spanBox);
    } else {
      rowChec1 = foo.condRow1(row.spanBox, spans[i].bbox);
      rowChec2 = foo.condRow2(row.cellList[0].spanBox, spans[i].bbox);
      rowChec3 = foo.condRow3(row.spanBox, i, spans);
      rowChec4 = !foo.condRow2(spans[i].bbox, col.spanBox);
    }
    // Console.log("value ",rowChec1,rowChec2,rowChec3,rowChec4);

    if (rowChec1 && rowChec2 && rowChec3 && rowChec4) {
      index = -1;
      if (col.spanList.length > 0) {
        row.addCell(col);
      }
      table.rowList.push(row);
      row = new Row(rowId++, tableBox);
      row.addSpan(spans[i]);
      colId = 0;
      col = new Cell(colId++, tableBox);
      col.addSpan(spans[i]);
      continue;
    }
    // Console.log(spans[i].html.innerText + " SPAN");
    colChec = foo.condCol1(col.spanBox, spans[i].bbox, threshold);
    // Console.log("Col Check Value " + colChec);
    if (colChec) {
      const whichIndex = foo.condCol2(row.cellList, spans[i].bbox);
      // Console.log("WHICH " + whichIndex + " index " + index);
      if (whichIndex == -1) {
        if (index == -1) {
          row.addCell(col);
          col = new Cell(colId++, tableBox);
          col.addSpan(spans[i]);
        } else {
          index = -1;
          col = new Cell(colId++, tableBox);
          col.addSpan(spans[i]);
        }
      } else {
        index = whichIndex;
        row.cellList[index].addSpan(spans[i]);
      }
    } else {
      const whichIndex = foo.condCol2(row.cellList, spans[i].bbox);
      // Console.log("Which Index " + whichIndex + " index " + index + " len " + row.cellList.length);
      if (whichIndex != -1 && whichIndex < row.cellList.length) {
        row.addCell(col);
        col = new Cell(colId++, tableBox);
      }
      index = whichIndex;
      if (index != -1) {
        row.cellList[index].addSpan(spans[i]);
      } else {
        col.addSpan(spans[i]);
      }
    }

    row.addSpan(spans[i]);
  }
  // Console.log("LEN " + col.spanList.length);
  if (col.spanList.length > 0) {
    row.addCell(col);
  }
  table.rowList.push(row);
  return table;
}
/**
 * @param row: row object of table
 * @return row after adding subrow using condition of valid box,
 *  threshold size and nonempty span.
 * @author Simarpreet Singh Saluja, Ayush Garg
 */

export function subrowAnalysis(row: Row) {
  const arr = cluster_parameters(row.spanList),
    spans = row.spanList,
    threshold = arr[3];

  let rowId = 0,
    colId = 0,
    index = -1,
    currIndex = 0,
    subrow: Row = new Row(rowId++, row.tableBox),
    cell: Cell = new Cell(colId++, row.tableBox);

  cell.addSpan(spans[0]);
  subrow.addSpan(spans[0]);

  for (let i = 1; i < spans.length; i++) {
    const whichCell = foo.condCol2(row.cellList, spans[i].bbox);
    if (whichCell == -1) {
      console.log(`Not assigned any column ${spans[i].html.innerText}`);
      break;
    }

    const below = foo.condRow1(cell.spanBox, spans[i].bbox);

    if (whichCell < currIndex && below) {
      if (cell.spanList.length > 0) {
        subrow.addCell(cell);
      }
      row.rowList.push(subrow);
      subrow = new Row(rowId++, row.tableBox);
      subrow.addSpan(spans[i]);
      colId = 0;
      cell = new Cell(colId++, row.tableBox);
      cell.addSpan(spans[i]);
      currIndex = whichCell;
      continue;
    }

    currIndex = whichCell;
    const colChec = foo.condCol1(cell.spanBox, spans[i].bbox, threshold);

    if (colChec) {
      const whichIndex = foo.condCol2(subrow.cellList, spans[i].bbox);
      if (whichIndex == -1) {
        if (index == -1) {
          subrow.addCell(cell);
          cell = new Cell(colId++, row.tableBox);
          cell.addSpan(spans[i]);
        } else {
          index = -1;
          cell = new Cell(colId++, row.tableBox);
          cell.addSpan(spans[i]);
        }
      } else {
        index = whichIndex;
        subrow.cellList[index].addSpan(spans[i]);
      }
    } else {
      const whichIndex = foo.condCol2(subrow.cellList, spans[i].bbox);
      if (whichIndex != -1 && whichIndex < row.cellList.length) {
        row.addCell(cell);
        cell = new Cell(colId++, row.tableBox);
      }
      index = whichIndex;
      if (index != -1) {
        subrow.cellList[index].addSpan(spans[i]);
      } else {
        cell.addSpan(spans[i]);
      }
    }

    subrow.addSpan(spans[i]);
  }

  if (cell.spanList.length > 0) {
    subrow.addCell(cell);
  }
  row.rowList.push(subrow);

  return row;
}
/**
 * filter table using number of rows or column less than 2
 * @param tab: a single table object
 * @return true if table is valid using condition of more than one row and
 *  non-overlaping single span with multi cells.
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */

function filterTable(tab: Table) {
  if (tab.rowList.length < 1) {
    console.log('Row lenght < 1');
    return false;
  }

  if (tab.rowList.length == 1) {
    if (tab.rowList[0].rowList.length == 1) {
      console.log('Row length == 1');
      return false;
    }
  }

  if (tab.clusterList.length <= 1) {
    console.log('Cluster length <=1');
    return false;
  }

  let num = -1;

  for (const r of tab.rowList) {
    num = Math.max(num, r.cellList.length);
  }
  if (num <= 1) {
    console.log('1 column table ');
    return false;
  }

  for (let i = 1; i < tab.rowList.length; i++) {
    if (
      tab.rowList[i].spanBox.box()[3] <= tab.rowList[i - 1].spanBox.box()[1]
    ) {
      return false;
    }
  }

  for (const r of tab.rowList) {
    for (let i = 1; i < r.cellList.length; i++) {
      if (r.cellList[i].spanBox.overlap(r.cellList[i - 1].spanBox)) {
        return false;
      }
    }
  }
  return true;
}
/**
 * Analyses One Potential Table
 * @param id: a number to be assigned uniquely to table
 * @param b: a single outer box to be assigned to table
 * @param spans: array of spans of table
 * @param clusters: cluster array of spans
 * @return true if table is found
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */

export function analyseOneTable(
  id: number,
  b: Bbox,
  spans: Span[],
  clusters: Cluster[]
) {
  if (spans.length < 4) {
    return false;
  }

  if (clusters.length <= 1) {
    return false;
  }
  table = new Table(id, b);
  table.addSpanList(spans);
  table.addClusterList(clusters);
  table.filterSpanList();

  table = rowTableAnalysis();
  console.log(table.rowList);
  console.log('ROWS');
  for (let r of table.rowList) {
    r = subrowAnalysis(r);
  }
  table.clusterFilter();

  const boolVal = filterTable(table);

  if (!boolVal) {
    return false;
  }

  for (const r of table.rowList) {
    for (const sr of r.rowList) {
      for (const c of sr.cellList) {
        c.columnAnalysis();
      }
    }
  }

  table.updateRowBoundaries();
  table.updateColumns();
  console.log('In UPDATE SUBROWS');
  table.updateSubRows();

  return true;
}

// Algo 2 and Algo 3 main functions

/**
 * Main function for algo2
 * @param spans: all apans of a page as a hash table
 * @param clusters: cluster array of spans
 * @param boxes: array of background glyphs boxes
 * @param canvas: canvas of a page
 * @return tables as array of table
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function algorithm2(
  spans: Span[],
  clusters: Cluster[],
  boxes: Bbox[],
  canvas: Canvas
) {
  console.log('Algo2 Working');
  let id = 0;
  const tabList: Table[] = [];
  if (boxes.length == 0) {
    console.log('No Tables Found\nAlgo2 Finished');
    return [];
  }
  for (const b of boxes) {
    const t = analyseOneTable(
      id++,
      b,
      foo.spansInBox(b, spans),
      foo.clusterInBox(b, clusters)
    );
    if (t) {
      tabList.push(table);
    }
  }
  console.log(`Tables : ${tabList.length}`);

  for (const tab of tabList) {
    tab.printEveryBit();
    tab.drawMajor(canvas);
  }

  console.log('Algo2 Finished');
  return tabList;
}
/**
 * Main function for algo3
 * @param id: a unique number to be assigned to table
 * @param clusters: cluster array of spans
 * @param canvas: canvas of a page
 * @param spans: all apans of a page as an array
 * @param boxes: array of background glyphs boxes
 * @return tabList as array of borderless table using cluster of span as a cell 
 * @author Simarpreet Singh Saluja, Ayush Garg
 */

export function algorithm3(
  id: number,
  clusters: Cluster[],
  canvas: Canvas,
  spans: Span[],
  boxes: Bbox[]
) {
  console.log('Algo3 Working');
  let bboxes: Bbox[] = foo.BoundarylessTables(clusters, canvas);
  bboxes = bboxes.filter((b) => foo.boxListOverlap(b, boxes));

  const tabList: Table[] = [];
  for (const b of bboxes) {
    const t = analyseOneTable(
      id++,
      b,
      foo.spansInBox(b, spans),
      foo.clusterInBox(b, clusters)
    );
    if (t) {
      tabList.push(table);
    }
  }
  console.log(`Tables : ${tabList.length}`);

  for (const tab of tabList) {
    tab.printEveryBit();
    tab.drawEveryBit(canvas);
  }

  console.log('Algo 3 finished');
  return tabList;
}

/**
 * HELPER FUNCTIONS FOR FINAL ANALYSIS
 * @param cell: a sinle cell object
 * @param row a single row object
 * @return i as cell index in row
 * @author Simarpreet Singh Saluja, Ayush Garg
 */

export function row_span(cell: Cell, row: Row) {
  let i = 1,
    found = false;
  const arr = cell.spanBox.box();

  if (row.rowList.length == 1) {
    return 1;
  }

  for (; i < row.rowList.length; i++) {
    const cell_list = row.rowList[i].cellList;
    for (let j = 0; j < cell_list.length; j++) {
      const box = cell_list[j].spanBox.box();

      if (box[2] < arr[0]) {
        continue;
      }

      if (box[0] > arr[2]) {
        break;
      }

      found = true;
    }

    if (found) {
      break;
    }
  }

  return i;
}
/**
 * @param table: a single table object
 * @return rowSpan_list as array of rows of table
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function rowSpan_list(table: Table) {
  const rowSpan_list = [];
  for (const row of table.rowList) {
    const rowSpan = [],
      cell_list = row.rowList[0].cellList;
    for (let i = 0; i < cell_list.length; i++) {
      rowSpan.push(row_span(cell_list[i], row));
    }

    rowSpan_list.push(rowSpan);
  }
  return rowSpan_list;
}
/**
 * @param table: a single table object
 * @return max_col_row as array of subrows
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function max_col_row(table: Table) {
  let max_num = -1,
    max_col_row = [];

  for (const row of table.rowList) {
    if (row.rowList[0].cellList.length > max_num) {
      max_num = row.rowList[0].cellList.length;
      max_col_row = [];

      for (const cell of row.rowList[0].cellList) {
        max_col_row.push(cell.spanBox);
      }
    }
  }

  return max_col_row;
}
/**
 * @param box1: first box
 * @param box2: second box
 * @return true if the second box is inside the first box 
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function inline_x(box1: Bbox, box2: Bbox) {
  const arr1 = box1.box(),
    arr2 = box2.box();

  if (arr2[0] >= arr1[0] && arr2[2] <= arr1[2]) {
    return true;
  }
  return false;
}
/**
 * @param bound_box: a single box
 * @param boxes: an array of boxes
 * @return value as number of boxes inside bound_box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function merged_boxes(bound_box: Bbox, boxes: Bbox[]) {
  let value = 0;
  const arr = bound_box.box();

  for (const box of boxes) {
    const dim = box.box();

    if (dim[0] > arr[2]) {
      break;
    }

    if (inline_x(bound_box, box)) {
      value += 1;
    }
  }
  if (value == 0) {
    value = 1;
  }
  return value;
}
/**
 * @param row: a single row object
 * @param max_col_row: array ob boxes of subrows
 * @return col_apan_list as array of number of subrows(max_col_row) in each cell
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function one_row_col_span(row: Row, max_col_row: Bbox[]) {
  const default_value = [];
  for (let i = 0; i < max_col_row.length; i++) {
    default_value.push(1);
  }

  if (row.cellList.length == max_col_row.length) {
    return default_value;
  }

  let filled = false,
    diff: number = max_col_row.length - row.cellList.length;
  const col_span_list = [];

  for (const cell of row.cellList) {
    if (filled) {
      col_span_list.push(1);
    } else {
      const bound_box = cell.boundaryBox,
        value = merged_boxes(bound_box, max_col_row);
      col_span_list.push(value);
      diff = diff - value + 1;
    }

    if (diff == 0) {
      filled = true;
    }
  }

  return col_span_list;
}


/**
 * @param table: a single table object
 * @return col_span as array of column_span
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function col_span_list(table: Table) {
  const max_row = max_col_row(table),
    col_span = [];
  for (const row of table.rowList) {
    for (const subrow of row.rowList) {
      col_span.push(one_row_col_span(subrow, max_row));
    }
  }
  return col_span;
}
/**
 * @param table: a single table object
 * @return count as number of rows of given table
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function number_of_rows(table: Table) {
  let count = 0;
  for (const r of table.rowList) {
    count += r.rowList.length;
  }
  return count;
}
/**
 * @param box1: first box
 * @paran box2: second box
 * @return true if both boxes are same
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function compare_two_boxes(box1: Bbox, box2: Bbox) {
  const arr1 = box1.box(),
    arr2 = box2.box();

  if (arr1[0] != arr2[0]) {
    return false;
  }
  if (arr1[1] != arr2[1]) {
    return false;
  }
  if (arr1[2] != arr2[2]) {
    return false;
  }
  if (arr1[3] != arr2[3]) {
    return false;
  }

  return true;
}
/**
 * @param box: a single box
 * @param table_list: array of table
 * @return index of table correspond to outer box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function box_match(box: Bbox, table_list: Table[]) {
  let value = -1;
  for (let i = 0; i < table_list.length; i++) {
    if (compare_two_boxes(table_list[i].tableBox, box)) {
      value = i;
      break;
    }
  }
  return value;
}
/**
 * @param algo1: bordered table
 * @param algo2: array of table found using algo2
 * @return table as borderless if number of rows or columns is 1.5 times
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function final_table_list(algo1: any, algo2: Table[]) {
  const list_algo1 = [],
    list_algo2 = [],
    algo1_preferred: any = {};
  console.log(algo1);

  for (const elem of algo1) {
    const index = box_match(elem.box, algo2);
    if (index >= 0) {
      const table = algo2[index],
        num_rows = number_of_rows(table),
        num_cols = max_col_row(table).length;

      if (num_rows >= 1.5 * elem.rows && num_cols >= 1.5 * elem.columns) {
        continue;
      } else {
        algo1_preferred[index] = 1;
        list_algo1.push(elem);
      }
    } else {
      list_algo1.push(elem);
    }
  }
  for (let j = 0; j < algo2.length; j++) {
    if (j in algo1_preferred) {
      continue;
    } else {
      list_algo2.push(algo2[j]);
    }
  }
  return [list_algo1, list_algo2];
}
