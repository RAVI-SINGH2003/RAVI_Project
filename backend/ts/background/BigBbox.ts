/*
 * Author : Pushpa Raj & Nikhil.
 * Big_Bbox is a data structure that extends Bbox and has added atrributes.
 * "childern" refers to other boxes that are enclosed by the Big_Bbox.
 *
 */

import Bbox from '../utility/bbox';
import { Pixels } from '../utility/utils';

export class BigBbox extends Bbox {
  public children: BigBbox[];

  public isDivisionSym: boolean;

  public isRadicalSym: boolean;

  public isMathSym: boolean;

  constructor(pixels: Pixels) {
    super(pixels);
    this.children = [];
    this.isDivisionSym = false;
    this.isRadicalSym = false;
    this.isMathSym = false;
  }

  public getChildren(): BigBbox[] {
    return this.children;
  }
}
