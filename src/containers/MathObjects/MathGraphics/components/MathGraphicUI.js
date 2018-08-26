// @flow
import * as React from 'react'
import MathObjectUI from 'containers/MathObjects/MathObjectUI'
import { StatusSymbol, MainRow } from 'containers/MathObjects/components'
import Settings from 'containers/MathObjects/containers/Settings'
import typeof {
  toggleProperty,
  setProperty
} from 'containers/MathObjects/actions'
import { capitalize } from 'utils/helpers'
import type { MetaData } from '../types'
import { MathInputRHS } from 'containers/MathObjects/containers/MathInput'

type Props = {
  id: string,
  type: string,
  color: string,
  visible: bool,
  toggleProperty: toggleProperty,
  setProperty: setProperty,
  children: React.Node,
  metadata: MetaData,
  settingsTitle?: string,
  mainField?: string
}

function getSettingsFormSpec(metadata: MetaData) {
  return Object.keys(metadata)
    .filter(property => !metadata[property].isPrimary)
    .sort()
    .map(property => {
      const { inputType, label = property } = metadata[property]
      return { property, inputType, label }
    } )
}

export default class MathGraphicUI extends React.PureComponent<Props> {

  constructor(props: Props) {
    super(props)
    // $FlowFixMe: https://github.com/facebook/flow/issues/1517
    this.onToggleVisibility = this.onToggleVisibility.bind(this)
    // $FlowFixMe: https://github.com/facebook/flow/issues/1517
    this.onPickColor = this.onPickColor.bind(this)
  }

  onToggleVisibility() {
    const { id, type } = this.props
    this.props.toggleProperty(id, type, 'visible')
  }

  onPickColor(value: string) {
    const { id, type } = this.props
    this.props.setProperty(id, type, 'color', value)
  }

  render() {
    const settingsTitle = this.props.settingsTitle === undefined
      ? `${capitalize(this.props.type)} Settings`
      : this.props.settingsTitle
    return (
      <MathObjectUI
        id={this.props.id}
        type={this.props.type}
        sidePanelContent={
          <StatusSymbol
            color={this.props.color}
            isFilled={this.props.visible}
            onToggleVisibility={this.onToggleVisibility}
            onPickColor={this.onPickColor}
          />
        }
      >
        <MainRow>
          {
            this.props.mainField
              ? (
                <MathInputRHS
                  field={this.props.mainField}
                  parentId={this.props.id}
                />
              )
              : this.props.children
          }
          <Settings
            title={settingsTitle}
            parentId={this.props.id}
            settingsList={getSettingsFormSpec(this.props.metadata)}
          />
        </MainRow>
        {this.props.mainField && this.props.children}
      </MathObjectUI>
    )
  }

}
