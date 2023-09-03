/**
 * @fileoverview Class for image extraction and tagging.
 * @author nehamjadhav@gmail.com (Neha Jadhav)
 */

import Bbox from './bbox';
import Canvas from './canvas';
export default class ImageAnalysis {
  public Imgboxes: Bbox[] = [];

  constructor(
    public allBgBoxes: Bbox[],
    public canvas: Canvas,
    public style: string
  ) {}

  public drawImageBoxes() {
    this.allBgBoxes.forEach((x) => x.draw(this.canvas, this.style));
  }
}
