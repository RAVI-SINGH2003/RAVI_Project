/*
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
 * @docThresholdCalc Class for a detecting headings for a document
 *
 * @author nehamjadhav@gmail.com Neha Jadhav
 */

/**
 * Class has all threshold (constant parameters) for radical symbol detection
 */
export class symbolDetectionThreshold {
  public symbolParameters: Map<string, number> = new Map([
    ['confidenceThresh', 0.85],
    ['douglasPeuckerThresh', 0.1],
    ['degreeOfTolForStraightenForest', 20],
    ['percentColoredThresh', 55],
    ['clusThresh', 0.1],
    ['tooBigBoxArea', 150000],
    ['tooSmallBoxArea', 5],
    ['clusThresh', 0.1]
  ]);
}

/**
 * Class has all threshold (constant parameters) for caption detection
 */
export class captionThresholds {
  public captionParameters: Map<string, number> = new Map([
    ['h_threshold', 0.026], // Threshold near glyph
    ['v_threshold', 0.011], // Threshold near glyph
    ['l_threshold', 0.4] // Threshold near line
  ]);
}
/**
 * Class has all threshold (constant parameters) for background box analysis
 */
export class BboxThresholds {
  public bgBoxParameters: Map<string, number> = new Map([
    ['clusterThreshold', 35], // Maximum distance at which clusters can be clustered
    ['vsmallArea', 20], // Minimum area the boxes will be considered for clustering
    ['smallArea', 2000], // Area under which the boxes are not clustered
    ['smallClusterThreshold', 10], // Maximum distance at which small boxes can be clustered
    ['divYThreshold', 5], // Maximum height of a box to be considered as a division symbol
    ['divSpanboxYthreshold', 37], // Vertical distance between a span box and division symbol
    //to be considered as a unit
    ['divSpanboxXthreshold', 10], // Horizontal seperation under which a span box and division
    //symbol to be considered as a unit
    ['divXThresholdLowerLimit', 15],
    ['divXThresholdUpperLimit', 800]
  ]);
}

/**
 * Class has all threshold (constant parameters) for column detection
 */
export class colDetectionThreshold {
  public colDetectParameters: Map<string, number> = new Map([
    ['maxNoOfPagesToConsider', 5],
    ['threshhold_For_Pixel_Ratio_bw_Column_And_GutterWidth', 3],
    ['initial_Eps_For_Gutter_Width', 6],
    ['allowed_bg_Fraction_For_Col_Detection_Page', 0.3]
  ]);
}

/**
 * Class has all threshold (constant parameters) for header footer detection
 */
export class headerFooterDetectionThreshold {
  public headerFooterDetectParameters: Map<string, number> = new Map([
    ['pixel_error', 5],
    ['page_window_size', 6],
    ['line_window_size', 3],
    ['probable_area', 0.3],
    ['num_match', 2],
    ['justification_closeness', 3 / 100]
  ]);
}

/**
 * Class has all threshold (constant parameters) for header footer detection
 */
export class headerFooterParameters {
  public headerFooterDetectParameters: Map<string, number> = new Map([
    ['pixel_error', 5],
    ['page_window_size', 6],
    ['line_window_size', 3],
    ['probable_area', 0.3],
    ['num_match', 2],
    ['justification_closeness', 3 / 100]
  ]);
}

/**
 * Class has all threshold (constant parameters) for bordered table detection
 */
export class tableThreshold {
  public tableDetectParameters: Map<string, number> = new Map([
    ['vlinethres', 210],
    ['hlinethres', 240],
    ['tkn', 1],
    ['min_line_dist', 25]
  ]);
  
}

export class mathDetectionParameters{

  public mathDetectionParameters : Map<string, number> = new Map([
    ['iouThreshold_high', 0.7],
    ['iouThreshold_low', 0.1],

  ])

}

export class itemlistParameters{

  public romanValueMapping = new Map([
    ['I', 1], 
    ['i', 1],
    ['V', 5],
    ['v', 5],
    ['X', 10],
    ['x', 10]
]);

}