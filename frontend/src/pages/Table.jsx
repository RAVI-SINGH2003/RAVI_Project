import React from "react";
import { MDBDataTable } from "mdbreact";

const Table = ({ dataTable, editHandler, downloadHandler }) => {
  const rows = dataTable.map((rowData) => {
    return {
      Uploaded_Pdf: rowData.originalPdf ? rowData.originalPdf : "",
      Original_Output: rowData.originalHtml ? rowData.originalHtml : "",
      Modified_Output: rowData.modifiedHtml ? rowData.modifiedHtml : "---",
      Status:
        rowData.status === 1
          ? "Processing..."
          : rowData.status === 2
          ? "Processed"
          : "Failed",

      Uploaded_Date: rowData.uploaddate ? rowData.uploaddate : "",
      Last_Modified_Date: rowData.modifieddate ? rowData.modifieddate : "----",
      Edit_Output:
        rowData.status === 2 ? (
          <button
            className="remove"
            id="edit"
            onClick={() => editHandler(rowData.autoid)}
          >
            Edit
          </button>
        ) : (
          ""
        ),
      Download_Output:
        rowData.status === 2 ? (
          <button
            className="download"
            id="download"
            onClick={() => downloadHandler(rowData.autoid)}
          >
            Download
          </button>
        ) : (
          ""
        ),
    };
  });
  const data = {
    columns: [
      {
        label: "Uploaded Pdf",
        field: "Uploaded_Pdf",
        sort: "asc",
        width: 270,
      },
      {
        label: "Original Output",
        field: "Original_Output",
        sort: "asc",
        width: 200,
      },
      {
        label: "Modified Output",
        field: "Modified_Output",
        sort: "asc",
        width: 100,
      },
      {
        label: "Status?",
        field: "Status",
        sort: "asc",
        width: 150,
      },
      {
        label: "Uploaded Date",
        field: "Uploaded_Date",
        sort: "asc",
        width: 100,
      },
      {
        label: "Last Modified Date",
        field: "Last_Modified_Date",
        sort: "asc",
        width: 100,
      },
      {
        label: "Edit Output",
        field: "Edit_Output",
        sort: "asc",
        width: 100,
      },
      {
        label: "Download Output",
        field: "Download_Output",
        sort: "asc",
        width: 100,
      },
    ],
    rows: rows,
  };

  return <MDBDataTable striped bordered data={data} />;
};

export default Table;
