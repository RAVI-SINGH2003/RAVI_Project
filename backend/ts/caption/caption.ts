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

import Bbox from '../utility/bbox';
import { Line } from '../core/line';
import log from 'loglevel';
import { Component, Glyph } from '../utility/components';
import Canvas from '../utility/canvas';
export class Caption {
  private static count = 0;

  public html: HTMLElement;

  public lines = new Map<string, Line>();

  public id: string;

  public box: Bbox = null;

  public object_box: Bbox = null;

  public image_canvas: Canvas = null;

  public glyphs = new Map<string, Glyph>();

  public line_glyphs: Line[] = [];

  public flag = 2;

  public pageid: string;

  public image: HTMLImageElement;

  public static pageids_multi_map: string[] = [];

  public position: string;

  public static identifier = ['figure', 'fig.', 'table', 'tab.'];

  public static note = ['note'];

  public static caption_boxes: Bbox[] = [];

  public static caption_all = new Map<string, Caption>();

  public static line_glyphs_all = new Map<string, Line>();

  public static multiple_mapping = new Map<string, string[]>();

  public boxes_threshold: Bbox[] = [];

  /**
   * Make a paragraph from lines and move to Figcaption.
   * @param lines
   */
  constructor(lines: Map<string, Line>) {
    this.id = `caption${Caption.count++}`;
    this.html = document.createElement('FIGCAPTION');
    this.lines = lines;
    this.image = document.createElement('img');
  }

  public static match(p: any, e: any, unmatched: Map<string, Line>) {
    const captions = this.getcaptions();
    // Console.log(captions);
    if (captions.size != 0) {
      for (const [key, c] of captions) {
        if (c.glyphs.size != 0 && c.flag != 1) {
          for (const [line_id, line] of p.lines) {
            for (const [cline_id, cline] of c.lines) {
              if (
                line.html.innerText
                  .toLowerCase()
                  .localeCompare(cline.html.innerText.toLowerCase()) == 0
              ) {
                if (!e.has(c.id)) {
                  e.set(c.id, c);
                  c.lines.forEach((line) => p.lines.delete(line.id));
                  c.lines.forEach((line) => unmatched.delete(line.id));
                }
              } else if (line_id.localeCompare(cline_id) == 0) {
                if (!e.has(c.id)) {
                  e.set(c.id, c);
                  c.lines.forEach((line) => p.lines.delete(line.id));
                  c.lines.forEach((line) => unmatched.delete(line.id));
                }
              }
              // Checking only first line is enough.
              break;
            }
          }
        } else {
          this.caption_all.delete(key);
          console.log('removing ', c.id, ' ', c.html.innerText);
        }
      }
    } else {
      console.log('No caption found!');
    }
  }

  public static add_caption(c: Caption) {
    this.caption_all.set(c.id, c);
  }

  public static getcaptions() {
    return this.caption_all;
  }

  // Clasify captions flag as 0 if image 1 if table
  public static caption_classify() {
    const c_all = Caption.getcaptions();
    if (c_all.size != 0) {
      for (const [key, value] of c_all) {
        if (
          value.html.innerText
            .substr(0, 3)
            .toLowerCase()
            .localeCompare('fig') == 0
        ) {
          value.flag = 0;
          Caption.caption_all.set(key, value);
        } else if (
          value.html.innerText
            .substr(0, 3)
            .toLowerCase()
            .localeCompare('tab') == 0
        ) {
          value.flag = 1;
          Caption.caption_all.set(key, value);
        } // Else if(value.html.innerText.substr(0,3).toLowerCase().localeCompare('note')==0){
        /*
         *  Value.flag = 2;
         *  Caption.caption_all.set(key, value);
         * }
         */
        else {
          value.flag = 0;
          Caption.caption_all.set(key, value);
          console.log('Sub-Image caption', value.html.innerText);
        }
      }
    } else {
      console.log('No caption in the document');
    }
  }

