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
 * @fileoverview Class for a single line.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Component, Glyph } from '../utility/components';
import { Span } from './span';
import { Pixels, Util } from '../utility/utils';
import Bbox from '../utility/bbox';
import { FontInfo } from '../utility/font_info';
import Canvas from '../utility/canvas';
import log from 'loglevel';

export class Line extends Component {
  /**
   * Lines are outlined in blue.
   * @override
   */
  public style = 'rgba(0,0,255,1)';

  public _spans = new Map<string, Span>();

  public _glyphs = new Map<string, Glyph>();

  public fontInfo: FontInfo;

  public hThreshold = 0;

  public vThreshold = 0;

  public isLineDisplayMaths = false;

  public object_detection_box_id = -1;

  /**
   * Adds a new span to the span mapping.
   * @param {Span} span The span to be added.
   */
  public addSpan(span: Span) {
    this._spans.set(span.id, span);
    this.add(span);
  }

  public addGlyph(glyph: Glyph) {
    this._glyphs.set(glyph.id, glyph);
  }

  /**
   * Updates the Line by adding all pixels of its component spans.
   */
  private static count = 0;

  /**
   * Make a line from a list of HTML elements.
   * @param {HTMLDocument} document The document.
   * @param {HTMLElement[]} line The HTML elements that represent the line.
   * @return {Line} The actual line object.
   */
  public static makeLine(
    document: HTMLDocument,
    line: HTMLElement[],
    fontInfo: FontInfo
  ): Line {
    /*
     * Volker on why there are no duplicate lines:-
     *
     * The new line div inserts a new layer into the DOM:
     * * new `div` is created
     * * added on the same layer as the divs in `line`
     * * All the nodes in `line` are given that div as a new parent.
     * Now `div` is the only node on that layer.
     * Since every node has one unique parent pointer (can be null), the line
     * line.forEach(x => div.appendChild(x));
     * makes sure that they are now pointing to the newly introduced `div` and
     * therefore one layer below. So no need to explicitly remove them beforehand
     */

    const div = document.createElement('div');
    div.classList.add('line');
    div.id = `line${Line.count++}`;

    /*
     * TODO: When the parent of a t div is a c div then the following line
     * Separates them into two. If the c div had the absolute x coordinate
     * And the t div had a relative one, then this pushes the t divs on to
     * The edges. See ncert.nic.in/jemh1/page111/004/page.html
     * Parent.insertBefore(div, first);
     * Line.forEach(x => div.appendChild(x));
     */
    const l = new Line(div.id, div);
    l.fontInfo = fontInfo;
    return l;
  }

  /**
   * Club the contents of divs that belong to the same line
   */
  public static concatDivs(
    infos: any[],
    hThreshold: number,
    vThreshold: number
  ) {
    let lines: any[] = [];
    for (let info of infos) {
      const newLines: any = [];

      /*
       * Check the new div's info against each line found so far, merging
       * Overlapping lines into itself and adding non-overlapping ones into newLines
       */
      while (lines.length) {
        // Here the line is a divinfo!
        const line = lines.pop();
        // Find all the lines it overlaps with and join them.
        if (!Bbox.nearby(info.bbox, line.bbox, hThreshold, vThreshold)) {
          newLines.push(line);
          continue;
        }
        line.divs = line.divs.concat(info.divs);
        line.spans = line.spans.concat(info.spans);
        line.glyphs = line.glyphs.concat(info.glyphs);
        // The problem with this is that we are just updating the bbox and not the pixels
        line.bbox.update(
          info.spans.reduce(
            (ac: Pixels, span: Span) => ac.concat(span.bbox.pixels()),
            []
          )
        );
        line.bbox.update(
          info.glyphs.reduce(
            (ac: Pixels, glyph: Glyph) => ac.concat(glyph.bbox.pixels()),
            []
          )
        );
        info = line;
      }
      if (info.spans.length > 0 && !info.bbox.unbounded()) {
        newLines.push(info);
      }
      lines = newLines;
    }
    return lines;
  }

