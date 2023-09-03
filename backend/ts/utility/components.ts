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
 * @fileoverview Elements with bounding boxes.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import Bbox from './bbox';
import { Pixel, Pixels, Util } from './utils';
import Canvas from './canvas';
import { Composite } from './composite';
import log from 'loglevel';

export abstract class Component {
  public parent: Component = null;

  public children: Map<string, Component> = new Map<string, Component>();

  public bbox: Bbox = new Bbox([]);

  private _pixels: Pixel[] = [];

  public style = 'rgba(255,0,0,1)';

  public getComposite(): Composite {
    return null;
  }

  public getParent(tag = 'page'): Component {
    if (this.id.startsWith(tag)) {
      return this;
    } else if (this.parent) {
      return this.parent.getParent(tag);
    }

    log.warn(`no ${tag} parent for ${this.id}`);
  }

  constructor(public id: string, public html: HTMLElement) {}

  public get pixels() {
    /*
     * TODO: This must instead detect children and ask them to
     * return their pixels instead of caching them all here
     */
    return this._pixels;
  }

  public set pixels(pixels: Pixels) {
    this._pixels = pixels;
    this.processPixels();
  }

  protected processPixels() {
    this.bbox.update(this._pixels);
  }

  /**
   * Convenience method to draw the bounding box of this component.
   * @param {Canvas} canvas The canvas element to draw to.
   */
  public drawBbox(canvas: Canvas) {
    this.bbox.draw(canvas, this.style);
  }

  /**
   * Draws the id number of the element into the canvas.
   * @param {Canvas} canvas The canvas element to draw on.
   */
  public drawId(canvas: Canvas) {
    const ctx = canvas.getContext();
    ctx.font = '15px Arial';
    ctx.fillStyle = this.style;
    const [x, y, X, Y] = this.bbox.box();
    ctx.fillText(`${this.id.replace(/^[a-z]*/, '')}: ${x}, ${y}`, x, y);
    ctx.fillText(`${X}, ${Y}`, X, Y);
  }

  /**
   * Draws all pixels in red on the given canvas.
   * @param {HTMLCanvasElement} canvas The canvas element to draw to.
   */
  public draw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { antialias: false }) as any;
    for (const [x, y] of this.pixels) {
      ctx.fillStyle = 'rgba(255,0,0,1)';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  public json() {
    return { id: this.id, bbox: this.bbox.bboxWH() };
  }

  public add(c: Component) {
    this.children.set(c.id, c);
    if (c.hasBbox()) {
      this.bbox.update([[c.bbox.minX, c.bbox.minY]]);
      this.bbox.update([[c.bbox.maxX, c.bbox.maxY]]);
      log.debug(
        `updated bbox of ${this.id} from ${c.bbox.minX}, ${c.bbox.minY} - ${c.bbox.maxX}, ${c.bbox.maxY}`
      );
    }
    c.parent = this;
  }

  public hasBbox() {
    return (
      Number.isFinite(this.bbox.minX) &&
      Number.isFinite(this.bbox.minY) &&
      Number.isFinite(this.bbox.maxX) &&
      Number.isFinite(this.bbox.maxY)
    );
  }

  public remove(c: Component) {
    /*
     * When removing a component create a fresh set of pixels from
     * remaining components.
     */
    this.children.delete(c.id);
    const pxls: Pixel[] = [];
    this.children.forEach((c) => {
      pxls.push([c.bbox.minX, c.bbox.minY]);
      pxls.push([c.bbox.maxX, c.bbox.maxY]);
    });
    this.bbox = new Bbox(pxls);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public toHtml(p: HTMLElement = null, maxTract = true): Promise<void> {
    // Clear the paragraph in case update called again on same lines
    this.html.innerHTML = '';
    const children = Array.from(this.children.values());
    return children.reduce(
      (promise, x) =>
        promise.then(() =>
          x.toHtml(this.html, maxTract).then(() => {
            /*
             * Add a space after each line except when ends with hyphen
             * To avoid concatenation of words appearing at end of line
             * With those appearing at start of next
             */
            if (!this.html.innerText.endsWith('-')) {
              this.html.appendChild(document.createTextNode(' '));
            }
          })
        ),
      Promise.resolve()
    );
  }

  public update() {
    this.children.forEach((l) => this.bbox.update(l.bbox.pixels()));
  }

  public contains(/* b: Component, d: number, samePage: boolean */) {
    return false;
  }

  public merge(next: Component) {
    next.children.forEach((c) => this.add(c));
    this.update();
  }

  public text() {
    return this.id;
  }

  public w() {
    return this.bbox.w();
  }

  public h() {
    return this.bbox.h();
  }

  public parentW() {
    return this.parent.bbox.w();
  }

  public parentH() {
    return this.parent.bbox.h();
  }
}

export class Glyph extends Component {
  public static glyphCount = 0;

  public style = 'rgba(0,255,0,1)';

  /**
   * Minimal pixel wrt x coordinate. Currently we assume it is the first in the
   * pixel row.
   * @type {Pixel}
   */
  public corners: Pixels;

  constructor(public id: string) {
    super(id, null);
  }

  /**
   * @override
   */
  protected processPixels() {
    super.processPixels();
    const minX: Pixels = [],
      minY: Pixels = [],
      maxX: Pixels = [],
      maxY: Pixels = [],
      [a, b, c, d] = this.bbox.box();
    for (const [x, y] of this.pixels) {
      if (x === a) {
        minX.push([x, y]);
      }
      if (x === c) {
        maxX.push([x, y]);
      }
      if (y === b) {
        minY.push([x, y]);
      }
      if (y === d) {
        maxY.push([x, y]);
      }
    }
    this.corners = [
      // X min, y min and max
      [a, minX.reduce((acc, [x, y]) => Math.min(y, acc), Infinity)],
      [a, minX.reduce((acc, [x, y]) => Math.max(y, acc), -Infinity)],
      // X max, y min and max
      [c, maxX.reduce((acc, [x, y]) => Math.min(y, acc), Infinity)],
      [c, maxX.reduce((acc, [x, y]) => Math.max(y, acc), -Infinity)],
      // Y min, x min and max
      [minY.reduce((acc, [x, y]) => Math.min(x, acc), Infinity), b],
      [minY.reduce((acc, [x, y]) => Math.max(x, acc), -Infinity), b],
      // Y min, x min and max
      [maxY.reduce((acc, [x, y]) => Math.min(x, acc), Infinity), d],
      [maxY.reduce((acc, [x, y]) => Math.max(x, acc), -Infinity), d]
    ];
  }

  /**
   * Draws the eight corners of the glyph on a canvas.
   * @param {Canvas} canvas The canvas to draw on.
   */
  public drawCorners(canvas: Canvas) {
    Util.drawPoints(canvas, this.corners);
  }
}
