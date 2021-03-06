import * as React from 'react';
import {createRef, CSSProperties} from 'react';
import {
    ButtonGroup,
    Checkbox,
    Colors, ContextMenu,
    Icon,
    IconName,
    Label,
    Menu,
    MenuItem,
    Popover,
    Position
} from '@blueprintjs/core';
import {connect, Dispatch} from 'react-redux';
import {Placemark, PlacemarkCollection, State} from '../state';
import {ListBox, ListBoxSelectionMode} from '../components/ListBox';
import * as actions from '../actions';
import * as selectors from '../selectors';
import {ContentWithDetailsPanel} from '../components/ContentWithDetailsPanel';
import LayerSourcesDialog from './LayerSourcesDialog';
import {ScrollablePanelContent} from '../components/ScrollableContent';
import {ViewState} from '../components/ViewState';
import {NO_PLACE_SELECTED, NO_PLACES} from '../messages';
import {FieldValue} from '../components/field/Field';
import {TextField} from '../components/field/TextField';
import {geoJsonToText, geometryGeoJsonToCsv, geometryGeoJsonToGeometryWkt, isBox} from '../../common/geometry-util';
import {GeometryToolType} from '../components/cesium/geometry-tool';
import {isBoolean} from '../../common/types';
import {NumericField, NumericFieldValue} from '../components/field/NumericField';
import {ToolButton} from '../components/ToolButton';


interface IPlacemarksPanelDispatch {
    dispatch: Dispatch<State>;
}

interface IPlacemarksPanelProps {
    placemarkCollection: PlacemarkCollection;
    selectedPlacemarkId: string | null,
    selectedPlacemark: Placemark | null,
    activeView: ViewState<any> | null;
    placemarkListHeight: number,
    showPlacemarkDetails: boolean,
    geometryToolType: GeometryToolType;
}

function mapStateToProps(state: State): IPlacemarksPanelProps {
    return {
        placemarkCollection: selectors.placemarkCollectionSelector(state),
        selectedPlacemarkId: selectors.selectedPlacemarkIdSelector(state),
        selectedPlacemark: selectors.selectedPlacemarkSelector(state),
        placemarkListHeight: state.session.placemarkListHeight,
        showPlacemarkDetails: selectors.showPlacemarkDetailsSelector(state),
        activeView: selectors.activeViewSelector(state),
        geometryToolType: selectors.newPlacemarkToolTypeSelector(state),
    };
}


/**
 * The PlacemarksPanel is used to display, select, and manage user geometries.
 *
 * @author Norman Fomferra
 */
class PlacemarksPanel extends React.Component<IPlacemarksPanelProps & IPlacemarksPanelDispatch, null> {

    constructor(props: IPlacemarksPanelProps & IPlacemarksPanelDispatch) {
        super(props);
        this.handleListHeightChanged = this.handleListHeightChanged.bind(this);
        this.handleShowDetailsChanged = this.handleShowDetailsChanged.bind(this);
        this.handleNewPointToolButtonClicked = this.handleNewPointToolButtonClicked.bind(this);
        this.handleNewPolygonToolButtonClicked = this.handleNewPolygonToolButtonClicked.bind(this);
        this.handleNewPolylineToolButtonClicked = this.handleNewPolylineToolButtonClicked.bind(this);
        this.handleNewBoxToolButtonClicked = this.handleNewBoxToolButtonClicked.bind(this);
        this.handleRemovePlacemarkButtonClicked = this.handleRemovePlacemarkButtonClicked.bind(this);
        this.handleLocatePlacemarkButtonClicked = this.handleLocatePlacemarkButtonClicked.bind(this);
        this.handleChangedPlacemarkVisibility = this.handleChangedPlacemarkVisibility.bind(this);
        this.handleChangedPlacemarkSelection = this.handleChangedPlacemarkSelection.bind(this);
        this.handleChangedPlacemarkName = this.handleChangedPlacemarkName.bind(this);
        this.handleChangedPointLongitude = this.handleChangedPointLongitude.bind(this);
        this.handleChangedPointLatitude = this.handleChangedPointLatitude.bind(this);
        this.handleCopySelectedPlacemarkAsCsv = this.handleCopySelectedPlacemarkAsCsv.bind(this);
        this.handleCopySelectedPlacemarkAsWkt = this.handleCopySelectedPlacemarkAsWkt.bind(this);
        this.handleCopySelectedPlacemarkAsGeoJSON = this.handleCopySelectedPlacemarkAsGeoJSON.bind(this);
        this.handlePlacemarkDoubleClick = this.handlePlacemarkDoubleClick.bind(this);
        this.renderPlacemarkItem = this.renderPlacemarkItem.bind(this);
    }

