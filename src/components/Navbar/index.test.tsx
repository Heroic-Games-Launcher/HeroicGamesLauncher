import React, { Suspense } from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react'

import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { createNewWindow } from 'src/helpers';
import { useTranslation } from 'react-i18next';
import NavBar from './index';

// Fixme: Don't mock this function. Better mock electron -> BrowserWindow
// Todo: Find out how to mock classes like BrowserWindow
jest.mock('src/helpers', () => ({
  createNewWindow: jest.fn()
}));

let selectedLanguage = 'custom';
jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      i18n: {
        changeLanguage: (lang: string) => selectedLanguage = lang,
        language: selectedLanguage
      },
      t: (str: string) => str
    };
  }
}));

async function renderNavBar()
{
  const history = createMemoryHistory();
  const renderObject = await render(
    <Suspense fallback="">
      <Router history={history}>
        <NavBar />
      </Router>
    </Suspense>);
  await waitFor(() => expect(renderObject.getByTestId('searchBar')));
  await waitFor(() => expect(renderObject.getByTestId('userSelector')));
  return renderObject;
}

describe('NavBar', () => {

  test('renders', async () => {
    return await renderNavBar();
  })

  test('NavLink are on click active', async () => {
    const { getByTestId } = await renderNavBar();

    const libraryLink = getByTestId('library');
    const settingsLink = getByTestId('settings');

    expect(libraryLink).toHaveTextContent('Library');
    expect(settingsLink).toHaveTextContent('Settings');

    expect(libraryLink).toHaveClass('active');

    fireEvent.click(settingsLink);
    expect(settingsLink).toHaveClass('active');

    fireEvent.click(libraryLink);
    expect(libraryLink).toHaveClass('active');
  })

  test('click on store or wiki calls createNewWindow', async () => {
    const { getByTestId } = await renderNavBar();

    const { i18n } = useTranslation();

    const storeLink = getByTestId('store');
    expect(storeLink).toHaveTextContent('store');
    fireEvent.click(storeLink);
    expect(createNewWindow).toBeCalledWith('https://www.epicgames.com/store/' + i18n.language + '/');

    const wikiLink = getByTestId('wiki');
    expect(wikiLink).toHaveTextContent('wiki');
    fireEvent.click(wikiLink);
    expect(createNewWindow).toBeCalledWith('https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki');
  })

  test('changing language to pt changes store link', async () => {
    const { i18n } = useTranslation();
    i18n.changeLanguage('pt');

    const { getByTestId } = await renderNavBar();

    const storeLink = getByTestId('store');
    expect(storeLink).toHaveTextContent('store');
    fireEvent.click(storeLink);
    expect(createNewWindow).toBeCalledWith('https://www.epicgames.com/store/pt-BR/');
  })
})
