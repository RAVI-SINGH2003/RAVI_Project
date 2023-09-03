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
 * @headingAnalysis Class for a detecting headings for a document
 * @author nehamjadhav@gmail.com Neha Jadhav
 */

import Dokument from '../core/dokument';
import { Line } from '../core/line';
import {stringCompare} from '../utility/lineStringFunction';
import log from 'loglevel';
import { Characteristics } from '../global/characteristics';
import { Paragraph } from '../paragraph/paragraph';
import { Caption } from '../caption/caption';
export class Heading {
  private static count = 0;

  public html: HTMLElement;

  public lines = new Map<string, Line>();

  public id: string;

  public static stringCompareCalc: stringCompare = null;

  public static fontSizeGrtThresholdEqual: number[] = [];

  /**
   * Make a heading from a line.
   */
  constructor(id?: string, level = 1) {
    if (id) {
      this.id = id;
    } else {
      this.id = `heading${Heading.count++}`;
    }
    this.html = document.createElement(`h${level}`);
  }
  /**
   * Finds heading from the paragraphs of the document
   * @param doc the dokument object
   * @param characteristics short for dokument characteristics
   */
  public static match(
    doc: Dokument,
    characteristics: Characteristics
  ): Dokument {
    let headingCont = false;
    doc.elements.forEach((element) => {
      const headingElementIds: string[] = [];
      if (
        Heading.headingDetection(
          characteristics,
          element.lines as Map<string, Line>
        ) &&
        element.id.includes('paragraph') // Only paragraphs will be passed for heading
      ) {
        let currElement = element.id;
        do {
          headingElementIds.push(currElement);
          const nextPara: Paragraph = this.getNextElement(
            doc,
            currElement
          ) as Paragraph;
          if (
            Heading.contHeadingLine(
              characteristics,
              element as Paragraph,
              nextPara
            )
          ) {
            currElement = nextPara.id;
            headingCont = true;
          } else {
            headingCont = false;
          }
        } while (headingCont);
      }
      if (headingElementIds.length !== 0) {
        const heading = new Heading();
        headingElementIds.forEach((elementId) => {
          doc.elements.get(elementId).lines.forEach((line) => {
            heading.lines.set(line.id, line);
          });
          doc.elements.delete(elementId);
        });
        doc.elements.set(heading.id, heading);
      }
    });
    doc.elements = new Map(
      [...doc.elements.entries()].sort((a, b) => {
        if (
          parseInt([...a[1].lines][0][0].slice(4)) <
          parseInt([...b[1].lines][0][0].slice(4))
        )
          return -1;
          console.log("ParseINT value : ",parseInt([...a[1].lines][0][0]));
      })
    );
    return doc;
  }
  /**
   * To check for all lines in the document for heading levels
   * @param lines textual lines present in the document
   * @returns all headings present in the whole document
   */
  public static headingDetection(
    characteristicsObj: Characteristics,
    lines: Map<string, Line>
  ): boolean {
    const linesFromParagraph = Array.from(lines.values());
    for (const line of linesFromParagraph) {
      log.debug(`Heading check: ${line.id}`);
      let tempLineIdProperties: Map<string, string> = new Map<string, string>();
      if (line != undefined || line != null) {
        tempLineIdProperties = this.setTempLineProperties(
          characteristicsObj,
          line,
          lines
        );
      }
      if (characteristicsObj.numOfColumns === 2) {
        if (this.isHeadingTwoColumn(tempLineIdProperties)) {
          return true;
        }
      } else if (this.isHeading(tempLineIdProperties)) {
        console.log('Line: ', line.id, ' : ', tempLineIdProperties);
        return true;
      } else {
        log.debug(`Heading not found: ${line.id}`);
      }
    }
    return false;
  }

  /**
   * This functions helps to return next element during iteration over other elements
   * @param doc Whole document to access its elements
   * @param id id of a current element
   * @returns next element
   */
  public static getNextElement(doc: Dokument, id: string) {
    const tempID = `paragraph${parseInt(id.slice(9)) + 1}`;
    console.log('id ', id, ' tempId ', tempID);
    return doc.elements.get(tempID);
  }
  /**
   * This function will decide onthe level of headings
   * @param
   * @param
   * @returns
   */
  public decideLevelOfHeading() {
    //let fontSizeArray = [...new Set(Heading.fontSizeGrtThresholdEqual)];
    //To DO
  }

