/**
 * @fileoverview Convex Hull Algorithm
 */

import { Pixel, Pixels } from '../utility/utils';

/**
 * An enum denoting a directional-turn between 3 points (vectors).
 */
enum Turn {
  CLOCKWISE,
  COUNTER_CLOCKWISE,
  COLLINEAR
}

const HULL_MIN = 3;

/**
 * Returns true iff all points in <code>points</code> are collinear.
 *
 * @param points
 *          the list of points.
 * @return true iff all points in <code>points</code> are collinear.
 */
function areAllCollinear(points: Pixels): boolean {
  if (points.length < 2) {
    return true;
  }
  const a = points[0],
    b = points[1];
  for (const c of points.slice(2)) {
    if (getTurn(a, b, c) !== Turn.COLLINEAR) {
      return false;
    }
  }
  return true;
}

/**
 * Returns the convex hull of the points created from the list
 * <code>points</code>. Note that the first and last point in the returned
 * <code>List&lt;java.awt.Point2d&gt;</code> are the same point.
 *
 * @param points
 *          the list of points.
 * @return the convex hull of the points created from the list
 *         <code>points</code>.
 * @throws IllegalArgumentException
 *           if all points are collinear or if there are less than 3 unique
 *           points present.
 */
export default function GrahamScan(points: Pixels): Pixels {
  const sorted = getSortedPoint2dSet(points),
    stack: Pixels = [];
  if (sorted.length < HULL_MIN) {
    return stack;

    /*
     * Or throw new Error("can only create a convex hull of"
     *    + " 3 or more unique points");
     */
  }
  if (areAllCollinear(sorted)) {
    return stack;

    /*
     * Or throw new Error("cannot create a convex hull from "
     *    + "collinear points");
     */
  }
  stack.push(sorted[0]);
  stack.push(sorted[1]);
  for (let i = 2; i < sorted.length; i++) {
    const head = sorted[i],
      middle = stack.pop(),
      tail = stack[stack.length - 1],
      turn = getTurn(tail, middle, head);
    switch (turn) {
      case Turn.COUNTER_CLOCKWISE:
        stack.push(middle);
        stack.push(head);
        break;
      case Turn.CLOCKWISE:
        i--;
        break;
      case Turn.COLLINEAR:
        stack.push(head);
        break;
      default:
        break;
    }
  }
  // Close the hull
  stack.push(sorted[0]);
  return stack;
}

/**
 * Returns the points with the lowest y coordinate. In case more than 1 such
 * point exists, the one with the lowest x coordinate is returned.
 *
 * @param points
 *          the list of points to return the lowest point from.
 * @return the points with the lowest y coordinate. In case more than 1 such
 *         point exists, the one with the lowest x coordinate is returned.
 */
function getLowestPoint2d(points: Pixels): Pixel {
  let lowest = points[0];
  for (let i = 1; i < points.length; i++) {
    const temp = points[i];
    if (temp[1] < lowest[1] || (temp[1] === lowest[1] && temp[0] < lowest[0])) {
      lowest = temp;
    }
  }
  return lowest;
}

/**
 * Returns a sorted set of points from the list <code>points</code>. The set
 * of points are sorted in increasing order of the angle they and the lowest
 * point <tt>P</tt> make with the x-axis. If two (or more) points form the
 * same angle towards <tt>P</tt>, the one closest to <tt>P</tt> comes first.
 *
 * @param points
 *          the list of points to sort.
 * @return a sorted set of points from the list <code>points</code>.
 * @see GrahamScan#getLowestPoint2d(java.util.List)
 */
function getSortedPoint2dSet(points: Pixels): Pixels {
  const lowest = getLowestPoint2d(points);
  points.sort((a0, b0) => {
    if (a0 === b0) {
      return 0;
    }
    const thetaA = Math.atan2(a0[1] - lowest[1], a0[0] - lowest[0]),
      thetaB = Math.atan2(b0[1] - lowest[1], b0[0] - lowest[0]);
    if (thetaA < thetaB) {
      return -1;
    }
    if (thetaA > thetaB) {
      return 1;
    }
    // Collinear with 'lowest' point, let the point closest to it come first.
    const distanceA = Math.sqrt(
        (lowest[0] - a0[0]) * (lowest[0] - a0[0]) +
          (lowest[1] - a0[1]) * (lowest[1] - a0[1])
      ),
      distanceB = Math.sqrt(
        (lowest[0] - b0[0]) * (lowest[0] - b0[0]) +
          (lowest[1] - b0[1]) * (lowest[1] - b0[1])
      );
    return distanceA < distanceB ? -1 : 1;
  });
  return points;
}

/**
 * Returns the GrahamScan#Turn formed by traversing through the ordered points
 * <code>a</code>, <code>b</code> and <code>c</code>. More specifically, the
 * cross product <tt>C</tt> between the 3 points (vectors) is calculated:
 *
 * <tt>(b.x-a.x * c.y-a.y) - (b.y-a.y * c.x-a.x)</tt>
 *
 * <p>
 * and if <tt>C</tt> is less than 0, the turn is CLOCKWISE, if <tt>C</tt> is
 * more than 0, the turn is COUNTER_CLOCKWISE, else the three points are
 * COLLINEAR.
 *
 * @param a0
 *          the starting point.
 * @param b0
 *          the second point.
 * @param c0
 *          the end point.
 * @return the GrahamScan#Turn formed by traversing through the ordered points
 *         <code>a0</code>, <code>b0</code> and <code>c0</code>.
 */
function getTurn(a0: Pixel, b0: Pixel, c0: Pixel): Turn {
  const crossProduct =
    (b0[0] - a0[0]) * (c0[1] - a0[1]) - (b0[1] - a0[1]) * (c0[0] - a0[0]);
  return crossProduct > 0
    ? Turn.COUNTER_CLOCKWISE
    : crossProduct < 0
    ? Turn.CLOCKWISE
    : Turn.COLLINEAR;
}
