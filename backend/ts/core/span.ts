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
 * @fileoverview Spans that contain text.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Component, Glyph } from '../utility/components';
import { Util } from '../utility/utils';
import { FontInfo } from '../utility/font_info';
import Bbox from '../utility/bbox';
import { Line } from './line';

export class Span extends Component {
  public glyphs = new Map<string, Glyph>();

  public hasMath = false;

  public baseY = Infinity;

  public object_detect_bbox_id = -1; // -1: is not in any maths; else id of bbox

  /**
   * Sets the glyphs mapping.
   * @param {Glyph[]} glyphs A list of glyph.
   */
  public setGlyphs(glyphs: Glyph[]) {
    /*
     * This could be the first size we are setting the glyphs
     * clear the previously set default bounding box
     * if (this.glyphs.size == 0) {
     *   this.bbox = new Bbox([]);
     * }
     */
    glyphs.forEach((x: Glyph) => {
      this.glyphs.set(x.id, x);
      this.bbox.update(x.bbox.pixels());
      // Log.debug(`${this.text()} - ${this.bbox.text()}`);
    });
  }

  private static count = 0;

  public static getCount() {
    return Span.count;
  }

  /**
   * Creates a span object.
   * @param {HTMLElement} span The HTML element for the span.
   */
  public static makeSpan(span: HTMLElement) {
    const id = `span${Span.count++}`;
    span.id = id;
    const s = new Span(id, span);

    /*
     *  Let bcr = s.html.getBoundingClientRect();
     *  Not all spans may get a bounding box later, initialize with
     *  The character bounding box. Note this will be off by a few pixels
     *  S.pixels = [[Math.round(bcr.left), Math.round(bcr.top)],
     *  let bcr = s.html.getBoundingClientRect();
     *  Not all spans may get a bounding box later, initialize with
     *  The character bounding box. Note this will be off by a few pixels
     *  s.pixels = [[Math.round(bcr.left), Math.round(bcr.top)],
     * 		[Math.round(bcr.right), Math.round(bcr.bottom)]];
     */
    return s;
  }

  /**
   * Separates the spans in the document and remembers their font locally. Mixed
   * elements are disolved by enclosing strings in spans. Font information is
   * propagated from the divs and possibly superseded by local font information
   * in spans.
   * @param {HTMLDocument} document The parent document.
   * @param {HTMLElement[]} divs The single divs that contain font information.
   */
  public static separateSpans = function (
    document: HTMLDocument,
    divs: HTMLElement[],
    fi: FontInfo
  ) {
    for (const div of divs) {
      for (const child of Array.from(div.childNodes)) {
        Span.getSpans(document, child as HTMLElement, fi);
      }
    }
    const spans = Array.from(document.getElementsByTagName('span'));
    for (const span of spans) {
      if (
        span.childNodes.length == 1 &&
        span.childNodes[0].nodeType == Node.TEXT_NODE
      ) {
        Span.splitSpans(span);
      }
    }
  };

  /**
   * Splits the spans at the first and last spaces to potentially merge them
   * with the surrounding math spans, if any.
   * @param {HTMLDocument} document The parent document.
   * @param {HTMLElement} node The current span node.
   * @param {string} font The font to propagate.
   */
  private static splitSpans = function (node: HTMLElement) {
    let text = node.childNodes[0].textContent;
    const match = node.childNodes[0].textContent.match(/ [a-z]/i);

    if (match && match.index > 0) {
      const prev = node.cloneNode();
      prev.textContent = text.substring(0, match.index);
      node.parentNode.insertBefore(prev, node);

      text = text.substring(match.index);
      node.textContent = text;
    }
  };

  private static getSpans = function (
    document: HTMLDocument,
    node: HTMLElement,
    fi: FontInfo
  ) {
    if (node.nodeType === Node.TEXT_NODE) {
      const span = document.createElement('span'),
        parent = node.parentNode,
        [fontClass, fontFace, fontSize] = Util.getFont(
          parent as HTMLElement,
          fi
        );
      parent.replaceChild(span, node);
      span.appendChild(node);
      Util.setFont(span, fontClass, fontFace, fontSize);
      Util.addMissingClasses(span as Element, parent as Element);
    }
    if (node.nodeType === Node.ELEMENT_NODE && node.nodeName == 'SPAN') {
      Util.addMissingClasses(node as Element, node.parentNode as Element);
      if (node.childNodes.length > 1) {
        for (const child of Array.from(node.childNodes)) {
          Span.getSpans(document, child as HTMLElement, fi);
        }
      } else {
        const [parentClass, parentFace, parentSize] = Util.getFont(
            node.parentNode as HTMLElement,
            fi
          ),
          [fontClass, fontFace, fontSize] = Util.getFont(node, fi);
        Util.setFont(
          node,
          fontClass || parentClass,
          fontFace || parentFace,
          fontSize || parentSize
        );
      }
    }
  };

  /**
   * @override
   */
  public json() {
    const json = super.json() as any;
    json.glyphs = Array.from(this.glyphs.keys());
    json.text = this.text();
    return json;
  }

