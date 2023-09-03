/**
 * @fileoverview Acts as a helper for background_analysis.ts.
 * Contains functions required in background_analysis.
 * library_agglo & remove_enclosed : Used for clustering bounding boxes.
 * assign_division_syms : Used for identifying and marking bounding boxes as division symbols.
 *
 * @author Pushpa Raj & Nikhil
 */

import { BigBbox } from './BigBbox';
import { Span } from '../core/span';
import Bbox from '../utility/bbox';
import { BboxThresholds } from '../global/parameters';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const agglo = require('./aggloClustering/custom_index.js');

/**
 *Author : Pushpa Raj & Nikhil.
 *@param: {Bounding Boxes, Bbox_Thresholds.cluster_threshold, children_check}
 * Performs clustering on the bounding boxes using library implemention of hierarchial agglomerative clustering.
 * Clusters non-math boxes and math boxes seperately.
 * If children check is true, the enclosing cluster is assigned as a parent of all the bounding boxes it encloses. Else, only the cluster is recognized as a box.
 * Output : Returns bounding boxes after clustering is finished.
 **/
export const library_agglo = function (
  big_boxes: BigBbox[],
  children_check: boolean
) {
  if (big_boxes.length == 0) {
    return big_boxes;
  }

  /* Seperate regular boxes and math boxes */
  let normal_big_boxes: BigBbox[] = big_boxes.filter((bb) => !bb.isMathSym);
  let math_big_boxes: BigBbox[] = big_boxes.filter((bb) => bb.isMathSym);
  /*Performing clustering seperately on normal boxes and math boxes*/
  normal_big_boxes = library_agglo_help(normal_big_boxes, children_check);
  math_big_boxes = library_agglo_help(math_big_boxes, children_check);

  /*For math clusters , assign true for math symbol*/
  math_big_boxes.forEach((bb) => (bb.isMathSym = true));

  /*Combine them back*/
  return normal_big_boxes.concat(math_big_boxes);
};

/**
 *Author : Pushpa Raj & Nikhil.
 * Helper function for library_agglo.
 * Output : Returns bounding boxes after clustering is finished.
 **/
export const library_agglo_help = function (
  big_boxes: BigBbox[],
  children_check: boolean
) {
  const bboxThreshold = new BboxThresholds();
  const threshold = bboxThreshold.bgBoxParameters.get('smallClusterThreshold');
  if (big_boxes.length == 0) {
    return big_boxes;
  }

  /* Distance function : 0 if the boxes are enclosing else Euclidean distance */
  const bb_dist = (b1: Bbox, b2: Bbox) => {
    return Bbox.verticalOverlap(b1, b2)[0] && Bbox.horizontalOverlap(b1, b2)[0]
      ? 0
      : Bbox.distance(b1, b2);
  };

  /* "levels" return an array, clusters at each stage of clustering are present in the array.
       Finally, in the last index, final clusters after all the clustering  is done remain.*/
  const levels = agglo(big_boxes, {
    maxLinkage: threshold,
    linkage: 'single',
    distance: bb_dist
  });

  if (levels.length == 0) {
    return big_boxes;
  }

  const cluster = levels[levels.length - 1].clusters; //Array containing each of the clusters.
  big_boxes = new Array(cluster.length); //Create a bounding box for each of the clusters.

  for (let i = 0; i < cluster.length; i++) {
    let parent = new BigBbox(cluster[i][0].pixels()); //This will be the bounding box to hold entire cluster.

    /* Dimensions of the box will be the extremes of the boxes clustered */
    for (let j = 1; j < cluster[i].length; j++) {
      parent.minX = Math.min(parent.minX, cluster[i][j].minX);
      parent.minY = Math.min(parent.minY, cluster[i][j].minY);
      parent.maxX = Math.max(parent.maxX, cluster[i][j].maxX);
      parent.maxY = Math.max(parent.maxY, cluster[i][j].maxY);
    }

    /* If children_check = true, make all the clustered boxes children of the cluster */
    if (children_check) {
      if (cluster[i].length == 1) {
        parent = cluster[i][0]; // In case there is only on child, there is no need to put a child
      } else {
        for (let j = 0; j < cluster[i].length; j++) {
          parent.children.push(cluster[i][j]);
        }
      }
    }

    big_boxes[i] = parent;
  }

  return big_boxes;
};

/**
 *Author : Pushpa Raj & Nikhil.
 *@param: {Bounding Boxes}
 * Assigns a parent-child relation between a bigger bounding box and the smaller ones it encloses.
 * Instead of having multiple boxes we can consider the enclosing box as a parent and set the inside ones as the children of the bigger box.
 *
 * Output : Returns bounding boxes after making a bounding box child of the one enclosing it.
 **/
