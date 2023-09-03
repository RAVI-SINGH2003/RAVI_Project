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
 * @fileoverview Procedure for the histogram frequency analysis.
 *
 * @author nehamjadhav@gmail.com Neha Jadhav
 */

export default class FrequencyAnalysis {
  constructor() {}

  /**
   * Check for highest frequency of font sizes
   */

  public countNumberFre(arr: number[], combineThresh: number) {
    let highestFreqNum,
      secondHightestFreNum,
      mapNumbers = new Map();
    arr.sort((a, b) => a - b);
    arr = arr.map((x) => Math.round(x));

    const filteredArray = arr.filter((item, pos) => arr.indexOf(item) == pos);

    filteredArray.forEach((x) => {
      mapNumbers.set(x, arr.lastIndexOf(x) - arr.indexOf(x) + 1);
    });

    mapNumbers = this.combineCloseNumbersClusters(mapNumbers, combineThresh);
    if (mapNumbers.size > 1) {
      highestFreqNum = [...mapNumbers.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0][0];
    }

    if (mapNumbers.size > 1) {
      secondHightestFreNum = [...mapNumbers.entries()].sort(
        (a, b) => b[1] - a[1]
      )[1][0];
    }

    return { highestFreqNum, secondHightestFreNum, mapNumbers };
  }

  /**
   * Check for highest frequency of font sizes
   */

  public countStringFre(arr: string[]) {
    let b = 1,
      prev = arr[0],
      mostusedFontFace;
    const mapFontFaces = new Map();
    arr.sort();
    for (let i = 1; i < arr.length + 1; i++) {
      if (prev == arr[i]) {
        b++;
      } else {
        mapFontFaces.set(prev, b);
        b = 1;
      }
      prev = arr[i];
    }
    let maxFreFontSize = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, value] of mapFontFaces) {
      maxFreFontSize =
        !maxFreFontSize || maxFreFontSize < value ? value : maxFreFontSize;
    }

    for (const [key, value] of mapFontFaces.entries()) {
      if (value === maxFreFontSize) {
        mostusedFontFace = key;
        break;
      }
    }

    return mostusedFontFace;
  }

  public combineCloseNumbersClusters(
    tempMapNumbers: Map<number, number>,
    combineThresh: number
  ): Map<number, number> {
    const mapNumbers: Map<number, number> = new Map<number, number>(),
      allKeys = tempMapNumbers.keys(),
      tempKeys: number[] = Array(...allKeys);

    /*
     * Console.log("mapnumbers: ",mapNumbers);
     * console.log("tempmapnumbers: ",tempMapNumbers);
     */
    for (let i = 0; i < tempKeys.length; i++) {
      if (Math.abs(tempKeys[i + 1] - tempKeys[i]) <= combineThresh) {
        if (
          tempMapNumbers.get(tempKeys[i]) >= tempMapNumbers.get(tempKeys[i + 1])
        ) {
          let tempPre = tempMapNumbers.get(tempKeys[i]);
          if (tempPre == null) {
            mapNumbers.set(
              tempKeys[i],
              tempMapNumbers.get(tempKeys[i]) +
                tempMapNumbers.get(tempKeys[i + 1])
            );
          } else {
            tempPre += tempMapNumbers.get(tempKeys[i + 1]);
            mapNumbers.set(tempKeys[i], tempPre);
          }
          i++;
        } else {
          mapNumbers.set(
            tempKeys[i + 1],
            tempMapNumbers.get(tempKeys[i]) +
              tempMapNumbers.get(tempKeys[i + 1])
          );
        }
      } else {
        mapNumbers.set(tempKeys[i], tempMapNumbers.get(tempKeys[i]));
      }
    }
    // Console.log("mapnumbers: ",mapNumbers);
    return mapNumbers;
  }
}
