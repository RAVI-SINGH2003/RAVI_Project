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
 * @fileoverview Bounding polygons.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Pixels } from './utils';
import Canvas from './canvas';

export default class BPolygon {
  private pixels: Pixels;

  constructor(pixels: Pixels) {
    this.pixels = pixels;
  }

  public polygon(): Pixels {
    return this.pixels;
  }

  /**
   * Draws all pixels in red on the given canvas.
   * @param {Canvas} canvas The canvas element to draw to.
   * @param {[number, number, number, number]} bbox The bounding box in minxy,
   *   maxxy.
   */
  public draw(canvas: Canvas, style = 'rgba(255,0,0,1)') {
    const ctx = canvas.getContext();
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.moveTo(this.pixels[0][0], this.pixels[0][1]);
    for (const c of this.pixels.slice(1)) {
      ctx.lineTo(c[0], c[1]);
    }
    ctx.lineTo(this.pixels[0][0], this.pixels[0][1]);
    ctx.stroke();
  }
}
