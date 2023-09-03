#! /bin/bash

PDF2HTML=pdf2htmlEX
PDF2CHARINFO=pdf2charinfo.js

usage() {
    echo "Usage: pdf2html_pages.sh <input> <outputdir>" 
}

fonts() {
    $PDF2HTML --embed-font 0 --font-format ttf --dest-dir $outputdir $filename
    mkdir -p $outputdir/fonts
    mv $outputdir/f*.ttf $outputdir/fonts
    $scriptdir/extract_font_info.js $outputdir/fonts
}

pages() {
    # disable visibility correction as for some samples it puts all text in bg and transparent equivalent in fg
    $PDF2HTML --split-pages 1 --dpi 600 --correct-text-visibility 0 --dest-dir $outputdir $filename
}

run() {
    base=`basename $filename .pdf`
    fonts
    pages
    pagecount=`ls $outputdir/*.page| wc -w`
    count=1
    find_script $outputdir
    cutfile $outputdir/$base.html
    while [ $count -le $pagecount ]; do
        ocount=$((count-1))
        outcount=`printf "%0*d" 3 $ocount`
        mkdir -p $outputdir/$outcount
        cat /tmp/prefile$base $outputdir/${base}$count.page /tmp/postfile$base > $outputdir/$outcount/page.html
        rm $outputdir/${base}$count.page
        count=$((count+1))
    done
    rm $outputdir/$base.html
}

cutfile() {
    htmlfile=$1
    preamble=`grep -n 'id="page-container"' $htmlfile | awk -F: '{print $1}'`
    postamble=`grep -n 'class="loading-indicator"' $htmlfile | awk -F: '{print $1}'`
    end=`wc -l $htmlfile | awk '{print $1}'`
    postamble=$((postamble-1))
    end=$((end-2))   ## Cuts the body and html to insert script!
    pre=`sed -n "1,${preamble}p" $htmlfile > /tmp/prefile$base`
    post=`sed -n "${postamble},${end}p" $htmlfile > /tmp/postfile$base`
    ## This might be conditional!
    echo "<script src=\"../${script}\" async></script>" >> /tmp/postfile$base
    echo "</body>" >> /tmp/postfile$base
    echo "</html>" >> /tmp/postfile$base
}


# find relative path to dist
find_script() {
    distdir=.
    testdir=$1
    while [ ! -d $testdir/dist ]; do
        distdir=../$distdir
        testdir=`dirname "$testdir"`
    done
    script=$distdir/dist/$PDF2CHARINFO
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
    run
fi
exit 0
