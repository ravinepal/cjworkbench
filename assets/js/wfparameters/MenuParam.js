// Simple wrapper over HTML <select>
import React from 'react'
import PropTypes from 'prop-types'

export default class MenuParam extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedIdx: this.props.selectedIdx
    };
  }

  componentWillReceiveProps(newProps) {
    if (this.state.selectedIdx != newProps.selectedIdx)
      this.setState({selectedIdx :  newProps.selectedIdx})
  }

  onChange = (evt) => {
    var idx =  evt.target.value;
    this.setState({selectedIdx: idx });
    this.props.onChange(idx);
  }

  render() {
    var items = this.props.items.split('|');
    var itemDivs = items.map( (name, idx) => {
        return <option key={idx} value={idx} className='dropdown-menu-item t-d-gray content-3'>{name}</option>;
    });

    return (
        <select
          className='custom-select parameter-base dropdown-selector'
          name={this.props.name}
          value={this.state.selectedIdx}
          onChange={this.onChange}
          disabled={this.props.isReadOnly}
        >
          {itemDivs}
        </select>
    );
  }
}

MenuParam.propTypes = {
  name:         PropTypes.string.isRequired,
  items:        PropTypes.string,  // like 'Apple|Banana|Kitten'
  selectedIdx:  PropTypes.number,
  onChange:     PropTypes.func     // called with index of selected item
};
