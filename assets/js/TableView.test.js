import React from 'react'
import { mount } from 'enzyme'
import { jsonResponseMock } from "./test-utils";
import TableView from './TableView'
import { mockAddCellEdit, mockReorderColumns, mockSortColumn, initialRows, preloadRows, deltaRows } from "./TableView";
import DataGrid from "./DataGrid";

// TODO upgrade Enzyme. enzyme-adapter-react-16@1.1.1 does not support contexts.
// https://github.com/airbnb/enzyme/issues/1509
jest.mock('./DataGridDragDropContext', () => {
  const context = {}
  return {
    Consumer: (props) => props.children(context),
    Provider: (props) => props.children,
  }
})

describe('TableView', () => {
  // Mocks json response (promise) returning part of a larger table
  function makeRenderResponse(start, end, totalRows) {
    let nRows = end-start;
    let data = {
      total_rows: totalRows,
      start_row: start,
      end_row: end,
      columns: ["a", "b", "c"],
      column_types: ["Number", "Number", "Number"],
      rows: Array(nRows).fill({
        "a": 1,
        "b": 2,
        "c": 3
      })
    };
    return jsonResponseMock(data);
  }


  it('Fetches, renders, edits cells, sorts columns and reorders columns', (done) => {

    var api = {
      render: makeRenderResponse(0, 2, 1000)
    };

    // Mocks table-related operations for testing
    let addCellEditMock = jest.fn();
    mockAddCellEdit(addCellEditMock);
    let updateSortMock = jest.fn();
    mockSortColumn(updateSortMock);
    let reorderColumnsMock = jest.fn();
    mockReorderColumns(reorderColumnsMock);


    const tree = mount(
      <TableView id={100} revision={1} api={api}/>
    )

    // wait for promise to resolve, then see what we get
    setImmediate(() => {
      // should have called API for its data, and loaded it
      expect(api.render.mock.calls.length).toBe(1);
      expect(api.render.mock.calls[0][0]).toBe(100);

      expect(tree).toMatchSnapshot();

      // Header etc should be here
      expect(tree.find('.outputpane-header')).toHaveLength(1);
      expect(tree.find('.outputpane-data')).toHaveLength(1);

      // Row count should have a comma
      let headerText = tree.find('.outputpane-header').text();
      expect(headerText).toContain('1,000');  

      // Test calls to EditCells.addCellEdit
      // Don't call addCellEdit if the cell value has not changed
      tree.find(TableView).instance().onEditCell(0, 'c', '3');            // edited value always string...
      expect(addCellEditMock.mock.calls.length).toBe(0);  // but should still detect no change
      // Do call addCellEdit if the cell value has changed
      tree.find(TableView).instance().onEditCell(1, 'b', '1000');
      expect(addCellEditMock.mock.calls.length).toBe(1);

      // Calls SortFromTable
      tree.find(TableView).instance().onSort('a', 'ASC');
      expect(updateSortMock.mock.calls.length).toBe(1);

      // Calls ReorderColumns
      tree.find(DataGrid).instance().onDropColumnIndexAtIndex(0, 1)
      expect(reorderColumnsMock).toHaveBeenCalledWith(100, { column: 'a', from: 0, to: 1 })

      done();
    });
  });


  it('Blank table when no module id', () => {
    const tree = mount(
      <TableView id={undefined} revision={1} api={{}}/>
    );
    tree.update();

    expect(tree.find('.outputpane-header')).toHaveLength(1);
    expect(tree.find('.outputpane-data')).toHaveLength(1);
    expect(tree).toMatchSnapshot();
  });

  it('Lazily loads rows as needed', (done) => {

    expect(deltaRows).toBeGreaterThan(preloadRows); // or preload logic breaks

    const totalRows = 100000;
    var api = {
      render: makeRenderResponse(0, initialRows, totalRows) // response to expected first call
    };

    const tree = mount(
      <TableView id={100} revision={1} api={api}/>
    );
    let tableView = tree.find('TableView').instance();

    // Should load 0..initialRows at first
    expect(api.render.mock.calls.length).toBe(1);
    expect(api.render.mock.calls[0][0]).toBe(tree.find('TableView').props().id);
    expect(api.render.mock.calls[0][1]).toBe(0);
    expect(api.render.mock.calls[0][2]).toBe(initialRows);

    // let rows load
    setImmediate(() => {

      // force load by reading past initialRows
      let requestRow = initialRows + 1;
      let lastLoadedRow = requestRow + deltaRows + preloadRows;
      api.render = makeRenderResponse(initialRows, lastLoadedRow, totalRows);
      let row = tableView.getRow(requestRow);

      // a row we haven't loaded yet should be blank
      expect(row).toEqual(tableView.emptyRow());

      expect(api.render.mock.calls.length).toBe(1);
      expect(api.render.mock.calls[0][1]).toBe(initialRows);
      expect(api.render.mock.calls[0][2]).toBe(lastLoadedRow);

      // let rows load
      setImmediate(() => {

        // Call getRow twice without waiting for the first load to finish, and ensure
        // the next getRow fetches up to the high water mark
        let requestRow2 = lastLoadedRow + 1;
        let lastLoadedRow2 = requestRow2 + deltaRows + preloadRows;
        api.render = makeRenderResponse(lastLoadedRow, lastLoadedRow2, totalRows);
        row = tableView.getRow(requestRow2);
        expect(row).toEqual(tableView.emptyRow());
        expect(tableView.loading).toBe(true);
        expect(api.render.mock.calls.length).toBe(1);
        expect(api.render.mock.calls[0][1]).toBe(lastLoadedRow);
        expect(api.render.mock.calls[0][2]).toBe(lastLoadedRow2);

        let requestRow3 = Math.floor(totalRows / 2);  // thousands of rows later
        row = tableView.getRow(requestRow3);
        expect(row).toEqual(tableView.emptyRow());
        expect(api.render.mock.calls.length).toBe(1);   // already loading, should not have started a new load

        setImmediate(() => {
          expect(tableView.loading).toBe(false);

          // Now start yet another load, for something much smaller that requestRow3
          let requestRow4 = lastLoadedRow2 + 1;                         // ask for very next unloaded row...
          let lastLoadedRow3 = requestRow3 + deltaRows + preloadRows;  // ...but should end up loading much more
          api.render = makeRenderResponse(lastLoadedRow2, lastLoadedRow3, totalRows);
          tableView.getRow(requestRow4);
          expect(api.render.mock.calls.length).toBe(1);
          expect(api.render.mock.calls[0][1]).toBe(lastLoadedRow2);
          expect(api.render.mock.calls[0][2]).toBe(lastLoadedRow3);

          setImmediate( ()=> {
            expect(tableView.loading).toBe(false);

            // Load to end
            let requestRow5 = totalRows-1;
            api.render = makeRenderResponse(lastLoadedRow3, totalRows, totalRows);
            row = tableView.getRow(requestRow5);
            expect(row).toEqual(tableView.emptyRow());
            expect(api.render.mock.calls.length).toBe(1);
            expect(api.render.mock.calls[0][1]).toBe(lastLoadedRow3);
            expect(api.render.mock.calls[0][2]).toBeGreaterThanOrEqual(totalRows);

            setImmediate(() =>{
              expect(tableView.loading).toBe(false);

              // Now that we've loaded the whole table, asking for the last row should not trigger a render
              api.render = jsonResponseMock({});
              row = tableView.getRow(totalRows-1);
              expect(row.a).toBe(1); // not empty
              expect(api.render.mock.calls.length).toBe(0); // no new calls

              done();
            })
          })
        })
      })
    })

  });

  it('Passes the the right sortColumn, sortDirection to DataGrid', (done) => {
    var testData = {
      total_rows: 2,
      start_row: 0,
      end_row: 2,
      columns: ["a", "b", "c"],
      rows: [
        {
          "a": "1",
          "b": "2",
          "c": "3"
        },
        {
          "a": "4",
          "b": "5",
          "c": "6"
        }
      ],
      column_types: ['Number', 'Number', 'Number']
    };

    var api = {
      render: jsonResponseMock(testData),
    };

    const NON_SORT_MODULE_ID = 28;
    const SORT_MODULE_ID = 135;

    // A barebones workflow for testing the sort stuff
    var workflow = {
      wf_modules: [
          {
            id: NON_SORT_MODULE_ID,
            module_version: {
              module: {
                id_name: 'loadurl'
              }
            }
          },
          {
            id: SORT_MODULE_ID,
            module_version: {
              module: {
                id_name: 'sort-from-table'
              }
            },
            parameter_vals: [
                {
                  // column
                  parameter_spec: {id_name: 'column'},
                  value: 'b',
                },
                {
                  // dtype
                  parameter_spec: {id_name: 'dtype'},
                  value: 1
                },
                {
                  //direction
                  parameter_spec: {id_name: 'direction'},
                  value: 2 // Descending
                }
            ]
          },
      ]
    }

    // Try a mount with the sort module selected, should have sortColumn and sortDirection
    var tree = mount(
      <TableView
          revision={1}
          id={100}
          api={api}
          setBusySpinner={jest.fn()}
          resizing={false}
          currentModule={workflow.wf_modules.find((wfm) => (wfm.id == SORT_MODULE_ID))}
      />
    );

    setImmediate(() => {
      tree.update();
      var dataGrid = tree.find(DataGrid);
      expect(dataGrid).toHaveLength(1);
      expect(dataGrid.prop('sortColumn')).toBe('b');
      expect(dataGrid.prop('sortDirection')).toBe('DESC');

      // Try a mount with a non-sort module selected, sortColumn and sortDirection should be undefined
      tree = mount(
        <TableView
            revision={1}
            id={100}
            api={api}
            setBusySpinner={jest.fn()}
            resizing={false}
            currentModule={workflow.wf_modules.find((wfm) => (wfm.id == NON_SORT_MODULE_ID))}
        />
      );
      setImmediate(() => {
        tree.update();
        dataGrid = tree.find(DataGrid);
        expect(dataGrid).toHaveLength(1);
        expect(dataGrid.prop('sortColumn')).toBeUndefined();
        expect(dataGrid.prop('sortDirection')).toBeUndefined();
        done();
      })
    });
  });

  it('Passes the the right showLetter prop to DataGrid', (done) => {
    var testData = {
      total_rows: 2,
      start_row: 0,
      end_row: 2,
      columns: ["a", "b", "c"],
      rows: [
        {
          "a": "1",
          "b": "2",
          "c": "3"
        },
        {
          "a": "4",
          "b": "5",
          "c": "6"
        }
      ],
      column_types: ['Number', 'Number', 'Number']
    };

    var api = {
      render: jsonResponseMock(testData),
    };

    const NON_SHOWLETTER_ID = 28;
    const SHOWLETTER_ID = 135;

    // A barebones workflow for testing the sort stuff
    var workflow = {
      wf_modules: [
          {
            id: NON_SHOWLETTER_ID,
            module_version: {
              module: {
                id_name: 'loadurl'
              }
            }
          },
          {
            id: SHOWLETTER_ID,
            module_version: {
              module: {
                id_name: 'formula'
              }
            },
          },
      ]
    };

    // Try a mount with the formula module selected, should show letter
    var tree = mount(
      <TableView
          revision={1}
          id={100}
          api={api}
          setBusySpinner={jest.fn()}
          resizing={false}
          currentModule={workflow.wf_modules.find((wfm) => (wfm.id == SHOWLETTER_ID))}
      />
    );
    setImmediate(() => {
      tree.update();
      var dataGrid = tree.find(DataGrid);
      expect(dataGrid).toHaveLength(1);
      expect(dataGrid.prop('showLetter')).toBe(true);

      // Try a mount with a non-formula module selected, should not show letter
      tree = mount(
        <TableView
            revision={1}
            id={100}
            api={api}
            setBusySpinner={jest.fn()}
            resizing={false}
            currentModule={workflow.wf_modules.find((wfm) => (wfm.id == NON_SHOWLETTER_ID))}
        />
      );
      setImmediate(() => {
        tree.update();
        dataGrid = tree.find(DataGrid);
        expect(dataGrid).toHaveLength(1);
        expect(dataGrid.prop('showLetter')).toBe(false);
        done();
      })
    });
  });
});


