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
 * @fileoverview Files has work flow for the project and calls respective function
 * depending on the value of the flagsetting object
 *
 * @author nehamjadhav@gmail.com Neha Jadhav and Punit Tigga
 */

import Dokument from './dokument';
import { flagSetting } from './flagSetting';
import { Characteristics } from '../global/characteristics';
import {} from '../global/parameters';

export class Workflow {
  private flagSettingObj: flagSetting = new flagSetting();
  private characteristicsObj: Characteristics = new Characteristics();

    private  doc: Dokument = Dokument.fromHtml();

    /**
     * Set the radio button information to flagSetting object
     * @param json object
    */

    public setflagSettingObj(jsonObj: any) {

        const mapArray = [false, true, undefined];
        this.flagSettingObj.multipleColumnPresence = mapArray[jsonObj["more-column"]];
        this.flagSettingObj.headerPresence = mapArray[jsonObj["Header"]];
        this.flagSettingObj.FooterPresence = mapArray[jsonObj["Footer"]];
        this.flagSettingObj.figurePresence = mapArray[jsonObj["Figure"]];
        this.flagSettingObj.captionPresence = mapArray[jsonObj["caption"]];
        this.flagSettingObj.tablePresence = mapArray[jsonObj["Table"]];
        this.flagSettingObj.watermarkPresence = mapArray[jsonObj["Watermark"]];
        this.flagSettingObj.equationPresence = mapArray[jsonObj["Equations"]];
        this.flagSettingObj.equationPresence = mapArray[jsonObj["Page_no"]];
        this.flagSettingObj.tableOfcontentPresence = mapArray[jsonObj["Table_of_content"]];
    }

    /**
     * Function will execute basic modules of foreground and background
     * It will also calculate parameters required for analysis. 
     */

    public preProcessing(url:string, flags:any, baseURL:string){
        console.log("running preprocessing..")
        return this.doc.promise
                .then(() => this.doc.backgroundAnalysis())
                .then(()=> this.doc.columnDetection(this.characteristicsObj))
                .then(() => this.doc.linify())
                .then(() => this.doc.analyseCharacteristics())
                .then(() => this.doc.captionDetection())
                .then(() => this.doc.showPage())
                .then(() => this.doc.draw_object_box())
                .then(() => this.doc.backgroundAnalysis())
                .then(() => this.doc.tableDetection())
                .then(() => this.doc.match())
                
                .then(() => {
                  if (flags.nojson && flags.nojsonf) return;
                  return this.toServer([url, this.doc.json(), []],baseURL);
                })
                .then(() => this.doc.cleanDocument())
                .then(() => this.doc.toHtml())
                // .then(() => this.doc.ImagestoHtml());
    }
    
    /**
     * Control flow call modules as per flag status
     */
   /*  public controlFlow(url:string, flags:any, baseURL:string){
        /* if (this.flagSettingObj.multipleColumnPresence == true || this.flagSettingObj.multipleColumnPresence == undefined){  
          this.doc.columnDetection(this.characteristicsObj);
        } */
        
      /*  if (this.flagSettingObj.captionPresence == true || this.flagSettingObj.captionPresence == undefined){
            this.doc.captionDetection();
        }

        return this.doc.promise.then(() => this.doc.showPage())
                .then(() => this.doc.draw_object_box()) 
                .then(() => this.doc.match())
                .then(() => {
                  if (flags.nojson && flags.nojsonf) return;
                  return this.toServer([url, this.doc.json(), []],baseURL);
                })
                .then(() => this.doc.cleanDocument())
                .then(() => this.doc.toHtml())
                .then(() => this.doc.ImagestoHtml());
    } */

    /**
     * Fetch information from server
     */
    public toServer(content:any,baseURL:string) {
        // use the fetch api so we can wait for it to finish
        console.log('Fetch ' + baseURL);
        return fetch(baseURL, {
          method: 'POST',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(content) // body data type must match "Content-Type" header
        });
      }
    
}
