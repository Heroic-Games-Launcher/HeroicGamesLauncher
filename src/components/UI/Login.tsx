import React, { Dispatch, SetStateAction, useState } from "react";
import { createNewWindow, legendary } from "../../helper";

interface Props {
  user: string;
  refresh: Dispatch<SetStateAction<boolean>>;
}

export default function Login({ user, refresh }: Props) {
  const [input, setInput] = useState("Input here the SID value");
  const [status, setStatus] = useState({
    loading: false,
    message: "",
  });
  const {loading, message} = status;

  const loginUrl = "https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect"

  const handleLogin = async (sid: string) => {
    setStatus({
      loading: true,
      message: "Logging In...",
    });
    
    await legendary(`auth --sid ${sid}`);
    setStatus({ loading: true, message: "Loading Game list" });
    refresh(true);
    await legendary(`list-games`);
    refresh(false);
    setStatus({ loading: false, message: "Games Loaded!" });
  };

  const handleLogout = async () => {
    setStatus({
      loading: true,
      message: "Logging Out...",
    });
    await legendary(`auth --delete`);
    refresh(true);
    setStatus({ loading: false, message: "'You're Logged out!" });
    refresh(false);
  };

if (loading) {
  return <div>{message}</div>
}

  return (
    <div className="Login">
      {user ? (
        <>
          <p>You're logged in as: {user}</p>
          <button onClick={() => handleLogout()} className="button ">
            Logout
          </button>
        </>
      ) : (
        <>
          <input
            id="sidInput"
            onChange={(event) => setInput(event.target.value)}
            placeholder={input}
          />
          <div className="buttonsWrapper">
            <button
              onClick={() => createNewWindow(loginUrl)}
              className="button is-secondary"
            >
              Epic Store
            </button>
            <button
              onClick={() => handleLogin(input)}
              className="button is-primary"
            >
              Login
            </button>
          </div>
          <p>
            <strong>Instructions </strong>
            <ol>
              <li>Open Epic Store clicking on the button above</li>
              <li>Login</li>
              <li>Copy the SID information</li>
              <li>Paste the code inside the input field and click Login</li>
            </ol>
          </p>
        </>
      )}
    </div>
  );
}
