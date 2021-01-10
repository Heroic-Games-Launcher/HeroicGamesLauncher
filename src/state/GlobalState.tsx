import React, { useEffect, useState } from "react";
import Update from "../components/UI/Update";
import { getLegendaryConfig, legendary } from "../helper";
import { Game } from "../types";
import ContextProvider from "./ContextProvider";

interface Props {
  children: React.ReactNode;
}

const GlobalState = ({ children }: Props) => {
  const [user, setUser] = useState("");
  const [filterText, setFilterText] = useState("");
  const [data, setData] = useState([] as Game[]);
  const [installing, setInstalling] = useState([] as string[]);
  const [playing, setPlaying] = useState([] as string[]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [onlyInstalled, setOnlyInstalled] = useState(false);

  const refresh = async (): Promise<void> => {
    setRefreshing(true);
    const { user, library } = await getLegendaryConfig();
    setUser(user);
    setData(library);
    setRefreshing(false);
  };

  const refreshLibrary = async (): Promise<void> => {
    setRefreshing(true);
    await legendary("list-games");
    refresh();
  };

  const handleSearch = (input: string) => setFilterText(input);
  const handleOnlyInstalled = () => setOnlyInstalled(!onlyInstalled);

  const handleInstalling = (appName: string) => {
    const isInstalling = installing.includes(appName);

    // FIXME: For some reason the state is not being updated here without the timeout
    if (isInstalling) {
      const updatedInstalling = installing.filter((game) => game !== appName);
      setTimeout(() => {
        setInstalling(updatedInstalling);
      }, 200);
      return
      
    }
    return setInstalling([...installing, appName]);
  };

  const handlePlaying = (appName: string) => {
    const isPlaying = playing.includes(appName);

    if (isPlaying) {
      const updatedPlaying = playing.filter((game) => game !== appName);
      return setPlaying(updatedPlaying);
    }

    return setPlaying([...playing, appName]);
  };

  useEffect(() => {
    refresh();
  }, []);

  if (refreshing) {
    return <Update />;
  }

  const filterRegex: RegExp = new RegExp(String(filterText), "i");
  const textFilter = ({ title }: Game) => filterRegex.test(title);
  const installedFilter = (game: Game) =>
    onlyInstalled ? game.isInstalled : true;
  const filteredLibrary = data.filter(installedFilter).filter(textFilter);

  return (
    <ContextProvider.Provider
      value={{
        user,
        onlyInstalled,
        refreshing,
        playing,
        installing,
        error,
        data: filteredLibrary,
        refresh: refresh,
        refreshLibrary: refreshLibrary,
        handleInstalling: handleInstalling,
        handlePlaying: handlePlaying,
        handleOnlyInstalled: handleOnlyInstalled,
        handleSearch: handleSearch,
      }}
    >
      {children}
    </ContextProvider.Provider>
  );
};

export default GlobalState;
