/* eslint-disable line-comment-position */
/**
 * @fileoverview do page analysis using puppeteer
 *
 * @author  Punit Tigga
 */
import Canvas from '../utility/canvas';
import Page from '../core/page';

export default class WatermarkAnalysis {
  public canvas: Canvas = null;

  public pages: Map<string, Page> = new Map<string, Page>();

  public jsonData: number[] = null;

  public width: number;

  public height: number;

  constructor(public allpages: Map<string, Page>, data: number[]) {
    this.pages = allpages;
    this.jsonData = data;
    this.width = 0;
    this.height = 0;
  }

  /*
   * Function to take intersection of images to detect repeated pattern
   * Background pixel is white i.e. pixel value  = 255
   * If in any of the image at a particular location if we get white
   * pixel then store dark i.e. pixel value = 0
   */
  // eslint-disable-next-line max-statements
  // eslint-disable-next-line class-methods-use-this
  public intersection(imgArr: any): any {
    // Array to store rows of intersected image
    const watermark = [];

    // Loop to iterate over image location
    for (let i = 0; i < this.height; i++) {
      // Array to store pixel row wise
      const wmRw = [];
      for (let j = 0; j < this.width; j++) {
        let found = 1;

        /*
         * Loop to interate over all the image
         * to check pixel values at location (i,j)
         */

        for (const img of imgArr) {
          // White pixel detected
          if (img[i][j] == 255) {
            found = 0;
            break;
          }
        }
        // Store pixel value 255 or 0 on detecting white pixel condition
        if (found == 1) {
          // Store white pixel
          wmRw.push(255);
        } else {
          // Store dark pixel
          wmRw.push(0);
        }
      }
      watermark.push(wmRw);
    }

    return watermark;
  }

  /*
   * Function to get linear mapping of the boundary pixel
   * of the watermark at any row i
   */

  public getLinearHistogram(
    wmArray: any,
    array: any,
    orig_img: any,
    i: number
  ): any {
    const mappingArray = [];
    for (let k = 0; k < 256; k++) {
      mappingArray.push(-1);
    }

    /*
     * Array[0] = starting index of the bounding box, array[2] = end index
     * of the bounding box
     */

    for (let j: number = array[0]; j < array[2]; j++) {
      // If we get any structure on scanning the image row wise
      if (wmArray[i][j] != 0) {
        // Left pixel of current pixel at location (i,j)
        const leftPix = orig_img[i][j - 1],
          // Top pixel of current pixel at location (i,j)
          topPix = orig_img[i - 1][j],
          // Current pixel at location (i,j)
          currPix = orig_img[i][j],
          // Bottom pixel of current pixel at location (i,j)
          bottomPix = orig_img[i + 1][j],
          // Right pixel of current pixel at location (i,j)
          rightPix = orig_img[i][j + 1];

        /*
         * Current pixel not equal to any pixel (left, top, bottom, right)
         * means the intensity changes at that direction, so map the current
         * boundary pixel to the changed pixel
         */

        /*
         * Intensity changes from left to current pixel and
         * top and left pixel are equal
         */

        if (leftPix == topPix && currPix != leftPix) {
          // Intensity decreases, then map the current pixel with the left pixel value
          if (mappingArray[currPix] < leftPix) {
            mappingArray[currPix] = leftPix;
          }
          // Intensity changes from left to current pixel and bottom and left pixel are equal
        } else if (leftPix == bottomPix && currPix != leftPix) {
          // Intensity decreases, then map the current pixel with the left pixel value
          if (mappingArray[currPix] < leftPix) {
            mappingArray[currPix] = leftPix;
          }
          // Intensity changes from right to current pixel and top and right pixel are equal
        } else if (rightPix == topPix && currPix != rightPix) {
          // Intensity decreases, then map the current pixel with the right pixel value
          if (mappingArray[currPix] < rightPix) {
            mappingArray[currPix] = rightPix;
          }
          // Intensity changes from right to current pixel and bottom and right pixel are equal
        } else if (rightPix == bottomPix && currPix != rightPix) {
          // Intensity decreases, then map the current pixel with the right pixel value
          if (mappingArray[currPix] < rightPix) {
            mappingArray[currPix] = rightPix;
          }
        }

        /*
         * For nearly same neighbours i.e. pixel value difference is not more than 2
         * Applying the same intensity variation as applied above to map boundary pixel, here range of pixel differences is [-2,2]
         */

        if (
          leftPix - topPix > -2 &&
          leftPix - topPix < 2 &&
          currPix != leftPix
        ) {
          if (mappingArray[currPix] < leftPix) {
            mappingArray[currPix] = leftPix;
          }
        } else if (
          leftPix - bottomPix > -2 &&
          leftPix - bottomPix < 2 &&
          currPix != leftPix
        ) {
          if (mappingArray[currPix] < leftPix) {
            mappingArray[currPix] = leftPix;
          }
        } else if (
          rightPix - topPix > -2 &&
          rightPix - topPix < 2 &&
          currPix != rightPix
        ) {
          if (mappingArray[currPix] < rightPix) {
            mappingArray[currPix] = rightPix;
          }
        } else if (
          rightPix - bottomPix > -2 &&
          rightPix - bottomPix < 2 &&
          currPix != rightPix
        ) {
          if (mappingArray[currPix] < rightPix) {
            mappingArray[currPix] = rightPix;
          }
        }
      }
    }

    return mappingArray;
  }

