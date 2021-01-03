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
import Header from './components/UI/Header';

interface State {
  user: string;
  library: Array<Game>;
}

function App() {
  const [config, setConfig] = useState({} as State);
  const [refreshing, setRefreshing] = useState(false);
  const [filterText, setFilterText] = useState('');

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

  if (!user && !library.length) {
    return <Login user={user} refresh={setRefreshing} />
  }

  const handleSearch = (input: string) => setFilterText(input)

  const filterRegex: RegExp = new RegExp(String(filterText), 'i')
  const textFilter = ({ title }: Game) => filterRegex.test(title)
  library.filter(textFilter)

  const hasGames = Boolean(library.length)
  const installedGames = library.filter(game => game.isInstalled).filter(textFilter)
  const libraryTitle = hasGames ? `Library (${library.filter(textFilter).length} Games)` : 'No Games Found'
  const installedTitle = hasGames ? `Installed (${installedGames.length} Games)` : 'No Games Found'
  
  return (
    <div className="App">
    <HashRouter>
      <NavBar handleSearch={handleSearch} user={user} handleRefresh={setRefreshing} />
      <Switch>
        <Route exact path="/">
          <Header
            title={libraryTitle} 
            renderBackButton={false}
           />
          <Library 
            library={library.filter(textFilter)}
            user={user}
          />
        </Route>
        <Route exact path="/gameconfig" component={GameConfig} />
        <Route exact path="/settings" component={Settings} />
        <Route exact path="/installed" component={Installed}>
        <Header
            title={installedTitle} 
            renderBackButton={false}
           />
          <Library 
            library={installedGames.filter(textFilter)}
            user={user}
          />
        </Route>
      </Switch>
    </HashRouter>
    </div>
  )

  }

export default App;
