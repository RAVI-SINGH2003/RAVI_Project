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
 * @fileoverview Class for seperating tags
 *
 * @author dangeti.Bharadwaj.cs116@cse.iitd.ac.in
 */ 

import {stringCompare} from '../utility/lineStringFunction';
export class Split_Tag {
  /**
   * This funtion converts the string ,alphabet ,roman numbering of list to 
   * integer numbering
   * @param s String containing character or alphabet
   * @param ty Starting of the list item
   * @returns Converted integer for list item
   */
  public static getListItemNumbering(s: string, ty: string): number {
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
/**
 * Function check for list type as ordered or unordered list 
 * @param s string to check type
 * @returns List item head
 */
  public static getListItemNumberingType(s: string): string {
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
    res = stringCompare.romanToInt(s);
    if (res) {
      const x = s.charCodeAt(0); // Checking lower|upper case of roman letters
      if (x >= 65 && x <= 90) {
        return 'I';
      }
      return 'i';
    }
    res = stringCompare.alphabetToInt(s);
    if (res != -1) {
      const x = s.charCodeAt(0); // Checking lower|upper case of roman letters
      if (x >= 65 && x <= 90) {
        return 'A';
      }
      return 'a';
    }
    return ''; // In appropriate List head
  }
    list_type: string;
  
    line: string;
  
    num: number;
  
    constructor() {
      this.list_type = '';
      this.line = '';
      this.num = 0;
 }
/**
 * This funtion is spliting multilist and storing it in array of Split Tag.
 * @param line Complete line for spliting
 * @returns  split_tag array
 */
public static  splitlist(line: string): Split_Tag[] {
  const multi = line.split(' '),
    l = multi.length,
    n = multi[0].length;  
  let hd = this.listHeadforSplit(multi[0], n);
  const l_type = this.getListItemNumberingType(hd),
    lnum = this.getListItemNumbering(hd, l_type);

  if (l_type == '') {
    const st = this.addSplitTag(l_type, line, lnum),
      s_lines: [Split_Tag] = [st];
    return s_lines;
  }
  const st = this.addSplitTag(l_type, '', lnum),
    s_lines: [Split_Tag] = [st];
  let itr = 0;
  for (let i = 1; i < l; i++) {
    (hd = this.listHeadforSplit(multi[i], multi[i].length));
    const list_type = this.getListItemNumberingType(hd);
    let head_num = this.getListItemNumbering(hd, list_type);
    if (head_num == -1) {
      head_num = 0;
    }

    if (list_type != l_type) {
      multi[i] = `${multi[i]} `;
      s_lines[itr].line += multi[i];
    } else {
      itr++;
      const lin = '',
        st2 = this.addSplitTag(l_type, lin, head_num);
      s_lines.push(st2);
    }
  }
  return s_lines;
}
/**
 * Function to separate head from the list
 * @param line Line to get list head
 * @param n line size
 * @returns Head of the list
 */
public static listHeadforSplit(line: string, n: number): string {
  if (n > 7) {
    return '';
  } 
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
/**
 * This funtion returns split tag.
 * @param l_type type of the list
 * @param line line to be anaysed
 * @param lnum 
 * @returns Oblect of the split tag
 */
public static addSplitTag(
    l_type: string,
    line: string,
    lnum: number
  ): Split_Tag {
    const st = new Split_Tag();
    st.list_type = l_type;
    st.line = line;
    st.num = lnum;
    return st;
  }
}






