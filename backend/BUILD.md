# Building pdf2htmlEX from scratch

## Building poppler

* checkout
```bash
git clone https://anongit.freedesktop.org/git/poppler/poppler.git
```

* Testdatadir did not really work at first.
```bash 
git clone git://git.freedesktop.org/git/poppler/test
```

* make all paths to the qt5 stuff (I had it in anaconda)
  Maybe not a good idea if they are linked against a different library.

  Better: make
      ```bash 
      sudo apt install qtbase5-dev
      ```

```bash
export Qt5Core_DIR=/usr/lib/x86_64-linux-gnu/cmake/Qt5Core/
export Qt5Gui_DIR=/usr/lib/x86_64-linux-gnu/cmake/Qt5Gui
export Qt5Widgets_DIR=/usr/lib/x86_64-linux-gnu/cmake/Qt5Widgets
export Qt5Xml_DIR=/usr/lib/x86_64-linux-gnu/cmake/Qt5Xml
export Qt5Test_DIR=/usr/lib/x86_64-linux-gnu/cmake/Qt5Test
```

* checkout openjpeg
  https://github.com/uclouvain/openjpeg
  

``` bash
git clone https://github.com/uclouvain/openjpeg.git
```

* build openjpeg

* `make install` important!

* set path to cmake of the installed openjpeg

* remove in `OpenJPEGConfig.cmake`

```c++
else()
  message(${SELF_DIR})
  if(EXISTS ${SELF_DIR}/OpenJPEGExports.cmake)
    # This is a build tree
    set( OPENJPEG_INCLUDE_DIRS )

    include(${SELF_DIR}/OpenJPEGExports.cmake)

  else()
    message(FATAL_ERROR "ooops")
  endif()
```

This might not be necessary any longer after `make install`

* `export OpenJPEG_DIR=/usr/local/lib/openjpeg-2.3`

## libfontforge

``` bash
sudo apt-get install libfontforge-dev
```


## Building pdf2htmlEX

```diff
- Make sure to use the `pdf2htmlEX` repository and __not__ the `coolwanglu`. The latter is no longer maintained!
```

* Checkout `git clone git@github.com:pdf2htmlEX/pdf2htmlEX.git`

* Copy include files from poppler into the git directory. E.g.:


```bash
cp ${Poppler_Path}/build/poppler/poppler-config.h ../3rdparty/poppler/git/
cp -R ${Poppler_Path}/poppler/*  ../3rdparty/poppler/git/
cp -R ${Poppler_Path}/goo  ../3rdparty/poppler/git/
cp -R ${Poppler_Path}/fofi  ../3rdparty/poppler/git/
cp -R ${Poppler_Path}/poppler  ../3rdparty/poppler/git/
cp -R ${Poppler_Path}/splash  ../3rdparty/poppler/git/
```


* Remove all references to `"config.h"` and `<config.h>` from the Cairo files.

* run `make install`

* Currently there is library problem.  But it works in the local build
  directory.

__This works fine with poppler 0.81 (so.91). For the latest version see below!__

## Notes on latest poppler library (0.82 compiles to so.92)

* Requires changes to `Unicode const` in `font.cc` and `text.cc` to compile.

* Then still crashes with Segmentation Fault!

** Debugging: 


# Notes from Test 1/10/19

* Copy pdf2htmlEX to the local directory (library problem, see above!)

* run pdf2htmlEX test.pdf
