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
 * @fileoverview Class for Table.
 *
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */

import Bbox from '../utility/bbox';
import Canvas from '../utility/canvas';
import { Cluster } from '../utility/cluster';
import * as foo from '../utility/helper_functions';
import * as tab from '../table/table_util';
import { Span } from '../core/span';
import { Line } from '../core/line';
import Page from '../core/page';
import Dokument from '../core/dokument';
import { tableThreshold } from '../global/parameters';

// Class representing table
export class Table {
  public static count: number;

  public pageid: number;

  public index_in_page: number;

  public clusterList: Cluster[] = [];

  public spanList: Span[] = [];

  public tableBox: Bbox;

  public static bgtablebox: Bbox[] = [];

  public static table_boxes: Bbox[] = [];

  public spanBox: Bbox = new Bbox([]);

  public rowList: Row[] = [];

  public boundaryBox: Bbox;

  public clusterBox: Bbox = new Bbox([]);

  public Thresholds: tableThreshold = new tableThreshold();

  public static table_width: number;

  public static table_height: number;

  public html: HTMLElement;

  public lines = new Map<string, Line>();

  public id: string;

  public static all_tables: HTMLTableElement[][] = [];

  /**
   * Make a Table with corresponding boinding box and id.
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  constructor(id: number = null, box: Bbox) {
    if (id == null) {
      this.id = `table${Table.count++}`;
    } else this.id = `table${id}`;
    this.tableBox = box;

    /*
     * This.clusterList = [];
     * this.spanList = [];
     * this.spanBox = new Bbox([]);
     * this.rowList = [];
     * this.clusterBox = new Bbox([]);
     */
  }
  
  /**
   * @return id and lines corresponding to table as found in match as json
   * @author Amar Agnihotri
   */
  public json() {
    const json = {
      id: this.id,
      lines: Array.from(this.lines.keys())
    };
    return json;
  }

  /**
   * set width and height of table
   * @param m: the width of table
   * @param n: the height of table
   * @author Hire Vikram Umaji, Amar Agnihotri
   *
   */
  public static settable_dimension(m: number, n: number) {
    Table.table_width = m;
    Table.table_height = n;
  }

  /**
   * Span list obtained from spans which lie in the document
   * @param spans: spans of document
   * @author Hire Vikram Umaji, Amar Agnihotri
   *
   */
  public addSpanList(spans: Span[]) {
    this.spanList = spans;
  }

  /**
   * Cluster list obtained from clusters
   * Present in the bbox of the table
   * @param slusters: cluster array of background boxes of table
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public addClusterList(clusters: Cluster[]) {
    this.clusterList = clusters;
    for (const c of clusters) {
      this.clusterBox.update(c.pixels);
    }
  }

  /**
   * Remove those spans not present in any cluster
   * Update spanBox also
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public filterSpanList() {
    this.spanList = this.spanList.filter((r) =>
      foo.centerContains(this.clusterBox, r.bbox)
    );
    this.spanBox = foo.boxFromSpans(this.spanList);
  }
  /**
   * @param box: first box
   * @param box: second box
   * @return a box overlapping given two boxes
   * @author Hire Vikram Umaji, Amar Agnihotri
   */
  public static include(bbox1: Bbox, bbox2: Bbox) {
    const b: Bbox = new Bbox([
      [Infinity, Infinity],
      [-Infinity, -Infinity]
    ]);
    [b.minX, b.minY, b.maxX, b.maxY] = [
      Infinity,
      Infinity,
      -Infinity,
      -Infinity
    ];

    b.minX = Math.min(bbox1.minX, bbox2.minX);
    b.minY = Math.min(bbox1.minY, bbox2.minY);
    b.maxX = Math.max(bbox1.maxX, bbox2.maxX);
    b.maxY = Math.max(bbox1.maxY, bbox2.maxY);

    return b;
  }
  /**
   * @param array of background boxes's flag for including close lines of a table
   * @return true if zero exists in the array
   * @author Hire Vikram Umaji, Amar Agnihotri
   */
  public static valcheck(Arr: number[]) {
    for (let i = 0; i < Arr.length; i++) {
      if (Arr[i] == 0) {
        return true;
      }
    }
    return false;
  }
  /**
   * processing double lines close witin threshold
   * @param bgBox: glyphs box array of a table
   * @author Hire Vikram Umaji, Amar Agnihotri
   */
  public static tableForm(bgbox: Bbox[]) {
    const width = Page._width;
    const height = Page._height;
    const thresh = new tableThreshold().tableDetectParameters.get(
      'min_line_dist'
    );
    const vthr1 = Math.round(thresh * (height / 2480));
    const hthr1 = Math.round(thresh * (width / 3508));
    const bgcheck: number[] = new Array(bgbox.length);
    for (let i = 0; i < bgbox.length; i++) {
      bgcheck[i] = 0;
    }
    Table.bgtablebox = [];
    do {
      //console.log("inside do while loop");
      for (let i = bgbox.length - 1; i >= 0; i--) {
        //console.log("inside i loop");
        let truebox: Bbox = bgbox[i];
        if (bgcheck[i] != 1) {
          for (let j = bgbox.length - 1; j >= 0; j--) {
            //console.log("inside j loop");
            if (i != j && bgcheck[j] != 1) {
              if (
                truebox.contains(bgbox[j]) ||
                truebox.overlapLine(truebox, bgbox[j]) ||
                Bbox.nearby(truebox, bgbox[j], hthr1, vthr1)
              ) {
                truebox = Table.include(truebox, bgbox[j]);
                bgcheck.splice(j, 1, 1);
                //console.log("inside include loop");
              }
            }
          }
        }

        if (bgcheck[i] == 0) {
          Table.bgtablebox.push(truebox);
          bgcheck.splice(i, 1, 1);
        }
      }
    } while (Table.valcheck(bgcheck));
    //console.log(Table.bgtablebox);
    return Table.bgtablebox;
  }

  /**
   * Function for cell collapse of blank invalid cell such as double line
   * @param lastline is edge of cell to be collapse
   * @param nextline is other opposte edge of cell
   * @param type identifies bordered algo1
   * @author Hire Vikram Umaji, Amar Agnihotri
   */
  public static collapceCell(lastline: number, nextline: number, type: number) {
    const thresh = new tableThreshold().tableDetectParameters.get(
      'min_line_dist'
    );
    const width = Page._width;
    const height = Page._height;
    let thr1 = thresh;
    if (type == 0) {
      thr1 = Math.round(thresh * (width / 3508));
    } else {
      thr1 = Math.round(thresh * (height / 2480));
    }

    if (nextline - lastline <= thr1) {
      return lastline;
    } else {
      return nextline;
    }
  }
  /**
   * Filtering the rows
   * Removing rows which do not belong to any cluster
   * In the table
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public clusterFilter() {
    if (this.clusterList.length <= 0) {
      return;
    }
    this.rowList = this.rowList.filter((r) =>
      this.clusterBox.contains(r.spanBox)
    );

    for (const r of this.rowList) {
      r.cellList = r.cellList.filter((c) =>
        this.clusterBox.contains(c.spanBox)
      );
    }
  }

  /**
   * Identifies major rows in the table only
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public drawMajor(canvas: Canvas) {
    for (const r of this.rowList) {
      for (const rr of r.rowList) {
        for (const c of rr.cellList) {
          c.drawBoundary(canvas);
        }
      }
    }
  }

  /**
   * Drawing major rows in the table
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public drawMajorRows(canvas: Canvas) {
    for (const r of this.rowList) {
      r.drawBoundBox(canvas);
    }
  }

  /**
   * Drawing all rows in the table
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public drawSubrows(canvas: Canvas) {
    for (const r of this.rowList) {
      for (const rr of r.rowList) {
        rr.drawSpanBox(canvas);
      }
    }
  }

  /**
   * Printing Top level information of the table
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public printMajorRows() {
    console.log(`Number of Rows: ${this.rowList.length}`);
    for (const r of this.rowList) {
      console.log(`Cells in Row : ${r.cellList.length}`);
    }
  }

  /**
   * Printing Column info of each row
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public printAll() {
    let id = 0;
    for (const r of this.rowList) {
      for (const rr of r.rowList) {
        console.log(`ROW: ${id++} Cell Count : ${rr.cellList.length}`);
      }
    }
  }

  /**
   * Drawing each cell in the table
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public drawAll(canvas: Canvas) {
    for (const r of this.rowList) {
      for (const rr of r.rowList) {
        for (const c of rr.cellList) {
          c.draw(canvas);
        }
      }
    }
  }

  /**
   * Drawing each inner cell in the table
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public drawEveryBit(canvas: Canvas) {
    for (const r of this.rowList) {
      for (const sr of r.rowList) {
        for (const c of sr.cellList) {
          for (const sc of c.innerColList) {
            sc.draw(canvas);
          }
        }
      }
    }
  }
  /**
   * print cell and its subcells of all rows of a table
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public printEveryBit() {
    let id = 0;
    for (const r of this.rowList) {
      for (const sr of r.rowList) {
        console.log(`Row: ${id++} Cell Count: ${sr.cellList.length}`);
        let id2 = -1;
        for (const c of sr.cellList) {
          id2++;
          const innerLen = c.innerColList.length;
          if (innerLen == 1) {
            continue;
          } else {
            console.log(`Cell: ${id2} has ${innerLen} cells in it`);
          }
        }
      }
    }
  }

  /**
   * Given a table - the row boundaries are made.
   * Left and right boundaries are the same as that of the table
   * The top boundary of top row and bottom boundary of bottom row is
   * The same as that of the table
   * In other cases - bottom boundary of a row is the average of the bottom of
   * Its span box's bottom boundary and the next row's span box's top boundary
   * The top boundary is the bottom boundary of the previous row
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public updateRowBoundaries() {
    const rows = this.rowList,
      arr = this.tableBox.box();
    if (rows.length <= 0) {
      return;
    }
    if (rows.length == 1) {
      rows[0].boundBoxGotBox(this.tableBox);
    } else {
      let prevBox = rows[0].spanBox.box(),
        currBox = rows[1].spanBox.box(),
        i = 1,
        commonBound: number = (prevBox[3] + currBox[1]) / 2;

      rows[0].makeBoundBox([arr[0], arr[1], arr[2], commonBound]);

      for (; i < rows.length - 1; i++) {
        prevBox = rows[i].spanBox.box();
        currBox = rows[i + 1].spanBox.box();
        const dum = (prevBox[3] + currBox[1]) / 2;
        rows[i].makeBoundBox([arr[0], commonBound, arr[2], dum]);
        commonBound = dum;
      }

      rows[i].makeBoundBox([arr[0], commonBound, arr[2], arr[3]]);
    }
  }

  /**
   * For each row in the table - column boundaries are updated
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public updateColumns() {
    for (const r of this.rowList) {
      r.updateColBoundaries();
    }
  }

  /**
   * For each row subrows are updated
   * In this something similar is done as what was done
   * In major row boundary formation
   * After subrow boundaries are made - boundaries of each cell
   * In the subrow is made
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public updateSubRows() {
    for (const r of this.rowList) {
      /*
       * Console.log("MAIN")
       * Console.log(r.boundaryBox);
       */
      const main_box = r.boundaryBox,
        arr = main_box.box();

      r.rowList[0].boundBoxGotBox(main_box);

      if (r.rowList.length == 1) {
        r.rowList[0].updateColBoundaries();
        continue;
      }

      let next = r.rowList[1].spanBox.box(),
        common = next[1],
        i = 1;

      for (; i < r.rowList.length - 1; i++) {
        const curr = r.rowList[i].spanBox.box();
        next = r.rowList[i + 1].spanBox.box();
        const dum = (curr[3] + next[1]) / 2;

        r.rowList[i].makeBoundBox([arr[0], common, arr[2], dum]);
        common = dum;
      }

      r.rowList[i].makeBoundBox([arr[0], common, arr[2], arr[3]]);
      r.rowList[0].updateColBoundaries();
      foo.analyse_subrow(r);
    }

    // Foo.subRowAnalysis(r);
  }

  /**
   * make html of document table map
   * @param p is null htmlelement
   * @param maxtracts sends true value to math system
   * @return promise resolve
   * @author Amar Agnihotri
   */
  public toHtml(p: HTMLElement = null, maxTract = true) {
    console.log(this.id," is done");
    this.html.id = this.id;
    return Promise.resolve();
  }
}

