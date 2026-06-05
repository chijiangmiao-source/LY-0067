/* @refresh reload */
import { render } from 'solid-js/web'
import { HopeProvider } from '@hope-ui/solid'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')

render(() => (
  <HopeProvider config={{ initialColorMode: 'light' }}>
    <App />
  </HopeProvider>
), root!)