  public expand_box(box1: Bbox) {
    const b = this.object_box;

    b.minX = Math.min(box1.minX, b.minX);
    b.minY = Math.min(box1.minY, b.minY);
    b.maxX = Math.max(box1.maxX, b.maxX);
    b.maxY = Math.max(box1.maxY, b.maxY);

    this.object_box = b;
  }

  // Boxify object with mapped glyphs
  public objects_boxify() {
    const b: Bbox = new Bbox([
      [Infinity, Infinity],
      [-Infinity, -Infinity]
    ]);
    [b.minX, b.minY, b.maxX, b.maxY] = [
      Infinity,
      Infinity,
      -Infinity,
      -Infinity
    ];
    // Console.log("boxify...")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, value] of this.glyphs) {
      // Console.log(value.bbox);
      b.minX = Math.min(value.bbox.minX, b.minX);
      b.minY = Math.min(value.bbox.minY, b.minY);
      b.maxX = Math.max(value.bbox.maxX, b.maxX);
      b.maxY = Math.max(value.bbox.maxY, b.maxY);
    }
    this.object_box = b;
  }

  // Boxify object with mapped lines glyphs
  public objects_lines_boxify() {
    const b: Bbox = this.object_box;
    for (const value of this.line_glyphs) {
      // Console.log(value.bbox);
      b.minX = Math.min(value.bbox.minX, b.minX);
      b.minY = Math.min(value.bbox.minY, b.minY);
      b.maxX = Math.max(value.bbox.maxX, b.maxX);
      b.maxY = Math.max(value.bbox.maxY, b.maxY);
    }
    this.object_box = b;
  }

  // Threshold for nearby line glyphs
  public lineGlyph_threshold(t_line: number) {
    const b: Bbox = this.object_box,
      c: Bbox = this.box;
    let gap = 0;

    if (c.minX > b.maxX && b.maxX != -Infinity) {
      return (gap = Math.round(t_line * (c.minX - b.maxX)));
    } else if (c.maxX < b.minX && b.minX != Infinity) {
      return (gap = Math.round(t_line * (b.minX - c.maxX)));
    } else if (c.maxY < b.minY && b.minY != Infinity) {
      return (gap = Math.round(t_line * (b.minY - c.maxY)));
    } else if (c.minY > b.maxY && b.maxY != -Infinity) {
      return (gap = Math.round(t_line * (c.minY - b.maxY)));
    }
    return gap;
  }

  // Check paras which starts which caption key identifiers, store in caption_paragraph
  /**
   * Function check paragraphs
   * @param caption_paragraph
   * @param caption_boxes
   * @param textboxPara
   * @param lines
   * @param pageid
   */
  public static identify_captions(
    caption_paragraph: Caption[],
    caption_boxes: Bbox[],
    textboxPara: Map<string, Component>,
    lines: Map<string, Line>,
    pageid: string
  ) {
    for (const [key, value] of textboxPara) {
      let s = '';
      for (const [, value1] of value.children) {
        for (const [, value2] of value1.children) {
          s += value2.text();
        }
      }
      if (s.length != 0) {
        for (const fig of Caption.identifier) {
          if (s.length >= fig.length) {
            if (
              s.substr(0, fig.length)
                .toLowerCase()
                .localeCompare(fig.toLowerCase()) == 0
            ) {
              console.log('Found caption! paragraph id:', key, ` caption:${s}`);
              caption_boxes.push(value.bbox);
              const plines: Map<string, Line> = new Map<string, Line>();
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              for (const [key1, value1] of value.children) {
                plines.set(key1, lines.get(key1));
              }
              const c: Caption = new Caption(plines);
              c.html.innerText = s;
              c.html.innerHTML = s;
              c.box = value.bbox;
              c.pageid = pageid;
              Caption.add_caption(c);
              caption_paragraph.push(c);
              break;
            }
          }
        }
      } else {
        console.log(`innertext is empty, ${s}`);
      }
    }
  }
  /**
   *
   * @param note_boxes
   * @param n
   * @param identifier1
   */
  public static identify_note(
    note_boxes: Bbox[],
    n: Map<string, Component>,
    identifier1: string[]
  ) {
    for (const [key, value] of n) {
      // Console.log(key);
      let s = '';
      for (const [, value1] of value.children) {
        for (const [, value2] of value1.children) {
          s += value2.text();
        }
      }
      // Console.log("paragraph ",s);
      if (s.length != 0) {
        for (const fig of identifier1) {
          if (s.length >= fig.length) {
            if (
              s
                .substr(0, fig.length)
                .toLowerCase()
                .localeCompare(fig.toLowerCase()) == 0
            ) {
              console.log('Found note! paragraph id:', key, ` note:${s}`);
              note_boxes.push(value.bbox);
              break;
            }
          }
        }
      } else {
        console.log(`innertext is empty, ${s}`);
      }
    }
  }

  /**
   * For every line from the page put black bbox around it and put -2 in the line gaps
   * @param lines All the lines from the page
   * @param lines_check
   * @param getPixelArr
   */
  public static color_lines_in_2d_arr(
    lines: Map<string, Line>,
    lines_check: Line[],
    getPixelArr: number[][]
    ) {
      console.log("CHECK CHECKKKKKKKK LINE NUMBER 335 FILE CAPTION.TS");
      let x_end: number, x_start: number, y_end: number, y_start: number;
      lines.forEach((x) => {
        lines_check.push(x);
        [x_start, y_start, x_end, y_end] = x.bbox.box();
        for (let i = x_start; i <= x_end; i++) {
          for (let j = y_start; j <= y_end; j++) {
            getPixelArr[i].splice(j, 1, -2);
          }
        }
      });
    }

  // Filling getPixelArray with negative values( < -2) of caption id for caption space
  public static color_captions_in_2d_arr(
    caption_boxes: Bbox[],
    caption_paragraph: Caption[],
    getPixelArr: number[][]
  ) {
    let x_end: number, x_start: number, y_end: number, y_start: number;
    const csize: number = caption_boxes.length;
    if (caption_boxes.length > 0) {
      for (let i = 0; i < csize; i++) {
        [x_start, y_start, x_end, y_end] = caption_boxes[i].box();
        for (let j = x_start; j <= x_end; j++) {
          for (let l = y_start; l <= y_end; l++) {
            getPixelArr[j].splice(
              l,
              1,
              -Number(caption_paragraph[i].id.substr(7)) - 3
            );
          }
        }
      }
    }
  }

  public static color_note_in_2d_arr(
    note_boxes: Bbox[],
    getPixelArr: number[][]
  ) {
    let x_end: number, x_start: number, y_end: number, y_start: number;
    if (note_boxes.length > 0) {
      for (let i = 0; i < note_boxes.length; i++) {
        [x_start, y_start, x_end, y_end] = note_boxes[i].box();
        for (let j = x_start; j <= x_end; j++) {
          for (let l = y_start; l <= y_end; l++) {
            getPixelArr[j].splice(l, 1, -1);
          }
        }
      }
    }
  }


  public static color_images_in_2d_arr(
    background_glyph_boxes: Bbox[],
    background_glyph: Glyph[],
    getPixelArr: number[][]
  ) {
    let x_end: number, x_start: number, y_end: number, y_start: number;
    const imgsize: number = background_glyph_boxes.length;
    if (background_glyph_boxes.length > 0) {
      for (let i = 0; i < imgsize; i++) {
        [x_start, y_start, x_end, y_end] = background_glyph_boxes[i].box();
        for (let j = x_start; j <= x_end; j++) {
          for (let l = y_start; l <= y_end; l++) {
            getPixelArr[j].splice(
              l,
              1,
              Number(background_glyph[i].id.substr(2))
            );
          }
        }
      }
    }
  }

  public static filter_nested_background_glyphs(
    background_glyph: Glyph[],
    background_glyph_boxes: Bbox[]
  ) {
    for (const single_glyph of background_glyph) {
      background_glyph_boxes.push(single_glyph.bbox);
    }
    // Removing all boxes which is inside other boxes
    let flag = false;
    if (background_glyph_boxes.length > 1) {
      flag = true;
    }

    let i = 0,
      j = 1;
    while (flag) {
      if (
        background_glyph_boxes[i].minX <= background_glyph_boxes[j].minX &&
        background_glyph_boxes[i].maxX >= background_glyph_boxes[j].maxX &&
        background_glyph_boxes[i].minY <= background_glyph_boxes[j].minY &&
        background_glyph_boxes[i].maxY >= background_glyph_boxes[j].maxY
      ) {
        background_glyph_boxes.splice(j, 1);
        background_glyph.splice(j, 1);
      } else if (
        background_glyph_boxes[j].minX <= background_glyph_boxes[i].minX &&
        background_glyph_boxes[j].maxX >= background_glyph_boxes[i].maxX &&
        background_glyph_boxes[j].minY <= background_glyph_boxes[i].minY &&
        background_glyph_boxes[j].maxY >= background_glyph_boxes[i].maxY
      ) {
        background_glyph_boxes.splice(i, 1);
        background_glyph.splice(i, 1);
        j = i + 1;
      } else {
        j += 1;
      }
      if (
        j == background_glyph_boxes.length &&
        i < background_glyph_boxes.length - 2
      ) {
        i += 1;
        j = i + 1;
      }
      if (
        (i == background_glyph_boxes.length - 2 &&
          j == background_glyph_boxes.length) ||
        (i == background_glyph_boxes.length - 1 &&
          j == background_glyph_boxes.length)
      ) {
        flag = false;
      }
    }
  }

  // Check for note type paras coming near image/tables and add them inside object if they are close by
  public static expand_box_for_note(
    note_boxes: Bbox[],
    caption_paragraph: Caption[]
  ) {
    if (note_boxes.length > 0) {
      for (let i = 0; i < note_boxes.length; i++) {
        for (const c of caption_paragraph) {
          const d1 = Bbox.distance(note_boxes[i], c.object_box),
            d2 = Bbox.distance(c.box, c.object_box);
          if (d1 < d2) {
            c.expand_box(note_boxes[i]);
            break;
          }
        }
      }
    }
  }

  // Search for all line glyphs comming inside,overlapping or nearby the object bounding box and add them to caption struture
  public static add_lines_in_captions(
    lines_check: Line[],
    caption_paragraph: Caption[],
    t_line: number
  ) {
    let flagLG = 0;
    do {
      // Console.log("Startdowhile");
      let counter = 0;
      for (let i = 0; i < lines_check.length; i++) {
        const x: Line = lines_check[i];
        for (const c of caption_paragraph) {
          const nearGap = c.lineGlyph_threshold(t_line);
          if (
            c.object_box.contains(x.bbox) ||
            c.object_box.overlapLine(c.object_box, x.bbox) ||
            Bbox.nearby(c.object_box, x.bbox, nearGap, nearGap)
          ) {
            c.line_glyphs.push(x);
            if (c.flag != 1) {
              Caption.line_glyphs_all.set(x.id, x);
            }
            lines_check.splice(i, 1);
            counter++;
            // Console.log("counter++");
          }
        }
        flagLG++;
      }
      for (const c of caption_paragraph) {
        c.objects_lines_boxify();
      }

      if (counter == 0) {
        // Console.log("loopbreak");
        flagLG = -1;
      }
      // Console.log("loop");
    } while (flagLG >= 0);
  }

  // Matching wrt the position of object relative to the caption
  public static match_top(
    c: Caption,
    getPixelArr: number[][],
    back_glyphs: Map<string, Glyph>,
    unmap_caption: Caption[],
    h: number,
    width: number,
    height: number,
    threshold_near_glyph: number[]
  ) {
    const glyphsid = new Map<number, string>();
    let ylimit: number = h;
    for (let i = c.box.minX; i <= c.box.maxX; i++) {
      for (let j = c.box.minY - 1; j >= h; j--) {
        if (getPixelArr[i][j] < -2) {
          ylimit = Math.max(ylimit, j);
        }
      }
    }
    for (let i = c.box.minX; i <= c.box.maxX; i++) {
      for (let j = c.box.minY - 1; j >= ylimit; j--) {
        if (getPixelArr[i][j] == -2) {
          break;
        } else if (getPixelArr[i][j] >= 0) {
          if (!glyphsid.has(getPixelArr[i][j])) {
            // Console.log("new glyph:",getPixelArr[i][j]);
            glyphsid.set(getPixelArr[i][j], c.id);
          }
          j = back_glyphs.get(`cc${getPixelArr[i][j]}`).bbox.minY;
          // Console.log("number of objects:",glyphsid);
        }
      }
    }
    // Console.log("number of objects:",glyphsid.size);
    for (const [keyg] of glyphsid) {
      c.glyphs.set(`cc${keyg}`, back_glyphs.get(`cc${keyg}`));
    }
    c.objects_boxify();
    let prev_glyphs_num = 0;
    while (c.boxes_threshold.length > 0) {
      c.boxes_threshold.pop();
    }
    c.boxes_threshold.push(c.object_box);
    while (prev_glyphs_num != c.glyphs.size) {
      prev_glyphs_num = c.glyphs.size;
      for (const [keyg, valueg] of back_glyphs) {
        if (!c.glyphs.has(keyg)) {
          if (
            c.object_box.contains(valueg.bbox) ||
            c.object_box.overlapLine(c.object_box, valueg.bbox) ||
            Bbox.nearby(
              c.object_box,
              valueg.bbox,
              threshold_near_glyph[0] * width,
              threshold_near_glyph[1] * height
            )
          ) {
            c.boxes_threshold.push(valueg.bbox);
            c.glyphs.set(keyg, valueg);
          }
        }
      }
      c.objects_boxify();
    }
    c.position = 'top';
    // Console.log("object:",c.object_box);
    if (c.glyphs.size == 0) {
      unmap_caption.push(c);
    }
  }

  public static match_bottom(
    c: Caption,
    getPixelArr: number[][],
    back_glyphs: Map<string, Glyph>,
    unmap_caption: Caption[],
    h: number,
    width: number,
    height: number,
    threshold_near_glyph: number[]
  ) {
    const glyphsid = new Map<number, string>();
    let ylimit: number = h;
    for (let i = c.box.minX; i <= c.box.maxX; i++) {
      for (let j = c.box.maxY + 1; j <= h; j++) {
        if (getPixelArr[i][j] < -2) {
          ylimit = Math.min(ylimit, j);
        }
      }
    }
    for (let i = c.box.minX; i <= c.box.maxX; i++) {
      for (let j = c.box.maxY + 1; j <= ylimit; j++) {
        if (getPixelArr[i][j] == -2) {
          break;
        } else if (getPixelArr[i][j] >= 0) {
          if (!glyphsid.has(getPixelArr[i][j])) {
            // Console.log("new glyph:",getPixelArr[i][j]);
            glyphsid.set(getPixelArr[i][j], c.id);
          }
          j = back_glyphs.get(`cc${getPixelArr[i][j]}`).bbox.maxY;
          // Console.log("number of objects:",glyphsid);
        }
      }
    }
    console.log('number of objects in table caption:', glyphsid.size);
    for (const [keyg] of glyphsid) {
      c.glyphs.set(`cc${keyg}`, back_glyphs.get(`cc${keyg}`));
    }
    c.objects_boxify();
    let prev_glyphs_num = 0;
    while (c.boxes_threshold.length > 0) {
      c.boxes_threshold.pop();
    }
    c.boxes_threshold.push(c.object_box);
    while (prev_glyphs_num != c.glyphs.size) {
      prev_glyphs_num = c.glyphs.size;
      for (const [keyg, valueg] of back_glyphs) {
        if (!c.glyphs.has(keyg)) {
          if (
            c.object_box.contains(valueg.bbox) ||
            c.object_box.overlapLine(c.object_box, valueg.bbox) ||
            Bbox.nearby(
              c.object_box,
              valueg.bbox,
              threshold_near_glyph[0] * width,
              threshold_near_glyph[1] * height
            )
          ) {
            c.boxes_threshold.push(valueg.bbox);
            c.glyphs.set(keyg, valueg);
          }
        }
      }
      c.objects_boxify();
    }
    c.position = 'bottom';
    // Console.log("object:",c.object_box);
    if (c.glyphs.size == 0) {
      unmap_caption.push(c);
    }
  }

  public static match_left(
    c: Caption,
    getPixelArr: number[][],
    back_glyphs: Map<string, Glyph>,
    unmap_caption: Caption[],
    lmargin: number,
    width: number,
    height: number,
    threshold_near_glyph: number[]
  ) {
    const glyphsid = new Map<number, string>();
    let ylimit: number = lmargin;
    for (let j = c.box.minY; j <= c.box.maxY; j++) {
      for (let i = c.box.minX - 1; i >= lmargin; i--) {
        if (getPixelArr[i][j] < -2) {
          ylimit = Math.max(ylimit, j);
        }
      }
    }
    for (let j = c.box.minY; j <= c.box.maxY; j++) {
      for (let i = c.box.minX - 1; i >= ylimit; i--) {
        if (getPixelArr[i][j] == -2) {
          break;
        } else if (getPixelArr[i][j] >= 0) {
          if (!glyphsid.has(getPixelArr[i][j])) {
            // Console.log("new glyph:",getPixelArr[i][j]);
            glyphsid.set(getPixelArr[i][j], c.id);
          }
          i = back_glyphs.get(`cc${getPixelArr[i][j]}`).bbox.minX;
          // Console.log("number of objects:",glyphsid);
        }
      }
    }
    // Console.log("number of objects:",glyphsid.size);
    for (const [keyg] of glyphsid) {
      c.glyphs.set(`cc${keyg}`, back_glyphs.get(`cc${keyg}`));
    }
    c.objects_boxify();
    let prev_glyphs_num = 0;
    while (c.boxes_threshold.length > 0) {
      c.boxes_threshold.pop();
    }
    c.boxes_threshold.push(c.object_box);
    while (prev_glyphs_num != c.glyphs.size) {
      prev_glyphs_num = c.glyphs.size;
      for (const [keyg, valueg] of back_glyphs) {
        if (!c.glyphs.has(keyg)) {
          if (
            c.object_box.contains(valueg.bbox) ||
            c.object_box.overlapLine(c.object_box, valueg.bbox) ||
            Bbox.nearby(
              c.object_box,
              valueg.bbox,
              threshold_near_glyph[0] * width,
              threshold_near_glyph[1] * height
            )
          ) {
            c.boxes_threshold.push(valueg.bbox);
            c.glyphs.set(keyg, valueg);
          }
        }
      }
      c.objects_boxify();
    }
    c.position = 'left';
    if (c.glyphs.size == 0) {
      unmap_caption.push(c);
    }
  }

  public static match_right(
    c: Caption,
    getPixelArr: number[][],
    back_glyphs: Map<string, Glyph>,
    unmap_caption: Caption[],
    rmargin: number,
    width: number,
    height: number,
    threshold_near_glyph: number[]
  ) {
    const glyphsid = new Map<number, string>();
    let ylimit: number = rmargin;
    for (let j = c.box.minY; j <= c.box.maxY; j++) {
      for (let i = c.box.maxX + 1; i <= rmargin; i++) {
        if (getPixelArr[i][j] < -2) {
          ylimit = Math.min(ylimit, j);
        }
      }
    }
    for (let j = c.box.minY; j <= c.box.maxY; j++) {
      for (let i = c.box.maxX + 1; i <= ylimit; i++) {
        if (getPixelArr[i][j] == -2) {
          break;
        } else if (getPixelArr[i][j] < -2) {
          ylimit = j;
        } else if (getPixelArr[i][j] >= 0) {
          if (!glyphsid.has(getPixelArr[i][j])) {
            // Console.log("new glyph:",getPixelArr[i][j]);
            glyphsid.set(getPixelArr[i][j], c.id);
          }
          i = back_glyphs.get(`cc${getPixelArr[i][j]}`).bbox.maxX;
          // Console.log("number of objects:",glyphsid);
        }
      }
    }
    // Console.log("number of objects:",glyphsid.size);
    for (const [keyg] of glyphsid) {
      c.glyphs.set(`cc${keyg}`, back_glyphs.get(`cc${keyg}`));
    }
    c.objects_boxify();
    let prev_glyphs_num = 0;
    while (c.boxes_threshold.length > 0) {
      c.boxes_threshold.pop();
    }
    c.boxes_threshold.push(c.object_box);
    while (prev_glyphs_num != c.glyphs.size) {
      prev_glyphs_num = c.glyphs.size;
      for (const [keyg, valueg] of back_glyphs) {
        if (!c.glyphs.has(keyg)) {
          if (
            c.object_box.contains(valueg.bbox) ||
            c.object_box.overlapLine(c.object_box, valueg.bbox) ||
            Bbox.nearby(
              c.object_box,
              valueg.bbox,
              threshold_near_glyph[0] * width,
              threshold_near_glyph[1] * height
            )
          ) {
            c.boxes_threshold.push(valueg.bbox);
            c.glyphs.set(keyg, valueg);
          }
        }
      }
      c.objects_boxify();
    }
    c.position = 'right';
    if (c.glyphs.size == 0) {
      unmap_caption.push(c);
    }
  }

  // Maximum match orientation
  public static max_match_orientation(
    mapping_num: number[],
    pos_all: string[][]
  ) {
    // Priority vaues to be edited...
    const priority = [6, 8, 5, 7, 1, 2, 3, 4],
      res: number[] = [],
      max_map: number = Math.max(...mapping_num);
    let map_pos_selection = [];
    mapping_num.forEach((item: number, index: number) =>
      item === max_map ? res.push(index) : null
    );
    if (res.length > 1) {
      let r_max = 0,
        r_index = -1;
      for (const r of res) {
        if (r_max < priority[r]) {
          r_max = priority[r];
          r_index = r;
        }
      }
      map_pos_selection = pos_all[r_index];
    } else {
      map_pos_selection = pos_all[res[0]];
    }
    return map_pos_selection;
  }

  public static list_caption_orientation(
    caption_paragraph: Caption[],
    map_pos_selection: string[]
  ) {
    const pos: string[] = [];
    for (const c of caption_paragraph) {
      if (c.flag == 0) {
        pos.push(map_pos_selection[0]);
      } else if (c.flag == 1) {
        pos.push(map_pos_selection[1]);
      } else {
        console.log('classify caption');
      }
      c.glyphs.clear();
    }
    return pos;
  }

  // This function is for case when 2 captions were mapped to the same object we are seperating them
  public static is_glyph_repeat() {
    const c_all = Caption.getcaptions(),
      map_glyph = new Map<string, string>();
    if (c_all.size != 0) {
      for (const [key, value] of c_all) {
        for (const [keyg] of value.glyphs) {
          if (map_glyph.has(keyg)) {
            console.log(
              `${keyg} is repeating in ${map_glyph.get(keyg)} in ${
                c_all.get(map_glyph.get(keyg)).pageid
              } and ${key} in ${c_all.get(key).pageid}`
            );
          } else {
            map_glyph.set(keyg, key);
          }
        }
      }
    }
  }

  public static is_repeat_glyph_in_page(caption_paragraph: Caption[]) {
    const map_glyph = new Map<string, string>();
    if (caption_paragraph.length != 0) {
      let out = false;
      for (const c of caption_paragraph) {
        for (const [keyg] of c.glyphs) {
          if (map_glyph.has(keyg)) {
            console.log(
              `${keyg} is repeating in ${map_glyph.get(keyg)} and ${c.id} in ${
                c.pageid
              }`
            );
            if (!out) {
              out = true;
            }
            // Break;
          } else {
            map_glyph.set(keyg, c.id);
          }
        }
      }
      return out;
    }
    return false;
  }
  /**
   * If captions are mapped to the same object this function separates
   * them based on their relative distance and position from captions
   * creating two different objects for both objects
   * @returns
   */
  public static find_multimap_glyph() {
    const c_all = Caption.getcaptions();

    if (c_all.size != 0) {
      this.multiple_mapping.clear();
      // Find all glyphs with caption map
      const pages = new Map<string, string[]>();
      for (const p of this.pageids_multi_map) {
        pages.set(p, []);
      }
      for (const [key, value] of c_all) {
        if (pages.has(value.pageid)) {
          pages.get(value.pageid).push(key);
        }
      }
      console.log(pages);
      for (const [, c_ids] of pages) {
        for (const cid of c_ids) {
          for (const [keyg] of c_all.get(cid).glyphs) {
            if (!this.multiple_mapping.has(keyg)) {
              this.multiple_mapping.set(keyg, [cid]);
            } else {
              this.multiple_mapping.get(keyg).push(cid);
            }
          }
        }
        // Keep nearest caption
        const change_c_all = new Map<string, number>();
        for (const [key, value] of this.multiple_mapping) {
          if (value.length > 1) {
            let distance = Infinity,
              i = 0;
            while (i < value.length) {
              let cid = value[i];
              if (
                this.caption_all.get(cid).position.localeCompare('top') == 0 ||
                this.caption_all.get(cid).position.localeCompare('bottom') == 0
              ) {
                const temp_d = Bbox.vDistance(
                  this.caption_all.get(cid).box,
                  this.caption_all.get(cid).glyphs.get(key).bbox
                );
                if (distance < temp_d) {
                  if (!change_c_all.has(cid)) {
                    change_c_all.set(cid, 1);
                  } else {
                    change_c_all.set(cid, change_c_all.get(cid) + 1);
                  }
                  this.caption_all.get(cid).glyphs.delete(key);
                  value.splice(i, 1);
                } else if (distance == Infinity) {
                  distance = temp_d;
                  i++;
                } else {
                  cid = value[i - 1];
                  if (!change_c_all.has(cid)) {
                    change_c_all.set(cid, 1);
                  } else {
                    change_c_all.set(cid, change_c_all.get(cid) + 1);
                  }
                  this.caption_all.get(cid).glyphs.delete(key);
                  value.splice(i - 1, 1);
                }
              } else if (
                this.caption_all.get(cid).position.localeCompare('left') == 0 ||
                this.caption_all.get(cid).position.localeCompare('right') == 0
              ) {
                const temp_d = Bbox.hDistance(
                  this.caption_all.get(cid).box,
                  this.caption_all.get(cid).glyphs.get(key).bbox
                );
                if (distance < temp_d) {
                  if (!change_c_all.has(cid)) {
                    change_c_all.set(cid, 1);
                  } else {
                    change_c_all.set(cid, change_c_all.get(cid) + 1);
                  }
                  this.caption_all.get(cid).glyphs.delete(key);
                  value.splice(i, 1);
                } else if (distance == Infinity) {
                  distance = temp_d;
                  i++;
                } else {
                  cid = value[i - 1];
                  if (!change_c_all.has(cid)) {
                    change_c_all.set(cid, 1);
                  } else {
                    change_c_all.set(cid, change_c_all.get(cid) + 1);
                  }
                  this.caption_all.get(cid).glyphs.delete(key);
                  value.splice(i - 1, 1);
                }
              }
            }
          }
        }
        for (const [cid] of change_c_all) {
          this.caption_all.get(cid).objects_boxify();
        }
        this.multiple_mapping.clear();
      }
    } else {
      console.log('No caption in the document');
    }
  }

  public static clean() {
    Caption.caption_all.clear();
    Caption.multiple_mapping.clear();
    Caption.count = 0;
  }

  public toHtml(maxTract = true) {
    this.html.innerText = '';
    this.html.id = this.id;
    const children = Array.from(this.lines.values());
    log.info(`${this.id} has ${children.length} lines`);
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

  /**
   * @override
   * @returns
   */
  public json() {
    const json = {
      id: this.id,
      lines: Array.from(this.lines.keys())
    };
    return json;
  }
}
