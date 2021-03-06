// workflow.page.js - the master JavaScript for /workflows/N

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider, connect } from 'react-redux'
import * as Actions from '../workflow-reducer'
import Workflow from '../workflow'
import workbenchAPI from '../WorkbenchAPI'

// Global API object, encapsulates all calls to the server
const api = workbenchAPI();

// ---- Workflow container ----

// Handles addModule (and any other actions that change top level workflow state)
const mapStateToProps = (state) => {
  return {
    workflow: state.workflow,
    selected_wf_module: state.selected_wf_module,
    loggedInUser: state.loggedInUser,
    // This is the top level dependency injection for all API calls on this page
    api: api
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    removeModule: (wfModuleId) => {
      dispatch(Actions.deleteModuleAction(wfModuleId))
    },
    changeParam: (paramId, newVal) => {
      dispatch(Actions.setParamValueAction(paramId, newVal))
    }
  }
};

const WorkflowContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Workflow)



// --- Websocket handling ----
function buildSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const workflowId = window.initState.workflowId
  const socket = new WebSocket(`${protocol}//${window.location.host}/workflows/${workflowId}`)

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if ('type' in data) {
      switch (data.type) {
        case 'wfmodule-status':
          Actions.store.dispatch(Actions.setWfModuleStatusAction(data.id, data.status, data.error_msg ? data.error_msg : ''))
          return
        case 'reload-workflow':
          Actions.store.dispatch(Actions.reloadWorkflowAction())
          return
      }
    }
  }
}

const socket = buildSocket() // Start listening for events

// --- Main ----

// Render with Provider to root so all objects in the React DOM can access state
ReactDOM.render(
  (
    <Provider store={Actions.store}>
      <WorkflowContainer lesson={window.initState.lessonData} />
    </Provider>
  ),
  document.getElementById('root')
);

// Start Intercom, if we're that sort of installation
//// We are indeed: Very mission, much business!
if (window.APP_ID) {
  if (window.initState.loggedInUser) {
    window.Intercom("boot", {
      app_id: window.APP_ID,
      email: window.initState.loggedInUser.email,
      user_id: window.initState.loggedInUser.id,
      alignment: 'right',
      horizontal_padding: 30,
      vertical_padding: 20
    });
  } else {
    // no one logged in -- viewing read only workflow
    window.Intercom("boot", {
      app_id: window.APP_ID,
      alignment: 'right',
      horizontal_padding: 30,
      vertical_padding: 20
    });
  }
}
