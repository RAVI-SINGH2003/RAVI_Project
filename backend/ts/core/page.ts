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
 * @fileoverview Class for a single page.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Interval, Util } from '../utility/utils';
import Bbox from '../utility/bbox';
import cleanDocument from '../utility/clean_document';
import Canvas from '../utility/canvas';
import { Line } from './line';
import { Span } from './span';
import { Component, Glyph } from '../utility/components';
import { ConComp } from './connected_components';
import { Cluster } from '../utility/cluster';
import ImageBuilder from './image_builder';
import BackgroundAnalysis from '../background/background_analysis';
import { FontInfo } from '../utility/font_info';
import BPolygon from '../utility/bpolygon';
import GrahamScan from '../background/graham_scan';
import { Composite } from '../utility/composite';
import { Caption } from '../caption/caption';
import ImageAnalysis from '../utility/imageAnalysis';
import { captionThresholds } from '../global/parameters';

// Imports for tables
import { Table } from '../table/table';
import log from 'loglevel';
import { symbolMain } from '../symbol/symbol_det';
import { arrowdet } from '../symbol/arrow';
import { BigBbox } from '../background/BigBbox';

export default class Page extends Component {
  public promise: Promise<void> = null;

  public fontInfo: FontInfo = null;

  //public table_list_algo1: tableComponent[] = [];

  public table_list_algo2: Table[] = [];

  public table_list_algo3: Table[] = [];

  public cluster_list: Cluster[] = [];

  public max_col_row: Bbox[];

  private foreground: HTMLElement = null;

  private background: HTMLElement = null;

  public lines: Map<string, Line> = new Map<string, Line>();

  public spans: Map<string, Span> = new Map<string, Span>();

  public span_list: Span[] = [];

  private glyphs: Map<string, Glyph> = new Map<string, Glyph>();

  private clusters: Map<string, Cluster> = new Map<string, Cluster>();

  public components: Map<string, Component> = new Map<string, Component>();

  private tDivs: HTMLElement[] = [];

  public canvas: Canvas = null;

  private imageBuilder: ImageBuilder = null;

  public backgroundAnalyser: BackgroundAnalysis = null;

  public imageAnalyser: ImageAnalysis = null;

  public width = 0;

  public height = 0;

  public header: Line = null;

  public footer: Line = null;

  public uri = '';

  public aidetecttext: string = "";

  static _width = 0;

  static _height = 0;

  private captionThreshold: captionThresholds = new captionThresholds();

  public bigBoxes: BigBbox[] = null;

  constructor(id: string, page: HTMLElement) {
    super(id, page);
  }

  /**
   * This function does the foreground analysis and background analysis pagewise
   * @param id Unique id reference for the page
   * @param pageElement Page HTML element from the document
   * @returns Page
   */
  public static fromHtml(id: string, pageElement: HTMLElement): Page {
    const page = new Page(id, pageElement);
    const baseURI = document.documentURI;
    page.uri = baseURI;
    const url = baseURI.substring(0, baseURI.lastIndexOf('/')) + FontInfo.path;

    // Get the font info first so spanify below can save the real font names
    page.promise = Util.fetchUrl(url)
      .then((s) => s.json())
      .then((json) => {
        log.debug(json);
        page.fontInfo = new FontInfo(json);
      })
      .then(() => cleanDocument(document))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .then(([doc, fore, back]) => {
        // Foreground computations: scale, compute sizes, remove
        page.foreground = fore as HTMLElement;
        page.foreground.style.transform = `scale(${Util.scaleb})`;
        const rect = page.foreground.getBoundingClientRect();
        page.width = Math.floor(rect.width);
        page.height = Math.floor(rect.height);
        /*
         * Pages that are not rendered do not get a width and height so
         * Reuse from earlier pages
         */
        if (page.width > 0 && page.height > 0) {
          Page._width = page.width;
          Page._height = page.height;
        } else {
          page.width = Page._width;
          page.height = Page._height;
        } 
        /*
         * Log.info(`Page width is ${page.width}, height is ${page.height}`);
         * Background as separately scaled div.
         */
        page.background = page.foreground.cloneNode(false) as HTMLElement;
        page.background.appendChild(back);
        // Divs and spans
        page.tDivs = Array.from(
          page.foreground.getElementsByClassName('t')
        ) as HTMLElement[];
        page.spanify();
        Util.removeNode(page.foreground);
        // Init canvas/SVG elements.
        page.canvas = new Canvas(document, page.width, page.height);
        page.canvas.setupEventListeners(page.markSpans.bind(page));
        page.imageBuilder = new ImageBuilder(document, page.width, page.height);
      });
    page.getConnectedComponents();
    page.promise = page.promise.then(() => {
      page.backgroundAnalyser = new BackgroundAnalysis(
        page.background,
        page.canvas,
        page.imageBuilder,
        page.width,
        page.height
      );
    });
    return page;
  }

