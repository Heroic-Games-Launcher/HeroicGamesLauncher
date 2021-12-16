// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

window.require = require

// jest don't know the new function replaceAll.
// this declare replaceAll with replace
// ts-ignore needed, because shows conflict if replaceAll is defined
if (typeof String.prototype.replaceAll == 'undefined') {
  /* eslint-disable-next-line */
  // @ts-ignore
  String.prototype.replaceAll = function (
    match: string | RegExp,
    replace: string
  ) {
    return this.replace(new RegExp(match, 'g'), () => replace)
  }
}
