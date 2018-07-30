import React, { Component } from 'react';
import './App.css';
// import RectComp from './component/Rectangle/Rect'
import RectHandling from './component/Rectangle/RectHandling';

class App extends Component {
  render() {
    return (
      <div className="App">
        Drawing Rect
        <RectHandling
        />
        {/*<RectComp />*/}
      </div>
    );
  }
}

export default App;
