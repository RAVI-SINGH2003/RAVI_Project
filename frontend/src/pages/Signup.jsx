import React, { useState, useEffect } from "react";
import Logo from "../Images/RAVI_AssisTech.png";
import { Link, useNavigate } from "react-router-dom";
import { backendBaseUrl } from "../settings/settings.js";
import axios from "axios";
import "./LoginSignup.css";

const Signup = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [conPassword, setConPassword] = useState("");
  const [userRole, setUserRole] = useState("");
  const navigate = useNavigate();

  const signupHandler = async (e) => {
    e.preventDefault();
    let fd = new FormData();
    fd.append("name", userName);
    fd.append("password", password);
    fd.append("type", userRole);

    await axios
      .post(`${backendBaseUrl}/signup`, fd, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      })
      .then((res) => {
        if (res.data["valid"]) {
          alert("SignUp Successful! Redirecting to login");
          navigate("/login");
        } else {
          alert("Username already exists!");
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
          }
        })
        .catch((err) => {
          console.log("Error" + err);
          alert("Some error occured. Please try again after sometime!");
        });
    };
    checkCookie();
  }, [navigate]);
  return (
    <>
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
          <h1> Registration form</h1>
          {/* Signup Form */}
          <form onSubmit={signupHandler}>
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
              type="password"
              id="conpassword"
              className="fadeIn fourth"
              name="login"
              placeholder="Confirm Password"
              required
              value={conPassword}
              onChange={(e) => setConPassword(e.target.value)}
            />
            <label htmlFor="userRole">User role</label>
            <select
              id="role"
              className="fadeIn fifth"
              name="userRole"
              placeholder="Role"
              required
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
            >
              <option
                value={0}
                className="fadeIn"
                style={{ color: "#cccccc" }}
                default=""
              >
                Please select user role
              </option>
              <option value={1}>User</option>
              <option value={2}>Editor</option>
            </select>
            <div id="message1" style={{ color: "red", display: "none" }}>
              *Password must be atleast 8 characters long
            </div>
            <div id="message" style={{ color: "red", display: "none" }}>
              *Passwords do not match
            </div>
            <input
              type="submit"
              id="btn_submit"
              className="fadeIn sixth"
              value="Signup"
            />
          </form>
          <div id="formFooter">
            <Link style={{ textDecoration: "underline" }} to="/login">
              <b>Existing User? Login</b>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
