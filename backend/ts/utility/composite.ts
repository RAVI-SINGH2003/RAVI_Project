/**
 * @fileoverview Elements with bounding boxes that contain other elements
 *
 * @author himanshu.garg@cse.iitd.ac.in
 */

import { Component } from './components';

export class Composite extends Component {
  public getComposite(): Composite {
    return this;
  }

  private static count = 0;

  constructor(
    public id: string = `composite${Composite.count++}`,
    public html: HTMLElement = null
  ) {
    super(id, html);
  }
}