  /**
   * Computes all lines in the page using vertical bounding box overlap of
   * spans.
   * @param {HTMLDocument} document The parent document.
   * @param {HTMLElement[]} divs The single divs that contain font information.
   * @param {Map<string, Span>} spans A span mapping.
   * @return {Line[]} A list of newly created lines.
   */
  public static separateLines(
    document: HTMLDocument,
    divs: HTMLElement[],
    spans: Map<string, Span>,
    glyphs: Glyph[],
    hThreshold: number,
    vThreshold: number,
    canvas: Canvas,
    pageWidth: number,
    pageHeight: number,
    fontInfo: FontInfo
  ): Line[] {
    let infos: any[] = [];

    /*
     * Div is a block that contains little or no variation in text attributes
     * E.g. a line containing mostly text. So put each 'div' into a new 'Line' of
     * Its own, unless it overlaps with one of the 'lines' found so far. If it
     * Does overlap, then create a 'newLine' that is a merge of the div and
     * Overlapping 'line'
     */
    for (const div of divs) {
      const info = Line.divInfo(div, spans);

      if (info.spans.length) {
        infos.push(info);
      }
    }

    /*
     * Add the small glyphs on the page to the divs, so we can look at the divs and glyphs together
     * We do a max because we don't want to count decorative underlines that span the full width
     */
    glyphs = glyphs.filter(
      (g) =>
        Math.max(g.bbox.w(), g.bbox.h()) < Math.min(pageWidth, pageHeight) / 8
    );
    for (const glyph of glyphs) {
      infos.push({
        divs: [] as HTMLElement[],
        spans: [] as Span[],
        bbox: glyph.bbox,
        glyphs: [glyph]
      });
    }

    infos = Line.concatDivs(infos, hThreshold, vThreshold);

    // Do this again to merge with the newly genreated divs
    let lines = Line.concatDivs(infos, hThreshold, vThreshold);

    lines.sort((l1, l2) => Bbox.verticalLess(l1.bbox, l2.bbox));
    lines = lines.filter((l) => l.bbox);
    const result: Line[] = [];
    for (const info of lines) {
      const line = Line.makeLine(document, info.divs, fontInfo);
      line.hThreshold = hThreshold;
      line.vThreshold = vThreshold;
      info.spans.forEach((s: Span) => line.addSpan(s));
      info.glyphs.forEach((g: Glyph) => line.addGlyph(g));
      line.bbox = info.bbox;
      result.push(line);
    }
    return result;
  }

  public getBackgroundGlyphs() {
    return Array.from(this._glyphs.values()).filter((g) =>
      g.id.startsWith('cc')
    );
  }

  public static divInfo(div: HTMLElement, spanMap: Map<string, Span>) {
    const htmls = Array.from(div.querySelectorAll('span')),
      spans: Span[] = [],
      bbox = new Bbox([]);
    for (const html of htmls) {
      if (html.id) {
        const span = spanMap.get(html.id);
        spans.push(span);
        bbox.update(span.bbox.pixels());
      }
    }

    /*
     * Find the min of the maxY of all the spans in the div as a proxy for its baseline
     * We need this as spans don't remember their parents (divs)
     * spans.forEach(span => log.debug(`span's maxY is ${span.bbox.maxY}`));
     */
    const baseY = spans.reduce(
      (ac, span) =>
        span.bbox.maxY != -Infinity && span.bbox.maxY < ac
          ? span.bbox.maxY
          : ac,
      Infinity
    );
    // Log.debug(`setting baseY to ${baseY}`);
    spans.forEach((span) => (span.baseY = baseY));
    return { divs: [div], spans, bbox, glyphs: [] as Glyph[] };
  }

  public all_text() {
    const spans = Array.from(this._spans.values());
    return spans.reduce((t, s) => t + s.html.innerText, '');
  }

  public font_size() {
    const spans = Array.from(this._spans.values()),
      fontSize = spans[1].html.getAttribute('has-fontSize').replace(/px$/, '');
    return fontSize;
  }