export const remove_enclosed = function (big_boxes: BigBbox[]) {
  /*Boxes are sorted according to minX and minY values. So, each box can be enclosed only inside its predecessors in the array*/
  big_boxes.sort(function (a, b) {
    const d = [
      a.minX - b.minX,
      a.minY - b.minY,
      a.maxX - b.maxX,
      a.maxY - b.maxY
    ];
    return d[0] < 0
      ? -1
      : d[0] > 0
      ? 1
      : d[1] < 0
      ? -1
      : d[1] > 0
      ? 1
      : d[2] < 0
      ? 1
      : d[2] > 0
      ? -1
      : d[3] < 0
      ? 1
      : -1;
  });

  const no_parent = []; //This will finally contain boxes that not enclosed inside any other ones.

  for (let j = big_boxes.length - 1; j >= 0; j--) {
    let enclosed = false;

    /*Iterate on predecessors and if it enclosed in any of them, make it as a child of the enclosing box*/
    for (let i = j - 1; i >= 0; i--) {
      if (
        big_boxes[i].minY <= big_boxes[j].minY &&
        big_boxes[i].maxX >= big_boxes[j].maxX &&
        big_boxes[i].maxY >= big_boxes[j].maxY
      ) {
        big_boxes[i].children.push(big_boxes[j]);
        enclosed = true;
        break;
      }
    }

    /* Check if all it's children are math boxes, if so make it also a math box.*/
    if (!big_boxes[j].isMathSym && big_boxes[j].children.length > 0) {
      const num_math_childs = big_boxes[j].children.filter(
        (bb) => bb.isMathSym
      ).length;
      if (num_math_childs == big_boxes[j].children.length) {
        big_boxes[j].isMathSym = true;
      }
    }

    if (!enclosed) {
      no_parent.push(j);
    }
  }

  no_parent.reverse();

  /* Finally filter out boxes that have no parent. All other boxes, would have become children of one of these*/
  big_boxes = no_parent.map((index) => big_boxes[index]);

  return big_boxes;
};

/**
 *Author : Pushpa Raj & Nikhil.
 *@param: {Bounding Boxes, Spans, ....(thresholds)}
 * Identifies and labels a bounding box if it is a division symbol.
 * Output : No output, just marks division symbols.
 */
export const assign_division_syms = function (
  input_boxes: BigBbox[],
  span_list: Span[]
) {
  const bboxThreshold = new BboxThresholds(),
    X_Threshold = [
      bboxThreshold.bgBoxParameters.get('divXThresholdLowerLimit'),
      bboxThreshold.bgBoxParameters.get('divXThresholdUpperLimit')
    ],
    Y_Threshold = bboxThreshold.bgBoxParameters.get('divYThreshold'),
    Y_t = bboxThreshold.bgBoxParameters.get('divSpanboxYthreshold'),
    X_t = bboxThreshold.bgBoxParameters.get('divSpanboxXthreshold');
  /*Filter bounding boxes that satisy division symbol dimensions*/
  let big_boxes = input_boxes.filter(
    (x) =>
      x.maxY - x.minY <= Y_Threshold &&
      x.maxX - x.minX <= X_Threshold[1] &&
      x.maxX - x.minX >= X_Threshold[0]
  );

  /*Use span_list to create span_boxes*/
  let span_boxes = span_list.map((x) => x.bbox);

  if (big_boxes.length == 0) {
    return;
  }

  let [mini_X, maxi_X, mini_Y, maxi_Y] = [
    big_boxes[0].minX,
    big_boxes[0].maxX,
    big_boxes[0].minY,
    big_boxes[0].maxY
  ];

  for (let i = 0; i < big_boxes.length; i++) {
    [mini_X, maxi_X, mini_Y, maxi_Y] = [
      Math.min(mini_X, big_boxes[i].minX),
      Math.max(maxi_X, big_boxes[i].maxX),
      Math.min(mini_Y, big_boxes[i].minY),
      Math.max(maxi_Y, big_boxes[i].maxY)
    ];
  }

  /*Filter out span_boxes that are completely out of range of the division symbols*/
  span_boxes = span_boxes.filter(
    (x) =>
      !(
        x.maxX < mini_X ||
        x.minX > maxi_X ||
        x.maxY < mini_Y - Y_t ||
        x.minY > maxi_Y + Y_t
      )
  );

  /*Filter out span_boxes that are not close enough to the bounding boxes*/
  span_boxes = span_boxes.filter((x) => this.spans_near_bbs(x, big_boxes, Y_t));
  span_boxes.sort(function (a, b) {
    return a.minY < b.minY ? -1 : 1;
  });

  /*Identify division symbols using the span_boxes near them.*/
  big_boxes = big_boxes.filter((x) => is_division(x, span_boxes, Y_t, X_t));

  /*Mark the boxes as division and math symbol*/
  big_boxes.forEach((bb) => {
    bb.isMathSym = true;
    bb.isDivisionSym = true;
  });
};

/**
 * Author : Pushpa Raj & Nikhil.
 * @param: {Span Box, Bounding boxes, Bbox_Thresholds.div_spanbox_ythreshold}
 * Output : Boolean, checks if the span box is vertically near enough
 * and horizontally overlaps any of the bounding boxes.
 **/
