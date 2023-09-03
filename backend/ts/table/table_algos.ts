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
 * @fileoverview Class for Table Algorithm.
 *
 * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
 */

import Bbox from '../utility/bbox';
import Canvas from '../utility/canvas';
import ImageAnalysis from '../utility/imageAnalysis';
import { Span } from '../core/span';
import { Line } from '../core/line';
import { Cluster } from '../utility/cluster';
import Page from '../core/page';
import Dokument from '../core/dokument';
import { Characteristics } from '../global/characteristics';
// Imports for tables
import * as tab from '../table/table_util';
import { Table, Row, Cell } from '../table/table';

export class Table_Algos {
  /**
   * Algorithm 1 - Detecting tables with proper structure
   * First Span list is filtered to remove spans with invalid boxes
   * Bounding boxes present in the page are extracted and each box is
   * Tested for a possible table.
   * @param Span: array of spans of a page in the document
   * @param bgBoxes: array of background glyphs of a page in the document
   * @param oage: a single page of document
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
   */
  public static bordered_table_algo(spans: Span[], bgBoxes: Bbox[], page: Page) {
    //spans = spans.filter((s) => tab.bbox_valid(s.bbox));
    const spanBoxWidth: number[] = [];
    spans.forEach((span) => {
      spanBoxWidth.push(span.bbox.width());
    });
    const analyse_boxes: Bbox[] = [];
    const imageBbox: Bbox[] = [];
    let back_boxes = bgBoxes.filter((s) => tab.bbox_valid(s));
    back_boxes = Table.tableForm(back_boxes);
    page.imageAnalyser = new ImageAnalysis(
      back_boxes,
      page.canvas,
      'rgba(165,42,42,5)'
    );
    page.imageAnalyser.drawImageBoxes();
    back_boxes = back_boxes.filter((b) => tab.bbox_filter_fig(b));
    for (const box of back_boxes) {
      if (tab.spansInBox(box, spans).length >= 4) {
        analyse_boxes.push(box);
      } else if (box.width() >= Math.max(...spanBoxWidth)) {
        //box.draw(this.canvas,'rgba(0,255,0,3)');
        imageBbox.push(box);
      }
    }

    Table.all_tables.push(
      tab.analysis(analyse_boxes, page.canvas, document, page.spans)
    );
    //return this.table_list_algo1;
  }

  public get_tables() {
    return Table.all_tables;
  }

  /**
   * Find location of table realtive to other element's line box
   * @param doc the dokument object
   * @param characteristics short for dokument characteristics
   * @ruturn doc after inserting table at appropriate place
   * @author Amar Agnihotri
   */
  public static match(
    doc: Dokument,
    characteristics: Characteristics
  ): Dokument {
    Table_Algos.table_analysis(doc);

    let id = 0,
      pageid = 0;
    let index_in_page = 0;
    for (const b of Table.table_boxes) {
      const t: Table = new Table(id++, b);
      while (
        Table.all_tables[pageid].length == 0 ||
        Table.all_tables[pageid].length == index_in_page
      ) {
        pageid++;
        index_in_page=0;
        //if(pageid==Table.all_tables.length)break;
      }

      t.html = Table.all_tables[pageid][index_in_page];
      index_in_page++;
      if(t.html == undefined)continue;
      const unmatched = new Map<string, Line>();
      doc.pages
        .get(`page${pageid}`)
        .getSortedLines()
        .forEach((l) => {
          unmatched.set(l.id, l as Line);
        });
      for (const [lid, l] of unmatched) {
        if (b.contains(l.bbox) || b.overlapLine(b, l.bbox)) {
          t.lines.set(lid, l);
        }
      }
      t.lines.forEach((v, k) => unmatched.delete(k));
      doc.elements.set(t.id, t);
      
    }
    doc.elements = new Map(
      [...doc.elements.entries()].sort((a, b) => {
        if (
          parseInt([...a[1].lines][0][0].slice(4)) <
          parseInt([...b[1].lines][0][0].slice(4))
        )
          return -1;
      })
    );
    return doc;
  }


