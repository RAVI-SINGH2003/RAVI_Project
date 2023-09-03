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
 * @fileoverview Class for a column detection module
 * @author nehamjadhav@gmail.com
 */
import Dokument from '../core/dokument';
import { colDetectionThreshold } from '../global/parameters';
import Bbox from '../utility/bbox';
import Page from '../core/page';
import {
  colDetectRatios,
  colDetectResult,
  threeColumnRatios,
  twoColumnRatios
} from './colDetectValues';
import { Characteristics } from '../global/characteristics';
import log from 'loglevel';
import { Line } from '../core/line';
import Canvas from '../utility/canvas';

export default class colDetect {
  public pages: Map<string, Page> = new Map<string, Page>();

  public columnDetectionThresholds: colDetectionThreshold =
    new colDetectionThreshold();

  constructor() {}
  /**
   * This function detects columns and gutter width in case 
   * of multicolumn detection
   * @param characteristicsObj 
   * @returns colDetectResult containing number of columns and gutter width
   */
  public col_detect(document: Dokument,characteristicsObj:Characteristics) {
    this.pages = document.pages;
    const  pgForColDetect = this.pagesForColDetection(),
      [col_no, ini_ratio, midcol, mid1col3, mid2col3] =
        this.fixedEPScolDetect(pgForColDetect);

    characteristicsObj.numOfColumns = col_no;
    log.info(`No of Columns from the document: ${col_no}`);
    if (col_no === 1) {
      return new colDetectResult(1, -1, -1);
    }

    if (col_no === 2) {
      if (ini_ratio.length == 1) {
        return new colDetectResult(2, -1, -1);
      }
      const [req_pg1, req_pg2] = this.pgForGutter2col(
        ini_ratio,
        pgForColDetect
      );  
      const [epsl, epsr] = this.getEPSfor2Col(
        req_pg1,
        req_pg2,
        midcol,
        pgForColDetect
      );
      this.findRatio2Col(pgForColDetect, epsl, epsr, midcol);
      return new colDetectResult(2, epsl + epsr, -1);
    }

    if (col_no === 3) {
      if (ini_ratio.length == 1) {
        return new colDetectResult(3, -1, -1);
      }
      const [reqPg1Left, reqPg2Left, reqPg1Right, reqPg2Right] =
          this.pgForGutter3col(ini_ratio, pgForColDetect),
        [LepsLeft, RepsLeft, LepsRight, RepsRight] = this.getEPSfor3Col(
          reqPg1Left,
          reqPg2Left,
          reqPg1Right,
          reqPg2Right,
          pgForColDetect,
          mid1col3,
          mid2col3
        );
      this.findRatio3Col(
        LepsLeft,
        RepsLeft,
        LepsRight,
        RepsRight,
        pgForColDetect,
        mid1col3,
        mid2col3
      );
      return new colDetectResult( 3, LepsLeft + RepsLeft, LepsRight + RepsRight );
    }
    
  }
    /**
   * This method selects the pages that are required for column detection. It select
   * half of the pages before mid and half of the pages after midpage.
   * It selects only those pages that have few fractions of the page in background.
   * @returns an array of pages that are used in column detection
   */
  public pagesForColDetection() {
    const maxNoOfPagesToConsider =
        this.columnDetectionThresholds.colDetectParameters.get(
          'maxNoOfPagesToConsider'
        ),
      pagesConsidered = [],
      fractions = [],
      threshold = this.columnDetectionThresholds.colDetectParameters.get(
        'allowed_bg_Fraction_For_Col_Detection_Page'
      );
    if (this.pages.size <= maxNoOfPagesToConsider) {
      for (let i = 0; i < this.pages.size; i++) {
        pagesConsidered.push(i);
      }
    } else {
      const mid = Math.floor(this.pages.size / 2);
      let pointer = mid;
      while (
        pagesConsidered.length <
          Math.floor(
            (this.columnDetectionThresholds.colDetectParameters.get(
              'maxNoOfPagesToConsider'
            ) +
              1) /
              2
          ) &&
        pointer >= 1
      ) {
        const bgFraction = this.backgroundPercent(this.pages.get(`page${pointer}`).
        backgroundAnalyser.bigBoxes,
        this.pages.get(`page${pointer}`).width,
        this.pages.get(`page${pointer}`).height);
        if (bgFraction < threshold) {
          pagesConsidered.push(pointer);
          fractions.push(bgFraction);
        }
        pointer--;
      }
      let pagesBeforeMid = pagesConsidered.length;
      pointer = mid + 1;
      while (
        pointer < this.pages.size &&
        pagesConsidered.length - pagesBeforeMid <
          Math.floor(
            this.columnDetectionThresholds.colDetectParameters.get(
              'maxNoOfPagesToConsider'
            ) / 2
          )
      ) {
        const bgFraction = this.backgroundPercent(this.pages.get(`page${pointer}`).
        backgroundAnalyser.bigBoxes,
        this.pages.get(`page${pointer}`).width,
        this.pages.get(`page${pointer}`).height);
        if (bgFraction < threshold) {
          pagesConsidered.push(pointer);
          fractions.push(bgFraction);
        }
        pointer++;
      }
      let pagesAfterMid = pagesConsidered.length - pagesBeforeMid;
      pointer = mid;
      while (
        pagesBeforeMid <
          Math.floor(
            (this.columnDetectionThresholds.colDetectParameters.get(
              'maxNoOfPagesToConsider'
            ) +
              1) /
              2
          ) &&
        pointer >= 0
      ) {
        if (pagesConsidered.findIndex((pg_no) => pg_no == pointer) == -1) {
          pagesConsidered.push(pointer);
          fractions.push(-1);
          pagesBeforeMid++;
        }

        pointer--;
      }
      pointer = mid + 1;
      while (
        pagesAfterMid <
          Math.floor(
            this.columnDetectionThresholds.colDetectParameters.get(
              'maxNoOfPagesToConsider'
            ) / 2
          ) &&
        pointer < this.pages.size
      ) {
        if (pagesConsidered.findIndex((pg_no) => pg_no == pointer) == -1) {
          pagesConsidered.push(pointer);
          fractions.push(-1);
          pagesAfterMid++;
        }
        pointer++;
      }
    }
    return pagesConsidered;
  }
  /**
   * Function update the start time with total time required
   * @param time 
   * @returns time taken for column module
   */
  public updateTime(time: number){
    return new Date().getTime() - time;
  }
  /**
   * Function to return no. of columns in document
   * @param cons_pages 
   * @param count2 
   * @param count3 
   * @returns 
   */
  public colNo(cons_pages: number, count2: number, count3: number) {
    const maxNoOfPagesToConsider  = 
    this.columnDetectionThresholds.colDetectParameters.get('maxNoOfPagesToConsider');
    if (cons_pages < maxNoOfPagesToConsider && cons_pages > 2) {
      if (count2 >= cons_pages - 1) return 2;
      if (count3 >= cons_pages - 1) return 3; 
    }
    if (cons_pages <= 2) {
      if (count2 >= cons_pages) return 2;
      if (count3 >= cons_pages) return 3;
    }
    if (cons_pages >= 
      this.columnDetectionThresholds.colDetectParameters.get('maxNoOfPagesToConsider')) {
      if (count2 >= cons_pages - 2) return 2;
      if (count3 >= cons_pages - 2) return 3;
    }
    return 1;
  }