  /**
   *
   * Analysis methods
   * ================
   *
   */

  /**
   * Compute all the text spans in the foreground. Thereby recursively resolve
   * mixed elements by inserting new spans and add the font attribute to each
   * span.
   */
  private spanify() {
    Span.separateSpans(document, this.tDivs, this.fontInfo);
    const spans = Array.from(
      this.foreground.querySelectorAll('*[has-font]')
    ) as HTMLElement[];
    for (const sp of spans) {
      const span = Span.makeSpan(sp),
        // Convert the id to a color which we will use later to detect its boundary
        id = parseInt(sp.id.replace(/^span/, ''), 10),
        color = `rgb(${Math.floor(id / (256 * 256))}, ${
          Math.floor(id / 256) % 256
        }, ${id % 256})`;
      span.html.style.color = color;
      this.spans.set(span.id, span);
      this.add(span);
    }
  }

  /**
   * Computes all the connected components for the page foreground.
   * @return {Promise<void>} The promise for pipelining.
   */
  public getConnectedComponents() {
    this.showFore();
    this.promise = this.promise.then(() => {
      const [pixels, imageData] = this.canvas.getPixels(),
        cc = ConComp.getConnectedComponents(pixels);
      cc.map((x) => {
        // Create a glyph
        const id = `glyph${Glyph.glyphCount++}`,
          glyph = new Glyph(id);
        glyph.pixels = x;
        this.glyphs.set(id, glyph);

        // Find the most frequent color of all pixels in this glyph
        const w = this.width,
          colors = glyph.pixels.map((p) => {
            const [r, g, b] = Util.getPixel(imageData, p[0], p[1], w);
            return r * 256 * 256 + g * 256 + b;
          }),
          sColors = colors.filter((c) => c <= Span.getCount()),
          primaryColor = sColors
            .sort(
              (a, b) =>
                sColors.filter((v) => v === a).length -
                sColors.filter((v) => v === b).length
            )
            .pop(),
          // Lookup a span with that color
          span = this.spans.get(`span${primaryColor}`);
        if (span) {
          span.setGlyphs([glyph]);
          return true;
        }

        log.warn(`no span${primaryColor} for ${id} with colors ${colors}`);
        // Glyph.bbox.drawId(this.canvas, 'rgba(0, 255, 0, 1)', id);
        return false;
      });
      this.spans.forEach((s) => {
        if (s.glyphs.size == 0 && s.text().trim() != '') {
          log.warn(`no glyphs for ${s.id}: '${s.text().trim()}'`);
        }
      });
    });
    return this.promise;
  }

  /**
   * Computes and registers all lines in the page.
   * @return {Promise<void>} The promise for pipelining.
   */
  public linify() {
    this.lines.clear();
    this.promise = this.promise.then(() => {
      const h = this.withinLineDistance(),
        v = this.betweenLineDistance() * Util.maxVerticalGlyphSpacingWithinLine,
        lines = Line.separateLines(
          document,
          this.tDivs,
          this.spans,
          this.bgGlyphs(),
          h,
          v,
          this.canvas,
          this.width,
          this.height,
          this.fontInfo
        );
      lines.forEach((line) => this.lines.set(line.id, line));
      log.info(`Found ${this.lines.size} lines`);
    });

    this.showFore();
    log.info(`Lines: ${this.lines}`);
    //console.log("Lines: ",this.lines);
    this.drawLines(true);
    return this.promise;
  }
  /**
   * Group lines into textboxes, order the textboxes 
   * This will be used in paragraph matching
   * @returns a map containing lines ordered by textboxes
   */
  public getSortedLines()  {
    const textboxes: Map<string, Component> = this.getTextBoxes();
    const sorted: Map<string, Component> = new Map<string, Component>();
    this.preorderSort(this.groupComponents(textboxes), sorted);
    sorted.forEach((l) => log.debug(`sorted ${l.id}`));
    return sorted;
  }

