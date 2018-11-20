// @flow
import React, { PureComponent } from 'react'
import { Button, Popover, Icon, Input } from 'antd'
import { saveGraph } from 'services/api'
import { dehydrate } from 'store/hydration'
import randomstring from 'randomstring'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import typeof { setProperty as SetProperty } from 'containers/MathObjects/actions'
import getCameraData from 'services/getCameraData'
import { CAMERA } from 'containers/MathObjects'
import styled, { keyframes } from 'styled-components'

const SharePopoverContainer = styled.div`
  max-width: 300px;
  display: flex;
  align-items: center;
  flex-direction:column;
`

const CopyContainer = styled.div`
  display: flex;
  align-items: center;
`

const fadeIn = keyframes`
  from { opacity: 0 }
  to { opacity: 1 }
`
const CopyStatus = styled.div`
  font-size: 125%;
  width: 75px;
  margin: 10px;
  color: ${props => props.theme.primary[4]};
  font-weight: strong;
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  animation: ${props => props.isVisible ? fadeIn : ''} 100ms linear;
`

const copyButtonStyle = { margin: '10px' }

type Props = {
  onClick: () => void,
  state: {},
  setProperty: SetProperty
}
type State = {
  id: ?string,
  isCopied: boolean
}

export default class ShareButton extends PureComponent<Props, State> {

  state = {
    id: null,
    isCopied: false
  }

  getId() {
    return randomstring.generate( { length: 1 } ) +
      randomstring.generate( { length: 7, charset: 'alphanumeric' } )
  }

  saveCameraData = () => {
    const { position, lookAt } = getCameraData()
    const id = 'camera'
    const type = CAMERA
    this.props.setProperty(id, type, 'relativePosition', position)
    this.props.setProperty(id, type, 'relativeLookAt', lookAt)
  }

  saveGraph = () => {
    this.saveCameraData()
    const dehydrated = dehydrate(this.props.state)
    const id = this.getId()
    saveGraph(id, dehydrated)
    this.setState( { id } )
  }

  onCopy = async() => {
    this.setState( { isCopied: true } )
  }

  renderContent() {
    const url = this.state.id && `https://math3d-react.herokuapp.com/${this.state.id}`
    return (
      <SharePopoverContainer>
        <Input value={url}/>
        <CopyContainer>
          <CopyToClipboard text={url} onCopy={this.onCopy}>
            <Button type='primary' style={copyButtonStyle} >Copy</Button>
          </CopyToClipboard>
          <CopyStatus isVisible={this.state.isCopied}>
            Copied!
          </CopyStatus>
        </CopyContainer>

        <p>
          <Icon type="warning" theme="outlined" /> This updated version of math3d is in <strong>beta</strong>.
          Graphs saved now may not work in the future.
        </p>
      </SharePopoverContainer>
    )
  }

  render() {
    return (
      <Popover placement="bottomRight" title={'Share your scene'} content={this.renderContent()} trigger="click">
        <Button
          size='small'
          type='ghost'
          onMouseEnter={this.saveCameraData}
          onClick={this.saveGraph}
        >
          Share
        </Button>
      </Popover>
    )
  }

}
