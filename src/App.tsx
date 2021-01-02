import React from "react";

import "./App.css";
import NavBar from './components/UI/NavBar'
import { Library } from "./components/Library";
import { Game, getLegendaryConfig } from "./helper";
import Login from './components/UI/Login';

interface State {
  user: string;
  library: Array<Game>;
}

function App() {
  const [config, setConfig] = React.useState({} as State);
  const [showLogin, setShowLogin] = React.useState(false)
  const handleOnClick = () => setShowLogin(!showLogin)

  React.useEffect(() => {
    const updateConfig = async () => {
      console.log('useEffect');
      
      const newConfig = await getLegendaryConfig();
      newConfig && setConfig(newConfig);
    };
    updateConfig();
  }, []);

  if (!Object.entries(config).length) {
    return null
  }
   
  console.log(config);

  const { user, library } = config;
  const hasGames = Boolean(library.length);

    return (
      <div className="App">
      <NavBar 
        hasGames={hasGames} 
        user={user ? user : 'LogIn'} 
        handleOnClick={handleOnClick}
      />
      {showLogin && <Login />}
      <Library 
        library={library}
        user={user}
      />
      </div>
    );
  }

export default App;
