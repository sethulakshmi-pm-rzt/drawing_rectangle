import React, { Component } from 'react';
import './App.css';
import RectComp from './component/Rectangle/Rect'

class App extends Component {
  render() {
    return (
      <div className="App">
        Drawing Rect
        <RectComp/>
      </div>
    );
  }
}

export default App;
