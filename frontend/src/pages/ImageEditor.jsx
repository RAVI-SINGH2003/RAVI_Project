import "./ImageEditor.css";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { CRYPTO_SECRET, backendBaseUrl } from "../settings/settings";
import CryptoJS from "crypto-js";
const ImageEditor = () => {
  console.log("Welcome to image editor;)");
  const [htmlText, setHtmlText] = useState("");
  const [imgNo, setImgNo] = useState(0);
  const [imagesData, setImagesData] = useState([]);
  const navigate = useNavigate();
  const { enc } = useParams();

  //Fetching html from backend
  const getHtmlText = async (html_output) => {
    await axios
      .get(`${backendBaseUrl}/` + html_output, {
        withCredentials: true,
      })
      .then(({ data }) => {
        console.log("Fetched Data...", data);
        console.log("Fetched Data Type...", typeof data);
        setHtmlText(data);
        parse(data);
      })
      .catch((err) => {
        console.log("Error in fetching html..." + err + "ji");
      });
  };
  //Parse html to find img tags
  const parse = (file) => {
    const parser = new DOMParser();
    let parseDocument = parser.parseFromString(file, "text/html");
    let images = parseDocument.getElementsByTagName("img");
    let list = [];
    for (let i = 0; i < images.length; i++) {
      list.push({
        src: images[i].src.toString(),
        alt: images[i].alt.toString(),
      });
    }

    setImagesData(list);
  };

  useEffect(() => {
    let encrypted = atob(enc);
    let decrypted_str = CryptoJS.AES.decrypt(encrypted, CRYPTO_SECRET).toString(
      CryptoJS.enc.Utf8
    );
    console.log("decrypted_str", decrypted_str);

    let htmlPath = decrypted_str.split("$")[1];
    console.log("htmlPath", htmlPath);
    getHtmlText(htmlPath);
    // eslint-disable-next-line
  }, [enc]);

  const inputHandler = (e) => {
    let tempData = [...imagesData];
    tempData[imgNo].alt = e.target.value;
    setImagesData(tempData);
  };

  //prev Button
  const PrevBtnHandler = () => {
    if (imgNo > 0) {
      setImgNo(imgNo - 1);
    } else {
      setImgNo(imagesData.length - 1);
    }
  };
  //next Button
  const NextBtnHandler = () => {
    if (imgNo < imagesData.length - 1) {
      setImgNo(imgNo + 1);
    } else {
      setImgNo(0);
    }
  };

  //Save Button
  const saveBtnHandler = async () => {
    const parser = new DOMParser();
    let modifiedHtmlText = parser.parseFromString(htmlText, "text/html");
    for (let i = 0; i < imagesData.length; i++) {
      let newAltText = imagesData[i].alt;
      modifiedHtmlText.getElementsByTagName("img")[i].alt = newAltText;
    }
    modifiedHtmlText = new XMLSerializer().serializeToString(modifiedHtmlText);
    console.log("modifiedHtmlText", modifiedHtmlText);
    setHtmlText(modifiedHtmlText);

    let encrypted = atob(enc);
    let decrypted_str = CryptoJS.AES.decrypt(encrypted, CRYPTO_SECRET).toString(
      CryptoJS.enc.Utf8
    );
    let autoid = decrypted_str.split("$")[0];

    let fd = new FormData();
    fd.append("htmlData", modifiedHtmlText);
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
        } else {
          alert("Could not save html");
        }
      })
      .catch((err) => {
        console.log(err);
        alert("Some error occured. Please try again after sometime!");
      });
  };

  //Download Button
  const downloadBtnHandler = () => {
    let htmlDownload = htmlText;
    const blob = new Blob([htmlDownload], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "file.html");
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  //Home Button
  const homeBtnHandler = () => {
    let encrypted = atob(enc);
    let decrypted_str = CryptoJS.AES.decrypt(encrypted, CRYPTO_SECRET).toString(
      CryptoJS.enc.Utf8
    );
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
    navigate(htmlEditorPath, { replace: true });
  };

  return (
    <div className="image_editor">
      <div className="images_column left">
        {imagesData.length > 0 &&
          imagesData.map((imdata, index) => (
            <div className="row">
              <img
                src={imdata.src}
                alt={imdata.alt}
                className={index === imgNo ? "show" : "hide"}
              />
            </div>
          ))}
      </div>
      <div className="image_control_container right">
        <h1>Add Alt Text</h1>
        <div className="image_control_box">
          <div className="image_box">
            <span id="imageNo_span">
              {imgNo + 1}/{imagesData.length}
            </span>
            {imagesData.length > 0 && (
              <img
                src={imagesData[imgNo].src}
                alt={imagesData[imgNo].alt}
                id={`image${imgNo + 1}`}
              />
            )}
          </div>
          <form
            className="control_box"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <input
              type="text"
              placeholder="Enter Alt Text..."
              value={imagesData.length > 0 ? imagesData[imgNo].alt : ""}
              onChange={inputHandler}
            />
            <button onClick={PrevBtnHandler} type="button">
              Previous
            </button>
            <button onClick={NextBtnHandler} type="button">
              Next
            </button>
            {/* <button type="submit">Submit</button> */}
            <button type="button" onClick={saveBtnHandler}>
              Save
            </button>
            <button type="button" onClick={downloadBtnHandler}>
              Download
            </button>
            <button type="button" onClick={homeBtnHandler}>
              Home
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
