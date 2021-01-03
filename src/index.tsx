import React from "react";
import ReactDOM from "react-dom";
import { HashRouter, Route, Switch } from "react-router-dom";

import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import GameConfig from "./components/UI/GameConfig";
import Settings from './components/Settings';
import NavBar from './components/NavBar';
import Installed from './components/Installed';

ReactDOM.render(
  <React.StrictMode>
    <div className="App">
    <HashRouter>
      <NavBar />
      <Switch>
        <Route exact path="/" component={App} />
        <Route exact path="/gameconfig" component={GameConfig} />
        <Route exact path="/settings" component={Settings} />
        <Route exact path="/installed" component={Installed} />
      </Switch>
    </HashRouter>
    </div>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
