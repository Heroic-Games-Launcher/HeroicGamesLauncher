import React, { useState } from "react";

interface Props {
  children: React.ReactNode;
}

export default function InfoBox({ children }: Props) {
  const [isHidden, setIsHidden] = useState(true);
  return (
    <>
      <span className="helpLink" onClick={() => setIsHidden(!isHidden)}>
        <p>Help</p>
        <i className="material-icons">info</i>
      </span>
    <div 
      style={{display: isHidden ? 'none' : 'block'}}
      className="infoBox"
    >
      {children}
    </div>
    </>
  );
}
