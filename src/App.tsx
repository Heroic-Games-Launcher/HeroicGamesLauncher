import React, {useContext} from "react";

import "./App.css";
import { Library } from "./components/Library";
import Login from './components/UI/Login';
import { HashRouter, Switch, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Settings from './components/Settings';
import GamePage from './components/UI/GamePage';
import Header from './components/UI/Header';
import ContextProvider from './state/ContextProvider';

function App() {
  const context = useContext(ContextProvider);

  const { user, data: library, refresh, handleOnlyInstalled } = context;

  if (!user && !library.length) {
    return <Login refresh={refresh} />
  }

  const numberOfGames = library.length
   
  return (
    <div className="App">
    <HashRouter>
      <NavBar />
      <Switch>
        <Route exact path="/">
          <Header
            renderBackButton={false}
            handleOnlyInstalled={handleOnlyInstalled}
            numberOfGames={numberOfGames}
           />
          <Library 
            library={library}
          />
        </Route>
        <Route exact path="/gameconfig/:appName" component={GamePage} />
        <Route exact path="/settings/:type/:appName" component={Settings} />
      </Switch>
    </HashRouter>
    </div>
  )

  }

export default App;
