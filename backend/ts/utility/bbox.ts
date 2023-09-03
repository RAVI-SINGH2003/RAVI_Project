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
 * @fileoverview Bounding boxes.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Interval, Pixels, Util } from './utils';
import Canvas from './canvas';
import { Component } from './components';

export default class Bbox {
  public minX = Infinity;

  public minY = Infinity;

  public maxX = -Infinity;

  public maxY = -Infinity;

  constructor(pixels: Pixels) {
    this.update(pixels);
  }

  public unbounded(): boolean {
    return this.minX == Infinity || this.maxX == -Infinity;
  }

  public pixels(): Pixels {
    return this.minX == Infinity
      ? []
      : [
          [this.minX, this.minY],
          [this.maxX, this.maxY]
        ];
  }

  public update(pixels: Pixels) {
    [this.minX, this.minY, this.maxX, this.maxY] = pixels.reduce(
      ([minX, minY, maxX, maxY], [x, y]) => [
        Math.min(minX, x),
        Math.min(minY, y),
        Math.max(maxX, x),
        Math.max(maxY, y)
      ],
      [this.minX, this.minY, this.maxX, this.maxY]
    );
  }

  public box() {
    return [this.minX, this.minY, this.maxX, this.maxY];
  }

  public bboxWH(scale = 1) {
    return {
      x: Math.round(this.minX * scale),
      y: Math.round(this.minY * scale),
      w: Math.round(scale * (this.maxX - this.minX)),
      h: Math.round(scale * (this.maxY - this.minY))
    };
  }

  /**
   * Draws all pixels in red on the given canvas.
   * @param {Canvas} canvas The canvas element to draw to.
   * @param {[number, number, number, number]} bbox The bounding box in minxy,
   *   maxxy.
   */
  public draw(canvas: Canvas, style: string) {
    const ctx = canvas.getContext();
    for (let i = this.minX; i <= this.maxX; i++) {
      ctx.fillStyle = style;
      ctx.fillRect(i, this.minY, 2, 2);
      ctx.fillRect(i, this.maxY, 2, 2);
    }
    for (let i = this.minY; i <= this.maxY; i++) {
      ctx.fillStyle = style;
      ctx.fillRect(this.minX, i, 2, 2);
      ctx.fillRect(this.maxX, i, 2, 2);
    }
  }

  public drawId(canvas: Canvas, style: string, id: string) {
    this.draw(canvas, style);
    const ctx = canvas.getContext();
    ctx.fillText(`${id.replace(/^[a-z]*/, '')}`, this.minX, this.minY);
  }

  public text() {
    return `Bbox: ${this.minX}, ${this.minY}, ${this.maxX}, ${this.maxY}`;
  }

  public static horizontalCmp(a: Component, b: Component): number {
    return a.bbox.minX - b.bbox.minX;
  }

  public static verticalCmp(a: Component, b: Component): number {
    return a.bbox.minY - b.bbox.minY;
  }

  public static verticalOverlap(box1: Bbox, box2: Bbox): [boolean, Interval] {
    const [, /* a */ minY1 /* b */, , maxY1] = box1.box(),
      [, /* c */ minY2 /* d */, , maxY2] = box2.box();
    return Util.intervalOverlap([minY1, maxY1], [minY2, maxY2]);
  }

  public static horizontalOverlap(box1: Bbox, box2: Bbox): [boolean, Interval] {
    const [minX1 /* a */, , maxX1 /* b */] = box1.box(),
      [minX2 /* c */, , maxX2 /* d */] = box2.box(),
      r = Util.intervalOverlap([minX1, maxX1], [minX2, maxX2]);
    return r;
  }

  public static verticalLess(box1: Bbox, box2: Bbox): number {
    if (box1.minY < box2.minY) {
      return -1;
    }
    if (box1.minY > box2.minY) {
      return 1;
    }
    // Box1.minY === box2.minY
    if (box1.maxY < box2.maxY) {
      return -1;
    }
    if (box1.maxY > box2.maxY) {
      return 1;
    }
    return 0;
  }

  /* Following functions will calculate length and width of the bounding box */

  public height(): number {
    return this.maxY - this.minY;
  }

  public static horizontalLess(box1: Bbox, box2: Bbox): number {
    if (box1.minX < box2.minX || box1.maxX < box2.maxX) {
      return -1;
    }

    if (box1.minX > box2.minX || box1.maxX > box2.maxX) {
      return 1;
    }

    return 0;
  }

  public width(): number {
    return this.maxX - this.minX;
  }

  public overlap(box2: Bbox) {
    return (
      (this.minX >= box2.minX &&
        this.minX <= box2.maxX &&
        this.minY >= box2.minY &&
        this.minY <= box2.maxY) || // Bottom left
      (this.maxX >= box2.minX &&
        this.maxX <= box2.maxX &&
        this.maxY >= box2.minY &&
        this.maxY <= box2.maxY) || // Top right
      (this.maxX >= box2.minX &&
        this.maxX <= box2.maxX &&
        this.minY >= box2.minY &&
        this.minY <= box2.maxY) || // Bottom right
      (this.minX >= box2.minX &&
        this.minX <= box2.maxX &&
        this.maxY >= box2.minY &&
        this.maxY <= box2.maxY)
    ); // Top left
  }

  private static cached: Map<[Bbox, Bbox], number> = new Map<
    [Bbox, Bbox],
    number
  >();