  /**
   * This method helps to decide the no. of columns on the different pages considered
   * based on the calculated ratio of no. of pixels in text column and no. of pixels in
   * gutter width.
   * @param ini_ratio = ratio of average no of pixels in different columns
   * @param last_pg = boolean to show if last page is being considered
   * @returns = no. of pages with 2 columns and 3 columns (out of the pages being considered)
   */
  public find_col_num(
    ini_ratio: colDetectRatios[],
    pgForColDetect: Array<number>
  ) {
    const thr =
      this.columnDetectionThresholds.colDetectParameters
        .get('threshhold_For_Pixel_Ratio_bw_Column_And_GutterWidth');
    let count2 = 0,
      count3 = 0;
    for (let i = 0; i < ini_ratio.length; i++) {
      const for_2col = ini_ratio[i].col2ratios,
        for_3col = ini_ratio[i].col3ratios;
      if (pgForColDetect[i] == this.pages.size - 1) {
        if (for_2col.ratioCol1Sep > thr) {
          count2++;
        }
        if (for_3col.ratioCol1Sep1 > thr && for_3col.ratioCol1Sep2 > thr) {
          count3++;
        }
      } else {
        if (for_2col.ratioCol1Sep > thr && for_2col.ratioCol2Sep > thr) {
          count2++;
        }
        if (
          for_3col.ratioCol1Sep1 > thr &&
          for_3col.ratioCol1Sep2 > thr &&
          for_3col.ratioCol2Sep1 > thr &&
          for_3col.ratioCol2Sep2 > thr &&
          for_3col.ratioCol3Sep1 > thr &&
          for_3col.ratioCol3Sep2 > thr
        ) {
          count3++;
        }
      }
    }
    return this.colNo(ini_ratio.length, count2, count3);
  }

