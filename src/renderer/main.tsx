import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
    BrowserRouter as Router,
    // HashRouter as Router,
    Switch,
    Redirect,
    Route,
} from "react-router-dom";
import { Provider as StoreProvider } from 'react-redux';
import { applyMiddleware, createStore, Middleware, Store } from 'redux';
import { createLogger } from 'redux-logger';
import thunkMiddleware from 'redux-thunk';
import Keycloak, { KeycloakInitOptions, KeycloakConfig } from 'keycloak-js'
import { KeycloakProvider } from '@react-keycloak/web'

import * as actions from './actions'
import AppMainPageForHub from './containers/AppMainPageForHub'
import AppMainPageForSA from './containers/AppMainPageForSA'
import AppModePage from './containers/AppModePage';
import { stateReducer } from './reducers';
import { State } from './state';
import { isElectron } from './electron';


const keycloak = Keycloak(getKeycloakConfig());
const maintenanceReason: string | undefined = process.env.REACT_APP_CATEHUB_MAINTENANCE;

const keycloakProviderInitConfig: KeycloakInitOptions = {
    onLoad: 'check-sso',
    enableLogging: true,
};

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
        console.debug('onKeycloakEvent', event, error);
    }

    const onKeycloakTokens = (tokens) => {
        console.debug('onKeycloakTokens', tokens);
    }

    ReactDOM.render(
        (
            <Router>
                <KeycloakProvider
                    keycloak={keycloak}
                    initConfig={keycloakProviderInitConfig}
                    onEvent={onKeycloakEvent}
                    onTokens={onKeycloakTokens}
                >
                    <StoreProvider store={store}>
                        <Switch>
                            <Route exact path="/">
                                <AppModePage/>
                            </Route>
                            <Route path="/hub">
                                {
                                    maintenanceReason
                                    ? (<Redirect to="/"/>)
                                    : (<AppMainPageForHub/>)
                                }
                            </Route>
                            <Route path="/sa">
                                <AppMainPageForSA/>
                            </Route>
                        </Switch>
                    </StoreProvider>
                </KeycloakProvider>
            </Router>
        ),
        document.getElementById('root')
    );

    if (!isElectron()) {
        // Dektop-PWA app install, see https://web.dev/customize-install/
        //
        window.addEventListener('beforeinstallprompt', (event: Event) => {
            // Update UI notify the user they can install the PWA
            store.dispatch(actions.showPwaInstallPromotion(event));
            console.log('BEFORE INSTALL PROMPT:', event);
        });
    }
}

function getKeycloakConfig(): KeycloakConfig {
    const realm = process.env.REACT_APP_KEYCLOAK_REALM;
    const url = process.env.REACT_APP_KEYCLOAK_URL;
    const clientId = process.env.REACT_APP_KEYCLOAK_CLIENT_ID;
    if (!realm || !url || !clientId) {
        throw new Error('Missing or incomplete KeyCloak configuration in .env');
    }
    return {realm, url, clientId};
}

