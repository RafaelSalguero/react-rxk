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

/**Componente que controla la lógica del timeout de recarga, que implica que el componente no se va a dibujar por primera vez ni a refrescar cuando se empiece a cargar, hasta que
 * loadingTimeOut == true
 */
export class Component2RxView extends React.PureComponent<ViewProps> {
    oldRender: JSX.Element | null = null;

    render() {
        const disableLoadingTimeout = false;
        const showOldRender = this.props.loadingTimeout == false && !this.props.ready;
        if (!disableLoadingTimeout && showOldRender) {
            return this.oldRender;
        }
        else {
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

            const nextRender = <ComponentToRender {...this.props.props} />;
            this.oldRender = nextRender;
            return nextRender;
        }

    }
}