  /**
   * This functions calculates first and last page for column detection
   * @param no_pages total no of pages in the document
   * @returns an array of first and last pages to be considered
   */
  public pagesToConsider(no_pages: number) {
    let firstPageConsidered, lastPageConsidered;
    if (
      no_pages <
      this.columnDetectionThresholds.colDetectParameters.get(
        'maxNoOfPagesToConsider'
      )
    ) {
      firstPageConsidered = 0;
      lastPageConsidered = no_pages;
    } else {
      firstPageConsidered = Math.floor((1 + no_pages) / 2) - 3;
      lastPageConsidered = Math.floor((1 + no_pages) / 2) + 2;
    }
    return [firstPageConsidered, lastPageConsidered];
  }

  /**
   * This function analyse average no. of pixels in column
   * with average no. of pixels in gutter width
   * @param pgForColDetect Pages to be considered for column detection
   * @returns An array of no. of columns and respective ratios
   */
  public fixedEPScolDetect( pgForColDetect: Array<number> ):
   [number, colDetectRatios[], Array<number>, Array<number>, Array<number>] {
    const ini_ratio = Array<colDetectRatios>(),
      midcol = new Array<number>(),
      mid1col3 = new Array<number>(),
      mid2col3 = new Array<number>(),
      eps = this.columnDetectionThresholds.colDetectParameters.get(
        'initial_Eps_For_Gutter_Width'
      );
    let width_without_margin = 0;
    for (let k = 0; k < pgForColDetect.length; k++) {
      let last_pg = false;
      const pg_no = pgForColDetect[k];
      if (pg_no == this.pages.size - 1 && pg_no != 0) {
        last_pg = true;
      }
      const colDetectionRatio = this.pageColDetect(pg_no, eps, last_pg, 
        width_without_margin,this.pages
        .get(`page${pg_no}`).canvas);
      width_without_margin = colDetectionRatio.colDetail.widthWithoutMargin;
      midcol.push(colDetectionRatio.colDetail.mid1col2);
      mid1col3.push(colDetectionRatio.colDetail.mid1col3);
      mid2col3.push(colDetectionRatio.colDetail.mid2col3);
      ini_ratio.push(colDetectionRatio);
    }
    const col_no = this.find_col_num(ini_ratio, pgForColDetect);
    return [col_no, ini_ratio, midcol, mid1col3, mid2col3];
  }

