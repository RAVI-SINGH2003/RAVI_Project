#!/bin/bash

location=$1

readarray -d / -t strarr <<<"$location" #split a string based on the delimiter ':'  

iloc=""

for (( n=0; n < ${#strarr[*]} - 1; n++ ))  
do  
iloc="$iloc${strarr[n]}/" 
done  

image="Images/"
iloc2="$iloc"
iloc="$iloc$image"


echo "$iloc"

if pdf2htmlEX -f 1  --fit-width 1024 --bg-format jpg --embed-image 0 --dest-dir $iloc $location ; then
	node scripts/detect_watermark.js $iloc2 

fi
