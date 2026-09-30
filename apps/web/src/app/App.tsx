import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppRouter } from '../routes/router'

export function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster
        closeButton={true}
        position="bottom-right"
        offset={{
          bottom: '252px',
          right: 'max(12px, calc((100vw - 958px) / 2 + 12px))'
        }}
        style={{ zIndex: 9000 }}
        theme="dark"
        visibleToasts={5}
        toastOptions={{
          classNames: {
            toast: '!border-0 !bg-transparent !p-0 !shadow-none',
            error: '!border-0 !bg-transparent',
            info: '!border-0 !bg-transparent'
          }
        }}
      />
    </BrowserRouter>
  )
}
