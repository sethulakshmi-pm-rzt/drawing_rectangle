import React, { Component } from 'react';
import './App.css';
import RectHandling from './component/Rectangle/RectHandling';

class App extends Component {
  render() {
    return (
      <div className="App">
        Drawing Rect
        <RectHandling />
      </div>
    );
  }
}

export default App;
