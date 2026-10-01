import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from '../routes/router'

export function App() {
  return (
    <BrowserRouter useTransitions={false}>
      <AppRouter />
    </BrowserRouter>
  )
}
