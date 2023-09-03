var cv = require("opencv4nodejs");
var fs = require('fs');
var path = require('path');
var WatermarkAnalyzer = /** @class */ (function () {
    function WatermarkAnalyzer(imgArr, rw, col) {
        this.imgArray = imgArr;
        this.rows = rw;
        this.cols = col;
    }
    // function to get median 
    WatermarkAnalyzer.prototype.median = function (values) {
        values.sort(function (a, b) { return a - b; }); // sort numbers in increasing order
        var half = Math.floor(values.length / 2);
        if (values.length % 2)
            return values[half];
        else
            return (values[half - 1] + values[half]) / 2.0;
    };
    WatermarkAnalyzer.prototype.getMedianArray = function (arr) {
        var result = [];
        for (var i = 0; i < this.rows; i++) {
            var arr2d = [];
            for (var j = 0; j < this.cols; j++) {
                var arr1d = [];
                for (var k = 0; k < arr.length; k++) {
                    arr1d.push(arr[k].at(i, j));
                }
                arr2d.push(this.median(arr1d));
                //result.at(i,j) = this.median(arr1d);
            }
            result.push(arr2d);
        }
        //let mat = new cv.Mat(result, cv.CV_32F);
        return result;
    };
    // function to extract out repeated pattern from background images by taking the intersection of the gradient
    // images calulated using sobel filter
    WatermarkAnalyzer.prototype.gradient_intersect = function (arrx, arry) {
        var gradxy = [];
        for (var k = 0; k < arrx.length; k++) {
            var rowArrxy = [];
            for (var i = 0; i < this.rows; i++) {
                var colxy = [];
                for (var j = 0; j < this.cols; j++) {
                    var value = Math.sqrt(Math.pow(arrx[k].at(i, j), 2) + Math.pow(arry[k].at(i, j), 2));
                    if (value > 0) {
                        colxy.push(255);
                    }
                    else {
                        colxy.push(0);
                    }
                }
                rowArrxy.push(colxy);
            }
            var mat = new cv.Mat(rowArrxy, cv.CV_32F);
            gradxy.push(rowArrxy);
        }
        var wGxy = [];
        for (var i = 0; i < this.rows; i++) {
            var rowx = [];
            for (var j = 0; j < this.cols; j++) {
                var found = 1;
                var count = 0;
                var value = 0;
                for (var k = 0; k < gradxy.length; k++) {
                    value += gradxy[k][i][j];
                    count += 1;
                    if (gradxy[k][i][j] == 0) {
                        found = 0;
                        break;
                    }
                }
                if (found == 1) {
                    var avgValue = value / count;
                    rowx.push(255); //255
                }
                else {
                    rowx.push(0);
                }
            }
            wGxy.push(rowx);
        }
        // --------------------------------------------------------
        var nw_watermark = new cv.Mat(wGxy, cv.CV_32F);
        return nw_watermark;
    };
    // function extracts the bounding box of all the connected components from the extracted watermark region and
    // check whether the bounding box obtained are greater than some range else ignore the bounding box.
    // If bounding box present then watermark is present else absent. Get the area of watermark region by getting the minimum and 
    // and maximum cordinates of the bounding boxes.
    WatermarkAnalyzer.prototype.extract_BoundBox = function (img, path) {
        var img1 = img.convertTo(cv.CV_8UC1);
        var contours = new cv.Mat();
        var hierarchy = new cv.Mat();
        var cntValues = img1.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        var minX = img.rows;
        var minY = img.rows;
        var maxX = 0;
        var maxY = 0;
        var rectangleColor = new cv.Vec3(255, 0, 0);
        var count = 0;
        var cntCount = 0;
        var rects = [];
        for (var _i = 0, cntValues_1 = cntValues; _i < cntValues_1.length; _i++) {
            var cnt = cntValues_1[_i];
            var rect = cnt.boundingRect();
            var contoursColor = new cv.Vec3(255, 255, 255);
            var point1_1 = new cv.Point2(rect.x, rect.y);
            var point2_1 = new cv.Point2(rect.x + rect.width, rect.y + rect.height);
            if (rect.width > 20 && rect.height > 20) { //change 30
                count += 1;
                rects.push([rect.x, rect.y, rect.width, rect.height]);
                if (rect.x < minX) {
                    minX = rect.x;
                }
                if (rect.y < minY) {
                    minY = rect.y;
                }
                if (rect.x + rect.width > maxX) {
                    maxX = rect.x + rect.width;
                }
                if (rect.y + rect.height > maxY) {
                    maxY = rect.y + rect.height;
                }
                img.drawRectangle(point1_1, point2_1, rectangleColor, 2, cv.LINE_AA, 0);
            }
            else {
                var contoursColor2 = new cv.Vec3(100, 0, 0);
                //img.drawRectangle(point1, point2, contoursColor2, 2, cv.LINE_AA, 0);
            }
        }
        var point1 = new cv.Point2(minX, minY);
        var point2 = new cv.Point2(maxX, maxY);
        img.drawRectangle(point1, point2, rectangleColor, 2, cv.LINE_AA, 0);
        console.log('\nfound ' + count + ' contours');
        if (count > 0) {
            console.log("watermark present");
        }
        else {
            console.log("watermark absent");
        }
        return [img, minX, minY, maxX, maxY, rects];
    };
    // function calculates the gradient of the images and use the intersection technique to extract the watermark outline
    WatermarkAnalyzer.prototype.extract_WM_outline = function () {
        var gradxArr = [];
        var gradyArr = [];
        var count = 0;
        var val = 1;
        for (var _i = 0, _a = this.imgArray; _i < _a.length; _i++) {
            var img = _a[_i];
            var gradx = img.sobel(cv.CV_32F, 1, 0, 1);
            var grady = img.sobel(cv.CV_32F, 0, 1, 1);
            gradxArr.push(gradx);
            gradyArr.push(grady);
            val += 1;
        }
        var wGxy = this.gradient_intersect(gradxArr, gradyArr); // get intersection of gradient images
        return wGxy;
    };
    // intersection of grayscale images to check the repeated patterns
    WatermarkAnalyzer.prototype.intersection = function (imgArr, path) {
        var watermark = [];
        for (var i = 0; i < imgArr[0].rows; i++) {
            var wmRw = [];
            for (var j = 0; j < imgArr[0].cols; j++) {
                var found = 1;
                var count = 0;
                var value = 0;
                for (var _i = 0, imgArr_1 = imgArr; _i < imgArr_1.length; _i++) {
                    var img = imgArr_1[_i];
                    value += img.at(i, j);
                    count += 1;
                    if (img.at(i, j) == 255) {
                        found = 0;
                        break;
                    }
                }
                if (found == 1) {
                    var avgValue = value / count;
                    wmRw.push(255);
                }
                else {
                    wmRw.push(0);
                }
            }
            watermark.push(wmRw);
        }
        var wm_mat = new cv.Mat(watermark, cv.CV_32F);
        return wm_mat;
    };
    return WatermarkAnalyzer;
}());
// load all the images from a given location
function loadImages(imgLocation) {
    var imgArr = [];
    var height = 0;
    for (var _i = 0, imgLocation_1 = imgLocation; _i < imgLocation_1.length; _i++) {
        var imgPath = imgLocation_1[_i];
        var img = cv.imread(imgPath).cvtColor(cv.COLOR_RGB2GRAY);
        //let gb_img = img.gaussianBlur(new cv.Size(5, 5), 1.2);
        if (height == 0) {
            height = img.rows;
        }
        if (img.rows == height) {
            console.log("reading " + imgPath);
            imgArr.push(img);
        }
    }
    return imgArr;
}
function convertCVmatrix(mat) {
    var rw = mat.rows;
    var col = mat.cols;
    var simpleMat = [];
    for (var i = 0; i < rw; i++) {
        var arr = [];
        for (var j = 0; j < col; j++) {
            arr.push(mat.at(i, j));
        }
        simpleMat.push(arr);
    }
    return simpleMat;
}
function deleteFilesRecursive(directoryPath) {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach(function (file, index) {
            var curPath = path.join(directoryPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFilesRecursive(curPath);
            }
            else {
                // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(directoryPath);
    }
}
var img_path = process.argv[2] + 'Images/';
console.log('reading from detect watermark' + img_path);
fs.readdir(img_path, function (err, files) {
    var re = new RegExp('(jpg|png)$', 'i');
    files = files.filter(function (f) { return re.test(f); }).map(function (f) { return path.join(img_path, f); });
    //let imgArr = files.map(f => loadImage(f));
    var imgArr = loadImages(files);
    var wm = new WatermarkAnalyzer(imgArr, imgArr[0].rows, imgArr[0].cols);
    var wm_img = wm.extract_WM_outline();
    var anchor1 = new cv.Point(-1, -1);
    var kernel1 = new cv.Mat(3, 3, cv.CV_32F, 1);
    wm_img = wm_img.dilate(kernel1, anchor1, 2, cv.BORDER_CONSTANT);
    var bb = wm.extract_BoundBox(wm_img, path);
    var ofpath = path.join(process.argv[2], 'bg_info.json');
    if (bb[bb.length - 1].length > 0) {
        var wm_intImg = wm.intersection(imgArr, path);
        wm_intImg = wm_intImg.dilate(kernel1, anchor1, 2, cv.BORDER_CONSTANT);
        bb = wm.extract_BoundBox(wm_intImg, path);
        //cv.imwrite(process.argv[2]+"/cont_grad.png", bb[0]);
        var rows = imgArr[0].rows;
        var cols = imgArr[1].cols;
        var output = [bb[1], bb[2], bb[3], bb[4]];
        fs.writeFile(ofpath, JSON.stringify(output), function (err) {
            if (err)
                return console.log(err);
        });
    }
    else {
        var output = [0, 0, 0, 0];
        fs.writeFile(ofpath, JSON.stringify(output), function (err) {
            if (err)
                return console.log(err);
        });
    }
    deleteFilesRecursive(img_path);
});
