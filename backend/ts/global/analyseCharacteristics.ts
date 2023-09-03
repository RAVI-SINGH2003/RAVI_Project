/*
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
 * @characteristics Class for storing all the characteristics of the document
 *
 * @author nehamjadhav@gmail.com Neha Jadhav
 */
import FrequencyAnalysis from '../utility/freqCalc';
import { Line } from '../core/line';
import { Characteristics } from './characteristics';

export class analyseCharacteristics {
  private frequencyCalculator: FrequencyAnalysis = new FrequencyAnalysis();
  public characteristicsObj: Characteristics = new Characteristics();
  private linesFrmAllPages: Map<number, Map<string, Line>>;

  constructor(
    characteristicsObj: Characteristics,
    linesFrmAllPages: Map<number, Map<string, Line>>
  ) {
    this.linesFrmAllPages = linesFrmAllPages;
    this.characteristicsObj = characteristicsObj;
    this.analyseCharacteristics();
  }

  /**
   * Function calls respective function for assigjing most common values
   */
  private analyseCharacteristics() {
    (this.characteristicsObj.mostCommonFontSize =
      this.mostUsedFontSizeOfPage()),
      (this.characteristicsObj.mostCommonFontFace =
        this.mostUsedFontFaceOfPage()),
      (this.characteristicsObj.mostCommonFontColor =
        this.mostUsedFontColourOfDoc()),
      (this.characteristicsObj.EndPositionOfLineSingleCol =
        this.endOfLineValueSingleCol()),
      (this.characteristicsObj.EndPositionOfLineDoubleCol =
        this.endOfLineValueSingleCol()),
      (this.characteristicsObj.thresholdOfLineDiff = this.calLineDist()),
      (this.characteristicsObj.mostCommonTextLineHeight =
        this.mostCommonTextlineHeight());
  }
  /**
   * Function uses lines from the document, gets font sizes per line
   * All font sizes are used to check most used font size
   * @returns Most common font size
   */
  public mostUsedFontSizeOfPage() {
    const allFontSizes: number[] = [];
    this.linesFrmAllPages.forEach((x) => {
      x.forEach((y) => {
        y._spans.forEach((z) => {
          allFontSizes.push(
            parseFloat(
              z.html.attributes.getNamedItem('has-fontsize').value.slice(0, -2)
            )
          );
        });
      });
    });
    return this.frequencyCalculator.countNumberFre(allFontSizes.sort(), 1)
      .highestFreqNum; // 1px is combine clusters threshold
  }
  /**
   * Function uses lines from the document, gets font faces per line
   * All font faces are used to check most used font face
   * @returns Most common font face
   */
  public mostUsedFontFaceOfPage() {
    const allFontFaces: string[] = [];
    this.linesFrmAllPages.forEach((x) => {
      x.forEach((y) => {
        y._spans.forEach((z) => {
          allFontFaces.push(
            z.html.attributes.getNamedItem('class').value.match(/ff../)[0]
          );
        });
      });
    });
    return this.frequencyCalculator.countStringFre(allFontFaces);
  }
  /**
   * Function uses lines from the document, gets font colour per line
   * All font colours are used to check most used font colour
   * @returns Most common font colour
   */
  public mostUsedFontColourOfDoc() {
    const allFontColour: string[] = [];
    this.linesFrmAllPages.forEach((x) => {
      x.forEach((y) => {
        y._spans.forEach((z) => {
          if (
            z.html.attributes.getNamedItem('class').value.match(/fc../) != null
          ) {
            allFontColour.push(
              z.html.attributes.getNamedItem('class').value.match(/fc../)[0]
            );
          }
        });
      });
    });
    return this.frequencyCalculator.countStringFre(allFontColour);
  }
  /**
   * Function uses lines from the document, gets end of lines
   * @returns Avg end of line for single column document
   */
  public endOfLineValueSingleCol() {
    const allLinesX: number[] = [];
    this.linesFrmAllPages.forEach((page) => {
      page.forEach((line) => {
        allLinesX.push(line.bbox.maxX);
      });
    });
    return this.frequencyCalculator.countNumberFre(allLinesX, 10)
      .highestFreqNum; // 10px combine threshold can be changed to avg glyph width
  }
  /**
   * Function uses lines from the document, gets font colour per line
   * @returns Avg end of line for double column document
   */
  public endOfLineValueDoubleCol() {
    const allLinesX: number[] = [];
    this.linesFrmAllPages.forEach((page) => {
      page.forEach((line) => {
        allLinesX.push(line.bbox.maxX);
      });
    });
    return this.frequencyCalculator.countNumberFre(allLinesX, 10)
      .secondHightestFreNum; // 10px combine threshold can be changed to avg glyph width
  }
  /**
   * Function uses all lines from the document and stores line differences
   * Frequency calculator check for mostly observed difference
   * @returns Avg distance between two lines
   */
  public calLineDist(): number {
    const LinesY: Map<string, number[]> = new Map<string, number[]>(),
      allLineDIff: number[] = [];
    this.linesFrmAllPages.forEach((page) => {
      page.forEach((line) => {
        LinesY.set(line.id, [line.bbox.minY, line.bbox.maxY]);
      });
    });
    // Calculate all line diff
    for (let i = 0; i < LinesY.size; i++) {
      if (
        LinesY.get(`line${i}`) != undefined &&
        LinesY.get(`line${i + 1}`) != undefined &&
        LinesY.get(`line${i}`) != null &&
        LinesY.get(`line${i + 1}`) != null
      ) {
        const line1 = Object.values(LinesY.get(`line${i}`)),
          line2 = Object.values(LinesY.get(`line${i + 1}`));
        if (line2[0] > line1[1]) {
          allLineDIff.push(line2[0] - line1[1]);
        }
      }
    }
    return this.frequencyCalculator.countNumberFre(allLineDIff, 1)
      .highestFreqNum; // 1 px combine threshold
  }
  /**
   * This function calculates most common textline height in the document
   * @returns Most common textline height
   */
  public mostCommonTextlineHeight(): number {
    const allLineHeights: number[] = [];
    this.linesFrmAllPages.forEach((page) => {
      page.forEach((line) => {
        allLineHeights.push(line.bbox.height());
      });
    });
    return this.frequencyCalculator.countNumberFre(allLineHeights, 1)
      .highestFreqNum;
  }
}
