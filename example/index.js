/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { render } from 'react-dom';
// eslint-disable-next-line import/no-unresolved, import/extensions
import MonacoEditor from 'react-monaco-editor';
import { StandaloneCodeEditorServiceImpl } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneCodeServiceImpl'
/* eslint-enable import/no-extraneous-dependencies */


const targetLogic = `
  // yoyo
  function aaa() {
    console.info('aaaa')
  }
  function main() {
    console.log('===> yo')
  }
  function bbb() {
    console.info('bbba')
  }
`

let targetModel;


function enhanceMonacoStandaloneCodeEditorServiceImpl(editorServiceImpl) {
  editorServiceImpl.prototype.doOpenEditor = function (editor, input) {
    const updateSelection = (_editor) => {
      const selection = input.options.selection;
      if (selection) {
        if (typeof selection.endLineNumber === 'number' && typeof selection.endColumn === 'number') {
          _editor.setSelection(selection);
          _editor.revealRangeInCenter(selection, 1 /* Immediate */);
        } else {
          const pos = {
            lineNumber: selection.startLineNumber,
            column: selection.startColumn
          };
          _editor.setPosition(pos);
          _editor.revealPositionInCenter(pos, 1 /* Immediate */);
        }
      }
    };

    const model = this.findModel(editor, input.resource);
    if (!model) {
      if (input.resource) {
        const schema = input.resource.scheme;
        if (schema === 'http' || schema === 'https') {
          // This is a fully qualified http or https URL
          // dom_1.windowOpenNoOpener(input.resource.toString());
          shell.openExternal(input.resource.toString());
          return editor;
        } else {
          // open external textDocument
          console.info('===> open external textDocument', input.resource, input.options.selection)
          // finderService.touchFile(input.resource, toRange(input.options.selection));
        }
      }
      return null;
    }

    updateSelection(editor);
    return editor;
  };
}

// Using with webpack
class CodeEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      code: 'import { aa } from "bb"; \n app()\n const http = "http://www.baidu.com" \n aa(); \n',
    }
  }

  onChange = (newValue, e) => {
    console.log('onChange', newValue, e); // eslint-disable-line no-console
  }

  editorDidMount = (editor) => {
    // eslint-disable-next-line no-console
    console.log('editorDidMount', editor, editor.getValue(), editor.getModel());
    this.editor = editor;
  }

  editorWillMount = (monaco) => {
    enhanceMonacoStandaloneCodeEditorServiceImpl(StandaloneCodeEditorServiceImpl);
    monaco.languages.registerDefinitionProvider('javascript', {
      provideDefinition: (model, position, token) => {
        const text = model.getWordAtPosition(position);
        if (text && text.word === 'app') {
          targetModel = targetModel || monaco.editor.createModel(targetLogic, 'javascript', monaco.Uri.parse('appLogic://1'));
          const targetMatches = targetModel.findMatches('main', true, false, true, null, true);
          let targetRange = null;
          if (targetMatches.length) {
            targetRange = targetMatches[0].range;
          } else {
            targetRange = new monaco.Range(1, 1, 1, 1)
          }
          return {
            uri: targetModel.uri,
            range: targetRange,
          }
        }
        return [];
      }
    })


  }

  changeEditorValue = () => {
    if (this.editor) {
      this.editor.setValue('// code changed! \n');
    }
  }

  changeBySetState = () => {
    this.setState({ code: '// code changed by setState! \n' });
  }

  overrideServices = {
    textModelService: {
      createModelReference(uri) {
        console.info('===> uri', uri)
        if (uri.scheme === 'appLogic') {
          return Promise.resolve({
            object: {
              textEditorModel: targetModel,
            },
            dispose() {
            }
          });
        } else {
          const textEditorModel = monaco.editor.getModel(uri);
          return Promise.resolve({
            object: {
              textEditorModel,
            },
            dispose: () => {
            }
          })
        }
      },
    },
  }

  render() {
    const { code } = this.state;
    const options = {
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: 'line',
      automaticLayout: false,
    };
    return (
      <div>
        <div>
          <button onClick={this.changeEditorValue} type="button">Change value</button>
          <button onClick={this.changeBySetState} type="button">Change by setState</button>
        </div>
        <hr />
        <MonacoEditor
          height="500"
          language="javascript"
          value={code}
          options={options}
          onChange={this.onChange}
          editorDidMount={this.editorDidMount}
          editorWillMount={this.editorWillMount}
          overrideServices={this.overrideServices}
        />
      </div>
    );
  }
}

class AnotherEditor extends React.Component { // eslint-disable-line react/no-multi-comp
  constructor(props) {
    super(props);
    const jsonCode = [
      '{',
      '    "$schema": "http://myserver/foo-schema.json"',
      '}'
    ].join('\n');
    this.state = {
      code: jsonCode,
    }
  }

  editorWillMount = (monaco) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        uri: 'http://myserver/foo-schema.json',
        schema: {
          type: 'object',
          properties: {
            p1: {
              enum: [ 'v1', 'v2']
            },
            p2: {
              $ref: 'http://myserver/bar-schema.json'
            }
          }
        }
      }, {
        uri: 'http://myserver/bar-schema.json',
        schema: {
          type: 'object',
          properties: {
            q1: {
              enum: [ 'x1', 'x2']
            }
          }
        }
      }]
    });
  }

  render() {
    const { code } = this.state;
    return (
      <div>
        <MonacoEditor
          width="800"
          height="600"
          language="json"
          defaultValue={code}
          editorWillMount={this.editorWillMount}
        />
      </div>
    );
  }
}

// eslint-disable-next-line react/no-multi-comp
const App = () => (
  <div>
    <h2>Monaco Editor Sample (controlled mode)</h2>
    <CodeEditor />
    <hr />
    <h2>Another editor (uncontrolled mode)</h2>
    <AnotherEditor />
  </div>
)

render(
  <App />,
  document.getElementById('root')
);
