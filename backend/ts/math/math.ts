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
 * @fileoverview Methods to process maths from the document.
 *
 * @author juyalshivansh3@gmail.com (Shivansh), sanjeevs6868@gmail.com (Sanjeev)
 */

import Bbox from '../utility/bbox';
import { Line } from '../core/line';
import Canvas from '../utility/canvas';
import Page from '../core/page';
import {helper} from './helper';
import Dokument from '../core/dokument';
import {Span} from '../core/span';
import { Characteristics } from '../global/characteristics';

export default class math {

    public pages: Map<string, Page> = new Map<string, Page>();
    public objectDetectJsonObj : any = null;
    public mathFontNamesFreq = new  Map();
    public dokument: Dokument = null;
    public mostUsedFont: string = Characteristics.mostMathUsedFont;
    public medianFontSize = Characteristics.medianMathFontSize;
    public allFontsSizes: any = [];
    public object_detect_bbox_to_spans_inline: Map<number, Map<number, string[]>> = new Map<number, Map<number, string[]>>();
    public object_detect_bbox_to_spans_display: Map<number, Map<number, string[]>> = new Map<number, Map<number, string[]>>();


    constructor(allPages: Map<string, Page>, dokument: Dokument) {
        // this.pages = allPages;
        this.dokument = dokument;
        this.pages = dokument.pages;
    }


    /**
     * Get all object bounding boxes in absolute pixel numbers of page canvas
     * @param obj_det_array arrays of relative position of maths bounding boxes detected by object detection
     * @param canvas JS canvas of page
     */

    public get_absolute_bounding_boxes(obj_det_array: any, canvas: Canvas){
        let aiBoxes: Bbox[] = [];
        for(let i = 0; i < obj_det_array.length; i++){
            var single_bbox = obj_det_array[i];
            console.log("object_detection_array : i =  ",i , obj_det_array[i]);
            let xmid = parseFloat(single_bbox[1]);
            let ymid = parseFloat(single_bbox[2]);
            let width = parseFloat(single_bbox[3]);
            let height = parseFloat(single_bbox[4]);

            console.log("CANVAS__WIDTH :", canvas.width);
            console.log("CANVAS__HEIGHT :", canvas.height);


            let xmin = xmid - width/2;
            let xmax = xmid + width/2;
            let ymin = ymid - height/2;
            let ymax = ymid + height/2;
            xmin = xmin * canvas.width;
            xmax = xmax * canvas.width;
            ymin = ymin * canvas.height;
            ymax = ymax * canvas.height;
            let temp = new Bbox([]);
            temp.minX = xmin;
            temp.maxX = xmax;
            temp.minY = ymin;
            temp.maxY = ymax;
            aiBoxes.push(temp);
        }
        console.log("aiBoxes printing line:85 ===> ", aiBoxes);
        var i = 0;
        aiBoxes.forEach((val)=>{
            console.log("vallllllXXXXXX : ",val.minX);
            console.log("vallllllYYYYYY : ",val.minY);
        })
        return aiBoxes;

    }

    /**
     * runs maths detection and is the entry point to math module
     * @returns data structures containing detected display and inline maths
     */
    public run_math_detection(math_json:string){String
        console.log("math_JSONN completeddd!!!");
        var obj_detection_output = math_json;
        console.log("object_Detect_JsonObj o/p ====> " , obj_detection_output);

        console.log("datatype of obj_detection_output" , typeof(obj_detection_output));
        this.objectDetectJsonObj = JSON.parse(obj_detection_output);
        // this.objectDetectJsonObj = obj_detection_output;

        
        console.log("objectDetectJsonObj printing ====> " , JSON.stringify(this.objectDetectJsonObj));

        var numOfPages = this.pages.size;

        
        this.run_font_analysis();
        this.detect_display_maths();
        this.detect_inline_maths();

        return [this.object_detect_bbox_to_spans_inline, this.object_detect_bbox_to_spans_display];
    }


    /**
     * This function detects inline mathematics
     */
    public detect_inline_maths(){
        console.log("detect_inline_maths starteddd !!!");
        let allPages = Array.from(this.pages.values());

        for(let i = 0; i < allPages.length; i++){
            let page = allPages[i];

            let aiBoxes: any[] = [];
            // Read from file the detected bounding boxes by object detection
            aiBoxes = this.get_absolute_bounding_boxes(this.objectDetectJsonObj["p"+i], allPages[i].canvas);
            console.log("aiBoxes printing ===> ", aiBoxes);


            let alllines = Array.from(page.lines.values());
            let _canvas = page.canvas;
            console.log("lengthhhhhhhhhhhh:  ",alllines.length);
            for(let j = 0; j < alllines.length; j++){
                let line = alllines[j];
                let allAiBoxesOverlapping = [];
                for(let i = 0; i < aiBoxes.length; i++){
                    console.log("LINEEEE BBOX FROM MATH.TS ---------> ", line.bbox.box().toString());
                    if (helper.isIntersecting(line.bbox, aiBoxes[i])){
                        allAiBoxesOverlapping.push(aiBoxes[i]);
                    }
                }
                console.log("This lines has " + allAiBoxesOverlapping.length + " overlapping boxes");
                this.detect_inline_maths_in_line(line, aiBoxes, i);
            }

        }
    }