  /**
   * This function helps to create HTML element from heading object
   * @param p
   * @param maxTract If Maxtract is true then line will be send to math conversion
   * @returns Promise returns when element is appended to the HTML
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public toHtml(p: HTMLElement = null, maxTract = true) {
    this.html.innerHTML = '';
    this.html.id = this.id;
    const children = Array.from(this.lines.values());
    return children.reduce(
      (promise, x) =>
        promise.then(() =>
          x.toHtml(this.html, maxTract).then(() => {
            if (!this.html.innerText.endsWith('-')) {
              this.html.appendChild(document.createTextNode(' '));
            }
          })
        ),
      Promise.resolve()
    );
  }
  /**
   * Function to check if line is heading or not in single column document
   * @param tempLineProperties Line properties to be analyzed for heading
   * @returns True or false based on properties of the line
   */
  public static isHeading(tempLineProperties: Map<string, string>) {
    if (
      parseInt(tempLineProperties.get('grtThresFontSize')) == 1 &&
      parseInt(tempLineProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineProperties.get('firstAlphabetCapital')) == 1 &&
      parseInt(tempLineProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineProperties.get('endBeforeEndLine')) == 1 &&
      parseInt(tempLineProperties.get('grtLineNextDist')) == 1 &&
      parseInt(tempLineProperties.get('containsKeywords')) != 1
    ) {
      return true;
    } else if (
      parseInt(tempLineProperties.get('otherFontFace')) == 1 &&
      parseInt(tempLineProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineProperties.get('firstAlphabetCapital')) == 1 &&
      parseInt(tempLineProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineProperties.get('endBeforeEndLine')) == 1 &&
      parseInt(tempLineProperties.get('grtLineNextDist')) == 1 &&
      parseInt(tempLineProperties.get('containsKeywords')) != 1
    ) {
      return true;
    } else if (
      parseInt(tempLineProperties.get('otherColour')) == 1 &&
      parseInt(tempLineProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineProperties.get('firstAlphabetCapital')) == 1 &&
      parseInt(tempLineProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineProperties.get('endBeforeEndLine')) == 1 &&
      parseInt(tempLineProperties.get('grtLineNextDist')) == 1 &&
      parseInt(tempLineProperties.get('containsKeywords')) != 1
    ) {
      return true;
    }
    return false;
  }
  /**
   * Function to check if line is heading or not in two column document
   * @param tempLineProperties Line properties to be analyzed for heading
   * @returns True or false based on properties of the line
   */
  public static isHeadingTwoColumn(tempLineProperties: Map<string, string>) {
    if (
      parseInt(tempLineProperties.get('grtThresFontSize')) == 1 &&
      parseInt(tempLineProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineProperties.get('firstAlphabetCapital')) == 1 &&
      parseInt(tempLineProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineProperties.get('grtLineNextDist')) == 1 &&
      parseInt(tempLineProperties.get('containsKeywords')) != 1
    ) {
      return true;
    } else if (
      parseInt(tempLineProperties.get('otherFontFace')) == 1 &&
      parseInt(tempLineProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineProperties.get('firstAlphabetCapital')) == 1 &&
      parseInt(tempLineProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineProperties.get('grtLineNextDist')) == 1 &&
      parseInt(tempLineProperties.get('containsKeywords')) != 1
    ) {
      return true;
    } else if (
      parseInt(tempLineProperties.get('otherColour')) == 1 &&
      parseInt(tempLineProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineProperties.get('firstAlphabetCapital')) == 1 &&
      parseInt(tempLineProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineProperties.get('grtLineNextDist')) == 1 &&
      parseInt(tempLineProperties.get('containsKeywords')) != 1
    ) {
      return true;
    }
    return false;
  }
  /**
   * Next line and previous lines are calculated as per vertical distance
   * And vertical distance is calculated of the current line wrt these lines
   * @param currLine: Line whose distance needs to be calulated with
   * next line and previous line.
   * @returns Vertical difference with previous line and next line
   */
  public static compareVerticalDistWithNeighbour(
    currLine: Line,
    lines: Map<string, Line>
  ) {
    const nextLine: Line = Line.findNextLine(currLine, lines);
    const prevLine: Line = Line.findPrevLine(currLine, lines);
    let nextLineDiff, prevLineDiff;

    if (nextLine != undefined)
      nextLineDiff = nextLine.bbox.minY - currLine.bbox.maxY;
    if (prevLine != undefined)
      prevLineDiff = currLine.bbox.minY - prevLine.bbox.maxY;

    return { nextLineDiff, prevLineDiff };
  }

