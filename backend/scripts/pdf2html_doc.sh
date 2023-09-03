#! /bin/bash

#/* @fileoverview Extract pdf font tables into a json.
#*               Convert PDF file into HTML
# *               Add script into HTML file
# *
# * @author  himanshu.garg@cse.iitd.ac.in (Himanshu Garg)
# *
# * @usage   node <this script name> <path-to-fonts-dir>
# */

PDF2HTML=pdf2htmlEX
PDF2CHARINFO=pdf2charinfo.js

usage() {
    echo "Usage: pdf2html_doc.sh <input> <outputdir>" 
}

# If usage correct without any error then script will start with run

run() {
    base=`basename $filename .pdf`
    fonts
    document
    find_script $outputdir
    cutfile $outputdir/$base.html
}

# Extract fonts, images with pdf2htmlEX library and store fonts and images in the output directory
fonts() {
    $PDF2HTML --correct-text-visibility 0 --embed-font 0 --embed-image 0 --font-format ttf --dest-dir $outputdir $filename
    mkdir -p $outputdir/fonts
    mkdir -p $outputdir/images
    mv $outputdir/f*.ttf $outputdir/fonts
    mv $outputdir/bg*.png $outputdir/images
    $scriptdir/extract_font_info.js $outputdir/fonts
}

# Convert PDF to HTML and store in the output directory
document() {
    $PDF2HTML --correct-text-visibility 0 --dest-dir $outputdir $filename
}

cutfile() {
    htmlfile=$1
    # remove the scripts as they interfere with document level processing
    sed -i '/^<script/,/^<\/script/d' $htmlfile
    head -n -2 $htmlfile > /tmp/$base
    echo "<script src=\"${script}\" async></script>" >> /tmp/$base
    echo "</body>" >> /tmp/$base
    echo "</html>" >> /tmp/$base
    mv /tmp/$base $htmlfile
}


# find relative path to dist
find_script() {
    script=/dist/$PDF2CHARINFO
}

# Code execution starts from if block
if [ $# -lt 1 ]; then
    usage;
else
    scriptdir=`dirname "$0"`
    filename=$1
    if [ $# -ge 2 ]; then
        outputdir=$2
    else
        outputdir=`dirname $filename`
    fi
    run
fi
exit 0


