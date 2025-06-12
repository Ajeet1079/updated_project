import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import GLBViewer from './glbviewer'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
       <div className="App">
      <header className="App-header">
        <h1>3D GLB Viewer</h1>
        <p>Advanced GLB file viewer with measurement and cross-section tools</p>
      </header>
      
      <main className="App-main">
        {/* <MultiFormatViewer /> */}
        {/* <IntegratedCADViewer /> */}
        <GLBViewer />
      </main>
      
      <footer className="App-footer">
        <p>Use the controls to navigate, measure, and cross-section your 3D model</p>
      </footer>
    </div>
    </>
  )
}

export default App
