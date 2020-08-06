import * as React from 'react';
import { CSSProperties, useEffect, useState } from 'react';
import { connect, Dispatch } from 'react-redux';
import { Button, InputGroup, Intent, Tooltip } from '@blueprintjs/core';
import * as actions from '../actions';
import { DEFAULT_SERVICE_URL } from '../initial-state';
import { State } from '../state';
import { OpenDialog } from '../components/desktop/fs/FileChooser';

import cateIcon from '../resources/cate-icon-512.png';


const CENTER_DIV_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
};

const BOX_STYLE: CSSProperties = {
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'stretch',
};

interface IDispatch {
    dispatch: Dispatch<State>;
}

interface IAppModePageProps {
    webAPIServiceURL: string;
}

// noinspection JSUnusedLocalSymbols
function mapStateToProps(state: State): IAppModePageProps {
    return {
        webAPIServiceURL: state.communication.webAPIServiceCustomURL,
    };
}

const _AppModePage: React.FC<IAppModePageProps & IDispatch> = (props) => {

    const [webAPIServiceURL, setWebAPIServiceURL] = useState(props.webAPIServiceURL);
    const [openDialogOpen, setOpenDialogOpen] = useState(true);

    useEffect(() => {
        setWebAPIServiceURL(props.webAPIServiceURL);
    }, [props.webAPIServiceURL]);

    const setCustomURLMode = () => {
        props.dispatch(actions.setWebAPIProvision('CustomURL', webAPIServiceURL) as any);
    };

    const setCateHubMode = () => {
        props.dispatch(actions.setWebAPIProvision('CateHub') as any);
    };

    const resetURL = () => {
        setWebAPIServiceURL(DEFAULT_SERVICE_URL);
    };

    return (
        <div style={CENTER_DIV_STYLE}>
            <div style={BOX_STYLE}>
                <h1 style={{textAlign: 'center'}}>Select Cate Service</h1>

                <div style={{marginTop: 12, alignContent: 'center', textAlign: 'center'}}>
                    <img src={cateIcon} width={128} height={128} alt={'Cate icon'}/>
                </div>

                <div style={{marginTop: 12, alignContent: 'center', textAlign: 'center'}}>
                    Please select a Cate service provision mode
                </div>
                <Button className={'bp3-large'}
                        intent={Intent.PRIMARY}
                        style={{marginTop: 16}}
                        onClick={setCateHubMode}>
                    <Tooltip content="Obtain a new Cate service instance from CateHub service provider">
                        CateHub Service Provider
                    </Tooltip>
                </Button>
                <Button className={'bp3-large'}
                        style={{marginTop: 16}}
                        disabled={!isValidURL(webAPIServiceURL)}
                        onClick={setCustomURLMode}>
                    <Tooltip content="Use a Cate service instance at a known URL">
                        Service at given URL
                    </Tooltip>
                </Button>
                <div style={{marginTop: 6}}>
                    <InputGroup
                        value={webAPIServiceURL}
                        onChange={(event) => setWebAPIServiceURL(event.target.value)}
                        placeholder="Service URL"
                        large={true}
                        rightElement={
                            <Button icon={'reset'}
                                    minimal={true}
                                    disabled={webAPIServiceURL === DEFAULT_SERVICE_URL}
                                    onClick={resetURL}/>
                        }
                    />
                </div>
            </div>
            <OpenDialog
                isOpen={openDialogOpen}
                onClose={() => setOpenDialogOpen(false)}
                filters={[
                    {name: 'All files', extensions: ['*']},
                    {name: 'Images', extensions: ['jpg', 'png', 'gif']},
                    {name: 'Gridded data', extensions: ['nc', 'zarr', 'h5', 'hdf']},
                    {name: 'Vector data', extensions: ['geojson', 'shp']}
                ]}
                defaultPath={'Dir-2/Dir-21/File-212.nc'}
            />
        </div>
    );
};

const AppModePage = connect(mapStateToProps)(_AppModePage);
export default AppModePage;

function isValidURL(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}