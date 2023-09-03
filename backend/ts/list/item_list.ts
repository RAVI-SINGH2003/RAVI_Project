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
 * @fileoverview Class for a list item
 *
 * @author dangeti.Bharadwaj.cs116@cse.iitd.ac.in
 */

import { Component } from '../utility/components';
import { Line } from '../core/line';

const values = new Map([
  ['I', 1],
  ['i', 1],
  ['V', 5],
  ['v', 5],
  ['X', 10],
  ['x', 10]
]);

function romanToInt(s: string) {
  let previous = 0,
    result = 0;
  for (const char of s.split('').reverse()) {
    const current = values.get(char) as number;
    if (current >= previous) {
      result += current;
    } else {
      result -= current;
    }
    previous = current;
  }
  return result;
}

function alphabetToInt(s: string): number {
  if (s.length > 1) {
    return -1;
  }

  let x: number = s.charCodeAt(0);
  if (x >= 65 && x <= 90) {
    x -= 64;
  } else if (x >= 97 && x <= 122) {
    x -= 96;
  }
  return x;
}

/**
 * @param line string to extract the bullet from
 * @param n index of the first space in line
 * @returns the bullet text after stripping any parens, brackets, full-stops
 */
function getListItemHead(line: string, n: number): string {
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

function listHeadforSplit(line: string, n: number): string {
  if (n > 7) {
    return '';
  } // N: index of " "
  const hd = line.substring(0, n);
  if (hd[0] == '(' && hd.length > 1) {
    const i = hd.indexOf(')');
    if (i == -1 || i != n - 1) {
      return '';
    }
    return hd.substring(1, i);
  } else if (hd[0] == '[' && hd.length > 1) {
    const i = hd.indexOf(']');
    if (i == -1 || i == 1) {
      return '';
    }
    return hd.substring(1, i);
  } else if (hd[hd.length - 1] == ')' || hd[hd.length - 1] == '.') {
    return hd.substring(0, hd.length - 1);
  }
  return '';
}

function getListItemNumberingType(s: string): string {
  if (s == '') {
    return '';
  }
  if (s == '●' || s == '•') {
    return 'disc';
  } else if (s == '○') {
    return 'circle';
  } // Need to be updated
  else if (s == '■') {
    return 'square';
  }

  let res: number = parseInt(s);
  if (/^\d+$/.test(s)) {
    return '1';
  }
  res = romanToInt(s);
  if (res) {
    const x = s.charCodeAt(0); // Checking lower|upper case of roman letters
    if (x >= 65 && x <= 90) {
      return 'I';
    }
    return 'i';
  }
  res = alphabetToInt(s);
  if (res != -1) {
    const x = s.charCodeAt(0); // Checking lower|upper case of roman letters
    if (x >= 65 && x <= 90) {
      return 'A';
    }
    return 'a';
  }
  return ''; // In appropriate List head
}

function getListItemNumbering(s: string, ty: string): number {
  let res = -1;
  if (ty == '1') {
    res = parseInt(s);
  } else if (ty == 'a' || ty == 'A') {
    res = alphabetToInt(s);
  } else if (ty == 'i' || ty == 'I') {
    res = romanToInt(s);
  }
  if (!res) {
    return -1;
  }
  return res;
}
/**
 *
 * @param line
 * @returns
 */
function removeSpaces(line: string): string {
  const ret = line;
  if (ret.search(' ') == 0) {
    return removeSpaces(ret.substring(1));
  }
  return ret;
}

class Tag {
  list_type: string;

  item_type: string[];

  xDistance: number[];

  constructor() {
    this.list_type = '';
    this.item_type = [''];
    this.xDistance = [0];
  }
}

function list_tag(line: string): Tag {
  const tag = new Tag(),
    n = line.search(' '),
    hd = getListItemHead(line, n);

  tag.item_type[0] = getListItemNumberingType(hd);
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

function starts2(line: Line, tag: Tag, scope: number): boolean {
  const hd = getListItemHead(line.text(), line.text().search(' ')),
    type = getListItemNumberingType(hd);
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

class Item {
  value: number;

  type: string;

  lines: Line[];

  scope: number;

  multi: boolean;

  multiLines: string[];

  multiValues: number[];

  combo: boolean;

  constructor() {
    this.value = 0;
    this.scope = 0;
    this.type = '';
    this.lines = [];
    this.multi = false;
    this.combo = false;
    this.multiLines = [];
    this.multiValues = [];
  }
}

class RetObj {
  nested: boolean;

  contains: boolean;

  type: string;

  constructor() {
    this.nested = false;
    this.contains = false;
    this.type = '';
  }
}

class Split_Tag {
  list_type: string;

  line: string;

  num: number;

  constructor() {
    this.list_type = '';
    this.line = '';
    this.num = 0;
  }
}

function addSplitTag(
  l_type: string,
  hd_str: string,
  line: string,
  lnum: number
): Split_Tag {
  const st = new Split_Tag();
  st.list_type = l_type;
  st.line = line;
  st.num = lnum;
  return st;
}

function splitlist(line: string): Split_Tag[] {
  const multi = line.split(' '),
    l = multi.length,
    n = multi[0].length;
  let hd_str = multi[0].substring(0, n),
    hd = listHeadforSplit(multi[0], n);
  const l_type = getListItemNumberingType(hd),
    lnum = getListItemNumbering(hd, l_type);

  if (l_type == '') {
    const st = addSplitTag(l_type, hd_str, line, lnum),
      s_lines: [Split_Tag] = [st];
    return s_lines;
  }
  const st = addSplitTag(l_type, hd_str, '', lnum),
    s_lines: [Split_Tag] = [st];
  let itr = 0;
  for (let i = 1; i < l; i++) {
    (hd = listHeadforSplit(multi[i], multi[i].length)),
      (hd_str = multi[i].substring(0, multi[i].length));
    const list_type = getListItemNumberingType(hd);
    let head_num = getListItemNumbering(hd, list_type);
    if (head_num == -1) {
      head_num = 0;
    }

    if (list_type != l_type) {
      multi[i] = `${multi[i]} `;
      s_lines[itr].line += multi[i];
    } else {
      itr++;
      const lin = '',
        st2 = addSplitTag(l_type, hd_str, lin, head_num);
      s_lines.push(st2);
    }
  }

  return s_lines;
}

function addItem(item1: Item, item: Line[], scope: number, tag: Tag): Item {
  item1.lines = item;
  item1.type = tag.item_type[scope];
  item1.scope = scope;
  const hd: string = getListItemHead(
    item[0].text(),
    item[0].text().search(' ')
  );
  item1.value = getListItemNumbering(hd, tag.item_type[scope]);
  return item1;
}

export class ItemList {
  private static count = 0;

  public html: HTMLElement;

  public items: Line[][] = [];

  public items1: Item[] = [];

  public lines = new Map<string, Line>();

  public id: string;

  public tag: Tag;

  /**
   * Make a list item from a list of Lines.
   */
  constructor() {
    this.id = `itemList${ItemList.count++}`;
    this.html = document.createElement('ul');
  }

  /**
   * Return true if the lines a and b have the same ends or starts
   */
  private contains(
    tag: Tag,
    last: Component,
    next: Component,
    d: number,
    scope: number
  ): RetObj {
    const ret: RetObj = new RetObj();

    let xDistanceCheck = false,
      //yDistanceCheck = false,
      hdCheck = false;
    const n = next.text().search(' ');
    let hd = getListItemHead(next.text(), n),
      hdType = getListItemNumberingType(hd);
    if (
      hdType.length == 1 &&
      !(next.text()[n - 1] == '.' || next.text()[n - 1] == ')')
    ) {
      hdType = '';
      hd = '';
    }
    ret.type = hdType;
    hdCheck = hdType == tag.item_type[scope];

    xDistanceCheck = tag.xDistance[scope] < next.bbox.minX;
    ret.nested = hdType != '' && !hdCheck; // Check for nested lists

    const lastUptoRightMargin =
        (last.parent.bbox.maxX - last.bbox.maxX) / last.parent.bbox.w() < 0.03,
      // If this is the second line it can be unindented but not others
      newIndent =
        (next.bbox.minX - next.parent.bbox.minX) / next.parent.bbox.w(),
      newIndentOk = newIndent > 0.03 && newIndent < 0.3;

    if (hdCheck) {
      ret.contains = false;
      return ret;
    }
    if (xDistanceCheck) {
      ret.contains = true;
      return ret;
    } // Need to add lastUptoRightMargin
    if (lastUptoRightMargin && newIndentOk) {
      ret.contains = true;
      return ret;
    }

    return ret;
  }

  public static match(untagged: Map<string, Line>, d: number): ItemList {
    if (untagged.size == 0) {
      return null;
    }
    const itemList: ItemList = new ItemList(),
      it = untagged.values();
    let item: Line[] = [],
      next = it.next(),
      scope = 0,
      scopeNext = 0,
      tag: Tag;

    if (!next.done) {
      tag = list_tag(next.value.text());
    }
    if (tag && tag.list_type == '') {
      return null;
    }
    tag.xDistance[0] = next.value.bbox.minX;
    itemList.tag = tag;

    while (
      !next.done &&
      (item.length == 0 || starts2(next.value, tag, scope))
    ) {
      let item1: Item = new Item();
      item = [next.value];
      next = it.next();
      while (!next.done && !item.includes(next.value)) {
        const ret = itemList.contains(
          tag,
          item[item.length - 1],
          next.value,
          d,
          scope
        );
        if (ret.contains && !ret.nested) {
          item.push(next.value);
          next = it.next();
        } else if (ret.contains && ret.nested) {
          scopeNext = 1;
          tag.item_type[1] = ret.type;
          tag.xDistance[1] = next.value.bbox.minX;
          break;
        } else if (!ret.contains && ret.nested) {
          scopeNext = 0; // Set scope
        }
        if (!ret.contains) {
          break;
        }
      }
      itemList.items.push(item);
      item1 = addItem(item1, item, scope, tag);
      itemList.items1.push(item1);
      scope = scopeNext;
    }
    if (itemList.items.length >= 1) {
      itemList.items1.forEach((item) =>
        item.lines.forEach((line) => untagged.delete(line.id))
      );
      itemList.items1.forEach((item) =>
        item.lines.forEach((line, i) =>
          i == 0
            ? /*console.log('-' + line.text() + item.value)*/ 1 + 1
            : /*console.log(line.text())*/ 1 + 1
        )
      );
      return checkForMultiList(itemList);
    }

    return null;
  }

  public static starts(line: Line, prev: Line): boolean {
    const text = line.text(),
      prevText = prev.text();
    return text.charAt(0) == prevText.charAt(0); // Copy from online typescript compiler
  }

  public json() {
    const json = {
      id: this.id,
      lines: Array.from(this.lines.values()).map((x) => x.json())
    };
    return json;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public toHtml(p: HTMLElement = null, maxTract = true): Promise<void> {
    this.html = document.createElement(this.tag.list_type);
    this.html.setAttribute('type', this.tag.item_type[0]);
    const ele = document.createElement(this.tag.list_type);

    return this.items1.reduce((promise, item) => {
      const li = document.createElement('li');
      if (item.type.length == 1) {
        this.html.setAttribute('value', item.value.toString());
      }
      // Nested here
      if (item.scope > 0) {
        // Multi list in a line in nested
        if (item.multi) {
          //var ele = document.createElement(this.tag.list_type);
          ele.setAttribute('type', item.type);
          this.html.appendChild(ele);
          for (let itr = 0; itr < item.multiLines.length; itr++) {
            const lix = document.createElement('li');
            lix.setAttribute('value', item.multiValues[itr].toString());
            lix.textContent = item.multiLines[itr];
            ele.appendChild(lix);
          }

          return item.lines.reduce(
            (
              pr,
              line,
              i // <li value=5> </li> setAttribute("value", ihfkf);
            ) =>
              pr.then(() => {
                if (i == 0) {
                  line.removeFirstSpan();
                }
              }),
            promise
          );
        }
        // Normal list in nested list

        ele.setAttribute('type', item.type);
        this.html.appendChild(ele);

        const li2 = document.createElement('li');
        if (item.type.length == 1) {
          this.html.setAttribute('value', item.value.toString());
        }
        li2.setAttribute('value', item.value.toString());
        ele.appendChild(li2);

        return item.lines.reduce(
          (
            pr,
            line,
            i // <li value=5> </li> setAttribute("value", ihfkf);
          ) =>
            pr.then(() => {
              if (i == 0) {
                line.removeFirstSpan();
              }
              return line.toHtml(li2, maxTract).then(() => {
                if (!this.html.innerText.endsWith('-')) {
                  this.html.appendChild(document.createTextNode(' '));
                }
              });
            }),
          promise
        );
      }
      // Normal list goes here
      else if (item.multi) {
        if (item.combo) {
          li.setAttribute('value', item.value.toString());
          this.html.appendChild(li);
          const ele = document.createElement(this.tag.list_type);
          ele.setAttribute('type', item.type);
          li.appendChild(ele);
        } else {
          //var ele = document.createElement(this.tag.list_type);
          ele.setAttribute('type', item.type);
          this.html.appendChild(ele);
        }
        for (let itr = 0; itr < item.multiLines.length; itr++) {
          const lix = document.createElement('li');
          lix.setAttribute('value', item.multiValues[itr].toString());
          lix.textContent = item.multiLines[itr];
          ele.appendChild(lix);
        }

        return item.lines.reduce(
          (
            pr,
            line,
            i // <li value=5> </li> setAttribute("value", ihfkf);
          ) =>
            pr.then(() => {
              if (i == 0) {
                line.removeFirstSpan();
              }
            }),
          promise
        );
      }

      li.setAttribute('value', item.value.toString());
      this.html.appendChild(li);
      return item.lines.reduce(
        (
          pr,
          line,
          i // <li value=5> </li> setAttribute("value", ihfkf);
        ) =>
          pr.then(() => {
            if (i == 0) {
              line.removeFirstSpan();
            }
            return line.toHtml(li, maxTract).then(() => {
              /*
               * Add a space after each line except when ends with hyphen
               * To avoid concatenation of words appearing at end of line
               * With those appearing at start of next
               */
              if (!this.html.innerText.endsWith('-')) {
                this.html.appendChild(document.createTextNode(' '));
              }
            });
          }),
        promise
      );
    }, Promise.resolve());
  }
}

function removeHead(line: string): string {
  const n = line.search(' ');
  line = removeSpaces(line.substring(n + 1));
  return line;
}

function singleLineMultiListCheck(itemList: ItemList, item1: Item): Item {
  let line = item1.lines[0].text();
  if (item1.scope == 0 && itemList.items1.length != 1) {
    item1.combo = true;
    line = removeHead(line);
  }
  const splitLines = splitlist(line),
    l_type = getListItemNumberingType(listHeadforSplit(line, line.search(' ')));

  if (splitLines.length > 1 || (l_type != '' && l_type != item1.type)) {
    item1.multi = true;
    item1.type = splitLines[0].list_type;
    for (let j = 0; j < splitLines.length; j++) {
      item1.multiLines[j] = splitLines[j].line;
      item1.multiValues[j] = splitLines[j].num;
    }
  } else {
    item1.multiLines = [];
    item1.multiValues = [];
  }
  if (item1.multiValues[0] < 0) {
    item1.multi = false;
  }
  return item1;
}

function multiLineMultiListCheck(itemList: ItemList, item1: Item): Item {
  let line = item1.lines[0].text();
  line = removeHead(line);
  const l_type = getListItemNumberingType(
    listHeadforSplit(line, line.search(' '))
  );
  const subline = removeSpaces(line.substring(line.search(' ') + 1)),
    splitLines = splitlist(line);

  if (l_type == '' || l_type == item1.type) {
    item1.multi == false;
  } else if (splitLines.length == 1) {
    item1.multi = true;
    item1.combo = true;
    item1.type = splitLines[0].list_type;
    let str = subline;
    for (let j = 1; j < item1.lines.length; j++) {
      str += ` ${item1.lines[j].text()}`;
    }
    item1.multiValues[0] = splitLines[0].num;
    item1.multiLines[0] = str;
  } else {
    item1.multi = true;
    item1.combo = true;
    item1.type = splitLines[0].list_type;
    for (let j = 0; j < splitLines.length; j++) {
      item1.multiLines[j] = splitLines[j].line;
      item1.multiValues[j] = splitLines[j].num;
    }
    let str = '';
    for (let j = 1; j < item1.lines.length; j++) {
      const lin = item1.lines[j].text();
      const l_type = getListItemNumberingType(
        listHeadforSplit(lin, lin.search(' '))
      );
      if (l_type == '') {
        str += ` ${lin}`;
      } else {
        str += lin.substring(lin.search(' ') + 1);
      }
    }
    const nm = item1.multiValues.length;
    item1.multiValues[nm] = splitLines[nm - 1].num + 1;
    item1.multiLines[nm] = str;
  }
  return item1;
}

function checkForMultiList(itemList: ItemList): ItemList {
  if (itemList.items1.length > 0) {
    for (let i = 0; i < itemList.items1.length; i++) {
      let item1 = itemList.items1[i];
      if (item1.lines.length > 1 && item1.scope > 0) {
        continue;
      }
      // Line length = 1
      if (item1.lines.length == 1) {
        item1 = singleLineMultiListCheck(itemList, item1);
        itemList.items1[i] = item1;
      } else {
        item1 = multiLineMultiListCheck(itemList, item1);
        itemList.items1[i] = item1;
      }
    }
  }
  console.log(itemList);
  return itemList;
}
