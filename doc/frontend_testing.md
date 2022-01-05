# Overview of Frontend testing enviroment

## Configuration files

The frontend test's are running via jest.
The related config can be found under `src/jest.config.js`

Jest using [ts-jest](https://kulshekhar.github.io/ts-jest/) to test `.tsx` and `.ts` files and is configured
with the `tsconfig.js` from the root path.

## Mocks

All the global mocks can be found under `src/test_helpers/mock` and are
invoked if you import the following patterns in your frontend file:

- `*.css` files
  - ignoring `*.css` imports in the test
- `electron`
  - mocking all ipcRenderer calls with [jest-when](https://github.com/timkindberg/jest-when) plugin, which are invoked in the frontend source files.
  - provides a function to init all electron mocks.
    - this function is mostly called from other helper functions and shouldn't be needed that often.
- `react-i18next`
  - mocks the `useTranslation` hook and the `t` function

**Note1:** If you implement new ipcRenderer calls in the frontend, make sure they are resolved correctly in the `src/test_helpers/mock/electron.ts` file, else some test's can run in unresolved promises and fail.

**Note2:** If new mocks are needed globally add them to the field `moduleNameMapper` in the `src/jest.config.js`.

## Pre defined type configurations

In the file `src/test_helpers/testTypes.ts` are alot of predefined
type configurations which can be used to provide configurations for the
test's and also to manipulate them easy for your needs.

All this type configurations are defined via a template class `TestType<Type>`. This provides the function `set()`, `get()` and `reset()`.

Also there is a helper function `resetTestTypes()` which resets all type
configurations to there default values. It is a good practice to call this in a `beforeEach()` of a describe entry.
