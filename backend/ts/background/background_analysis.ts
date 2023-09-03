/* eslint-disable function-paren-newline */
/*
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
 * @fileoverview Procedure for the background analysis.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */
import {
  assign_division_syms,
  library_agglo,
  remove_enclosed
} from './background_analysis_helper';

import BPolygon from '../utility/bpolygon';
import Bbox from '../utility/bbox';
import { BboxThresholds } from '../global/parameters';
import { BigBbox } from './BigBbox';
import Canvas from '../utility/canvas';
import { ConComp } from '../core/connected_components';
import GrahamScan from './graham_scan';
import ImageBuilder from '../core/image_builder';
import { Pixels } from '../utility/utils';
import { Span } from '../core/span';
import { update_radical_bigboxes } from '../symbol/symbol_det';
export default class BackgroundAnalysis {
  public boxes: Bbox[] = [];
  public bigBoxes: BigBbox[] = [];
  public polygons: BPolygon[] = [];
  public pixels: Pixels = [];
  public ccs: Pixels[] = [];
  public hLines: Bbox[] = [];

  constructor(
    public background: HTMLElement,
    public canvas: Canvas,
    public imageBuilder: ImageBuilder,
    public pageWidth: number,
    public pageHeight: number
  ) {}
  /**
   *
   * @param promise
   * @param spanList
   * @returns
   */
  public analyse(promise: Promise<void>, spanList: Span[]) {
    let back = this.background.outerHTML;
    back = back.replace(/<\/div>$/, '</img></div>');
    return promise
      .then(() => this.canvas.draw(this.imageBuilder.img(back)))
      .then(() => {
        this.pixels = this.canvas.getPixels()[0];
        this.ccs = ConComp.getConnectedComponents(this.pixels);
        this.boxes = this.ccs.map((box) => new Bbox(box));
        /*
         * Here big_boxes are created and are sent to boxesUpdater
         * function along with spanList and multiple threshold
         */
        this.bigBoxes = this.ccs.map((box) => new BigBbox(box));
        this.bigBoxes = this.boxesUpdater(this.bigBoxes, spanList);
        console.log(this.bigBoxes);
        this.draw_BigBoxes(this.bigBoxes);
        this.polygons = this.ccs.map((x) => new BPolygon(GrahamScan(x)));
      });
  }

  /**
   *Author : Pushpa Raj & Nikhil.
   *@param: {Initial boxes, Spans, ...(thresholds)}
   * Converts the intial simple bounding boxes to hireachical
   * data structures that have multiple properties.
   * Helps for better background analysis.
   * The properties are assigning division, radical symbols.
   * All the thresholds are clearly documented in class
   * "Bbox_Thresholds" in documentThresholds.ts
   */
  public boxesUpdater(bigBoxes: BigBbox[], spanList: Span[]) {
    const bboxThreshold = new BboxThresholds();
    const small_area = bboxThreshold.bgBoxParameters.get('smallArea');
    const vsmall_area = bboxThreshold.bgBoxParameters.get('vsmallArea');
    if (bigBoxes.length == 0) {
      return bigBoxes;
    }
    /* Identifying radical boxes*/
    update_radical_bigboxes(bigBoxes, this.canvas);

    /* Identifying division boxes*/
    assign_division_syms(bigBoxes, spanList);

    /* Removing BBox's for pixels spanning very small area.*/
    bigBoxes = bigBoxes.filter(
      (bb) => (bb.maxX - bb.minX) * (bb.maxY - bb.minY) > vsmall_area
    );

    /* Clustering small boxes that are less than some threshold (useful for combining smalls boxes like labels).*/
    let small_big_boxes = bigBoxes.filter(
      (bb) => (bb.maxX - bb.minX) * (bb.maxY - bb.minY) < small_area
    ); // Boxes of area less than "small_area"
    bigBoxes = bigBoxes.filter(
      (bb) => (bb.maxX - bb.minX) * (bb.maxY - bb.minY) >= small_area
    ); // Boxes of area greater than "small_area"
    // Cluster all the small boxes without caring for heirarchy
    small_big_boxes = library_agglo(small_big_boxes, false);
    bigBoxes = bigBoxes.concat(small_big_boxes); // Combine back all the boxes
    bigBoxes = remove_enclosed(bigBoxes);
    let size = bigBoxes.length;

    /* Iteratively peform library_agglo and removeEnclosed until no more clusters are formed.*/
    // eslint-disable-next-line no-constant-condition
    while (true) {
      bigBoxes = library_agglo(bigBoxes, true);
      bigBoxes = remove_enclosed(bigBoxes);
      const new_size = bigBoxes.length;
      if (size == new_size) {
        break;
      }
      size = new_size;
    }
    return bigBoxes;
  }

  /**
   * Author : Pushpa Raj & Nikhil.
   * @param: {Bounding Boxes}
   * Function to draw bounding boxes hierarchially.
   * Each level of hierarchy has different colour defined in "colors" list.
   * The heirarachial order is achieved by using BFS approach
   * ( removing and boxes and adding it's children to the list).
   * Math boxes are drawn in pink color.
   */
  public draw_BigBoxes(boxes: BigBbox[]) {
    let drawing_boxes = boxes.slice();
    const colors = [
        'rgba(220,220,25,1)',
        'rgba(238,75,43,1)',
        'rgba(0, 0, 255,1)',
        'rgba(0,0,0,1)',
        'rgba(43,75,238,1)',
        'rgba(139,0,139,1)'
      ],
      math_box_color = 'rgba(255,192,203,1)';
    let iter = 0;
    while (drawing_boxes.length > 0) {
      drawing_boxes.forEach((box) => {
        if (box.isMathSym) {
          box.draw(this.canvas, math_box_color);
        } else {
          box.draw(this.canvas, colors[iter]);
        }
      });

      const size = drawing_boxes.length;
      for (let i = 0; i < size; i++) {
        const b = drawing_boxes.shift();
        if (b.children.length > 0) {
          drawing_boxes = drawing_boxes.concat(b.children);
        }
      }
      iter += 1;
    }
  }

  /**
   * Return true for images that are big enough to live inside <img> tags
   * e.g. one side larger than an inch on A4
   */
  private largeEnough(bbox: Bbox) {
    const wh = bbox.bboxWH();
    // E.g. Don't care about separating images that take less than an inch on A4
    return Math.min(wh.h, wh.w) > Math.min(this.pageWidth, this.pageHeight) / 8;
  }

  /**
   * Extract large connected components into images
   */
  public separateImages(document: HTMLDocument) {
    const largeBoxes = this.boxes.filter((box) => this.largeEnough(box));
    for (const box of largeBoxes) {
      const b = box.bboxWH(),
        ctx = this.canvas.getContext(),
        imageData = ctx.getImageData(b.x, b.y, b.w, b.h),
        c2 = document.createElement('canvas');
      c2.height = b.h;
      c2.width = b.w;
      const ctx2 = c2.getContext('2d');
      ctx2.putImageData(imageData, 0, 0);

      const img = document.createElement('img');
      img.setAttribute('src', c2.toDataURL());
      document.body.appendChild(img);
      ctx.clearRect(b.x, b.y, b.w, b.h);
    }
  }
  
}