    /**
     * Detects inline maths for each line
     * @param line
     * @param aiBoxes bounding boxes of detected mathematics overlapping with the line
     * @param pageNum page number containing the line
     */


    public detect_inline_maths_in_line(line: Line, aiBoxes: Bbox[], pageNum: number){
        if (line.isLineDisplayMaths){
            return false;
        }

        let sortedSpans = Array.from(line._spans.values());
        for(let i=0; i<sortedSpans.length; i++){
            let minval = sortedSpans[i].bbox.minX;
            if (minval === Infinity){
                continue;
            }
            let postoswap = i;
            for(let j=i+1; j < sortedSpans.length; j++){
                if (sortedSpans[j].bbox.minX === Infinity){
                    continue;
                }
                if (sortedSpans[j].bbox.minX < minval){
                    postoswap = j;
                    minval = sortedSpans[j].bbox.minX;
                }
            }
            let temp = sortedSpans[i];
            sortedSpans[i] = sortedSpans[postoswap];
            sortedSpans[postoswap] = temp;
        }
        let i = 0, currMax = -1;
        while (i < sortedSpans.length){
            if (sortedSpans[i].bbox.minX === Infinity){
                i++;
                continue;
            }
            if (!helper.isIntersectingAnyBbox(sortedSpans[i].bbox, aiBoxes)){
                i++;
                continue;
            }
            let thisSpan = sortedSpans[i];
            let obj_detect_intersect_id = -1;
            for (let ind = 0; ind < aiBoxes.length; ind++){
                if (helper.isIntersecting(thisSpan.bbox, aiBoxes[ind])){
                    obj_detect_intersect_id = ind;
                    break;
                }
            }
            let j = i + 1;
            while (j < sortedSpans.length && (sortedSpans[j].bbox.minX === Infinity || helper.isIntersecting(sortedSpans[j].bbox, aiBoxes[obj_detect_intersect_id]))){
                j++;
            }
            let l = i-1, r = j;
            while(l > currMax){
                if (sortedSpans[l].bbox.minX === Infinity){
                    l--;
                    continue;
                }
                if (helper.isSpanProbablyMaths(sortedSpans[l], this.mostUsedFont, this.medianFontSize, line) && !helper.isIntersectingAnyBbox(sortedSpans[l].bbox, aiBoxes)){
                    l--;
                    continue;
                }
                break;
            }
            while(r < sortedSpans.length){
                if (sortedSpans[r].bbox.minX === Infinity){
                    r++;
                    continue;
                }
                if (helper.isSpanProbablyMaths(sortedSpans[r], this.mostUsedFont, this.medianFontSize, line) && !helper.isIntersectingAnyBbox(sortedSpans[r].bbox, aiBoxes)){
                    r++;
                    continue;
                }
                break;
            }
            i = r;
            currMax = r-1;
            for(let c = l+1; c <= r-1; c++){
                sortedSpans[c].hasMath = true;
                sortedSpans[c].object_detect_bbox_id = obj_detect_intersect_id;
                if (this.object_detect_bbox_to_spans_inline.has(pageNum)){
                    let page_val = this.object_detect_bbox_to_spans_inline.get(pageNum);
                    if (page_val.has(obj_detect_intersect_id)){
                        let span_arr = page_val.get(obj_detect_intersect_id);
                        span_arr.push(sortedSpans[c].id+ " " + sortedSpans[c].text());
                    } else {
                        let span_arr = [sortedSpans[c].id+ " " + sortedSpans[c].text()];
                        page_val.set(obj_detect_intersect_id, span_arr);
                    }
                } else {
                    let page_val: Map<number, string[]> = new Map<number, string[]>();
                    page_val.set(obj_detect_intersect_id, [sortedSpans[c].id+ " " + sortedSpans[c].text()]);
                    this.object_detect_bbox_to_spans_inline.set(pageNum, page_val);
                }
            }
        }
    }

    /**
     * This functions detect display mathematics on all the pages
     */

