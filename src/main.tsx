import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthKitProvider } from '@workos-inc/authkit-react'
import App from './App.tsx'
import './index.css'

const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthKitProvider
      clientId={clientId}
      onRefreshFailure={({ signIn }) => {
        signIn()
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthKitProvider>
  </React.StrictMode>,
)


