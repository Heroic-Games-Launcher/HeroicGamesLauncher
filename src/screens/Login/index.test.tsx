import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { ipcRenderer } from 'src/test_helpers/mock/electron';
import { resetTestTypes, test_string_response } from 'src/test_helpers/testTypes';
import { useTranslation } from 'react-i18next';
import Login from './index';

interface Props {
  refresh: () => Promise<void>
}

function renderLogin(props: Partial<Props> = {})
{
  const defaultProps: Props = {
    refresh: () => new Promise(() => {return;})
  };

  return render(
    <Login {... {...defaultProps, ...props }}/>
  );
}

describe('Login', () => {
  beforeEach(() => {
    resetTestTypes();
  })

  test('renders', () => {
    renderLogin();
  })

  test('language can be changend', () => {
    const { getByTestId } = renderLogin();
    const languageSelector = getByTestId('languageSelector');
    fireEvent.change(languageSelector, {target: {value: 'de'}});
    const { i18n } = useTranslation();
    expect(i18n.language).toBe('de');
  })

  test('click on epic link invokes ipcRenderer send', () => {
    const { getByTestId } = renderLogin();
    const epicLink = getByTestId('epicLink');
    fireEvent.click(epicLink);
    expect(ipcRenderer.send).toBeCalledWith('openLoginPage');
  })

  test('click on sid help invokes ipcRenderer send', () => {
    const { getByTestId } = renderLogin();

    const sid1 = getByTestId('sid1');
    fireEvent.click(sid1);
    expect(ipcRenderer.send).toBeCalledWith('openSidInfoPage');

    const sid2 = getByTestId('sid2');
    fireEvent.click(sid2);
    expect(ipcRenderer.send).toBeCalledWith('openSidInfoPage');

    expect(ipcRenderer.send).toBeCalledTimes(2);
  })

  test('login button is disabled with incorrect sid', () => {
    const { getByTestId } = renderLogin();

    const loginInput = getByTestId('loginInput');
    const loginButton = getByTestId('loginButton');

    expect(loginButton).toBeDisabled();

    // one character to short (29)
    fireEvent.change(loginInput, {target: {value: '00000000000000000000000000000'}});
    expect(loginButton).toBeDisabled();

    // exactly 30 characters
    fireEvent.change(loginInput, {target: {value: '000000000000000000000000000000'}});
    expect(loginButton).not.toBeDisabled();
  })

  test('click login fails', async () => {
    const onRefresh = jest.fn();
    test_string_response.set('error');

    const { getByTestId } = renderLogin({refresh: onRefresh});

    const loginInput = getByTestId('loginInput');
    const loginButton = getByTestId('loginButton');

    fireEvent.change(loginInput, {target: {value: '000000000000000000000000000000'}});
    fireEvent.click(loginButton);

    const message = getByTestId('message');
    await waitFor(() => expect(message).toHaveTextContent('status.error'));
    await waitFor(() => expect(onRefresh).not.toBeCalled());
    await waitFor(() => expect(ipcRenderer.invoke).not.toBeCalledWith('refreshLibrary'));
  })

  test('click login successed', async () => {
    const onRefresh = jest.fn();
    const { getByTestId } = renderLogin({refresh: onRefresh});

    const loginInput = getByTestId('loginInput');
    const loginButton = getByTestId('loginButton');

    fireEvent.change(loginInput, {target: {value: '000000000000000000000000000000'}});
    fireEvent.click(loginButton);

    await waitFor(() => expect(onRefresh).toBeCalled());
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith('refreshLibrary'));
  })
})