  /**
   * Return true if the span appears to use text only
   * fonts/chars etc
   */
  public hasText(
    glyphs: Map<string, Glyph>,
    hThreshold: number,
    vThreshold: number
  ) {
    const glyfs = Array.from(glyphs.values()),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      glyphsNearby = glyfs.filter((g) =>
        Bbox.nearby(this.bbox, g.bbox, hThreshold, vThreshold)
      ).length,
      glyphsOverlap = glyfs.filter(
        (g) => Bbox.horizontalOverlap(this.bbox, g.bbox)[0]
      ).length,
      usesTextFonts = this.html
        .getAttribute('has-fontFace')
        .match(/Times|Arial|CMR/i),
      usesMathFonts = this.html
        .getAttribute('has-fontFace')
        .match(/^CM[^R]|Symbol/i),
      hasWords = this.html.textContent.match(/[a-z]{4,}/i),
      hasChars = this.html.textContent.match(/[a-z]{1,3}/i);

    // Log.debug(`${this.id} - ${glyphsOverlap} && ${usesTextFonts} && ${hasWords} || (${hasChars}, ${usesMathFonts})`);

    if (glyphsOverlap) {
      return false;
    }

    return (usesTextFonts && hasWords) || (hasChars && !usesMathFonts);
  }

  public hasMaths() {
    const line = this.getParent('line') as Line;
    if (line === undefined) {
      return false;
    }

    return this.hasMath;

  }

  public hasSpace() {
    return this.html.textContent.trim() == '';
  }

  public text() {
    return this.html.textContent;
  }

  /**
   * @return span array splitting with space using glyphs (usage in table)
   * @author Hire Vikram Umaji and Amar Agnihotri
   */
  public splitspanwithspace() {
    const b = this.bbox.box();
    const getPixelArr = [];
    for (let i = 0; i <= b[2] - b[0]; i++) {
      //x wise
      getPixelArr[i] = -1;
    }
    let g_box;
    for (const [g_id, g] of this.glyphs) {
      g_box = g.bbox.box();
      for (let i = g_box[0] - b[0]; i <= g_box[2] - b[0]; i++) {
        //x wise
        getPixelArr[i] = g_id;
      }
    }
    const space_interval = [];
    if (getPixelArr[0] == -1) space_interval.push(0);
    for (let i = 1; i <= b[2] - b[0]; i++) {
      //x wise
      if (getPixelArr[i] == -1 && getPixelArr[i - 1] != -1)
        space_interval.push(i);
      else if (getPixelArr[i] != -1 && getPixelArr[i - 1] == -1)
        space_interval.push(i);
    }
    if (getPixelArr[b[2] - b[0]] == -1) space_interval.push(b[2] - b[0]);

    const space_gap = [];
    let i = 0;
    while (i + 1 < space_interval.length) {
      space_gap.push(space_interval[i + 1] - space_interval[i]);
      i += 2;
    }
    space_gap.sort((a, b) => a - b);
    const split_space_text = this.html.innerText.split(' ');
    if (split_space_text[0] == '' && getPixelArr[0] != -1)
      split_space_text.shift();
    if (
      split_space_text[split_space_text.length - 1] == '' &&
      getPixelArr[b[2] - b[0]] != -1
    )
      split_space_text.pop();
    const space_count = split_space_text.length - 1;
    const span_list = [];
    i = 0;
    let k = 0;
    while (k < split_space_text.length) {
      let j = i;
      while (
        space_interval[2 * j + 1] - space_interval[2 * j] <
        space_gap[space_gap.length - space_count]
      )
        j++;
      if (2 * j + 1 < space_interval.length) {
        while (i <= j) {
          let x_html = document.createElement('SPAN');
          let s = Span.makeSpan(x_html);
          if (i == 0)
            s.bbox = new Bbox([
              [b[0], b[1]],
              [b[0] + space_interval[2 * j], b[3]]
            ]);
          else
            s.bbox = new Bbox([
              [b[0] + space_interval[2 * i], b[1]],
              [b[0] + space_interval[2 * j], b[3]]
            ]);
          s.html.innerText = split_space_text[k];
          s.glyphs.clear();
          for (const [g_id, g] of this.glyphs) {
            if (s.bbox.contains(g.bbox)) s.glyphs.set(g_id, g);
          }
          span_list.push(s);
          x_html = document.createElement('SPAN');
          s = Span.makeSpan(x_html);
          s.bbox = new Bbox([
            [b[0] + space_interval[2 * j], b[1]],
            [b[0] + space_interval[2 * j + 1], b[3]]
          ]);
          s.html.innerText = ' ';
          s.glyphs.clear();
          span_list.push(s);
          break;
        }
      } else {
        const x_html = document.createElement('SPAN');
        const s = Span.makeSpan(x_html);
        if (i == 0)
          s.bbox = new Bbox([
            [b[0], b[1]],
            [b[2], b[3]]
          ]);
        else
          s.bbox = new Bbox([
            [b[0] + space_interval[2 * i - 1], b[1]],
            [b[2], b[3]]
          ]);
        s.html.innerText = split_space_text[k];
        s.glyphs.clear();
        for (const [g_id, g] of this.glyphs) {
          if (s.bbox.contains(g.bbox)) s.glyphs.set(g_id, g);
        }
        span_list.push(s);
      }
      i = j;
      i++;
      k++;
    }
    return span_list;
  }
}
