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
 * @fileoverview Class for analysing calculated ratios for column detection
 * @author nehamjadhav@gmail.com
 */

export class colDetectResult {
  public colNo: number;

  public gutterWidth1: number;

  public gutterWidth2: number;

  constructor(col: number, widthGutter1: number, widthGutter2: number) {
    this.colNo = col;
    this.gutterWidth1 = widthGutter1;
    this.gutterWidth2 = widthGutter2;
  }
}

export class twoColumnRatios {
  public ratioCol1Sep: number;

  public ratioCol2Sep: number;

  constructor(ratio1: number, ratio2: number) {
    this.ratioCol1Sep = ratio1;
    this.ratioCol2Sep = ratio2;
  }
}

export class threeColumnRatios {
  public ratioCol1Sep1: number;

  public ratioCol2Sep1: number;

  public ratioCol3Sep1: number;

  public ratioCol1Sep2: number;

  public ratioCol2Sep2: number;

  public ratioCol3Sep2: number;

  constructor(
    col1Sep1: number,
    col2Sep1: number,
    col3Sep1: number,
    col1Sep2: number,
    col2Sep2: number,
    col3Sep2: number
  ) {
    this.ratioCol1Sep1 = col1Sep1;
    this.ratioCol2Sep1 = col2Sep1;
    this.ratioCol3Sep1 = col3Sep1;
    this.ratioCol1Sep2 = col1Sep2;
    this.ratioCol2Sep2 = col2Sep2;
    this.ratioCol3Sep2 = col3Sep2;
  }
}

export class columnDetails {
  public widthWithoutMargin: number;

  public mid1col2: number;

  public mid1col3: number;

  public mid2col3: number;

  constructor(
    withoutMargin: number,
    mid1column2: number,
    mid1column3: number,
    mid2column3: number
  ) {
    this.widthWithoutMargin = withoutMargin;
    this.mid1col2 = mid1column2;
    this.mid1col3 = mid1column3;
    this.mid2col3 = mid2column3;
  }
}

export class colDetectRatios {
  public colDetail: columnDetails;

  public col2ratios: twoColumnRatios;

  public col3ratios: threeColumnRatios;

  constructor(
    detailColumn: columnDetails,
    ratios2column: twoColumnRatios,
    ratios3column: threeColumnRatios
  ) {
    this.colDetail = detailColumn;
    this.col2ratios = ratios2column;
    this.col3ratios = ratios3column;
  }
}
