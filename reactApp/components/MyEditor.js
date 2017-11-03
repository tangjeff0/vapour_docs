import React from 'react';
import {Editor, EditorState, RichUtils, convertFromRaw, convertToRaw} from 'draft-js';
import {Button, Icon, Row, Input, Modal} from 'react-materialize';
import axios from 'axios';
import InlineStyleControls from './InlineStyleControls';
import BlockStyleControls from './BlockStyleControls';
import findAndReplaceDOMText from 'findandreplacedomtext';
import _ from 'underscore';
const styleMap = {
  RED :{
    color: 'red'
  },
  BLUE: {
    color: 'blue'
  },
  BLACK: {
    color: 'black'
  },
  GREEN: {
    color: 'green'
  },
  SMALL: {
    fontSize: '10px'
  },
  NORMAL: {
    fontSize: '15px'
  },
  LARGE: {
    fontSize: '20px'
  }
};
function searchNodes(node, searchTerm, nodeArray) {
  if(node.hasChildNodes()) {
    var children = node.childNodes;
    for(var i =0; i < children.length; i++) {
      searchNodes(children[i], searchTerm, nodeArray);
    }
  } else {
    if(node.textContent.indexOf(searchTerm) > -1){

      const stringsplit = node.textContent.split(searchTerm);
      // let newHTML = '<span>' + stringsplit[0] + "<span style='background-color: yellow'>" + searchTerm + "</span>" + stringsplit[1] + '</span>';
      // node.innerHTML = newHTML;
      //find character width;
      const characterWidth = Math.abs(node.parentNode.getBoundingClientRect().left - node.parentNode.getBoundingClientRect().right )/node.textContent.length;
      console.log("characterWidth", characterWidth);
      nodeArray.push({node, index: node.textContent.indexOf(searchTerm), position: node.parentNode.getBoundingClientRect(), characterWidth});
    }

  }
}
class MyEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      docId: '',
      password: '',
      title: '',
      newCollab: '',
      collabObj: {},
      searchTerm:'',
      searchArray: []
    };
    console.log("socket", this.props.socket);
    this.onChange = (editorState) => {
      this.setState({editorState});
      let data;
      //only emit a cursor event if it took place in the editor (dont emit an event where user has clicked somewhere out of the screen)
      const windowSelection = window.getSelection();
      if(windowSelection.rangeCount>0){
        // console.log('window selection rangecount >0');
        const range = windowSelection.getRangeAt(0);
        const clientRects = range.getClientRects();
        if(clientRects.length > 0) {
          // console.log('client rects >0');
          const rects = clientRects[0];//cursor wil always be a single range so u can just ge tthe first range in the array
          const loc = {top: rects.top, left: rects.left, right: rects.right};
          data = {loc};

          // console.log('about to emit cursor movement ');
          //
          // this.setState({editorState: originalEditorState, top, left, height: bottom - top})
        }
        // this.socket.emit('cursorMove', selection)
      }


      this.props.socket.emit('change doc', {
        content: JSON.stringify(convertToRaw(editorState.getCurrentContent())),
        room: this.state.docId,
        socketId: this.props.socket.id,
        data
      });
    };
    this.focus = () => this.domEditor.focus();
    this._toggleInlineStyle = this._toggleInlineStyle.bind(this);
    this._toggleBlockStyle = this._toggleBlockStyle.bind(this);
    this.setDomEditorRef = ref => this.domEditor = ref;
    this.handleInputChange = this.handleInputChange.bind(this);
    this.saveDoc = this.saveDoc.bind(this);
    this.saveModal = this.saveModal.bind(this);
    this.addCollab = this.addCollab.bind(this);
    this.props.socket.on('change doc', contents => {
      /* console.log("CONTENTS", contents); */
      // console.log("contents", contents);


      const newUserObj = Object.assign({}, this.state.collabObj);
      newUserObj[contents.socketId] = contents.userObj[contents.socketId];
      this.setState({collabObj: newUserObj});
      // console.log("contents.userObj", contents.userObj);
      // this.setState({top: contents.data.loc.top, left: contents.data.loc.left});

      this.setState({editorState: EditorState.createWithContent(convertFromRaw(JSON.parse(contents.content)))});

    });
  }

  componentDidMount() {
    this.domEditor.focus();
    if (this.props.docId) {
      this.setState({docId: this.props.docId});
      this.getDoc();
    }
  }


  getDoc() {
    axios.get('http://localhost:3000/doc/' + this.props.docId)
    .then(resp => {
      const parsed = JSON.parse(resp.data.doc.contents);
      const newEditorState = convertFromRaw(parsed);
      console.log('convertFromRaw', newEditorState);
      this.setState({
        title: resp.data.doc.title,
        editorState: EditorState.createWithContent(newEditorState),
      });
    })
    .catch(err => {
      console.log('Error getting docs:', err);
    });
  }

  handleInputChange(event) {
    const target = event.target;
    var value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
    if(name==="searchTerm") {
      //Get element node Text
      const editor = document.getElementsByClassName('public-DraftEditor-content')[0];
      console.log("editor", editor);
      const node = editor;
      const nodeArray = [];
      searchNodes(node, value, nodeArray);
      console.log("node arr", nodeArray);
      this.setState({searchArray: nodeArray});
    }
  }

  saveDoc() {
    if (!this.state.docId) {
      $('#saveModal').modal('open');
    }
    else {
      axios.put('http://localhost:3000/doc/' + this.state.docId, {
        contents: JSON.stringify(convertToRaw(this.state.editorState.getCurrentContent())),
        title: this.state.title,
      })
      .then(resp => {
        console.log('convertToRaw', convertToRaw(this.state.editorState.getCurrentContent()));
      })
      .catch(err => {
        console.log(err);
      });
    }
  }

  saveModal() {
    axios.post('http://localhost:3000/doc/new', {
      password: this.state.password,
      title: this.state.title,
      contents: JSON.stringify(convertToRaw(this.state.editorState.getCurrentContent())),
    })
    .then(resp => {
      console.log(resp);
      this.setState({docId: resp.data.doc._id});
      $('#saveModal').modal('close');
    })
    .catch(err => {
      console.log(err);
    });
  }

  _toggleBlockStyle(blockType) {
    this.onChange(
            RichUtils.toggleBlockType(
              this.state.editorState,
              blockType
            )
    );
  }

  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  addCollab() {
    axios.post('http://localhost:3000/' + 'addCollab', {
      docId: this.state.docId,
      newCollab: this.state.newCollab,
    })
    .then(resp => {
      console.log('addCollab request sent', resp.data);
      if (resp.data.addedCollab) { $('#collabModal').modal('close'); }
    })
    .catch(resp => { console.log(resp); });
  }


  render() {
    let className = 'RichEditor-editor';
    const {editorState} = this.state;

    /* console.log('draftjsObj', draftjsObj); */
    return (
      <div className="wrapper" style={{width: '95%'}}>
			<Modal
        id='collabModal'
				header='Add Friends'
        actions={<Button onClick={this.addCollab} waves='light' className="save-doc">i n v i t e<Icon left>group_add</Icon></Button>}
      >
				<Input onChange={this.handleInputChange} value={this.state.newCollab} name="newCollab" type="text" label="username" s={12} />
			</Modal>
			<Modal
        id='saveModal'
				header='p r o t e c t y o u r d o c'
        actions={<Button onClick={this.saveModal} waves='light' className="save-doc">s a v e<Icon left>save</Icon></Button>}
      >
				<Input onChange={this.handleInputChange} value={this.state.password} name="password" type="password" label="p a s s w o r d" s={12} />
			</Modal>

      <Row className="title-row">
        <Input className="title-input" s={6} name="title" label={this.state.title ? null : "Title"} value={this.state.title} onChange={this.handleInputChange}/>
        <Button onClick={() => $('#collabModal').modal('open')} waves='light' className="save-doc">i n v i t e<Icon left>group_add</Icon></Button>
        <Input name="searchTerm" onChange={this.handleInputChange} value={this.state.searchTerm} label="Search" validate><Icon>search</Icon></Input>
      </Row>

      <div className="RichEditor-root">

        <div className="toolbar-wrapper">
          <BlockStyleControls
            editorState={editorState}
            onToggle={this._toggleBlockStyle}
          />
          <InlineStyleControls
            editorState={editorState}
            onToggle={this._toggleInlineStyle}
          />
        </div>

        <div
          className={className}
          onClick={this.focus}
        >
          {_.map(this.state.collabObj, (val, key) => {
            console.log("val", val);
            if(val) {
              if(val.hasOwnProperty('top')) {
                if(val.left !== val.right) {
                  return(
                    <div key={val.color} style={{position: 'absolute', opacity: 0.2, zIndex: 0, backgroundColor: val.color, width: Math.abs(val.left - val.right) + 'px', height: '15px', top: val.top, left: val.left}}></div>
                  );
                }
                return (
                  <div key={val.color} style={{position: 'absolute', backgroundColor: val.color, width: '2px', height: '15px', top: val.top, left: val.left}}></div>
                );
              } else{
                return <div key={key}></div>;
              }
            }
            return <div key={key}></div>;


          })}
          {this.state.searchArray.map(searchObj => {
            console.log("leftIndex before",searchObj.position.left, searchObj.index);
            const leftIndex = searchObj.position.left + (searchObj.index*searchObj.characterWidth);
            const width = searchObj.index * 2;
            console.log("leftIndex", leftIndex);
            return (
              <div key={searchObj.top} style={{position: 'absolute', backgroundColor: 'yellow', opacity: 0.2, width: width + 'px', height: '15px', top: searchObj.position.top, left: leftIndex + 'px'}}></div>
            );
          })}
          <Editor
            blockStyleFn={getBlockStyle}
            spellCheck={true}
            customStyleMap={styleMap}
            ref={this.setDomEditorRef}
            editorState={this.state.editorState}
            onChange={this.onChange}
          />
        </div>

      </div>

      <Button onClick={this.saveDoc} waves='light' className="save-doc">s a v e<Icon left>save</Icon></Button>

      </div>
    );
  }
}


const getBlockStyle = (block) => {

  switch (block.getType()) {
  case 'left':
    return 'align-left';
  case 'center':
    return 'align-center';
  case 'right':
    return 'align-right';
  default:
    return null;
  }
};
export default MyEditor;
