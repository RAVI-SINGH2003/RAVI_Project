#! /bin/bash

#
# Convert pdf's using pdf2htmlEx hosted on a server
#

usage() {
    echo "Usage: web_pdf2html_doc.sh <input> <outputdir>" 
}

run() {
    # post the pdf and store the redirect url of output html
    redirect=`curl -v -H "Content-Type: multipart/form-data" -F "data=@$filename" http://ravi.eastus.cloudapp.azure.com:8000/pdf2htmlEx -w %{redirect_url}` 

    # visit the redirect url and save to local html file with same basename as pdf
    base=`basename $filename .pdf`
    curl $redirect -o "$outputdir/$base.html"

    # visit the fonts/font_info.json url and save in the fonts subdirectory of the pdf's directory
    dir=`dirname $filename`
    redirect=`dirname $redirect`
    mkdir -p "$dir/fonts"
    curl "$redirect/fonts/font_info.json" -o "$dir/fonts/font_info.json"
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