  /**
   * Decides the pages to consider for calculating the gutter width in two column
   * document. ini_ratio is ratios of no. of non-white pixels in text columns and gutter
   * width.
   * @param ini_ratio ratios of average no of pixels in different columns
   * @param firstPageConsidered first page being considered for col detection
   * @returns 2 pages to consider for gutter width calculation
   */
  public pgForGutter2col(
    ini_ratio: colDetectRatios[],
    pgForColDetect: Array<number>
  ) {
    const ratio_sum = new Array<Array<number>>();
    for (let k = 0; k < ini_ratio.length; k++) {
      ratio_sum.push([
        ini_ratio[k].col2ratios.ratioCol1Sep +
          ini_ratio[k].col2ratios.ratioCol2Sep,
        pgForColDetect[k]
      ]);
    }
    ratio_sum.sort((a, b) => a[0] - b[0]);
    const req_pg1 = ratio_sum[ini_ratio.length - 1][1],
      req_pg2 = ratio_sum[ini_ratio.length - 2][1];
    return [req_pg1, req_pg2];
  }

  /**
   * This method returns the width of the gutter column towards the left and right of the
   * middle column. We are using 2 pages with best ratios for gutter width calculation.
   * req_pg1 and req_pg2 are the two pages being considered. midcol stores the position
   * of middle column in the pages after removing the margins from them.
   * @param req_pg1 first page for gutter width calculation
   * @param req_pg2 second page for gutter width calculation
   * @param midcol array containing middle column position in the pages being considered in the document for col detection
   * @param firstPageConsidered first page being considered for col detection
   * @returns width of gutter width towards left of midcol(epsl) and
   *          width of gutter width towards right of midcol(epsr)
   */
  public getEPSfor2Col(
    req_pg1: number,
    req_pg2: number,
    midcol: Array<number>,
    pgForColDetect: Array<number>
  ) {
    const gutter_width1 = this.gutterWidth(this.pages.get(`page${req_pg1}`).lines,
          midcol[pgForColDetect.findIndex((pg_no) => pg_no == req_pg1)],
          this.pages.get(`page${req_pg1}`).width
        ),
      gutter_width2 = this.gutterWidth(this.pages.get(`page${req_pg2}`).lines,
          midcol[pgForColDetect.findIndex((pg_no) => pg_no == req_pg2)],
          this.pages.get(`page${req_pg2}`).width
        ),
      epsl = Math.min(gutter_width1[0], gutter_width2[0]),
      epsr = Math.min(gutter_width1[1], gutter_width2[1]);
    return [epsl, epsr];
  }

  /**
   * Finds the final ratio of no. of pixels in text column and no. of pixels 
   * in gutter width in the confirmation step of 2 column document.
   * @param firstPageConsidered first page being considered for col detection
   * @param lastPageConsidered last page being considered for col detection
   * @param epsl width of gutter width towards left of midcol
   * @param epsr width of gutter width towards right of midcol
   * @param midcol array containing middle column position in the pages being considered in the document for col detection
   */
  public findRatio2Col(
    pgForColDetect: Array<number>,
    epsl: number,
    epsr: number,
    midcol: Array<number>
  ) {
    let width_without_margin = 0;
    const con_ratio = Array<twoColumnRatios>();
    for (let k = 0; k < pgForColDetect.length; k++) {
      let last_pg = false;
      const pg_no = pgForColDetect[k];
      if (pg_no == this.pages.size - 1 && pg_no != 0) {
        last_pg = true;
      }
      const middleCol = midcol[pgForColDetect.findIndex((pg) => pg == pg_no)],
        ratiosColDetect = this.col2_confirm(
            pg_no,
            epsl,
            epsr,
            middleCol,
            last_pg,
            width_without_margin,
            this.pages.get(`page${pg_no}`).canvas
          );
      width_without_margin = ratiosColDetect.colDetail.widthWithoutMargin;
      con_ratio.push(ratiosColDetect.col2ratios);
    }
  }

