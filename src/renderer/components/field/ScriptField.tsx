import * as React from 'react';
import { AnchorButton, ControlGroup, Intent } from '@blueprintjs/core';
import { IFieldProps, toTextValue } from './Field';
import { TextField } from './TextField';
import { ScriptDialog } from '../ScriptDialog';


interface IScriptFieldProps extends IFieldProps {
    scriptLang: string;
    nullable?: boolean;
}

interface IScriptFieldState {
    isEditorOpen: boolean;
}

export class ScriptField extends React.Component<IScriptFieldProps, IScriptFieldState> {
    private static DIV_STYLE = {display: 'flex'};
    private static TEXT_FIELD_STYLE = {flexGrow: 1};
    private static BUTTON_STYLE = {flexGrow: 0};

    constructor(props: IScriptFieldProps) {
        super(props);
        this.validateScript = this.validateScript.bind(this);
        this.state = {isEditorOpen: false};
    }

    validateScript(value: string | null) {
        // TODO (nf)
    }

    render() {
        let placeholder = this.props.placeholder;
        return (
            <ControlGroup style={ScriptField.DIV_STYLE} fill={true}>
                <TextField
                    value={this.props.value}
                    onChange={this.props.onChange}
                    size={this.props.size}
                    placeholder={placeholder}
                    validator={this.validateScript}
                    nullable={this.props.nullable}
                    style={ScriptField.TEXT_FIELD_STYLE}
                />

                <AnchorButton intent={Intent.PRIMARY} style={ScriptField.BUTTON_STYLE}
                              onClick={() => this.setState({isEditorOpen: true})}>...</AnchorButton>

                <ScriptDialog isOpen={this.state.isEditorOpen}
                              value={toTextValue(this.props.value)}
                              onConfirm={(value: string) => {
                                  this.setState({isEditorOpen: false});
                                  this.props.onChange({textValue: value, value: value});
                              }}
                              onCancel={() => {
                                  this.setState({isEditorOpen: false});
                              }}
                              scriptLang={this.props.scriptLang}/>
            </ControlGroup>
        );
    }
}
