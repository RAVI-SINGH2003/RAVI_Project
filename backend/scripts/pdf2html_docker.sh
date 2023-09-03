#! /bin/bash

PDF2CHARINFO=pdf2charinfo.js
usage() {
    echo "Usage: pdf2html_docker.sh <input> <outputdir>" 
}

fonts() {
    $PDF2HTML --correct-text-visibility 0 --embed-font 0 --embed-image 0 --font-format ttf --dest-dir /pdf `basename $filename`
    mkdir -p $outputdir/fonts
    mkdir -p $outputdir/images
    mv -f $outputdir/f*.ttf $outputdir/fonts
    mv -f $outputdir/bg*.png $outputdir/images
    $scriptdir/extract_font_info.js $outputdir/fonts
    # $scriptdir/detect_watermark.js /pdf/images
}

document() {
    $PDF2HTML --correct-text-visibility 0 --dest-dir /pdf `basename $filename`
}

run() {
    base=`basename $filename .pdf`
    fonts
    document
    find_script $outputdir
    cutfile $outputdir/$base.html
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
    mkdir -p $outputdir
    cp $filename $outputdir
    PDF2HTML="sudo docker run -ti --rm -v $outputdir:/pdf -w /pdf bwits/pdf2htmlex pdf2htmlEX"
    echo $PDF2HTML
    run
fi
exit 0