    private handleListHeightChanged(value: number) {
        this.props.dispatch(actions.updateSessionState({placemarkListHeight: value}));
    }

    private handleNewPointToolButtonClicked() {
        this.props.dispatch(actions.activateNewPlacemarkTool('PointTool'));
    }

    private handleNewPolygonToolButtonClicked() {
        this.props.dispatch(actions.activateNewPlacemarkTool('PolygonTool'));
    }

    private handleNewPolylineToolButtonClicked() {
        this.props.dispatch(actions.activateNewPlacemarkTool('PolylineTool'));
    }

    private handleNewBoxToolButtonClicked() {
        this.props.dispatch(actions.activateNewPlacemarkTool('BoxTool'));
    }

    private handleShowDetailsChanged(value: boolean) {
        this.props.dispatch(actions.updateSessionState({showPlacemarkDetails: value}));
    }

    private handleRemovePlacemarkButtonClicked() {
        this.props.dispatch(actions.removePlacemark(this.props.selectedPlacemarkId));
    }

    private handleLocatePlacemarkButtonClicked() {
        this.props.dispatch(actions.locatePlacemark(this.props.selectedPlacemarkId) as any);
    }

    private handlePlacemarkDoubleClick(placemark: Placemark) {
        this.props.dispatch(actions.locatePlacemark(placemark.id) as any);
    }

    private handleChangedPlacemarkVisibility(placemark: Placemark, visible: boolean) {
        this.props.dispatch(actions.updatePlacemarkProperties(placemark.id, {visible}));
    }

    private handleChangedPlacemarkName(nameField: FieldValue<string>) {
        const placemark = this.props.selectedPlacemark;
        const name = nameField.value;
        this.props.dispatch(actions.updatePlacemarkStyle(placemark.id, {title: name}));
    }

    private handleChangedPointLongitude(longitude: NumericFieldValue) {
        const placemark = this.props.selectedPlacemark;
        let geometry = placemark.geometry;
        geometry = {...geometry, coordinates: [longitude.value, geometry.coordinates[1]]};
        this.props.dispatch(actions.updatePlacemarkGeometry(placemark.id, geometry));
    }

    private handleChangedPointLatitude(latitude: NumericFieldValue) {
        const placemark = this.props.selectedPlacemark;
        let geometry = placemark.geometry;
        geometry = {...geometry, coordinates: [geometry.coordinates[0], latitude.value]};
        this.props.dispatch(actions.updatePlacemarkGeometry(placemark.id, geometry));
    }

    private handleChangedPlacemarkSelection(newSelection: string[]) {
        const selectedPlacemarkId = newSelection.length ? newSelection[0] : null;
        this.props.dispatch(actions.setSelectedPlacemarkId(selectedPlacemarkId));
    }

    private handleCopySelectedPlacemarkAsCsv() {
        this.handleCopyGeometryAsCsv(this.props.selectedPlacemark);
    }

    private handleCopySelectedPlacemarkAsWkt() {
        this.handleCopyGeometryAsWkt(this.props.selectedPlacemark);
    }

    private handleCopySelectedPlacemarkAsGeoJSON() {
        this.handleCopyGeometryAsGeoJson(this.props.selectedPlacemark);
    }

    private handleCopyGeometryAsCsv = (placemark: Placemark)  => {
        actions.copyTextToClipboard(geometryGeoJsonToCsv(placemark.geometry));
    };

