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
import {Span} from '../core/span';
import {mathDetectionParameters} from '../global/parameters';

export namespace helper{

    /**
     * Returns if two bounding boxes have any overlap or not
     * @param bbox1
     * @param bbox2
     */
    export let isIntersecting = function(bbox1: Bbox, bbox2: Bbox){
        if (bbox1.minX >= bbox2.maxX || bbox2.minX >= bbox1.maxX){
            return false;
        }
        if (bbox1.minY >= bbox2.maxY || bbox2.minY >= bbox1.maxY){
            return false;
        }
        let xA = Math.max(bbox1.minX, bbox2.minX);
        let yA = Math.max(bbox1.minY, bbox2.minY);
        let xB = Math.min(bbox1.maxX, bbox2.maxX);
        let yB = Math.min(bbox1.maxY, bbox2.maxY);
        let interArea = (xB - xA) * (yB - yA);

        return interArea > 0;
    }


    /**
     * Returns if bbox1 intersects with any bbox in bboxes
     * @param bbox1 
     * @param bboxes 
     * @returns boolean
     */
    export let isIntersectingAnyBbox = function (bbox1: Bbox, bboxes: Bbox[]) {
        for(let i = 0; i < bboxes.length; i++){
            if (isIntersecting(bbox1, bboxes[i])){
                return true;
            }
        }

        return false;
    }

    /**
     * Returns if the two bounding boxes have any overlap on horizontal axis
     * @param bbox1
     * @param bbox2
     */

    export let isIntersectingHorizontal = function(bbox1: Bbox, bbox2: Bbox){
        let first = bbox1;
        let second = bbox2;
        if (bbox1.minX > bbox2.minX){
            let tmp = first;
            first = second;
            second = tmp;
        }

        return second.minX < first.maxX;
    }

    /**
     * Returns if bbox1 overlaps with by of the bboxes on horizontal axis
     * @param bbox1
     * @param bboxes
     */
    export let isIntersectingAnyBboxHorizontal = function(bbox1: Bbox, bboxes: Bbox[]){
        for(let i = 0; i < bboxes.length; i++){
            if (isIntersectingHorizontal(bboxes[i], bbox1)){
                return true;
            }
        }

        return false;
    }

    /**
     * Returns font name from font.
     * @param font including font name and size
     * @return font name
     */
    export let getFontNameFromFont = function (font: string){
        let fontName = "";
        let i = 0;
        while (i < font.length && !(font[i] >= '0' && font[i] <= '9')){
            fontName += font[i];
            i++;
        }

        return fontName;
    }

    /**
     * Returns font size from font
     * @param font including font name and size
     * @return font name
     */

    export let getFontSizeFromFont = function (font: string) {
        let fontSize = 0;
        let i = font.length-1;
        let ind = 0;
        while(i >= 0 && (font[i] >= '0' && font[i] <= '9')){
            fontSize += Number.parseInt(font[i]) * Math.pow(10, ind);
            i--;
            ind++;
        }

        return fontSize;

    }

    /**
     * Returns if the span can probably be maths
     * @param span
     * @param mostUsedFont most used maths font based on detected mathematics from object detection
     * @param medianFontSize median font size of the document
     */
    export let isSpanProbablyMaths = function (span: Span, mostUsedFont: string, medianFontSize: number, line: Line){

        let fontSize = helper.getFontSizeFromFont(span.html.getAttribute('has-fontFace'));
        let fontName = helper.getFontNameFromFont(span.html.getAttribute('has-fontFace'));
        let usesMathFonts = span.html.getAttribute('has-fontFace').match(/^CM[^R]|Symbol/i);
        let usesCMSY = span.html.getAttribute('has-fontFace').match("CMSY");
        let usesMostUsedFont = span.html.getAttribute('has-fontFace').match(mostUsedFont)!==null;
        let doesNotUseCMR = fontName !== "CMR"
        let usesFontSizeLessThanMedian = fontSize < medianFontSize;
        let isNotVerticallyAligned = Math.abs((span.bbox.minY + (span.bbox.maxY - span.bbox.minY)/2) - (line.bbox.minY + (line.bbox.maxY - line.bbox.minY)/2)) > 5;
        let isSubSuperScript = (fontSize < medianFontSize) && (isNotVerticallyAligned);
        const mathSymbols = new Set(["+", "-", "/", "lim", "\u2211", "\u00D7", "\u222B", "\u00F7"]);
        let isMathSymbol = mathSymbols.has(span.text().trim());
        let isEmptyText = span.text().trim() == "";
        let isNumeral = span.text() >= '0' && span.text() <= '9';
        let isBrackets = span.text() == "(" || span.text() == ")" || span.text() == "{" || span.text() == "}";
        
        return (usesMathFonts!==null)  || /*(usesCMR!==null) ||*/ (usesCMSY!==null) || (isMathSymbol) || (usesMostUsedFont && doesNotUseCMR) /*|| (usesFontSizeLessThanMedian)*/
            || (isNumeral) || (isEmptyText) || (isBrackets) || (isSubSuperScript);
    }

