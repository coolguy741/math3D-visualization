import {
  createMathObject
} from 'containers/MathObjects/actions'
export const VARIABLE_SLIDER = 'VARIABLE_SLIDER'
export const SET_SLIDER_VALUE = 'SET_SLIDER_VALUE'

const defaultSettings = {
  type: VARIABLE_SLIDER,
  name: 'T',
  value: 0,
  description: 'Variable Slider',
  errors: {}
}

export const createVariableSlider = (id, parentFolderId, positionInFolder) => {
  return createMathObject(id, VARIABLE_SLIDER, parentFolderId, positionInFolder, defaultSettings)
}

export function setSliderValue(id, value) {
  return {
    type: SET_SLIDER_VALUE,
    payload: { id, value }
  }
}
