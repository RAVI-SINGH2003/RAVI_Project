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
 * @fileoverview Methods to clean the intial document.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Util } from './utils';

/**
 * Cleans a pdf2htmlEX document. Note, that it will likely fail on other
 * documents.
 * @param {HTMLDocument} document The document to clean.
 *
 * @return {Promise<(HTMLElement|HTMLDocument)[]>} A promise with the will
 * resolve into three values: The cleaned document, the page and the background
 * image. Note, that he document body will be empty.
 */
export default function cleanDocument(
  document: HTMLDocument
): Promise<(HTMLElement | HTMLDocument)[]> {
  removeScripts(document);
  cleanStyles(document);
  document.body.style.transform = `scale(1/${Util.scaleb})`;
  return removeUnused(document);
}

// TODO: More commenting!

function removeScripts(document: HTMLDocument) {
  const scripts = Array.from(document.scripts);
  for (const script of scripts) {
    const html = script.innerHTML.replace(/\s/g, '');
    if (html) {
      Util.removeNode(script);
    }
  }
}

function cleanStyles(document: HTMLDocument) {
  // We need parts of 0 and all of 2.
  const sheet0 = document.styleSheets[0] as CSSStyleSheet,
    sheet2 = document.styleSheets[2] as CSSStyleSheet;
  cleanStyle(sheet0);
  cleanStyle(sheet2);
}

// eslint-disable-next-line func-style
function cleanStyle(sheet: CSSStyleSheet) {
  const rules = sheet.cssRules,
    remove: number[] = [];
  for (const pos of Object.keys(rules)) {
    const index = parseInt(pos),
      rule = rules[index];
    // eslint-disable-next-line no-extra-parens
    if (
      ((rule as CSSStyleRule).selectorText &&
        // eslint-disable-next-line no-extra-parens
        (rule as CSSStyleRule).selectorText.match(/^#/)) ||
      // eslint-disable-next-line no-extra-parens
      (rule as CSSMediaRule).media
    ) {
      remove.push(index);
    }
  }
  while (remove.length) {
    sheet.deleteRule(remove.pop());
  }
}

function removeUnused(
  document: HTMLDocument
): Promise<(HTMLElement | HTMLDocument)[]> {
  return new Promise((ok, _fail) => {
    const foreground = document.getElementsByClassName('pc')[0],
      background =
        foreground.getElementsByClassName('bi')[0] ||
        document.createElement('img');
    if (foreground) {
      ok([foreground, background]);
    } else {
      const listener = () => ok([foreground, background]);
      document.defaultView.addEventListener('load', listener, true);
      document.defaultView.addEventListener('DOMContentLoaded', listener, true);
    }
  }).then(([foreground, background]: [HTMLElement, HTMLElement]) => {
    removeLinks(foreground);
    Util.removeNode(foreground.parentElement);
    document.body.appendChild(foreground);
    return [document, foreground, background];
  });
}

function removeLinks(foreground: HTMLElement) {
  Array.from(foreground.getElementsByClassName('l')).forEach(Util.removeNode);
}
