import React, { useState, useEffect } from "react";
import "./LoginSignup.css";
import Logo from "../Images/RAVI_AssisTech.png";
import { Link, useNavigate } from "react-router-dom";
import { backendBaseUrl } from "../settings/settings.js";
import axios from "axios";
const Login = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const loginHandler = async () => {
    let fd = new FormData();
    fd.append("name", userName);
    fd.append("password", password);
    await axios
      .post(`${backendBaseUrl}/login`, fd, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      })
      .then((res) => {
        if (res.data["valid"]) {
          navigate("/");
        } else {
          alert("Invalid UserName or Password!");
        }
      })
      .catch((err) => {
        console.log(err);
        alert("Some error occured. Please try again after sometime!");
      });
  };

  useEffect(() => {
    //API Request for checking cookie
    const checkCookie = async () => {
      await axios
        .get(`${backendBaseUrl}/checkcookie`, {
          withCredentials: true,
        })
        .then((res) => {
          if (res.data["valid"]) {
            navigate("/");
          } else {
            navigate("/login");
          }
        })
        .catch((err) => {
          console.log("Error" + err);
          alert("Some error occured. Please try again after sometime!");
          navigate("/login");
        });
    };
    checkCookie();
  }, [navigate]);
  return (
    <div className="wrapper fadeInDown login_signup">
      <div id="formContent">
        <div className="fadeIn first">
          <img
            src={Logo}
            style={{ paddingTop: 20, paddingBottom: 20 }}
            id="icon"
            alt="User Icon"
          />
        </div>
        <h1> Login form</h1>
        <form>
          <input
            type="text"
            id="login"
            className="fadeIn second"
            name="login"
            placeholder="Username"
            required
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <input
            type="password"
            id="password"
            className="fadeIn third"
            name="login"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="button"
            id="btn_submit"
            className="fadeIn fourth"
            value={"Login"}
            onClick={loginHandler}
          />
        </form>
        <div id="formFooter">
          <Link style={{ textDecoration: "underline" }} to="/signup">
            <b>New User? Create Account</b>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
