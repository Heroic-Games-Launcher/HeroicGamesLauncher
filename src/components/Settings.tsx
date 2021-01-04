import React from "react";
import Header from "./UI/Header";

export default function Settings() {
  return (
    <>
      <Header title={"Settings"} renderBackButton={false} />
      <div className="Settings">
        <div className="settingsWrapper">
          <span className="defaultWine">
            <span className="settingsText">Default Wine Version</span>
            <select name="wineVersion" id="wineVersion">
              <option>Wine Staging</option>
            </select>
          </span>
          <span className="defaultWinePrefix">
            <span className="settingsText">Default WinePrefix</span>
            <span>
              <input
                type="text"
                placeholder={"~/.wine"}
                className="searchInput settingsInput"
              />
              <button className="loginButton settingsButton">Choose</button>
            </span>
          </span>
        </div>
      </div>
    </>
  );
}