  public text() {
    const spans = Array.from(this._spans.values());
    return spans.map((s) => s.html.innerText).join(' ');
  }

  public json() {
    const json = super.json() as any;
    json.spans = Array.from(this._spans.keys());
    json.isLineDisplayMaths = this.isLineDisplayMaths;
    json.text = this.text();
    return json;
  }

  public hasMaths(threshold: number = Util.thresholdForDisplayMath) {
    const sortedSpans = Array.from(this._spans.values()).sort(
        Bbox.horizontalCmp
      ),
      /* sortedGlyphs = Array.from(this._glyphs.values()).sort(Bbox.horizontalCmp),
      mathSpans = new Map<string, Span>(), */
      // If most of the spans are maths then maybe we have display maths, send full line to MaxTract
      spanOfText = sortedSpans.reduce(
        (ac, span) => (!span.hasMaths() ? ac + span.bbox.w() : ac),
        0
      ),
      spanOfMaths = sortedSpans.reduce(
        (ac, span) => (span.hasMaths() ? ac + span.bbox.w() : ac),
        0
      );

    // Log.debug(`${this.id}'s spanOfMaths/spanOfText = ${spanOfMaths/(spanOfMaths+spanOfText)}`);
    return spanOfMaths / (spanOfMaths + spanOfText) >= threshold;
  }

  /**
   * Output the line's html but also look for possible maths, so we can convert it with MaxTract
   */
  public toHtml(p: HTMLElement, maxTract = true): Promise<void> {
    if (maxTract && this.isDisplayMath()) {
      return this.toDisplayMathHtml(p);
    }
    return this.toInlineMathHtml(p, true);
  }

  public isDisplayMath() {
    return this.isLineDisplayMaths;
  }
  /**
   *
   * @param p
   * @returns
   */
  public toDisplayMathHtml(p: HTMLElement): Promise<void> {
    return this.toTeX(this.fontInfo, this._spans, this._glyphs).then(
      (TeX: string) => {
        // Log.info(`received ${TeX}`);
        p.appendChild(document.createTextNode(TeX.replace(/space/g, ' ')));
      },
      () => {
        log.error(`failed to convert ${this.id} to TeX`);
      }
    ) as Promise<void>;
  }

  public toInlineMathHtml(p: HTMLElement, maxTract: boolean): Promise<void> {
    // maxTract = false; // We dont do inline math right yet
    const sortedSpans = Array.from(this._spans.values()),
      //sortedGlyphs = Array.from(this._glyphs.values()),
      mathSpans = new Map<string, Span>();

    /*
     * Iterate over the spans from left to right, accumulating the math spans together
     * For sending to MaxTract everytime a non-math span is encountered
     */
    return sortedSpans
      .reduce(
        (promise, span) =>
          promise.then(() => {
            if (!maxTract) {
              p.textContent += span.text();
            } else if (!span.hasMaths() && mathSpans.size > 0) {
              const mathGlyphs = Line.getEnclosedGlyphs(
                mathSpans,
                this._glyphs,
                this.hThreshold,
                this.vThreshold
              );
              return this.toTeX(this.fontInfo, mathSpans, mathGlyphs).then(
                (TeX: string) => {
                  p.appendChild(
                    document.createTextNode(TeX.replace(/space/g, ' '))
                  );
                  mathSpans.clear();
                  p.textContent += span.text();
                },
                () => {
                  p.textContent += span.text();
                }
              ) as Promise<void>;
            } else if (!span.hasMaths()) {
              p.textContent += span.text();
            } else {
              mathSpans.set(span.id, span);
            }
          }),
        Promise.resolve()
      )
      .then(() => {
        /*
         * If the previous line ended with a math span we will have accumulated
         * Unconverted math spans, send them now.
         */
        if (mathSpans.size) {
          const mathGlyphs = Line.getEnclosedGlyphs(
            mathSpans,
            this._glyphs,
            this.hThreshold,
            this.vThreshold
          );
          return this.toTeX(this.fontInfo, mathSpans, mathGlyphs).then(
            (TeX: string) => {
              p.appendChild(
                document.createTextNode(TeX.replace(/space/g, ' '))
              );
            },
            () => {}
          ) as Promise<void>;
        }
      });
  }

