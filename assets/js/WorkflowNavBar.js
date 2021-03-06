import React from 'react'
import WfHamburgerMenu from './WfHamburgerMenu'
import EditableWorkflowName from './EditableWorkflowName'
import WorkflowMetadata from './WorkflowMetadata'
import PropTypes from 'prop-types'
import {goToUrl, logUserEvent} from './utils'
import Modal from 'reactstrap/lib/Modal'
import ModalHeader from 'reactstrap/lib/ModalHeader'
import ModalBody from 'reactstrap/lib/ModalBody'
import ModalFooter from 'reactstrap/lib/ModalFooter'
import Form from 'reactstrap/lib/Form'
import FormGroup from 'reactstrap/lib/FormGroup'
import Label from 'reactstrap/lib/Label'
import Input from 'reactstrap/lib/Input'
import CopyToClipboard from 'react-copy-to-clipboard';
import { Share } from 'react-twitter-widgets'

// Workflow page
export default class WorkflowNavBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      spinnerVisible: false,
      modalsOpen: false,
      isPublic: this.props.workflow.public,
      linkCopied: false,
    };
    this.handleDuplicate = this.handleDuplicate.bind(this);
    this.setPublic = this.setPublic.bind(this);
    this.renderModals = this.renderModals.bind(this);
    this.toggleModals = this.toggleModals.bind(this);
    this.onLinkCopy = this.onLinkCopy.bind(this);
    this.onLinkLeave = this.onLinkLeave.bind(this);
    this.logShare =  this.logShare.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.workflow.public !== this.props.workflow.public) {
      this.setState({
        isPublic: nextProps.workflow.public
      })
    }
  }

  handleDuplicate() {
    if (!this.props.loggedInUser) {
      // user is NOT logged in, so navigate to sign in
      goToUrl('/account/login');
    } else {
      // user IS logged in: start spinner, make duplicate & navigate there
      this.setState({spinnerVisible: true});

      this.props.api.duplicateWorkflow(this.props.workflow.id)
        .then(json => {
          goToUrl('/workflows/' + json.id);
        })
    }
  }

  setPublic() {
    this.props.api.setWorkflowPublic(this.props.workflow.id, true)
      .then(() => {
        this.setState({isPublic: true});
        // close current modal
        this.toggleModals();
        // ensure that child components are updated
        this.forceUpdate();
        // open new modal with sharing feature
        this.toggleModals();
      })
      .catch((error) => {
        console.log('Request failed', error);
      });
  }

  // this does not provide the correct link string yet
  linkString(id) {
    var path = "/workflows/" + id;
    // allowing an out for testing (there is no window.location.href during test)
    if (window.location.href == 'about:blank') {
      return path;
    } else {
      var url = new URL(path, window.location.href).href;
      return url;
    }
  }

  onLinkCopy() {
    this.setState({linkCopied: true});
    this.logShare('URL copied')
  }

  onLinkLeave() {
    this.setState({linkCopied: false});
  }

  logShare(type) {
    logUserEvent('Share workflow ' + type);
  }

  renderCopyLink() {
    var linkString = this.linkString(this.props.workflow.id);

    if (this.state.linkCopied) {
      return (
        <div className='info-2 t-orange' >Link copied to clipboard</div>
      );
    } else {
      return (
        <CopyToClipboard text={linkString} onCopy={this.onLinkCopy} className='info-2 t-f-blue'>
          <div>Copy to clipboard</div>
        </CopyToClipboard>
      );
    }
  }

  toggleModals() {
    this.setState({ modalsOpen: !this.state.modalsOpen });
  }

  renderModals() {

    var linkString = this.linkString(this.props.workflow.id);
    var facebookUrl = 'https://www.facebook.com/sharer.php?u=' + linkString;
    var copyLink = this.renderCopyLink();

    var setPublicModal =
      <Modal isOpen={this.state.modalsOpen} toggle={this.toggleModals} className='test-setpublic-modal'>
        <ModalHeader toggle={this.toggleModals} className='dialog-header modal-header d-flex align-items-center' >
          <div className='t-d-gray title-4'>SHARE THIS WORKFLOW</div>
        </ModalHeader>
        <ModalBody >
          <div className='title-3 mb-3'>This workflow is currently private</div>
          <div className='info-2 t-d-gray'>Set this workflow to Public in order to share it? Anyone with the URL will be able to access and duplicate it.</div>
        </ModalBody>
        <div className="modal-footer ">
          <div onClick={this.toggleModals} className='button-gray action-button mr-4'>Cancel</div>
          <div onClick={this.setPublic} className='button-blue action-button test-public-button'>Set Public</div>
        </div>
      </Modal>

    // TODO: log Twitter shares. Probably need a different component with an "onshare" handler.

    var shareModal =
      <Modal isOpen={this.state.modalsOpen} toggle={this.toggleModals} className='test-share-modal'>
        <ModalHeader toggle={this.toggleModals} className='dialog-header modal-header d-flex align-items-center' >
          <div className='t-d-gray title-4'>SHARE THIS WORKFLOW</div>
        </ModalHeader>
        <ModalBody >
          <FormGroup>
            <div className='d-flex align-items-center justify-content-between flex-row'>
              <Label className='label-margin info-1'>Public link</Label>
              {copyLink}
            </div>
            <div className='mb-3'>
              <Input type='url' className='url-link t-d-gray content-2 test-link-field' placeholder={linkString} readOnly/>
            </div>
          </FormGroup>

          <div className='d-flex justify-content-start mt-4'>

            <div className='twitter-button-container'>
              <Share url={linkString}
                options={{text: "Check out this chart I made using @cjworkbench:"}}
              />
            </div>

            <a href={facebookUrl} onClick={() => this.logShare('Facebook')} className='button-icon facebook-share ml-4' target="_blank">
                  <div className='icon-facebook'/>
              Share
            </a>

          </div>
        </ModalBody>

      </Modal>

    if (!this.state.modalsOpen) {
      return null;
    } else if (this.state.isPublic) {
      return shareModal;
    } else {
      return setPublicModal;
    }
  }

  render() {

    // menu only if there is a logged-in user
    var contextMenu;
    if (this.props.loggedInUser) {
      contextMenu = <WfHamburgerMenu
          workflowId={this.props.workflow.id}
          api={this.props.api}
          isReadOnly={this.props.isReadOnly}
          user={this.props.loggedInUser}
      />
    } else {
      contextMenu = <a href="http://app.workbenchdata.com/account/login" className='nav--link t-white content-2'>Sign in</a>
    }

    var duplicate = <button onClick={this.handleDuplicate} className='button-white--fill action-button test-duplicate-button'>
                      Duplicate
                    </button>

    var share = <button onClick={this.toggleModals} className='button-white action-button test-share-button'>
                  Share
                </button>

    var modals = this.renderModals();

    var spinner = this.state.spinnerVisible ? (
      <div id="spinner-container">
        <div id="spinner-l1">
          <div id="spinner-l2">
            <div id="spinner-l3"></div>
          </div>
        </div>
      </div>
    ) : null

    return (
      <React.Fragment>
        {spinner}
        <nav className="navbar">
          <a href="/workflows/" className="logo-navbar">
            <img className="image" src="/static/images/logo.svg"/>
          </a>
          <div className='title-metadata-stack'>
            <EditableWorkflowName
              value={this.props.workflow.name}
              workflowId={this.props.workflow.id}
              isReadOnly={this.props.workflow.read_only}
              api={this.props.api}
            />
            <WorkflowMetadata
              workflow={this.props.workflow}
              api={this.props.api}
              isPublic={this.state.isPublic}
            />
          </div>
          <div className='d-flex flex-row align-items-center'>
            {duplicate}
            {share}
            {modals}
            {contextMenu}
          </div>
        </nav>
      </React.Fragment>
    );
  }
}

WorkflowNavBar.propTypes = {
  api:            PropTypes.object.isRequired,
  workflow:       PropTypes.object.isRequired,
  isReadOnly:     PropTypes.bool.isRequired,
  loggedInUser:   PropTypes.object            // undefined if no user logged in
};
