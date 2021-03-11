"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GamepadApi = {
    turbo: false,
    controller: {},
    connect,
    update,
    buttons: [],
    buttonsCache: [],
    buttonsStatus: [],
    axesStatus: [],
    disconnected: true,
};
const fps = 10;
function connect() {
    GamepadApi.controller = navigator.getGamepads()[0];
    GamepadApi.disconnected = false;
    GamepadApi.turbo = true;
    update();
    // Limit frameRate (10/15 fps looks better for scrolling through elements)
    !GamepadApi.disconnected
        ? setTimeout(() => {
            requestAnimationFrame(connect);
        }, 1000 / fps)
        : null;
}
//navigator.getGamepads()[0] ? requestAnimationFrame(connect) : null
function update() {
    const c = GamepadApi.controller;
    // clear the buttons cache
    GamepadApi.buttonsCache = [];
    // move the buttons status from the previous frame to the cache
    for (let k = 0; k < GamepadApi.buttonsStatus.length; k++) {
        GamepadApi.buttonsCache[k] = GamepadApi.buttonsStatus[k];
    }
    // clear the buttons status
    GamepadApi.buttonsStatus = [];
    // loop through buttons and push the pressed ones to the array
    const pressed = [];
    if (c.buttons) {
        for (let b = 0, t = c.buttons.length; b < t; b++) {
            if (c.buttons[b].pressed) {
                const ev = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                });
                if (c.buttons[0].pressed) {
                    const selection = document.querySelector('[tabindex="0"]');
                    const playBtn = document.querySelector('.is-success');
                    console.log(playBtn);
                    selection ? selection.children[0].dispatchEvent(ev) : null;
                    playBtn
                        ? (playBtn.dispatchEvent(ev), (GamepadApi.disconnected = true))
                        : null;
                }
                if (c.buttons[1].pressed) {
                    console.log('quit');
                    const selection = document.querySelector('.returnLink');
                    selection ? selection.children[0].dispatchEvent(ev) : null;
                }
                pressed.push(c.buttons[b]);
            }
        }
    }
    // loop through axes and push their values to the array
    const axes = [];
    GamepadApi.axesStatus = [];
    if (c.axes) {
        for (let a = 0, x = c.axes.length; a < x; a++) {
            axes.push(+c.axes[a].toFixed(2));
        }
    }
    // assign received values
    GamepadApi.axesStatus = axes;
    GamepadApi.buttonsStatus = pressed;
    // Right stick Xbox360 Down
    if (axes[3] === 1) {
        window.scroll({
            top: window.pageYOffset + 300,
            left: 0,
            behavior: 'auto',
        });
    }
    // Right stick Xbox360 Up
    if (axes[3] === -1) {
        window.scroll({
            top: window.pageYOffset - 300,
            left: 0,
            behavior: 'auto',
        });
    }
    // Left stick Xbox360 Right
    if (axes[0] === 1) {
        focusElm('right');
    }
    // Left stick Xbox360 Left
    if (axes[0] === -1) {
        focusElm('left');
    }
    // Left stick Xbox360 Up
    if (axes[1] === -1) {
        focusElm('up');
    }
    // Left stick Xbox360 Down
    if (axes[1] === 1) {
        focusElm('down');
    }
}
let num = 0;
const focusElm = (thumbStickAxe) => {
    const elem = document.querySelectorAll('.gameCard');
    if (elem) {
        switch (thumbStickAxe) {
            case 'up':
                num - 10 < 0 ? (num = elem.length - 1) : (num -= 10);
                break;
            case 'down':
                num + 10 > elem.length - 1 ? (num = 0) : (num += 10);
                break;
            case 'left':
                num === 0 ? (num = elem.length - 1) : (num -= 1);
                break;
            case 'right':
                num === elem.length - 1 ? (num = 0) : (num += 1);
                break;
            default:
                break;
        }
        for (let i = 0; i < elem.length; i++) {
            elem[i].tabIndex = -1;
            elem[num].tabIndex = 0;
            elem[num].focus();
        }
    }
};
exports.default = GamepadApi;