/**
 * Class representing the Row structure
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
 */
export class Row {
  public id: number;

  public rowList: Row[];

  public cellList: Cell[];

  public spanList: Span[];

  public tableBox: Bbox;

  public spanBox: Bbox;

  public boundaryBox: Bbox;

  /**
   * Make a raw using id and box
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  constructor(id: number, box: Bbox) {
    this.tableBox = box;
    this.id = id;
    this.rowList = [];
    this.cellList = [];
    this.spanList = [];
    this.spanBox = new Bbox([]);
    this.boundaryBox = new Bbox([]);
  }

  /**
   * Cell is added to the list
   * @param cell : Cell to be added
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public addCell(cell: Cell) {
    this.cellList.push(cell);
  }

  /**
   * Span is added to the list
   * Span box is updated according
   * @param single span
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public addSpan(span: Span) {
    this.spanList.push(span);
    this.spanBox.update(span.pixels);
  }

  /**
   * A span box is made from the span list
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public updateSpanBox() {
    this.spanBox = foo.boxFromSpans(this.spanList);
  }

  /**
   * Boundary box is updated using the array given as parameter
   * @param Pix -> [minx , miny , maxx , maxy]
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public makeBoundBox(pix: number[]) {
    this.boundaryBox = new Bbox(foo.makePixelsArray(pix));
  }

  /**
   * Boundary box of table is made same as that given as parameter
   * @param box
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public boundBoxGotBox(box: Bbox) {
    this.boundaryBox = box;
  }

  /**
   * Draw span box of row
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public drawSpanBox(canvas: Canvas) {
    this.spanBox.draw(canvas, 'rgba(255,0,0,3)');
  }

  /**
   * Draw boundary box of row
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public drawBoundBox(canvas: Canvas) {
    this.boundaryBox.draw(canvas, 'rgba(0,255,0,3)');
  }

  /**
   * Column boundaries of a row updated
   * The analysis is similar as updating row boundaries
   * Just this is done in a horizontal manner as opposed to
   * Vertical in case of row.
   * @author Simarpreet Singh Saluja, Ayush Garg
   */
  public updateColBoundaries() {
    const cells = this.cellList;
    const arr = this.boundaryBox.box();
    if (cells.length <= 0) {
      return;
    }
    if (cells.length == 1) {
      cells[0].boundBoxGotBox(this.boundaryBox);
    } else {
      let currCell = cells[0].spanBox.box();
      let nextCell = cells[1].spanBox.box();
      let common: number = nextCell[0];
      let i = 1;
      cells[0].makeBoundaryBox([arr[0], arr[1], common, arr[3]]);
      for (; i < cells.length - 1; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        currCell = cells[i].spanBox.box();
        nextCell = cells[i + 1].spanBox.box();
        const dum = nextCell[0];
        cells[i].makeBoundaryBox([common, arr[1], dum, arr[3]]);
        common = dum;
      }
      cells[i].makeBoundaryBox([common, arr[1], arr[2], arr[3]]);
    }
  }
}

