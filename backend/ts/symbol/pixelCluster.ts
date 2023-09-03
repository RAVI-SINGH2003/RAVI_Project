import { myPixel } from './arrow';
import * as arrow from './arrow';

export let CLUSTER_EPSILON = 2;
export let EPSILON = 0.0001;

export class Cluster {
  public mode: myPixel;
  public original_points: myPixel[];
  public shifted_points: myPixel[];
  constructor() {
    this.original_points = [];
    this.shifted_points = [];
  }
}

const gaussian_kernel = function (
    dist: number,
    kernel_bandwidth: number
  ): number {
    const temp = Math.exp(
      (-0.5 * (dist * dist)) / (kernel_bandwidth * kernel_bandwidth)
    );
    return temp;
  },
  shift_point = function (
    point: myPixel,
    points: myPixel[],
    kernel_bandwidth: number
  ): myPixel {
    const shifted_point: myPixel = new myPixel();
    shifted_point.x = 0;
    shifted_point.y = 0;
    let total_weight = 0;
    for (let i = 0; i < points.length; ++i) {
      const temp_point = points[i],
        dist = arrow.distance(point, temp_point),
        weight = gaussian_kernel(dist, kernel_bandwidth);
      shifted_point.x += temp_point.x * weight;
      shifted_point.y += temp_point.y * weight;
      total_weight += weight;
    }
    if (total_weight == 0) {
      return point;
    }
    shifted_point.x /= total_weight;
    shifted_point.y /= total_weight;
    return shifted_point;
  },
  meanShift = function (
    points: myPixel[],
    kernel_bandwidth: number
  ): myPixel[] {
    const stop_moving: boolean[] = [];
    for (let i = 0; i < points.length; ++i) {
      stop_moving.push(false);
    }
    const shifted_points = [];
    for (let i = 0; i < points.length; ++i) {
      const pix = new myPixel();
      pix.x = points[i].x;
      pix.y = points[i].y;
      shifted_points.push(pix);
    }
    let max_shift_distance: number;

    do {
      max_shift_distance = 0;
      for (let i = 0; i < points.length; ++i) {
        if (!stop_moving[i]) {
          const point_new = shift_point(
              shifted_points[i],
              shifted_points,
              kernel_bandwidth
            ),
            shift_dist = arrow.distance(point_new, shifted_points[i]);
          max_shift_distance = Math.max(max_shift_distance, shift_dist);
          if (shift_dist <= EPSILON) {
            stop_moving[i] = true;
          }
          shifted_points[i] = point_new;
        }
      }
    } while (max_shift_distance > EPSILON);
    return shifted_points;
  },
  cluster_util = function (
    points: myPixel[],
    shifted_points: myPixel[]
  ): Cluster[] {
    const clusters: Cluster[] = [];

    for (let i = 0; i < shifted_points.length; ++i) {
      let c = 0;
      for (; c < clusters.length; c++) {
        if (
          arrow.distance(shifted_points[i], clusters[c].mode) <= CLUSTER_EPSILON
        ) {
          break;
        }
      }

      if (c == clusters.length) {
        const clus: Cluster = new Cluster();
        clus.mode = shifted_points[i];
        clusters.push(clus);
      }

      clusters[c].original_points.push(points[i]);
      clusters[c].shifted_points.push(shifted_points[i]);
    }

    return clusters;
  };

/**
 * Applies mean shift clustering
 * @param points List of points to be clustered
 * @param kernel_bandwidth param of MeanShiftClustering
 * @returns List of Cluster
 */
export const cluster = function (
  points: myPixel[],
  kernel_bandwidth: number,
  clusterEpsilon: number = CLUSTER_EPSILON,
  epsilon: number = EPSILON
) {
  CLUSTER_EPSILON = clusterEpsilon;
  EPSILON = epsilon;
  const shifted_points = meanShift(points, kernel_bandwidth);
  return cluster_util(points, shifted_points);
};
