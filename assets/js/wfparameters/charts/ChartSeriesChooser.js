import React from 'react'
import { InputGroup, InputGroupButton, Input, Button, ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap'
import { BlockPicker } from 'react-color'
import { defaultColors } from './ChartColors'

export default class ChartSeriesChooser extends React.Component {
  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleTextChange = this.handleTextChange.bind(this);
  }

  componentWillMount() {
    this.state = {
      dropdownOpen: false,
      displayColorPicker: false,
      color: defaultColors[this.props.colorIndex],
      prevColor: null,
      label: this.props.label
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      color: defaultColors[nextProps.colorIndex],
      value: nextProps.value
    });
  }

  toggle() {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen
    });
  }

  handleClick() {
    var newState = { displayColorPicker: !this.state.displayColorPicker };
    if (!this.state.displayColorPicker) {
      newState.prevColor = this.state.color;
    }
    this.setState(newState);
  };

  handleClose() {
    this.setState({ displayColorPicker: false })
  };

  handleCancel() {
    this.setState({ color: this.state.prevColor, prevColor: null, displayColorPicker: false });
  };

  handleChange(color) {
    var colorIndex = defaultColors.indexOf(color.hex.toUpperCase());
    this.setState({ color: color.hex });
    this.props.onChange(this.props.index, {colorIndex:colorIndex});
  };

  handleTextChange(e) {
    this.setState({
      label: e.target.value
    });
    this.props.onChange(this.props.index, {label:e.target.value})
  }

  render() {
    var backgroundColor =  {
      background: this.state.color
    }
    return (
      <div className="color-picker d-flex">

        <div className="param2-line-margin">
          <InputGroup size="lg">
            <InputGroupButton>
              <Button onClick={this.handleClick} className="color-picker button">
                <div className="color-picker color" style={backgroundColor}>
                  <div className="icon-sort-down-vl-gray button-icon color-picker" style={{position:'relative'}} />
                </div>
              </Button>
              { this.state.displayColorPicker ? <div className="color-picker pop-over">
                <div className="color-picker cover" onClick={this.handleClose}/>
                <BlockPicker color={ this.state.color } colors={ defaultColors } onChange={ this.handleChange } triangle="hide" />
              </div> : null }
            </InputGroupButton>
            <Input type="text" value={this.props.colName} readOnly />
          </InputGroup>
        </div>

        <div className="param2-line-margin">
          <Input size="lg" type="text" value={this.state.label} onChange={this.handleTextChange} />
        </div>
      </div>
    );
  }
}