# Author : Denish Ahuja
# email : idenishahuja@gmail.com

import layoutparser as lp
import cv2
import matplotlib.pyplot as plt
import pdf2image
import numpy as np
import json
import sys
import base64

f = open(sys.argv[1], "rb")

content = f.read()

f.close()

class val:
    def __init__(self, imgName, x1 , x2 , y1 , y2,img_path,base64data):
        self.imgName = imgName
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2
        self.img_path = img_path
        self.base64data = base64data

        
def func() :
    # creating list

    # argv111:  uploads/denishTest_15/Soil_Erosion_2023_07_25T13_03_46.pdf/Soil_Erosion_2023_07_25T13_03_46.pdf 
    # argv2:  uploads/denishTest_15/Soil_Erosion_2023_07_25T13_03_46.pdf/imgs 
    # argv3:  uploads/denishTest_15/Soil_Erosion_2023_07_25T13_03_46.pdf/Soil_Erosion_2023_07_25T13_03_46_img.txt ---> JSON

    list = []
    jsonList = []
    myset = set()
    data64 = ''
    path = ''

    pdf_file= sys.argv[1]  # Adjust the filepath of your input image accordingly
    model = lp.Detectron2LayoutModel('lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config', 
                                     extra_config=["MODEL.ROI_HEADS.SCORE_THRESH_TEST", 0.8],
                                     label_map={0: "Text", 1: "Title", 2: "List", 3:"Table", 4:"Figure"})
        # Load the deep layout model from the layoutparser API 
        # For all the supported model, please check the Model 
        # Zoo Page: https://layout-parser.readthedocs.io/en/latest/notes/modelzoo.html

    # images = np.asarray(pdf2image.convert_from_path(pdf_file)[0])
    images = pdf2image.convert_from_path(pdf_file)

    widthImg = 2
    heightImg = 2
    widthPage=0
    heightPage=0
    ratioList=[]
    # iterate over all pages of pdf to extract images-----------------

    k=1
    

    for k, image in enumerate(images,1):
        if k==1:
            widthPage,heightPage = image.size
        
        layout = model.detect(image)
            # Detect the layout of the input image

        lp.draw_box(image, layout, box_width=10)
            # Show the detected layout of the input image
        #     width = 737
        #     height = 472

        img_blocks = lp.Layout([b for b in layout if b.type=='Figure'])


        y=1             ## image number on the ith pg

         # Extract image on single page-----------------------

        for blocks in img_blocks:
            open_cv_image = np.array(image)
            open_cv_image = open_cv_image[...,::-1]
            # Crop image around the detected layout
            segment_image = (blocks
                               .crop_image(open_cv_image))
            
            # save image
            path = sys.argv[2]+'/img_'+str(k)+'_'+str(y)+'.jpg'
            status = cv2.imwrite(path,segment_image)
            # if status is 0 then the images are extracted successfully but if 1 then their is error
            print("Image written to file-system : ",status)
            with open(path, 'rb') as image_file:
                # converting byte data to string using decode() function as below
                data64 = base64.b64encode(image_file.read()).decode()
            data64 = "data:image/jpg;base64," + data64 

            list.append(val('img_'+str(k)+'_'+str(y)+":", blocks.block.x_1 ,blocks.block.x_2,blocks.block.y_1,blocks.block.y_2,path,data64))


            y+=1
        

        if len(list) == 0: 
            print("NO IMAGE FOUND")
        else :
            for obj in list:
                myset.add(obj)

            k+=1

    finalJsonValue = []
    for val1 in myset:
        # imgName is like : img_11_2.jpg --> it means it is 2nd image of 11th page of the pdf.
        firstIndex = val1.imgName.find('_')
        lastIndex = val1.imgName.rfind('_')
        indexDot = val1.imgName.find('.')
        finalJsonValue.append({
            "page":val1.imgName[firstIndex + 1:lastIndex],
            "imageNumber" : val1.imgName[lastIndex + 1:indexDot],
            "imagePath" : val1.img_path,
            "base64data" : val1.base64data,
            "imgData" : {
                        "x1" : val1.x1/widthPage,
                        "x2" : val1.x2/widthPage,
                        "y1" : val1.y1/heightPage,
                        "y2" : val1.y2/heightPage
                        },
            "ratio" : {
                        "widthRatio" : abs(val1.x2 - val1.x1)/widthPage,
                        "heightRatio" : abs(val1.y2 - val1.y1)/heightPage
                      }

        })
    objj = {
        "json" : finalJsonValue
            }
    json_string = json.dumps(objj)
  
    with open(sys.argv[3], 'w') as f:
        f.write(json_string)
    return objj
func()