    private handleCopyGeometryAsWkt = (placemark: Placemark) => {
        actions.copyTextToClipboard(geometryGeoJsonToGeometryWkt(placemark.geometry));
    };

    private handleCopyGeometryAsGeoJson = (placemark: Placemark) => {
        actions.copyTextToClipboard(geoJsonToText(placemark));
    };

    private static getPlacemarkItemKey(placemark: Placemark) {
        return placemark.id;
    }

    render() {
        return (
            <div style={{width: '100%'}}>
                <ContentWithDetailsPanel showDetails={this.props.showPlacemarkDetails}
                                         onShowDetailsChange={this.handleShowDetailsChanged}
                                         isSplitPanel={true}
                                         contentHeight={this.props.placemarkListHeight}
                                         onContentHeightChange={this.handleListHeightChanged}
                                         actionComponent={this.renderActionButtonRow()}>
                    {this.renderPlacemarksList()}
                    {this.renderPlacemarkDetails()}
                </ContentWithDetailsPanel>
            </div>
        );
    }

    private renderActionButtonRow() {
        const isPointToolActive = this.props.geometryToolType === 'PointTool';
        const isPolylineToolActive = this.props.geometryToolType === 'PolylineTool';
        const isPolygonToolActive = this.props.geometryToolType === 'PolygonTool';
        const isBoxToolActive = this.props.geometryToolType === 'BoxTool';
        return (
            <ButtonGroup>
                <ToolButton
                    tooltipContent="New marker"
                    onClick={this.handleNewPointToolButtonClicked}
                    icon="dot"
                    tooltipPosition={'top'}
                    active={isPointToolActive}
                    disabled={false}
                />
                <ToolButton
                    tooltipContent="New polyline"
                    onClick={this.handleNewPolylineToolButtonClicked}
                    icon="slash"
                    tooltipPosition={'top'}
                    active={isPolylineToolActive}
                    disabled={false}
                />
                <ToolButton
                    tooltipContent="New polygon"
                    onClick={this.handleNewPolygonToolButtonClicked}
                    icon="polygon-filter"
                    tooltipPosition={'top'}
                    active={isPolygonToolActive}
                    disabled={false}
                />
                <ToolButton
                    tooltipContent="New box"
                    onClick={this.handleNewBoxToolButtonClicked}
                    icon="widget"
                    tooltipPosition={'top'}
                    active={isBoxToolActive}
                    disabled={false}
                />
                <ToolButton
                    tooltipContent="Remove selected place"
                    disabled={!this.props.selectedPlacemarkId}
                    onClick={this.handleRemovePlacemarkButtonClicked}
                    icon="remove"
                    tooltipPosition={'top'}
                />
                <ToolButton
                    tooltipContent="Locate selected place in view"
                    disabled={!this.props.selectedPlacemarkId}
                    onClick={this.handleLocatePlacemarkButtonClicked}
                    icon="locate"
                    tooltipPosition={'top'}
                />
                <Popover disabled={!this.props.selectedPlacemark} position={Position.LEFT}>
                    <ToolButton
                        tooltipContent={!this.props.selectedPlacemark ?
                                        "Copy selected place: Please select a place first." : "Copy selected place."}
                        disabled={!this.props.selectedPlacemark}
                        icon="clipboard"
                        tooltipPosition={'top'}
                    />
                    <Menu>
                        <MenuItem onClick={this.handleCopySelectedPlacemarkAsCsv} text="Copy as CSV"/>
                        <MenuItem onClick={this.handleCopySelectedPlacemarkAsWkt} text="Copy as WKT"/>
                        <MenuItem onClick={this.handleCopySelectedPlacemarkAsGeoJSON} text="Copy as GeoJSON"/>
                    </Menu>
                </Popover>
                <LayerSourcesDialog/>
            </ButtonGroup>
        );
    }

