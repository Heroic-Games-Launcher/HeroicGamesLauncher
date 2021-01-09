import React, { useState } from "react";
import { legendary, loginPage } from "../../helper";

interface Props {
  refresh: () => void;
}

export default function Login({ refresh }: Props) {
  const [input, setInput] = useState("Paste the SID number here");
  const [status, setStatus] = useState({
    loading: false,
    message: "",
  });
  const { loading, message } = status;

  const handleLogin = async (sid: string) => {
    setStatus({
      loading: true,
      message: "Logging In...",
    });

    await legendary(`auth --sid ${sid}`).then(async (res) => {
      if (res !== "error") {
        setStatus({ loading: true, message: "Loading Game list, please wait" });
        await legendary(`list-games`);
        refresh();
      }

      setStatus({ loading: true, message: "Error" });
      setTimeout(() => {
        setStatus({ ...status, loading: false });
      }, 2500);
    });
  };

  return (
    <div className="Login">
      <div className="loginWrapper">
        <div className="heroicLogo">
          <span className="logo" />
          <div className="heroicText">
            <span className="heroicTitle">Heroic</span>
            <span className="heroicSubTitle">Games Launcher</span>
          </div>
        </div>
        <div className="loginFormWrapper">
          <span className="loginInstructions">
            <strong>Welcome!</strong>
            <p>
              In order for you to be able to log in and install your games, we
              first need you to follow the steps below:
            </p>
            <ol>
              <li>
                Open{" "}
                <span
                  onClick={() => loginPage()}
                  className="epicLink"
                >
                  Epic Store here
                </span>
                , log in your account and copy your{" "}
                <span className="sid">SID information number</span>.
              </li>
              <li>
                Paste the <span className="sid">SID number</span> in the input
                box below, click on the login button and wait.
              </li>
            </ol>
          </span>
          <div className="loginForm">
            <input
              className="loginInput"
              id="sidInput"
              onChange={(event) => setInput(event.target.value)}
              placeholder={input}
            />
            {loading && <p className="message">{message}<span className="material-icons">autorenew</span> </p>}
            <button
              onClick={() => handleLogin(input)}
              className="button login"
              disabled={loading}
            >
               Login
            </button>
          </div>
        </div>
      </div>
          <span className="loginBackground"></span>
    </div>
  );
}
