// @flow
import * as React from 'react'
import styled from 'styled-components'

/**
 * ScrollWithOverflow is a component intended to allow scrolling in the
 * y-direction and overflow in the x-direction.
 *
 * Naively, this would just be achieved by setting
 *    overflow-x: visible;
 *    overflow-y: scroll;
 * on whatever div you want. But that doesn't work:
 *    https://stackoverflow.com/questions/6421966/css-overflow-x-visible-and-overflow-y-hidden-causing-scrollbar-issue
 * This component solves the problem by adding positive padding and
 * negative margin:
 *  padding-right: 100vw;
 *  margin-right: -100vw;
 * so that children can appear to overflow without actually overflowing.
 *
 * This approach has a few downsides:
 *  1. Other elements in the padding region do not receive pointer events.
 *    - solved by z-index settings on Scene/SceneBoundary
 *    - also required child popovers to use root as parent
 *  2. The scrollbar disappears (pushed by padding)
 *    - TODO: Solve this, or at least alleviate with other styling (like
 *      top/bottom shadows) to indicate scrolling
 * Not ideal, but the best I've got for now...
 */

const ScrollingDiv = styled.div`
  display:flex;
  overflow-y: scroll;
  padding-right: 100vw;
  margin-right: -100vw;
  height: 100%;
  pointer-events: ${props => props.hasPointer ? 'auto' : 'none'};
  border: 1pt solid red;
  border-color: ${props => props.hasPointer ? 'blue' : 'red'}
`

const ScrollingDivInner = styled.div`
  overflow-x:visible;
  height:100%;
  pointer-events: auto;
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: 1;
  width:100%;
`

const PaddingCover = styled.div`
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: 0;
  max-width:0px;
  padding-right: 100vw;
  margin-right: -100vw;
  border: 1pt solid green;
  pointer-events: auto;
  pointer-events: ${props => props.hasPointer ? 'none' : 'auto'};
`

type Props = {
  children?: React.Node
}

type State = {
  pointerOnLeft: boolean
}

export default class ScrollWithOverflow extends React.PureComponent<Props, State> {

  state = {
    pointerOnLeft: false
  }

  pointerOn = () => {
    this.setState( { pointerOnLeft: true } )
  }

  pointerOff = () => {
    this.setState( { pointerOnLeft: false } )
  }

  paddingDown = (event) => {
    this.setState( { pointerOnLeft: false } )

    const synth = event.pointerType === 'mouse'
      ? new MouseEvent('mousedown', {
        view: event.view,
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        button: event.button,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        pageX: event.pageX,
        pageY: event.pageY
      } )
      : new TouchEvent('touchstart', {
        view: event.view,
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        touches: event.touches
      } )

    const { domElement } = window.mathbox.three.controls
    domElement.dispatchEvent(synth)
  }

  render() {
    return (
      <ScrollingDiv hasPointer={this.state.pointerOnLeft}>
        <ScrollingDivInner
          onPointerDown={this.pointerOn}
          onTouchStart={this.pointerOn}
        >
          {this.props.children}
        </ScrollingDivInner>
        <PaddingCover
          onPointerDown={this.paddingDown}
          onTouchStart={this.pointerOff}
          hasPointer={!this.state.pointerOnLeft}
        />
      </ScrollingDiv>
    )
  }

}