  /**
   * Groups isolated this.lines into this.textboxes
   * @returns Textboxes where lines are combined which are nearby
   */
  public getTextBoxes() {
    const textboxes = new Map<string, Component>(),
      isolated: Map<string, Component> = new Map<string, Component>();
    this.lines.forEach((l) => isolated.set(l.id, l));
    const d = this.betweenLineDistance() * 2;
    while (isolated.size > 0) {
      const textbox = new Composite();
      this.add(textbox);
      const [k, v] = isolated.entries().next().value;
      textbox.add(v);
      log.debug(`created ${textbox.id} with ${k}`);
      isolated.delete(k);
      Array.from(isolated.values()).reduce((acc, l) => {
        if (Bbox.nearby(acc.bbox, l.bbox, 0, d)) {
          acc.add(l);
          isolated.delete(l.id);
          log.debug(`added ${l.id} to ${textbox.id}`);
        }
        return acc;
      }, textbox);
      textboxes.set(textbox.id, textbox);
    }
    return textboxes;
  }

  /**
   * Preorder sort the tree of text blocks (Nearby textblocks are siblings)
   * @param composite
   * @param components
   */
  private preorderSort(
    composite: Composite,
    components: Map<string, Component>
  ) {

    // add lines to result
    if (composite.id.startsWith('line')) {
      components.set(composite.id, composite);
    } else {
      // recursively sort the non line components
      const children = Array.from(composite.children.values());
      children
        .sort(
          (c1, c2) =>
            0.5 * c1.bbox.minX +
            1.5 * (c1.bbox.minY + c1.bbox.maxY) -
            0.5 * c2.bbox.minX -
            1.5 * (c2.bbox.minY + c2.bbox.maxY)
        )
        .forEach((c) => {
          this.preorderSort(c, components);
        });
    }
  }

  /**
   * Create an n-ary tree of text blocks. Nearby textblocks are siblings
   * @param text blocks to group
   * @returns root of the n-ary tree
   */
  private groupComponents(components: Map<string, Component>) {
    let distances: [number, Component, Component][] = [];
    components.forEach((c1) => {
      components.forEach((c2) => {
        log.debug(`c1.bbox: ${c1.bbox.minX}, ${c1.bbox.maxX}`);
        log.debug(`c2.bbox: ${c2.bbox.minX}, ${c2.bbox.maxX}`);
        if (c1.id > c2.id) {
          distances.push([Bbox.pdfMinerDistance(c1.bbox, c2.bbox), c1, c2]);
        }
      });
    });
    distances.sort((d1, d2) => d1[0] - d2[0]);
    const p = new Composite();
    this.add(p);
    components.forEach((c) => p.add(c));
    while (distances.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [d, c1, c2] = distances.shift(),
        group = new Composite();
      this.add(group);
      log.debug(`grouping ${c1.id} and ${c2.id} into ${group.id}`);
      group.add(c1);
      group.add(c2);
      p.remove(c1);
      p.remove(c2);
      p.add(group);
      distances = [];
      p.children.forEach((c1) => {
        p.children.forEach((c2) => {
          if (c1.id > c2.id) {
            distances.push([Bbox.pdfMinerDistance(c1.bbox, c2.bbox), c1, c2]);
          }
        });
      });
      distances.sort((d1, d2) => d1[0] - d2[0]);
      distances.forEach((d) => {
        log.debug(`${d[0]}, ${d[1].id}, ${d[2].id}`);
      });
    }
    return p;
  }

  /**
   * Runs the background analysis.
   * @return {Promise<void>} The promise for pipelining.
   */
  public backgroundAnalysis() {
    let spanList = Array.from(this.spans.values());
    spanList = []; //error removal temporary in case of fraction symbol
    this.promise = this.backgroundAnalyser
      .analyse(this.promise, spanList)
      .then(() => {
        this.backgroundAnalyser.ccs.forEach((cc) => {
          const g: Glyph = new Glyph(`cc${this.glyphs.size}`);
          g.pixels = cc;
          log.debug(`Glyph: ${g.bbox.text()}`);
          this.glyphs.set(g.id, g);
        });
      });
    log.debug(`Background analysis for: ${this.id}`)
    return this.promise;
  }
  /**
   * Span text is moved to Lines innertext
   * @returns Promise when all lines are copied from span to lines
   */
  public lines_textify() {
    this.promise = this.promise.then(() => {
        for (const [key, value] of this.lines) {
          let s = '';
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for (const [key1, value1] of value.children) {
            s += value1.text();
          }
          value.html.innerText = s;
          value.html.innerHTML = s;
          this.lines.set(key, value);
        }
    });
    return this.promise;
  }