  /**
   * Algorithm 2 - Detecting tables with boundary
   * First Span list is filtered to remove spans with invalid boxes
   * Clusters are made from the spans in the page.
   * Bounding boxes present in the page are extracted and each box is
   * Tested for a possible table.
   * @param Span: array of spans of a page in the document
   * @param bgBoxes: array of background glyphs of a page in the document
   * @param oage: a single page of document
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
   */
  public algo2(spans_arr: Span[], bgBoxes: Bbox[], page: Page) {
    spans_arr = spans_arr.filter((s) => tab.bbox_valid(s.bbox));
    const cluster_params = tab.cluster_parameters(spans_arr),
      spans = Array.from(page.spans.values()),
      clusters: Cluster[] = Cluster.doClustering(spans, cluster_params[3]);
    page.cluster_list = clusters;

    page.table_list_algo2 = tab.algorithm2(
      spans_arr,
      clusters,
      bgBoxes,
      page.canvas
    );
    // Tab.algo2analysis(this.table_list_algo2, document);
  }

  /**
   * Function to pretty print a 2d array
   * @param arr : 2D array to be printed
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
   */
  public print_arr(arr: number[][]) {
    for (const a of arr) {
      let s = '';
      for (const elem of a) {
        s += `${elem} `;
      }
      console.log(s);
    }
  }

  /**
   * Given a table list, each table's structure is printed
   * The number of columns and rows and the information regarding
   * Colspan and rowspan
   * Then each table's layout is drawn on the canvas
   * @param tab_list : List of Tables to be displayed and printed
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
   */
  public print_algo(tab_list: Table[], page: Page) {
    for (const table of tab_list) {
      const max_col = tab.max_col_row(table),
        row_span = tab.rowSpan_list(table),
        col_span = tab.col_span_list(table);

      console.log('Number of Columns: ', max_col.length);
      console.log('Number of Rows: ', col_span.length);
      console.log('Row Span');
      this.print_arr(row_span);
      console.log('Col Span');
      this.print_arr(col_span);
      this.draw_table(table, page.canvas);
      console.log('--------------');
    } // Algorithm2 ends here
  }

  /**
   * #Algorithm3 - Detecting boundary Less tables
   * Spans are filtered to remove spans with invalid boxes
   * Clusters are made from spans and using clusters analysis is done
   * @param Span: array of spans of a page in the document
   * @param bgBoxes: array of background glyphs of a page in the document
   * @param oage: a single page of document
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
   */
  public algo3(spans_arr: Span[], bgBoxes: Bbox[], page: Page) {
    spans_arr = spans_arr.filter((s) => tab.bbox_valid(s.bbox));
    const cluster_params = tab.cluster_parameters(spans_arr),
      // Pre processing
      spans = Array.from(page.spans.values()),
      clusters: Cluster[] = Cluster.doClustering(spans, cluster_params[3]);
    page.cluster_list = clusters;
    // Algorithm2 starts here!
    page.table_list_algo3 = tab.algorithm3(
      page.table_list_algo2.length + 1,
      clusters,
      page.canvas,
      spans_arr,
      bgBoxes
    );
  }
  // Combined Analysis of Algo1 and Algo2

  /*
   * Both algorithm1 and algorithm2 are run first
   * Then results of both are analysed and final table list is generated.
   */
  //public final_list1: TableComponent[] = [];

  public final_list2: Table[] = [];
  /**
   * start table detection with spans and background glyphs boxes
   * @param doc: a document object
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
   */
  public static table_analysis(doc: Dokument) {
    for (const [pageid, page] of doc.pages) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const span_list = Array.from(page.spans.values());
      //page.showBack();
      Table_Algos.bordered_table_algo(span_list, page.backgroundAnalyser.boxes, page);
    }
  }

  // ONLY FOR TESTING PURPOSES

  /**
   * Draws the bounding box of each cell in a page canvas
   * @param table: The Table whose cells have to be drawn
   * @param canvas: Canvas on which the cells have to drawn
   * @author Simarpreet Singh Saluja, Ayush Garg, Hire Vikram Umaji and Amar Agnihotri
   */
  public draw_table(table: Table, canvas: Canvas) {
    for (const row of table.rowList) {
      for (const subrow of row.rowList) {
        for (const cell of subrow.cellList) {
          cell.boundaryBox.draw(canvas, 'rgba(0,0,0,3)');
        }
      }
    }
  }
}
