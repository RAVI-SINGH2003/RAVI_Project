/* eslint-disable @typescript-eslint/no-unused-vars*/
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
 * @fileoverview Class for Table helper functions.
 *
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */

import { Pixels } from './utils';
import Bbox from './bbox';
import Canvas from './canvas';
import { Span } from '../core/span';
import { Component } from './components';
import { Cluster } from './cluster';
import { Cell, Row } from '../table/table';



/**
 * Center of box2 lies inside box1 or not
 * @param bbox1: first box
 * @param bbox2: second box
 * @return true if cente of second box is inside first box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function centerContains(bbox1: Bbox, bbox2: Bbox) {
  const num1 = bbox1.box(),
    num2 = bbox2.box(),
    width = bbox2.bboxWH().w,
    height = bbox2.bboxWH().h;

  if (num2[0] - num1[0] + width / 2 < 0) {
    return false;
  }
  if (num2[1] - num1[1] + height / 2 < 0) {
    return false;
  }
  if (num2[2] - num1[2] - width / 2 > 0) {
    return false;
  }
  if (num2[3] - num1[3] - height / 2 > 0) {
    return false;
  }

  return true;
}

/**
 * Returns a bbox made from the spans in a span list
 * @param spans: an array of spans
 * @return box covering all spans
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function boxFromSpans(spans: Span[]) {
  const box: Bbox = new Bbox(spans[0].pixels);
  for (const s of spans) {
    box.update(s.pixels);
  }
  return box;
}

/**
 * @param box: a single box
 * @param spans: an array of spans
 * @returns spanList as spans present within given box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function spansInBox(box: Bbox, spans: Span[]) {
  let spanList: Span[] = spans;
  spanList = spanList.filter((s) => box.contains(s.bbox));
  return spanList;
}

/**
 * @param box: a single box
 * @param clusters as an array of cluster of span
 * @returns the clusters present within given box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function clusterInBox(box: Bbox, clusters: Cluster[]) {
  let clusterList: Cluster[] = clusters;
  clusterList = clusterList.filter((c) => box.contains(c.bbox));
  return clusterList;
}
/**
 * @param col: a column box
 * @param box: a cell box
 * @param thres: width threshold of cell
 * @return true if cell box is inside and valid
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function condCol1(col: Bbox, box: Bbox, thres: number) {
  if (box.box()[0] >= col.box()[2]) {
    if (box.box()[0] - col.box()[2] >= Number(thres)) {
      return true;
    }
  }
  return false;
}
/**
 * @param box1: first box
 * @param box2: second box
 * @return true if first box is inside second box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function boxInLine(box1: Bbox, box2: Bbox) {
  if (box2.box()[0] >= box1.box()[2]) {
    return false;
  }
  if (box2.box()[2] <= box1.box()[0]) {
    return false;
  }
  return true;
}
/**
 * @param cellList: an array of cell
 * @param box: a single box
 * @return index of cell matching box otherwise -1
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function condCol2(cellList: Cell[], box: Bbox) {
  for (let i = 0; i < cellList.length; i++) {
    if (boxInLine(cellList[i].spanBox, box)) {
      return i;
    }
  }
  return -1;
}
/**
 * @param box1: first box
 * @pram box2: second box
 * @return true if second box is below first box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function condRow1(box1: Bbox, box2: Bbox) {
  if (box2.box()[1] >= box1.box()[3]) {
    return true;
  }
  return false;
}
/**
 * @param box1: first box
 * @pram box2: second box
 * @return true if second box is rightside of first box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function condRow2(b1: Bbox, b2: Bbox) {
  if (b2.box()[0] >= b1.box()[2]) {
    return false;
  }
  return true;
}
/**
 * @param box: a single box
 * @param i: current span index
 * @param spans: an array of spans
 * @return false if box is above any following spans 
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function condRow3(box: Bbox, i: number, spans: Span[]) {
  for (let j = i + 1; j < spans.length; j++) {
    if (!condRow1(box, spans[i].bbox)) {
      return false;
    }
  }
  return true;
}
/**
 * @param box: a single box
 * @param boxes: an array of boxes
 * @return true if box is outside of all boxes
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function boxListOverlap(box: Bbox, boxes: Bbox[]) {
  for (const b of boxes) {
    if (b.contains(box)) {
      return false;
    }
  }
  return true;
}
/**
 * @param pix: 4 box co-odinates
 * @return arr as array of (x,y) corners of pix
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function makePixelsArray(pix: number[]) {
  const arr: Pixels = [];
  arr.push([pix[0], pix[3]]);
  arr.push([pix[0], pix[1]]);
  arr.push([pix[2], pix[3]]);
  arr.push([pix[2], pix[1]]);
  return arr;
}
/**
 * @param cell: a single cell
 * @param i: current row number
 * @param bigRow: a single row
 * @return bottom co-odinate of next row
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function columnUp(cell: Cell, i: number, BigRow: Row) {
  const rows = BigRow.rowList;
  let j: number = i - 1;
  for (; j >= 0; j--) {
    const box = rows[j].spanBox.box();

    if (box[0] < cell.spanBox.box()[2]) {
      break;
    }
  }

  if (j >= 0) {
    return rows[j].spanBox.box()[3];
  }
  return BigRow.boundaryBox.box()[1];
}
/**
 * @param cell: a single cell
 * @param i: current row number
 * @param bigRow: a single row
 * @return top co-odinate of next row
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function columnDown(cell: Cell, i: number, bigRow: Row) {
  const rows = bigRow.rowList,
    arr = cell.spanBox.box();
  let j: number = i + 1;
  for (; j < rows.length; j++) {
    const box = rows[j].spanBox.box();

    if (box[0] < arr[2]) {
      break;
    }
  }

  if (j == rows.length) {
    return bigRow.boundaryBox.box()[3];
  }
  return rows[j].spanBox.box()[1];
}
/**
 * @param cell: a single cell
 * @param bigRow: a single row
 * @param up: co-ordinate of top in number
 * @param down: c-ordinate of bottom in number
 * @return left co-ordinate of next column
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function columnRight(cell: Cell, bigRow: Row, up: number, down: number) {
  const spans: Span[] = bigRow.spanList;
  let left: number = bigRow.boundaryBox.box()[2];
  const arr = cell.spanBox.box();
  for (const s of spans) {
    const box = s.bbox.box();

    if (box[3] <= up) {
      continue;
    }
    if (box[1] >= down) {
      continue;
    }

    if (box[0] <= arr[2]) {
      continue;
    }

    left = Math.min(left, box[0]);
  }

  return left;
}
/**
 * update subrows of given row
 * @param row: a single row
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function subRowCompletition(row: Row) {
  const rows = row.rowList,
    arr = row.boundaryBox.box();

  for (let i = 0; i < rows.length; i++) {
    const box = rows[i].spanBox.box(),
      cells = rows[i].cellList;
    let down, right: number, up;

    up = arr[1];
    down = columnDown(cells[0], i, row);
    right = columnRight(cells[0], row, up, down);

    cells[0].makeBoundaryBox([arr[0], up, right, down]);

    for (let j = 1; j < cells.length; j++) {
      // Up = columnUp(cells[j] , i , row);
      up = box[1];
      down = columnDown(cells[j], i, row);
      const dum = columnRight(cells[j], row, up, down);
      cells[j].makeBoundaryBox([right, up, dum, down]);
      right = dum;
    }
  }

  for (let i = 0; i < rows[0].cellList.length; i++) {
    const box1 = rows[0].cellList[i].boundaryBox.box();
    rows[0].cellList[i].makeBoundaryBox([box1[0], arr[1], box1[2], box1[3]]);
  }

  for (let i = 0; i < rows[rows.length - 1].cellList.length; i++) {
    const box1 = rows[rows.length - 1].cellList[i].boundaryBox.box();
    rows[rows.length - 1].cellList[i].makeBoundaryBox([
      box1[0],
      box1[1],
      box1[2],
      arr[3]
    ]);
  }
}
/**
 * analyse subrows of a given row
 * @param row: a single row
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function subRowAnalysis(row: Row) {
  const rows = row.rowList,
    cells = row.cellList;
  if (rows.length == 1) {
    for (let i = 0; i < rows[0].cellList.length; i++) {
      rows[0].cellList[i].boundBoxGotBox(cells[i].boundaryBox);
    }
  } else {
    subRowCompletition(row);
  }
}
/**
 * @param clusters: an array of cluster of spans
 * @param canvas: canvas of a page
 * @return boxes covering cluster of spans
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function BoundarylessTables(clusters: Cluster[], canvas: Canvas) {
  const Clu: [boolean, Component][] = [];

  // The Boolean component considers whether the particular cluster has already been placed in a line of clusters or not
  for (const curr of clusters) {
    if (curr.bbox.box()[0] != -Infinity) {
      Clu.push([false, curr]);
    }
  }

  // To start from the top of the page, Clusters are sorted in the increasing order of their minY coordinates
  Clu.sort((a, b) => a[1].bbox.box()[1] - b[1].bbox.box()[1]);

  // Denotes a set of clusters in the same horizontal line
  let Cluline: Component[] = [],
    a: boolean,
    b: boolean,
    curr: Component,
    curr2_cluster: Component;
  const // Denotes the set of all "Cluster Lines" in the page
    MasterClu = [],
    // Each element of this array contains all Clusters that may form a particular table
    MasterTableClu = [];

  for (let j = 0; j < Clu.length; j++) {
    a = Clu[j][0];
    curr = Clu[j][1];
    // If the particular Cluster has not already been visited, visit all clusters in the same horizontal line as the present cluster
    if (a == false) {
      Cluline = [];
      for (let i = 0; i < Clu.length; i++) {
        b = Clu[i][0];
        curr2_cluster = Clu[i][1];
        const curr2_box = curr2_cluster.bbox.box(),
          curr_box = curr.bbox.box();

        // Checking if the newly selected cluster lies in the same horizontal line as the previous Cluster
        if (
          (curr2_box[1] <= curr_box[3] + 5 &&
            curr2_box[1] >= curr_box[1] - 5) ||
          (curr_box[1] <= curr2_box[3] + 5 && curr_box[1] >= curr2_box[1] - 5)
        ) {
          Cluline.push(curr2_cluster);
          Clu[i][0] = true;
        }
      }

      // The basic assumption that Clusters that don't have any Clusters on their left or right cannot be part of any Table.
      if (Cluline.length > 1) {
        MasterClu.push(Cluline);
        Clu[j][0] = true;
      }
    }
  }

  // This will be used to facilitate the merging of various cluster lines into 1 table component, will be used as the "Present Line"
  let TableClu: Component[][] = [];

  if (MasterClu.length === 0) {
    console.log('No Tables');
    return [];
  }
    // These variables will contain the coordinates of the Cluster line as a whole
    let minX = MasterClu[0][0].bbox.box()[0],
      maxX = MasterClu[0][0].bbox.box()[2],
      minY = MasterClu[0][0].bbox.box()[1],
      maxY = MasterClu[0][0].bbox.box()[3];
    for (const clu of MasterClu[0]) {
      minX = Math.min(minX, clu.bbox.box()[0]);
      maxX = Math.max(maxX, clu.bbox.box()[2]);
      minY = Math.min(minY, clu.bbox.box()[1]);
      maxY = Math.max(maxY, clu.bbox.box()[3]);
    }
    for (const Cluline of MasterClu) {
      // These variables contain the coordinates of the next Cluster line to be analysed as a whole
      let currminX = Cluline[0].bbox.box()[0],
        currmaxX = Cluline[0].bbox.box()[2],
        currminY = Cluline[0].bbox.box()[1],
        currmaxY = Cluline[0].bbox.box()[3];
      for (const clu of Cluline) {
        if (clu.bbox.box()[0] < currminX) {
          currminX = clu.bbox.box()[0];
        }
        if (clu.bbox.box()[1] < currminY) {
          currminY = clu.bbox.box()[1];
        }
        if (clu.bbox.box()[2] > currmaxX) {
          currmaxX = clu.bbox.box()[2];
        }
        if (clu.bbox.box()[3] > currmaxY) {
          currmaxY = clu.bbox.box()[3];
        }
      }

      // Condition to merge Cluster lines is based on a vertical threshold (Their minimum vertical distance)
      if (currminY - maxY <= 100) {
        TableClu.push(Cluline);
        minX = Math.min(minX, currminX);
        maxX = Math.max(maxX, currmaxX);
        minY = Math.min(minY, currminY);
        maxY = Math.max(maxY, currmaxY);
      } else {
        const Ans = [];
        for (const Cluline of TableClu) {
          Ans.push(Cluline);
        }
        MasterTableClu.push(Ans);
        TableClu = [Cluline];
        minX = currminX;
        maxX = currmaxX;
        minY = currminY;
        maxY = currmaxY;
      }
    }
    MasterTableClu.push(TableClu);
  const Boxes: Bbox[] = [];
  for (const TableClu of MasterTableClu) {
    const thisbox: Bbox = new Bbox(TableClu[0][0].pixels);
    for (const Cluline of TableClu) {
      for (const Clu of Cluline) {
        thisbox.update(Clu.pixels);
      }
    }
    Boxes.push(thisbox);
  }
  for (const box of Boxes) {
    // Box.draw(canvas,'rgba(0,255,0,3)');
  }
  return Boxes;
}
/**
 * @param box1: first box
 * @param box2: scond box
 * @return true if first box's centre is inside second box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function inside_fifty(box1: Bbox, box2: Bbox) {
  const arr1 = box1.box(),
    arr2 = box2.box(),
    width = arr2[2] - arr2[0];

  if (arr2[0] + width / 2 > arr1[2]) {
    return false;
  }
  if (arr2[2] - width / 2 < arr1[0]) {
    return false;
  }
  return true;
}
/**
 * @param box: a single box
 * @param boxes: an array of boxes
 * @return value as number of boxes inside box
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function num_overlap(box: Bbox, boxes: Bbox[]) {
  let value = 0;
  const arr = box.box();

  for (const b of boxes) {
    const curr = b.box();
    if (curr[0] > arr[2]) {
      break;
    }
    if (inside_fifty(box, b)) {
      value += 1;
    }
  }
  return value;
}
/**
 * update subrow inside row
 * @param row: a single row
 * @param boxes: an array of boxes of cells
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
function analyse_one_subrow(row: Row, boxes: Bbox[]) {
  const row_span_box = row.boundaryBox.box(),
    cells = row.cellList,
    curr = cells[0].spanBox.box();
  let pix = [row_span_box[0], row_span_box[1], curr[2], row_span_box[3]];
  const box1 = new Bbox(makePixelsArray(pix)),
    val = num_overlap(box1, boxes);

  if (val > 1) {
    pix = [curr[0], row_span_box[1], curr[2], row_span_box[3]];
    cells[0].makeBoundaryBox(pix);
  }

  for (let i = 0; i < cells.length - 1; i++) {
    const bound_box = cells[i].boundaryBox.box(),
      next = cells[i + 1].spanBox.box(),
      new_pix = [bound_box[0], bound_box[1], next[0], bound_box[3]];

    // eslint-disable-next-line no-empty
    if (num_overlap(new Bbox(makePixelsArray(new_pix)), boxes) > 1) {
    } else {
      cells[i].makeBoundaryBox(new_pix);
    }
    cells[i + 1].makeBoundaryBox([
      next[0],
      bound_box[1],
      next[2],
      bound_box[3]
    ]);
  }

  const leng = cells.length,
    next = cells[leng - 1].boundaryBox.box(),
    new_pix = [next[0], row_span_box[1], row_span_box[2], row_span_box[3]];

  // eslint-disable-next-line no-empty
  if (num_overlap(new Bbox(makePixelsArray(new_pix)), boxes) > 1) {
  } else {
    cells[leng - 1].makeBoundaryBox(new_pix);
  }
}
/**
 * analyse subrow of a given row
 * @param row: a single row
 * @author Simarpreet Singh Saluja, Ayush Garg
 */
export function analyse_subrow(row: Row) {
  const rows = row.rowList,
    span_row_list = [];

  for (const cell of rows[0].cellList) {
    span_row_list.push(cell.spanBox);
  }

  for (let i = 1; i < rows.length; i++) {
    analyse_one_subrow(rows[i], span_row_list);
  }
}