    private renderPlacemarksList() {
        const placemarks = this.props.placemarkCollection.features;
        if (!placemarks || !placemarks.length) {
            return NO_PLACES;
        }

        return (
            <ScrollablePanelContent>
                <ListBox items={placemarks}
                         getItemKey={PlacemarksPanel.getPlacemarkItemKey}
                         renderItem={this.renderPlacemarkItem}
                         selectionMode={ListBoxSelectionMode.SINGLE}
                         selection={this.props.selectedPlacemarkId}
                         onSelection={this.handleChangedPlacemarkSelection}/>
            </ScrollablePanelContent>
        );
    }

    private renderPlacemarkItem(placemark: Placemark) {
        return <PlacemarkItem placemark={placemark}
                              onDoubleClick={this.handlePlacemarkDoubleClick}
                              onVisibilityChange={this.handleChangedPlacemarkVisibility}
                              onCopyPlacemarkCsv={this.handleCopyGeometryAsCsv}
                              onCopyPlacemarkWkt={this.handleCopyGeometryAsWkt}
                              onCopyPlacemarkGeoJSON={this.handleCopyGeometryAsGeoJson}
        />;
    }

    private renderPlacemarkDetails() {
        const placemarks = this.props.placemarkCollection.features;
        if (!placemarks || !placemarks.length) {
            return null;
        }
        const placemark = this.props.selectedPlacemark;
        if (!placemark) {
            return NO_PLACE_SELECTED;
        }
        return (
            <div style={{width: '100%'}}>
                <Label key="spacer"> </Label>
                {this.renderPlacemarkTitle()}
                {this.renderPlacemarkGeometry()}
            </div>
        );
    }

    private renderPlacemarkTitle() {
        const placemark = this.props.selectedPlacemark;
        const name = placemark.properties['title'];
        return (
            <Label className="bp3-inline">
                Name
                <span className="bp3-text-muted"> (optional)</span>
                <TextField value={{textValue: name, value: name}}
                           onChange={this.handleChangedPlacemarkName}
                           size={16}
                           uncontrolled={true}
                           placeholder="Placemark name"
                />
            </Label>
        );
    }

    private renderPlacemarkGeometry() {
        const placemark = this.props.selectedPlacemark;
        const geometry = placemark.geometry;
        if (geometry.type === 'Point') {
            const position = geometry.coordinates;
            return (
                <div>
                    <Label className="bp3-inline">
                        Longitude
                        <span className="bp3-text-muted"> (in degrees)</span>
                        <NumericField value={position[0]}
                                      onChange={this.handleChangedPointLongitude}
                                      size={12}
                                      uncontrolled={true}
                                      min={-180}
                                      max={+180}
                                      placeholder="Longitude in degrees"/>
                    </Label>
                    <Label className="bp3-inline">
                        Latitude
                        <span className="bp3-text-muted"> (in degrees)</span>
                        <NumericField value={position[1]}
                                      onChange={this.handleChangedPointLatitude}
                                      size={12}
                                      uncontrolled={true}
                                      min={-90}
                                      max={+90}
                                      placeholder="Latitude in degrees"/>
                    </Label>
                </div>
            );
        } else if (isBox(geometry)) {
            // TODO (nf): allow editing box coordinates
        }
        return null;
    }
}

export default connect(mapStateToProps)(PlacemarksPanel);


interface IPlacemarkItemProps {
    placemark: Placemark;
    onVisibilityChange: (placemark: Placemark, visible?) => void;
    onCopyPlacemarkCsv: (placemark: Placemark) => void;
    onCopyPlacemarkWkt: (placemark: Placemark) => void;
    onCopyPlacemarkGeoJSON: (placemark: Placemark) => void;
    onDoubleClick: (placemark: Placemark) => void;
}


class PlacemarkItem extends React.PureComponent<IPlacemarkItemProps, {}> {

    static readonly DIV_STYLE: CSSProperties = {display: 'flex', alignItems: 'center'};
    static readonly CHECK_STYLE: CSSProperties = {flexGrow: 0, margin: 0};
    static readonly LABEL_STYLE: CSSProperties = {flexGrow: 1};
    static readonly ICON_STYLE: CSSProperties = {marginLeft: '0.5em'};
    static readonly NAME_STYLE: CSSProperties = {marginLeft: '0.5em'};
    static readonly INFO_STYLE: CSSProperties = {float: 'right', color: Colors.BLUE5};

