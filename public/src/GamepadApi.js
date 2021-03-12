"use strict";
/**
 * Support for Gamepad navigation
 * Documentation for gamepadApi https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
 * Documentation for gamepad mapping https://w3c.github.io/gamepad/#remapping
 */
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
    connected: false,
    timestamp: performance.now(),
};
let num = 0;
const fps = 5;
function connect() {
    GamepadApi.controller = navigator.getGamepads()[0];
    if (GamepadApi.controller.timestamp !== GamepadApi.timestamp) {
        GamepadApi.turbo = true;
        update();
    }
    // Limit frameRate (5/10 fps looks better for scrolling through elements)
    GamepadApi.connected
        ? setTimeout(() => {
            requestAnimationFrame(connect);
        }, 1000 / fps)
        : null;
}
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
                // Bottom button in right cluster | Launch game
                if (c.buttons[0].pressed && c.timestamp !== GamepadApi.timestamp) {
                    GamepadApi.timestamp = c.timestamp;
                    const selection = document.querySelector('[tabindex="0"]');
                    const playBtn = document.querySelector('.is-success');
                    selection ? selection.children[0].dispatchEvent(ev) : null;
                    playBtn
                        ? (playBtn.dispatchEvent(ev), (GamepadApi.connected = false))
                        : null;
                }
                //	Right button in right cluster | return to library
                if (c.buttons[1].pressed && c.timestamp !== GamepadApi.timestamp) {
                    GamepadApi.timestamp = c.timestamp;
                    const selection = document.querySelector('.returnLink');
                    selection ? selection.children[0].dispatchEvent(ev) : null;
                }
                //Top button in right cluster
                if (c.buttons[3].pressed && c.timestamp !== GamepadApi.timestamp) {
                    GamepadApi.timestamp = c.timestamp;
                    const switchBtn = document.querySelector('.layoutSelection > .MuiSvgIcon-root:not(.selectedLayout) ');
                    switchBtn ? (switchBtn.dispatchEvent(ev), (num = 0)) : null;
                }
                //Top left front button
                if (c.buttons[4].pressed && c.timestamp !== GamepadApi.timestamp) {
                    GamepadApi.timestamp = c.timestamp;
                    filternavigation('left');
                }
                //	Top right front button
                if (c.buttons[5].pressed && c.timestamp !== GamepadApi.timestamp) {
                    GamepadApi.timestamp = c.timestamp;
                    filternavigation('right');
                }
                // D-pad Up
                if (c.buttons[12].pressed) {
                    focusElm('up');
                }
                //D-pad Down
                if (c.buttons[13].pressed) {
                    focusElm('down');
                }
                //D-pad left
                if (c.buttons[14].pressed) {
                    focusElm('left');
                }
                //Dpad Right
                if (c.buttons[15].pressed) {
                    focusElm('right');
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
    // 	Horizontal axis for left stick (Right pos)
    if (axes[0] === 1) {
        focusElm('right');
    }
    // 	Horizontal axis for left stick (Left pos)
    if (axes[0] === -1) {
        focusElm('left');
    }
    // Vertical axis for left stick (Up pos)
    if (axes[1] === -1) {
        focusElm('up');
    }
    // Vertical axis for left stick (Down pos)
    if (axes[1] === 1) {
        focusElm('down');
    }
    // Vertical axis for right stick (Down pos)
    if (axes[3] === 1) {
        window.scroll({
            top: window.pageYOffset + 300,
            left: 0,
            behavior: 'auto',
        });
    }
    // Vertical axis for right stick (Up pos)
    if (axes[3] === -1) {
        window.scroll({
            top: window.pageYOffset - 300,
            left: 0,
            behavior: 'auto',
        });
    }
}
const focusElm = (thumbStickAxe) => {
    const elem = document.querySelectorAll('.gameCard, .gameListItem');
    if (elem) {
        const gameCard = Array.from(elem).some((e) => e.className === 'gameCard');
        switch (thumbStickAxe) {
            case 'up':
                gameCard
                    ? num - 10 < 0
                        ? (num = elem.length - 1)
                        : (num -= 10)
                    : num - 1 < 0
                        ? (num = elem.length - 1)
                        : (num -= 1);
                break;
            case 'down':
                gameCard
                    ? num + 10 > elem.length - 1
                        ? (num = 0)
                        : (num += 10)
                    : num + 1 > elem.length - 1
                        ? (num = 0)
                        : (num += 1);
                break;
            case 'left':
                gameCard ? (num === 0 ? (num = elem.length - 1) : (num -= 1)) : null;
                break;
            case 'right':
                gameCard ? (num === elem.length - 1 ? (num = 0) : (num += 1)) : null;
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
let filterNum = 0;
const filternavigation = (bump) => {
    const elem = document.querySelectorAll('.selectFilter > span:not(.filter-title) ');
    const ev = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
    });
    switch (bump) {
        case 'right':
            filterNum + 1 > elem.length - 1 ? (filterNum = 0) : (filterNum += 1);
            break;
        case 'left':
            filterNum - 1 < 0 ? (filterNum = elem.length - 1) : (filterNum -= 1);
            break;
        default:
            break;
    }
    for (let i = 0; i < elem.length; i++) {
        elem[filterNum].dispatchEvent(ev);
    }
};
exports.default = GamepadApi;
