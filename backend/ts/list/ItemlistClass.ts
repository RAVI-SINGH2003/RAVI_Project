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
 * @author dangeti.Bharadwaj.cs116@cse.iitd.ac.in
 */

 import { Component } from '../utility/components';
 import { Line } from '../core/line';
 import {itemlistParameters} from '../global/parameters';
 import {stringCompare} from '../utility/lineStringFunction';
 import {Tag} from './TagClass';
 import { Item } from './ItemClass';
 import { Split_Tag } from './SplitTagClass';
 import { RetObj } from './RetObjClass';
 import Dokument from '../core/dokument';
export class ItemList {
  private static count = 0;

  public html: HTMLElement;

  public items: Line[][] = [];

  public items1: Item[] = [];

  public lines = new Map<string, Line>();

  public id: string;

  public tag: Tag;
  
  public mapping = new itemlistParameters();
 
  romanValuemMapping =this.mapping.romanValueMapping;

   /**
    * Make a list item from a list of Lines.
    */
    constructor() {
      this.id = `itemList${ItemList.count++}`;
      this.html = document.createElement('ul');
    }
  
    /**
     * 
     * @param tag 
     * @param last 
     * @param next 
     * @param scope 
     * @returns 
     */
     private contains(
      tag: Tag,
      last: Component,
      next: Component,
      scope: number
      ): RetObj {
      const ret: RetObj = new RetObj();
      let xDistanceCheck = false,
        hdCheck = false;
      const n = next.text().search(' ');
      let hd = Tag.getListItemHead(next.text(), n),
        hdType =Split_Tag.getListItemNumberingType(hd);

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
      ret.nested = hdType != '' && !hdCheck; 
  
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
      } 
      if (lastUptoRightMargin && newIndentOk) {
        ret.contains = true;
        return ret;
      }
  
      return ret;
    }
/**
 * This is the starting function which is called with document object.
 * It will add list items to the element list of document
 * @param doc Document object
 * @returns document object after adding list items
 */
    public static match(doc: Dokument):Dokument  {
      const paraLines= new Map<string, Line>();
      let counter = 0;

      doc.elements.forEach(ele =>{
        if (ele.id.includes('paragraph')){
          ele.lines.forEach((value,key) => paraLines.set(key,value));
        }
      })

      while(paraLines.size > 0) {
        let L: ItemList= new ItemList(); 
        L= this.LineToList(paraLines);
        if (L) {
          L.items1.forEach(function (value) {
            value.lines.map(line=>{
              L.lines.set(line.id,line);
            })    
            doc.elements.delete("paragraph"+value.lines[0].id.slice(4,));
          }); 
          doc.elements.set(L.id,L);
        }
        else{
          paraLines.delete(('line'.concat(counter.toString()))); 
          counter++;
        }
      }

      doc.elements = new Map([...doc.elements.entries()].sort(
        (a,b) =>{
          if (parseInt([...a[1].lines][0][0].slice(4,)) <
          parseInt([...b[1].lines][0][0].slice(4,))) return -1;
        }
      ));
       
     return doc;
    }
/**
 * This function checks if curent set of para lines have list items or not
 * @param paraLines Paragraph lines 
 * @returns List item if it has list item in it
 */
    public static LineToList(paraLines: Map<string, Line>): ItemList {
      if (paraLines.size == 0) {        
        return null;
      }

      const itemList: ItemList = new ItemList(),
        it = paraLines.values();      
      let item: Line[] = [],
        next = it.next(),
        scope = 0,
        scopeNext = 0,
        tag: Tag;  
      if(!next.done) {
        tag = Tag.list_tag(next.value.text());  
      }   
      if (tag && tag.list_type == '') {
        return null;
      }  
      tag.xDistance[0] = next.value.bbox.minX;
      itemList.tag = tag; 
      while (
        !next.done &&
        (item.length == 0 || Tag.starts2(next.value, tag, scope))
      ) {
        let item1: Item = new Item();
        item = [next.value];
        next = it.next();
        while (!next.done && !item.includes(next.value)) {
          const ret = itemList.contains(
            tag,
            item[item.length - 1],
            next.value,
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
        item1 = Tag.addItem(item1, item, scope, tag);
        itemList.items1.push(item1);
        scope = scopeNext;
      }
      if (itemList.items.length >= 1) {
        itemList.items1.forEach((item) =>
          item.lines.forEach((line) => paraLines.delete(line.id))
        );
        itemList.items1.forEach((item) =>
          item.lines.forEach((line, i) =>
            i == 0 ?  1 + 1 :  1 + 1
          )
        );
        return checkForMultiList(itemList);
      }  
      return null;
      } 

/**
 * This function adds list item elements to json object when called from document json 
 * @returns json object
 */
  public json() {
    return  {
        id: this.id,
        lines: Array.from(this.lines.values()).map((x) => x.json())
    };
  }

/**
 * This function will append html elements from document object to actual HTML document
 * @param p not being used
 * @param maxTract boolean to check if maths to be checked or not
 * @returns Complete HTML document
 */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public toHtml(p: HTMLElement = null, maxTract = true): Promise<void> {
      this.html = document.createElement(this.tag.list_type);
      this.html.setAttribute('type',this.tag.item_type[0]);
      const ele = document.createElement(this.tag.list_type);
      return this.items1.reduce((promise, item) => {
        const li = document.createElement('li');
        if (item.type.length == 1) {
          console.log(item.value);
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
/**
 * Function to check if single line has multiple list in one row
 * @param itemList Complete list item to be checked
 * @param item1 Item 
 * @returns Multiple list if exists
 */
  function singleLineMultiListCheck(itemList: ItemList, item1: Item): Item {
    let line = item1.lines[0].text();
    if (item1.scope == 0 && itemList.items1.length != 1) {
      item1.combo = true;
      line = stringCompare.removeHead(line);
    }
    const splitLines = Split_Tag.splitlist(line),
      l_type = Split_Tag.getListItemNumberingType(Split_Tag.listHeadforSplit(line, line.search(' ')));
  
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
/**
 * Function to check multiple lines for multi list item
 * @param item1 Item to check for multi list
 * @returns Returns item 
 */
 function multiLineMultiListCheck(item1: Item): Item {
  let line = item1.lines[0].text();
  line = stringCompare.removeHead(line);
  const l_type = Split_Tag.getListItemNumberingType(
    Split_Tag.listHeadforSplit(line, line.search(' '))
  );
  const subline = stringCompare.removeSpaces(line.substring(line.search(' ') + 1)),
    splitLines = Split_Tag.splitlist(line);

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
      const l_type =Split_Tag.getListItemNumberingType(
        Split_Tag.listHeadforSplit(lin, lin.search(' '))
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
/**
 * Function checks if given listitem is multi list item or not
 * @param itemList Item list element of document
 * @returns returns item list  
 */
function checkForMultiList(itemList: ItemList): ItemList {
  if (itemList.items1.length > 0) {
    for (let i = 0; i < itemList.items1.length; i++) {
      let item1 = itemList.items1[i];
      if (item1.lines.length > 1 && item1.scope > 0) {
        continue;
      }
      if (item1.lines.length == 1) {
        item1 = singleLineMultiListCheck(itemList, item1);
        itemList.items1[i] = item1;
      } else {
        item1 = multiLineMultiListCheck(item1);
        itemList.items1[i] = item1;
      }
    }
  }
  return itemList;
}