  /**
   * Finds the final ratio of no. of pixels in text column and no. of pixels
   * in gutter width in the confirmation step of 3 column document.
   * @param LepsLeft width of gutter width towards left of midcol for left gutter width in 3 col document
   * @param RepsLeft width of gutter width towards right of midcol for left gutter width in 3 col document
   * @param LepsRight width of gutter width towards left of midcol for right gutter width in 3 col document
   * @param RepsRight width of gutter width towards right of midcol for right gutter width in 3 col document
   * @param firstPageConsidered first page being considered for col detection
   * @param lastPageConsidered last page being considered for col detection
   * @param mid1col3 middle column for the left gutter width
   * @param mid2col3 middle column for the right gutter width
   */
  public findRatio3Col(
    LepsLeft: number,
    RepsLeft: number,
    LepsRight: number,
    RepsRight: number,
    pgForColDetect: Array<number>,
    mid1col3: Array<number>,
    mid2col3: Array<number>
  ) {
    const con_ratio = Array<threeColumnRatios>();
    let width_without_margin = 0;
    for (let k = 0; k < pgForColDetect.length; k++) {
      let last_pg = false;
      const pg_no = pgForColDetect[k];
      if (pg_no == this.pages.size - 1 && pg_no != 0) {
        last_pg = true;
      }
      const middle1col3 =
          mid1col3[pgForColDetect.findIndex((pg) => pg == pg_no)],
        middle2col3 = mid2col3[pgForColDetect.findIndex((pg) => pg == pg_no)],
        ratiosColDetect = this.col3_confirm(
            pg_no,
            LepsLeft,
            RepsLeft,
            LepsRight,
            RepsRight,
            middle1col3,
            middle2col3,
            last_pg,
            width_without_margin,
            this.pages.get(`page${pg_no}`).canvas
          );
      width_without_margin = ratiosColDetect.colDetail.widthWithoutMargin;
      con_ratio.push(ratiosColDetect.col3ratios);
    }
  }

  /**
   * Decides the pages to consider for calculating the gutter width in three column document.
   * @param ini_ratio ratios of average no of pixels in different columns
   * @param firstPageConsidered first page being considered for col detection
   * @returns pages to be considered for calculating the gutter width for 3 col document
   *          reqPg1Left - first page considered for left gutter
   *          reqPg2Left - second page considered for left gutter
   *          reqPg1Right - first page considered for right gutter
   *          reqPg2Right - second page considered for right gutter
   */
  public pgForGutter3col(
    ini_ratio: Array<colDetectRatios>,
    pgForColDetect: Array<number>
  ) {
    const ratioSumLeft = new Array<Array<number>>(),
      ratioSumRight = new Array<Array<number>>();
    for (let k = 0; k < ini_ratio.length; k++) {
      ratioSumLeft.push([
        ini_ratio[k].col3ratios.ratioCol1Sep1 +
          ini_ratio[k].col3ratios.ratioCol2Sep1,
        pgForColDetect[k]
      ]);
    }
    for (let k = 0; k < ini_ratio.length; k++) {
      ratioSumRight.push([
        ini_ratio[k].col3ratios.ratioCol2Sep2 +
          ini_ratio[k].col3ratios.ratioCol3Sep2,
        pgForColDetect[k]
      ]);
    }
    ratioSumLeft.sort((a, b) => a[0] - b[0]);
    ratioSumRight.sort((a, b) => a[0] - b[0]);
    const reqPg1Left = ratioSumLeft[ini_ratio.length - 1][1],
      reqPg2Left = ratioSumLeft[ini_ratio.length - 2][1],
      reqPg1Right = ratioSumRight[ini_ratio.length - 1][1],
      reqPg2Right = ratioSumRight[ini_ratio.length - 2][1];
    return [reqPg1Left, reqPg2Left, reqPg1Right, reqPg2Right];
  }

