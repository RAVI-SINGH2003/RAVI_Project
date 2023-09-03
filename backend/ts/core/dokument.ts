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
 * @fileoverview Class for a document consisting of 1 or more pages
 * @author himanshu.garg@cse.iitd.ac.in
 */
import Page from './page';
import Image from './image';
import { Line } from './line';
import { Paragraph } from '../paragraph/paragraph';
import { ItemList } from '../list/ItemlistClass';
import { Heading } from '../heading/headings';
import { Util } from '../utility/utils';
import log from 'loglevel';
import colDetect from '../column/columnDetect';
import math from '../math/math';
import WatermarkAnalysis from '../watermark/watermark_analysis';
import header_footer from '../headerfooter/header_footer_detection_new';
import { Caption } from '../caption/caption';
import { Table } from '../table/table';
import { Table_Algos } from '../table/table_algos';

import { Characteristics } from '../global/characteristics';
import { analyseCharacteristics } from '../global/analyseCharacteristics';
import { Console } from 'console';
// import image from './image';

type Environment = {
  backendBaseUrl: string;
};

declare global {
  const environment: Environment;
}

export default class Dokument {
  public pages: Map<string, Page> = new Map<string, Page>();

  public elements = new Map<
    string,
    Heading | Paragraph | ItemList | Caption | Table | Image
  >();

  public promise: Promise<void> = null;

  public characteristicsAnalyzer: analyseCharacteristics = null;

  public header_footer_obj: header_footer = null;

  public width = 0;

  public height = 0;
  public mathDetector: math = null;

  public imageScaler: Image = null;

  public columnDetector: colDetect = null;

  private watermarkAnalyser: WatermarkAnalysis = null;

  private characteristics: Characteristics = new Characteristics();

  public unmatched: Map<string, Line>;

  public object_detect_bbox_to_spans_inline: Map<
    number,
    Map<number, string[]>
  > = new Map<number, Map<number, string[]>>();

  public object_detect_bbox_to_spans_display: Map<
    number,
    Map<number, string[]>
  > = new Map<number, Map<number, string[]>>();