/**
 * Class for representing cell structure
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
 */
export class Cell {
  public id: number;

  public spanList: Span[];

  public tableBox: Bbox;

  public spanBox: Bbox;

  public boundaryBox: Bbox;

  public innerColList: Cell[];

  /**
   * Make a cell using box and id
   * @param id is number
   * @param box
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  constructor(id: number, box: Bbox) {
    this.id = id;
    this.tableBox = box;
    this.spanList = [];
    this.spanBox = new Bbox([]);
    this.boundaryBox = new Bbox([]);
    this.innerColList = [];
  }

  /**
   * Add span in the span list of cell
   * And update the span box correspondingly
   * @param single span
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public addSpan(span: Span) {
    this.spanList.push(span);
    this.spanBox.update(span.pixels);
  }

  /**
   * Draw the span box of cell
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public draw(canvas: Canvas) {
    this.spanBox.draw(canvas, 'rgba(255,0,0,3)');
  }

  /**
   * Draw boundary box of cell
   * @param canvas of a table
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public drawBoundary(canvas: Canvas) {
    this.boundaryBox.draw(canvas, 'rgba(255,0,0,3)');
  }

  /**
   * Make boundary box using the array given as parameter
   * [minx , miny , maxx ,maxy] -> pix format
   * @param pix array of background
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public makeBoundaryBox(pix: number[]) {
    this.boundaryBox = new Bbox(foo.makePixelsArray(pix));
  }

  /**
   * Boundary box is made as given in parameter
   * @param box
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public boundBoxGotBox(box: Bbox) {
    this.boundaryBox = box;
  }

  /**
   * In this more analysis of cell is done
   * To find more cells inside it
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji, Amar Agnihotri
   */
  public columnAnalysis() {
    if (this.spanList.length <= 0) {
      return;
    }
    const spans = this.spanList,
      arr = tab.cluster_parameters(spans),
      threshold = arr[3];
    let id = 0,
      currCell: Cell = new Cell(id++, this.tableBox),
      foundCell = false;
    const cellList: Cell[] = [];
    currCell.addSpan(spans[0]);

    for (let i = 1; i < spans.length; i++) {
      const below = foo.condRow1(currCell.spanBox, spans[i].bbox);

      if (below) {
        if (cellList.length == 0) {
          cellList.push(currCell);
          currCell = new Cell(id++, this.tableBox);
          currCell.addSpan(spans[i]);
          foundCell = false;
          continue;
        }

        if (!foundCell) {
          for (const s of currCell.spanList) {
            cellList[cellList.length - 1].addSpan(s);
          }
          foundCell = false;
          currCell = new Cell(id++, this.tableBox);
          currCell.addSpan(spans[i]);
          continue;
        }

        cellList.push(currCell);
        foundCell = false;
        currCell = new Cell(id++, this.tableBox);
        currCell.addSpan(spans[i]);
      } else {
        const isFar = foo.condCol1(currCell.spanBox, spans[i].bbox, threshold);

        if (isFar) {
          cellList.push(currCell);
          foundCell = true;
          currCell = new Cell(id++, this.tableBox);
        }

        currCell.addSpan(spans[i]);
      }
    }

    if (cellList.length == 0) {
      cellList.push(currCell);
    } else if (foundCell) {
      cellList.push(currCell);
    } else {
      for (const s of currCell.spanList) {
        cellList[cellList.length - 1].addSpan(s);
      }
    }
    this.innerColList = cellList;
  }
}