  /*
   * Function to remove watermark from original images by taking the extracted watermark as reference image
   * Create a linear mapping at row = i of the boundary pixel of the extracted watermark region to the pixel value present in left, right, top , bottom position by considering the increasing or decreasing pixel value at alocation (i,j)
   */
  public removeWatermark(wmArray: any, array: any, imgArr: any): any {
    const normImgs = [];
    // Copy the background image
    for (let k = 0; k < imgArr.length; k++) {
      normImgs.push(imgArr[k]);
    }

    const size = imgArr.length;
    for (let k = 0; k < size; k++) {
      /*
       * Array[1] = starting x coordinate and array[3] = ending x coordinate
       * of the bounding box of the watermark
       */
      for (let i = array[1]; i < array[3]; i++) {
        // ------------------ linear average removal ---------------

        // Get linear mapping of array at row = i
        let prevPx = 0;
        const mappingArray = this.getLinearHistogram(
          wmArray,
          array,
          normImgs[k],
          i
        );

        /*
         * Array[0] and array[2] are starting and ending y coordinate
         * of the bounding box
         */

        for (let j = array[0]; j < array[2]; j++) {
          const leftPix = normImgs[k][i][j - 1],
            pix = normImgs[k][i][j],
            topPix = normImgs[k][i - 1][j];

          /*
           * Condition to get region of extracted watermark
           * which are not dark
           */
          if (wmArray[i][j] != 0) {
            // Threshold to avoid removal of some useful pixel values
            if (pix >= 100) {
              /*
               * Difference of intensity variation of
               * left and top pixel is in
               * range [-3,3] then replace with left pixel
               */

              if (leftPix - topPix > -3 && leftPix - topPix < 3) {
                normImgs[k][i][j] = leftPix;

                /*
                 * Boundary condition check of top and left
                 * pixel,handle cases where top pixel
                 * are darker than left pixel
                 */
              } else if (topPix <= 100 && leftPix > 100) {
                normImgs[k][i][j] = leftPix;
                // Left pixel darker than top
              } else if (leftPix <= 100 && topPix > 100) {
                normImgs[k][i][j] = topPix;
                // Watermark pixel intensity nearly remains same i.e in range [-3,3]
              } else if (pix - prevPx > -3 && pix - prevPx < 3) {
                if (mappingArray[pix] != -1) {
                  // Mapping array have non empty value at location (i,j)

                  if (mappingArray[pix] > leftPix) {
                    // Intensity increases from left to current pixel, store mapping[current_pixel] to the original image at location (i,j)

                    normImgs[k][i][j] = mappingArray[pix];
                  } else {
                    normImgs[k][i][j] = leftPix; // Otherwise store left pixel at location (i,j) in original image
                  }
                } else {
                  normImgs[k][i][j] = leftPix; // Replace the same previous pixel value to current pixel
                }
              } else {
                // Watermark pixel intensity decreases

                if (pix - prevPx < 0) {
                  if (mappingArray[pix] != -1) {
                    normImgs[k][i][j] = mappingArray[pix];
                  } else {
                    normImgs[k][i][j] = leftPix;
                  }
                } else {
                  // Watermark pixel intensity increases

                  if (mappingArray[pix] != -1) {
                    normImgs[k][i][j] = mappingArray[pix];
                  } else {
                    normImgs[k][i][j] = topPix;
                  }
                }
              }
            }
          }
          prevPx = pix;
        }
      }

      // Console.log(`Page ${index} of ${size}: Watermark removed`);
    }
    return normImgs;
  }