  /**
   * Document constructor is used to set pages with ids
   * @param start Variable to mark first page of the file
   * @param end Variable to mark last page of the file
   * @param headless
   * @param dbg Used to set debug mode on and off
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor() {}

  public static fromHtml(
    start = 0,
    end = Infinity,
    /* headless = true ,*/ dbg = true
  ): Dokument {
    const pageElementCollection = document.getElementsByClassName('pc'),
      pageElements: HTMLElement[] = [];
    console.log('DOCUMENT ANALYSIS STARTED...');
    start = start < 0 ? 0 : start;
    end =
      end > pageElementCollection.length ? pageElementCollection.length : end;
    for (let i = start; i < end; i++) {
      pageElements.push(pageElementCollection[i] as HTMLElement);
    }
    if (dbg) {
      log.setLevel('debug');
    } else {
      log.setLevel('info');
    }
    const dokument = new Dokument();
    dokument.promise = pageElements.reduce(
      (promise, page, i) =>
        promise.then(() => {
          const id = `page${i}`,
            p = Page.fromHtml(id, page);
          dokument.pages.set(p.id, p);
          log.info(`${id} of ${pageElements.length}`);
          return p.promise;
        }),
      Promise.resolve()
    );
    dokument.promise.then(() => {
      dokument.characteristics.pagesSize = dokument.pages.size;
    });
    return dokument;
  }

  /**
   * Remove pdf2htmlEx artifacts that we no longer need and
   * prefix with MathJax loading
   */
  public cleanDocument() {
    Util.removeNode(document.getElementById('sidebar'));
    Util.removeNode(document.getElementById('page-container'));
    Util.removeNode(document.getElementsByClassName('loadingIndicator')[0]);
    Util.removeNode(document.getElementsByTagName('div')[0]);
    Util.removeNode(document.getElementsByTagName('script')[0]);
    for (const c of Array.from(document.getElementsByTagName('canvas'))) {
      Util.removeNode(c);
    }
    for (const s of Array.from(document.getElementsByTagName('style'))) {
      Util.removeNode(s);
    }

    document.head.innerHTML = `${document.head.innerHTML}
        <link rel="stylesheet" href="./scripts/style.css"></link>
        <link rel="stylesheet" href="./../../../../../scripts/style.css"></link>
        <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
        <script id="MathJax-script" async src="./../../scripts/tex-mml-chtml.js"></script>
        <script>
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']]
          }
        };
        </script>
        `;
  }

  /**
   * @returns result obejct with no of columns and gutter width
   * between the columns.
   */
  public columnDetection(this: Dokument, characteristicsObj: Characteristics) {
    this.characteristics.numOfColumns = characteristicsObj.numOfColumns;
    console.log('COLUMN DETECTION RUNNING...');
    const foreDis = this.showFore();
    return foreDis.then(() => {
      this.columnDetector = new colDetect();
      return this.columnDetector.col_detect(this, this.characteristics);
    });
  }

  /**
   * runs math detection
   * @param math_json inferred maths bounding boxes from object detection module for all the pages in document in JSON format
   */

  public mathDetection(math_json: string) {
    console.log('MATH DETECTION RUNNING...');
    this.mathDetector = new math(this.pages, this);
    const math_detected = this.mathDetector.run_math_detection(math_json);
    this.object_detect_bbox_to_spans_inline = math_detected[0];
    this.object_detect_bbox_to_spans_display = math_detected[1];
  }

  /**
   * runs insert_image detection
   * @param math_json inferred maths bounding boxes from object detection module for all the pages in document in JSON format
   */

  public imageInsertion(image_json: string) {
    console.log('IMAGE INSERTION RUNNING...');
    this.imageScaler = new Image(image_json, this);
    this.imageScaler.HTML_image_maker(image_json, this);
  }

  /**
   * Detecting and mapping of captions with their respective objects i.e. image/table
   * @param identifier This has an array of all caption keyword identifiers
   * @param note Constant variable string with value 'note'
   * @param threshold_near_glyph Threshold values for glyphs
   * @param threshold_near_line Threshold values for line
   * @returns captionDetection function for each page
   */
  public captionDetection() {
    console.log('CAPTION DETECTION RUNNING...');
    const pages = Array.from(this.pages.values());
    return pages.reduce(
      (promise, page) => promise.then(() => page.objectMap()),
      this.promise
    );
  }

  /**
   * This function helps to display both foreground and background together
   * @returns Pages' content
   */
  public showPage() {
    const pages = Array.from(this.pages.values());
    pages.forEach((page) => page.showPage());
    return pages.reduce(
      (promise, page) => promise.then(() => page.showPage()),
      this.promise
    );
  }
  /**
   * function page is cropped to get the Complete images of the
   * captions for placement in the final html
   * @returns promise once all boxes are drawn around captions
   */
  public draw_object_box() {
    const pages = Array.from(this.pages.values());
    return pages.reduce(
      (promise, page) => promise.then(() => page.draw_object_box()),
      this.promise
    );
  }

  /**
   * Function checks background pixels and use connecting components
   * @returns Promise pagewise once background pixels are processed and
   * drawn on the canvas
   */
  public backgroundAnalysis() {
    console.log('BACKGROUND ANALYSIS STARTED...');
    const pages = Array.from(this.pages.values());
    return pages.reduce(
      (promise, page) => promise.then(() => page.backgroundAnalysis()),
      this.promise
    );
  }
  /**
   * Function will detect radical symbol from the background
   */
  public bringMeSymbols() {
    const pages: Page[] = Array.from(this.pages.values());
    for (const p of pages) {
      p.symbolDetector();
    }
  }

  /**
   * Function to get gray scale pixel array of the backgound
   * images of the page
   */
  public displayGrayscale() {
    const pages: Page[] = Array.from(this.pages.values());
    for (const p of pages) {
      p.getGrayScale();
    }
  }

  /**
   * Function put all the foreground information only on the canvas
   * @returns Promise returns once foreground for all pages are drawn
   *
   */
  public showFore() {
    const pages = Array.from(this.pages.values());
    pages.forEach((page) => page.showFore());
    return pages.reduce(
      (promise, page) => promise.then(() => page.showFore()),
      this.promise
    );
  }

  /**
   * Function helps to draw lines around textlines of the foreground
   * @returns Promise returns when lines are drawn on all pages
   */
  public drawLines() {
    const pages = Array.from(this.pages.values());
    return pages.reduce(
      (promise, page) => promise.then(() => page.drawLines(true)),
      this.promise
    );
  }

  /**
   * Function analyse document page-wise for table detection
   * @returns Promise returns doc with table on demand
   */
  public tableDetection() {
    if (this.characteristics.tablePresence) {
      console.log('TABLE_DETECTION RUNNING');
      Table_Algos.match(this, this.characteristics);
    }
  }

  /**
   * Function returns lines after analysing spans
   * @returns Promise returns text lines in the Line data structure
   */
  public linify() {
    const pages = Array.from(this.pages.values());
    return pages
      .reduce(
        (promise, page) =>
          promise.then(() => {
            page.linify();
          }),
        this.promise
      )
      .then(() => {
        pages.forEach((page) => {
          /**
           * Function calls pagewise function for concating all spans’ html
           * attribute innerText and assigning as line’s html attribute innerText.
           * @returns promise after putting innerText in respective Line
           */
          page.lines_textify();
        });
      });
  }

  /**
   * Function removes the watermark from background of every page
   */
  public removeWatermark() {
    const baseURI = document.documentURI,
      path_json = `${baseURI.substring(
        0,
        baseURI.lastIndexOf('/')
      )}/bg_info.json`;
    this.checkWatermarkExistance(path_json);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const jarr = fetch(path_json)
      .then((response) => {
        if (!response.ok) {
          const err = `${path_json}: ${response.status}, ${response.statusText}`;
          throw err;
        }
        return response.json();
      })
      .then((data) => {
        this.watermarkAnalyser = new WatermarkAnalysis(this.pages, data);
        this.watermarkAnalyser.remove();
        return data;
      });
  }

  /**
   * Function checks if watermark file is present at the mentioned location
   * @param filepath This is the file where watermark box coordinates are stored
   */
  public checkWatermarkExistance(filepath: string) {
    const request = new Request(filepath),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      response = fetch(request)
        .then((response) => {
          if (response.status == 200) {
            this.characteristics.watermarkPresence = true;
          } else {
            this.characteristics.watermarkPresence = false;
          }
        })
        .catch(() => {
          this.characteristics.watermarkPresence = false;
        });
  }

  /**
   * This is document level function which calculates all the characteristics
   * for the document related to fonts, line height, most common characteristics
   * within the document.
   */
  public analyseCharacteristics() {
    const pages = Array.from(this.pages.values());
    const allLines = new Map<number, Map<string, Line>>();
    pages.forEach((p, i) => {
      allLines.set(i, p.lines);
    });
    this.characteristicsAnalyzer = new analyseCharacteristics(
      this.characteristics,
      allLines
    );
    this.characteristics = this.characteristicsAnalyzer.characteristicsObj;
  }

  /**
   * Check the next unmatched line(s) to see if a Heading, ListItem,
   * or Paragraph in that order using the corresponding match fun
   * remove all lines included inside image as line glyphs
   */
  public match() {
    console.log('Characteristics object: ', this.characteristicsAnalyzer);
    Paragraph.match(this, this.characteristics);
    Heading.match(this, this.characteristics);
    ItemList.match(this);
    // TODO - restore modules one by one
    // this.heading = new Heading(lines);
    // // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // this.heading.getHeadingsFromWholeDoc(unmatched);

    // Caption.line_glyphs_all.forEach((line) => unmatched.delete(line.id));
    // while (unmatched.size > 0) {
    //   const h = this.heading.match(unmatched);
    //   if (h) {
    //     this.elements.set(h.id, h);
    //     h.lines.forEach((line) => unmatched.delete(line.id));
    //   } else {
    //     const l = ItemList.match(unmatched, d);
    //     if (l) {
    //       this.elements.set(l.id, l);
    //       // Caption.match(l, this.elements, unmatched);
    //       l.lines.forEach((line) => unmatched.delete(line.id));
    //     } else {
    //       this.unmatched = unmatched;
    //       this.characteristics.singleLineSpacing = d;
    //       log.debug(`Unmatched before: ${this.elements.size}`);
    //       let elementSize = this.elements.size;
    //       log.debug(`Unmatched after: ${this.elements.size}`);
    //       // did we match something previously unmatched
    //       if (this.elements.size > elementSize) {
    //         let p = Array.from(this.elements)[this.elements.size-1][1] as Paragraph ;
    //         this.paragraphs_textify(p);
    //         Caption.match(p, this.elements, unmatched);
    //         p.lines.forEach((line) => unmatched.delete(line.id));
    //       } else {
    //         log.error(`could not match ${unmatched.size} lines`);
    //         break;
    //       }
    //     }
    //   }
    // }

    //to be checked after restructuring
    /*  
    this.promise = pages
      .reduce(
        (promise, page) =>
          promise.then(() => {
            log.info('Matching page parts');
            return page.match().then(() => {
              d += page.betweenLineDistance();
              page.sortedLines.forEach((l) => {
                unmatched.set(l.id, l as Line);
              });
            });
          }),
        this.promise
      )
      .then(() => {
        d /= pages.length;
        log.info(`${unmatched.size} lines to match`);
        unmatched = this.header_footer_detection(unmatched);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const allHeadings = Heading.headingDetection(this.characteristics,unmatched);

        Caption.line_glyphs_all.forEach((line) => unmatched.delete(line.id));
        while (unmatched.size > 0) {
          const h = Heading.match(unmatched);
          if (h) {
            this.elements.set(h.id, h);
            h.lines.forEach((line) => unmatched.delete(line.id));
          } else {
            const l = ItemList.match(unmatched, d);
            if (l) {
              this.elements.set(l.id, l);
              // Caption.match(l, this.elements, unmatched);
              l.lines.forEach((line) => unmatched.delete(line.id));
            } else {
              const p = Paragraph.match(unmatched, d);
              if (p) {
                this.paragraphs_textify(p);
                this.elements.set(p.id, p);
                Caption.match(p, this.elements, unmatched);
                p.lines.forEach((line) => unmatched.delete(line.id));
              } else {
                log.error(`could not match ${unmatched.size} lines`);
                break;
              }
            }
          }
        }
      }); */
    return this.promise;
    /*return this.promise
      .then(() => Paragraph.match(this, this.characteristics))
      .then(() => Heading.match(this, this.characteristics))
      .then(() => Table.match(this, this.characteristics));*/
  }

  /**
   * Function copies text from span to paragraph innertext
   * @param p is paragraph component of HTML
   */
  public paragraphs_textify(p: Paragraph) {
    let s = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key1, value1] of p.lines) {
      s += value1.html.innerText;
    }
    if (s == '') {
      console.log('please run lines_textify() in document.ts first...');
    } else {
      p.html.innerText = s;
      p.html.innerHTML = s;
    }
  }

  /**
   * Function takes all components and append to output HTML body
   * @param maxTract True value of the variable sends code to math system
   * @returns Returns promise when output HTML is generated
   */
  public toHtml(maxTract = true) {
    const allComponents = Array.from(this.elements.values());

    //c --> currentValue
    return allComponents.reduce(
      (promise, c) =>
        promise.then(() =>
          c.toHtml(null, maxTract).then(() => document.body.appendChild(c.html))
        ),
      this.promise
    );
  }

  /**
   * Function places images at the respctive location
   * position the image below the caption text else above the caption text
   */
  // public ImagestoHtml() {
  //   this.promise = this.promise.then(() => {
  //     const c_all = Caption.getcaptions();
  //     console.log("c_all value" , c_all);
  //     for (const [cid, c] of c_all) {
  //       let img = document.createElement('img');
  //       img.id = `Figure${cid.substring(7)}`;
  //       //img.setAttribute('src', c.image_canvas.tourl());
  //       img = c.image;
  //       if ((c.position == 'bottom' || c.position == 'right')) {
  //         if(c.image_canvas){
  //           document.getElementById(cid).appendChild(img);
  //         }
  //       } else if (document.getElementById(cid)) {
  //         const cap = document.getElementById(cid);
  //         cap.parentNode.insertBefore(img, cap);
  //       }
  //     }
  //   });
  //   return this.promise;
  // }

  /**
   * Function removes header footer lines before tagging into meaningful tags
   * @param unmatched Textlines detected from linify functions which are
   * not tagged as para/ list/ heading / header/ footer
   * @returns unmatched lines after removing header footer lines
   */
  public header_footer_detection(
    unmatched: Map<string, Line>
  ): Map<string, Line> {
    console.log('Running header footer detection:');
    this.header_footer_obj = new header_footer(this.pages);
    const headerInfo = this.header_footer_obj.header_check(),
      footerInfo = this.header_footer_obj.footer_check();
    headerInfo.forEach((info) => {
      for (const i of info) {
        unmatched.delete(i[1].id);
      }
    });
    footerInfo.forEach((info) => {
      for (const i of info) {
        unmatched.delete(i[1].id);
      }
    });
    return unmatched;
  }

  /**
   * Function helps to get json information which includes font info
   * @returns Pages along with their JSON information
   */
  public json() {
    return {
      pages: Array.from(this.pages.values()).map((x) => x.json()),
      elements: Array.from(this.elements.values()).map((x) => x.json()),
      inline_math_detected: Array.from(
        this.object_detect_bbox_to_spans_inline.keys()
      ).map((pageNum) => {
        const json1 = {
          pageNum: pageNum,
          math: Array.from(
            this.object_detect_bbox_to_spans_inline.get(pageNum).keys()
          ).map((obj_detect_id) => {
            const json2 = {
              obj_detect_bbox_id: obj_detect_id,
              spans: Array.from(
                this.object_detect_bbox_to_spans_inline
                  .get(pageNum)
                  .get(obj_detect_id)
              )
            };
            return json2;
          })
        };
        return json1;
      }),

      display_math_detected: Array.from(
        this.object_detect_bbox_to_spans_display.keys()
      ).map((pageNum) => {
        const json1 = {
          pageNum: pageNum,
          math: Array.from(
            this.object_detect_bbox_to_spans_display.get(pageNum).keys()
          ).map((obj_detect_id) => {
            const json2 = {
              obj_detect_bbox_id: obj_detect_id,
              spans: Array.from(
                this.object_detect_bbox_to_spans_display
                  .get(pageNum)
                  .get(obj_detect_id)
              )
            };
            return json2;
          })
        };
        return json1;
      })
    };
  }

  /**
   * @param location url to load as json
   */
  public static loadJson(location: string): Promise<Dokument> {
    if (!location) {
      location = window.location.href.replace(/\.html$/, '.json');
    }
    return Util.fetchUrl(location)
      .then((r) => r.json())
      .then((json) => Dokument.fromJson(json));
  }

  /**
   * Create a dokument from the json
   * @param json the json to load this object from
   */
  public static fromJson(json: any): Dokument {
    const dokument = new Dokument();
    json.pages.map((pJson: any /* index: number */) => {
      dokument.pages.set(pJson.id, Page.fromJson(pJson, true));
    });
    json.elements.map((eJson: any /* index: number */) => {
      if (eJson.id.startsWith('paragraph')) {
        dokument.elements.set(
          eJson.id,
          Paragraph.fromJson(eJson, eJson.id, dokument)
        );
      }
    });
    return dokument;
  }

  /**
   * Post the current json to the server. Useful when tagging spans etc. by hand
   * so that the tags are recorded on the server
   */
  public saveJson() {
    Util.post(`${environment.backendBaseUrl}/json`, [
      document.documentURI,
      this.json()
    ]);
  }
}
