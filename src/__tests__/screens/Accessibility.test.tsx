import React from 'react'
import { screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/dom'
import '@testing-library/jest-dom'
import { renderWithState } from 'src/__helpers__/render'
import Accessibility from 'src/screens/Accessibility'

test('can change the content font', async () => {
  const setFont = jest.fn()

  await act(async () => {
    renderWithState(<Accessibility />, {
      contentFontFamily: 'Arial',
      setContentFontFamily: setFont
    })
  })

  const fontInput = screen.getByLabelText(
    'Content Font Family (Default: "Cabin")'
  )
  expect(fontInput).toBeInTheDocument()

  await userEvent.selectOptions(fontInput, 'Comic Sans')

  expect(setFont).toHaveBeenCalledWith('Comic Sans')
})

test('can change the actions font', async () => {
  const setFont = jest.fn()

  await act(async () => {
    renderWithState(<Accessibility />, {
      actionsFontFamily: 'Arial',
      setActionsFontFamily: setFont
    })
  })

  const fontInput = screen.getByLabelText(
    'Actions Font Family (Default: "Rubik")'
  )
  expect(fontInput).toBeInTheDocument()

  await userEvent.selectOptions(fontInput, 'Comic Sans')

  expect(setFont).toHaveBeenCalledWith('Comic Sans')
})

test('can toggle off uninstalled games grayscale', async () => {
  const setConfig = jest.fn()

  await act(async () => {
    renderWithState(<Accessibility />, {
      allTilesInColor: false,
      setAllTilesInColor: setConfig
    })
  })

  const switchToggle = screen.getByLabelText('Show all game tiles in color')
  expect(switchToggle).toBeInTheDocument()

  await userEvent.click(switchToggle)

  expect(setConfig).toHaveBeenCalledWith(true)
})

test('can change zoom level', async () => {
  const setZoom = jest.fn()

  await act(async () => {
    renderWithState(<Accessibility />, {
      zoomPercent: 100,
      setZoomPercent: setZoom
    })
  })

  const zoomRange = screen.getByLabelText(/Zoom.*100.*/)
  expect(zoomRange).toBeInTheDocument()

  fireEvent.change(zoomRange, { target: { value: 80 } })

  expect(setZoom).toHaveBeenCalledWith(80)
})

test('shows the theme selector', async () => {
  await act(async () => {
    renderWithState(<Accessibility />)
  })

  expect(screen.getByLabelText('Select Theme')).toBeInTheDocument()
})
