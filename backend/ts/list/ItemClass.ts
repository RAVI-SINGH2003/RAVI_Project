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
 * @fileoverview Class for a information list
 * @author dangeti.Bharadwaj.cs116@cse.iitd.ac.in
 */
import { Line } from "../core/line";

export class Item {
  public value: number;

  public type: string;

  public lines: Line[];

  public scope: number;

  public multi: boolean;

  public multiLines: string[];

  public multiValues: number[];

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