    placemarkItemRef = createRef<HTMLDivElement>();

    constructor(props: IPlacemarkItemProps) {
        super(props);
        this.handleVisibilityChanged = this.handleVisibilityChanged.bind(this);
        this.handleCopyPlacemarkCsv = this.handleCopyPlacemarkCsv.bind(this);
        this.handleCopyPlacemarkWkt = this.handleCopyPlacemarkWkt.bind(this);
        this.handleCopyPlacemarksGeoJSON = this.handleCopyPlacemarksGeoJSON.bind(this);
        this.handleDoubleClick = this.handleDoubleClick.bind(this);
    }

    handleDoubleClick() {
        this.props.onDoubleClick(this.props.placemark);
    }

    handleCopyPlacemarkCsv() {
        this.props.onCopyPlacemarkCsv(this.props.placemark);
    }

    handleCopyPlacemarkWkt() {
        this.props.onCopyPlacemarkWkt(this.props.placemark);
    }

    handleCopyPlacemarksGeoJSON() {
        this.props.onCopyPlacemarkGeoJSON(this.props.placemark);
    }

    handleVisibilityChanged(event) {
        this.props.onVisibilityChange(this.props.placemark, event.target.checked)
    }

    componentDidMount(): void {
        const rightClickMe = this.placemarkItemRef.current;

        if (rightClickMe) {
            rightClickMe.oncontextmenu = (e: MouseEvent) => {
                // prevent the browser's native context menu
                e.preventDefault();

                // render a Menu without JSX...
                const menu = React.createElement(
                    Menu,
                    {}, // empty props
                    React.createElement(MenuItem, {onClick: this.handleCopyPlacemarkCsv, text: "Copy as CSV"}),
                    React.createElement(MenuItem, {onClick: this.handleCopyPlacemarkWkt, text: "Copy as WKT"}),
                    React.createElement(MenuItem, {
                        onClick: this.handleCopyPlacemarksGeoJSON,
                        text: "Copy as GeoJSON"
                    }),
                );

                // mouse position is available on event
                ContextMenu.show(menu, {left: e.clientX, top: e.clientY}, () => {
                    // menu was closed; callback optional
                });
            };
        }
    }

    public render() {
        const placemark = this.props.placemark;
        const visible = placemark.properties['visible'];
        const title = placemark.properties['title'];
        const geometry = placemark.geometry;
        let icon: IconName;
        let info;
        if (geometry.type === 'Point') {
            const position = geometry.coordinates;
            info = ` ${position[0].toFixed(3)}, ${position[1].toFixed(3)}`;
            icon = 'dot';
        } else if (geometry.type === 'LineString') {
            const coordinates = geometry.coordinates;
            info = ` ${coordinates.length} positions`;
            icon = 'slash';
        } else if (geometry.type === 'Polygon') {
            const ring = geometry.coordinates[0] as any;
            info = ` ${ring.length - 1} positions`;
            icon = isBox(geometry) ? 'widget' : 'polygon-filter';
        }


        return (
            <div ref={this.placemarkItemRef} style={PlacemarkItem.DIV_STYLE}>
                <Icon style={{marginRight: '4px'}} icon={visible ? 'eye-open': 'eye-off'} />
                <Checkbox
                    style={PlacemarkItem.CHECK_STYLE}
                    checked={isBoolean(visible) ? visible : true}
                    onChange={this.handleVisibilityChanged} />
                <div onDoubleClick={this.handleDoubleClick} style={PlacemarkItem.LABEL_STYLE}>
                    <span style={PlacemarkItem.ICON_STYLE}><Icon icon={icon}/></span>
                    <span style={PlacemarkItem.NAME_STYLE}>{title}</span>
                    <span style={PlacemarkItem.INFO_STYLE}>{info}</span>
                </div>
            </div>
        );
    }
}

