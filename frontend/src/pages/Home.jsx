import React, { useState, useEffect } from "react";
import Logo from "../Images/RAVI_AssisTech.png";
import "./Home.css";
import { CRYPTO_SECRET, backendBaseUrl } from "../settings/settings";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Table from "./Table.jsx";
import CryptoJS from "crypto-js";
const Home = () => {
  console.log("home......");
  const [dataTable, setDataTable] = useState([]);
  const [showAdvance, setShowAdvance] = useState(false);
  const [documentNature, setDocumentNature] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(false);
  const [advanceFormData, setAdvanceFormData] = useState({
    more_column: "2",
    Header: "2",
    Footer: "2",
    Figure: "2",
    caption: "2",
    Table: "2",
    Watermark: "2",
    Equations: "2",
    Page_no: "2",
    Table_of_content: "2",
    filetoupload: {},
  });
  // let tempTableData = [...dataTable];

  const navigate = useNavigate();

  const documentNatureHandler = (e) => {
    const value = e.target.value;
    let tempdata = { ...advanceFormData };
    setDocumentNature(value);
    if (value === "1") {
      tempdata = {
        more_column: "1",
        Header: "0",
        Footer: "0",
        Figure: "1",
        caption: "1",
        Table: "1",
        Watermark: "0",
        Equations: "1",
        Page_no: "0",
        Table_of_content: "0",
      };
    } else if (value === "2") {
      tempdata = {
        more_column: "0",
        Header: "1",
        Footer: "1",
        Figure: "1",
        caption: "1",
        Table: "1",
        Watermark: "1",
        Equations: "1",
        Page_no: "1",
        Table_of_content: "1",
      };
    } else {
      tempdata = {
        more_column: "2",
        Header: "2",
        Footer: "2",
        Figure: "2",
        caption: "2",
        Table: "2",
        Watermark: "2",
        Equations: "2",
        Page_no: "2",
        Table_of_content: "2",
      };
    }
    setAdvanceFormData({ ...tempdata });
  };

  const advanceFormHandler = (e) => {
    const key = e.target.name;
    const value = String(e.target.defaultValue);
    setAdvanceFormData({ ...advanceFormData, [key]: value });
  };

  //API Request for logout
  const logoutHandler = async () => {
    await axios
      .get(`${backendBaseUrl}/logout`, {
        withCredentials: true,
      })
      .then((res) => {
        if (res.data["valid"]) {
          alert("Logout Done Successfully");
        }
        navigate("/login");
      })
      .catch((err) => {
        console.log("Error" + err);
        alert("Some error occured. Please try again after sometime!");
        navigate("/login");
      });
  };

  //File upload
  const fileUploadHandler = (e) => {
    if (e.target.files.length > 0) {
      const newFiles = Array.prototype.slice.call(e.target.files);
      setFiles([...newFiles]);
    }
  };

  //File Submit
  const fileFormSubmitHandler = async (e) => {
    setStatus(true);
    e.preventDefault();
    let responses = [];
    for (let i = 0; i < files.length; i++) {
      let tempFormData = { ...advanceFormData, filetoupload: files[i] };
      const formData = new FormData();
      Object.entries(tempFormData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await axios
        .post(`${backendBaseUrl}/fileupload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        })
        .then((res) => {
          if (res.data && res.data.success && res.data.success === true) {
            responses.push(res?.data);
            console.log("Document  Uploaded Successfully.");
          }
        })
        .catch((error) => {
          console.log("Error from fileFormSubmitHandler : " + error);
          alert("Some error occured. Please try again after sometime!");
        });
    }

    setStatus(false);
    await axios
      .post(
        `${backendBaseUrl}/fileprocess`,
        {
          responses: responses,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      )
      .then((res) => {
        console.log(
          "Document  processed. You can edit the html from the list below."
        );
        displayDocuments();
      })
      .catch((error) => {
        console.log("Error from fileFormSubmitHandler : " + error);
        alert("Some error occured. Please try again after sometime!");
      });
    displayDocuments();
  };

  const showAdvanceOption = () => {
    setShowAdvance(!showAdvance);
  };

  //edit button functionality
  const editHandler = (autoid) => {
    const data = dataTable.find((r) => r.autoid === autoid);
    let encryptedPath;
    if (!data["modifieddate"]) {
      encryptedPath = CryptoJS.AES.encrypt(
        data["autoid"] + "$" + data["basePath"] + data["originalHtml"],
        CRYPTO_SECRET
      );
    } else {
      encryptedPath = CryptoJS.AES.encrypt(
        data["autoid"] + "$" + data["basePath"] + data["modifiedHtml"],
        CRYPTO_SECRET
      );
    }
    encryptedPath = btoa(encryptedPath);
    window.open(`/htmleditor/${encryptedPath}`, "_blank");
  };

  //download button functionality
  const downloadHandler = async (autoid) => {
    const data = dataTable.find((r) => r.autoid === autoid);
    let htmlPath = "",
      fileName = "";
    if (data["modifieddate"] == null) {
      htmlPath = data["basePath"] + data["originalHtml"];
      fileName = data["originalHtml"];
    } else {
      htmlPath = data["basePath"] + data["modifiedHtml"];
      fileName = data["modifiedHtml"];
    }
    await axios
      .get(`${backendBaseUrl}/` + htmlPath, {
        withCredentials: true,
      })
      .then(({ data }) => {
        let htmlDownload = data;
        const blob = new Blob([htmlDownload], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.log("Error in fething html..." + err);
      });
  };

  //API Request for checking cookie
  const checkCookie = async () => {
    await axios
      .get(`${backendBaseUrl}/checkcookie`, {
        withCredentials: true,
      })
      .then((res) => {
        if (!res.data["valid"]) {
          navigate("/login");
        }
      })
      .catch((err) => {
        console.log("Error" + err);
        alert("Some error occured. Please try again after sometime!");
        navigate("/login");
      });
  };

  //API request for display documents
  const displayDocuments = async () => {
    try {
      const { data } = await axios.get(`${backendBaseUrl}/displaydoc`, {
        withCredentials: true,
      });
      let res = data.success;
      if (res) {
        let temp = data.data.reverse();
        // tempTableData = temp;
        setDataTable(temp);
      } else {
        navigate("/login");
      }
    } catch (error) {
      alert("Some error occured. Please try again after sometime!");
      navigate("/login");
    }
  };
  useEffect(() => {
    checkCookie();
    displayDocuments();
    // eslint-disable-next-line
  }, [navigate]);

  return (
    <div className="home">
      {/* -----------NAVBAR------------------ */}
      <header>
        <nav
          className="navbar navbar-expand-lg navbar-light"
          style={{ backgroundColor: "#B2DFDB" }}
        >
          <div className="container-fluid">
            <img src={Logo} alt="Ravi Assistech logo" />
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>
            <div
              className="collapse navbar-collapse"
              id="navbarSupportedContent"
            >
              <ul className="navbar-nav me-auto mb-2 mb-lg-0 ">
                <li className="nav-item">
                  <Link
                    to="/"
                    id="home"
                    className="nav-link active"
                    aria-current="page"
                  >
                    Home
                  </Link>
                </li>
                <li className="nav-item">
                  <a className="nav-link" id="logIssue" href="#Issue">
                    Log Issue
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    href="/"
                    tabIndex={-1}
                    aria-disabled="true"
                  >
                    Feedback
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    href="/"
                    tabIndex={-1}
                    aria-disabled="true"
                  >
                    Contact us
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    id="logout"
                    href="/"
                    onClick={logoutHandler}
                    tabIndex={-1}
                    aria-disabled="true"
                  >
                    Log Out
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      {/* ------FILE UPLOAD SECTION--------------------- */}
      <section className="fileupload">
        <div className="px-4 my-5 text-center" id="btn-block">
          <h1 className="display-5 ">Convert PDF file</h1>
          <div className="col-lg-6 mx-auto">
            <p className="lead mb-4" style={{ paddingBottom: "5%" }}>
              Please upload a PDF format file that you want to make accessible.
              We request you to wait for few minutes until file is converted.
            </p>
            <form
              action="fileupload"
              id="fileupload1"
              onSubmit={fileFormSubmitHandler}
              method="post"
              encType="multipart/form-data"
            >
              <input
                className="form-control form-control-lg"
                id="formFileLg"
                type="file"
                name="filetoupload"
                accept=".pdf"
                onChange={fileUploadHandler}
                required={true}
                multiple={true}
              />
              <div className="d-grid gap-2 d-sm-flex justify-content-sm-center my-5">
                {/* onclick = "showProgress()"  */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg px-4 gap-3"
                  id="upload"
                  style={{ backgroundColor: "#004D40" }}
                  disabled=""
                >
                  Upload
                </button>
              </div>
              {/* <div
                className="progress"
                id="myProgress"
                style={{ height: 26, width: "100%" }}
                hidden=""
              >
                <div className="progress-bar" role="progressbar" id="myBar" />
              </div> */}

              {/* ---------ADVANCE OPTIONS SECTION------------- */}

              {/* Rounded switch */}
              <h5
                style={{
                  display: "inline",
                  margin: "1rem 1rem 0rem 1rem",
                }}
              >
                Advance Option
              </h5>
              <label className="switch" id="toggle">
                <input type="checkbox" onClick={showAdvanceOption} />
                <span className="slider round" align="left"></span>
              </label>
              <div
                className="row"
                style={{
                  display: showAdvance ? "block" : "none",
                  paddingBottom: "5%",
                }}
                id="option"
              >
                <div className="column" style={{ flex: "10%" }}></div>
                <div
                  className="column"
                  style={{ flex: "40%", textAlign: "left", paddingLeft: "5%" }}
                >
                  <label>Please select the nature of the document </label>
                </div>
                <div className="column" style={{ flex: "40%" }}>
                  <select
                    className="form-select"
                    aria-label="Default select example"
                    id="nature_doc"
                    value={documentNature}
                    onChange={documentNatureHandler}
                  >
                    <option style={{ color: "rgb(223, 217, 217)" }}>
                      Select category
                    </option>
                    <option value="1">Research paper</option>
                    <option value="2">Report / Book</option>
                    <option value="3">Other</option>
                  </select>
                </div>
                <div className="column" style={{ flex: "10%" }}></div>
              </div>

              <table
                className="table"
                id="advopt"
                style={{ display: showAdvance ? "block" : "none" }}
              >
                <tbody>
                  <tr>
                    <th
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Document Characteristics
                    </th>
                    <th>Yes</th>
                    <th>No</th>
                    <th>Unknown</th>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Multi column document
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="more_column"
                        id="more-column-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.more_column === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="more_column"
                        id="more-column-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.more_column === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="more_column"
                        id="more-column-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.more_column === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Header
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="Header"
                        id="header-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Header === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="Header"
                        id="header-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Header === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="Header"
                        id="header-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Header === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Footer
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="Footer"
                        id="footer-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Footer === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="Footer"
                        id="footer-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Footer === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="Footer"
                        id="footer-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Footer === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Figure
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="Figure"
                        id="figure-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Figure === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="Figure"
                        id="figure-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Figure === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="Figure"
                        id="figure-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Figure === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Caption
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="caption"
                        id="caption-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.caption === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="caption"
                        id="caption-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.caption === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="caption"
                        id="caption-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.caption === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Table
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="Table"
                        id="table-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Table === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="Table"
                        id="table-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Table === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="Table"
                        id="table-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Table === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Watermark
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="Watermark"
                        id="watermark-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Watermark === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="Watermark"
                        id="watermark-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Watermark === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="Watermark"
                        id="watermark-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Watermark === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Equations
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="Equations"
                        id="eq-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Equations === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="Equations"
                        id="eq-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Equations === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="Equations"
                        id="eq-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Equations === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{ textAlign: "left", paddingLeft: "5%" }}
                    >
                      Page Number
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="Page_no"
                        id="page-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Page_no === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="Page_no"
                        id="page-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Page_no === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="Page_no"
                        id="page-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Page_no === "2"}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="first-col"
                      style={{
                        textAlign: "left",
                        paddingLeft: "5%",
                        marginBottom: "5%",
                      }}
                    >
                      Table of content
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={1}
                        name="Table_of_content"
                        id="toc-yes"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Table_of_content === "1"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={0}
                        name="Table_of_content"
                        id="toc-no"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Table_of_content === "0"}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        defaultValue={2}
                        name="Table_of_content"
                        id="toc-unknown"
                        onChange={advanceFormHandler}
                        checked={advanceFormData.Table_of_content === "2"}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </form>
          </div>
        </div>
      </section>

      {/* ---------DOCUMENTS TABLE----------------- */}
      <section style={{ paddingLeft: "2%", paddingRight: "10%" }}>
        <h2
          style={{
            textAlign: "center",
            display: status ? "block" : "none",
          }}
        >
          Uploading Files...... ( Do not refresh the page )
        </h2>
        <Table
          dataTable={dataTable}
          editHandler={editHandler}
          downloadHandler={downloadHandler}
        />
      </section>

      {/* ------------ ISSUE SECTION --------------*/}
      <section className="Issue" id="Issue">
        <div className="content" style={{ backgroundColor: "#B2DFDB" }}>
          <div className="container">
            <div className="row align-items-stretch justify-content-center no-gutters">
              <div className="col-md-7">
                <div className="form h-100 contact-wrap p-5">
                  <h3 className="text-center">Log Issue</h3>
                  <form
                    className="mb-5"
                    method="post"
                    id="contactForm"
                    name="contactForm"
                  >
                    <div className="row">
                      <div className="col-md-6 form-group mb-3">
                        <label htmlFor="" className="col-form-label">
                          Name *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          id="name"
                          placeholder="Your name"
                          required=""
                        />
                      </div>
                      <div className="col-md-6 form-group mb-3">
                        <label htmlFor="" className="col-form-label">
                          Email *
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          id="email"
                          placeholder="Your email"
                          required=""
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12 form-group mb-3">
                        <label htmlFor="budget" className="col-form-label">
                          File name*
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="subject"
                          id="subject"
                          placeholder="Your subject"
                          accept=".pdf"
                          required=""
                        />
                      </div>
                    </div>
                    <div className="row mb-5">
                      <div className="col-md-12 form-group mb-3">
                        <label htmlFor="message" className="col-form-label">
                          Issue details *
                        </label>
                        <textarea
                          className="form-control"
                          name="message"
                          id="message"
                          cols={30}
                          rows={4}
                          placeholder="Write your message"
                          defaultValue={""}
                        />
                      </div>
                    </div>
                    <div className="row justify-content-center">
                      <div className="col-md-5 form-group text-center">
                        <input
                          type="submit"
                          defaultValue="Submit Issue"
                          id="isubmit"
                          className="btn btn-block btn-primary rounded-0 py-2 px-4 "
                          style={{ backgroundColor: "#004D40" }}
                        />
                        <span className="submitting" />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
