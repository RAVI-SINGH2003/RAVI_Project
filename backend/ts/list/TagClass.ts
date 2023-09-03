import { Line } from "../core/line";
import { Item} from './ItemClass';
import {stringCompare} from '../utility/lineStringFunction';

export class Tag{
    list_type: string;
  
    item_type: string[];
  
    xDistance: number[];
  
    constructor() {
      this.list_type = '';
      this.item_type = [''];
      this.xDistance = [0];
 }

public static starts2(line: Line, tag: Tag, scope: number): boolean {
  const hd = Tag.getListItemHead(line.text(), line.text().search(' ')),
    type = stringCompare.getListItemNumberingType(hd);
  if (type == tag.item_type[scope]) {
    return true;
  }
  if (type != tag.item_type[scope] && type != '') {
    if (scope > 0 && type == tag.item_type[0]) {
      return true;
    }
  }
  return false;
}
/**
 * 
 * @param line Line text which needs to be checked for list 
 * @returns 
 */
public static list_tag(line: string): Tag {
  const tag = new Tag(),
    n = line.search(' '),
    hd = Tag.getListItemHead(line, n);
  tag.item_type[0] = stringCompare.getListItemNumberingType(hd);
  if (tag.item_type[0] == '1') {
    const l = line.substring(0, n);
    if (!(l[l.length - 1] == ')' || l[l.length - 1] == '.')) {
      return tag;
    }
  }
  if (
    tag.item_type[0] == 'A' ||
    (tag.item_type[0] == 'a' && line.search(' ') <= 1)
  ) {
    return tag;
  }
  if (tag.item_type[0].length > 1) {
    tag.list_type = 'ul';
  } else if (tag.item_type[0].length == 1) {
    tag.list_type = 'ol';
  }

  return tag;
}


public static addItem(item1: Item, item: Line[], scope: number, tag: Tag): Item {
  item1.lines = item;
  item1.type = tag.item_type[scope];
  item1.scope = scope;
  const hd: string = Tag.getListItemHead(
    item[0].text(),
    item[0].text().search(' ')
  );
  item1.value = getListItemNumbering(hd, tag.item_type[scope]);
  return item1;
}
/**
 * 
 * @param line 
 * @param n 
 * @returns 
 */
public static getListItemHead(line: string, n: number): string {
  if (n > 7) {
    return '';
  } // N: index of " "
  let hd = line.substring(0, n);
  if (hd[0] == '(' && hd.length > 2) {
    const i = hd.indexOf(')');
    if (i == -1) {
      return '';
    }
    hd = hd.substring(1, i);
  } else if (hd[0] == '[' && hd.length > 2) {
    const i = hd.indexOf(']');
    if (i == -1) {
      return '';
    }
    hd = hd.substring(1, i);
  } else if (hd[hd.length - 1] == ')' || hd[hd.length - 1] == '.') {
    hd = hd.substring(0, hd.length - 1);
  }
  return hd;
}
}

function getListItemNumbering(s: string, ty: string): number {
  let res = -1;
  if (ty == '1') {
    res = parseInt(s);
  } else if (ty == 'a' || ty == 'A') {
    res = stringCompare.alphabetToInt(s);
  } else if (ty == 'i' || ty == 'I') {
    res = stringCompare.romanToInt(s);
  }
  if (!res) {
    return -1;
  }
  return res;
}