  public static distance(box1: Bbox, box2: Bbox): number {
    if (Bbox.cached.has([box1, box2])) {
      return Bbox.cached.get([box1, box2]);
    }

    function dist(x1: number, y1: number, x2: number, y2: number) {
      return ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5;
    }

    /*
     * Relative to box1 where is box2
     * Based on - https://stackoverflow.com/questions/4978323
     * Also in Anil K. Jain and Bin Yu. 1998. Document Representation and
     * Its Application to Page Decomposition.
     * IEEE Trans. Pattern Anal. Mach. Intell. 20, 3 (March 1998), 294-30
     */

    const x1 = box1.minX,
      y1 = box1.minY,
      x1b = box1.maxX,
      y1b = box1.maxY,
      x2 = box2.minX,
      y2 = box2.minY,
      x2b = box2.maxX,
      y2b = box2.maxY,
      left = x2b < x1,
      right = x1b < x2,
      above = y2b < y1,
      below = y1b < y2;
    let d = 0;
    if (below && left) {
      d = dist(x1, y1b, x2b, y2);
    } else if (left && above) {
      d = dist(x1, y1, x2b, y2b);
    } else if (above && right) {
      d = dist(x1b, y1, x2, y2b);
    } else if (right && below) {
      d = dist(x1b, y1b, x2, y2);
    } else if (left) {
      d = x1 - x2b;
    } else if (right) {
      d = x2 - x1b;
    } else if (above) {
      d = y1 - y2b;
    } else if (below) {
      d = y2 - y1b;
    }
    Bbox.cached.set([box1, box2], d);
    return d;
  }

  public static pdfMinerDistance(b1: Bbox, b2: Bbox) {
    const minX = Math.min(b1.minX, b2.minX),
      minY = Math.min(b1.minY, b2.minY),
      maxX = Math.max(b1.maxX, b2.maxX),
      maxY = Math.max(b1.maxY, b2.maxY);
    return (maxX - minX) * (maxY - minY) - b1.w() * b1.h() - b2.h() * b2.w();
  }

  public static vDistance(i: Bbox, j: Bbox): number {
    return Math.max(i.minY, j.minY) - Math.min(i.maxY, j.maxY);
  }

  public static hDistance(i: Bbox, j: Bbox): number {
    return Math.max(i.minX, j.minX) - Math.min(i.maxX, j.maxX);
  }

  /**
   * Return the proximity matrix with vertical distances to all bboxes
   */
  public static verticalNN(bboxes: Bbox[]) {
    const m = bboxes.map((x) =>
      bboxes.map((y) =>
        Bbox.verticalOverlap(x, y)[0] ? Bbox.distance(x, y) : Infinity
      )
    );
    return m;
  }

  public h() {
    return this.maxY - this.minY;
  }

  public w() {
    return this.maxX == -Infinity ? 0 : this.maxX - this.minX;
  }

  /**
   * Return true if the bboxes are
   * x closer than hThreshold or
   * y closer than vThreshold
   */
  public static nearby(
    box1: Bbox,
    box2: Bbox,
    hThreshold: number,
    vThreshold: number
  ) {
    const vOverlap = Bbox.verticalOverlap(box1, box2)[0],
      hOverlap = Bbox.horizontalOverlap(box1, box2)[0],
      hDistance = Bbox.hDistance(box1, box2),
      vDistance = Bbox.vDistance(box1, box2);

    return (
      (vOverlap && hDistance <= hThreshold) ||
      (hOverlap && vDistance <= vThreshold)
    );
  }

  /**
   * Return true if this bbox contains the provided bbox
   */
  public contains(bbox: Bbox) {
    return this.maxX == -Infinity || bbox.maxX == -Infinity
      ? false
      : this.minX <= bbox.minX &&
          this.maxX >= bbox.maxX &&
          this.minY <= bbox.minY &&
          this.maxY >= bbox.maxY;
  }

  /* Following functions will check for overlap between two bounding boxes */

  public overlapLine(box1: Bbox, box2: Bbox) {
    if (
      (box1.minX >= box2.minX &&
        box1.minX <= box2.maxX &&
        box1.minY >= box2.minY &&
        box1.minY <= box2.maxY) /* Bottom left corner*/ ||
      (box1.maxX >= box2.minX &&
        box1.maxX <= box2.maxX &&
        box1.maxY >= box2.minY &&
        box1.maxY <= box2.maxY) /* Top right corner*/ ||
      (box1.maxX >= box2.minX &&
        box1.maxX <= box2.maxX &&
        box1.minY >= box2.minY &&
        box1.minY <= box2.maxY) /* Bottom right corner*/ ||
      (box1.minX >= box2.minX &&
        box1.minX <= box2.maxX &&
        box1.maxY >= box2.minY &&
        box1.maxY <= box2.maxY)
    ) {
      /* Top left corner */

      return true;
    }

    return false;
  }

  /* To be worked as per threshold values from boxPlot*/
  public expandUpperBoxForOverlap(x: Bbox, expandBy: number) {
    x.minY -= expandBy;
    return x;
  }

  public expandLowerBoxForOverlap(x: Bbox, expandBy: number) {
    x.maxY += expandBy;
    return x;
  }

  public verticalDistanceWithNextLines(bbox: Bbox) {
    return this.maxY == bbox.minY;
  }

  public verticalDistanceWithPrevLines(bbox: Bbox) {
    return this.minY == bbox.maxY;
  }
}