    /**
     * Returns if the considering line bbox and object detection bbox, if we can consider this as display maths or not
     * @param line
     * @param bbox2 bounding box from object detection
     * @author shivansh
     */

    export let getIOUThreshold = function(line: Line, bbox2: Bbox){
        let Threshold = new mathDetectionParameters();
        let bbox1 = line.bbox;
        if (bbox1.minX >= bbox2.maxX || bbox2.minX >= bbox1.maxX){
            return 0;
        }
        if (bbox1.minY >= bbox2.maxY || bbox2.minY >= bbox1.maxY){
            return 0;
        }
        let xA = Math.max(bbox1.minX, bbox2.minX);
        let yA = Math.max(bbox1.minY, bbox2.minY);
        let xB = Math.min(bbox1.maxX, bbox2.maxX);
        let yB = Math.min(bbox1.maxY, bbox2.maxY);
        let interArea = (xB - xA) * (yB - yA)
        let interWidth = xB - xA;
        let boxAArea = (bbox1.maxX - bbox1.minX) * (bbox1.maxY - bbox1.minY);
        let boxBArea = (bbox2.maxX - bbox2.minX) * (bbox2.maxY - bbox2.minY);
        let iou = interArea /(boxAArea);

        // Checks if this the intersection area is greater than mathDetection.iouThreshold_high => directly return true
        // Checks if this the intersection area is less than mathDetection.iouThreshold_high => directly return false
        if (iou > Threshold.mathDetectionParameters.get('iouThreshold_high')){
            return true;
        } else if (iou < Threshold.mathDetectionParameters.get('iouThreshold_low')){
            return false;
        }

        //Now all calculations on width instead of area
        let widthThresh = (interWidth)/(bbox1.maxX - bbox1.minX);
        if (widthThresh > Threshold.mathDetectionParameters.get('iouThreshold_high')){
            return true;
        }

        //getting spans and then sorting in increasing order of minX
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


        //This is the logic to check if the line has equation number at the end
        let endString = "";
        let i = sortedSpans.length - 1;
        for(; i >= 0; i--){
            endString = sortedSpans[i].text() + endString;
            endString = endString.trim();
            if (endString[0] == '(' && endString[endString.length-1] == ')'){
                i--;
                break;
            }
        }

        //If the line do not have (*) in the end => directly return false
        if (!(endString[0] == '(' && endString[endString.length-1] == ')')){
            return  false;
        }
        for(; i>=0; i--){
            if (!sortedSpans[i].hasSpace()) {
                break;
            }
        }

        //If all text in a line is of the form (*)=> directly return false
        if (i < 0){
            return false;
        }

        //Remove the area taken by <space^*>(*)
        boxAArea -= (line.bbox.maxX - sortedSpans[i].bbox.maxX) * ((line.bbox.maxY - line.bbox.minY));
        iou = interArea/boxAArea;
        if (iou > Threshold.mathDetectionParameters.get('iouThreshold_high')){
            return true;
        }

        //After removing if the area intersection is less than mathDetection.iouThreshold_low => directly return false
        if (iou < Threshold.mathDetectionParameters.get('iouThreshold_low')){
            return false;
        }
        interWidth -= (line.bbox.maxX - sortedSpans[i].bbox.maxX);
        widthThresh = interWidth/(bbox1.maxX - bbox1.minX);

        //If width after removal is greater than mathDetection.iouThreshold_high => directly return true
        if (widthThresh > Threshold.mathDetectionParameters.get('iouThreshold_high')){
            return true;
        }

        //If every chance to return true fails => return false at the end
        return false;
    }
}
