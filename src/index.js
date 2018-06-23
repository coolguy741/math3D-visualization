import React from 'react'
import store from './store'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'

import MathScopeProvider from './containers/MathScopeContext'
import { scopeEvaluator } from './constants/parsing'

import theme from './constants/theme'
import { ThemeProvider } from 'styled-components'

const target = document.querySelector('#root')

render(
  <Provider store={store}>
    <MathScopeProvider scopeEvaluator={scopeEvaluator}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </MathScopeProvider>
  </Provider>,
  target
)
registerServiceWorker()
