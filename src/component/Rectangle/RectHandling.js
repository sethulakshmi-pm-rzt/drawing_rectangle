import * as d3 from 'd3';
import { uniqueId as _uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import cancel from './cancel.svg';
import tick from './checked.svg';
import './RectHandling.css';

const cursor = {
  _top_left: 'nwse-resize',
  _top_right: 'nesw-resize',
  _bottom_right: 'nwse-resize',
  _bottom_left: 'nesw-resize',
  _top: 'ns-resize',
  _left: 'ew-resize',
  _right: 'ew-resize',
  _bottom: 'ns-resize',
};

const panelIcons = [
  {
    id: 1,
    button: '+',
    desc: 'Create rectangle',
  },
  {
    id: 2,
    button: '-',
    desc: 'Remove rectangle',
  },
  {
    id: 3,
    button: 'M',
    desc: 'Merge rectangles',
  },
  {
    id: 4,
    button: 'S',
    desc: 'Split rectangles',
  },
  {
    id: 5,
    button: 'R',
    desc: 'Resize rectangle',
  },
];

function findPositionOnRect({ x, y, x1, y1, height, width }) {
  let cursorType = '';
  if (isNear(y, y1)) {
    cursorType += '_top';
    if (x < x1 || x > x1 + width) cursorType = cursorType.replace('_top', '');
  }
  if (isNear(y, y1 + height)) {
    cursorType += '_bottom';
    if (x < x1 || x > x1 + width) cursorType = cursorType.replace('_bottom', '');
  }
  if (isNear(x, x1)) {
    cursorType += '_left';
    if (y < y1 || y > y1 + height) cursorType = cursorType.replace('_left', '');
  }
  if (isNear(x, x1 + width)) {
    cursorType += '_right';
    if (y < y1 || y > y1 + height) cursorType = cursorType.replace('_right', '');
  }
  return cursorType;
}

function isNear(i, j) {
  return Math.abs(i - j) < 5;
}

export default class RectHandling extends React.Component {

  static defaultProps = {
    value: [],
    onAddSelection: f => f,
    onRemoveSelection: f => f,
    onRectHover: f => f,
    onRectHoverOut: f => f,
    onDiscardSelection: f => f,
    coordinates: { x: 0, y: 0, height: 0, width: 0 },
  };

  static propTypes = {
    value: PropTypes.arrayOf(PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
    })),
    coordinates: PropTypes.object,
    onAddSelection: PropTypes.func,
    onRemoveSelection: PropTypes.func,
    onDiscardSelection: PropTypes.func,
    onRectHover: PropTypes.func,
    onRectHoverOut: PropTypes.func,
  };

  state = {
    addSelection: false,
    removeSelection: false,
    activeButton: '',
    height: 159,
    width: 350,
    rectanglesList: this.props.value,
    rectSelected: false,
  };

  onRemoveSelection = async function () {
    const cancelRef = d3.select(this.cancelRef);
    const targetId = Number(cancelRef.attr('data-ref-id') || 0);
    const shouldRemove = await this.props.onRemoveSelection(targetId,
      this.state.rectanglesList.find(({ id }) => id === targetId));
    if (shouldRemove === false) return;

    this.setState({
      rectanglesList: this.state.rectanglesList.filter(({ id }) => id !== targetId),
    });
    cancelRef
      .style('visibility', 'hidden');
  };

  onAddSelection = async function () {
    const rect = d3.select(this.rectRef);
    const x = parseInt(rect.attr('x'));
    const y = parseInt(rect.attr('y'));
    const width = parseInt(rect.attr('width'));
    const height = parseInt(rect.attr('height'));
    const id = parseInt(rect.attr('updateForId'));
    let updateId = false;
    if (id) { updateId = true; }

    const resvalue = await this.props.onAddSelection({ x, y, width, height, ...(id ? { id } : {}) });
    if (resvalue === false) {
      this.rectReset();
      return;
    }
    let uniqueId = resvalue;
    if (!resvalue || typeof resvalue === 'object') {
      uniqueId = Number(_uniqueId());
      while (this.state.rectanglesList.find(({ id }) => id === uniqueId)) {
        uniqueId = Number(_uniqueId());
      }
    }

    this.rectReset();
    let newObj = { x, y, width, height, id: id || uniqueId };
    if (updateId) {
      this.setState({
        rectanglesList: this.state.rectanglesList.map(i => {
          if (i.id === id) return newObj;
          return {
            ...i,
          };
        }),
      });
      return;
    }

    this.setState({
      rectanglesList: [...this.state.rectanglesList, newObj],
    });
  };

  constructor(props) {
    super(props);
    this.dragRectangleHandler = this.dragRectangleHandler.bind(this);
    this.onResizeHandler = this.onResizeHandler.bind(this);
    this.drawSelector = this.drawSelector.bind(this);
    this.stockCircle = this.stockCircle.bind(this);
    this.svgMouseListener = this.svgMouseListener.bind(this);
    this.selectRect = this.selectRect.bind(this);
    this.positionTickMark = this.positionTickMark.bind(this);
    this.tickMarkOutside = this.tickMarkOutside.bind(this);
    this.buttonExists = this.buttonExists.bind(this);
    this.handleCancelButton = this.handleCancelButton.bind(this);
    this.getCurrentSelections = this.getCurrentSelections.bind(this);
    this.onRemoveSelection = this.onRemoveSelection.bind(this);
    this.onAddSelection = this.onAddSelection.bind(this);
    this.rectReset = this.rectReset.bind(this);
    this.forHighlighting = this.forHighlighting.bind(this);
  }

  componentDidMount() {
    this.dragRectangleHandler();
    this.onResizeHandler();
    this.svgMouseListener();
    this.selectRect();
    this.getCurrentSelections();
  }

  componentDidUpdate() {
    this.dragRectangleHandler();
    this.onResizeHandler();
    this.svgMouseListener();
    this.selectRect();
    this.getCurrentSelections();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.coordinates !== this.props.coordinates) this.forHighlighting(nextProps.coordinates);
    if (this.props.value !== nextProps.value) {
      this.setState({
        rectanglesList: Object.assign([], nextProps.value),
      });
    }
  }

  getCurrentSelections() {
    const self = this;
  }

  svgMouseListener() {
    const circle = d3.select(this.circleRef);
    const rect = d3.select(this.rectRef);
    const tickRef = d3.select(this.tickRef);

    let draw = false;
    const self = this;
    let addSelection = this.state.addSelection;

    d3.select(this.svgRef)
      .on('mouseup', function () {
        draw = false;
        self.buttonExists(tickRef, false);
      })
      .on('mousedown', function () {
        if (addSelection) draw = true;
        const [x, y] = d3.mouse(this);
        if (d3.event.path[0] !== self.tickRef) {
          self.rectReset(x, y);
        }
        self.buttonExists(tickRef, false);
      })
      .on('mouseout', function () {
        const elem = d3.event && d3.event.toElement && d3.event.toElement.tagName || '';
        if (elem.toLowerCase() === 'div') draw = false;
      })
      .on('mousemove', function () {
        if (draw) self.drawSelector(rect, d3.mouse(this));
        self.stockCircle(rect, circle, d3.mouse(this));
      });
  }

  handleCancelButton() {
    const cancelRef = d3.select(this.cancelRef);
    const self = this;
    let flagValue = false;

    cancelRef
      .on('mouseover', function () {
        flagValue = true;
        self.buttonExists(cancelRef, flagValue);
      })
      .on('mouseout', function () {
        flagValue = false;
        self.buttonExists(cancelRef, flagValue);
      })
      .style('visibility', 'hidden');
  }

  selectRect() {
    const rect = d3.select(this.rectRef);
    const tickRef = d3.select(this.tickRef);
    const self = this;

    d3.select(this.rectRef)
      .on('mousemove', function () {
        self.positionTickMark(rect, tickRef);
      })
      .on('mouseout', function () {
        self.tickMarkOutside(tickRef);
      });
  }

  tickMarkOutside(tickRef) {
    const self = this;
    let tickFlag = false;

    tickRef
      .style('visibility', 'hidden')
      .on('mouseover', function () {
        tickFlag = true;
        self.buttonExists(tickRef, tickFlag);
      })
      .on('mouseout', function () {
        tickFlag = false;
        self.buttonExists(tickRef, tickFlag);
      });
  }

  buttonExists(buttonRef, tickFlag) {
    buttonRef
      .style('visibility', tickFlag ? 'visible' : 'hidden')
      .style('cursor', 'pointer');
  }

  positionTickMark(rect, tickRef) {
    const x1 = parseInt(rect.attr('x'));
    const y1 = parseInt(rect.attr('y'));
    const width = parseInt(rect.attr('width'));
    let imgWidth = Math.max(10, (this.state.width * this.state.height * 0.00001));

    tickRef
      .attr('width', imgWidth)
      .attr('x', x1 + width - imgWidth)
      .attr('y', y1)
      .style('visibility', 'visible');
  }

  stockCircle(rect, circle, [x, y]) {
    const x1 = parseInt(rect.attr('x'));
    const y1 = parseInt(rect.attr('y'));
    const height = parseInt(rect.attr('height'));
    const width = parseInt(rect.attr('width'));
    let cx = -99, cy = -99;
    const cursorType = findPositionOnRect({ x, y, x1, y1, width, height });

    if (cursorType) {
      cx = x;
      cy = y;
    }

    circle
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('cursor', cursor[cursorType]);
  }

  drawSelector(rect, [x1, y1]) {
    const tickRef = d3.select(this.tickRef);
    const self = this;

    rect
      .attr('width', Math.max(0, x1 - +rect.attr('x')))
      .attr('height', Math.max(0, y1 - +rect.attr('y')));
    self.buttonExists(tickRef, false);
  }

  onResizeHandler() {
    const self = this;
    let originalHeight = 0;
    let originalWidth = 0;
    let target = '';
    let limitSet = { x: 10, y: 10, height: 10, width: 10 };
    const rect = d3.select(this.rectRef);
    let maxY = 0, minY = 0;
    let maxX = 0, minX = 0;
    let rectX = 0, rectY = 0;
    let startX = 0, startY = 0;

    d3.select(this.circleRef)
      .call(d3.drag()
        .on('start', function () {
          rectX = parseInt(rect.attr('x'));
          rectY = parseInt(rect.attr('y'));
          originalHeight = parseInt(rect.attr('height'));
          originalWidth = parseInt(rect.attr('width'));
          [startX, startY] = d3.mouse(this);
          limitSet.x = rectX - 10;
          limitSet.y = rectY - 10;
          maxY = self.state.height;
          minY = 0;
          maxX = self.state.width;
          minX = 0;

          target = findPositionOnRect({
            x1: rectX,
            y1: rectY,
            x: startX,
            y: startY,
            width: originalWidth,
            height: originalHeight,
          });

          if (target.includes('top')) {
            minY = 0;
            maxY = Math.abs(rectY + originalHeight - 10);
          }

          if (target.includes('bottom')) {
            minY = Math.abs(rectY);
            maxY = self.state.width;
          }

          if (target.includes('left')) {
            minX = 0;
            maxX = Math.abs(rectX + originalWidth - 10);
          }

          if (target.includes('right')) {
            maxX = self.state.width;
            minX = Math.abs(rectX);
          }

        })
        .on('drag', function () {
          const [x, y] = d3.mouse(this);
          let width = parseInt(rect.attr('width'));
          let height = parseInt(rect.attr('height'));
          let top = parseInt(rect.attr('y'));
          let left = parseInt(rect.attr('x'));

          if (target.includes('top')) {
            top = (y);
            height = Math.max(10, originalHeight + rectY - Math.max(y, 0));
          }

          if (target.includes('bottom')) {
            height = (y - rectY);
            top = y - height;
          }

          if (target.includes('left')) {
            width = (originalWidth + rectX - Math.max(x, 0));
            left = x;
          }

          if (target.includes('right')) {
            width = x - rectX;
          }

          d3.select(this)
            .attr('cx', Math.max(Math.min(x, maxX), minX))
            .attr('cy', Math.max(Math.min(y, maxY), minY));

          rect
            .attr('height', Math.max(10, Math.min(height, self.state.height - top)))
            .attr('width', Math.max(10, Math.min(width, self.state.width - left)))
            .attr('y', Math.max(Math.min(top, maxY), minY))
            .attr('x', Math.max(Math.min(left, maxX), minX));
        }),
      );
  }

  dragRectangleHandler() {
    let startX = 0, startY = 0;
    let w1 = 0, h1 = 0;
    let x = 0, y = 0;
    const { width, height } = this.state;
    const rect = d3.select(this.rectRef);
    const tickRef = d3.select(this.tickRef);
    let imgWidth = Math.max(10, (this.state.width * this.state.height * 0.00001));

    this.rectRef.setAttribute('cursor', '-webkit-grab');
    this.rectRef.setAttribute('cursor', '-moz-grab');
    this.rectRef.setAttribute('cursor', 'grab');

    rect.call(
      d3.drag()
        .on('start', function () {
          [x, y] = d3.mouse(this);
          startX = parseInt(rect.attr('x'));
          startY = parseInt(rect.attr('y'));
          w1 = parseInt(rect.attr('width'));
          h1 = parseInt(rect.attr('height'));
        })
        .on('drag', function () {
          let [x1, y1] = d3.mouse(this);
          let xValue = Math.min(width - w1, Math.max(0, startX + x1 - x));
          let yValue = Math.min(height - h1, Math.max(0, (startY + y1 - y)));

          rect
            .attr('x', xValue)
            .attr('y', yValue);
          tickRef
            .attr('x', xValue + parseInt(rect.attr('width')) - imgWidth)
            .attr('y', yValue);
        }),
    );
  }

  rectReset(x = 0, y = 0) {
    const rect = d3.select(this.rectRef);
    rect
      .attr('x', x)
      .attr('y', y)
      .attr('height', 0)
      .attr('width', 0)
      .attr('updateForId', '');
  }

  forHighlighting(coordinates) {
    if (coordinates && coordinates.width !== 0 && coordinates.height !== 0) {
      this.setState({
        rectSelected: true,
        coordinates,
      });
    }
  }

  render() {
    const { onRectHover, onRectHoverOut, onDiscardSelection } = this.props;

    const { width, height, rectanglesList, rectSelected, coordinates } = this.state;

    const self = this;
    let d = '';
    if (coordinates && (Object.keys(coordinates).length) > 0) {
      d = 'M0 0 L' + width + ' 0 L' + width + ' ' + height + ' ' + 'L0 ' + height + 'z ' +
        'M' + coordinates.x + ' ' + coordinates.y + ' L' +
        (parseInt(coordinates.x) + parseInt(coordinates.width)) + ' ' + coordinates.y + ' L' +
        (parseInt(coordinates.x) + parseInt(coordinates.width)) + ' ' + (parseInt(coordinates.y) + parseInt(coordinates.height)) + ' L' +
        coordinates.x + ' ' + (parseInt(coordinates.y) + parseInt(coordinates.height)) + ' z';
    }

    return (
      <div className={'imagepatchWrapper'}>

        <div className={'panel'}>
          {panelIcons.map((item) =>
            <div
              className={'panelItem'}
              key={item.id}
            >
              <button
                className={`panelButton ${this.state.activeButton === item.button ? 'active' : ''}`}

                onClick={() => {
                  if(item.id === 1 && item.button === '+') {
                    console.log("add", item.id, item.button);
                    this.setState({
                      activeButton: item.button,
                      addSelection: true,
                      removeSelection: false,
                    })
                  }
                  if(item.id === 2 && item.button === '-') {
                    console.log("remove", item.id, item.button);
                    this.setState({
                      activeButton: item.button,
                      removeSelection: true,
                      addSelection: false,
                    })
                  }
                  if(item.id === 3 && item.button === 'M') {
                    console.log("Merge", item.id, item.button);
                    this.setState({
                      activeButton: item.button,
                    })
                  }
                  if(item.id === 4 && item.button === 'S') {
                    console.log("Split", item.id, item.button);
                    this.setState({
                      activeButton: item.button,
                    })
                  }
                  if(item.id === 5 && item.button === 'R') {
                    console.log("Resize", item.id, item.button);
                    this.setState({
                      activeButton: item.button,
                    })
                  }
                  console.log('Clickk', item.id, item.button);
                }}
              >
                {item.button}
              </button>
              <span className={'tooltipText'}>{item.desc}</span>
            </div>)}
        </div>

        <svg
          className={'svg'}
          ref={node => {
            this.svgRef = node;
          }}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
        >

          {rectanglesList
            .map(item => (<rect
              key={`Patches-${item.id}`}
              x={item.x}
              y={item.y}
              rx={2}
              ry={2}
              width={item.width}
              height={item.height}
              className={'rectangles'}
              id={item.id}
              stroke={item.color || 'rgb(208, 38, 38)'}
              strokeWidth={Math.max(1, this.state.width * this.state.height * 0.0000012)}
              onMouseDown={() => {
                const rect = d3.select(this.rectRef);
                rect.attr('width', item.width)
                  .attr('height', item.height)
                  .attr('x', item.x)
                  .attr('y', item.y)
                  .attr('updateForId', item.id);

              }}
              onMouseOver={async (e) => {
                let imgWidth = Math.max(10, (this.state.width * this.state.height * 0.00001));
                const cancelRef = d3.select(this.cancelRef);
                await onRectHover(e, item);
                if (this.state.removeSelection) {
                  cancelRef
                    .attr('width', imgWidth)
                    .style('visibility', 'visible')
                    .attr('x', item.x + item.width - imgWidth)
                    .attr('y', item.y)
                    .attr('data-ref-id', item.id);
                }
              }}
              onMouseOut={(e) => {
                onRectHoverOut(e, item);
                this.handleCancelButton();
              }}
            />))
          }

          <rect
            ref={node => {
              this.rectRef = node;
            }}
            x="0"
            y="0"
            width="0"
            height="0"
            className={'draggableRectangle'}
          />

          {/*circle for dragging*/}
          <circle
            ref={node => {
              this.circleRef = node;
            }}
            data-id="top-left"
            cy="110"
            cx="10"
            r="5"
            className={'circle'}
          />

          <image
            ref={node => {
              this.tickRef = node;
            }}
            href={tick}
            className={'tickImage'}
            onMouseDown={this.onAddSelection}
          />

          <image
            ref={node => {
              this.cancelRef = node;
            }}
            href={cancel}
            className={'cancelImage'}
            onClick={this.onRemoveSelection}
          />

        </svg>
      </div>
    );
  }
}