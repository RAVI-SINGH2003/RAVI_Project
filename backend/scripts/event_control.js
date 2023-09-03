/**
 * @fileoverview Javascript for controlling the events happening on client side (index.html)
 *
 * @author Tuhinanksu Das, Punit Tigga
 */

console.log("eventcontrol-backend" , backendBaseUrl);
var filesize=0;
var unittime = 0.25395262;
var numpage=0;
var totalTime = 0, domFactor = 0;
var sessionid_ = "";

$(document).ready(function() {
      
       
        // api call to check the session, if expired then redirect to login page
        $.ajax({
          type: "GET",
          url: `${backendBaseUrl}/checksession`,
          contentType: false,
          success: function (data) {
            res = data.valid;
            if(!res)
            {
              console.log("redirected")
              window.location.href='/login/login.html';
              return;
            }
          }
        });

      var data_table =   [];
      var $table;
        // api call to display the history of document processed
        $.ajax({
            type: "GET",
            url: `${backendBaseUrl}/displaydoc`,
            contentType: false,
            success: function (data) {
                res = data['success'];
                if(res)
                {
                    data_table = data["data"];
                    $table = $('#example').DataTable({
                        responsive: true,
                        data: data_table,
                        order: [[0, 'desc']],
                        columns: [
                            { data: 'autoid', visible:false },
                            { data: 'originalPdf' },
                            { data: 'originalHtml' },
                            { data: 'modifiedHtml' },
                            { data: 'status' ,
                              render: function(data){
                                if(data === 1)
                                {
                                  return "Processed";
                                }
                                else
                                {
                                  return "Failed";
                                }
                              }
                            },
                            { data: 'uploaddate' },
                            { data: 'modifieddate' },
                            { data: 'basePath', visible:false},
                            {
                              mRender: function (data, type, row) {
                                if (row.status === 1) {
                                  return '<button class="remove" id="edit">Edit</button>';
                                }
                                else {
                                  return '' ;                       
                                }
                        
                            }
                          },
                            {
                              mRender: function (data, type, row) {
                                if (row.status === 1) {
                                  return '<button class="download" id="download">Download</button>';
                                }
                                else {
                                  return '' ;                       
                                }
                        
                            }
                          }
                        ]
                    } );
                }
                else
                {
                  console.log("redirected")
                  window.location.href='/login/login.html';
                  return;
                }
            }
        });

        /**
         * Navigate to home page on home button click
         */
       $("#home").click(function() {

          window.location.href = "/";
          window.location.reload();

       });

        /**
         * Navigate to login page on logout button click
         */

       $("#logout").click(function(){
          
          // api call to destroy session id in database
          $.ajax({
              type: "GET",
              // processData: false,
              contentType: false,
              url: `${backendBaseUrl}/logoutUser`,
              success: function (data) {
                   alert("LogOut Successfully!");
                   location.reload();
              },
              error: function (jqXHR, exception) {
                console.log("error",exception)
                alert("Some error occured. Please try again after sometime!")
                location.reload();
            }
          });

       });

        /**
         * Encrypt the path of the document stored in the web browser when editor is opened
         * Open the editor on edit button is clicked
         * Download the recent modified document on download button click
         */
        $('#example').on( 'click', 'td button', function (e) {
            var closestRow = $(this).closest('tr');
            var data = $table.row(closestRow).data();
            var taskID = data['autoid'];
          
            var buttonId = $(this).attr('id');
            if (buttonId == "edit") {

              var asda = CryptoJS.AES.encrypt(data['autoid']+"$"+ data['basePath']+data['modifiedHtml'], 'asdad123131asda');
              if(data['modifieddate']==null)
              {
                  asda = CryptoJS.AES.encrypt(data['autoid']+"$"+data['basePath']+data['originalHtml'], 'asdad123131asda');

              }
              window.location.href='/htmleditor/html-editor.html#'+asda;
            }
            else if (buttonId == "download") {
              var dlink = document.createElement('a');
              if (data["modifieddate"] == null)
              {
                dlink.href = data['basePath']+data["originalHtml"];
                dlink.download = data["originalHtml"];
              } else {
                dlink.href = data['basePath']+data["modifiedHtml"];
                dlink.download = data["modifiedHtml"];
              }

              document.body.appendChild(dlink);
              dlink.click();
              document.body.removeChild(dlink);
            }

    } );


        $('#more-column-unknown').prop('checked',true);
        $('#header-unknown').prop('checked',true);
        $('#footer-unknown').prop('checked',true);
        $('#figure-unknown').prop('checked',true);
        $('#table-unknown').prop('checked',true);
        $('#caption-unknown').prop('checked',true);
        $('#watermark-unknown').prop('checked',true);
        $('#eq-unknown').prop('checked',true);
        $('#page-unknown').prop('checked',true);
        $('#toc-unknown').prop('checked',true);

        // calculate predicted time to calculate time to process the document
        $('#formFileLg').on('change', function(evt) {
        filesize = this.files[0].size;
        var reader = new FileReader();
        reader.readAsBinaryString(this.files[0]);
        reader.onloadend = function(){
          var count = reader.result.match(/\/Type[\s]*\/Page[^s]/g).length;
          numpage = count;
          filesize /= 1024;
            var a0 = 18631, a1 = 6.2, a2 = 7738;
            totalTime = (a0 + a1 * filesize + a2 * numpage) / 1000;
          };
          document.getElementById("upload").disabled = false;
        });



        $("#fileupload1").submit(function(e) {
          e.preventDefault(); // avoid to execute the actual submit of the form.
          var form = $(this)[0];
          var formData = new FormData(form);
          // formData.append("sessionid", sessionid_)
          const formItems = Array.from(formData.entries());
          var temp1 = formItems[0];
          var temp2 = 0;
          $.each(formItems, function( key, value ) {
              if(value[0] == "filetoupload")
              {
                  temp1 = value;
                  temp2 = key;
                  return;   
              }
          });
          formItems.push(formItems.splice(temp2, 1)[0]);
          var formData1 = new FormData();
          $.each(formItems, function( key, value ) {
              formData1.append(value[0],value[1]);
              });
          
          // api call to process the document uploaded
          $.ajax({
              type: "POST",
                url: `${backendBaseUrl}/fileupload`,
              data: formData1, // serializes the form's elements.
              contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
              processData: false, // NEEDED, DON'T OMIT THIS
              success: function(data)
              {
                  alert("Document successfully processed. You can edit the html from the list below."); // show response from the php script.
                  location.reload(true);
                  window.location.reload(true);
              },
              error: function (jqXHR, exception) {
                  alert("Some error occured. Please try again after sometime!");
                  location.reload(true);
                  window.location.reload(true);
              }
          });
          });

        // advance option to choose document characteristics
        $("#nature_doc").change(function () {
          var conceptName = $('#nature_doc').find(":selected").text();
          if(conceptName=="Research paper")
          {
            $('#more-column-yes').prop('checked',true);
            $('#header-no').prop('checked',true);
            $('#footer-no').prop('checked',true);
            $('#figure-yes').prop('checked',true);
            $('#table-yes').prop('checked',true);
            $('#caption-yes').prop('checked',true);
            $('#watermark-no').prop('checked',true);
            $('#eq-yes').prop('checked',true);
            $('#page-no').prop('checked',true);
            $('#toc-no').prop('checked',true);
          }
          else if(conceptName == "Report / Book")
          {
            $('#more-column-no').prop('checked',true);
            $('#header-yes').prop('checked',true);
            $('#footer-yes').prop('checked',true);
            $('#figure-yes').prop('checked',true);
            $('#table-yes').prop('checked',true);
            $('#caption-yes').prop('checked',true);
            $('#watermark-yes').prop('checked',true);
            $('#eq-yes').prop('checked',true);
            $('#page-yes').prop('checked',true);
            $('#toc-yes').prop('checked',true);
          }
          else
          {
            $('#more-column-unknown').prop('checked',true);
            $('#header-unknown').prop('checked',true);
            $('#footer-unknown').prop('checked',true);
            $('#figure-unknown').prop('checked',true);
            $('#table-unknown').prop('checked',true);
            $('#caption-unknown').prop('checked',true);
            $('#watermark-unknown').prop('checked',true);
            $('#eq-unknown').prop('checked',true);
            $('#page-unknown').prop('checked',true);
            $('#toc-unknown').prop('checked',true);

          }
        });
});
//----------------------------------

var i = 0;
/**
 * Show Progress bar on uploading document
 */
function showProgress() {
  var temp = totalTime*10;
  if (i == 0) {
    i = 1;
    document.getElementById("myProgress").hidden = false;
    var elem = document.getElementById("myBar");
    var width = 0;
    var id = setInterval(frame, temp);
    function frame() {
      if (width >= 98) {
        clearInterval(id);
        i = 0;
      } else {
        width++;
            elem.style.width = width + "%";
            elem.innerHTML = width + "%";
          }
        }
      }
    }

    /**
     * Show Advance option as per user selection
     */
    function showAdvanceOption() {

      var xopt = document.getElementById("option");
      if (xopt.style.display === "none") {
        xopt.style.display = "block";
      } else {
        xopt.style.display = "none";
      }

      var xadvopt = document.getElementById("advopt");
      if (xadvopt.style.display === "none") {
        xadvopt.style.display = "block";
      } else {
        xadvopt.style.display = "none";
      }
    }