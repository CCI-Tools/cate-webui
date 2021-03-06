import * as React from 'react';
import { CSSProperties } from 'react';
import { connect, DispatchProp } from 'react-redux';
import {
    Icon,
    IconName,
    Intent,
    Popover,
    PopoverInteractionKind,
    Position,
    ProgressBar,
    Tooltip
} from '@blueprintjs/core';

import { TermsAndConditions } from '../components/TermsAndConditions';
import { GeographicPosition, State, TaskState, WebAPIStatus } from '../state';
import * as selectors from '../selectors';
import * as actions from '../actions';
import { JobStatusEnum } from '../webapi';
import TaskComponent from './TaskComponent';
import VersionTags from './VersionTags';


interface IStatusBarProps {
    webAPIStatus: WebAPIStatus | null;
    webAPIServiceURL: string;
    tasks: { [jobId: number]: TaskState };
    globePosition: GeographicPosition | null;
}

interface IStatusBarDispatch {
    cancelJob(number): void;

    removeJob(number): void;
}

function mapStateToProps(state: State): IStatusBarProps {
    return {
        webAPIStatus: state.communication.webAPIStatus,
        webAPIServiceURL: state.communication.webAPIServiceURL,
        tasks: state.communication.tasks,
        globePosition: selectors.globeMousePositionSelector(state) || selectors.globeViewPositionSelector(state),
    };
}

const mapDispatchToProps = {
    cancelJob: actions.cancelJob,
    removeJob: actions.removeTaskState
};

/**
 * The TasksPanel is used display all tasks originating from cate desktop,
 * this includes progress and error messages.
 */
class StatusBar extends React.Component<IStatusBarProps & IStatusBarDispatch & DispatchProp<State>, null> {

    static readonly DIV_STYLE: CSSProperties = {
        flex: 'none',
        display: 'flex',
        flexFlow: 'row nowrap',
        height: '1.5em',
        fontSize: 'small',
        backgroundColor: '#2B95D6',
        overflow: 'hidden',
    };

    static readonly DIV_MARGIN: CSSProperties = {margin: "2px 4px 2px 4px"};
    static readonly DIV_MESSAGE_STYLE: CSSProperties = {flex: '60 1 auto', ...StatusBar.DIV_MARGIN};
    static readonly DIV_TAC_STYLE: CSSProperties = {flex: '0 1 auto', ...StatusBar.DIV_MARGIN};
    static readonly DIV_TASKS_STYLE: CSSProperties = {flex: '20 1 auto', ...StatusBar.DIV_MARGIN};
    static readonly DIV_CURSOR_STYLE: CSSProperties = {flex: '20 1 auto', ...StatusBar.DIV_MARGIN};
    static readonly DIV_STATUS_STYLE: CSSProperties = {flex: '0 1 auto', margin: "0px 4px 0px 4px"};

    render() {
        // TODO dummy
        const message = 'Ready.';

        let cursor;
        let position = this.props.globePosition;
        if (position) {
            cursor = `lon=${position.longitude.toFixed(2)}, lat=${position.latitude.toFixed(2)}`
        } else {
            cursor = '';
        }

        return (
            <div style={StatusBar.DIV_STYLE}>
                <div style={StatusBar.DIV_MESSAGE_STYLE}>{message}</div>
                <div style={StatusBar.DIV_TASKS_STYLE}>{this.renderTasks()}</div>
                <div style={StatusBar.DIV_CURSOR_STYLE}>{cursor}</div>
                <div style={StatusBar.DIV_TAC_STYLE}>{<TermsAndConditions/>}</div>
                <VersionTags minimal={true}/>
                <div style={StatusBar.DIV_STATUS_STYLE}>{this.renderBackendStatus()}</div>
            </div>
        );
    }

    private renderTasks() {
        const tasks: { [jobId: number]: TaskState } = this.props.tasks;

        let numRunningTasks = 0;
        let numFailedTasks = 0;
        const taskComponents = [];
        for (let jobId in tasks) {
            const task = tasks[jobId];
            let render = false;
            if (task.status === JobStatusEnum.SUBMITTED || task.status === JobStatusEnum.IN_PROGRESS) {
                numRunningTasks++;
                render = true;
            } else if (task.status === JobStatusEnum.CANCELLED || task.status === JobStatusEnum.FAILED) {
                numFailedTasks++;
                render = true;
            }
            if (render) {
                taskComponents.push(
                    <TaskComponent
                        key={jobId}
                        jobId={jobId}
                        task={this.props.tasks[jobId]}
                        onRemoveJob={this.props.removeJob}
                        onCancelJob={this.props.cancelJob}
                    />);
            }
        }

        if (taskComponents.length > 0) {
            let msg;
            let spinner = null;
            if (numRunningTasks > 0 && numFailedTasks > 0) {
                msg = `${numRunningTasks} running / ${numFailedTasks} failed task(s)`;
            } else if (numRunningTasks > 0) {
                msg = `${numRunningTasks} running task(s)`;
            } else if (numFailedTasks > 0) {
                msg = `${numFailedTasks} failed task(s)`;
            }
            if (numRunningTasks > 0) {
                spinner = (
                    <div style={{
                        display: 'flex',
                        flexFlow: 'column',
                        justifyContent: 'center',
                        width: '12em',
                        height: '1.5em'
                    }}>
                        <ProgressBar intent={Intent.SUCCESS}/>
                    </div>);
            }
            const tasksInPopover = <div style={{width: '300px'}}>{taskComponents}</div>;
            return (
                <Popover
                    content={tasksInPopover}
                    position={Position.TOP}
                    interactionKind={PopoverInteractionKind.HOVER}>
                    <div style={{display: 'flex', flexFlow: 'row nowrap'}}>
                        {spinner}
                        <div
                            style={{display: 'flex', flexFlow: 'column', justifyContent: 'center', paddingLeft: '5px'}}>
                            {msg}
                        </div>
                    </div>
                </Popover>
            );
        } else {
            return null;
        }
    }

    private renderBackendStatus() {
        let icon: IconName;
        let tooltipText;
        const mode = ` (${this.props.webAPIServiceURL})`;
        if (this.props.webAPIStatus === 'connecting') {
            icon = 'link';
            tooltipText = 'Connecting' + mode;
        } else if (this.props.webAPIStatus === 'open') {
            icon = 'link';
            tooltipText = 'Connected' + mode;
        } else if (this.props.webAPIStatus === 'error') {
            icon = 'offline';
            tooltipText = 'Error' + mode;
        } else if (this.props.webAPIStatus === 'closed') {
            icon = 'offline';
            tooltipText = 'Closed' + mode;
        } else {
            icon = 'help';
            tooltipText = 'Unknown' + mode;
        }
        return (
            <Tooltip content={tooltipText} hoverOpenDelay={1500} position={Position.LEFT_TOP}>
                <Icon icon={icon} iconSize={12}/>
            </Tooltip>
        );
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(StatusBar as any);
