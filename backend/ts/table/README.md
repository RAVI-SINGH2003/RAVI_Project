visit [http://localhost:8000/samples/ncert.nic.in/jemh1/jemh1ps/jemh1ps.html](http://localhost:8000/samples/ncert.nic.in/jemh1/jemh1ps/jemh1ps.html) and in the console type
```javascript
let d = new pdf2charinfo.dokument.fromHtml();
d.linify();
d.analyseCharacteristics();
d.match();
d.columnDetection({numOfColumns:1});
d.backgroundAnalysis();
d.tableDetection();
d.cleanDocument();
d.toHtml();