  /**
   * Function maps tables and images with their respective captions
   * @param note Constant variable string with value 'note'
   * @param threshold_near_glyph Threshold values for glyphs
   * @param threshold_near_line Threshold values for line
   */
  public objectMap() {
    // Assuming that linify() is done
    const h = this.height,
      w = this.width,
      lmargin = this.leftMargin(),
      rmargin = this.rightMargin(),
      getPixelArr = [], // Row contains y and col contains x
      lines_check: Line[] = [];

    // GetPixelArr is a 2d arrray which stores value -1 below for detection of whitespace
    for (let i = 0; i <= w; i++) {
      getPixelArr[i] = []; //X wise

      for (let j = 0; j <= h; j++) {
        getPixelArr[i][j] = -1; //Y wise
      }
    }
    //Caption.color_lines_in_2d_arr(this.lines, lines_check, getPixelArr);

    // Check paras which starts which caption key identifiers, store in caption_paragraph
    const textboxPara = this.getTextBoxes(),
      caption_boxes: Bbox[] = [],
      caption_paragraph: Caption[] = [];
    Caption.identify_captions(
      caption_paragraph,
      caption_boxes,
      textboxPara,
      this.lines,
      this.id
    );

    // Classify caption as image and table caption accordingly, 0 if image 1 if table
    Caption.caption_classify();

    if (caption_paragraph.length == 0) {
      console.log('No caption is found!');
      if (textboxPara.size == 0) {
        console.log('Have you done linify() ?');
      }
    }

    // Filling getPixelArray with negative values( < -2) of caption id for caption space
    Caption.color_captions_in_2d_arr(
      caption_boxes,
      caption_paragraph,
      getPixelArr
    );

    // For note type lines coming near to image or table use note identifier
    // for checking paras starting with note key
    const identifier1 = Caption.note,
      note_boxes: Bbox[] = [];
    Caption.identify_note(note_boxes, textboxPara, identifier1);

    // Whiten the note area for better glyph detection i.e. will ignore note
    // lines for image/table detection
    Caption.color_note_in_2d_arr(note_boxes, getPixelArr);

    // Get the background glyphs for detecting object i.e. image/table
    const g1 = this.bgGlyphs();
    if (g1.length == 0) {
      console.log('No image is found: Have you done backgroundanalysis() ?');
    }
    const background_glyph_boxes: Bbox[] = [],
      background_glyph: Glyph[] = g1;
    // Fill backgound_glyph_boxes and remove smaller nested glyphs
    Caption.filter_nested_background_glyphs(
      background_glyph,
      background_glyph_boxes
    );
    console.log(background_glyph_boxes);
    //this.imageAnalysis(background_glyph_boxes);
    this.imageAnalyser = new ImageAnalysis(
      background_glyph_boxes,
      this.canvas,
      'rgba(165,42,42,5)'
    );
    this.imageAnalyser.drawImageBoxes();

    // Fill the getPixelArray with glyphs id where glyphs space is comming
    Caption.color_images_in_2d_arr(
      background_glyph_boxes,
      background_glyph,
      getPixelArr
    );

    // In below code, first image bottom and table top fixed position, find object map.
    const back_glyphs = new Map<string, Glyph>();
    for (const single_glyph of background_glyph) {
      back_glyphs.set(single_glyph.id, single_glyph);
    }
    console.log('background glyphs', back_glyphs);
    let unmap_caption: Caption[] = [];
    for (const c of caption_paragraph) {
      if (c.flag == 0) {
        Caption.match_top(c, getPixelArr, back_glyphs, unmap_caption, 0, w, h, [
          this.captionThreshold.captionParameters.get('h_threshold'),
          this.captionThreshold.captionParameters.get('v_threshold')
        ]);
        console.log('object:', c.object_box);
      } else if (c.flag == 1) {
        Caption.match_bottom(
          c,
          getPixelArr,
          back_glyphs,
          unmap_caption,
          h,
          w,
          h,
          [
            this.captionThreshold.captionParameters.get('h_threshold'),
            this.captionThreshold.captionParameters.get('v_threshold')
          ]
        );
        console.log('object:', c.object_box);
      } else {
        console.log('classify caption');
      }
    }

    /*
     * If there exists an unmapped caption, search for all possible relative position
     * wrt caption, record their mappings.
     * Pick largest number of mapping.
     * If two positions have same number of mapping, select with high priority
     */

    if (unmap_caption.length > 0) {
      console.log(
        'unmapped captions are in the page with std outline mapping.'
      );
      const mapping_num: number[] = [],
        positions_fig: string[] = ['top', 'bottom', 'left', 'right'],
        positions_tab: string[] = ['top', 'bottom'],
        pos_all = [];
      for (const pos_fig of positions_fig) {
        for (const pos_tab of positions_tab) {
          pos_all.push([pos_fig, pos_tab]);
          unmap_caption = [];
          const pos: string[] = Caption.list_caption_orientation(
            caption_paragraph,
            [pos_fig, pos_tab]
          );
          for (let k = 0; k < caption_paragraph.length; k++) {
            if (pos[k].localeCompare('bottom') == 0) {
              // Bottom
              const c = caption_paragraph[k];
              Caption.match_bottom(
                c,
                getPixelArr,
                back_glyphs,
                unmap_caption,
                h,
                w,
                h,
                [
                  this.captionThreshold.captionParameters.get('h_threshold'),
                  this.captionThreshold.captionParameters.get('v_threshold')
                ]
              );
              console.log('pos:', pos[k], 'object:', c.object_box);
              caption_paragraph[k] = c;
            } else if (pos[k].localeCompare('top') == 0) {
              // Top
              const c = caption_paragraph[k];
              Caption.match_top(
                c,
                getPixelArr,
                back_glyphs,
                unmap_caption,
                0,
                w,
                h,
                [
                  this.captionThreshold.captionParameters.get('h_threshold'),
                  this.captionThreshold.captionParameters.get('v_threshold')
                ]
              );
              console.log('pos:', pos[k], 'object:', c.object_box);
              caption_paragraph[k] = c;
            } else if (pos[k].localeCompare('right') == 0) {
              // Right
              const c = caption_paragraph[k];
              Caption.match_right(
                c,
                getPixelArr,
                back_glyphs,
                unmap_caption,
                rmargin,
                w,
                h,
                [
                  this.captionThreshold.captionParameters.get('h_threshold'),
                  this.captionThreshold.captionParameters.get('v_threshold')
                ]
              );
              console.log('pos:', pos[k], 'object:', c.object_box);
              caption_paragraph[k] = c;
            } else if (pos[k].localeCompare('left') == 0) {
              // Left
              const c = caption_paragraph[k];
              Caption.match_left(
                c,
                getPixelArr,
                back_glyphs,
                unmap_caption,
                lmargin,
                w,
                h,
                [
                  this.captionThreshold.captionParameters.get('h_threshold'),
                  this.captionThreshold.captionParameters.get('v_threshold')
                ]
              );
              console.log('pos:', pos[k], 'object:', c.object_box);
              caption_paragraph[k] = c;
            } else {
              console.log('classify caption');
            }
          }
          mapping_num.push(caption_paragraph.length - unmap_caption.length);
        }
      }
      // Pick largest number of mapping.
      const map_pos_selection = Caption.max_match_orientation(
        mapping_num,
        pos_all
      );
      console.log('priority map: [figure, table] = ', map_pos_selection);
      if (map_pos_selection != pos_all[pos_all.length - 1]) {
        const pos: string[] = Caption.list_caption_orientation(
          caption_paragraph,
          map_pos_selection
        );
        for (let k = 0; k < caption_paragraph.length; k++) {
          if (pos[k].localeCompare('bottom') == 0) {
            // Bottom
            const c = caption_paragraph[k];
            Caption.match_bottom(
              c,
              getPixelArr,
              back_glyphs,
              unmap_caption,
              h,
              w,
              h,
              [
                this.captionThreshold.captionParameters.get('h_threshold'),
                this.captionThreshold.captionParameters.get('v_threshold')
              ]
            );
            console.log('pos:', pos[k], 'object:', c.object_box);
            caption_paragraph[k] = c;
          } else if (pos[k].localeCompare('top') == 0) {
            // Top
            const c = caption_paragraph[k];
            Caption.match_top(
              c,
              getPixelArr,
              back_glyphs,
              unmap_caption,
              0,
              w,
              h,
              [
                this.captionThreshold.captionParameters.get('h_threshold'),
                this.captionThreshold.captionParameters.get('v_threshold')
              ]
            );
            console.log('pos:', pos[k], 'object:', c.object_box);
            caption_paragraph[k] = c;
          } else if (pos[k].localeCompare('right') == 0) {
            // Right
            const c = caption_paragraph[k];
            Caption.match_right(
              c,
              getPixelArr,
              back_glyphs,
              unmap_caption,
              rmargin,
              w,
              h,
              [
                this.captionThreshold.captionParameters.get('h_threshold'),
                this.captionThreshold.captionParameters.get('v_threshold')
              ]
            );
            console.log('pos:', pos[k], 'object:', c.object_box);
            caption_paragraph[k] = c;
          } else if (pos[k].localeCompare('left') == 0) {
            // Left
            const c = caption_paragraph[k];
            Caption.match_left(
              c,
              getPixelArr,
              back_glyphs,
              unmap_caption,
              lmargin,
              w,
              h,
              [
                this.captionThreshold.captionParameters.get('h_threshold'),
                this.captionThreshold.captionParameters.get('v_threshold')
              ]
            );
            console.log('pos:', pos[k], 'object:', c.object_box);
            caption_paragraph[k] = c;
          } else {
            console.log('classify caption');
          }
        }
      }
    }

    // Check for multimap captions for single glyph
    if (Caption.is_repeat_glyph_in_page(caption_paragraph)) {
      console.log('found multi map');
      Caption.pageids_multi_map.push(this.id);
    } else {
      console.log('No multi map glyphs');
    }

    // Now check for note type paras coming near image/tables and add them
    // inside object if they are close by
    Caption.expand_box_for_note(note_boxes, caption_paragraph);

    // Search for all line glyphs comming inside,overlapping or nearby the
    // object bounding box and add them to caption struture
    Caption.add_lines_in_captions(
      lines_check,
      caption_paragraph,
      this.captionThreshold.captionParameters.get('l_threshold')
    );

    // Adding captions found in the page to caption structure
    for (const c of caption_paragraph) {
      // C.objects_lines_boxify();
      // console.log("Add CAPTIONNNNNNNNNNNNNNNN" , c.id);
      Caption.add_caption(c);
    }
  }
  /**
   * function page is cropped to get the Complete images of the
   * captions for placement in the final html
   * @returns promise once all boxes are drawn around captions
   */
  public draw_object_box() {
    console.log("draw IMAGESSSSSSSSSSSS in page.ts file Line:807");
    const obj_boxes = [],
      cap_boxes = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [cid, c] of Caption.getcaptions()) {
      if (c.pageid == this.id && c.glyphs.size != 0 && c.flag != 1) {
        obj_boxes.push(c.object_box);
        cap_boxes.push(c.box);
        c.image_canvas = this.canvas.ImageCanvas(c.object_box);
        c.image.src = c.image_canvas.tourl();
        console.log('Image canvas Cropped from Page Canvas');
      }
    }
    this.imageAnalyser = new ImageAnalysis(
      obj_boxes,
      this.canvas,
      'rgba(16,142,0,5)'
    );
    this.imageAnalyser.drawImageBoxes();
    this.imageAnalyser = new ImageAnalysis(
      cap_boxes,
      this.canvas,
      'rgba(165,42,42,5)'
    );
    this.imageAnalyser.drawImageBoxes();
  }

  public symbolDetector() {
    this.promise.then(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const found = symbolMain(this.backgroundAnalyser.boxes, this.canvas);
    });
    return this.promise;
  }

  public arrowhelper() {
    this.promise.then(() => {
      arrowdet(this.canvas, this.backgroundAnalyser.boxes);
    });
  }

  public bgGlyphs() {
    return Array.from(this.glyphs.values()).filter((g) =>
      g.id.startsWith('cc')
    );
  }

  /**
   * Cluster page elements
   */
  public cluster(hFactor = 3) {
    //const ccIndex = this.glyphs.size;
    this.backgroundAnalyser.ccs.forEach((cc) => {
      const g: Glyph = new Glyph(`cc${this.glyphs.size}`);
      g.pixels = cc;
      this.glyphs.set(g.id, g);
    });
    const components: Component[] = Array.from(this.lines.values());
    Array.prototype.push.apply(components, Array.from(this.bgGlyphs()));
    const hThreshold = this.withinLineDistance() * hFactor,
      clusters: Cluster[] = Cluster.doClustering(components, hThreshold);
    clusters.forEach((c) => {
      this.clusters.set(c.id, c);
    });
  }

  /*
   *Get gray scale pixel array of the backgound images of the page
   *
   */

  public getGrayScale() {
    const ctx = this.canvas.getContext(),
      imgPixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
      pix = imgPixels.data,
      grayPixelArr = [];
    for (let i = 0; i < this.canvas.height; i++) {
      const row = [];
      for (let j = 0; j < this.canvas.width; j++) {
        row.push(0);
      }
      grayPixelArr.push(row);
    }

    for (let x = 0; x < this.canvas.height; x++) {
      for (let y = 0; y < this.canvas.width; y++) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [r, g, b, a] = Util.getPixel(pix, y, x, this.canvas.width),
          value = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        grayPixelArr[x][y] = value;

        const k = (x * this.canvas.width + y) * 4;
        pix[k] = value;
        pix[k + 1] = value;
        pix[k + 2] = value;
        pix[k + 3] = 255;
      }
    }

    ctx.putImageData(imgPixels, 0, 0);

    return grayPixelArr;
  }

  /*
   *Put image to the canvas after image modification i.e. watermark removal
   */

  public putFinalImage(arr: any) {
    const ctx = this.canvas.getContext(),
      imgPixels = ctx.getImageData(0, 0, this.width, this.height);

    for (let i = 0; i < this.canvas.height; i++) {
      for (let j = 0; j < this.canvas.width; j++) {
        const k = (i * this.canvas.width + j) * 4,
          g_pix = arr[i][j];

        imgPixels.data[k] = g_pix;
        imgPixels.data[k + 1] = g_pix;
        imgPixels.data[k + 2] = g_pix;
        imgPixels.data[k + 3] = 255;
      }
    }

    ctx.putImageData(imgPixels, 0, 0);
  }

  /**
   *
   * HTML Element Methods
   * ====================
   *
   */

  public insertFore() {
    document.body.appendChild(this.foreground);
  }

  public insertBack() {
    document.body.insertBefore(
      this.background,
      this.foreground.parentNode ? this.foreground : null
    );
  }

  public removeFore() {
    Util.removeNode(this.foreground);
  }

  public removeBack() {
    Util.removeNode(this.background);
  }

  public insert() {
    this.insertBack();
    this.insertFore();
  }

  public remove() {
    this.removeBack();
    this.removeFore();
  }

  /**
   *
   * Canvas Drawing Methods
   * ======================
   *
   */

  public showFore() {
    this.promise = this.promise.then(() =>
      this.canvas.draw(this.imageBuilder.img(this.foreground.outerHTML, false))
    );
    return this.promise;
  }

  public showBack() {
    this.promise = this.promise.then(() => {
      let back = this.background.outerHTML;
      back = back.replace(/<\/div>$/, '</img></div>');
      return this.canvas.draw(this.imageBuilder.img(back));
    });
  }

  public showPage() {
    this.promise = this.promise.then(() => {
      let back = this.background.outerHTML;
      back = back.replace(/<\/div>$/, '</img></div>');
      console.log(back);
      this.canvas.draw(this.imageBuilder.img(back));
      this.canvas.draw(this.imageBuilder.img(this.foreground.outerHTML, false));
    });
    return this.promise;
  }

  public hidePage() {
    this.canvas.remove();
  }

  public drawSpans(id = false) {
    this.promise.then(() => {
      this.spans.forEach((x) => {
        if (x.hasMaths()) {
          x.style = 'rgba(0,0,0,1)';
        }
        this.drawComponent(x, id);
      });
    });
  }

  public drawGlyphs(id = false) {
    this.promise.then(() => {
      this.glyphs.forEach((x) => this.drawComponent(x, id));
    });
  }

  public drawClusters(id = false) {
    this.promise.then(() => {
      this.clusters.forEach((x) => this.drawComponent(x, id));
    });
  }

  public drawLines(id = false) {
    this.promise.then(() => {
      this.lines.forEach((x) => {
        if (x.hasMaths()) {
          x.style = 'rgba(0,0,0,1)';
        }
        this.drawComponent(x, id);
      });
    });
  }

  public drawMathLines(id = false) {
    this.promise.then(() => {
      this.lines.forEach((x) => {
        if (x.hasMaths()) {
          this.drawComponent(x, id);
        }
      });
    });
  }

  public drawLineBoundaries(/*id = false*/) {
    this.promise.then(() => {
      this.lines.forEach((x) => {
        const polygon = new BPolygon(GrahamScan(x.pixels));
        polygon.draw(this.canvas);
      });
    });
  }

  public drawAll(id = false) {
    this.drawGlyphs(id);
    this.drawSpans(id);
    this.drawLines(id);
  }

  // JSON input/output
  public json() {
    this.bigBoxes = this.backgroundAnalyser.bigBoxes;
    const json = {
      id: this.id,
      bbox: { x: 0, y: 0, w: this.width, h: this.height },
      bgBoxes: this.bigBoxes,
      glyphs: Array.from(this.glyphs.values()).map((x) => x.json()),
      spans: Array.from(this.spans.values()).map((x) => x.json()),
      lines: Array.from(this.lines.values()).map((x) => x.json())
    };
    return json;
  }

  public static fromJson(json: any, clearGlyphs = false): Page {
    // First clear everything!
    const page = new Page(json.id, null);
    if (clearGlyphs) {
      page.glyphs.clear();
      json.glyphs.map((gl: any) => {
        const bb = gl.bbox,
          glyph = new Glyph(gl.id);
        glyph.pixels = [
          [bb.x, bb.y],
          [bb.x + bb.w, bb.y + bb.h]
        ];
        page.glyphs.set(gl.id, glyph);
      });
    }
    page.spans.clear();
    page.lines.clear();
    json.spans.map((sp: any) => {
      const span = new Span(sp.id, null);
      span.setGlyphs(sp.glyphs.map((gl: string) => page.glyphs.get(gl)));
      page.spans.set(sp.id, span);
    });
    json.lines.map((li: any) => {
      const line = new Line(li.id, null);
      li.spans.forEach((sp: string) => line.addSpan(page.spans.get(sp)));
      page.lines.set(li.id, line);
    });
    return page;
  }

  public loadJson() {
    const location = window.location.href.replace(/\.html$/, '.json'),
      httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
          this._loadJson(httpRequest.responseText);
        } else {
          log.error(`Error fetching json: ${httpRequest.status}`);
        }
      }
    }.bind(this);
    httpRequest.open('GET', location, true);
    httpRequest.send();
  }

  public _loadJson(json: string) {
    try {
      Page.fromJson(json, false);
    } catch (err) {
      log.info('Loading JSON without glyph reference!');
      Page.fromJson(json, true);
    }
  }

  // Drawing methods for recognised components
  private drawComponent(component: Component, id = false) {
    component.drawBbox(this.canvas);
    if (id) {
      component.drawId(this.canvas);
    }
  }

  // Drawing methods for heading lines
  public drawHeadingLines(id: string) {
    this.lines.get(id).bbox.draw(this.canvas, 'rgba(520,66,55,1)');
  }

  private medianWidthGlyph(): Glyph {
    const glyphs = Array.from(this.glyphs.values()).filter((g) =>
      g.id.startsWith('glyph')
    );
    glyphs.sort((a, b) => a.bbox.w() - b.bbox.w());
    return glyphs[Math.round(glyphs.length / 2)];
  }

  public medianHeightGlyph(): Glyph {
    const glyphs = Array.from(this.glyphs.values()).filter((g) =>
      g.id.startsWith('glyph')
    );
    glyphs.sort((a, b) => a.bbox.h() - b.bbox.h());
    return glyphs[Math.round(glyphs.length / 2)];
  }

  /**
   * Return the most frequent between line distance (for grouping nearby lines)
   */
  public betweenLineDistance(): number {
    return this.medianHeightGlyph().bbox.h(); // Single line spacing
  }

  /**
   * Return the most frequent within line distance (for grouping nearby words)
   */
  private withinLineDistance(): number {
    return this.medianWidthGlyph().bbox.w() * 2; // No space more than 2 wide
  }

  private maxLineWidth(): number {
    const lines = Array.from(this.lines.values());
    return lines.reduce((acc, x) => (acc > x.bbox.w() ? x.bbox.w() : acc), 0);
  }

  private maxLineHeight(): number {
    const lines = Array.from(this.lines.values());
    return lines.reduce((acc, x) => (acc > x.bbox.h() ? x.bbox.h() : acc), 0);
  }

  private leftMargin(): number {
    const lines = Array.from(this.lines.values());
    return lines.reduce(
      (acc, x) => (acc > x.bbox.box()[0] ? x.bbox.box()[0] : acc),
      Infinity
    );
  }

  private rightMargin(): number {
    const lines = Array.from(this.lines.values());
    return lines.reduce(
      (acc, x) => (acc < x.bbox.box()[2] ? x.bbox.box()[2] : acc),
      -Infinity
    );
  }

  public all_lines() {
    return Array.from(this.lines.values());
  }

  public topLine(): Line {
    return Array.from(this.lines.values())[0];
  }

  public bottomLine(): Line {
    return Array.from(this.lines.values())[this.lines.size - 1];
  }

  public matchHeader(minY: number): Line {
    const lines = Array.from(this.lines.values());
    this.header = lines.find(
      (l) => minY * 0.99 <= l.bbox.minY && l.bbox.minY <= minY * 1.01
    );
    if (this.header) {
      this.lines.delete(this.header.id);
      log.info(`Removed line id as header: ${this.header.id}`);
    }
    return this.header;
  }

  public matchFooter(maxY: number): Line {
    const lines = Array.from(this.lines.values());
    this.footer = lines.find(
      (l) => maxY * 0.99 <= l.bbox.maxY && l.bbox.maxY <= maxY * 1.01
    );
    if (this.footer) {
      this.lines.delete(this.footer.id);
      log.info(`Removed line id as footer: ${this.footer.id}`);
    }
    return this.footer;
  }

  /**
   * Callback called by mouseup event listener when 
   * span is marked manually
   * @param canvas 
   * @param clickBox 
   */
  public markSpans(canvas: Canvas, clickBox: Bbox) {
    this.spans.forEach((span) => {
      if (span.bbox.contains(clickBox) || clickBox.contains(span.bbox)) {
        // Toggle
        span.hasMath = !span.hasMath;
        span.bbox.draw(canvas, `rgba(${span.hasMath ? 0 : 255},0,0,1)`);
      }
    });
  }
}
