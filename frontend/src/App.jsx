import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChatView from './pages/ChatView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<ChatView />} />
      </Routes>
    </BrowserRouter>
  );
}