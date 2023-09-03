import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { CRYPTO_SECRET, backendBaseUrl } from "../settings/settings";
import CryptoJS from "crypto-js";
import MonacoEditor from "@monaco-editor/react";
import Logo from "../Images/RAVI_AssisTech.png";
import "./HtmlEditor.css";

const HtmlEditor = () => {
  console.log("HTML EDITOR-------------------->");

  const [htmlText, setHtmlText] = useState("<h1>Error</h1>");
  const [showHTML, setShowHTML] = useState(true);
  const [originalHtmlText, setOriginalHtmlText] = useState("<h1>Error</h1>");
  const [pdfContent, setPdfContent] = useState("");
  const navigate = useNavigate();
  const { enc } = useParams();

  //Fetching html from backend;
  const getHtmlText = async (html_output) => {
    await axios
      .get(`${backendBaseUrl}/` + html_output, {
        withCredentials: true,
      })
      .then(({ data }) => {
        setHtmlText(data);
        setOriginalHtmlText(data);
      })
      .catch((err) => {
        console.log("Error in fething html..." + err);
      });
  };
  //Fetching pdf from backend in base64 format
  const fetchPdfBase64 = async (pdfPath) => {
    await axios
      .post(
        `${backendBaseUrl}/fetchfile`,
        {
          filePath: pdfPath,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      )
      .then(({ data }) => {
        setPdfContent(data.base64Data);
      })
      .catch((err) => {
        console.log("Error in fetching pdf..." + err);
      });
  };
  //Logout function
  const logoutHandler = async () => {
    await axios
      .get(`${backendBaseUrl}/logout`, {
        withCredentials: true,
      })
      .then((res) => {
        if (res.data["valid"]) {
          alert("Logout Done Successfully");
        }
      })
      .catch((err) => {
        console.log("Error" + err);
        alert("Some error occured. Please try again after sometime!");
      });
    navigate("/login");
  };

  //SaveButton function
  const saveButtonHandler = async () => {
    const encrypted = atob(enc);
    let decrypted_str = CryptoJS.AES.decrypt(encrypted, CRYPTO_SECRET).toString(
      CryptoJS.enc.Utf8
    );
    let autoid = decrypted_str.split("$")[0];
    let fd = new FormData();
    fd.append("htmlData", htmlText);
    fd.append("autoid", autoid);
    await axios
      .post(`${backendBaseUrl}/updatemoddoc`, fd, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      })
      .then((res) => {
        if (res.data["valid"]) {
          alert("Successfully saved html!");
          setOriginalHtmlText(htmlText);
          let encrypted = atob(enc);
          let decrypted_str = CryptoJS.AES.decrypt(
            encrypted,
            CRYPTO_SECRET
          ).toString(CryptoJS.enc.Utf8);
          let autoid = decrypted_str.split("$")[0];
          let htmlPath = decrypted_str.split("$")[1];
          let temp = htmlPath.split("out")[0];
          let newHtmlPath = temp + "out.mod.html";

          let newEncrypted = CryptoJS.AES.encrypt(
            autoid + "$" + newHtmlPath,
            CRYPTO_SECRET
          );
          newEncrypted = btoa(newEncrypted);
          let htmlEditorPath = "/htmleditor/" + newEncrypted;
          navigate(htmlEditorPath);
        } else {
          alert("Could not save html");
        }
      })
      .catch((err) => {
        console.log(err);
        alert("Some error occured. Please try again after sometime!");
      });
  };

  //Download Button function
  const downloadButtonHandler = async () => {
    const blob = new Blob([originalHtmlText], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "file.html");
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  //Add Alt Button function
  const addAltTextButtonHandler = () => {
    let imageEditorPath = "/htmleditor/imageeditor/" + enc;
    navigate(imageEditorPath);
  };

  const htmlChangeHandler = (newCode) => {
    setHtmlText(newCode);
  };

  useEffect(() => {
    let encrypted = atob(enc);
    let decrypted_str = CryptoJS.AES.decrypt(encrypted, CRYPTO_SECRET).toString(
      CryptoJS.enc.Utf8
    );
    console.log("decrypted_str", decrypted_str);
    let autoid = decrypted_str.split("$")[0];
    console.log("id", autoid);
    let htmlPath = decrypted_str.split("$")[1];
    console.log("htmlPath", htmlPath);

    let temp = htmlPath.split("out")[0];
    let pdfPath = temp + "pdf";

    console.log("pdfPath", pdfPath);

    fetchPdfBase64(pdfPath);

    getHtmlText(htmlPath);
  }, [enc]);

  return (
    <div className="html_editor">
      <header style={{ display: "block", overflow: "auto" }}>
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
                  <a
                    className="nav-link active"
                    aria-current="page"
                    id="ehome"
                    href="/"
                  >
                    Home
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#Issue">
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
                  <button id="logout-btn" onClick={logoutHandler}>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>
      <h1 className="display-5 text-center" style={{ paddingTop: 20 }}>
        Edit and Save HTML
      </h1>
      <div
        className="row"
        style={{ width: "100%", height: "100%", paddingTop: 20 }}
      >
        <div
          className="column container grid"
          style={{ width: "50%", paddingLeft: 30 }}
        >
          <nav className="nav nav-pills flex-column flex-sm-row">
            <button
              className={`flex-sm-fill text-sm-center nav-link ${
                showHTML ? "active" : " "
              }`}
              aria-current="page"
              id="html_click"
              onClick={() => setShowHTML(true)}
            >
              HTML
            </button>
            <button
              className={`flex-sm-fill text-sm-center nav-link ${
                showHTML ? " " : "active"
              }`}
              id="pdf_click"
              onClick={() => setShowHTML(false)}
            >
              Uploaded PDF
            </button>
          </nav>

          {/* out.html in this container */}

          <div
            id="container"
            style={{
              display: showHTML ? "block" : "none",
            }}
          >
            <MonacoEditor
              height="100%"
              width="100%"
              language="html"
              value={htmlText}
              options={{
                selectOnLineNumbers: true,
                autoIndent: true,
                formatOnPaste: true,
                formatOnType: true,
                wordWrap: "on",
              }}
              onChange={htmlChangeHandler}
            />
          </div>
          {/* pdf in this container */}
          <div
            id="pdf_container"
            style={{
              display: showHTML ? "none" : "block",
            }}
          >
            <embed
              src={pdfContent}
              type="application/pdf"
              frameBorder={0}
              scrolling="auto"
              height="100%"
              width="100%"
              title="PDF Viewer"
            />
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              style={{ margin: 10 }}
              className="btn btn-primary"
              id="submit1"
              onClick={downloadButtonHandler}
            >
              Download Html
            </button>
            <button
              type="button"
              style={{ margin: 10 }}
              className="btn btn-primary"
              id="submit"
              onClick={saveButtonHandler}
            >
              Save
            </button>
            <button
              type="button"
              style={{ margin: 10 }}
              className="btn btn-primary"
              id="submit3"
              onClick={addAltTextButtonHandler}
            >
              Add Alt Text
            </button>
            <meta charSet="ISO-8859-1" />
            <title>Insert title here</title>
          </div>
        </div>
        <div
          className="column output grid"
          style={{ width: "50%" }}
          id="html-out"
        >
          <h4
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            Live Preview
          </h4>
          {/* webpage in this container */}
          <iframe id="iframe" srcDoc={htmlText} title="output_iframe" />
        </div>
      </div>
    </div>
  );
};

export default HtmlEditor;