    public detect_display_maths(){
        let allPages = Array.from(this.pages.values());
        for (let i = 0; i < allPages.length; i++){
            let page = allPages[i];
            let lines = page.lines;
            let aiBoxes: any[] = [];
            // Read from file the detected bounding boxes by object detection
            aiBoxes = this.get_absolute_bounding_boxes(this.objectDetectJsonObj["p"+i], allPages[i].canvas);
            let obj_detect_bbox_map = this.object_detect_bbox_to_spans_display;
            lines.forEach(function (line) {
                let sortedSpans = Array.from(line._spans.values());
                for (let m = 0; m < aiBoxes.length; m++) {
                    const bbox2: any = aiBoxes[m];
                    let isDisplayMaths = helper.getIOUThreshold(line, bbox2);
                    if (isDisplayMaths){
                        line.isLineDisplayMaths = true;
                        line.object_detection_box_id = m; // this line is enclosed in (m)th object detection box in this page
                        let pageNum = i;
                        let obj_detect_intersect_id = m;
                        for (let c = 0; c < sortedSpans.length; c++){
                            sortedSpans[c].object_detect_bbox_id = obj_detect_intersect_id;
                            if (obj_detect_bbox_map.has(pageNum)){
                                let page_val = obj_detect_bbox_map.get(pageNum);
                                if (page_val.has(obj_detect_intersect_id)){
                                    let span_arr = page_val.get(obj_detect_intersect_id);
                                    span_arr.push(sortedSpans[c].id);
                                } else {
                                    let span_arr = [sortedSpans[c].id];
                                    page_val.set(obj_detect_intersect_id, span_arr);
                                }
                            } else {
                                let page_val: Map<number, string[]> = new Map<number, string[]>();
                                page_val.set(obj_detect_intersect_id, [sortedSpans[c].id]);
                                obj_detect_bbox_map.set(pageNum, page_val);
                            }
                        }
                        break;
                    }
                }
            });
        }
    }

    /**
     * This runs font analysis for classifying most used Maths font name and median font size
     */

    public run_font_analysis(){
        let allPages = Array.from(this.pages.values());
        for (let i = 0; i < allPages.length; i++){
            let page = allPages[i];
            let aiBoxes: any[] = [];
            // Read from file the detected bounding boxes by object detection
            aiBoxes = this.get_absolute_bounding_boxes(this.objectDetectJsonObj["p"+i], allPages[i].canvas);
            let lines = Array.from(page.lines.values());
            for(let j = 0; j < lines.length; j++){
                let line = lines[j];
                let allAiBoxesOverlapping = [];
                for(let l = 0; l < aiBoxes.length; l++){
                    if (helper.isIntersecting(line.bbox, aiBoxes[l])){
                        allAiBoxesOverlapping.push(aiBoxes[l]);
                    }
                }
                let sortedSpans = Array.from(line._spans.values());
                for (let k = 0; k < sortedSpans.length; k++){
                    if (helper.isIntersectingAnyBboxHorizontal(sortedSpans[k].bbox, allAiBoxesOverlapping)){
                        let fontName = helper.getFontNameFromFont(sortedSpans[k].html.getAttribute('has-fontFace'));
                        console.log("Adding to math font freq map " + sortedSpans[k].text() + " " + fontName);
                        if (this.mathFontNamesFreq.has(fontName)){
                            this.mathFontNamesFreq.set(fontName, this.mathFontNamesFreq.get(fontName) + 1);
                        } else {
                            this.mathFontNamesFreq.set(fontName, 1);
                        }
                    }
                    this.allFontsSizes.push(helper.getFontSizeFromFont(sortedSpans[k].html.getAttribute('has-fontFace')));
                }
            }
        }

        let miniFreq = -1;
        for (let [key, value] of this.mathFontNamesFreq){
            if (value > miniFreq){
                this.mostUsedFont = key;
                miniFreq = value;
            }
        }
        for (let [key, value] of this.mathFontNamesFreq){
            console.log(key + "-----------" + value);
        }
        console.log("Most used font is " + this.mostUsedFont);

        this.allFontsSizes.sort(function (a: number, b: number) {
            return a-b;
        });
        console.log("Size of all fonts array is " + this.allFontsSizes.length);
        console.log("Median font size is " + this.medianFontSize);
        this.medianFontSize = this.allFontsSizes[Math.floor(this.allFontsSizes.length/2)];
        console.log("Median font size is " + this.medianFontSize);
        console.log("Min font size is " + this.allFontsSizes[0]);
        console.log("Max font size is " + this.allFontsSizes[this.allFontsSizes.length-1]);

    }

}
