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
 * @fileoverview Utility methods.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import Canvas from './canvas';
import { Component } from './components';
import { FontInfo } from './font_info';
import { Span } from '../core/span';
import log from 'loglevel';

export type Pixel = [number, number];
export type Interval = [number, number]; // Same as pixel but improves
// Readability of code!
export type Pixels = Pixel[];
export type spansFrmPg = Map<number, Map<string, Span>>; // Keeping track of spans according to page on document level.

export namespace Util {
  export const promiseDelay = 200;

  /*
   * Whether you use matchSpans or not be careful before reducing the scalefactor
   * it improves performance but degrades glyph matching for spans as otherwise
   * the glyphs are either too close together (matchSpans) or have too few
   * distinguishing colors (no matchSpans)
   */
  export const scaleb = 4;

  export const dbscanMinPts = 2;
  export const thresholdForDisplayMath = 0.6;

  /*
   * A third of between line spacing for ascent, a third for descent, a third
   * for the gap. If we are closer than the gap then the glyph belongs to one of
   * the lines
   */
  export const maxVerticalGlyphSpacingWithinLine = 1 / 3;

  /**
   * Removes the given node from its parent if attached.
   * @param {Element} node
   */
  export const removeNode = function (node: Element) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  };

  /**
   * Looks up the pixel value in an canvas pixel array.
   * @param {Uint8ClampedArray} pix The pixel array.
   * @param {number} x The x coordinate.
   * @param {number} y The y coordinate.
   * @param {number} width The width of the array.
   * @return {number[]} The [r, g, b, a] value.
   */
  export const getPixel = function (
    pix: Uint8ClampedArray,
    x: number,
    y: number,
    width: number
  ): [number, number, number, number] {
    const i = (y * width + x) * 4,
      // Get the pixel of the red channel.
      r = pix[i],
      // Get the pixel of the green channel.
      g = pix[i + 1],
      // Get the pixel of the blue channel.
      b = pix[i + 2],
      // Get the pixel of the alpha channel.
      a = pix[i + 3];
    return [r, g, b, a];
  };

  /*
   * Checks if a pixel is non-white.
   * @param {Uint8ClampedArray} pix The pixel array.
   * @param {Pixel} pixel The pixel.
   * @param {number} width Width of the pixel array.
   */
  export const hasPixel = function (
    pix: Uint8ClampedArray,
    [x, y]: Pixel,
    width: number
  ) {
    const [r, g, b] = Util.getPixel(pix, x, y, width);

    // To get rid of the watermarks
    return r < 225 || b < 225 || g < 225;
  };

  /**
   * String from style sheet.
   * @param {CSSStyleSheet} sheet The style sheet.
   */
  export const styleSheetString = function (sheet: CSSStyleSheet) {
    const rules = Array.from(sheet.cssRules);
    let result = '';
    for (const rule of rules) {
      result += rule.cssText;
    }
    return result;
  };

  /**
   * Test if interval 1 overlaps with interval two.
   * @param {Interval} int1 An interval.
   * @param {Interval} int2 Another interval.
   * @return {[boolean, Interval]} True if overlap and the new max
   *   interval. Otherwise interval 1.
   */
  export const intervalOverlap = function (
    [a, b]: Interval,
    [x, y]: Interval
  ): [boolean, Interval] {
    if (
      (a >= x && a <= y) || // A\in[x,y]
      (b >= x && b <= y) || // B\in[x,y]
      (x >= a && x <= b) || // X\in[a,b]
      (y >= a && y <= b)
    ) {
      // Y\in[a,b]

      return [true, [Math.min(x, a), Math.max(y, b)]];
    }
    return [false, [a, b]];
  };

  /**
   * Gets the font name of a node, i.e., class ffX.
   * @param {HTMLElement} node The node.
   * @return {string} The font name if there is one.
   */
  export const getFont = function (node: HTMLElement, fi: FontInfo): string[] {
    let [fontClass, fontFace] = ['', ''];
    if (node.classList) {
      const font = Array.from(node.classList).find((x) => x.match(/^ff.+$/));
      if (font) {
        [fontClass, fontFace] = [font.slice(1), fi.getFontName(font.slice(1))];
      }
    }
    return [
      fontClass,
      fontFace,
      window
        .getComputedStyle(node)
        .getPropertyValue('font-size')
        .replace(/(\.\d+)?px$/, 'px')
    ];
  };

  /**
   * Sets the has-font attribute of a node.
   * @param {HTMLElement} node The node.
   * @param {string} font The font value.
   */
  export const setFont = function (
    node: HTMLElement,
    fontClass: string,
    fontFace: string,
    fontSize: string
  ) {
    if (fontClass) {
      node.setAttribute('has-font', fontClass);
    }

    if (fontFace) {
      node.setAttribute('has-fontFace', fontFace);
    }

    if (fontSize) {
      node.setAttribute('has-fontSize', fontSize);
    }
  };

  const drawPoint_ = function (
    ctx: CanvasRenderingContext2D,
    [x, y]: Pixel,
    style: string
  ) {
    ctx.fillStyle = style;
    ctx.fillRect(x, y, 1, 1);
  };

  export const drawPoint = function (
    canvas: Canvas,
    pixel: Pixel,
    style = 'rgba(255,0,0,1)'
  ) {
    const ctx = canvas.getContext();
    drawPoint_(ctx, pixel, style);
  };

  export const drawPoints = function (
    canvas: Canvas,
    pixels: Pixels,
    style = 'rgba(255,0,0,1)'
  ) {
    const ctx = canvas.getContext();
    pixels.forEach((x) => drawPoint_(ctx, x, style));
  };

  export const combinePixels = function (pixList: Component[]) {
    return pixList.reduce((ac, span) => ac.concat(span.pixels), []);
  };

  export const fetchUrl = function (url: string): Promise<Response> {
    return fetch(url).then((r) => {
      if (!r.ok) {
        const err = `${url}: ${r.status}, ${r.statusText}`;
        log.error(err);
        throw err;
      }
      return r;
    });
  };

  /**
   * HTTP POST data to url and return a promise for the response text
   */
  export const post = function (url: string, data: any): Promise<string> {
    // Console.log(`Fetch ${url}`);
    return fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then((r) => {
      if (!r.ok) {
        const err = `Util.post: ${url}: ${r.status}, ${r.statusText}`;
        log.error(err);
        throw err;
      }
      return r.text();
    });
  };

  /**
   * Add classes from element 'b' that are not in element 'a'
   */
  export const addMissingClasses = function (a: Element, b: Element) {
    const bClasses = Util.getClassPrefixes(b);
    for (const c of bClasses) {
      if (!Util.hasClass(a, c) && !Util.positioningClass(c)) {
        a.className = `${a.className} ${Util.getClass(b, c)}`;
      }
    }
  };

  /**
   * Return the class name (not the color) for the element's color
   */
  export const getColor = function (e: Element): string {
    return getClass(e, 'fc');
  };

  /**
   * Return class prefixes from element 'e'. Used to identify which prefixes
   * are missing then to copy them in full from the parent.
   */
  export const getClassPrefixes = function (e: Element): string[] {
    /*
     * Prefixes of classes we want to propagate. These are also the
     * Classes that appear at least once in spans
     */
    const prefixes = [
        'ff', // Font-family etc
        'fs', // Font-size
        'fc', // Color
        'ls', // Letter-spacing
        'ws' // Word-spacing
      ],
      classes = e.className.split(' ');
    return prefixes.filter((prefix) =>
      classes.some((c) => c.startsWith(prefix))
    );
  };

  /**
   * Return true if a class 'prefix' is present in classes of element 'e'
   */
  export const hasClass = function (e: Element, prefix: string): boolean {
    return (
      e.className.split(' ').filter((c) => c.startsWith(prefix)).length > 0
    );
  };

  /**
   * Return true if class 'c' is a positioning class (and must be removed) for
   * reflowing HTML.
   */
  export const positioningClass = function (c: string): boolean {
    return /^[xyt]/.test(c);
  };

  /**
   * Return the full class from element 'b' corresponding to prefix 'prefix'
   */
  export const getClass = function (b: Element, prefix: string): string {
    return b.className
      .split(' ')
      .filter((className) => className.startsWith(prefix))[0];
  };
}
