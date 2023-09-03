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
 * @fileoverview Class for a single cluster.
 *
 * @author himanshu.garg@cse.iitd.ac.in
 */

import { Component } from './components';
import { Util } from './utils';
import Bbox from './bbox';
import log from 'loglevel';

export class Cluster extends Component {
  // All clusters created so far are here
  public static clusters: Cluster[] = [];

  /**
   * Clusters are outlined in magenta
   * @override
   */
  public style = 'rgba(255,0,255,1)';

  // All the fg/bg components of a cluster go here
  private components: Component[] = [];

  private startX = -Infinity;

  private startY = -Infinity;

  private endX: number;

  private endY: number;

  public static doClustering(
    components: Component[],
    hThreshold: number
  ): Cluster[] {
    Cluster.clusters = [];

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clustering = require('density-clustering'),
      distanceFn = (a: Component, b: Component) =>
        Bbox.distance(a.bbox, b.bbox),
      // The distance threshold we will use for grouping, empirically found
      algo = new clustering.DBSCAN(
        components,
        hThreshold, // Farthest neighbourhood
        Util.dbscanMinPts, // Min pts in a cluster
        distanceFn
      ),
      clusters: [[number]] = algo.run();

    // Clusters are returned as indices into the dataset, get real clusters
    clusters.map((componentIndices) => {
      new Cluster(componentIndices.map((i) => components[i]));
    });

    // Put the noise into clusters of their own
    const noise: [number] = algo.noise;
    noise.forEach((index) => {
      new Cluster([components[index]]);
    });
    log.info(`Found ${Cluster.clusters.length} clusters`);
    return Cluster.clusters;
  }

  // We need auto-generated id's as manual clusters are not created in one go
  constructor(components: Component[] = []) {
    super(`cluster${Cluster.clusters.length}`, null);
    components.forEach((c) => this.addComponent(c));
    Cluster.clusters.push(this);
  }

  /**
   * Adds a new component to the cluster.
   */
  public addComponent(c: Component) {
    this.components.push(c);
    this.update();
  }

  /**
   * Updates the Cluster by adding all pixels of its component spans/cc's
   */
  public update() {
    this.pixels = this.components.reduce((acc, c) => acc.concat(c.pixels), []);
  }

  public json() {
    const json = super.json() as any;
    json.components = this.components.map((c) => c.id);
    return json;
  }
}
