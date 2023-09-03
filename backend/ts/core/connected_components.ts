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
 * @fileoverview Connected component procedure.
 *
 * @author v.sorge@progressiveaccess.com (Volker Sorge)
 */

import { Pixels } from '../utility/utils';

export namespace ConComp {
  const matrix = new Map<number, Map<number, number>>(),
    equivs = new Map<number, Set<number>>();
  let colour = 0;
  const init = function () {
      matrix.clear();
      equivs.clear();
      colour = 0;
    },
    newColor = () => {
      colour++;
      equivs.set(colour, new Set<number>());
      return colour;
    },
    equivColor = (a: number, b: number) => {
      if (a === b) {
        return;
      }
      equivs.get(a).add(b);
      equivs.get(b).add(a);
    },
    enterColor = (x: number, y: number, c: number) => {
      if (matrix.get(x)) {
        matrix.get(x).set(y, c);
      } else {
        matrix.set(x, new Map<number, number>());
        matrix.get(x).set(y, c);
      }
    },
    combineEquiv = (colour: number, set: Set<number>) => {
      set.add(colour);
      const next = equivs.get(colour);
      if (!next) {
        return;
      }
      equivs.delete(colour);
      for (const col of next.values()) {
        combineEquiv(col, set);
      }
    };

  /*
   * Two pass colouring, column first.
   * Top down, left-right
   */
  export const getConnectedComponents = function (pixels: Pixels) {
    init();
    for (const [x, y] of pixels) {
      // North, North-West, West and South-West
      const n = matrix.get(x) && matrix.get(x).get(y - 1),
        nw = matrix.get(x - 1) && matrix.get(x - 1).get(y - 1),
        w = matrix.get(x - 1) && matrix.get(x - 1).get(y),
        sw = matrix.get(x - 1) && matrix.get(x - 1).get(y + 1);
      if (w && n) {
        enterColor(x, y, Math.min(w, n));
        equivColor(w, n);
        continue;
      }
      if (nw && sw) {
        enterColor(x, y, Math.min(sw, nw));
        equivColor(sw, nw);
        continue;
      }
      if (n && sw) {
        enterColor(x, y, Math.min(sw, n));
        equivColor(sw, n);
        continue;
      }
      if (w) {
        enterColor(x, y, w);
        continue;
      }
      if (nw) {
        enterColor(x, y, nw);
        continue;
      }
      if (n) {
        enterColor(x, y, n);
        continue;
      }
      if (sw) {
        enterColor(x, y, sw);
        continue;
      }
      enterColor(x, y, newColor());
    }

    /*
     * TODO: Spread this out a bit into different methods.
     * Reduce equivalence classes.
     */
    const result: Set<number>[] = [];
    for (let i = 1; i <= colour; i++) {
      if (!equivs.get(i)) {
        continue;
      }
      const set = new Set<number>();
      combineEquiv(i, set);
      result.push(set);
    }

    /*
     * Make a quick lookup data-structure
     * And then classify the pixels by color.
     */
    const colourMap = new Map<number, number>(),
      ccMap = new Map<number, Pixels>();
    for (const equiv of result) {
      const min = Math.min.apply(null, Array.from(equiv));
      ccMap.set(min, []);
      for (const colour of equiv) {
        colourMap.set(colour, min);
      }
    }
    for (const x of matrix.keys()) {
      for (const y of matrix.get(x).keys()) {
        const colour = matrix.get(x).get(y);
        ccMap.get(colourMap.get(colour)).push([x, y]);
      }
    }
    const ccPixels: Pixels[] = [];
    ccMap.forEach((_, key) => ccPixels.push(ccMap.get(key)));
    return ccPixels;
  };
}
