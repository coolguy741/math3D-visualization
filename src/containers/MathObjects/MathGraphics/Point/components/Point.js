import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import MathObject from 'containers/MathObjects/MathObject'
import {
  Settings,
  StatusSymbol,
  MainRow,
  MathInput
} from 'containers/MathObjects/components'
import { POINT } from 'containers/MathObjects/mathObjectTypes'

export default class Point extends PureComponent {

  state = {
    isSettingsVisible: false
  }

  static propTypes = {
    id: PropTypes.string.isRequired,
    coords: PropTypes.string.isRequired, // latex
    color: PropTypes.string.isRequired,
    visible: PropTypes.bool.isRequired,
    errors: PropTypes.objectOf(PropTypes.string).isRequired,
    setValidatedProperty: PropTypes.func.isRequired,
    setProperty: PropTypes.func.isRequired,
    toggleVisibility: PropTypes.func.isRequired,
    setColor: PropTypes.func.isRequired,
    setError: PropTypes.func.isRequired
  }

  render() {
    return (
      <MathObject
        id={this.props.id}
        type={POINT}
        sidePanelContent={
          <StatusSymbol
            color={this.props.color}
            isFilled={this.props.visible}
            onToggleVisibility={this.props.toggleVisibility}
            onPickColor={this.props.setColor}
          />
        }
      >
        <MainRow>
          <MathInput
            field='coords'
            errorMsg={this.props.errors.coords}
            latex={this.props.coords}
            onValidatedTextChange={this.props.setValidatedProperty}
            onValidatorChange={this.props.setError}
          />
          <Settings title='Point Settings'>
            <p>Hello</p>
            <p>World</p>
            <div style={ { height: '20px', width: '300px', backgroundColor: 'blue' } }/>
          </Settings>
        </MainRow>
      </MathObject>
    )
  }

}
