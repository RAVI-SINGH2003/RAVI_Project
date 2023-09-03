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
 * @fileoverview Class for image insertion.
 *
 */

/**  Author : Denish Ahuja
 *    email : idenishahuja@gmail.com
 */

/**
 * issue : line441 is not detected in any element with the help of loop hence in pdf bio chapter one the img_13_1 is placed at top.
 */

import Page from './page';
import Canvas from '../utility/canvas';
import Dokument from './dokument';
import { Line } from './line';

export default class Image {
  public lines = new Map<string, Line>();
  public images = new Map<string, Image>();
  public imagePlacement = new Map<string, string>();
  public html: HTMLImageElement;
  public id: string;
  public canvas: Canvas;
  public height: number;
  public width: number;
  public heightRatio: number;
  public widthRatio: number;
  public imgPath: string;
  public name: string;
  public parsedJson: any = null;
  public pageNumber: number;
  public pages: Map<string, Page> = new Map<string, Page>();
  public dokument: Dokument = null;
  public x1: number;
  public y1: number;
  public x2: number;
  public y2: number;
  public pageFirstLineList = new Map<string, string>();

  constructor(image_json: string, dokument: Dokument) {
    this.dokument = dokument;
    this.pages = dokument.pages;
  }

  public HTML_image_maker(image_json: string, doc: Dokument) {
    type finalJSON = {
      page: string;
      imageNumber: string;
      imagePath: string;
      base64data: string;
      imgData: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
      };
      ratio: {
        widthRatio: number;
        heightRatio: number;
      };
    };
    //Json creation
    this.parsedJson = JSON.parse(image_json);
    this.imageScaling();
    this.imageBbox();

    //Iterating each time with image
    this.parsedJson.json.forEach((obj: finalJSON) => {
      const img = new Image(this.parsedJson, this.dokument);
      img.html = document.createElement('img');
      let k = obj.imagePath;
      // we are using imagePath as a key for the map as it should be unique
      // l contains the line_id interpreted for the image
      let l = this.imagePlacement.get(k);
      const mapArray = Array.from(doc.elements);
      //iterating over each element which is element map in dokument.ts contains heading,paragraphs,itemlist,images,etc..
      doc.elements.forEach((element) => {
        console.log('ELEMENT__ID : ', element.id);
        if (element.id) {
          // we need to check whether the element_id exist or not
          //if element_id exist then we iterate over all the lines present in the element and check if it matches with the line_id of the image
          // replacing the line id from element_id in imagePlacement map
          element.lines.forEach((line) => {
            if (line.id === l) {
              this.imagePlacement.set(k, element.id);
            }
          });
        }
      });
      img.html.src = obj.base64data;
      img.html.alt = '';
      img.html.id = 'p_' + obj.page + 'img_num' + obj.imageNumber;

      //inserting the image at the next index of the element_id founded
      const insertionIndex = mapArray.findIndex(
        ([key]) => key === this.imagePlacement.get(k)
      );
      mapArray.splice(insertionIndex + 1, 0, [this.imagePlacement.get(k), img]);

      doc.elements = new Map(mapArray);

      this.imagePlacement.forEach((value: string, key: string) => {
        console.log('k : ', k, 'LINE__ID : ', this.imagePlacement.get(k));
      });
    });

    this.images.forEach((value: Image, key: string) => {
      doc.elements.set(value.html.id, value);
      console.log('kkkkkkeeeyyyyyy : ', key, value.html.src);
    });

    doc.elements.forEach((element) => {});
  }

  // identifying the element id for placing the image in Map
  public imageBbox() {
    type finalJSON = {
      page: string;
      imageNumber: string;
      imagePath: string;
      base64data: string;
      imgData: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
      };
      ratio: {
        widthRatio: number;
        heightRatio: number;
      };
    };

    this.parsedJson.json.forEach((obj: finalJSON) => {
      let x = 0; //index to use index of pageFirstLineList
      let pageNum = obj.page;
      let maxVal = obj.imgData.y1;
      let allPages = Array.from(this.pages.values());
      let page = allPages[Number(pageNum) - 1];
      let alllines = Array.from(page.lines.values());

      //iterating over the all the lines present in the page in which image is present
      for (let j = 0; j < alllines.length; j++) {
        let line = alllines[j];
        //adding first line of each page in pageFirstLineList
        if (line.id && j === 0) {
          this.pageFirstLineList.set(obj.imagePath, line.id);
        }
        //checking if image is present below the line then store it
        if (maxVal >= line.bbox.box()[1]) {
          this.imagePlacement.set(obj.imagePath, line.id);
        } else break;
      }
      //if there is no line above the image it means it is present at the top of the page so we can place above the first line of the page.
      if (!this.imagePlacement.get(obj.imagePath)) {
        this.imagePlacement.set(
          obj.imagePath,
          this.pageFirstLineList.get(obj.imagePath)
        );
      }
    });
  }

  //Calculate the image's bbox based on the canavas width and height
  public imageScaling() {
    let allPages = Array.from(this.pages.values());

    for (let i = 0; i < allPages.length; i++) {
      let page = allPages[i];
      let alllines = Array.from(page.lines.values());
      for (let j = 0; j < alllines.length; j++) {
        let line = alllines[j];

        // if want to see the bbox for each line
        // console.log(
        //   'LINE BBOx FROM IMAGE.TS --->',
        //   line.bbox.box().toString(),
        //   'Line_Id --> ',
        //   line.id
        // );
      }
    }
    type imageObject = {
      page: string;
      imageNumber: string;
      imagePath: string;
      base64data: string;
      imgData: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
      };
      scaleFactor: {
        scaleWidth: number;
        scaleHeight: number;
      };
    };

    type finalJSON = {
      page: string;
      imageNumber: string;
      imagePath: string;
      base64data: string;
      imgData: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
      };
      ratio: {
        widthRatio: number;
        heightRatio: number;
      };
    };
    let list: imageObject[] = [];
    this.parsedJson.json.forEach((obj: finalJSON) => {
      list.push({
        page: obj.page,
        imageNumber: obj.imageNumber,
        imagePath: obj.imagePath,
        base64data: obj.base64data,
        imgData: {
          x1: allPages[Number(obj.page) - 1].canvas.width * obj.imgData.x1,
          x2: allPages[Number(obj.page) - 1].canvas.width * obj.imgData.x2,
          y1: allPages[Number(obj.page) - 1].canvas.height * obj.imgData.y1,
          y2: allPages[Number(obj.page) - 1].canvas.height * obj.imgData.y2
        },
        scaleFactor: {
          scaleWidth:
            allPages[Number(obj.page) - 1].canvas.width * obj.ratio.widthRatio,
          scaleHeight:
            allPages[Number(obj.page) - 1].canvas.height * obj.ratio.heightRatio
        }
      });
    });
    this.parsedJson.json = [...list];
  }
  /**
   * This function helps to create HTML element from image object
   * @param p
   * @returns Promise returns when element is appended to the HTML
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  //its not doing anyhting but needed as it is called by the elements from the dokument.ts so it not give any error
  public toHtml(p: HTMLImageElement = null, maxTract = true) {
    const children = Array.from(this.images.values());
    return children.reduce(
      (promise, x) =>
        promise.then(() =>
          x.toHtml(this.html, maxTract).then(() => {
            // if (!this.html.innerText.endsWith('-')) {
            //   this.html.appendChild(document.createTextNode(' '));
            // }
          })
        ),
      Promise.resolve()
    );
  }
  public json() {
    const json = {
      id: '7878',
      src: 'hdjahdj'
    };
    return json;
  }
}
