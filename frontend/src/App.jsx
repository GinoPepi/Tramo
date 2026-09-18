import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import ChatView from './pages/ChatView'

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
        <Link to="/chat">Chat Interface</Link>
      </nav>

      {/* The Routes block dictates which page loads based on the URL */}
      <div style={{ padding: '2rem' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<ChatView />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}



