import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import {Button, Icon, Row, Input, Modal} from 'react-materialize';
class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      docId: '',
      docPassword: '',
      lockedDoc: true,
      user: null,
      mongoStore: null,
      docs: []
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.loginUser = this.loginUser.bind(this);
    this.logoutUser = this.logoutUser.bind(this);
    this.checkDocPassword = this.checkDocPassword.bind(this);
  }

  componentDidMount() {
    const objUser = JSON.parse(localStorage.getItem('user'));
    this.setState({user: objUser || null});
    if (!this.state.mongoStore && objUser) {
      axios.post('http://localhost:3000/login', objUser)
      .then(resp => {
        this.setState({docs: resp.data.docs, mongoStore: true});
      });
    }
  }

  handleInputChange(event) {
    const target = event.target;
    var value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }
  
  checkDocPassword() {
    axios.post('http://localhost:3000' + '/checkDocPassword', {
      docId: this.state.docId,
      docPassword: this.state.docPassword,
    })
    .then(resp => {
      this.setState({progressBar: true});
      if (resp.data.wasCorrectPassword) { this.setState({lockedDoc: false}); }
      else {
        // TODO give visual feedback
        console.log('wrong password :(!', resp);
      }
    })
    .catch(err => { console.log({err}); });
  }

  loginUser() {
    axios.post('http://localhost:3000' + '/login', this.state)
    .then(resp => {
      if(resp.data.user) {
        const strUser = JSON.stringify(resp.data.user);
        localStorage.setItem('user', strUser);
        this.setState({user: resp.data.user, docs: resp.data.docs});
      }
    });
  }

  logoutUser() {
    axios.get('http://localhost:3000' + '/logout')
    .then(resp => {
      localStorage.setItem('user', null);
      this.setState({user: null});
    });
  }

  render() {
    if (this.state.user) {
      return (
        <div className="container loggedin-homepage">
          <Button onClick={this.logoutUser} waves='light' className='save-doc' style={{alignSelf: 'flex-start', position: 'absolute', marginLeft: '20px'}}>Logout<Icon left>navigate_before</Icon></Button>
          <h3 style={{color: 'white'}} >All your DocTings. In one place. </h3>
          <div>
          <Link to="/newEditor"><Button floating large className='red' waves='light' icon='add'>Create a new document </Button></Link>
          </div>
          <div className="doc-container">
            {this.state.docs.map(doc => {
              return (
                <p key={doc._id}>
                  <a href='#' onClick={() => {
                    this.setState({docId: doc._id});
                    $('#docPasswordModal').modal('open');
                  }}>
                    {doc.title}
                  </a>
                </p>
              );
            })}
          </div>

        <Modal
          id='docPasswordModal'
          header='Doc Password'
          actions={
            this.state.lockedDoc ?
              <Button onClick={this.checkDocPassword} waves='light' className="save-doc">locked<Icon left>lock</Icon></Button>
              :
              <Link to={'/doc/' + this.state.docId}>
                <Button onClick={() => $('#docPasswordModal').modal('close')} waves='light' className="save-doc">unlocked<Icon left>lock_open</Icon></Button>
              </Link>
        
          }
        >
          <Input onChange={this.handleInputChange} value={this.state.docPassword} name="docPassword" type="password" label="password" s={12} />
        </Modal>

        </div>
      );
    }
    return (
      <div className="container home-page">
        <div className="color-overlay"></div>
        <div style={{color: 'white', zIndex: 4, textAlign: 'center'}}>
        <h2 style={{color: 'white'}}> DocTings </h2>
        <Row>
          <Input onChange={this.handleInputChange} value={this.state.username} name="username" type="text" label="Username" s={12} />
          <Input onChange={this.handleInputChange} value={this.state.password} name="password" type="password" label="password" s={12} />
        </Row>
        <Button onClick={this.loginUser} waves='light'>Login to Docs<Icon left>exit_to_app</Icon></Button>
        </div>
      </div>
    );

  }
}

export default Home;
