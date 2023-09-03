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
 * @fileoverview Builder pattern for images and SVGs.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Util } from '../utility/utils';

export default class ImageBuilder {
  private svgStart = '';

  private svgEnd = '</html></foreignObject></svg>';

  private sheet0: string;

  private sheet1: string;

  constructor(
    private document: HTMLDocument,
    public width: number,
    public height: number
  ) {
    this.start();
  }

  private start() {
    const sheet0 = this.document.styleSheets[0] as CSSStyleSheet;
    this.sheet0 = Util.styleSheetString(sheet0);
    const sheet1 = this.document.styleSheets[2] as CSSStyleSheet;
    this.sheet1 = Util.styleSheetString(sheet1);
    this.svgStart = "<svg xmlns='http://www.w3.org/2000/svg' ";
    this.svgStart += `width='${this.width}px' `;
    this.svgStart += `height='${this.height}px'>`;
    this.svgStart += "<foreignObject width='100%' height='100%'>";
    this.svgStart += "<html xmlns='http://www.w3.org/1999/xhtml'>";
  }

  private createSvg(html: string, hidden: boolean) {
    const sheet0 = hidden
      ? `span.hidden { visibility: hidden}${this.sheet0}`
      : this.sheet0;
    return (
      `${this.svgStart}<style type='text/css'>${sheet0}</style>` +
      `<style type='text/css'>${this.sheet1}</style>${html}${this.svgEnd}`
    );
  }

  /**
   * Creates an image from the current SVG.
   * @return {HTMLElement} The HTML element with the image.
   */
  public img(html: string, hidden = true): HTMLImageElement {
    const svg = this.createSvg(html, hidden),
      img = this.document.createElement('img');
    img.setAttribute('src', `data:image/svg+xml,${svg}`);
    return img;
  }
}
