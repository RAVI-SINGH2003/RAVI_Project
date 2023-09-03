tests: samples/ncert.nic.in/jemh1/jemh100/output/jemh100.out.html samples/ncert.nic.in/jemh1/jemh1ps/output/jemh1ps.out.html samples/MaxTract/riemann/output/riemann.out.html # samples/MaxTract/artale/output/artale.out.html  samples/MaxTract/gpu/output/gpu.out.html 

dist/pdf2charinfo.js: ts/*.ts ts/background/*.ts ts/caption/*.ts ts/column/*.ts ts/core/*.ts ts/global/*.ts ts/headerfooter/*.ts ts/heading/*.ts ts/list/*.ts ts/paragraph/*.ts ts/symbol/*.ts ts/table/*.ts ts/utility/*.ts ts/watermark/*.ts node_modules/agglo/lib/*
	npx webpack

samples/ncert.nic.in/jemh1/jemh100/output/jemh100.out.html:	samples/ncert.nic.in/jemh1/jemh100/output/jemh100.html dist/pdf2charinfo.js scripts/run_puppeteer.js scripts/server.js
	scripts/run_puppeteer.js 'http://localhost:8000/samples/ncert.nic.in/jemh1/jemh100/output/jemh100.html'
	diff -b samples/ncert.nic.in/jemh1/jemh100/expected/jemh100.out.html samples/ncert.nic.in/jemh1/jemh100/output/jemh100.out.html

samples/ncert.nic.in/jemh1/jemh100/output/jemh100.html:	samples/ncert.nic.in/jemh1/jemh100/jemh100.pdf
	scripts/pdf2html_docker.sh samples/ncert.nic.in/jemh1/jemh100/jemh100.pdf `pwd`/samples/ncert.nic.in/jemh1/jemh100/output

samples/ncert.nic.in/jemh1/jemh1ps/output/jemh1ps.out.html:	samples/ncert.nic.in/jemh1/jemh1ps/output/jemh1ps.html dist/pdf2charinfo.js scripts/run_puppeteer.js scripts/server.js
	scripts/run_puppeteer.js 'http://localhost:8000/samples/ncert.nic.in/jemh1/jemh1ps/output/jemh1ps.html'
	diff -b samples/ncert.nic.in/jemh1/jemh1ps/expected/jemh1ps.out.html samples/ncert.nic.in/jemh1/jemh1ps/output/jemh1ps.out.html

samples/ncert.nic.in/jemh1/jemh1ps/output/jemh1ps.html:	samples/ncert.nic.in/jemh1/jemh1ps/jemh1ps.pdf
	scripts/pdf2html_docker.sh samples/ncert.nic.in/jemh1/jemh1ps/jemh1ps.pdf `pwd`/samples/ncert.nic.in/jemh1/jemh1ps/output

samples/MaxTract/riemann/output/riemann.out.html: samples/MaxTract/riemann/output/riemann.html dist/pdf2charinfo.js scripts/run_puppeteer.js scripts/server.js
	scripts/run_puppeteer.js 'http://localhost:8000/samples/MaxTract/riemann/output/riemann.html'
	diff -b samples/MaxTract/riemann/expected/riemann.out.html samples/MaxTract/riemann/output/riemann.out.html

samples/MaxTract/riemann/output/riemann.html:	samples/MaxTract/riemann/riemann.pdf
	scripts/pdf2html_docker.sh  samples/MaxTract/riemann/riemann.pdf `pwd`/samples/MaxTract/riemann/output

# samples/MaxTract/gpu/output/gpu.out.html: samples/MaxTract/gpu/output/gpu.html dist/pdf2charinfo.js scripts/run_puppeteer.js scripts/server.js
# 	scripts/run_puppeteer.js 'http://localhost:8000/samples/MaxTract/gpu/output/gpu.html'
# 	diff samples/MaxTract/gpu/expected/gpu.out.html samples/MaxTract/gpu/output/gpu.out.html
# 
# samples/MaxTract/gpu/output/gpu.html:	samples/MaxTract/gpu/gpu.pdf
# 	scripts/pdf2html_docker.sh  samples/MaxTract/gpu/gpu.pdf `pwd`/samples/MaxTract/gpu/output

# samples/MaxTract/artale/output/artale.out.html: samples/MaxTract/artale/output/artale.html dist/pdf2charinfo.js scripts/run_puppeteer.js scripts/server.js
# 	scripts/run_puppeteer.js 'http://localhost:8000/samples/MaxTract/artale/output/artale.html'
# 	diff samples/MaxTract/artale/expected/artale.out.html samples/MaxTract/artale/output/artale.out.html
# 
# samples/MaxTract/artale/output/artale.html:	samples/MaxTract/artale/artale.pdf
# 	scripts/pdf2html_docker.sh  samples/MaxTract/artale/artale.pdf `pwd`/samples/MaxTract/artale/output
