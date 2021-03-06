import React from 'react'
import ColumnParam from './ColumnParam'
import { mount } from 'enzyme'

describe('ColumnParam', () => {

  const testcols = ['foo', 'bar', 'baz', 'wow', 'word wrap', 'ok then'];
  const noSelectionText = 'Just pick something, user';

  it('renders with noSelectionText', (done) => {
    let wrapper = mount(
        <ColumnParam
          selectedCol='baz'
          name="column"
          getColNames={() => {return Promise.resolve(testcols)}}
          noSelectionText={noSelectionText}
          isReadOnly={true}
          revision={101}
          onChange={()=>{}}
        />);

    // need to give chance for componentdidMount to run
    setImmediate(() => {
      wrapper.update()

      let state=wrapper.state();
      expect(state.selectedCol).toEqual('baz');
      expect(state.colNames).toEqual([noSelectionText].concat(testcols));

      expect(wrapper).toMatchSnapshot();

      done();
    });
  });

  it('renders without noSelectionText', (done) => {
    let wrapper = mount(
        <ColumnParam
          name="column"
          selectedCol='baz'
          getColNames={() => {return Promise.resolve(testcols)}}
          isReadOnly={true}
          revision={101}
          onChange={()=>{}}
        />);

    // need to give chance for componentdidMount to run
    setImmediate(() => {
      wrapper.update()
      let state=wrapper.state();
      expect(state.selectedCol).toEqual('baz');
      expect(state.colNames).toEqual(['Select'].concat(testcols));

      expect(wrapper).toMatchSnapshot();

      done();
    });
  });

  it('renders .loading when there are no colNames', () => {
    const deadPromise = new Promise(() => {})
    let wrapper = mount(
        <ColumnParam
          name="column"
          selectedCol='baz'
          getColNames={() => deadPromise}
          isReadOnly={true}
          revision={101}
          onChange={()=>{}}
        />);
    expect(wrapper.find('select').prop('className')).toMatch(/\bloading\b/)
  })
});
