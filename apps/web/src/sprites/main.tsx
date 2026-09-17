import '../../globals.css'
import { createRoot } from 'react-dom/client'
import { SpritesApp } from './SpritesApp'

const root = document.getElementById('root')
if (!root) {
  throw new Error('root element not found')
}

createRoot(root).render(<SpritesApp />)
