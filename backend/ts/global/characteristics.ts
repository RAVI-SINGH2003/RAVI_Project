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

export class Characteristics {
  public JsonObj: Map<string, number>;

  // Page related information
  public pagesSize: number;

  public pageWidth: number; // Unit of measurement pixel

  public pageHeight: number; // Unit of measurement pixel

  public pageNumPresence: boolean;

  // Document related information
  public numOfColumns: number;

  public watermarkPresence: boolean;

  public headerPresence: boolean;

  public footerPresence: boolean;

  public figPresence: boolean;

  public captionPresence: boolean;
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  public tablePresence: boolean = true;

  // Font related
  public mostCommonFontSize: number;

  public mostCommonFontFace: string;

  public mostCommonFontColor: string;

  // Text line related position limits for headings

  public EndPositionOfLineSingleCol: number;

  public EndPositionOfLineDoubleCol: number;

  public thresholdOfLineDiff: number;

  public mostCommonTextLineHeight: number;

  // used to group nearby lines together into paragraphs, list items etc.
  // derived from median glyph height
  public singleLineSpacing = 0;

  // default values before font analysis in math module
  public static mostMathUsedFont: string = "CMSY";
  public static medianMathFontSize: number = 15;

}
