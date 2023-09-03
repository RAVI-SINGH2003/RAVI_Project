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
 * @fileoverview Class for list details like nesting ot type
 * @author dangeti.Bharadwaj.cs116@cse.iitd.ac.in
 */
export class RetObj {
    nested: boolean;
  
    contains: boolean;
  
    type: string;
  
    constructor() {
      this.nested = false;
      this.contains = false;
      this.type = '';
 }
}