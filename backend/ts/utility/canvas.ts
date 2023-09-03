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
 * @fileoverview Class for to deal with canvas elements.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Pixels, Util } from './utils';
import Bbox from './bbox';
import log from 'loglevel';
import {
  colDetectRatios,
  columnDetails,
  threeColumnRatios,
  twoColumnRatios
} from '../column/colDetectValues';

export default class Canvas {
  private canvas: HTMLCanvasElement;

  constructor(
    private document: HTMLDocument,
    public width: number,
    public height: number
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.position = 'relative';
    this.clear();
  }

  public clear() {
    const ctx = this.getContext();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.width, this.height);
  }

  public getContext(): CanvasRenderingContext2D {
    const ctx = this.canvas.getContext('2d', {
      antialias: false
    }) as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  public tourl() {
    return this.canvas.toDataURL();
  }

  /**
   * Draws the image in the canvas element. It first creates and inserts the
   * image made from the SVG that contains the HTML as foreign object. Then the
   * canvas is inserted into the page if necessary and cleared. Finally the image
   * is drawn on the canvas.
   * @param {HTMLElement} img The image to draw on the canvas.
   * @return{Promise} The promise that resolve once the canvas is drawn.
   */
  public draw(img: HTMLImageElement): Promise<void> {
    return new Promise<void>((ok, _fail) => {
      setTimeout(() => {
        if (!this.canvas.parentNode) {
          this.document.body.appendChild(this.canvas);
        }
        this.clear();
        ok();
      }, Util.promiseDelay);
    }).then(
      () =>
        new Promise<void>((ok, _fail) => {
          setTimeout(() => {
            const ctx = this.getContext();
            ctx.drawImage(img, 0, 0);
            ok();
          }, Util.promiseDelay);
        })
    );
  }

  /**
   * Finds all the non-white pixels on the canvas.
   * @return {Pixels} A list of all pixels that are not white.
   */
  public getPixels(box?: Bbox): [Pixels, Uint8ClampedArray] {
    const [topX, topY, botX, botY] = box
        ? box.box()
        : [0, 0, this.width, this.height],
      ctx = this.getContext(),
      result: Pixels = [],
      imageData = ctx.getImageData(0, 0, this.width, this.height).data;
    for (let x = topX; x <= botX; x++) {
      for (let y = topY; y <= botY; y++) {
        if (Util.hasPixel(imageData, [x, y], this.width)) {
          result.push([x, y]);
        }
      }
    }
    return [result, imageData];
  }

  public insert() {
    this.document.body.appendChild(this.canvas);
  }

  public remove() {
    Util.removeNode(this.canvas);
  }

  /**
   * Install mouse down and up event listeners that record the
   * bbox of the mouse down and up positions and then call the
   * provided callback - cb(c, bbox)
   */
  public setupEventListeners(cb: (c: Canvas, b: Bbox) => void) {
    let x1: number, x2: number, y1: number, y2: number;
    this.canvas.addEventListener(
      'mousedown',
      (ev: MouseEvent) => {
        ev.preventDefault();
        x1 = ev.pageX - this.canvas.offsetLeft - this.canvas.clientLeft;
        y1 = ev.pageY - this.canvas.offsetTop - this.canvas.clientTop;
        log.debug(`${x1}, ${y1}`);
        console.log(x1, y1);
        return false;
      },
      false
    );

    this.canvas.addEventListener(
      'mouseup',
      (ev: MouseEvent) => {
        ev.preventDefault();
        x2 = ev.pageX - this.canvas.offsetLeft - this.canvas.clientLeft;
        y2 = ev.pageY - this.canvas.offsetTop - this.canvas.clientTop;
        log.debug(`${x2}, ${y2}`);
        console.log(x2, y2);
        const clickBox = new Bbox([
          [x1, y1],
          [x2, y2]
        ]);
        cb(this, clickBox);
        return false;
      },
      false
    );
  }

  /**
   * This function removes the header and footer from the current page
   * @param bin_img binary image of the current page foreground
   */
  public remove_head_foot(bin_img: Array<Array<number>>) {
    const h = this.height,
      t = Math.floor(0.1 * h);
    for (let i = 0; i < t; i++) {
      for (let j = 0; j < this.width; j++) {
        bin_img[i][j] = 0;
        bin_img[this.height - 1 - i][j] = 0;
      }
    }
  }

  /**
   * This function removes the upper half of the page. Used
   * if the page being considered is the first page
   * @param bin_img binary image of the current page foreground
   */
  public remove_half(bin_img: Array<Array<number>>) {
    for (let i = 0; i < Math.floor(this.height / 2); i++) {
      for (let j = 0; j < this.width; j++) {
        bin_img[i][j] = 0;
      }
    }
  }

  /**
   * This function gives the no of non white puxels in each colum
   * @param bin_img binary image of the current page foreground
   * @param colSum Array for storing no. of non-white pixels in each column
   */
  public getColSum(bin_img: Array<Array<number>>, colSum: any[]) {
    for (let i = 0; i < this.width; i++) {
      colSum[i] = 0;
    }
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        colSum[x] += bin_img[y][x];
      }
    }
  }

  /**
   * This function gives the leaft and right margin (white space) of the page
   * @param sumCol Array for storing no. of non-white pixels in each column
   * @param last_pg boolean value showing if  the current page is last page
   * @param width_without_margin width of the previous page after removing left
   *                            and right margin. Used if the current page is last page
   * @returns left margin (lm) and right margin (rm) in the page and middle columns
   *          for different possible gutter widths
   */
  public getMargins(
    sumCol: any[],
    last_pg: boolean,
    width_without_margin: number
  ) {
    let lm = 0,
      rm = 0;
    const w = this.width;
    while (lm < this.width && sumCol[lm] == 0) {
      lm++;
    }
    lm--;
    while (rm < this.width && sumCol[this.width - 1 - rm] == 0) {
      rm++;
    }
    if (last_pg) {
      rm = w - lm - width_without_margin;
    }
    const mid1col2 = Math.floor((lm + 1 + (w - rm - 1)) / 2),
      mid1col3 = Math.floor((2 * (lm + 1) + (w - rm - 1)) / 3),
      mid2col3 = Math.floor((lm + 1 + (w - rm - 1) * 2) / 3);
    return [lm, rm, mid1col2, mid1col3, mid2col3];
  }

  /**
   * This method returns the ratio of avg no of pixels in column and white space
   * @param sumCol Array for storing no. of non-white pixels in each column
   * @param lm left margin
   * @param rm right margin
   * @param mid1col2 middle column of gutter width assuming page is two column
   * @param epsl gutter width towards left of middle column
   * @param epsr gutter width towards right of middle column
   * @returns ratios of average no. of pixels in column and gutter width
   */
  public getRatiosTwoCol(
    sumCol: any[],
    lm: number,
    rm: number,
    mid1col2: number,
    epsl: number,
    epsr: number
  ) {
    let avg1col2 = 0,
      avg1sep2 = 0,
      avg2col2 = 0;
    const w = this.width;
    for (let i = 0; i < this.width; i++) {
      if (i > lm && i < mid1col2 - epsl) {
        avg1col2 += sumCol[i];
      }
      if (i >= mid1col2 - epsl && i <= mid1col2 + epsr) {
        avg1sep2 += sumCol[i];
      }
      if (i > mid1col2 + epsr && i < w - rm) {
        avg2col2 += sumCol[i];
      }
    }
    avg1col2 /= mid1col2 - epsl - lm - 1;
    avg1sep2 /= epsl + epsr + 1;
    avg1sep2 += 1;
    avg2col2 /= w - rm - (mid1col2 + epsr) - 1;
    const colTwoRatio = new twoColumnRatios(
      avg1col2 / avg1sep2,
      avg2col2 / avg1sep2
    );
    return colTwoRatio;
  }

  /**
   * This method returns the ratio of avg no of pixels in column and white space for 3 col doc
   * @param sumCol Array for storing no. of non-white pixels in each column
   * @param lm left margin
   * @param rm right margin
   * @param LepsLeft gutter width towards left of middle column for left gutter width
   * @param RepsLeft gutter width towards right of middle column for left gutter width
   * @param LepsRight gutter width towards left of middle column for right gutter width
   * @param RepsRight gutter width towards right of middle column for right gutter width
   * @param mid1col3 middle column of left gutter width assuming page is three column
   * @param mid2col3 middle column of right gutter width assuming page is three column
   * @returns ratios of average no. of pixels in column and gutter width
   */
  public getRatiosThreeCol(
    sumCol: any[],
    lm: number,
    rm: number,
    LepsLeft: number,
    RepsLeft: number,
    LepsRight: number,
    RepsRight: number,
    mid1col3: number,
    mid2col3: number
  ) {
    let avg1col3 = 0,
      avg1sep3 = 0,
      avg2col3 = 0,
      avg2sep3 = 0,
      avg3col3 = 0;
    const w = this.width;
    for (let i = 0; i < this.width; i++) {
      if (i > lm && i < mid1col3 - LepsLeft) {
        avg1col3 += sumCol[i];
      }
      if (i >= mid1col3 - LepsLeft && i <= mid1col3 + RepsLeft) {
        avg1sep3 += sumCol[i];
      }
      if (i > mid1col3 + RepsLeft && i < mid2col3 - LepsRight) {
        avg2col3 += sumCol[i];
      }
      if (i >= mid2col3 - LepsRight && i <= mid2col3 + RepsRight) {
        avg2sep3 += sumCol[i];
      }
      if (i > mid2col3 + RepsRight && i < w - rm) {
        avg3col3 += sumCol[i];
      }
    }
    avg1col3 /= mid1col3 - LepsLeft - lm - 1;
    avg1sep3 /= LepsLeft + RepsLeft + 1;
    avg1sep3 += 1;
    avg2col3 /= mid2col3 - LepsRight - (mid1col3 + RepsLeft) - 1;
    avg2sep3 /= LepsRight + RepsRight + 1;
    avg2sep3 += 1;
    avg3col3 /= w - rm - (mid2col3 + RepsRight) - 1;
    const colThreeRatio = new threeColumnRatios(
      avg1col3 / avg1sep3,
      avg2col3 / avg1sep3,
      avg3col3 / avg1sep3,
      avg1col3 / avg2sep3,
      avg2col3 / avg2sep3,
      avg3col3 / avg2sep3
    );
    return colThreeRatio;
  }

  /**
   *
   * @returns binary image of the canvas
   */
  public getGrayImage() {
    const ctx = this.getContext(),
      gray_img = new Array(this.height);
    for (let i = 0; i < this.height; i++) {
      gray_img[i] = new Array(this.width);
    }
    const pix = ctx.getImageData(0, 0, this.width, this.height).data;

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const i = (y * this.width + x) * 4,
          r = pix[i],
          g = pix[i + 1],
          b = pix[i + 2];
        if (r > 200 && g > 200 && b > 200) {
          gray_img[y][x] = 0;
        } else {
          gray_img[y][x] = 1;
        }
      }
    }
    return gray_img;
  }

  /**
   * This is used in confirmation step only if the page is found to be two column in the col_detect method
   * @param pg page no. of current page
   * @param epsl gutter width towards left of middle column
   * @param epsr gutter width towards right of middle column
   * @param mid1col2 middle column in the page after removing left and right margin
   * @param last_pg boolean value showing if  the current page is last page
   * @param width_without_margin width of the previous page after removing left and right margin. Used if the current page is last page
   *
   * @returns ratios of average no. of pixels in column and gutter width (in the confirmation step for 2 column document) and width of the page after removing margins
   */
  public col2_confirm(
    pg: number,
    epsl: number,
    epsr: number,
    mid1col2: number,
    last_pg: boolean,
    width_without_margin: number
  ) {
    const gray_img = this.getGrayImage(),
      sum_col = new Array(this.width);

    this.remove_head_foot(gray_img);

    // If first page, remove first half of the page
    if (pg == 0) {
      this.remove_half(gray_img);
    }

    this.getColSum(gray_img, sum_col);
    const [lm, rm /*xx*/ /* yy */ /* zz */, , ,] = this.getMargins(
        sum_col,
        last_pg,
        width_without_margin
      ),
      ratio_2_col = this.getRatiosTwoCol(sum_col, lm, rm, mid1col2, epsl, epsr),
      columnDetail = new columnDetails(this.width - lm - rm, -1, -1, -1),
      result = new colDetectRatios(columnDetail, ratio_2_col, null);
    return result;
  }

  /**
   * This is used in confirmation step only if the page is found to be three 
   * column in the col_detect method
   * @param pg page no. of current page
   * @param LepsLeft gutter width towards left of middle column of left gutter width
   * @param RepsLeft gutter width towards right of middle column of left gutter width
   * @param LepsRight gutter width towards left of middle column of right gutter width
   * @param RepsRight gutter width towards right of middle column of right gutter width
   * @param mid1col3 middle column of left gutter width
   * @param mid2col3 middle column of right gutter width
   * @param last_pg boolean value showing if  the current page is last page
   * @param width_without_margin width of the previous page after removing left 
   * and right margin. Used if the current page is last page
   * @returns ratios of average no. of pixels in column and gutter width 
   * (in the confirmation step for 3 column document) and width of the page after
   *  removing margins
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
    width_without_margin: number
  ) {
    const gray_img = this.getGrayImage(),
      sum_col = new Array(this.width);

    this.remove_head_foot(gray_img);

    // If first page, remove first half of the page
    if (pg == 0) {
      this.remove_half(gray_img);
    }

    this.getColSum(gray_img, sum_col);
    const [lm, rm /* xx */ /* yy */ /* zz */, , ,] = this.getMargins(
        sum_col,
        last_pg,
        width_without_margin
      ),
      three_col_ratios = this.getRatiosThreeCol(
        sum_col,
        lm,
        rm,
        LepsLeft,
        RepsLeft,
        LepsRight,
        RepsRight,
        mid1col3,
        mid2col3
      ),
      columnDetail = new columnDetails(this.width - lm - rm, -1, -1, -1),
      result = new colDetectRatios(columnDetail, null, three_col_ratios);
    return result;
  }

  /**
   * This function is used in the initial step of column detection assunming constant
   * gutter width.
   * Assuming gutter width = 2*eps+1
   * @param pg page no. of current page
   * @param eps parameter for constant gutter width
   * @param last_pg boolean value showing if  the current page is last page
   * @param width_without_margin width of the previous page after removing left and 
   * right margin. Used if the current page is last page
   * @returns width of page after removing margins, positions of middle columns of 
   * different possible gutter widths, and ratio of average no. of pixels in different
   * columns and gutter width
   */
  public col_detect(
    pg: number,
    eps: number,
    last_pg: boolean,
    width_without_margin: number
  ) {
    const gray_img = this.getGrayImage(),
      sum_col = new Array(this.width);

    this.remove_head_foot(gray_img);

    // If first page, remove first half of the page
    if (pg == 0) {
      this.remove_half(gray_img);
    }
    this.getColSum(gray_img, sum_col);

    const [lm, rm, mid1col2, mid1col3, mid2col3] = this.getMargins(
        sum_col,
        last_pg,
        width_without_margin
      ),
      two_col_ratios = this.getRatiosTwoCol(
        sum_col,
        lm,
        rm,
        mid1col2,
        eps,
        eps
      ),
      three_col_ratios = this.getRatiosThreeCol(
        sum_col,
        lm,
        rm,
        eps,
        eps,
        eps,
        eps,
        mid1col3,
        mid2col3
      ),
      columnDetail = new columnDetails(
        this.width - lm - rm,
        mid1col2,
        mid1col3,
        mid2col3
      ),
      result = new colDetectRatios(
        columnDetail,
        two_col_ratios,
        three_col_ratios
      );
    return result;
  }

  /**
   * This function crops image from main canvas and draw it on new canvas
   * @param object_box Bounding box for image object whose caption is detected
   * @returns canvas with the image
   */
  public ImageCanvas(object_box: Bbox) {
    let img_height: number, img_width: number;

    const [x_start, y_start, x_end, y_end] = object_box.box();
    (img_width = x_end - x_start), (img_height = y_end - y_start);
    const image_canvas = new Canvas(document, img_width, img_height),
      ctx = image_canvas.getContext();
    ctx.drawImage(
      this.canvas,
      x_start,
      y_start,
      img_width,
      img_height,
      0,
      0,
      img_width,
      img_height
    );
    return image_canvas;
  }
}
