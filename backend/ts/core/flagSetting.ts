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

/**
* Flags for calling respective module
* Each flag should have three 
* True - present: indicating presence of the component = run respective module
* False - absent: indicating absence of the component = do not run respective module
* Undefined : indicating unknown status of the flag = run respective module
*/ 
export class flagSetting{
    public multipleColumnPresence: boolean = true;
    public headerPresence: boolean = true;
    public FooterPresence: boolean = true;
    public figurePresence: boolean = true;
    public captionPresence: boolean = true;
    public tablePresence: boolean = true;
    public watermarkPresence: boolean = false;
    public equationPresence: boolean = true; 
    public pageNoPresence: boolean = true;
    public tableOfcontentPresence: boolean = true;
    public headingPresence: boolean = true;
    public listPresence: boolean = true;
    public paragraphPresence: boolean = true;
}