  /**
   * To check if heading continues in the next line in one column documents
   * @param headingline Heading line properties
   * @param nextline Next line to heading line which needs to be checked
   * @returns True or false heading based on properties of the line
   */

  public static contHeadingLine(
    characteristicsObj: Characteristics,
    currElement: Paragraph,
    nextPara: Paragraph
  ) {
    const headingline = Array.from(currElement.lines.values());
    const nextline = Array.from(nextPara.lines.values());
    let tempLineIdProperties: Map<string, string> = new Map<string, string>();
    tempLineIdProperties = Heading.setTempLineProperties(
      characteristicsObj,
      nextline[0],
      nextPara.lines
    );

    if (
      Line.getLineFontSize(headingline[0]).toString() ==
      tempLineIdProperties.get('fontSize')
    ) {
      if (
        parseInt(tempLineIdProperties.get('grtThresFontSize')) == 1 &&
        parseInt(tempLineIdProperties.get('grtLinePrevDist')) == 1 &&
        parseInt(tempLineIdProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
        parseInt(tempLineIdProperties.get('endBeforeEndLine')) == 1 &&
        parseInt(tempLineIdProperties.get('grtLineNextDist')) == 1
      ) {
        return true;
      } else if (
        parseInt(tempLineIdProperties.get('otherFontFace')) == 1 &&
        parseInt(tempLineIdProperties.get('grtLinePrevDist')) == 1 &&
        parseInt(tempLineIdProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
        parseInt(tempLineIdProperties.get('endBeforeEndLine')) == 1 &&
        parseInt(tempLineIdProperties.get('grtLineNextDist')) == 1
      ) {
        return true;
      } else if (
        parseInt(tempLineIdProperties.get('otherColour')) == 1 &&
        parseInt(tempLineIdProperties.get('grtLinePrevDist')) == 1 &&
        parseInt(tempLineIdProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
        parseInt(tempLineIdProperties.get('endBeforeEndLine')) == 1 &&
        parseInt(tempLineIdProperties.get('grtLineNextDist')) == 1
      ) {
        return true;
      }

      return false;
    }

    return false;
  }
  /**
   * To check if heading continues in the next line in two column documents
   * @param preLineIdProperties Previous line's properties - which is heading
   * @param nextline next line to heading line which needs to be checked
   * @returns True or false heading based on properties of the line
   */
  public static contTwoColHeadingLine(
    characteristicsObj: Characteristics,
    preLineIdProperties: Map<string, string>,
    nextline: Line,
    lines: Map<string, Line>
  ) {
    let tempLineIdProperties: Map<string, string> = new Map<string, string>();
    tempLineIdProperties = Heading.setTempLineProperties(
      characteristicsObj,
      nextline,
      lines
    );
    if (
      parseInt(tempLineIdProperties.get('grtThresFontSize')) ==
        parseInt(preLineIdProperties.get('grtThresFontSize')) &&
      parseInt(tempLineIdProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineIdProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineIdProperties.get('grtLineNextDist')) == 1
    ) {
      return true;
    } else if (
      parseInt(tempLineIdProperties.get('otherFontFace')) == 1 &&
      parseInt(tempLineIdProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineIdProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineIdProperties.get('grtLineNextDist')) == 1
    ) {
      return true;
    } else if (
      parseInt(tempLineIdProperties.get('otherColour')) == 1 &&
      parseInt(tempLineIdProperties.get('grtLinePrevDist')) == 1 &&
      parseInt(tempLineIdProperties.get('noFullStopOrSpSymAtEnd')) == 1 &&
      parseInt(tempLineIdProperties.get('grtLineNextDist')) == 1
    ) {
      return true;
    }

    return false;
  }
  /**
   * This function sets properties for heading evaluation
   * Based on these values it will be decided if it is a heading or not
   * @param line Text line whose properties needs to be set
   * @returns Map with all the properties set for the line
   */
  public static setTempLineProperties(
    characteristicsObj: Characteristics,
    line: Line,
    linesFrmPara: Map<string, Line>
  ): Map<string, string> {
    const tempLineIdProperties: Map<string, string> = new Map<string, string>();
    const stringCompareCalc = new stringCompare();

    if (line != null || line != undefined) {
      tempLineIdProperties.set('lineID', line.id);
      const lineFontSize = Line.getLineFontSize(line);
      const lineFontFace = Line.getLineFontFace(line);
      const lineFontColor = Line.getLineFontColor(line);

      if (lineFontSize - characteristicsObj.mostCommonFontSize > 1) {
        tempLineIdProperties.set('grtThresFontSize', '1');
      } else if (
        Math.round(lineFontSize) == characteristicsObj.mostCommonFontSize
      ) {
        tempLineIdProperties.set('eqToThrshold', '1');
      }
      tempLineIdProperties.set('fontSize', lineFontSize.toString());
      this.fontSizeGrtThresholdEqual.push(lineFontSize);

      if (
        lineFontFace != characteristicsObj.mostCommonFontFace &&
        lineFontSize >= characteristicsObj.mostCommonFontSize
      ) {
        tempLineIdProperties.set('otherFontFace', '1');
      }

      if (lineFontColor != null) {
        if (
          lineFontColor != characteristicsObj.mostCommonFontColor &&
          lineFontSize >= characteristicsObj.mostCommonFontSize
        ) {
          tempLineIdProperties.set('otherColour', '1');
        }
      }

      if (characteristicsObj.numOfColumns == 2) {
        if (line.bbox.maxX < characteristicsObj.EndPositionOfLineDoubleCol) {
          tempLineIdProperties.set('endBeforeEndLine', '1');
        }
      } else if (
        line.bbox.maxX < characteristicsObj.EndPositionOfLineDoubleCol
      ) {
        tempLineIdProperties.set('endBeforeEndLine', '1');
      }

      const Difference = Heading.compareVerticalDistWithNeighbour(
        line,
        linesFrmPara
      );
      if (
        Difference.prevLineDiff > characteristicsObj.thresholdOfLineDiff ||
        Difference.prevLineDiff == undefined
      ) {
        tempLineIdProperties.set('grtLinePrevDist', '1');
      }
      if (
        Difference.nextLineDiff > characteristicsObj.thresholdOfLineDiff ||
        Difference.nextLineDiff == undefined
      ) {
        tempLineIdProperties.set('grtLineNextDist', '1');
      }

      const tempHeadingLine = Line.getLineText(line);
      if (stringCompareCalc.stringStartsWithNo(tempHeadingLine)) {
        tempLineIdProperties.set('startsWithNo', '1');
      }
      if (stringCompareCalc.stringFirstAlphabetCapital(tempHeadingLine)) {
        tempLineIdProperties.set('firstAlphabetCapital', '1');
      }
      if (stringCompareCalc.stringNoFullStopOrSpSymbol(tempHeadingLine)) {
        tempLineIdProperties.set('noFullStopOrSpSymAtEnd', '1');
      }
      tempLineIdProperties.set('value', tempHeadingLine);
      for (const fig of Caption.identifier) {
        if (tempHeadingLine.length >= fig.length) {
          if (
            tempHeadingLine
              .substr(0, fig.length)
              .toLowerCase()
              .localeCompare(fig.toLowerCase()) == 0
          ) {
            tempLineIdProperties.set('containsKeywords', '1');
          } else {
            tempLineIdProperties.set('containsKeywords', '0');
          }
        }
      }
    }

    return tempLineIdProperties;
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