  public dilation(img: any, height: number, width: number): any {
    // Empty 2D array for storing the dilated image
    const newImg = [];
    // Loop to store all the pixel value in 2D array zero
    for (let iCounter = 0; iCounter < height; iCounter + 1) {
      const row = [];
      for (let jCounter = 0; jCounter < width; jCounter + 1) {
        row.push(0);
      }
      newImg.push(row);
    }

    /*
     * Perform dilation by adding by adding pixel to the boundary
     * of the structures in an image
     * Loop to iterate over the extracted watermark image array
     */

    for (let iCounter = 1; iCounter < height - 1; iCounter + 1) {
      for (let jCounter = 1; jCounter < width - 1; jCounter + 1) {
        /*
         * Check the neighboring pixel along x direction
         * to meet dilation at location (i-1,x)
         */

        if (
          img[iCounter - 1][jCounter - 1] === 255 ||
          img[iCounter - 1][jCounter] === 255 ||
          img[iCounter - 1][jCounter + 1] === 255
        ) {
          newImg[iCounter][jCounter] = 255;

          /*
           * Check the neighboring pixel along x direction
           * to meet dilation at location (i,x)
           */
        } else if (
          img[iCounter][jCounter - 1] === 255 ||
          img[iCounter][jCounter] === 255 ||
          img[iCounter][jCounter + 1] === 255
        ) {
          newImg[iCounter][jCounter] = 255;

          /*
           * Check the neighboring pixel along x direction
           * to meet dilation at location (i+1,x)
           */
        } else if (
          img[iCounter + 1][jCounter - 1] === 255 ||
          img[iCounter + 1][jCounter] === 255 ||
          img[iCounter + 1][jCounter + 1] === 255
        ) {
          newImg[iCounter][jCounter] = 255;
        }
      }
    }

    return newImg;
  }

  // Algorithm for removal of watermark
  public remove() {
    /*
     * Scaling the coordinates to fit the height and width,
     * as image are scaled up by a factor of 2
     * jsonData is a bounding box
     */

    const imgArr = [],
      maxImgArr = [],
      pages = Array.from(this.pages.values()),
      scaledArray = [
        2 * this.jsonData[0],
        2 * this.jsonData[0],
        2 * this.jsonData[0],
        2 * this.jsonData[0]
      ];

    let pageIndex = 0,
      refWatermark = [],
      removeWmArr = [];

    for (const page of pages) {
      // Get grayscale of background images of the page
      const arr = page.getGrayScale();
      imgArr.push(arr);
      // Doing it till 10 pages
      if (pageIndex < 10) {
        maxImgArr.push(arr);
      }

      this.height = page.height;
      this.width = page.width;
      pageIndex += 1;
    }

    /*
     * Find intersection of images to get
     * referenced extracted watermark region
     */

    refWatermark = this.intersection(maxImgArr);

    /*
     * Perform dilation so that the pixel continuity in the extracted
     * image is more prominent
     */

    refWatermark = this.dilation(refWatermark, this.height, this.width);

    /*
     * Remove watermark from the images pixel by pixel
     * by taking the extracted watermark as referenced image
     */

    removeWmArr = this.removeWatermark(refWatermark, scaledArray, imgArr);
    pageIndex = 0;

    for (const page of pages) {
      // Draw the removed watermark images on the canvas
      page.putFinalImage(removeWmArr[pageIndex]);
      pageIndex += 1;
    }
  }
}
