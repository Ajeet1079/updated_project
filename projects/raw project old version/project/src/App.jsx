import React from 'react';
import STLViewer from './STLViewer';
import MultiFormatViewer from './Multiformatconverter';
import IntegratedCADViewer from './allViewer'
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>3D STL Viewer</h1>
        <p>Advanced STL file viewer with measurement and cross-section tools</p>
      </header>
      
      <main className="App-main">
        {/* <MultiFormatViewer /> */}
        {/* <IntegratedCADViewer /> */}
        <STLViewer />
      </main>
      
      <footer className="App-footer">
        <p>Use the controls to navigate, measure, and cross-section your 3D model</p>
      </footer>
    </div>
  );
}

export default App;