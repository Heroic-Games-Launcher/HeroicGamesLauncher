import React, {useContext, useState} from "react";

import "./App.css";
import { Library } from "./components/Library";
import Login from './components/UI/Login';
import { HashRouter, Switch, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Settings from './components/Settings';
import GameConfig from './components/UI/GameConfig';
import Header from './components/UI/Header';
import { Game } from './types';
import ContextProvider from './state/ContextProvider';

function App() {
  const [filterText, setFilterText] = useState('');
  const context = useContext(ContextProvider);

  const { user, data: library, refresh } = context;

  if (!user && !library.length) {
    return <Login refresh={refresh} />
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
      <NavBar handleSearch={handleSearch} />
      <Switch>
        <Route exact path="/">
          <Header
            title={libraryTitle} 
            renderBackButton={false}
           />
          <Library 
            library={library.filter(textFilter)}
          />
        </Route>
        <Route exact path="/gameconfig" component={GameConfig} />
        <Route exact path="/settings" component={Settings} />
      </Switch>
    </HashRouter>
    </div>
  )

  }

export default App;
