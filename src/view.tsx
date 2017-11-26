import { rxToReact } from "./rxToReact";
import * as rx from "rxjs";
import * as React from "react";
import { shallowDiff, mapObject, filterObject, enumObject } from "keautils";
import { Rxfy, State, ReactComponent } from "./types";


/**Check if a value is a JSX.Element */
function isJsxElement(x: any): x is JSX.Element {
    return React.isValidElement(x);
}

export interface ViewProps {
    error: any;
    ready: boolean;
    loadingTimeout: boolean;
    props: any;
    Fallback?: ReactComponent<any> | JSX.Element;
    Error?: ReactComponent<any>;
    MyComp: ReactComponent<any>;
}


export class Component2RxView extends React.PureComponent<ViewProps> {
    render() {
        const { Fallback, Error, MyComp } = this.props;

        //Fallback to this.values if current state value is undefined
        if (this.props.error) {
            if (Error) {
                const c = <Error error={this.props.error} />;
                return null as any;
            }
            else {
                const c = <span style={{ color: "red" }} ><b>Error:  {"" + this.props.error}</b></span>;
                return c;
            }
        }

        //Render the inner or the fallback component
        const ComponentToRender = (this.props.ready || !Fallback) ? this.props.MyComp :
            isJsxElement(Fallback) ? (() => Fallback) :
                Fallback;

        return <ComponentToRender {...this.props.props} />;
    }
}
