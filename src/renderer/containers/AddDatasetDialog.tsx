import * as React from 'react';
import { AnchorButton, ControlGroup, InputGroup, Intent } from '@blueprintjs/core';
import { DialogState, State } from '../state';
import { ModalDialog } from '../components/ModalDialog';
import { connect, DispatchProp } from 'react-redux';
import * as actions from '../actions';
import { OpenDialogProperty } from '../actions';
import * as selectors from '../selectors';

interface IAddDatasetDialogProps {
    isOpen: boolean;
}

interface IAddDatasetDialogState extends DialogState {
    dataSourceName: string;
    filePathPattern: string;
}

function mapStateToProps(state: State): IAddDatasetDialogProps {
    const dialogState = selectors.dialogStateSelector(AddDatasetDialog.DIALOG_ID)(state);
    return {
        isOpen: dialogState.isOpen,
    };
}

class AddDatasetDialog extends React.Component<IAddDatasetDialogProps & DispatchProp<State>, IAddDatasetDialogState> {
    static readonly DIALOG_ID = 'addDatasetDialog';

    constructor(props: IAddDatasetDialogProps & DispatchProp<State>) {
        super(props);
        this.state = {dataSourceName: '', filePathPattern: ''};
        this.onCancel = this.onCancel.bind(this);
        this.onConfirm = this.onConfirm.bind(this);
        this.canConfirm = this.canConfirm.bind(this);
        this.renderBody = this.renderBody.bind(this);
        this.onDataSourceNameChange = this.onDataSourceNameChange.bind(this);
        this.onFilePathPatternChange = this.onFilePathPatternChange.bind(this);
        this.showSelectDirectoryDialog = this.showSelectDirectoryDialog.bind(this);
    }

    componentWillReceiveProps(nextProps: IAddDatasetDialogProps) {
        this.setState({dataSourceName: '', filePathPattern: ''});
    }

    private onCancel() {
        this.props.dispatch(actions.hideDialog(AddDatasetDialog.DIALOG_ID));
    }

    private canConfirm(): boolean {
        return !!this.state.dataSourceName && !!this.state.filePathPattern;
    }

    private onConfirm() {
        this.props.dispatch(actions.hideDialog(AddDatasetDialog.DIALOG_ID, this.state));
        this.props.dispatch(actions.addLocalDataset(this.state.dataSourceName, this.state.filePathPattern) as any);
    }

    private onDataSourceNameChange(ev: any) {
        this.setState({dataSourceName: ev.target.value} as IAddDatasetDialogState);
    }

    private onFilePathPatternChange(ev: any) {
        this.setState({filePathPattern: ev.target.value} as IAddDatasetDialogState);
    }

    private showSelectDirectoryDialog() {
        const openDialogOptions = {
            title: 'Select Directory',
            defaultPath: this.state.filePathPattern,
            buttonLabel: 'Select',
            properties: [
                'openDirectory' as OpenDialogProperty,
            ],
            filter: [],
        };
        actions.showSingleFileOpenDialog(openDialogOptions, (dirPath: string) => {
            if (dirPath) {
                this.setState({filePathPattern: dirPath + '/*.nc'} as IAddDatasetDialogState);
            }
        });
    }

    render() {
        let isOpen = this.props.isOpen;
        if (!isOpen) {
            return null;
        }

        return (
            <ModalDialog
                isOpen={isOpen}
                title="Add file data source"
                icon="add"
                confirmTitle="Add"
                confirmIconName="add"
                confirmTooltip="Add file data source."
                onCancel={this.onCancel}
                canConfirm={this.canConfirm}
                onConfirm={this.onConfirm}
                renderBody={this.renderBody}
            />);
    }

    private renderBody() {
        if (!this.props.isOpen) {
            return null;
        }
        return (
            <ControlGroup>
                <p>Define a new file data source using a file path pattern.</p>

                <p style={{marginTop: '1em'}}>Name:</p>
                <InputGroup
                    type="text"
                    style={{width: '100%', marginLeft: '1em'}}
                    value={this.state.dataSourceName}
                    onChange={this.onDataSourceNameChange}
                />
                <p style={{marginTop: '1em'}}>Path pattern<span className="bp3-text-muted"> (can contain wildcards like "*" or "?")</span>:
                </p>
                <ControlGroup style={{flexGrow: 1, display: 'flex', marginLeft: '1em', width: '100%'}}>
                    <InputGroup
                        type="text"
                        style={{flex: 'auto'}}
                        value={this.state.filePathPattern}
                        onChange={this.onFilePathPatternChange}
                    />
                    <AnchorButton intent={Intent.PRIMARY} style={{flex: 'none'}}
                                  onClick={this.showSelectDirectoryDialog}>...</AnchorButton>
                </ControlGroup>
            </ControlGroup>
        );
    }
}

export default connect(mapStateToProps)(AddDatasetDialog);
