import React, {useState} from "react";

import "./App.css";
import { Library } from "./components/Library";
import { Game, getLegendaryConfig } from "./helper";
import Login from './components/UI/Login';
import { HashRouter, Switch, Route } from 'react-router-dom';
import Installed from './components/Installed';
import NavBar from './components/NavBar';
import Settings from './components/Settings';
import GameConfig from './components/UI/GameConfig';

interface State {
  user: string;
  library: Array<Game>;
}

function App() {
  const [config, setConfig] = useState({} as State);
  const [refreshing, setRefreshing] = useState(false);
  
  React.useEffect(() => {
    const updateConfig = async () => {
      const newConfig = await getLegendaryConfig();
      newConfig && setConfig(newConfig);
    };
    updateConfig();
  }, [refreshing]);

  if (!Object.entries(config).length) {
    return null
  }

  const { user, library } = config;

  if (!user) {
    return <Login user={user} refresh={setRefreshing} />
  }

  return (
    <div className="App">
    <HashRouter>
      <NavBar />
      <Switch>
        <Route exact path="/">
          <Library 
            library={library}
            user={user}
            refresh={setRefreshing}
          />
        </Route>
        <Route exact path="/gameconfig" component={GameConfig} />
        <Route exact path="/settings" component={Settings} />
        <Route exact path="/installed" component={Installed} />
      </Switch>
    </HashRouter>
    </div>
  )

  }

export default App;
