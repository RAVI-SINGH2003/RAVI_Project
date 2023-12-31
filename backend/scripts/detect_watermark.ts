import cv from "opencv4nodejs";
import fs from "fs";
import path from "path";

class WatermarkAnalyzer {

  imgArray: number[][];

  rows: number;

  cols: number;

  constructor (imgArr:number[][], rw:number, col:number) {

      this.imgArray = imgArr;
      this.rows = rw;
      this.cols = col;

  }

  // function to get median 
  public median(values) {

    values.sort( function(a,b) {return a - b;} ); // sort numbers in increasing order
    let half = Math.floor(values.length/2);

    if(values.length % 2)
      return values[half];
    else
      return (values[half-1] + values[half]) / 2.0;
  }

  public getMedianArray(arr:any):any {

    let result = [];
    for (let i = 0; i < this.rows ; i++) {
      let arr2d = []
      for (let j = 0; j < this.cols; j++){
      	let arr1d = [];
      	for (let k = 0; k < arr.length; k++){
      	  arr1d.push(arr[k].at(i,j));
      	}

      	arr2d.push(this.median(arr1d));
      	//result.at(i,j) = this.median(arr1d);
      }

      result.push(arr2d);
    }

    //let mat = new cv.Mat(result, cv.CV_32F);
    return result;
  }

  // function to extract out repeated pattern from background images by taking the intersection of the gradient
  // images calulated using sobel filter

  public gradient_intersect(arrx: any, arry:any): any {
    
    let gradxy = [];
    for (let k = 0; k < arrx.length; k++){
      let rowArrxy = [];
      for (let i = 0; i < this.rows; i++) {
	       let colxy = [];
	       for (let j = 0; j < this.cols; j++) {
	         let value = Math.sqrt(Math.pow(arrx[k].at(i,j),2) + Math.pow(arry[k].at(i,j),2));
	         if (value > 0){
	           colxy.push(255);
	         }
	         else {
	           colxy.push(0);
	         }
	       }
	       rowArrxy.push(colxy);
      }
      let mat = new cv.Mat(rowArrxy, cv.CV_32F);
      gradxy.push(rowArrxy);
    }
    
    let wGxy = [];
    for (let i = 0; i < this.rows; i++) {
      let rowx = [];
      for (let j = 0; j < this.cols; j++) {
	       let found = 1;
	       let count = 0;
	       let value = 0;
	       for (let k = 0; k < gradxy.length; k++){
	         value += gradxy[k][i][j];
	         count += 1;
	         if (gradxy[k][i][j] == 0) {
	           found = 0;
	           break;
	         }
	       }

      	if (found == 1){
      	  let avgValue = value/count;
      	  rowx.push(255); //255
      	}
      	else {
      	  rowx.push(0);
      	}
      }

      wGxy.push(rowx);
    }

    // --------------------------------------------------------
    let nw_watermark = new cv.Mat(wGxy, cv.CV_32F);
    return nw_watermark;
  }

  // function extracts the bounding box of all the connected components from the extracted watermark region and
  // check whether the bounding box obtained are greater than some range else ignore the bounding box.
  // If bounding box present then watermark is present else absent. Get the area of watermark region by getting the minimum and 
  // and maximum cordinates of the bounding boxes.