  /**
   * This method returns the width of the gutter column towards the left and right of the
   * middle column for 3 column document.
   * @param reqPg1Left - first page considered for left gutter
   * @param reqPg2Left - second page considered for left gutter
   * @param reqPg1Right - first page considered for right gutter
   * @param reqPg2Right - second page considered for right gutter
   * @param firstPageConsidered first page being considered for col detection
   * @param mid1col3
   * @param mid1col3 middle column for the left gutter width
   * @param mid2col3 middle column for the right gutter width
   */
  public getEPSfor3Col(
    reqPg1Left: number,
    reqPg2Left: number,
    reqPg1Right: number,
    reqPg2Right: number,
    pgForColDetect: Array<number>,
    mid1col3: Array<number>,
    mid2col3: Array<number>
  ) {
    const gutterWidth1Left = this.gutterWidth(this.pages.get(`page${reqPg1Left}`).lines,
          mid1col3[pgForColDetect.findIndex((pg_no) => pg_no == reqPg1Left)],
          this.pages.get(`page${reqPg1Left}`).width
        ),
      gutterWidth2Left = this.gutterWidth(this.pages.get(`page${reqPg2Left}`).lines,
          mid1col3[pgForColDetect.findIndex((pg_no) => pg_no == reqPg2Left)],
          this.pages.get(`page${reqPg2Left}`).width
        );
    const gutterWidth1Right = this.gutterWidth(this.pages.get(`page${reqPg1Right}`).lines,
          mid2col3[pgForColDetect.findIndex((pg_no) => pg_no == reqPg1Right)],
          this.pages.get(`page${reqPg1Right}`).width
        ),
      gutterWidth2Right = this.gutterWidth(this.pages.get(`page${reqPg2Right}`).lines,
          mid2col3[pgForColDetect.findIndex((pg_no) => pg_no == reqPg2Right)],
          this.pages.get(`page${reqPg2Right}`).width
        );
    let LepsLeft = 0,
      LepsRight = 0,
      RepsLeft = 0,
      RepsRight = 0;
    if (
      gutterWidth1Left[0] + gutterWidth1Left[1] <
      gutterWidth2Left[0] + gutterWidth2Left[1]
    ) {
      LepsLeft = gutterWidth1Left[0];
      RepsLeft = gutterWidth1Left[1];
    } else {
      LepsLeft = gutterWidth2Left[0];
      RepsLeft = gutterWidth2Left[1];
    }
    if (
      gutterWidth1Right[0] + gutterWidth1Right[1] <
      gutterWidth2Right[0] + gutterWidth2Right[1]
    ) {
      LepsRight = gutterWidth1Right[0];
      RepsRight = gutterWidth1Right[1];
    } else {
      LepsRight = gutterWidth2Right[0];
      RepsRight = gutterWidth2Right[1];
    }
    return [LepsLeft, RepsLeft, LepsRight, RepsRight];
  }

  /**
   *
   * Page level calculations
   * ========================
   *
   */

  /**
   * This function is used by column detection module to check how 
   * much background is present on a particular page.
   * @returns Background present in the page in terms of percentage
   */
  public backgroundPercent(boxes: Bbox[],width: number, height: number) {
    let bgArea = 0;

    boxes.forEach(box=>{
      bgArea += (box.maxX - box.minX) * (box.maxY - box.minY);
    })
    return bgArea / (width * height);;
  }

