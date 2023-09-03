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
 * @fileoverview Class for a single paragraph.
 *
 * @author himanshu.garg@cse.iitd.ac.in
 */

import { Component } from '../utility/components';
import { Line } from '../core/line';
import Dokument from '../core/dokument';
import log from 'loglevel';
import { Characteristics } from '../global/characteristics';

export class Paragraph {
  /**
   * Paragraphs are also outlined in blue.
   * @override
   */
  private static count = 0;

  public html: HTMLElement;

  public lines = new Map<string, Line>();

  public id: string;

  /**
   * Make a paragraph from a list of Lines.
   */
  constructor(id?: string) {
    if (id) {
      this.id = id;
    } else {
      this.id = `paragraph${Paragraph.count++}`;
    }
  }

  /**
   * Create a paragraph corresponding to the specified id from:
   *
   * @param json the full dokument json
   * @param id the paragraph to create the object for
   * @param dokument the Dokument object to lookup pre-existing line objects
   */
  public static fromJson(json: any, id: string, dokument: Dokument): Paragraph {
    const p = new Paragraph(id);

    json.lines.map((li: any) => {
      // first find the page that contains the line
      const page = Array.from(dokument.pages.values()).find((p) =>
        p.lines.has(li)
      );
      // console.log('LIIIIIIIII ------> ', li);

      // then refer to that line for this paragraph
      p.lines.set(li, page.lines.get(li));
    });
    return p;
  }

  private contains(next: Component, _d: number): boolean {
    const [last] = Array.from(this.lines.values()).slice(-1);
    // See if the line's parents are roughly the same size
    if (
      Math.abs(last.parentW() - next.parentW()) /
        Math.max(last.parentW(), next.parentW()) >
      0.05
    ) {
      return false;
    }

    // Hasn't this paragraph finished - check the last line's end point
    const lastUptoRightMargin =
        (last.parent.bbox.maxX - last.bbox.maxX) / last.parentW() < 0.03,
      // If this is the second line it can be unindented but not others
      newUnindent = (next.bbox.minX - next.parent.bbox.minX) / next.parentW(),
      newUnindentOk = newUnindent <= 0.03;

    log.debug(
      `${last.id}-${last.parent.id} + ${next.id}-${next.parent.id}: ${lastUptoRightMargin} && ${newUnindentOk}`
    );
    return lastUptoRightMargin && newUnindentOk;
  }

  /**
   * Find paragraphs from lines of the dokument
   * @param doc the dokument object
   * @param characteristics short for dokument characteristics
   */

  public static match(
    doc: Dokument,
    characteristics: Characteristics
  ): Dokument {
    const unmatched = new Map<string, Line>();
    doc.pages.forEach((page) => {
      characteristics.singleLineSpacing += page.betweenLineDistance();
      page.getSortedLines().forEach((l) => {
        unmatched.set(l.id, l as Line);
      });
    });
    characteristics.singleLineSpacing /= doc.pages.size;
    if (unmatched.size == 0) {
      return doc;
    }

    let it = unmatched.values();
    let next = it.next();
    while (!next.done) {
      // take the next line as the first of a new paragraph
      const p: Paragraph = new Paragraph();
      p.lines.set(next.value.id, next.value);

      // and check unmatched lines if they belong to together
      next = it.next();
      while (
        !next.done &&
        !p.lines.has(next.value.id) &&
        p.contains(next.value, characteristics.singleLineSpacing)
      ) {
        log.debug(`added ${next.value.id} to ${p.id}`);
        p.lines.set(next.value.id, next.value);
        next = it.next();
      }
      log.debug(`matched ${p.id} with ${p.lines.size} lines`);
      doc.elements.set(p.id, p);

      // remove lines that just found a paragraph
      p.lines.forEach((v, k) => unmatched.delete(k));

      // re-init the iterator
      it = unmatched.values();
      next = it.next();
    }
    return doc;
  }
  /**
   * @param
   * @param
   * @return
   */
  public toHtml(_p: HTMLElement = null, maxTract = true): Promise<void> {
    this.html = document.createElement('p');
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
   * This function will add paragraph details into json object
   * @returns Json object
   */

  public json() {
    const json = {
      id: this.id,
      lines: Array.from(this.lines.keys())
    };
    return json;
  }
}