  public extract_BoundBox(img : any, path:string): any {

    let img1 = img.convertTo(cv.CV_8UC1)
    let cntValues = img1.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let minX = img.rows;
    let minY = img.rows;
    let maxX = 0;
    let maxY = 0;
    let rectangleColor = new cv.Vec3(255, 0, 0);
    let count = 0;
    let cntCount = 0;
    let rects = [];

    for (let cnt of cntValues){

      let rect = cnt.boundingRect();
      let contoursColor = new cv.Vec3(255, 255, 255);
      let point1 = new cv.Point2(rect.x, rect.y);
      let point2 = new cv.Point2(rect.x + rect.width, rect.y + rect.height);
      if (rect.width > 20 && rect.height > 20){ //change 30

      	count += 1;
      	rects.push([rect.x, rect.y, rect.width, rect.height]);
      	if (rect.x < minX){
      	  minX = rect.x;
      	}

      	if (rect.y < minY){
      	  minY = rect.y;
      	}

      	if (rect.x + rect.width > maxX){
      	  maxX = rect.x + rect.width;
      	}

      	if (rect.y + rect.height > maxY) {
      	  maxY = rect.y + rect.height;
      	}

      	img.drawRectangle(point1, point2, rectangleColor, 2, cv.LINE_AA, 0);
      }

      else {
      	let contoursColor2 = new cv.Vec3(100, 0, 0);
      	//img.drawRectangle(point1, point2, contoursColor2, 2, cv.LINE_AA, 0);
      }
    }

    let point1 = new cv.Point2(minX, minY);
    let point2 = new cv.Point2(maxX, maxY);
    img.drawRectangle(point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

    console.log('\nfound ' + count + ' contours');

    if (count > 0){
      console.log("watermark present");
    } else {
      console.log("watermark absent");
    }

    return [img, minX, minY, maxX, maxY, rects];
  }

  // function calculates the gradient of the images and use the intersection technique to extract the watermark outline
  public extract_WM_outline(): any {

    let gradxArr = [];
    let gradyArr = [];

    let count = 0;
    let val = 1;

    for (let img of this.imgArray) {
      let gradx = img.sobel(cv.CV_32F,1,0,1);
      let grady = img.sobel(cv.CV_32F,0,1,1);
      gradxArr.push(gradx);
      gradyArr.push(grady);

      val += 1;
    }

    let wGxy = this.gradient_intersect(gradxArr, gradyArr); // get intersection of gradient images
    return wGxy;
  }

  // intersection of grayscale images to check the repeated patterns
  public intersection(imgArr:any , path:string): any {

    let watermark = [];

    for (let i = 0; i < imgArr[0].rows; i++) {
      let wmRw = [];
      for (let j = 0; j<imgArr[0].cols; j++){
      	let found = 1;
      	let count = 0;
      	let value = 0;
      	for (let img of imgArr) {
      	  value += img.at(i,j);
      	  count += 1;
      	  if (img.at(i,j) == 255) {
      	    found = 0;
      	    break;
      	  }
      	}

      	if (found == 1) {
      	  let avgValue = value/count;
      		wmRw.push(255);
      	}
      	else {
      	  wmRw.push(0);
      	}
      }

      watermark.push(wmRw);
    }

    let wm_mat = new cv.Mat(watermark, cv.CV_32F);

    return wm_mat;
  }
}

// load all the images from a given location

function loadImages(imgLocation: any): any{
  let imgArr = [];
  let height = 0;
  
  for (let imgPath of imgLocation){

    let img = cv.imread(imgPath).cvtColor(cv.COLOR_RGB2GRAY);
    //let gb_img = img.gaussianBlur(new cv.Size(5, 5), 1.2);
    if (height == 0) {
      height = img.rows;
    }

    if (img.rows == height){
      console.log("reading " + imgPath);
      imgArr.push(img);
    }
  }

  return imgArr;
}

function convertCVmatrix(mat:any): any {
  let rw = mat.rows;
  let col = mat.cols;
  let simpleMat = [];
  for (let i = 0; i<rw;i++){
    let arr = [];
    for (let j = 0; j < col; j++) {
      arr.push(mat.at(i,j));
    }
    simpleMat.push(arr);
  }

  return simpleMat;
}

function deleteFilesRecursive(directoryPath: string) : any {
  if (fs.existsSync(directoryPath)) {
      fs.readdirSync(directoryPath).forEach((file, index) => {
        const curPath = path.join(directoryPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
         // recurse
          deleteFilesRecursive(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(directoryPath);
    }
}

let img_path = process.argv[2] + 'Images/';
console.log('reading ' + img_path);

fs.readdir(img_path, (err, files) => {
  let re = new RegExp('(jpg|png)$', 'i')
  files = files.filter(f => re.test(f)).map(f => path.join(img_path, f));
  //let imgArr = files.map(f => loadImage(f));
  let imgArr = loadImages(files);
  let wm = new WatermarkAnalyzer(imgArr, imgArr[0].rows, imgArr[0].cols);
  let wm_img = wm.extract_WM_outline();
  let anchor1 = new cv.Point(-1, -1);
  let kernel1 = new cv.Mat(3,3,cv.CV_32F,1);
  wm_img = wm_img.dilate(kernel1,anchor1,2, cv.BORDER_CONSTANT);
  let bb = wm.extract_BoundBox(wm_img, path);
  let ofpath = path.join(process.argv[2], 'bg_info.json');

  if (bb[bb.length-1].length > 0) {
    let wm_intImg = wm.intersection(imgArr, path);
    wm_intImg = wm_intImg.dilate(kernel1,anchor1,2, cv.BORDER_CONSTANT);
    bb = wm.extract_BoundBox(wm_intImg, path);
    //cv.imwrite(process.argv[2]+"/cont_grad.png", bb[0]);
    let rows = imgArr[0].rows;
    let cols = imgArr[1].cols;
    let output = [bb[1], bb[2], bb[3], bb[4]];
    fs.writeFile(ofpath, JSON.stringify(output), function (err) {
      if (err) return console.log(err);
    });
  }
  else {
    let output = [0,0, 0, 0];
    fs.writeFile(ofpath, JSON.stringify(output), function (err) {
      if (err) return console.log(err);
    }); 
  }

  deleteFilesRecursive(img_path);
  
});