   /**
   * This calculates the width of the white strip present between columns
   * @param midcol middle column of the gutter width
   * @returns width of the gutter width towards left and right of middle column for the current page
   * epsl is the gutter width towards left and epsr is gutter width towards right of middle column
   */
  public gutterWidth(llines: Map<string, Line>,midcol: number,
     width: number) {
      const hist = new Array(width + 10);
      for (let i = 0; i < width + 10; i++) {
        hist[i] = 0;
      }

    // Counting no. of line endings for each column
    llines.forEach((k) => {
      const box = k.bbox;
      hist[box.minX] += 2;
      hist[box.maxX] += 2;
      hist[box.minX - 1] += 2;
      hist[box.maxX - 1] += 2;
      hist[box.minX + 1] += 2;
      hist[box.maxX + 1] += 2;
    });

    // Calculating gutter width towards left
    const temp = Math.floor(0.1 * width);
    let large = 0,
      pos = midcol,
      pointer = midcol - 1;
    while (pointer > midcol - temp) {
      if (hist[pointer] > large) {
        pos = pointer;
        large = hist[pointer];
      }
      pointer--;
    }
    if (pos == midcol) {
      pos = pointer + 2;
    }
    const epsl = midcol - pos;

    // Calculating gutter width towards right
    (large = 0), (pos = midcol);
    pointer = midcol + 1;
    while (pointer < midcol + temp) {
      if (hist[pointer] > large) {
        pos = pointer;
        large = hist[pointer];
      }
      pointer++;
    }
    if (pos == midcol) {
      pos = pointer - 2;
    }
    const epsr = pos - midcol;
    return [epsl, epsr];
  }

   

  /**
   * This function is used in the initial step of column detection assunming 
   * constant gutter width.
   * Assuming gutter width = 2*eps+1
   * @param pg_num page no. of page being considered
   * @param eps parameter for constant gutter width
   * @param last_pg boolean value showing if  the current page is last page
   * @param width_without_margin width of the previous page after removing 
   * left and right margin. Used if the current page is last page
   * It calls the col_detect function on the canvas of current page
   */
  public pageColDetect(
    pg_num: number,
    eps: number,
    last_pg: boolean,
    width_without_margin: number,
    pageCanvas: Canvas)
     {
      return pageCanvas.col_detect(pg_num, eps, last_pg, width_without_margin);
    }

  /**
   * This is used in confirmation step only if the page is found to be two column 
   * in the col_detect method
   * @param pg page no. of current page
   * @param epsl gutter width towards left of middle column
   * @param epsr gutter width towards right of middle column
   * @param midcol middle column in the page after removing left and right margin
   * @param last_pg boolean value showing if  the current page is last page
   * @param width_without_margin width of the previous page after removing left and 
   * right margin. Used if the current page is last page
   *
   * It calls the col2_confirm function on the canvas of current page
   */
  public col2_confirm(
    pg: number,
    epsl: number,
    epsr: number,
    midcol: number,
    last_pg: boolean,
    width_without_margin: number,
    pageCanvas: Canvas)
   {
    return pageCanvas.col2_confirm(
      pg,
      epsl,
      epsr,
      midcol,
      last_pg,
      width_without_margin );
   }

  /**
   * This is used in confirmation step only if the page is found to be three column in the col_detect method
   * @param pg page no. of current page
   * @param LepsLeft gutter width towards left of middle column of left gutter width
   * @param RepsLeft gutter width towards right of middle column of left gutter width
   * @param LepsRight gutter width towards left of middle column of right gutter width
   * @param RepsRight gutter width towards right of middle column of right gutter width
   * @param mid1col3 middle column of left gutter width
   * @param mid2col3 middle column of right gutter width
   * @param last_pg boolean value showing if  the current page is last page
   * @param width_without_margin width of the previous page after removing left and right margin. 
   * Used if the current page is last page
   * It calls the col3_confirm function on the canvas of current page
   */
  public col3_confirm(
    pg: number,
    LepsLeft: number,
    RepsLeft: number,
    LepsRight: number,
    RepsRight: number,
    mid1col3: number,
    mid2col3: number,
    last_pg: boolean,
    width_without_margin: number,
    pageCanvas: Canvas) 
   {
    return pageCanvas.col3_confirm(
      pg,
      LepsLeft,
      RepsLeft,
      LepsRight,
      RepsRight,
      mid1col3,
      mid2col3,
      last_pg,
      width_without_margin
    );
   }

}
