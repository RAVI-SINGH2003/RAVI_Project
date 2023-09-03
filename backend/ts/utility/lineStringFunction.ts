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
 * @headingAnalysis Class for a detecting headings for a document
 *
 * @author nehamjadhav@gmail.com Neha Jadhav
 */
 import { itemlistParameters } from '../global/parameters';

 export  class stringCompare {
  
   public stringStartsWithNo(tempString: string) {
     if (tempString.match(/^[0-9.]*\s.*/)) {
       return 1;
     }
     return 0;
   }
 
   public stringFirstAlphabetCapital(tempString: string) {
     if (tempString.match(/^[0-9. ]*[A-Z].*$/)) {
       return 1;
     }
   }
 
   public stringNoFullStopOrSpSymbol(tempString: string) {
     if (
       tempString[tempString.length - 1] !== '.' &&
       tempString[tempString.length - 1] !== ';' &&
       tempString[tempString.length - 1] !== ','
     ) {
       return 1;
     }
   }
 
   public stringAllCapital(tempString: string) {
     if (tempString.match(/^[0-9.]*\s+[A-Z]*/)) {
       return 1;
     }
    }  


   public static romanToInt(s: string) {
   let romanValueMapping = new Map([
      ['I', 1], 
      ['i', 1],
      ['V', 5],
      ['v', 5],
      ['X', 10],
      ['x', 10]
  ]);
  
     let previous = 0,
       result = 0; 
     for (const char of s.split('').reverse()) {
       const current = romanValueMapping.get(char) as number;
       if (current >= previous) {
         result += current;
       } else {
         result -= current;
       }
       previous = current;
     }
     return result;
   }
   
   
   public static alphabetToInt(s: string): number {
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
   
   public  static getListItemNumberingType(s: string): string {
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
    res = this.romanToInt(s);
    if (res) {
      const x = s.charCodeAt(0); // Checking lower|upper case of roman letters
      if (x >= 65 && x <= 90) {
        return 'I';
      }
      return 'i';
    }
    res = this.alphabetToInt(s);
    if (res != -1) {
      const x = s.charCodeAt(0); // Checking lower|upper case of roman letters
      if (x >= 65 && x <= 90) {
        return 'A';
      }
      return 'a';
    }
    return ''; // In appropriate List head
  }
  public  static removeSpaces(line: string): string {
    const ret = line;
    if (ret.search(' ') == 0) {
      return this.removeSpaces(ret.substring(1));
    }
    return ret;
  }
   public static removeHead(line: string): string {
    const n = line.search(' ');
    line = stringCompare.removeSpaces(line.substring(n + 1));
    return line;
  }
  
 
 
 
 }
   