  public toTeX(
    fi: FontInfo,
    spans: Map<string, Span>,
    glyphs: Map<string, Glyph>
  ): Promise<string> {
    const baseURI = document.URL.replace(/[^/]*$/, ''),
      pageId = this.getParent('page').id,
      jsonf = this.getMaxTractJson(this.fontInfo, spans, glyphs);
    return Util.post(`${baseURI}/${pageId}/${this.id}.jsonf`, jsonf);
  }

  public static getEnclosedGlyphs(
    spans: Map<string, Span>,
    glyphs: Map<string, Glyph>,
    hThreshold: number,
    vThreshold: number
  ): Map<string, Glyph> {
    const bbox = new Bbox([]),
      mathGlyphs = new Map<string, Glyph>();
    spans.forEach((span) => bbox.update(span.bbox.pixels()));
    glyphs.forEach((glyph) => {
      if (Bbox.nearby(bbox, glyph.bbox, hThreshold, vThreshold)) {
        mathGlyphs.set(glyph.id, glyph);
      }
    });
    return mathGlyphs;
  }

  public appendMaxTractCharsJSON(json: any, span: Span, fi: FontInfo) {
    // MaxTract linearizer requires all characters to have BB's
    if (span.html.innerText.trim() == '') {
      return;
    }

    const factor = 2.08,
      scaled = span.bbox.bboxWH(factor),
      glyphs = Array.from(span.glyphs.values()).map((g) =>
        g.bbox.bboxWH(factor)
      );
    json.symbols.push({
      bbox: scaled,
      glyphs,
      elements: []
    });
    const font = span.html.getAttribute('has-font'),
      fontFace = span.html.getAttribute('has-fontFace'), // .replace(/^.*\+/, '');
      fontSize = span.html.getAttribute('has-fontSize').replace(/px$/, ''),
      chars = span.html.innerText.split(''),
      charNames = chars.map((c) => fi.getCharName(font, c));
    json.symbols[json.symbols.length - 1].elements.push([
      'pdfChar',
      {
        c: charNames.join(' '),
        bx: Math.round(scaled.x),
        by: Math.round(scaled.y),
        font: fontFace.replace(/^.*\+/, ''),

        /*
         * MaxTract linearizer requires scale to be floating pt
         * But JS converts 12.0/4.0 to 3 so divide by 4.001
         */
        scale: parseFloat(fontSize) / 4.001
      }
    ]);
  }

  public appendMaxTractHLineJSON(json: any, hLine: Bbox) {
    const factor = 2.08,
      scaled = hLine.bboxWH(factor);
    scaled.h = 3; // Artificially elongate the bbox to get a non zero height
    json.symbols.push({
      bbox: scaled,
      glyphs: [scaled],
      elements: []
    });
    json.symbols[json.symbols.length - 1].elements.push([
      'line',
      {
        // TODO: put real line height
        sx: scaled.x,
        sy: scaled.y,
        lw: 3,
        ex: scaled.x + scaled.w,
        ey: scaled.y + scaled.h
      }
    ]);
  }

  public getColor() {
    const spans = Array.from(this._spans.values()),
      r = Array.from(
        spans.reduce(
          (ac, s) => ac.add(Util.getColor(s.html)),
          new Set<string>()
        )
      );
    return r.sort();
  }