export const spans_near_bbs = function (
  span_box: Bbox,
  big_boxes: BigBbox[],
  Y_t: number
) {
  if (big_boxes.length == 0) {
    return false;
  }
  big_boxes.sort(function (a, b) {
    return a.minY < b.minY ? -1 : 1;
  }); // Sort all boxes in increasing minY.

  let [lower, upper, start, end, current] = [
    span_box.minY - Y_t,
    span_box.maxY + Y_t,
    0,
    big_boxes.length - 1,
    -1
  ];

  /* Finding if there is a bounding box in the vertical threshold distance above the span box.
       upper & lower are the threshold distances above & below respectively.
       Here the bounding boxes are ordered in increasing minY. So, we perform binary search on boxes list.
       If found, current != -1.                                                                            */
  while (start <= end) {
    const mid = Math.floor((start + end) / 2);
    big_boxes[mid].minY > upper
      ? (end = mid - 1)
      : big_boxes[mid].minY < lower
      ? (start = mid + 1)
      : (current = mid);
    if (current == mid) {
      break;
    }
  }

  if (current == -1) {
    return false;
  }

  /* Finding the first bounding box that is the threshold range above the span box. */
  while (start <= end) {
    if (
      current == 0 ||
      (big_boxes[current].minY >= lower && big_boxes[current - 1].minY < lower)
    ) {
      break;
    }
    big_boxes[current].minY < lower
      ? (start = current + 1)
      : (end = current - 1);
    current = Math.floor((start + end) / 2);
  }

  /* Iterate on the bounding boxes starting from current to see if any bounding box horizontally overalps the span box. */
  while (!(current == big_boxes.length || big_boxes[current].minY > upper)) {
    //break when bounding box goes out of vertical range
    if (
      big_boxes[current].minX > span_box.maxX ||
      big_boxes[current].maxX < span_box.minX
    ) {
      //Not overalapping horizontally.
      current++;
    } else {
      return true; //Overlapping found
    }
  }

  return false;
};

/**
 *Author : Pushpa Raj & Nikhil.
 *@param: {Bounding Box, Span boxes, Bbox_Thresholds.div_spanbox_ythreshold, Bbox_Thresholds.div_spanbox_xthreshold}
 *
 * Output : Boolean, checks if the given bounding box is a division symbol by analysing span boxes. Specifically checks if there are span boxes above and below the bounding box.
 **/
export const is_division = function (
  big_box: BigBbox,
  span_boxes: Bbox[],
  Y_t: number,
  X_t: number
) {
  let [up, down, lower, upper, start, end, current] = [
    false,
    false,
    big_box.minY - Y_t,
    big_box.maxY + Y_t,
    0,
    span_boxes.length - 1,
    -1
  ];

  /* Finding if there is a span_boxes in the vertical threshold distance above the bounding box.
       upper & lower are the threshold distances above & below respectively.
       Here the span_boxes are ordered in increasing minY. So, we perform binary search on span_boxes list.
       If found, current != -1.                                                                            */
  while (start <= end) {
    const mid = Math.floor((start + end) / 2);
    span_boxes[mid].minY > upper
      ? (end = mid - 1)
      : span_boxes[mid].maxY < lower
      ? (start = mid + 1)
      : (current = mid);
    if (current == mid) {
      break;
    }
  }

  if (current == -1) {
    return false;
  }

  end = current;

  /* Finding the first span box that is the threshold range above the bounding box. */
  while (start <= end) {
    if (
      current == 0 ||
      (span_boxes[current].maxY >= lower &&
        span_boxes[current - 1].maxY < lower)
    ) {
      break;
    }
    span_boxes[current].maxY < lower
      ? (start = current + 1)
      : (end = current - 1);
    current = Math.floor((start + end) / 2);
  }

  for (let i = current; i < span_boxes.length; i++) {
    if (span_boxes[i].minY > big_box.maxY + Y_t) {
      break;
    } // If the span_boxes go out of vertical range break the loop.
    if (
      span_boxes[i].maxX < big_box.minX ||
      span_boxes[i].minX > big_box.maxX
    ) {
      continue;
    } // If span_box is out of horizontal range , continue.

    if (
      span_boxes[i].maxY >= big_box.minY - Y_t &&
      span_boxes[i].maxY < big_box.minY
    ) {
      // Span box is above the bounding box and is in vertical threshold range
      if (
        span_boxes[i].minX < big_box.minX - X_t ||
        span_boxes[i].maxX > big_box.maxX + X_t
      ) {
        return false;
      } // If span_box is in vertical range and overallps horizontally but goes outside bounding box range horizontally, the bounding box is not a division symbol.
      up = true; // Marks that a satisfying span_box is found above the division symbol
    } else if (
      span_boxes[i].minY <= big_box.maxY + Y_t &&
      span_boxes[i].minY > big_box.maxY
    ) {
      // Span box is below the bounding box and is in vertical threshold range
      if (
        span_boxes[i].minX < big_box.minX - X_t ||
        span_boxes[i].maxX > big_box.maxX + X_t
      ) {
        return false;
      } // If span_box is in vertical range and overallps horizontally but goes outside bounding box range horizontally, the bounding box is not a division symbol.
      down = true; // Marks that a satisfying span_box is found below the division symbol
    }
  }

  return up && down;
};
