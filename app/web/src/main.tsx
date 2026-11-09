import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import './styles/tokens.css'
import './styles.css'
import './i18n'
import { theme, cssVariablesResolver } from './theme'
import App from './App'

// Refract is sunlit paper; there is no dark colourway, so the scheme is fixed to light.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} forceColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
)