  /**
   * Create json file for input to MaxTract's linearizer
   * NOTE: includes some scaling to match MaxTract's threshold's
   */
  public getMaxTractJson(
    fi: FontInfo,
    spans: Map<string, Span>,
    glyphs: Map<string, Glyph>
  ) {
    const json = {
        srcPDF: '',
        page: 0,
        pageWidth: 2380,
        pageHeight: 3370,
        clipX: 0,
        clipY: 0,
        clipWidth: 2380,
        clipHeight: 3370,
        clipImage: '',
        symbols: new Array<any>()
      },
      hLines = Array.from(glyphs.values()).filter(
        (g) => g.bbox.height() <= 5 && g.bbox.height() / g.bbox.width() < 1
      );
    hLines.forEach((l) => this.appendMaxTractHLineJSON(json, l.bbox));
    spans.forEach((span) => this.appendMaxTractCharsJSON(json, span, fi));
    // Log.info(`sending ${JSON.stringify(json)}`);
    return json;
  }

  public removeFirstSpan() {
    const firstSpan = this._spans.values().next();
    if (!firstSpan.done) {
      // Log.debug(`removing ${firstSpan.value.id}`);
      this._spans.delete(firstSpan.value.id);
    }
  }
  /**
   * This function looks for next line after the current line which is just
   * below the line and it can be out of sequence
   * @param currLine This is the line for which next line needs to be find out
   * @param pageLines All the lines of the page
   * @returns
   */
  public static findNextLine(currLine: Line, pageLines: Map<string, Line>) {
    let tempID = `line${parseInt(currLine.id.slice(4)) + 1}`,
      nextLine = pageLines.get(tempID),
      gotoNextLine = 1;
    // If current line is last line then next line will be undefined
    while (
      nextLine != undefined &&
      (nextLine.bbox.minX > currLine.bbox.maxX ||
        nextLine.bbox.maxX < currLine.bbox.minX)
    ) {
      gotoNextLine++;
      tempID = `line${parseInt(currLine.id.slice(4)) + gotoNextLine}`;
      nextLine = pageLines.get(tempID);
    }

    return nextLine;
  }
  /**
   * This function looks for previous line after the current line which is just
   * below the line and it can be out of sequence
   * @param currLine This is the line for which next line needs to be find out
   * @param pageLines All the lines of the page
   * @returns
   */
  public static findPrevLine(currLine: Line, pageLines: Map<string, Line>) {
    let tempID = `line${parseInt(currLine.id.slice(4)) - 1}`,
      prevLine: Line,
      gotoPrevLine = 1;
    if (tempID != 'line-1') {
      prevLine = pageLines.get(tempID);
      while (
        prevLine != undefined &&
        (currLine.bbox.minX > prevLine.bbox.maxX ||
          currLine.bbox.maxX < prevLine.bbox.minX)
      ) {
        gotoPrevLine++;
        tempID = `line${parseInt(currLine.id.slice(4)) - gotoPrevLine}`;
        prevLine = pageLines.get(tempID);
      }
    }
    return prevLine;
  }
  /**
   * Function helps to return text inside line in the form of a string
   * @param line
   * @returns string of text contained in a line
   */
  public static getLineText(line: Line): string {
    let text = '';
    line._spans.forEach((span) => {
      text += span.html.innerHTML;
    });
    return text;
  }
  /**
   * Function helps to return text inside line in the form of a string
   * @param line
   * @returns font size of the first span
   */
  public static getLineFontSize(line: Line): number {
    return parseInt(
      Array.from(line._spans.values())[0]
        .html.attributes.getNamedItem('has-fontsize')
        .value.slice(0, -2)
    );
  }

  /**
   * Function helps to return text inside line in the form of a string
   * @param line
   * @returns string of text contained in a line
   */
  public static getLineFontFace(line: Line): string {
    return Array.from(line._spans.values())[0]
      .html.attributes.getNamedItem('class')
      .value.match(/ff../)[0];
  }

  /**
   * Function helps to return text inside line in the form of a string
   * @param line
   * @returns string of text contained in a line
   */
  public static getLineFontColor(line: Line): string {
    /*  const span: Span = line._spans.get('span0');
    let lineColor: string ;
    if (span != undefined){
      lineColor = span.html.attributes.getNamedItem('class').value.match(/fc../)[0] ;
    }
    
    return lineColor;  */
    return Array.from(line._spans.values())[0]
      .html.attributes.getNamedItem('class')
      .value.match(/fc../)[0];
  }
}
