import React from "react";
import Header from "./UI/Header";

export default function Settings() {
  return (
    <>
      <Header title={"Settings"} renderBackButton={false} />
      <div className="Settings">
        <div className="settingsWrapper">
          <span className="setting">
            <span className="settingText">Default Wine Version</span>
            <select className="settingSelect" name="wineVersion" id="wineVersion">
              <option>Wine Staging</option>
            </select>
          </span>
          <span className="setting">
            <span className="settingText">Default WinePrefix</span>
            <span>
              <input
                type="text"
                placeholder={"~/.wine"}
                className="settingSelect"
              />
              <button className="settingButton">Choose</button>
            </span>
          </span>
        </div>
      </div>
    </>
  );
}
