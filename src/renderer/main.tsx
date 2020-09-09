import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, Dispatch, Middleware, Store } from 'redux';
import { createLogger } from 'redux-logger';
import thunkMiddleware from 'redux-thunk';
import Keycloak, { KeycloakInitOptions } from 'keycloak-js'
import { KeycloakProvider } from '@react-keycloak/web'

import * as actions from './actions'
import ApplicationPage from './containers/ApplicationPage'
import { requireElectron } from './electron';
import { stateReducer } from './reducers';
import { State } from './state';

const keycloak = Keycloak({
                              realm: process.env.REACT_APP_KEYCLOAK_REALM,
                              url: process.env.REACT_APP_KEYCLOAK_URL,
                              clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID,
                          });
console.log(keycloak);

const keycloakProviderInitConfig: KeycloakInitOptions = {
    onLoad: 'check-sso',
};


const electron = requireElectron();

export function main() {
    const middlewares: Middleware[] = [thunkMiddleware];

    if (process.env.NODE_ENV === 'development') {
        const nonLoggedActionTypes = new Set([
                                                 // Too much noise:
                                                 actions.SET_GLOBE_MOUSE_POSITION,
                                                 actions.SET_GLOBE_VIEW_POSITION,
                                                 actions.SET_GLOBE_VIEW_POSITION,
                                                 actions.UPDATE_MOUSE_IDLE_STATE,
                                                 actions.UPDATE_SESSION_STATE,
                                             ]);
        const loggerOptions = {
            level: 'info',
            collapsed: true,
            diff: true,
            predicate: (getState, action) => !nonLoggedActionTypes.has(action.type)
        };
        middlewares.push(createLogger(loggerOptions));
    }

    const middleware = applyMiddleware(...middlewares);
    const store = createStore(stateReducer, middleware) as Store<State>;

    const onKeycloakEvent = (event, error) => {
        console.log('onKeycloakEvent', event, error)
    }

    const onKeycloakTokens = (tokens) => {
        console.log('onKeycloakTokens', tokens)
    }

    ReactDOM.render(
        <KeycloakProvider
            keycloak={keycloak}
            initConfig={keycloakProviderInitConfig}
            onEvent={onKeycloakEvent}
            onTokens={onKeycloakTokens}
        >
            <Provider store={store}>
                <ApplicationPage/>
            </Provider>
        </KeycloakProvider>,
        document.getElementById('root')
    );

    const webAPIServiceURL = process.env.REACT_APP_WEB_API_SERVICE_URL;
    if (webAPIServiceURL) {
        store.dispatch(actions.setWebAPIProvisionCustomURL(webAPIServiceURL) as any);
    }

    if (electron && electron.ipcRenderer) {
        const ipcRenderer = electron.ipcRenderer;

        ipcRenderer.on('update-initial-state', (event, initialState) => {
            store.dispatch(actions.updateInitialState(initialState));
        });

        ipcRenderer.on('new-workspace', () => {
            store.dispatch(actions.newWorkspaceInteractive() as any);
        });

        ipcRenderer.on('open-workspace', () => {
            store.dispatch(actions.openWorkspaceInteractive() as any);
        });

        ipcRenderer.on('close-workspace', () => {
            store.dispatch(actions.closeWorkspaceInteractive() as any);
        });

        ipcRenderer.on('save-workspace', () => {
            store.dispatch(actions.saveWorkspaceInteractive() as any);
        });

        ipcRenderer.on('save-workspace-as', () => {
            store.dispatch(actions.saveWorkspaceAsInteractive());
        });

        ipcRenderer.on('delete-workspace', () => {
            store.dispatch(actions.deleteWorkspaceInteractive() as any);
        });

        ipcRenderer.on('show-preferences-dialog', () => {
            store.dispatch(actions.showPreferencesDialog());
        });

        ipcRenderer.on('logout', () => {
            // store.dispatch(actions.logout() as any);
        });
    } else {
        // Dektop-PWA app install, see https://web.dev/customize-install/

        window.addEventListener('beforeinstallprompt', (event: Event) => {
            // Update UI notify the user they can install the PWA
            store.dispatch(actions.showPwaInstallPromotion(event));
            console.log('BEFORE INSTALL PROMPT:', event);
        });

        window.addEventListener('appinstalled', () => {
            // Log install to analytics
            console.log('INSTALL: Success');
        });

        window.addEventListener('DOMContentLoaded', () => {
            store.dispatch(actions.updatePwaDisplayMode(
                ((navigator as any).standalone ||
                 window.matchMedia('(display-mode: standalone)').matches) ? 'standalone' : 'browser'
            ));
        });

        window.addEventListener('DOMContentLoaded', () => {
            window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt: MediaQueryListEvent) => {
                store.dispatch(actions.updatePwaDisplayMode(
                    evt.matches ? 'standalone' : 'browser'
                ));
            });
        });
    }

    document.addEventListener('drop', function (event: any) {
        event.preventDefault();
        event.stopPropagation();
        for (let file of event.dataTransfer.files) {
            readDroppedFile(file, store.dispatch);
        }
    });

    document.addEventListener('dragover', function (event: any) {
        event.preventDefault();
        event.stopPropagation();
    });

    window.addEventListener('beforeunload', (event: any) => {
        event.preventDefault();
        const state = store.getState();
        if (state.communication.webAPIClient) {
            store.dispatch(actions.savePreferences() as any);
        }
    });
}

function readDroppedFile(file: File, dispatch: Dispatch<State>) {
    let opName, opArgs;
    if (file.name.endsWith('.nc')) {
        opName = 'read_netcdf';
        // opArgs = {file: {value: file.path}, normalize: {value: false}}
    } else if (file.name.endsWith('.txt')) {
        opName = 'read_text';
    } else if (file.name.endsWith('.json')) {
        opName = 'read_json';
    } else if (file.name.endsWith('.csv')) {
        opName = 'read_csv';
    } else if (file.name.endsWith('.geojson') || file.name.endsWith('.shp') || file.name.endsWith('.gml')) {
        opName = 'read_geo_data_frame';
    }
    if (!opArgs) {
        opArgs = {file: {value: file.name}};
    }
    if (opName) {
        dispatch(actions.dropDatasource(opName,
                                        file,
                                        opArgs,
                                        null,
                                        false,
                                        `Reading dropped file ${file.name}`) as any);
    } else {
        console.warn('Dropped file of unrecognized type: ', file.name);
    }
}
