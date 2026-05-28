import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './styles.css';

import { MantineProvider, createTheme } from '@mantine/core';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

const theme = createTheme({
  primaryColor: 'teal',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  defaultRadius: 'sm',
  components: {
    Button: {
      defaultProps: {
        radius: 'sm'
      }
    },
    ActionIcon: {
      defaultProps: {
        radius: 'sm'
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
